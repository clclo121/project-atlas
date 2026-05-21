import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { buildFrontmatter, ensureKnowledgeFrontmatter, parseFrontmatter, type KnowledgeMetadata } from "./frontmatter.js";
import { scanRepo } from "./scanner.js";
import type {
  CheckItem,
  CheckResult,
  ContextItem,
  ExternalEvidenceItem,
  LatestIndex,
  MemoryCandidateInput,
  MemoryCandidateItem,
  MemoryType,
  OutputFormat,
  Proposal,
  ProposalOperation,
  ProposalStatus,
  StaleItem,
  TriggerResult,
} from "./types.js";
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
  external_evidence?: ExternalEvidenceItem[];
  updates: Array<{ target: string; content: string }>;
}

const commandOptions: Record<string, string[]> = {
  init: ["repo", "template"],
  scan: ["repo", "mode", "external-evidence-file"],
  context: ["repo", "query", "source-file", "budget", "max-context-chars", "format", "memory-type", "topic", "scope"],
  stale: ["repo", "format"],
  propose: ["repo", "target", "content-file", "updates-file", "reason", "inherit-source-metadata", "external-evidence-file"],
  remember: ["repo", "candidate-file", "reason", "format", "replace-existing"],
  check: ["repo", "format"],
  apply: ["repo", "proposal-id", "confirm"],
  "review-summary": ["repo", "proposal-id"],
  cleanup: ["repo", "force"],
  hash: ["repo", "path"],
};

type InitTemplateName = "generic-service" | "java-backend" | "frontend-app";

interface InitTemplate {
  displayName: string;
  overview: string;
  sections: Record<string, string>;
}

const initTemplates: Record<InitTemplateName, InitTemplate> = {
  "generic-service": {
    displayName: "Generic Service",
    overview: "Summarize this generic service, who uses it, and which runtime boundaries matter most.",
    sections: {
      domains: "Record stable business domains, ownership terms, and key user-facing concepts for this generic service.",
      workflows: "Record important service workflows, trigger points, and handoff rules.",
      contracts: "Record public APIs, event contracts, file contracts, and compatibility notes.",
      integrations: "Record upstream and downstream systems, owners, and failure handling expectations.",
      quality: "Record test strategy, release checks, risk hotspots, and operational guardrails.",
      decisions: "Record durable technical and product decisions with source evidence.",
    },
  },
  "java-backend": {
    displayName: "Java Backend",
    overview: "Summarize this Java backend service, its modules, runtime boundaries, and main controller to service responsibilities.",
    sections: {
      domains: "Record Java backend domain concepts, controller entry points, service ownership, and aggregate boundaries.",
      workflows: "Record request flows, scheduled tasks, MQ consumers, transaction rules, and retry behavior.",
      contracts: "Record REST APIs, Feign clients, DTO compatibility rules, and database contract notes.",
      integrations: "Record middleware, downstream services, remote clients, and failure fallback rules.",
      quality: "Record unit, integration, regression, and release checks for Java backend changes.",
      decisions: "Record durable architecture decisions, dependency choices, and migration notes.",
    },
  },
  "frontend-app": {
    displayName: "Frontend App",
    overview: "Summarize this frontend app, user groups, key pages, routing boundaries, and data ownership.",
    sections: {
      domains: "Record user-facing concepts, page ownership, state naming, and product language.",
      workflows: "Record routing flows, form flows, async loading rules, and empty or error states.",
      contracts: "Record API contracts, component props, event payloads, and compatibility notes.",
      integrations: "Record backend APIs, auth dependencies, analytics, uploads, and third-party SDKs.",
      quality: "Record visual checks, browser coverage, build checks, and accessibility expectations.",
      decisions: "Record durable UI, state management, routing, and dependency decisions.",
    },
  },
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
  "  remember         Create reviewable project memory proposals",
  "  check            Check project knowledge health",
  "  apply            Apply a proposal with TTY confirmation",
  "  review-summary   Print reviewer-friendly proposal evidence",
  "  cleanup          Remove stale temporary knowledge files",
  "  hash             Print a repository file hash",
  "",
  "Examples:",
  "  project-kb init --repo /path/to/repo",
  "  project-kb context --repo /path/to/repo --query order --budget 8000",
  "  project-kb remember --repo /path/to/repo --candidate-file memory.json --reason \"capture project memory\"",
  "",
  "Run `project-kb <command> --help` for command details.",
].join("\n");

