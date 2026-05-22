import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

export function runGit(repo: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

export function resolveRepo(input = "."): string {
  if (!existsSync(input)) {
    throw new Error(`Repository path does not exist: ${input}`);
  }
  const root = runGit(input, ["rev-parse", "--show-toplevel"]);
  if (!root) {
    throw new Error("project-atlas currently supports Git repositories only.");
  }
  return root;
}

export function currentCommit(repo: string): string {
  return runGit(repo, ["rev-parse", "HEAD"]);
}

export function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

export function sha256Text(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function fileHash(filePath: string): string {
  if (!existsSync(filePath)) {
    return "sha256:missing";
  }
  return `sha256:${createHash("sha256").update(readFileSync(filePath)).digest("hex")}`;
}

export function repoFileHash(repo: string, rel: string): string {
  return fileHash(path.join(repo, rel));
}

export function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function writeIfMissing(filePath: string, content: string): void {
  if (existsSync(filePath)) {
    return;
  }
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, content, "utf8");
}

export function walkFiles(repo: string, dirRel = "."): string[] {
  const output: string[] = [];
  const root = path.join(repo, dirRel);
  if (!existsSync(root)) {
    return output;
  }
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const rel = dirRel === "." ? entry.name : path.posix.join(toPosix(dirRel), entry.name);
    if (entry.isDirectory()) {
      if ([".git", ".project-atlas", ".opencode", ".code-review-graph", "node_modules", "dist", "target"].includes(entry.name)) {
        continue;
      }
      output.push(...walkFiles(repo, rel));
    } else {
      output.push(rel);
    }
  }
  return output.sort();
}

export function changedFiles(repo: string): string[] {
  const values = new Set<string>();
  for (const args of [
    ["diff", "--name-only"],
    ["diff", "--cached", "--name-only"],
    ["ls-files", "--others", "--exclude-standard"],
  ]) {
    for (const line of runGit(repo, args).split(/\r?\n/)) {
      if (line && !line.startsWith(".project-atlas/")) {
        values.add(line);
      }
    }
  }
  return [...values].sort();
}

export function worktreeHash(repo: string): string {
  const parts: string[] = [];
  parts.push(runGit(repo, ["diff", "--binary"]));
  parts.push(runGit(repo, ["diff", "--cached", "--binary"]));
  for (const rel of runGit(repo, ["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/).filter(Boolean).sort()) {
    if (rel.startsWith(".project-atlas/")) {
      continue;
    }
    const abs = path.join(repo, rel);
    if (!existsSync(abs) || statSync(abs).size > 1024 * 1024) {
      parts.push(`${rel}\tlarge-or-missing`);
      continue;
    }
    parts.push(`${rel}\t${fileHash(abs)}`);
  }
  return sha256Text(parts.join("\n"));
}

export function updateGitignore(repo: string): void {
  const block = [
    "# >>> project-atlas >>>",
    ".project-atlas/",
    "knowledge/**/.kbtmp.*",
    "knowledge/**/*.kbtmp.*",
    "# <<< project-atlas <<<",
    "",
  ].join("\n");
  const filePath = path.join(repo, ".gitignore");
  const current = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const start = "# >>> project-atlas >>>";
  const end = "# <<< project-atlas <<<";
  if (current.includes(start) && current.includes(end)) {
    const next = current.replace(new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\n?`, "m"), block);
    writeFileSync(filePath, next, "utf8");
    return;
  }
  writeFileSync(filePath, `${current}${current && !current.endsWith("\n") ? "\n" : ""}${current ? "\n" : ""}${block}`, "utf8");
}

export function ensureEvidenceIgnored(repo: string): void {
  const ignored = runGit(repo, ["check-ignore", ".project-atlas/proposals/.keep"]);
  if (!ignored) {
    throw new Error(".project-atlas/proposals/.keep is not ignored by Git. Run project-atlas init first.");
  }
  const tracked = runGit(repo, ["ls-files", ".project-atlas"]);
  if (tracked) {
    throw new Error(`.project-atlas is tracked by Git and must be removed from the index first:\n${tracked}`);
  }
}

export function proposalRoot(repo: string): string {
  return path.join(repo, ".project-atlas", "proposals");
}

export function validateKnowledgeTarget(target: string): string {
  if (/[\r\n\0]/.test(target)) {
    throw new Error(`Invalid target path: ${target}`);
  }
  const normalized = toPosix(path.posix.normalize(target));
  if (normalized.startsWith("../") || normalized.includes("/../") || path.isAbsolute(normalized)) {
    throw new Error(`Invalid target path: ${target}`);
  }
  if (normalized === "knowledge/manifest.json") {
    throw new Error("proposal cannot modify knowledge/manifest.json in v1.");
  }
  if (normalized.startsWith("knowledge/assets/")) {
    throw new Error("proposal cannot write knowledge/assets/ in v1.");
  }
  if (!normalized.startsWith("knowledge/")) {
    throw new Error(`proposal target must be under knowledge/**: ${target}`);
  }
  return normalized;
}

export function replaceFileAtomic(targetPath: string, content: string): void {
  ensureDir(path.dirname(targetPath));
  const tempPath = path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.kbtmp.${process.pid}`);
  writeFileSync(tempPath, content, "utf8");
  renameSync(tempPath, targetPath);
}

export function removeFileIfExists(filePath: string): void {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
