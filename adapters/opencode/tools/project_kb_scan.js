import { spawn } from "node:child_process";
import { tool } from "@opencode-ai/plugin";

function run(command, args, cwd, abort) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    abort?.addEventListener("abort", () => child.kill("SIGTERM"), { once: true });
    child.on("error", (error) => resolve({ stdout, stderr: `${stderr}${error.message}`, exitCode: 127 }));
    child.on("close", (code) => resolve({ stdout, stderr, exitCode: code ?? 1 }));
  });
}

export default tool({
  description: "Scan project knowledge candidates with project-kb. This tool never writes knowledge files.",
  args: {
    mode: tool.schema.string().optional().describe("full or changed"),
  },
  async execute(args, context) {
    const repo = context.worktree || context.directory || process.cwd();
    const result = await run("project-kb", ["scan", "--repo", repo, "--mode", args.mode || "full"], repo, context.abort);
    return {
      output: result.stdout || result.stderr,
      metadata: { repo, exitCode: result.exitCode },
    };
  },
});