const commandHelp: Record<string, string> = {
  init: [
    "Usage: project-kb init --repo <repo> [--template <generic-service|java-backend|frontend-app>]",
    "",
    "Options:",
    "  --repo <path>       Git repository path. Defaults to current directory.",
    "  --template <name>   Initial knowledge wording template. Defaults to generic-service.",
    "",
    "Example:",
    "  project-kb init --repo /path/to/repo --template java-backend",
  ].join("\n"),
  scan: [
    "Usage: project-kb scan --repo <repo> --mode <full|changed> [--external-evidence-file <file>]",
    "",
    "Options:",
    "  --repo <path>       Git repository path. Defaults to current directory.",
    "  --mode <value>      Scan mode. Use full or changed. Defaults to full.",
    "  --external-evidence-file <file>  JSON file with external repo map or code graph evidence.",
    "",
    "Example:",
    "  project-kb scan --repo /path/to/repo --mode changed --external-evidence-file evidence.json",
  ].join("\n"),
  context: [
    "Usage: project-kb context --repo <repo> [--query <text>] [--source-file <path>] [--memory-type <decision|experience|project_fact>] [--topic <text>] [--scope <text>] [--budget <chars>] [--format <markdown|json>]",
    "",
    "Options:",
    "  --repo <path>       Git repository path. Defaults to current directory.",
    "  --query <text>      One or more keywords. Any keyword may match.",
    "  --source-file <path>  Return knowledge docs whose source_files include this path.",
    "  --memory-type <value>  Filter project memory type.",
    "  --topic <text>      Filter project memories by topic substring.",
    "  --scope <text>      Filter project memories by scope substring.",
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
    "  --external-evidence-file <file>  JSON file with external repo map or code graph evidence.",
    "  --reason <text>        Human-readable proposal reason.",
    "  --inherit-source-metadata  Merge existing target source_files into the proposal.",
    "",
    "Example:",
    "  project-kb propose --repo /path/to/repo --updates-file updates.json --external-evidence-file evidence.json --reason \"update project knowledge\"",
  ].join("\n"),
  remember: [
    "Usage: project-kb remember --repo <repo> --candidate-file <file> --reason <text> [--format <markdown|json>] [--replace-existing]",
    "",
    "Options:",
    "  --repo <path>             Git repository path. Defaults to current directory.",
    "  --candidate-file <file>   JSON memory candidate file.",
    "  --reason <text>           Human-readable proposal reason.",
    "  --format <value>          Output format. Use markdown or json. Defaults to markdown.",
    "  --replace-existing        Allow proposal generation for existing target files.",
    "",
    "Example:",
    "  project-kb remember --repo /path/to/repo --candidate-file memory.json --reason \"capture review memory\"",
  ].join("\n"),
  check: [
    "Usage: project-kb check --repo <repo> [--format <markdown|json>]",
    "",
    "Options:",
    "  --repo <path>       Git repository path. Defaults to current directory.",
    "  --format <value>    Output format. Use markdown or json. Defaults to markdown.",
    "",
    "Example:",
    "  project-kb check --repo /path/to/repo --format json",
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
    case "remember":
      cmdRemember(parsed.flags);
      return;
    case "check":
      cmdCheck(parsed.flags);
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

export async function runCliCapture(argv: string[]): Promise<string> {
  const originalLog = console.log;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.map((arg) => (typeof arg === "string" ? arg : String(arg))).join(" "));
  };
  try {
    await runCli(argv);
    return lines.length ? `${lines.join("\n")}\n` : "";
  } finally {
    console.log = originalLog;
  }
}

function cmdInit(flags: Record<string, string | boolean>): void {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  const templateName = templateFlag(flags);
  const template = initTemplates[templateName];
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
  writeIfMissing(path.join(repo, "knowledge/README.md"), `# Project Knowledge Base\n\nGit-first knowledge assets for humans and AI coding agents.\n\nTemplate: ${template.displayName}\n`);
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
    writeIfMissing(path.join(repo, "knowledge", dir, "README.md"), `# ${dir}\n\n${template.sections[dir]}\n`);
  }
  writeIfMissing(
    path.join(repo, "knowledge/project/overview.md"),
    `${buildFrontmatter({ source_files: ["README.md"], source_hashes: { "README.md": repoFileHash(repo, "README.md") } })}# Project Overview\n\n${template.overview}\n`,
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
  const externalEvidence = loadExternalEvidence(repo, optionalStringFlag(flags, "external-evidence-file"));
  console.log(JSON.stringify(scanRepo(repo, mode, externalEvidence), null, 2));
}

