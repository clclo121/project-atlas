import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { buildFrontmatter, ensureKnowledgeFrontmatter, parseFrontmatter } from "./frontmatter.js";
import { scanRepo } from "./scanner.js";
import type { ContextItem, LatestIndex, OutputFormat, Proposal, ProposalOperation, ProposalStatus, StaleItem, TriggerResult } from "./types.js";
import {
  changedFiles,
  currentCommit,
  ensureDir,
  ensureEvidenceIgnored,
  fileHash,
  proposalRoot,
  readJson,
  removeFileIfExists,
  replaceFileAtomic,
  repoFileHash,
  resolveRepo,
  sha256Text,
  updateGitignore,
  validateKnowledgeTarget,
  walkFiles,
  worktreeHash,
  writeIfMissing,
  writeJson,
} from "./utils.js";

interface ParsedArgs {
  command: string;
  flags: Record<string, string | boolean>;
}

interface UpdateInput {
  source_files?: string[];
  updates: Array<{ target: string; content: string }>;
}

const commandOptions: Record<string, string[]> = {
  init: ["repo"],
  scan: ["repo", "mode"],
  context: ["repo", "query", "budget", "max-context-chars", "format"],
  stale: ["repo", "format"],
  propose: ["repo", "target", "content-file", "updates-file", "reason"],
  apply: ["repo", "proposal-id", "confirm"],
  "review-summary": ["repo", "proposal-id"],
  cleanup: ["repo", "force"],
  hash: ["repo", "path"],
};

const globalHelp = [
  "Usage: project-kb <command> [options]",
  "",
  "Git-first project knowledge base governance CLI.",
  "",
  "Commands:",
  "  init             Create knowledge skeleton and local evidence directory",
  "  scan             Scan project shape, candidates, and sensitive config findings",
  "  context          Print a compact context pack",
  "  stale            Check knowledge docs against source file hashes",
  "  propose          Create reviewable knowledge update evidence",
  "  apply            Apply a proposal with TTY confirmation",
  "  review-summary   Print reviewer-friendly proposal evidence",
  "  cleanup          Remove stale temporary knowledge files",
  "  hash             Print a repository file hash",
  "",
  "Examples:",
  "  project-kb init --repo /path/to/repo",
  "  project-kb context --repo /path/to/repo --query order --budget 8000",
  "  project-kb propose --repo /path/to/repo --updates-file updates.json --reason \"update project knowledge\"",
  "",
  "Run `project-kb <command> --help` for command details.",
].join("\n");

