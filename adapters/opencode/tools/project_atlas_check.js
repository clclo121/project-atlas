import { tool } from "@opencode-ai/plugin";
import { outputText, repoFromContext, runProjectAtlas } from "../lib/run_project_atlas.js";

export default tool({
  description: "Check project-atlas knowledge health. This tool never writes knowledge files.",
  args: {
    format: tool.schema.string().optional().describe("markdown or json"),
  },
  async execute(args, context) {
    const repo = repoFromContext(context);
    const result = await runProjectAtlas(["check", "--repo", repo, "--format", args.format || "markdown"], repo, context.abort);
    return {
      output: outputText(result),
      metadata: { repo, exitCode: result.exitCode },
    };
  },
});