function cmdContext(flags: Record<string, string | boolean>): void {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  const budget = typeof flags.budget === "string" ? numberFlag(flags, "budget", 8000, "context") : numberFlag(flags, "max-context-chars", 8000, "context");
  const format = formatFlag(flags, "context");
  const query = stringFlag(flags, "query", "");
  const sourceFile = optionalStringFlag(flags, "source-file");
  const memoryType = optionalMemoryTypeFlag(flags, "context");
  const topic = optionalStringFlag(flags, "topic");
  const scope = optionalStringFlag(flags, "scope");
  const items = collectContextItems(repo, { query, sourceFile, memoryType, topic, scope });
  const markdown = renderContextMarkdown(items);
  const truncated = truncate(markdown, budget);
  if (format === "json") {
    console.log(
      JSON.stringify(
        {
          schema_version: "1.0",
          budget,
          budget_used: truncated.budget_used,
          truncated: truncated.truncated,
          text: truncated.text,
          items: items.map((item) => ({ ...item, content: truncate(item.content, budget).text })),
        },
        null,
        2,
      ),
    );
    return;
  }
  console.log(truncated.text);
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
  const inheritSourceMetadata = Boolean(flags["inherit-source-metadata"]);
  const externalEvidence = loadExternalEvidence(repo, optionalStringFlag(flags, "external-evidence-file"));
  if (target && updatesFile) {
    throw new Error("--target and --updates-file cannot be used together");
  }
  const inputData = loadUpdateInput(repo, target, contentFile, updatesFile);
  const proposal = createProposal(repo, { ...inputData, external_evidence: [...(inputData.external_evidence ?? []), ...externalEvidence] }, reason, inheritSourceMetadata);
  console.log(`proposal_id: ${proposal.proposal_id}`);
  console.log(`proposal_status: ${proposal.proposal_status}`);
  console.log(`proposal_hash: ${proposal.proposal_hash}`);
  console.log(`apply: project-kb apply --repo ${repo} --proposal-id ${proposal.proposal_id} --confirm`);
}

function cmdRemember(flags: Record<string, string | boolean>): void {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  ensureEvidenceIgnored(repo);
  const candidateFile = optionalStringFlag(flags, "candidate-file");
  if (!candidateFile) {
    throw usageError("remember", "--candidate-file is required");
  }
  const reason = stringFlag(flags, "reason", "");
  if (!reason) {
    throw usageError("remember", "--reason is required");
  }
  const format = formatFlag(flags, "remember");
  const replaceExisting = Boolean(flags["replace-existing"]);
  const inputData = memoryCandidateToUpdateInput(repo, loadMemoryCandidate(repo, candidateFile), replaceExisting);
  const proposal = createProposal(repo, inputData, reason, false);
  const applyCommand = `project-kb apply --repo ${repo} --proposal-id ${proposal.proposal_id} --confirm`;
  if (format === "json") {
    console.log(
      JSON.stringify(
        {
          schema_version: "1.0",
          proposal_id: proposal.proposal_id,
          proposal_status: proposal.proposal_status,
          proposal_hash: proposal.proposal_hash,
          target_files: proposal.target_files,
          apply_command: applyCommand,
        },
        null,
        2,
      ),
    );
    return;
  }
  console.log(`proposal_id: ${proposal.proposal_id}`);
  console.log(`proposal_status: ${proposal.proposal_status}`);
  console.log(`proposal_hash: ${proposal.proposal_hash}`);
  console.log(`apply: ${applyCommand}`);
}