const commandHelp: Record<string, string> = {
  init: [
    "Usage: project-kb init --repo <repo>",
    "",
    "Options:",
    "  --repo <path>       Git repository path. Defaults to current directory.",
    "",
    "Example:",
    "  project-kb init --repo /path/to/repo",
  ].join("\n"),
  scan: [
    "Usage: project-kb scan --repo <repo> --mode <full|changed>",
    "",
    "Options:",
    "  --repo <path>       Git repository path. Defaults to current directory.",
    "  --mode <value>      Scan mode. Use full or changed. Defaults to full.",
    "",
    "Example:",
    "  project-kb scan --repo /path/to/repo --mode changed",
  ].join("\n"),
  context: [
    "Usage: project-kb context --repo <repo> [--query <text>] [--budget <chars>] [--format <markdown|json>]",
    "",
    "Options:",
    "  --repo <path>       Git repository path. Defaults to current directory.",
    "  --query <text>      Topic or keyword used to filter context files.",
    "  --budget <chars>    Positive character budget. Defaults to 8000.",
    "  --format <value>    Output format. Use markdown or json. Defaults to markdown.",
    "",
    "Example:",
    "  project-kb context --repo /path/to/repo --query order --budget 8000 --format json",
  ].join("\n"),
  stale: [
    "Usage: project-kb stale --repo <repo> [--format <markdown|json>]",
    "",
    "Options:",
    "  --repo <path>       Git repository path. Defaults to current directory.",
    "  --format <value>    Output format. Use markdown or json. Defaults to markdown.",
    "",
    "Example:",
    "  project-kb stale --repo /path/to/repo --format json",
  ].join("\n"),
  propose: [
    "Usage: project-kb propose --repo <repo> --updates-file <file> --reason <text>",
    "Usage: project-kb propose --repo <repo> --target <knowledge/file.md> --content-file <file> --reason <text>",
    "",
    "Options:",
    "  --repo <path>          Git repository path. Defaults to current directory.",
    "  --updates-file <file>  JSON file with source_files and updates.",
    "  --target <path>        Single target under knowledge/**.",
    "  --content-file <file>  Markdown content for a single target.",
    "  --reason <text>        Human-readable proposal reason.",
    "",
    "Example:",
    "  project-kb propose --repo /path/to/repo --updates-file updates.json --reason \"update project knowledge\"",
  ].join("\n"),
  apply: [
    "Usage: project-kb apply --repo <repo> --proposal-id <id> --confirm",
    "",
    "Options:",
    "  --repo <path>          Git repository path. Defaults to current directory.",
    "  --proposal-id <id>     Proposal id under .project-kb/proposals/.",
    "  --confirm              Required. Still asks for interactive TTY confirmation.",
    "",
    "Example:",
    "  project-kb apply --repo /path/to/repo --proposal-id kb-20260521-120000-1 --confirm",
  ].join("\n"),
  "review-summary": [
    "Usage: project-kb review-summary --repo <repo> [--proposal-id <id>]",
    "",
    "Options:",
    "  --repo <path>          Git repository path. Defaults to current directory.",
    "  --proposal-id <id>     Proposal id. Defaults to latest.json.",
    "",
    "Example:",
    "  project-kb review-summary --repo /path/to/repo --proposal-id kb-20260521-120000-1",
  ].join("\n"),
  cleanup: [
    "Usage: project-kb cleanup --repo <repo> [--force]",
    "",
    "Options:",
    "  --repo <path>       Git repository path. Defaults to current directory.",
    "  --force             Remove all .kbtmp files instead of only old files.",
    "",
    "Example:",
    "  project-kb cleanup --repo /path/to/repo --force",
  ].join("\n"),
  hash: [
    "Usage: project-kb hash --repo <repo> --path <file>",
    "",
    "Options:",
    "  --repo <path>       Git repository path. Defaults to current directory.",
    "  --path <file>       Repository-relative file path to hash.",
    "",
    "Example:",
    "  project-kb hash --repo /path/to/repo --path README.md",
  ].join("\n"),
};

export async function runCli(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);
  if (!parsed.command || parsed.command === "--help" || parsed.command === "-h") {
    console.log(globalHelp);
    return;
  }
  if (parsed.command === "help") {
    const topic = optionalStringFlag(parsed.flags, "command");
    console.log(topic && commandHelp[topic] ? commandHelp[topic] : globalHelp);
    return;
  }
  if (!commandOptions[parsed.command]) {
    throw new Error(`Unknown command: ${parsed.command}\n\nRun \`project-kb --help\` to see available commands.`);
  }
  if (parsed.flags.help || parsed.flags.h) {
    console.log(commandHelp[parsed.command]);
    return;
  }
  validateFlags(parsed.command, parsed.flags);
  switch (parsed.command) {
    case "init":
      cmdInit(parsed.flags);
      return;
    case "scan":
      cmdScan(parsed.flags);
      return;
    case "context":
      cmdContext(parsed.flags);
      return;
    case "stale":
      cmdStale(parsed.flags);
      return;
    case "propose":
      cmdPropose(parsed.flags);
      return;
    case "apply":
      await cmdApply(parsed.flags);
      return;
    case "review-summary":
      cmdReviewSummary(parsed.flags);
      return;
    case "cleanup":
      cmdCleanup(parsed.flags);
      return;
    case "hash":
      cmdHash(parsed.flags);
      return;
    default:
      throw new Error(`Unknown command: ${parsed.command || "(empty)"}`);
  }
}

