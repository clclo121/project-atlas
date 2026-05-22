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
  description: "Read a compact project-atlas context pack. This tool never writes knowledge files.",
  args: {
    query: tool.schema.string().optional().describe("Optional topic or keyword"),
    budget: tool.schema.number().optional().describe("Maximum context characters"),
  },
  async execute(args, context) {
    const repo = context.worktree || context.directory || process.cwd();
    const commandArgs = ["context", "--repo", repo, "--budget", String(args.budget || 8000)];
    if (args.query) commandArgs.push("--query", args.query);
    const result = await run("project-atlas", commandArgs, repo, context.abort);
    return {
      output: result.stdout || result.stderr,
      metadata: { repo, exitCode: result.exitCode },
    };
  },
});