function cmdCheck(flags: Record<string, string | boolean>): void {
  const repo = resolveRepo(stringFlag(flags, "repo", "."));
  const format = formatFlag(flags, "check");
  const result = checkKnowledge(repo);
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(renderCheckMarkdown(result));
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
  const safetyStale = stale.filter((item) => !isScaffoldKnowledgeFile(item.path));
  const dryRunSummary = dryRunSummaryLines(path.join(proposalDir, "dry-run.diff"), proposal.target_files);
  const blocked = proposal.proposal_status === "blocked_sensitive" || proposal.sensitive_scan_result === "blocked";
  const hasStale = safetyStale.some((item) => item.status === "stale");
  const hasMissingSource = safetyStale.some((item) => item.status === "missing_source");
  const hasMissingMetadata = safetyStale.some((item) => item.status === "missing_metadata");
  const hasKnowledgeRisk = hasStale || hasMissingSource || hasMissingMetadata;
  const canApply = proposal.proposal_status === "proposed" && !blocked && !hasKnowledgeRisk;
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
    "## External Evidence",
    ...externalEvidenceLines(proposal.external_evidence ?? []),
    "",
    "## Sensitive Scan",
    `- result: ${proposal.sensitive_scan_result}`,
    "",
    "## Dry Run Summary",
    ...dryRunSummary,
    "",
    "## Stale Status",
    ...stale.map((item) => `- ${item.path}: ${item.status}${item.status !== "fresh" ? `; ${item.suggestion}` : ""}`),
    "",
    "## Review Decision",
    `- recommendation: ${reviewDecision(proposal, { hasStale, hasMissingSource, hasMissingMetadata })}`,
    "",
    "## Apply Safety",
    `- can_apply: ${canApply ? "yes" : "no"}`,
    `- blocked_sensitive: ${blocked ? "yes" : "no"}`,
    `- stale_documents: ${hasStale ? "yes" : "no"}`,
    `- missing_source_documents: ${hasMissingSource ? "yes" : "no"}`,
    `- missing_metadata_documents: ${hasMissingMetadata ? "yes" : "no"}`,
    "",
    "## Next Step",
    canApply
      ? `- Run: project-kb apply --repo ${repo} --proposal-id ${proposal.proposal_id} --confirm`
      : nextReviewStep(proposal, hasKnowledgeRisk),
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

function collectContextItems(
  repo: string,
  filters: { query: string; sourceFile?: string; memoryType?: MemoryType; topic?: string; scope?: string },
): ContextItem[] {
  const keywords = filters.query
    .toLowerCase()
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const hasMemoryFilters = Boolean(filters.memoryType || filters.topic || filters.scope);
  const groups: Array<{ priority: number; source_type: ContextItem["source_type"]; files: string[] }> = filters.sourceFile || hasMemoryFilters
    ? [{ priority: 3, source_type: "knowledge", files: knowledgeMarkdownFiles(repo) }]
    : [
        { priority: 1, source_type: "openspec_change", files: globFiles(repo, "openspec/changes", [".md"]) },
        { priority: 2, source_type: "openspec_spec", files: globFiles(repo, "openspec/specs", [".md"]) },
        { priority: 3, source_type: "knowledge", files: knowledgeMarkdownFiles(repo) },
      ];
  const normalizedSourceFile = filters.sourceFile ? normalizeRepoPath(filters.sourceFile) : "";
  const sourceMatches = (metadata: KnowledgeMetadata | null): boolean => {
    if (!normalizedSourceFile) {
      return true;
    }
    return Boolean(metadata?.source_files.map(normalizeRepoPath).includes(normalizedSourceFile));
  };
  const metadataMatches = (metadata: KnowledgeMetadata | null): boolean => {
    if (!hasMemoryFilters) {
      return true;
    }
    if (!metadata) {
      return false;
    }
    if (filters.memoryType && metadata.memory_type !== filters.memoryType) {
      return false;
    }
    if (filters.topic && !includesIgnoreCase(metadata.topic, filters.topic)) {
      return false;
    }
    if (filters.scope && !includesIgnoreCase(metadata.scope, filters.scope)) {
      return false;
    }
    return true;
  };
  const queryMatches = (source: string, content: string): boolean => {
    if (!keywords.length) {
      return true;
    }
    const haystack = `${source}\n${content}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  };
  const items: ContextItem[] = [];
  for (const group of groups) {
    for (const source of group.files) {
      const content = readFileSync(path.join(repo, source), "utf8");
      const { metadata } = parseFrontmatter(content);
      if (!sourceMatches(metadata) || !metadataMatches(metadata) || !queryMatches(source, content)) {
        continue;
      }
      items.push({ source, source_type: group.source_type, priority: group.priority, content, metadata: contextMetadata(metadata) });
    }
  }
  return items.sort((a, b) => a.priority - b.priority || a.source.localeCompare(b.source));
}

function renderContextMarkdown(items: ContextItem[]): string {
  const lines = ["# Project KB Context Pack", ""];
  for (const item of items) {
    lines.push(`## Source: \`${item.source}\``, `Type: ${item.source_type}`);
    if (item.metadata?.memory_type) lines.push(`Memory Type: ${item.metadata.memory_type}`);
    if (item.metadata?.topic) lines.push(`Topic: ${item.metadata.topic}`);
    if (item.metadata?.scope) lines.push(`Scope: ${item.metadata.scope}`);
    lines.push("", item.content.trim(), "");
  }
  return lines.join("\n");
}

function contextMetadata(metadata: KnowledgeMetadata | null): ContextItem["metadata"] | undefined {
  if (!metadata) {
    return undefined;
  }
  const result: ContextItem["metadata"] = {};
  if (metadata.memory_type) result.memory_type = metadata.memory_type;
  if (metadata.topic) result.topic = metadata.topic;
  if (metadata.scope) result.scope = metadata.scope;
  if (metadata.confidence !== undefined) result.confidence = metadata.confidence;
  if (metadata.owner) result.owner = metadata.owner;
  if (metadata.related_docs?.length) result.related_docs = metadata.related_docs;
  return Object.keys(result).length ? result : undefined;
}

function staleItems(repo: string): StaleItem[] {
  return knowledgeMarkdownFiles(repo)
    .map((rel) => {
      const content = readFileSync(path.join(repo, rel), "utf8");
      const { metadata } = parseFrontmatter(content);
      if (!metadata || metadata.source_files.length === 0) {
        return {
          path: rel,
          status: "missing_metadata",
          source_files: [],
          details: ["frontmatter or source_files missing"],
          suggestion: `Add project-kb frontmatter or regenerate with project-kb propose for ${rel}.`,
        };
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
      return { path: rel, status, source_files: metadata.source_files, details, suggestion: staleSuggestion(rel, status) };
    });
}

function renderStaleMarkdown(items: StaleItem[]): string {
  return [
    "# Project KB Stale Report",
    "",
    ...items.map((item) => `- ${item.path}: ${item.status}${item.details.length ? ` (${item.details.join("; ")})` : ""}; Suggestion: ${item.suggestion}`),
    "",
  ].join("\n");
}

function checkKnowledge(repo: string): CheckResult {
  const items: CheckItem[] = [];
  const manifestPath = path.join(repo, "knowledge/manifest.json");
  let requiredFiles: string[] = [];
  if (!existsSync(manifestPath)) {
    items.push(checkIssue("error", "missing_manifest", "knowledge/manifest.json", "knowledge manifest is missing.", "Run project-kb init or restore knowledge/manifest.json."));
  } else {
    try {
      const manifest = readJson<{ required_files?: unknown }>(manifestPath);
      if (Array.isArray(manifest.required_files)) {
        requiredFiles = manifest.required_files.filter((item): item is string => typeof item === "string");
      } else {
        items.push(checkIssue("error", "invalid_manifest", "knowledge/manifest.json", "required_files must be an array.", "Repair knowledge/manifest.json."));
      }
    } catch {
      items.push(checkIssue("error", "invalid_manifest", "knowledge/manifest.json", "manifest must be valid JSON.", "Repair knowledge/manifest.json."));
    }
  }
  for (const rel of requiredFiles) {
    if (!existsSync(path.join(repo, rel))) {
      items.push(checkIssue("error", "missing_required_file", rel, "required knowledge file is missing.", "Restore the file or update required_files in knowledge/manifest.json."));
    }
  }

  const topicPaths = new Map<string, string[]>();
  for (const rel of knowledgeMarkdownFiles(repo)) {
    const abs = path.join(repo, rel);
    const content = readFileSync(abs, "utf8");
    const { metadata, body } = parseFrontmatter(content);
    if (!body.trim() && !isScaffoldKnowledgeFile(rel)) {
      items.push(checkIssue("error", "empty_document", rel, "knowledge document has no body content.", "Add content or remove the empty document."));
    }
    for (const link of markdownRelativeLinks(content)) {
      const target = path.normalize(path.join(path.dirname(abs), link));
      if (!existsSync(target)) {
        items.push(checkIssue("error", "broken_link", rel, `relative link is broken: ${link}`, "Fix the link target or remove the link."));
      }
    }
    if (!metadata || metadata.source_files.length === 0) {
      if (!isScaffoldKnowledgeFile(rel)) {
        items.push(checkIssue("error", "missing_metadata", rel, "frontmatter or source_files missing.", "Regenerate this file with project-kb remember or project-kb propose."));
      }
      continue;
    }
    for (const source of metadata.source_files) {
      const current = repoFileHash(repo, source);
      const expected = metadata.source_hashes[source];
      if (current === "sha256:missing") {
        items.push(checkIssue("error", "missing_source", rel, `source file is missing: ${source}`, "Restore the source file or refresh this memory with current evidence."));
      } else if (!expected || expected !== current) {
        items.push(checkIssue("error", "stale_source", rel, `source hash changed: ${source}`, "Refresh this memory with project-kb remember or project-kb propose."));
      }
    }
    if (metadata.topic) {
      const key = metadata.topic.toLowerCase();
      topicPaths.set(key, [...(topicPaths.get(key) ?? []), rel]);
    }
  }

  for (const [topic, paths] of topicPaths.entries()) {
    if (paths.length > 1) {
      for (const rel of paths) {
        items.push(checkIssue("warning", "duplicate_topic", rel, `topic appears in multiple files: ${topic}`, "Merge duplicated memories or use a more specific topic."));
      }
    }
  }

  for (const rel of globFiles(repo, "schema", [".schema.json"])) {
    try {
      JSON.parse(readFileSync(path.join(repo, rel), "utf8"));
    } catch {
      items.push(checkIssue("error", "invalid_schema_json", rel, "schema file must be valid JSON.", "Repair or remove the invalid schema file."));
    }
  }

  const ok = !items.some((item) => item.level === "error");
  return { schema_version: "1.0", repo, ok, items };
}

function renderCheckMarkdown(result: CheckResult): string {
  const lines = ["# Project KB Check", "", `- ok: ${result.ok ? "yes" : "no"}`, `- issues: ${result.items.length}`, ""];
  if (!result.items.length) {
    lines.push("## Issues", "- none", "");
    return lines.join("\n");
  }
  lines.push("## Issues");
  for (const item of result.items) {
    lines.push(`- ${item.level} ${item.rule_id} ${item.path}: ${item.message}; Suggestion: ${item.suggestion}`);
  }
  lines.push("");
  return lines.join("\n");
}

function checkIssue(level: CheckItem["level"], ruleId: string, pathValue: string, message: string, suggestion: string): CheckItem {
  return { level, rule_id: ruleId, path: pathValue, message, suggestion };
}

function markdownRelativeLinks(content: string): string[] {
  const links: string[] = [];
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("/")) {
      continue;
    }
    links.push(raw.split("#")[0]);
  }
  return links.filter(Boolean);
}