function cmdInit(flags: Record<string, string | boolean>): void {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  updateGitignore(repo);
  for (const dir of [
    "knowledge/project",
    "knowledge/domains",
    "knowledge/workflows",
    "knowledge/contracts",
    "knowledge/integrations",
    "knowledge/quality",
    "knowledge/decisions",
    ".project-kb/proposals",
  ]) {
    ensureDir(path.join(repo, dir));
  }
  writeIfMissing(path.join(repo, ".project-kb/proposals/.keep"), "");
  writeIfMissing(path.join(repo, "knowledge/README.md"), "# Project Knowledge Base\n\nGit-first knowledge assets for humans and AI coding agents.\n");
  writeIfMissing(
    path.join(repo, "knowledge/index.md"),
    [
      "# Knowledge Index",
      "",
      "- [Project Overview](project/overview.md)",
      "- [Domains](domains/README.md)",
      "- [Workflows](workflows/README.md)",
      "- [Contracts](contracts/README.md)",
      "- [Integrations](integrations/README.md)",
      "- [Quality](quality/README.md)",
      "- [Decisions](decisions/README.md)",
      "",
    ].join("\n"),
  );
  writeIfMissing(path.join(repo, "knowledge/glossary.md"), "# Glossary\n\nRecord stable domain terms here.\n");
  for (const dir of ["domains", "workflows", "contracts", "integrations", "quality", "decisions"]) {
    writeIfMissing(path.join(repo, "knowledge", dir, "README.md"), `# ${dir}\n\nThis section is intentionally empty.\n`);
  }
  writeIfMissing(
    path.join(repo, "knowledge/project/overview.md"),
    `${buildFrontmatter({ source_files: ["README.md"], source_hashes: { "README.md": repoFileHash(repo, "README.md") } })}# Project Overview\n\nSummarize what this project does, who uses it, and where the main boundaries are.\n`,
  );
  writeIfMissing(
    path.join(repo, "knowledge/manifest.json"),
    `${JSON.stringify(
      {
        schema_version: "1.0",
        max_context_chars: 8000,
        required_files: ["knowledge/README.md", "knowledge/index.md", "knowledge/manifest.json", "knowledge/glossary.md", "knowledge/project/overview.md"],
        evidence_dir: ".project-kb/proposals",
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Initialized project-kb knowledge base at ${repo}`);
}

function cmdScan(flags: Record<string, string | boolean>): void {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  const mode = stringFlag(flags, "mode", "full");
  if (mode !== "full" && mode !== "changed") {
    throw usageError("scan", "--mode must be full or changed");
  }
  console.log(JSON.stringify(scanRepo(repo, mode), null, 2));
}

function cmdContext(flags: Record<string, string | boolean>): void {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  const budget = typeof flags.budget === "string" ? numberFlag(flags, "budget", 8000, "context") : numberFlag(flags, "max-context-chars", 8000, "context");
  const format = formatFlag(flags, "context");
  const query = stringFlag(flags, "query", "");
  const items = collectContextItems(repo, query);
  const markdown = renderContextMarkdown(items);
  const text = truncate(markdown, budget);
  if (format === "json") {
    console.log(JSON.stringify({ schema_version: "1.0", budget, text, items: items.map((item) => ({ ...item, content: truncate(item.content, budget) })) }, null, 2));
    return;
  }
  console.log(text);
}

function cmdStale(flags: Record<string, string | boolean>): void {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  const format = formatFlag(flags, "stale");
  const items = staleItems(repo);
  if (format === "json") {
    console.log(JSON.stringify({ schema_version: "1.0", items }, null, 2));
    return;
  }
  console.log(renderStaleMarkdown(items));
}

