import { tool } from "@opencode-ai/plugin";
import { outputText, repoFromContext, runProjectAtlas } from "../lib/run_project_atlas.js";

export default tool({
  description: "Scan project knowledge candidates with project-atlas. This tool never writes knowledge files.",
  args: {
    mode: tool.schema.string().optional().describe("full or changed"),
    reviewDepth: tool.schema.string().optional().describe("standard or deep"),
    externalEvidenceFile: tool.schema.string().optional().describe("JSON file with external repo map or code-review-graph evidence"),
  },
  async execute(args, context) {
    const repo = repoFromContext(context);
    const commandArgs = ["scan", "--repo", repo, "--mode", args.mode || "full", "--review-depth", args.reviewDepth || "standard"];
    if (args.externalEvidenceFile) commandArgs.push("--external-evidence-file", args.externalEvidenceFile);
    const result = await runProjectAtlas(commandArgs, repo, context.abort);
    return {
      output: outputText(result),
      metadata: { repo, exitCode: result.exitCode },
    };
  },
});