function createProposal(repo: string, inputData: UpdateInput, reason: string, inheritSourceMetadata = false): Proposal {
  const root = proposalRoot(repo);
  ensureDir(root);
  const proposalId = `kb-${timestamp()}-${Math.floor(Math.random() * 100000)}`;
  const dir = path.join(root, proposalId);
  ensureDir(dir);
  const targetFiles = inputData.updates.map((update) => validateKnowledgeTarget(update.target));
  const inheritedSourceFiles = inheritSourceMetadata ? inheritedSourceFilesForTargets(repo, targetFiles) : [];
  const sourceFiles = unique([...inheritedSourceFiles, ...(inputData.source_files ?? [])].filter(Boolean).map(normalizeRepoPath));
  const sourceHashes = Object.fromEntries(sourceFiles.map((source) => [source, repoFileHash(repo, source)]));
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
    source_hashes: sourceHashes,
    target_files: targetFiles,
    operations,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    reason,
    external_evidence: inputData.external_evidence ?? [],
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
    return { source_files: parsed.source_files ?? [], external_evidence: validateExternalEvidenceItems(parsed.external_evidence ?? []), updates: parsed.updates };
  }
  if (!target || !contentFile) {
    throw new Error("provide --updates-file or --target with --content-file");
  }
  return { source_files: [], external_evidence: [], updates: [{ target, content: readFileSync(path.resolve(repo, contentFile), "utf8") }] };
}