function cmdPropose(flags: Record<string, string | boolean>): void {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  ensureEvidenceIgnored(repo);
  const target = optionalStringFlag(flags, "target");
  const contentFile = optionalStringFlag(flags, "content-file");
  const updatesFile = optionalStringFlag(flags, "updates-file");
  const reason = stringFlag(flags, "reason", "Knowledge update proposal");
  if (target && updatesFile) {
    throw new Error("--target and --updates-file cannot be used together");
  }
  const inputData = loadUpdateInput(repo, target, contentFile, updatesFile);
  const proposal = createProposal(repo, inputData, reason);
  console.log(`proposal_id: ${proposal.proposal_id}`);
  console.log(`proposal_status: ${proposal.proposal_status}`);
  console.log(`proposal_hash: ${proposal.proposal_hash}`);
  console.log(`apply: project-kb apply --repo ${repo} --proposal-id ${proposal.proposal_id} --confirm`);
}

async function cmdApply(flags: Record<string, string | boolean>): Promise<void> {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  const proposalId = stringFlag(flags, "proposal-id", "");
  if (!proposalId) {
    throw new Error("--proposal-id is required");
  }
  if (!flags.confirm) {
    throw new Error("--confirm is required for apply");
  }
  if (!process.stdin.isTTY) {
    throw new Error("apply requires an interactive TTY confirmation.");
  }
  const proposalPath = path.join(proposalRoot(repo), proposalId, "proposal.json");
  const proposal = readJson<Proposal>(proposalPath);
  if (proposal.proposal_status === "blocked_sensitive") {
    throw new Error("blocked_sensitive proposals cannot be applied.");
  }
  assertProposalStillFresh(repo, proposal);
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`Apply proposal ${proposalId}? Type yes to continue: `);
  rl.close();
  if (answer.trim() !== "yes") {
    throw new Error("apply cancelled by user.");
  }
  if (worktreeHash(repo) !== proposal.worktree_diff_hash) {
    throw new Error("worktree changed during confirmation; aborting apply.");
  }
  assertProposalStillFresh(repo, proposal);
  const appliedParts: string[] = [];
  for (const operation of proposal.operations) {
    const targetAbs = path.join(repo, operation.path);
    replaceFileAtomic(targetAbs, operation.content);
    appliedParts.push(`${operation.path}\t${fileHash(targetAbs)}`);
  }
  const appliedHash = sha256Text(appliedParts.join("\n"));
  proposal.proposal_status = "applied";
  proposal.applied_hash = appliedHash;
  proposal.applied_at = new Date().toISOString();
  writeJson(proposalPath, proposal);
  writeEvidence(repo, proposal.proposal_id, "applied", proposal.worktree_diff_hash, proposal.proposal_hash, appliedHash);
  console.log(`applied: ${proposal.proposal_id}`);
  console.log(`applied_hash: ${appliedHash}`);
}

function cmdReviewSummary(flags: Record<string, string | boolean>): void {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  const proposalId = optionalStringFlag(flags, "proposal-id") ?? latestProposalId(repo);
  if (!proposalId) {
    throw new Error("No proposal found. Run project-kb propose first.");
  }
  const proposalDir = path.join(proposalRoot(repo), proposalId);
  const proposal = readJson<Proposal>(path.join(proposalDir, "proposal.json"));
  const triggerPath = path.join(proposalDir, "trigger-result.json");
  const trigger = existsSync(triggerPath) ? readJson<TriggerResult>(triggerPath) : null;
  const stale = staleItems(repo);
  const lines = [
    "# Project KB Review Summary",
    "",
    `- proposal_id: ${proposal.proposal_id}`,
    `- proposal_status: ${proposal.proposal_status}`,
    `- reason: ${proposal.reason}`,
    `- needs_knowledge_update: ${String(trigger?.needs_knowledge_update ?? true)}`,
    `- proposal_hash: ${proposal.proposal_hash}`,
    `- worktree_diff_hash: ${proposal.worktree_diff_hash}`,
    "",
    "## Source Files",
    ...listOrNone(proposal.source_files),
    "",
    "## Target Files",
    ...listOrNone(proposal.target_files),
    "",
    "## Sensitive Scan",
    `- result: ${proposal.sensitive_scan_result}`,
    "",
    "## Stale Status",
    ...stale.map((item) => `- ${item.path}: ${item.status}`),
    "",
    "## Next Step",
    proposal.proposal_status === "proposed"
      ? `- Run: project-kb apply --repo ${repo} --proposal-id ${proposal.proposal_id} --confirm`
      : `- No apply command is available for status ${proposal.proposal_status}.`,
    "",
  ];
  console.log(lines.join("\n"));
}

