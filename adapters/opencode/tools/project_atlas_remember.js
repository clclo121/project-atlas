import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";
import { outputText, repoFromContext, runProjectAtlas, withHumanApplyMessage } from "../lib/run_project_atlas.js";

function toMemoryItem(memory) {
  return {
    target: memory.target,
    memory_type: memory.memoryType,
    topic: memory.topic,
    scope: memory.scope,
    confidence: memory.confidence,
    summary: memory.summary,
    body: memory.body,
    ...(memory.owner ? { owner: memory.owner } : {}),
    ...(memory.relatedDocs ? { related_docs: memory.relatedDocs } : {}),
  };
}

export default tool({
  description: "Create a project-atlas memory proposal. This tool never applies knowledge changes.",
  args: {
    reason: tool.schema.string().describe("Why this project memory should be captured"),
    sourceFiles: tool.schema.array(tool.schema.string()).describe("Repo-relative source evidence files"),
    memories: tool.schema
      .array(
        tool.schema.object({
          target: tool.schema.string().describe("Target path under knowledge/decisions/ or another knowledge directory"),
          memoryType: tool.schema.string().describe("decision, experience, or project_fact"),
          topic: tool.schema.string().describe("Memory topic"),
          scope: tool.schema.string().describe("Memory scope"),
          confidence: tool.schema.number().describe("Confidence between 0 and 1"),
          summary: tool.schema.string().describe("Short memory summary"),
          body: tool.schema.string().describe("Detailed memory body"),
          owner: tool.schema.string().optional().describe("Optional owner"),
          relatedDocs: tool.schema.array(tool.schema.string()).optional().describe("Optional related knowledge docs"),
        }),
      )
      .describe("Project memories to propose"),
    replaceExisting: tool.schema.boolean().optional().describe("Allow proposal generation for existing target files"),
    format: tool.schema.string().optional().describe("markdown or json"),
  },
  async execute(args, context) {
    const repo = repoFromContext(context);
    const dir = await mkdtemp(path.join(tmpdir(), "project-atlas-opencode-"));
    const candidateFile = path.join(dir, "memory.json");
    await writeFile(
      candidateFile,
      JSON.stringify(
        {
          schema_version: "1.0",
          source_files: args.sourceFiles,
          memories: args.memories.map(toMemoryItem),
        },
        null,
        2,
      ),
      "utf8",
    );
    const commandArgs = ["remember", "--repo", repo, "--candidate-file", candidateFile, "--reason", args.reason];
    if (args.format) commandArgs.push("--format", args.format);
    if (args.replaceExisting) commandArgs.push("--replace-existing");
    try {
      const result = await runProjectAtlas(commandArgs, repo, context.abort);
      return {
        output: withHumanApplyMessage(outputText(result)),
        metadata: { repo, exitCode: result.exitCode },
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
});