function loadMemoryCandidate(repo: string, candidateFile: string): MemoryCandidateInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path.resolve(repo, candidateFile), "utf8"));
  } catch {
    throw new Error("memory candidate file must be valid JSON.");
  }
  if (!isRecord(parsed)) {
    throw new Error("memory candidate file must contain a JSON object.");
  }
  if (parsed.schema_version !== "1.0") {
    throw new Error("memory candidate schema_version must be 1.0.");
  }
  if (!Array.isArray(parsed.source_files) || parsed.source_files.length === 0) {
    throw new Error("memory candidate source_files must be a non-empty array.");
  }
  const sourceFiles = parsed.source_files.map((source) => {
    if (typeof source !== "string" || !source.trim()) {
      throw new Error("memory candidate source_files items must be strings.");
    }
    return normalizeRepoPath(source);
  });
  if (!Array.isArray(parsed.memories) || parsed.memories.length === 0) {
    throw new Error("memory candidate memories must be a non-empty array.");
  }
  return {
    schema_version: "1.0",
    source_files: sourceFiles,
    memories: parsed.memories.map((raw) => validateMemoryCandidateItem(raw)),
  };
}

function validateMemoryCandidateItem(raw: unknown): MemoryCandidateItem {
  if (!isRecord(raw)) {
    throw new Error("memory item must be an object.");
  }
  const target = validateKnowledgeTarget(requiredMemoryString(raw, "target"));
  const memoryType = memoryTypeValue(requiredMemoryString(raw, "memory_type"), "memory item memory_type");
  const topic = requiredMemoryString(raw, "topic");
  const scope = requiredMemoryString(raw, "scope");
  const summary = requiredMemoryString(raw, "summary");
  const body = requiredMemoryString(raw, "body");
  const confidence = raw.confidence;
  if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
    throw new Error("memory item confidence must be a number between 0 and 1.");
  }
  const item: MemoryCandidateItem = { target, memory_type: memoryType, topic, scope, confidence, summary, body };
  if (raw.owner !== undefined) {
    if (typeof raw.owner !== "string") {
      throw new Error("memory item owner must be a string.");
    }
    item.owner = raw.owner;
  }
  if (raw.related_docs !== undefined) {
    if (!Array.isArray(raw.related_docs)) {
      throw new Error("memory item related_docs must be an array.");
    }
    item.related_docs = raw.related_docs.map((doc) => {
      if (typeof doc !== "string" || !doc.trim()) {
        throw new Error("memory item related_docs items must be strings.");
      }
      return normalizeRepoPath(doc);
    });
  }
  return item;
}

