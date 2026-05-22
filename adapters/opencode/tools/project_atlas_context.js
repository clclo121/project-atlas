import { tool } from "@opencode-ai/plugin";
import { outputText, repoFromContext, runProjectAtlas } from "../lib/run_project_atlas.js";

export default tool({
  description: "Read a compact project-atlas context pack. This tool never writes knowledge files.",
  args: {
    query: tool.schema.string().optional().describe("Optional topic or keyword"),
    sourceFile: tool.schema.string().optional().describe("Return knowledge docs whose source_files include this repo-relative path"),
    memoryType: tool.schema.string().optional().describe("decision, experience, or project_fact"),
    topic: tool.schema.string().optional().describe("Filter project memories by topic substring"),
    scope: tool.schema.string().optional().describe("Filter project memories by scope substring"),
    budget: tool.schema.number().optional().describe("Maximum context characters"),
    format: tool.schema.string().optional().describe("markdown or json"),
  },
  async execute(args, context) {
    const repo = repoFromContext(context);
    const commandArgs = ["context", "--repo", repo, "--budget", String(args.budget || 8000)];
    if (args.query) commandArgs.push("--query", args.query);
    if (args.sourceFile) commandArgs.push("--source-file", args.sourceFile);
    if (args.memoryType) commandArgs.push("--memory-type", args.memoryType);
    if (args.topic) commandArgs.push("--topic", args.topic);
    if (args.scope) commandArgs.push("--scope", args.scope);
    if (args.format) commandArgs.push("--format", args.format);
    const result = await runProjectAtlas(commandArgs, repo, context.abort);
    return {
      output: outputText(result),
      metadata: { repo, exitCode: result.exitCode },
    };
  },
});