function cmdCleanup(flags: Record<string, string | boolean>): void {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  const force = Boolean(flags.force);
  let removed = 0;
  for (const rel of walkFiles(repo).filter((item) => item.includes("knowledge/") && item.includes(".kbtmp."))) {
    const abs = path.join(repo, rel);
    const ageMs = Date.now() - statSync(abs).mtimeMs;
    if (force || ageMs > 60 * 60 * 1000) {
      removeFileIfExists(abs);
      removed++;
    }
  }
  console.log(`removed_kbtmp: ${removed}`);
}

function cmdHash(flags: Record<string, string | boolean>): void {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  const rel = stringFlag(flags, "path", "");
  if (!rel) {
    throw usageError("hash", "--path is required");
  }
  console.log(repoFileHash(repo, rel));
}

function collectContextItems(repo: string, query: string): ContextItem[] {
  const groups: Array<{ priority: number; files: string[] }> = [
    { priority: 1, files: globFiles(repo, "openspec/changes", [".md"]) },
    { priority: 2, files: globFiles(repo, "openspec/specs", [".md"]) },
    { priority: 3, files: globFiles(repo, "knowledge", [".md"]).filter((rel) => !rel.startsWith("knowledge/logs/") && !rel.startsWith("knowledge/assets/")) },
  ];
  const items: ContextItem[] = [];
  for (const group of groups) {
    for (const source of group.files) {
      const content = readFileSync(path.join(repo, source), "utf8");
      if (query && !content.toLowerCase().includes(query.toLowerCase()) && !source.toLowerCase().includes(query.toLowerCase())) {
        continue;
      }
      items.push({ source, priority: group.priority, content });
    }
  }
  return items.sort((a, b) => a.priority - b.priority || a.source.localeCompare(b.source));
}

function renderContextMarkdown(items: ContextItem[]): string {
  const lines = ["# Project KB Context Pack", ""];
  for (const item of items) {
    lines.push(`## Source: \`${item.source}\``, "", item.content.trim(), "");
  }
  return lines.join("\n");
}

function staleItems(repo: string): StaleItem[] {
  return globFiles(repo, "knowledge", [".md"])
    .filter((rel) => !rel.startsWith("knowledge/logs/") && !rel.startsWith("knowledge/assets/"))
    .map((rel) => {
      const content = readFileSync(path.join(repo, rel), "utf8");
      const { metadata } = parseFrontmatter(content);
      if (!metadata || metadata.source_files.length === 0) {
        return { path: rel, status: "missing_metadata", source_files: [], details: ["frontmatter or source_files missing"] };
      }
      const details: string[] = [];
      let status: StaleItem["status"] = "fresh";
      for (const source of metadata.source_files) {
        const current = repoFileHash(repo, source);
        const expected = metadata.source_hashes[source];
        if (current === "sha256:missing") {
          status = "missing_source";
          details.push(`${source} is missing`);
        } else if (!expected || expected !== current) {
          if (status !== "missing_source") status = "stale";
          details.push(`${source} hash changed`);
        }
      }
      return { path: rel, status, source_files: metadata.source_files, details };
    });
}

function renderStaleMarkdown(items: StaleItem[]): string {
  return ["# Project KB Stale Report", "", ...items.map((item) => `- ${item.path}: ${item.status}${item.details.length ? ` (${item.details.join("; ")})` : ""}`), ""].join("\n");
}