function memoryCandidateToUpdateInput(repo: string, candidate: MemoryCandidateInput, replaceExisting: boolean): UpdateInput {
  const sourceHashes = Object.fromEntries(candidate.source_files.map((source) => [source, repoFileHash(repo, source)]));
  const updates = candidate.memories.map((memory) => {
    if (!replaceExisting && existsSync(path.join(repo, memory.target))) {
      throw new Error(`memory target already exists: ${memory.target}. Use --replace-existing to replace it.`);
    }
    return {
      target: memory.target,
      content: buildMemoryContent(memory, candidate.source_files, sourceHashes),
    };
  });
  return { source_files: candidate.source_files, external_evidence: [], updates };
}

function buildMemoryContent(memory: MemoryCandidateItem, sourceFiles: string[], sourceHashes: Record<string, string>): string {
  const body = memory.body.trim();
  const content = body.startsWith("#") ? `${body}\n` : `# ${memory.summary}\n\n${body}\n`;
  return `${buildFrontmatter({
    source_files: sourceFiles,
    source_hashes: sourceHashes,
    generated_by: "project-kb",
    review_status: "draft",
    memory_type: memory.memory_type,
    topic: memory.topic,
    scope: memory.scope,
    confidence: memory.confidence,
    owner: memory.owner,
    related_docs: memory.related_docs,
  })}${content}`;
}

function loadExternalEvidence(repo: string, evidenceFile?: string): ExternalEvidenceItem[] {
  if (!evidenceFile) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path.resolve(repo, evidenceFile), "utf8"));
  } catch {
    throw new Error("external evidence file must be valid JSON.");
  }
  if (!isRecord(parsed)) {
    throw new Error("external evidence file must contain a JSON object.");
  }
  if (parsed.schema_version !== "1.0") {
    throw new Error("external evidence schema_version must be 1.0.");
  }
  return validateExternalEvidenceItems(parsed.external_evidence);
}

function validateExternalEvidenceItems(value: unknown): ExternalEvidenceItem[] {
  if (!Array.isArray(value)) {
    throw new Error("external_evidence must be an array.");
  }
  return value.map((raw) => {
    if (!isRecord(raw)) {
      throw new Error("external_evidence item must be an object.");
    }
    const source = requiredString(raw, "source");
    const sourceType = requiredString(raw, "source_type");
    const itemPath = requiredString(raw, "path");
    const item: ExternalEvidenceItem = {
      source,
      source_type: sourceType,
      path: normalizeRepoPath(itemPath),
    };
    for (const field of ["symbol", "summary", "locator"] as const) {
      const valueForField = raw[field];
      if (valueForField !== undefined) {
        if (typeof valueForField !== "string") {
          throw new Error(`external_evidence item ${field} must be a string.`);
        }
        item[field] = valueForField;
      }
    }
    if (raw.confidence !== undefined) {
      if (typeof raw.confidence !== "number" || raw.confidence < 0 || raw.confidence > 1) {
        throw new Error("external_evidence item confidence must be a number between 0 and 1.");
      }
      item.confidence = raw.confidence;
    }
    return item;
  });
}

function requiredString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`external_evidence item ${field} is required.`);
  }
  return value.trim();
}

function requiredMemoryString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`memory item ${field} is required.`);
  }
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  const commit = currentCommit(repo);
  if (commit && proposal.base_commit && commit !== proposal.base_commit) {
    throw new Error(`base commit changed since proposal was created: ${proposal.base_commit} -> ${commit}`);
  }
  const sourceHashes = proposal.source_hashes ?? {};
  for (const source of proposal.source_files) {
    const expected = sourceHashes[source];
    if (!expected) {
      throw new Error(`proposal is missing source hash snapshot for ${source}; regenerate proposal.`);
    }
    const current = repoFileHash(repo, source);
    if (current !== expected) {
      throw new Error(`source changed since proposal was created: ${source}`);
    }
  }
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

function dryRunSummaryLines(diffPath: string, targetFiles: string[]): string[] {
  if (!existsSync(diffPath)) {
    return ["- dry_run_diff: missing"];
  }
  const text = readFileSync(diffPath, "utf8");
  let additions = 0;
  let deletions = 0;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }
    if (line.startsWith("+")) additions++;
    if (line.startsWith("-")) deletions++;
  }
  return [`- target_files: ${targetFiles.length ? targetFiles.join(", ") : "none"}`, `- changed_lines: +${additions} -${deletions}`];
}

function reviewDecision(
  proposal: Proposal,
  risk: { hasStale: boolean; hasMissingSource: boolean; hasMissingMetadata: boolean },
): string {
  if (proposal.proposal_status === "blocked_sensitive" || proposal.sensitive_scan_result === "blocked") {
    return "blocked by sensitive content; do not apply.";
  }
  if (risk.hasMissingSource) {
    return "missing source files must be restored or reviewed before apply.";
  }
  if (risk.hasMissingMetadata) {
    return "knowledge metadata is incomplete; regenerate or repair docs before apply.";
  }
  if (risk.hasStale) {
    return "review stale knowledge before apply.";
  }
  if (proposal.proposal_status === "proposed") {
    return "review dry-run.diff, then apply if content is correct.";
  }
  return `no apply action for status ${proposal.proposal_status}.`;
}

