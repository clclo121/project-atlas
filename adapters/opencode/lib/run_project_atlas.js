import { spawn } from "node:child_process";

export function repoFromContext(context) {
  return context.worktree || context.directory || process.cwd();
}

export function runProjectAtlas(args, cwd, abort) {
  return new Promise((resolve) => {
    const child = spawn("project-atlas", args, { cwd, shell: false, env: process.env });
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

export function outputText(result) {
  return result.stdout || result.stderr;
}

export function withHumanApplyMessage(text) {
  return `${text}\n\nNo apply tool is available. A human must run project-atlas apply in a terminal.`;
}
