import { tool } from "@opencode-ai/plugin";
import { repoFromContext, runProjectAtlas } from "../lib/run_project_atlas.js";
import { reviewSummaryOutput } from "../lib/review_summary_output.js";

export default tool({
  description: "Print project-atlas proposal review summary. This tool never applies proposals.",
  args: {
    proposalId: tool.schema.string().optional().describe("Proposal id. Defaults to latest proposal."),
  },
  async execute(args, context) {
    const repo = repoFromContext(context);
    const commandArgs = ["review-summary", "--repo", repo];
    if (args.proposalId) commandArgs.push("--proposal-id", args.proposalId);
    const result = await runProjectAtlas(commandArgs, repo, context.abort);
    return {
      output: reviewSummaryOutput(result),
      metadata: { repo, exitCode: result.exitCode },
    };
  },
});
