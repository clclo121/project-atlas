import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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
  description: "Create a project-kb proposal. This tool never applies knowledge changes.",
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
    const repo = context.worktree || context.directory || process.cwd();
    const dir = await mkdtemp(path.join(tmpdir(), "project-kb-opencode-"));
    const updatesFile = path.join(dir, "updates.json");
    await writeFile(updatesFile, JSON.stringify({ source_files: args.sourceFiles || [], updates: args.updates }, null, 2), "utf8");
    try {
      const result = await run("project-kb", ["propose", "--repo", repo, "--updates-file", updatesFile, "--reason", args.reason], repo, context.abort);
      return {
        output: `${result.stdout || result.stderr}\n\nNo apply tool is available. A human must run project-kb apply in a terminal.`,
        metadata: { repo, exitCode: result.exitCode },
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
});