function createProposal(repo: string, inputData: UpdateInput, reason: string): Proposal {
  const root = proposalRoot(repo);
  ensureDir(root);
  const proposalId = `kb-${timestamp()}-${Math.floor(Math.random() * 100000)}`;
  const dir = path.join(root, proposalId);
  ensureDir(dir);
  const sourceFiles = (inputData.source_files ?? []).filter(Boolean);
  const sourceHashes = Object.fromEntries(sourceFiles.map((source) => [source, repoFileHash(repo, source)]));
  const targetFiles = inputData.updates.map((update) => validateKnowledgeTarget(update.target));
  const sensitiveTargets = inputData.updates.filter((update) => hasSensitiveContent(update.content)).map((update) => validateKnowledgeTarget(update.target));
  const status: ProposalStatus = sensitiveTargets.length ? "blocked_sensitive" : "proposed";
  if (sensitiveTargets.length) {
    writeJson(path.join(dir, "blocked-sensitive-summary.json"), {
      schema_version: "1.0",
      blocked_at: new Date().toISOString(),
      items: sensitiveTargets.map((target) => ({ path: target, rule_id: "builtin.secret.generic", rule_category: "secret", action: "blocked_full_diff" })),
    });
  }
  const operations: ProposalOperation[] =
    status === "blocked_sensitive"
      ? []
      : inputData.updates.map((update) => {
          const target = validateKnowledgeTarget(update.target);
          const content = ensureKnowledgeFrontmatter(update.content, {
            source_files: sourceFiles,
            source_hashes: sourceHashes,
            generated_by: "project-kb",
            review_status: "draft",
          });
          return { type: "replace_file", path: target, content, target_current_hash: repoFileHash(repo, target) };
        });
  const proposalBase: Omit<Proposal, "proposal_hash"> = {
    proposal_id: proposalId,
    schema_version: "1.0",
    base_commit: currentCommit(repo),
    worktree_diff_hash: worktreeHash(repo),
    source_files: sourceFiles,
    target_files: targetFiles,
    operations,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    reason,
    sensitive_scan_result: status === "blocked_sensitive" ? "blocked" : "passed",
    proposal_status: status,
  };
  const proposalHash = sha256Text(JSON.stringify(proposalBase));
  const proposal: Proposal = { ...proposalBase, proposal_hash: proposalHash };
  writeJson(path.join(dir, "proposal.json"), proposal);
  writeFileSync(path.join(dir, "dry-run.diff"), status === "blocked_sensitive" ? "" : renderDryRunDiff(repo, operations), "utf8");
  writeEvidence(repo, proposalId, status, proposal.worktree_diff_hash, proposal.proposal_hash, "");
  return proposal;
}

function loadUpdateInput(repo: string, target?: string, contentFile?: string, updatesFile?: string): UpdateInput {
  if (updatesFile) {
    const parsed = readJson<UpdateInput>(path.resolve(repo, updatesFile));
    if (!Array.isArray(parsed.updates) || parsed.updates.length === 0) {
      throw new Error("updates-file must contain a non-empty updates array.");
    }
    return { source_files: parsed.source_files ?? [], updates: parsed.updates };
  }
  if (!target || !contentFile) {
    throw new Error("provide --updates-file or --target with --content-file");
  }
  return { source_files: [], updates: [{ target, content: readFileSync(path.resolve(repo, contentFile), "utf8") }] };
}

function writeEvidence(repo: string, proposalId: string, status: ProposalStatus, worktree: string, proposalHash: string, appliedHash: string): void {
  const dir = path.join(proposalRoot(repo), proposalId);
  const latest: LatestIndex = {
    proposal_id: proposalId,
    proposal_status: status,
    worktree_diff_hash: worktree,
    proposal_hash: proposalHash,
    applied_hash: appliedHash,
    updated_at: new Date().toISOString(),
  };
  const trigger: TriggerResult = {
    schema_version: "1.0",
    proposal_id: proposalId,
    proposal_hash: proposalHash,
    worktree_diff_hash: worktree,
    applied_hash: appliedHash,
    needs_knowledge_update: true,
    proposal_status: status,
    updated_at: latest.updated_at,
  };
  writeJson(path.join(proposalRoot(repo), "latest.json"), latest);
  writeJson(path.join(dir, "trigger-result.json"), trigger);
}

