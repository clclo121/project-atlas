import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";
import { outputText, repoFromContext, runProjectAtlas, withHumanApplyMessage } from "../lib/run_project_atlas.js";

export default tool({
  description: "Create a project-atlas proposal. This tool never applies knowledge changes.",
  args: {
    reason: tool.schema.string().describe("Why knowledge should be updated"),
    updates: tool.schema
      .array(
        tool.schema.object({
          target: tool.schema.string().describe("Target path under knowledge/"),
          content: tool.schema.string().describe("Markdown content"),
        }),
      )
      .optional()
      .describe("Knowledge updates to propose"),
    sourceFiles: tool.schema.array(tool.schema.string()).optional().describe("Source evidence files"),
    updatesFile: tool.schema.string().optional().describe("JSON file with source_files, external_evidence, and updates"),
    target: tool.schema.string().optional().describe("Single target under knowledge/"),
    contentFile: tool.schema.string().optional().describe("Markdown content file for a single target"),
    externalEvidenceFile: tool.schema.string().optional().describe("JSON file with external repo map or code graph evidence"),
    inheritSourceMetadata: tool.schema.boolean().optional().describe("Merge existing target source_files into the proposal"),
  },
  async execute(args, context) {
    const repo = repoFromContext(context);
    const hasInlineUpdates = Array.isArray(args.updates) && args.updates.length > 0;
    const hasTargetOrContentFile = Boolean(args.target || args.contentFile);
    if (args.updatesFile && (hasInlineUpdates || hasTargetOrContentFile)) {
      return {
        output: "Use either updatesFile, target + contentFile, or inline updates. Do not mix proposal input modes.",
        metadata: { repo, exitCode: 1 },
      };
    }
    if (args.updatesFile && Array.isArray(args.sourceFiles) && args.sourceFiles.length > 0) {
      return {
        output: "When using updatesFile, source files must be provided inside updatesFile as source_files.",
        metadata: { repo, exitCode: 1 },
      };
    }
    if (hasTargetOrContentFile && (!args.target || !args.contentFile || hasInlineUpdates)) {
      return {
        output: "Use target and contentFile together, without inline updates.",
        metadata: { repo, exitCode: 1 },
      };
    }
    if (!args.updatesFile && !hasTargetOrContentFile && !hasInlineUpdates) {
      return {
        output: "Provide updatesFile, target + contentFile, or inline updates.",
        metadata: { repo, exitCode: 1 },
      };
    }
    let dir;
    const commandArgs = ["propose", "--repo", repo];
    if (args.updatesFile) {
      commandArgs.push("--updates-file", args.updatesFile);
    } else if (args.target && args.contentFile) {
      dir = await mkdtemp(path.join(tmpdir(), "project-atlas-opencode-"));
      const content = await readFile(args.contentFile, "utf8");
      const updatesFile = path.join(dir, "updates.json");
      await writeFile(updatesFile, JSON.stringify({ source_files: args.sourceFiles || [], updates: [{ target: args.target, content }] }, null, 2), "utf8");
      commandArgs.push("--updates-file", updatesFile);
    } else {
      dir = await mkdtemp(path.join(tmpdir(), "project-atlas-opencode-"));
      const updatesFile = path.join(dir, "updates.json");
      await writeFile(updatesFile, JSON.stringify({ source_files: args.sourceFiles || [], updates: args.updates }, null, 2), "utf8");
      commandArgs.push("--updates-file", updatesFile);
    }
    if (args.externalEvidenceFile) commandArgs.push("--external-evidence-file", args.externalEvidenceFile);
    if (args.inheritSourceMetadata) commandArgs.push("--inherit-source-metadata");
    commandArgs.push("--reason", args.reason);
    try {
      const result = await runProjectAtlas(commandArgs, repo, context.abort);
      return {
        output: withHumanApplyMessage(outputText(result)),
        metadata: { repo, exitCode: result.exitCode },
      };
    } finally {
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  },
});