function nextReviewStep(proposal: Proposal, hasKnowledgeRisk: boolean): string {
  if (proposal.proposal_status !== "proposed") {
    return `- No apply command is available for status ${proposal.proposal_status}.`;
  }
  if (hasKnowledgeRisk) {
    return "- Resolve stale, missing source, or missing metadata items, then regenerate the proposal.";
  }
  return "- No apply command is available until Apply Safety is clear.";
}

function staleSuggestion(pathValue: string, status: StaleItem["status"]): string {
  if (status === "fresh") {
    return "No action needed.";
  }
  if (status === "missing_source") {
    return `Check missing source file before refreshing ${pathValue}.`;
  }
  if (status === "missing_metadata") {
    return `Add project-kb frontmatter or regenerate with project-kb propose for ${pathValue}.`;
  }
  return `Run project-kb propose with refreshed content for ${pathValue}.`;
}

function isScaffoldKnowledgeFile(pathValue: string): boolean {
  return (
    pathValue === "knowledge/README.md" ||
    pathValue === "knowledge/index.md" ||
    pathValue === "knowledge/glossary.md" ||
    /^knowledge\/(domains|workflows|contracts|integrations|quality|decisions)\/README\.md$/.test(pathValue)
  );
}

function inheritedSourceFilesForTargets(repo: string, targetFiles: string[]): string[] {
  const sources: string[] = [];
  for (const target of targetFiles) {
    const targetAbs = path.join(repo, target);
    if (!existsSync(targetAbs)) {
      continue;
    }
    const { metadata } = parseFrontmatter(readFileSync(targetAbs, "utf8"));
    if (metadata) {
      sources.push(...metadata.source_files);
    }
  }
  return unique(sources.map(normalizeRepoPath));
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

function knowledgeMarkdownFiles(repo: string): string[] {
  return globFiles(repo, "knowledge", [".md"]).filter((rel) => !rel.startsWith("knowledge/logs/") && !rel.startsWith("knowledge/assets/"));
}

function listOrNone(items: string[]): string[] {
  return items.length ? items.map((item) => `- ${item}`) : ["- none"];
}

function externalEvidenceLines(items: ExternalEvidenceItem[]): string[] {
  if (!items.length) {
    return ["- none"];
  }
  return items.map((item) => {
    const details = [`${item.source} (${item.source_type})`, item.path];
    if (item.symbol) details.push(`symbol: ${item.symbol}`);
    if (item.summary) details.push(item.summary);
    if (item.locator) details.push(`locator: ${item.locator}`);
    if (item.confidence !== undefined) details.push(`confidence: ${item.confidence}`);
    return `- ${details.join(" | ")}`;
  });
}

function truncate(value: string, budget: number): { text: string; budget_used: number; truncated: boolean } {
  if (value.length <= budget) {
    return { text: value, budget_used: value.length, truncated: false };
  }
  const marker = "\n...(truncated)";
  const text = budget <= marker.length ? value.slice(0, budget) : `${value.slice(0, budget - marker.length)}${marker}`;
  return { text, budget_used: text.length, truncated: true };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeRepoPath(value: string): string {
  return value.split(path.sep).join("/");
}

function templateFlag(flags: Record<string, string | boolean>): InitTemplateName {
  const value = stringFlag(flags, "template", "generic-service");
  if (value === "generic-service" || value === "java-backend" || value === "frontend-app") {
    return value;
  }
  throw usageError("init", "--template must be generic-service, java-backend, or frontend-app");
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

function optionalMemoryTypeFlag(flags: Record<string, string | boolean>, command: string): MemoryType | undefined {
  const value = optionalStringFlag(flags, "memory-type");
  return value ? memoryTypeValue(value, "--memory-type", command) : undefined;
}

function memoryTypeValue(value: string, label: string, command?: string): MemoryType {
  if (value === "decision" || value === "experience" || value === "project_fact") {
    return value;
  }
  const message = `${label} must be decision, experience, or project_fact`;
  if (command) {
    throw usageError(command, message);
  }
  throw new Error(message);
}

function includesIgnoreCase(value: string | undefined, query: string): boolean {
  return Boolean(value?.toLowerCase().includes(query.toLowerCase()));
}

function usageError(command: string, message: string): Error {
  const help = commandHelp[command];
  if (!help) {
    return new Error(`${message}\n\nRun \`project-kb --help\` to see available commands.`);
  }
  return new Error(`${message}\n\n${help}`);
}
