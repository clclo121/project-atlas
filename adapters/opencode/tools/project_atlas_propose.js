import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
      .describe("Knowledge updates to propose"),
    sourceFiles: tool.schema.array(tool.schema.string()).optional().describe("Source evidence files"),
  },
  async execute(args, context) {
    const repo = repoFromContext(context);
    const dir = await mkdtemp(path.join(tmpdir(), "project-atlas-opencode-"));
    const updatesFile = path.join(dir, "updates.json");
    await writeFile(updatesFile, JSON.stringify({ source_files: args.sourceFiles || [], updates: args.updates }, null, 2), "utf8");
    try {
      const result = await runProjectAtlas(["propose", "--repo", repo, "--updates-file", updatesFile, "--reason", args.reason], repo, context.abort);
      return {
        output: withHumanApplyMessage(outputText(result)),
        metadata: { repo, exitCode: result.exitCode },
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
});