function assertProposalStillFresh(repo: string, proposal: Proposal): void {
  for (const operation of proposal.operations) {
    const current = repoFileHash(repo, operation.path);
    if (current !== operation.target_current_hash) {
      throw new Error(`target changed since proposal was created: ${operation.path}`);
    }
  }
}

function latestProposalId(repo: string): string {
  const latestPath = path.join(proposalRoot(repo), "latest.json");
  return existsSync(latestPath) ? readJson<LatestIndex>(latestPath).proposal_id : "";
}

function renderDryRunDiff(repo: string, operations: ProposalOperation[]): string {
  return operations
    .map((operation) => {
      const oldContent = existsSync(path.join(repo, operation.path)) ? readFileSync(path.join(repo, operation.path), "utf8") : "";
      return [`--- ${operation.path}`, `+++ ${operation.path}`, `@@`, `- ${oldContent.trim().split(/\r?\n/).slice(0, 12).join("\n- ")}`, `+ ${operation.content.trim().split(/\r?\n/).slice(0, 12).join("\n+ ")}`, ""].join("\n");
    })
    .join("\n");
}

function hasSensitiveContent(content: string): boolean {
  return [
    /password\s*[:=]\s*\S{3,}/i,
    /token\s*[:=]\s*\S{8,}/i,
    /accessKey(Id|Secret)?\s*[:=]\s*\S{8,}/i,
    /secret\s*[:=]\s*\S{8,}/i,
  ].some((rule) => rule.test(content));
}

function globFiles(repo: string, dir: string, suffixes: string[]): string[] {
  const abs = path.join(repo, dir);
  if (!existsSync(abs)) {
    return [];
  }
  const output: string[] = [];
  const visit = (currentAbs: string, currentRel: string): void => {
    for (const entry of readdirSync(currentAbs, { withFileTypes: true })) {
      const rel = path.posix.join(currentRel, entry.name);
      const childAbs = path.join(repo, rel);
      if (entry.isDirectory()) {
        visit(childAbs, rel);
      } else if (suffixes.some((suffix) => entry.name.endsWith(suffix))) {
        output.push(rel);
      }
    }
  };
  visit(abs, dir);
  return output.sort();
}

function listOrNone(items: string[]): string[] {
  return items.length ? items.map((item) => `- ${item}`) : ["- none"];
}

function truncate(value: string, budget: number): string {
  if (value.length <= budget) {
    return value;
  }
  return `${value.slice(0, Math.max(0, budget))}\n...(truncated)`;
}

function timestamp(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "", ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  for (let index = 0; index < rest.length; index++) {
    const item = rest[index];
    if (!item.startsWith("--")) {
      throw usageError(command, `Unexpected argument: ${item}`);
    }
    const key = item.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      index++;
    }
  }
  return { command, flags };
}

function validateFlags(command: string, flags: Record<string, string | boolean>): void {
  const allowed = new Set([...(commandOptions[command] ?? []), "help", "h"]);
  for (const key of Object.keys(flags)) {
    if (!allowed.has(key)) {
      throw usageError(command, `Unknown option: --${key}`);
    }
  }
}

function stringFlag(flags: Record<string, string | boolean>, key: string, fallback: string): string {
  const value = flags[key];
  return typeof value === "string" ? value : fallback;
}

function optionalStringFlag(flags: Record<string, string | boolean>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function numberFlag(flags: Record<string, string | boolean>, key: string, fallback: number, command = ""): number {
  const value = flags[key];
  if (typeof value !== "string") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw usageError(command, `--${key} must be a positive number`);
  }
  return parsed;
}

function formatFlag(flags: Record<string, string | boolean>, command: string): OutputFormat {
  const format = stringFlag(flags, "format", "markdown");
  if (format !== "markdown" && format !== "json") {
    throw usageError(command, "--format must be markdown or json");
  }
  return format;
}

function usageError(command: string, message: string): Error {
  const help = commandHelp[command];
  if (!help) {
    return new Error(`${message}\n\nRun \`project-kb --help\` to see available commands.`);
  }
  return new Error(`${message}\n\n${help}`);
}
