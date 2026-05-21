import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { changedFiles, currentCommit, runGit, walkFiles, worktreeHash } from "./utils.js";
import type { Candidate, PomInfo, ScanResult, SensitiveFinding } from "./types.js";

export function scanRepo(repo: string, mode: "full" | "changed"): ScanResult {
  const allFiles = walkFiles(repo);
  const scopedFiles = mode === "changed" ? changedFiles(repo) : allFiles;
  const entries: Record<string, Array<{ path: string; name: string }>> = {
    controller: [],
    service: [],
    feign: [],
    tasks: [],
    mq: [],
    remote: [],
    config: [],
  };
  for (const rel of scopedFiles) {
    const type = entryType(rel);
    if (type) {
      entries[type].push({ path: rel, name: titleFromPath(rel) });
    }
  }
  const pomFiles = allFiles.filter((rel) => rel === "pom.xml" || rel.endsWith("/pom.xml")).sort();
  const modules = pomFiles.map((rel) => parsePom(repo, rel));
  const knowledgeFiles = allFiles.filter((rel) => rel.startsWith("knowledge/")).sort();
  return {
    schema_version: "1.0",
    mode,
    repo,
    base_commit: currentCommit(repo),
    worktree_diff_hash: worktreeHash(repo),
    changed_files: changedFiles(repo),
    project: {
      name: path.basename(repo),
      maven: modules[0] ?? {},
      modules,
    },
    entries,
    knowledge: {
      has_manifest: existsSync(path.join(repo, "knowledge/manifest.json")),
      files: knowledgeFiles,
      empty_sections: knowledgeFiles
        .filter((rel) => rel.endsWith("README.md"))
        .filter((rel) => read(repo, rel).trim().split(/\r?\n/).length <= 3),
    },
    candidates: detectCandidates(scopedFiles),
    sensitive_config_findings: sensitiveFindings(repo, scopedFiles.length ? scopedFiles : allFiles),
    external_evidence: [],
  };
}

function parsePom(repo: string, rel: string): PomInfo {
  const text = read(repo, rel);
  const tag = (name: string) => text.match(new RegExp(`<${name}>\\s*([^<]+?)\\s*</${name}>`))?.[1] ?? "";
  const modules = [...text.matchAll(/<module>\s*([^<]+?)\s*<\/module>/g)].map((match) => match[1]);
  return { path: rel, groupId: tag("groupId"), artifactId: tag("artifactId"), version: tag("version"), modules };
}

function read(repo: string, rel: string): string {
  try {
    return readFileSync(path.join(repo, rel), "utf8");
  } catch {
    return "";
  }
}

function entryType(rel: string): string {
  if (!rel.endsWith(".java")) return "";
  if (rel.includes("/controller/") || /Controller\.java$/.test(rel)) return "controller";
  if (rel.includes("/service/") || /Service(Impl)?\.java$/.test(rel)) return "service";
  if (rel.includes("/feign/") || /Feign(Service)?(Impl)?\.java$/.test(rel)) return "feign";
  if (rel.includes("/tasks/") || /Task\.java$|Scheduled.*\.java$/.test(rel)) return "tasks";
  if (rel.includes("/mq/") || /Consumer\.java$|Producer\.java$/.test(rel)) return "mq";
  if (rel.includes("/remote/") || /Remote.*\.java$/.test(rel)) return "remote";
  if (rel.includes("/config/") || /Config(uration)?\.java$/.test(rel)) return "config";
  return "";
}

function titleFromPath(rel: string): string {
  return path.basename(rel).replace(/\.(java|xml|ya?ml|properties|md)$/i, "");
}

function detectCandidates(files: string[]): ScanResult["candidates"] {
  const text = files.join("\n").toLowerCase();
  const has = (items: string[]) => items.some((item) => text.includes(item));
  const domains: Candidate[] = [];
  const workflows: Candidate[] = [];
  const integrations: Candidate[] = [];
  const risks: Candidate[] = [];
  if (has(["goods", "商品"])) domains.push({ target: "knowledge/domains/goods-master.md", reason: "goods domain entry detected" });
  if (has(["precisionorder", "精准订货"])) domains.push({ target: "knowledge/domains/precision-order.md", reason: "precision order entry detected" });
  if (has(["hddatasync", "hd", "海鼎"])) workflows.push({ target: "knowledge/workflows/hd-sync.md", reason: "HD sync entry detected" });
  if (has(["precisionorder", "精准订货"])) workflows.push({ target: "knowledge/workflows/precision-order-flow.md", reason: "precision order workflow detected" });
  if (has(["mall", "feign", "mq", "remote", "thirdapi"])) integrations.push({ target: "knowledge/integrations/external-systems.md", reason: "external integration entry detected" });
  if (has(["datafix", "inner", "thirdapi", "password", "secret", "token", "accesskey"])) risks.push({ target: "knowledge/quality/risk-hotspots.md", reason: "risk-sensitive entry detected" });
  return { domains, workflows, integrations, risks };
}

function sensitiveFindings(repo: string, files: string[]): SensitiveFinding[] {
  const findings: SensitiveFinding[] = [];
  const configFiles = files.filter((rel) => /(^|\/)application.*\.(ya?ml|properties)$/.test(rel) || rel.includes("/config/"));
  const rules: Array<[string, RegExp]> = [
    ["builtin.secret.password", /password\s*[:=]\s*\S{3,}/i],
    ["builtin.secret.token", /token\s*[:=]\s*\S{8,}/i],
    ["builtin.secret.access-key", /accessKey(Id|Secret)?\s*[:=]\s*\S{8,}/i],
    ["builtin.secret.generic", /secret\s*[:=]\s*\S{8,}/i],
  ];
  for (const rel of configFiles) {
    const text = read(repo, rel);
    for (const [ruleId, pattern] of rules) {
      if (pattern.test(text)) {
        findings.push({ path: rel, rule_id: ruleId, rule_category: "secret", action: "redact_value" });
      }
    }
  }
  return findings;
}

export function gitChangedFiles(repo: string): string[] {
  return runGit(repo, ["diff", "--name-only"]).split(/\r?\n/).filter(Boolean);
}
