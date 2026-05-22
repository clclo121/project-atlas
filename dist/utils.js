import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
export function runGit(repo, args) {
    try {
        return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    }
    catch {
        return "";
    }
}
export function resolveRepo(input = ".") {
    if (!existsSync(input)) {
        throw new Error(`Repository path does not exist: ${input}`);
    }
    const root = runGit(input, ["rev-parse", "--show-toplevel"]);
    if (!root) {
        throw new Error("project-kb currently supports Git repositories only.");
    }
    return root;
}
export function currentCommit(repo) {
    return runGit(repo, ["rev-parse", "HEAD"]);
}
export function toPosix(value) {
    return value.split(path.sep).join("/");
}
export function sha256Text(value) {
    return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
export function fileHash(filePath) {
    if (!existsSync(filePath)) {
        return "sha256:missing";
    }
    return `sha256:${createHash("sha256").update(readFileSync(filePath)).digest("hex")}`;
}
export function repoFileHash(repo, rel) {
    return fileHash(path.join(repo, rel));
}
export function writeJson(filePath, value) {
    writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
export function readJson(filePath) {
    return JSON.parse(readFileSync(filePath, "utf8"));
}
export function ensureDir(dir) {
    mkdirSync(dir, { recursive: true });
}
export function writeIfMissing(filePath, content) {
    if (existsSync(filePath)) {
        return;
    }
    ensureDir(path.dirname(filePath));
    writeFileSync(filePath, content, "utf8");
}
export function walkFiles(repo, dirRel = ".") {
    const output = [];
    const root = path.join(repo, dirRel);
    if (!existsSync(root)) {
        return output;
    }
    for (const entry of readdirSync(root, { withFileTypes: true })) {
        const rel = dirRel === "." ? entry.name : path.posix.join(toPosix(dirRel), entry.name);
        if (entry.isDirectory()) {
            if ([".git", ".project-kb", ".opencode", ".code-review-graph", "node_modules", "dist", "target"].includes(entry.name)) {
                continue;
            }
            output.push(...walkFiles(repo, rel));
        }
        else {
            output.push(rel);
        }
    }
    return output.sort();
}
export function changedFiles(repo) {
    const values = new Set();
    for (const args of [
        ["diff", "--name-only"],
        ["diff", "--cached", "--name-only"],
        ["ls-files", "--others", "--exclude-standard"],
    ]) {
        for (const line of runGit(repo, args).split(/\r?\n/)) {
            if (line && !line.startsWith(".project-kb/")) {
                values.add(line);
            }
        }
    }
    return [...values].sort();
}
export function worktreeHash(repo) {
    const parts = [];
    parts.push(runGit(repo, ["diff", "--binary"]));
    parts.push(runGit(repo, ["diff", "--cached", "--binary"]));
    for (const rel of runGit(repo, ["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/).filter(Boolean).sort()) {
        if (rel.startsWith(".project-kb/")) {
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
export function updateGitignore(repo) {
    const block = [
        "# >>> project-kb >>>",
        ".project-kb/",
        "knowledge/**/.kbtmp.*",
        "knowledge/**/*.kbtmp.*",
        "# <<< project-kb <<<",
        "",
    ].join("\n");
    const filePath = path.join(repo, ".gitignore");
    const current = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
    const start = "# >>> project-kb >>>";
    const end = "# <<< project-kb <<<";
    if (current.includes(start) && current.includes(end)) {
        const next = current.replace(new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\n?`, "m"), block);
        writeFileSync(filePath, next, "utf8");
        return;
    }
    writeFileSync(filePath, `${current}${current && !current.endsWith("\n") ? "\n" : ""}${current ? "\n" : ""}${block}`, "utf8");
}
export function ensureEvidenceIgnored(repo) {
    const ignored = runGit(repo, ["check-ignore", ".project-kb/proposals/.keep"]);
    if (!ignored) {
        throw new Error(".project-kb/proposals/.keep is not ignored by Git. Run project-kb init first.");
    }
    const tracked = runGit(repo, ["ls-files", ".project-kb"]);
    if (tracked) {
        throw new Error(`.project-kb is tracked by Git and must be removed from the index first:\n${tracked}`);
    }
}
export function proposalRoot(repo) {
    return path.join(repo, ".project-kb", "proposals");
}
export function validateKnowledgeTarget(target) {
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
export function replaceFileAtomic(targetPath, content) {
    ensureDir(path.dirname(targetPath));
    const tempPath = path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.kbtmp.${process.pid}`);
    writeFileSync(tempPath, content, "utf8");
    renameSync(tempPath, targetPath);
}
export function removeFileIfExists(filePath) {
    if (existsSync(filePath)) {
        unlinkSync(filePath);
    }
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
