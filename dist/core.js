import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { buildFrontmatter, ensureKnowledgeFrontmatter, hasFrontmatter, parseFrontmatter } from "./frontmatter.js";
import { sensitiveRuleMatches } from "./rules.js";
import { scanRepo } from "./scanner.js";
import { changedFiles, currentCommit, ensureDir, ensureEvidenceIgnored, fileHash, proposalRoot, readJson, removeFileIfExists, replaceFileAtomic, repoFileHash, resolveRepo, sha256Text, updateGitignore, validateKnowledgeTarget, walkFiles, worktreeHash, writeIfMissing, writeJson, } from "./utils.js";
const commandOptions = {
    init: ["repo", "template"],
    scan: ["repo", "mode", "external-evidence-file", "format", "review-depth"],
    context: ["repo", "query", "source-file", "budget", "max-context-chars", "format", "memory-type", "topic", "scope"],
    stale: ["repo", "format"],
    propose: ["repo", "target", "content-file", "updates-file", "reason", "inherit-source-metadata", "external-evidence-file"],
    remember: ["repo", "candidate-file", "reason", "format", "replace-existing"],
    check: ["repo", "format"],
    apply: ["repo", "proposal-id", "all", "confirm", "yes-all"],
    "review-summary": ["repo", "proposal-id"],
    cleanup: ["repo", "force"],
    hash: ["repo", "path"],
};
const booleanOptions = {
    propose: ["inherit-source-metadata"],
    remember: ["replace-existing"],
    apply: ["all", "confirm", "yes-all"],
    cleanup: ["force"],
};
const initTemplates = {
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
    "Usage: project-atlas <command> [options]",
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
    "  project-atlas init --repo /path/to/repo",
    "  project-atlas context --repo /path/to/repo --query order --budget 8000",
    "  project-atlas remember --repo /path/to/repo --candidate-file memory.json --reason \"capture project memory\"",
    "",
    "Run `project-atlas <command> --help` for command details.",
].join("\n");
const commandHelp = {
    init: [
        "Usage: project-atlas init --repo <repo> [--template <generic-service|java-backend|frontend-app>]",
        "",
        "Options:",
        "  --repo <path>       Git repository path. Defaults to current directory.",
        "  --template <name>   Initial knowledge wording template. Defaults to generic-service.",
        "",
        "Example:",
        "  project-atlas init --repo /path/to/repo --template java-backend",
    ].join("\n"),
    scan: [
        "Usage: project-atlas scan --repo <repo> --mode <full|changed> [--format json] [--review-depth <standard|deep>] [--external-evidence-file <file>]",
        "",
        "Options:",
        "  --repo <path>       Git repository path. Defaults to current directory.",
        "  --mode <value>      Scan mode. Use full or changed. Defaults to full.",
        "  --review-depth <value>  Review planning depth. Use standard or deep. Defaults to standard.",
        "  --format <value>    Output format. Only json is supported. Defaults to json.",
        "  --external-evidence-file <file>  JSON file with external repo map or code graph evidence.",
        "",
        "Example:",
        "  project-atlas scan --repo /path/to/repo --mode changed --review-depth deep --format json --external-evidence-file evidence.json",
    ].join("\n"),
    context: [
        "Usage: project-atlas context --repo <repo> [--query <text>] [--source-file <path>] [--memory-type <decision|experience|project_fact>] [--topic <text>] [--scope <text>] [--budget <chars>] [--format <markdown|json>]",
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
        "  project-atlas context --repo /path/to/repo --query order --budget 8000 --format json",
    ].join("\n"),
    stale: [
        "Usage: project-atlas stale --repo <repo> [--format <markdown|json>]",
        "",
        "Options:",
        "  --repo <path>       Git repository path. Defaults to current directory.",
        "  --format <value>    Output format. Use markdown or json. Defaults to markdown.",
        "",
        "Example:",
        "  project-atlas stale --repo /path/to/repo --format json",
    ].join("\n"),
    propose: [
        "Usage: project-atlas propose --repo <repo> --updates-file <file> --reason <text>",
        "Usage: project-atlas propose --repo <repo> --target <knowledge/file.md> --content-file <file> --reason <text>",
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
        "  project-atlas propose --repo /path/to/repo --updates-file updates.json --external-evidence-file evidence.json --reason \"update project knowledge\"",
    ].join("\n"),
    remember: [
        "Usage: project-atlas remember --repo <repo> --candidate-file <file> --reason <text> [--format <markdown|json>] [--replace-existing]",
        "",
        "Options:",
        "  --repo <path>             Git repository path. Defaults to current directory.",
        "  --candidate-file <file>   JSON memory candidate file.",
        "  --reason <text>           Human-readable proposal reason.",
        "  --format <value>          Output format. Use markdown or json. Defaults to markdown.",
        "  --replace-existing        Allow proposal generation for existing target files.",
        "",
        "Example:",
        "  project-atlas remember --repo /path/to/repo --candidate-file memory.json --reason \"capture review memory\"",
    ].join("\n"),
    check: [
        "Usage: project-atlas check --repo <repo> [--format <markdown|json>]",
        "",
        "Options:",
        "  --repo <path>       Git repository path. Defaults to current directory.",
        "  --format <value>    Output format. Use markdown or json. Defaults to markdown.",
        "",
        "Example:",
        "  project-atlas check --repo /path/to/repo --format json",
    ].join("\n"),
    apply: [
        "Usage: project-atlas apply --repo <repo> --proposal-id <id> --confirm",
        "Usage: project-atlas apply --repo <repo> --all --confirm",
        "Usage: project-atlas apply --repo <repo> --all --confirm --yes-all",
        "",
        "Options:",
        "  --repo <path>          Git repository path. Defaults to current directory.",
        "  --proposal-id <id>     Proposal id under .project-atlas/proposals/.",
        "  --all                  Apply all proposed proposals with interactive confirmation.",
        "  --confirm              Required. Still asks for interactive TTY confirmation.",
        "  --yes-all              With --all, ask once before applying all proposed proposals.",
        "",
        "Examples:",
        "  project-atlas apply --repo /path/to/repo --proposal-id kb-20260521-120000-1 --confirm",
        "  project-atlas apply --repo /path/to/repo --all --confirm",
        "  project-atlas apply --repo /path/to/repo --all --confirm --yes-all",
    ].join("\n"),
    "review-summary": [
        "Usage: project-atlas review-summary --repo <repo> [--proposal-id <id>]",
        "",
        "Options:",
        "  --repo <path>          Git repository path. Defaults to current directory.",
        "  --proposal-id <id>     Proposal id. Defaults to latest.json.",
        "",
        "Example:",
        "  project-atlas review-summary --repo /path/to/repo --proposal-id kb-20260521-120000-1",
    ].join("\n"),
    cleanup: [
        "Usage: project-atlas cleanup --repo <repo> [--force]",
        "",
        "Options:",
        "  --repo <path>       Git repository path. Defaults to current directory.",
        "  --force             Remove all .kbtmp files instead of only old files.",
        "",
        "Example:",
        "  project-atlas cleanup --repo /path/to/repo --force",
    ].join("\n"),
    hash: [
        "Usage: project-atlas hash --repo <repo> --path <file>",
        "",
        "Options:",
        "  --repo <path>       Git repository path. Defaults to current directory.",
        "  --path <file>       Repository-relative file path to hash.",
        "",
        "Example:",
        "  project-atlas hash --repo /path/to/repo --path README.md",
    ].join("\n"),
};
export async function runCli(argv) {
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
        throw new Error(`Unknown command: ${parsed.command}\n\nRun \`project-atlas --help\` to see available commands.`);
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
export async function runCliCapture(argv) {
    const originalLog = console.log;
    const lines = [];
    console.log = (...args) => {
        lines.push(args.map((arg) => (typeof arg === "string" ? arg : String(arg))).join(" "));
    };
    try {
        await runCli(argv);
        return lines.length ? `${lines.join("\n")}\n` : "";
    }
    finally {
        console.log = originalLog;
    }
}
function cmdInit(flags) {
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
        "knowledge/logs",
        "knowledge/assets",
        ".project-atlas/proposals",
    ]) {
        ensureDir(path.join(repo, dir));
    }
    writeIfMissing(path.join(repo, ".project-atlas/proposals/.keep"), "");
    writeIfMissing(path.join(repo, "knowledge/README.md"), `# Project Knowledge Base\n\nGit-first knowledge assets for humans and AI coding agents.\n\nTemplate: ${template.displayName}\n`);
    writeIfMissing(path.join(repo, "knowledge/index.md"), [
        "# Knowledge Index",
        "",
        "- [Project Overview](project/overview.md)",
        "- [Domains](domains/README.md)",
        "- [Workflows](workflows/README.md)",
        "- [Contracts](contracts/README.md)",
        "- [Integrations](integrations/README.md)",
        "- [Quality](quality/README.md)",
        "- [Decisions](decisions/README.md)",
        "- [Logs](logs/README.md)",
        "- [Assets](assets/README.md)",
        "",
    ].join("\n"));
    writeIfMissing(path.join(repo, "knowledge/glossary.md"), "# Glossary\n\nRecord stable domain terms here.\n");
    for (const dir of ["domains", "workflows", "contracts", "integrations", "quality", "decisions"]) {
        writeIfMissing(path.join(repo, "knowledge", dir, "README.md"), `# ${dir}\n\n${template.sections[dir]}\n`);
    }
    writeIfMissing(path.join(repo, "knowledge/logs/README.md"), "# logs\n\nRecord short human-maintained maintenance notes and lifecycle entries here.\n");
    writeIfMissing(path.join(repo, "knowledge/assets/README.md"), "# assets\n\nTrack supporting knowledge assets and reference materials here without storing generated proposals.\n");
    writeIfMissing(path.join(repo, "knowledge/project/overview.md"), `${buildFrontmatter({ source_files: ["README.md"], source_hashes: { "README.md": repoFileHash(repo, "README.md") } })}# Project Overview\n\n${template.overview}\n`);
    writeIfMissing(path.join(repo, "knowledge/manifest.json"), `${JSON.stringify({
        schema_version: "1.0",
        max_context_chars: 8000,
        required_files: ["knowledge/README.md", "knowledge/index.md", "knowledge/manifest.json", "knowledge/glossary.md", "knowledge/project/overview.md"],
        evidence_dir: ".project-atlas/proposals",
    }, null, 2)}\n`);
    console.log(`Initialized project-atlas knowledge base at ${repo}`);
}
function cmdScan(flags) {
    const repo = resolveRepo(stringFlag(flags, "repo", "."));
    const mode = stringFlag(flags, "mode", "full");
    if (mode !== "full" && mode !== "changed") {
        throw usageError("scan", "--mode must be full or changed");
    }
    const format = stringFlag(flags, "format", "json");
    if (format !== "json") {
        throw usageError("scan", "--format must be json");
    }
    const reviewDepth = reviewDepthFlag(flags, "scan");
    const externalEvidence = loadExternalEvidence(repo, optionalStringFlag(flags, "external-evidence-file"));
    console.log(JSON.stringify(scanRepo(repo, mode, externalEvidence, reviewDepth), null, 2));
}
function cmdContext(flags) {
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
    const budgetedItems = budgetContextItems(items, budget);
    if (format === "json") {
        console.log(JSON.stringify({
            schema_version: "1.0",
            budget,
            budget_used: truncated.budget_used,
            truncated: truncated.truncated,
            text: truncated.text,
            items: budgetedItems,
        }, null, 2));
        return;
    }
    console.log(truncated.text);
}
function cmdStale(flags) {
    const repo = resolveRepo(stringFlag(flags, "repo", "."));
    const format = formatFlag(flags, "stale");
    const items = staleItems(repo);
    if (format === "json") {
        console.log(JSON.stringify({ schema_version: "1.0", items }, null, 2));
        return;
    }
    console.log(renderStaleMarkdown(items));
}
function cmdPropose(flags) {
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
    assertProposalContentHasNoFrontmatter(inputData.updates);
    const proposal = createProposal(repo, { ...inputData, external_evidence: [...(inputData.external_evidence ?? []), ...externalEvidence] }, reason, inheritSourceMetadata);
    console.log(`proposal_id: ${proposal.proposal_id}`);
    console.log(`proposal_status: ${proposal.proposal_status}`);
    console.log(`proposal_hash: ${proposal.proposal_hash}`);
    if (proposal.proposal_status === "proposed") {
        console.log(`apply: project-atlas apply --repo ${repo} --proposal-id ${proposal.proposal_id} --confirm`);
    }
    else {
        console.log(`review: project-atlas review-summary --repo ${repo} --proposal-id ${proposal.proposal_id}`);
    }
}
function cmdRemember(flags) {
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
    const applyCommand = `project-atlas apply --repo ${repo} --proposal-id ${proposal.proposal_id} --confirm`;
    const reviewCommand = `project-atlas review-summary --repo ${repo} --proposal-id ${proposal.proposal_id}`;
    if (format === "json") {
        const output = {
            schema_version: "1.0",
            proposal_id: proposal.proposal_id,
            proposal_status: proposal.proposal_status,
            proposal_hash: proposal.proposal_hash,
            target_files: proposal.target_files,
        };
        if (proposal.proposal_status === "proposed") {
            output.apply_command = applyCommand;
        }
        else {
            output.review_command = reviewCommand;
        }
        console.log(JSON.stringify(output, null, 2));
        return;
    }
    console.log(`proposal_id: ${proposal.proposal_id}`);
    console.log(`proposal_status: ${proposal.proposal_status}`);
    console.log(`proposal_hash: ${proposal.proposal_hash}`);
    if (proposal.proposal_status === "proposed") {
        console.log(`apply: ${applyCommand}`);
    }
    else {
        console.log(`review: ${reviewCommand}`);
    }
}
function cmdCheck(flags) {
    const repo = resolveRepo(stringFlag(flags, "repo", "."));
    const format = formatFlag(flags, "check");
    const result = checkKnowledge(repo);
    if (format === "json") {
        console.log(JSON.stringify(result, null, 2));
        return;
    }
    console.log(renderCheckMarkdown(result));
}
async function cmdApply(flags) {
    const repo = resolveRepo(stringFlag(flags, "repo", "."));
    const proposalId = optionalStringFlag(flags, "proposal-id");
    const applyAll = Boolean(flags.all);
    const yesAll = Boolean(flags["yes-all"]);
    if (Boolean(proposalId) === applyAll) {
        throw new Error("provide exactly one of --proposal-id or --all");
    }
    if (yesAll && !applyAll) {
        throw new Error("--yes-all requires --all");
    }
    if (!flags.confirm) {
        throw new Error("--confirm is required for apply");
    }
    if (!process.stdin.isTTY) {
        throw new Error("apply requires an interactive TTY confirmation.");
    }
    const rl = readline.createInterface({ input, output });
    try {
        if (applyAll) {
            await applyAllProposals(repo, rl, yesAll);
            return;
        }
        const proposal = loadProposal(repo, proposalId ?? "");
        assertProposalNotBlocked(proposal);
        assertProposalStillFresh(repo, proposal);
        const confirmed = await askYesNo(rl, `Apply proposal ${proposal.proposal_id}? Type y or n: `);
        if (!confirmed) {
            throw new Error("apply cancelled by user.");
        }
        assertProposalWorktreeFresh(repo, proposal);
        applyProposal(repo, proposal);
    }
    finally {
        rl.close();
    }
}
async function applyAllProposals(repo, rl, yesAll) {
    const proposals = proposedProposals(repo);
    if (!proposals.length) {
        console.log("No proposed proposals found.");
        return;
    }
    const selected = [];
    if (yesAll) {
        console.log(`Proposed proposals: ${proposals.length}`);
        for (const proposal of proposals) {
            console.log(`- ${proposal.proposal_id}: ${proposal.target_files.join(", ") || "no targets"}`);
        }
        const confirmed = await askYesNo(rl, "Apply all proposed proposals? Type y or n: ");
        if (!confirmed) {
            throw new Error("apply cancelled by user.");
        }
        selected.push(...proposals);
    }
    else {
        for (const proposal of proposals) {
            const confirmed = await askYesNo(rl, `Apply proposal ${proposal.proposal_id} (${proposal.target_files.join(", ") || "no targets"})? Type y or n: `);
            if (confirmed) {
                selected.push(proposal);
            }
            else {
                console.log(`skipped: ${proposal.proposal_id}`);
            }
        }
    }
    if (!selected.length) {
        console.log("No proposals selected.");
        return;
    }
    for (const proposal of selected) {
        assertProposalNotBlocked(proposal);
        assertProposalWorktreeFresh(repo, proposal);
    }
    for (const proposal of selected) {
        applyProposal(repo, proposal);
    }
}
function loadProposal(repo, proposalId) {
    return readJson(path.join(proposalRoot(repo), proposalId, "proposal.json"));
}
function proposedProposals(repo) {
    const root = proposalRoot(repo);
    if (!existsSync(root)) {
        return [];
    }
    return readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
        const proposalPath = path.join(root, entry.name, "proposal.json");
        return existsSync(proposalPath) ? readJson(proposalPath) : null;
    })
        .filter((proposal) => proposal !== null && proposal.proposal_status === "proposed")
        .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.proposal_id.localeCompare(b.proposal_id));
}
async function askYesNo(rl, question) {
    while (true) {
        const answer = (await rl.question(question)).trim().toLowerCase();
        if (answer === "y")
            return true;
        if (answer === "n")
            return false;
        console.log("Please type y or n.");
    }
}
function assertProposalNotBlocked(proposal) {
    if (proposal.proposal_status === "blocked_sensitive") {
        throw new Error("blocked_sensitive proposals cannot be applied.");
    }
}
function assertProposalWorktreeFresh(repo, proposal) {
    if (worktreeHash(repo) !== proposal.worktree_diff_hash) {
        throw new Error("worktree changed during confirmation; aborting apply.");
    }
}
function applyProposal(repo, proposal) {
    assertProposalNotBlocked(proposal);
    assertProposalStillFresh(repo, proposal);
    const proposalPath = path.join(proposalRoot(repo), proposal.proposal_id, "proposal.json");
    const appliedParts = [];
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
function cmdReviewSummary(flags) {
    const repo = resolveRepo(stringFlag(flags, "repo", "."));
    const proposalId = optionalStringFlag(flags, "proposal-id") ?? latestProposalId(repo);
    if (!proposalId) {
        throw new Error("No proposal found. Run project-atlas propose first.");
    }
    const proposalDir = path.join(proposalRoot(repo), proposalId);
    const proposal = readJson(path.join(proposalDir, "proposal.json"));
    const triggerPath = path.join(proposalDir, "trigger-result.json");
    const trigger = existsSync(triggerPath) ? readJson(triggerPath) : null;
    const stale = staleItems(repo);
    const qualityIssues = checkKnowledge(repo).items.filter((item) => item.level === "warning" && ["shallow_document", "weak_evidence", "missing_practical_sections"].includes(item.rule_id));
    const proposedQualityIssues = proposal.proposal_quality_findings ?? [];
    const externalEvidenceWarnings = externalEvidenceQualityWarnings(repo, proposal.external_evidence ?? []);
    const safetyStale = stale.filter((item) => !isScaffoldKnowledgeFile(item.path));
    const dryRunSummary = dryRunSummaryLines(path.join(proposalDir, "dry-run.diff"), proposal.target_files);
    const blocked = proposal.proposal_status === "blocked_sensitive" || proposal.sensitive_scan_result === "blocked";
    const hasStale = safetyStale.some((item) => item.status === "stale");
    const hasMissingSource = safetyStale.some((item) => item.status === "missing_source");
    const hasMissingMetadata = safetyStale.some((item) => item.status === "missing_metadata");
    const hasKnowledgeRisk = hasStale || hasMissingSource || hasMissingMetadata;
    const hasProposedQualityIssues = proposedQualityIssues.length > 0;
    const hasLowQualityScore = (proposal.quality_score?.score ?? 100) < 70;
    const hasLowCoverageScore = (proposal.coverage_score?.score ?? 100) < 70;
    const canApply = proposal.proposal_status === "proposed" && !blocked && !hasKnowledgeRisk && !hasProposedQualityIssues && !hasLowQualityScore && !hasLowCoverageScore;
    const lines = [
        "# Project Atlas Review Summary",
        "",
        `- proposal_id: ${proposal.proposal_id}`,
        `- proposal_status: ${proposal.proposal_status}`,
        `- reason: ${proposal.reason}`,
        `- update_reason_summary: ${proposal.update_reason_summary ?? "none"}`,
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
        "## External Evidence Warnings",
        ...externalEvidenceWarnings.map((item) => `- ${item.path}: ${item.rule_id}; ${item.message}; Suggestion: ${item.suggestion}`),
        ...(externalEvidenceWarnings.length ? [] : ["- none"]),
        "",
        "## Sensitive Scan",
        `- result: ${proposal.sensitive_scan_result}`,
        "",
        "## Evidence Plan Coverage",
        ...evidencePlanSummaryLines(proposal.evidence_plan_summary ?? []),
        "",
        "## Quality Score",
        ...qualityScoreLines(proposal.quality_score),
        "",
        "## Deep Review Coverage",
        ...coverageScoreLines(proposal.coverage_score),
        "",
        "## Dry Run Summary",
        ...dryRunSummary,
        "",
        "## Stale Status",
        ...stale.map((item) => `- ${item.path}: ${item.status}${item.status !== "fresh" ? `; ${item.suggestion}` : ""}`),
        "",
        "## Quality Warnings",
        ...qualityIssues.map((item) => `- ${item.path}: ${item.rule_id}; ${item.message}; Suggestion: ${item.suggestion}`),
        ...(qualityIssues.length ? [] : ["- none"]),
        "",
        "## Proposed Content Warnings",
        ...proposedQualityIssues.map((item) => `- ${item.path}: ${item.rule_id}; ${item.message}; Suggestion: ${item.suggestion}`),
        ...(proposedQualityIssues.length ? [] : ["- none"]),
        "",
        "## Review Decision",
        `- recommendation: ${reviewDecision(proposal, { hasStale, hasMissingSource, hasMissingMetadata, hasLowQualityScore, hasLowCoverageScore })}`,
        "",
        "## Apply Safety",
        `- can_apply: ${canApply ? "yes" : "no"}`,
        `- blocked_sensitive: ${blocked ? "yes" : "no"}`,
        `- stale_documents: ${hasStale ? "yes" : "no"}`,
        `- missing_source_documents: ${hasMissingSource ? "yes" : "no"}`,
        `- missing_metadata_documents: ${hasMissingMetadata ? "yes" : "no"}`,
        `- quality_warnings: ${qualityIssues.length ? "yes" : "no"}`,
        `- proposed_content_warnings: ${hasProposedQualityIssues ? "yes" : "no"}`,
        `- low_quality_score: ${hasLowQualityScore ? "yes" : "no"}`,
        `- low_coverage_score: ${hasLowCoverageScore ? "yes" : "no"}`,
        `- external_evidence_warnings: ${externalEvidenceWarnings.length ? "yes" : "no"}`,
        "",
        "## Next Step",
        canApply
            ? `- Run: project-atlas apply --repo ${repo} --proposal-id ${proposal.proposal_id} --confirm`
            : nextReviewStep(proposal, hasKnowledgeRisk, hasProposedQualityIssues || hasLowQualityScore || hasLowCoverageScore),
        "",
    ];
    console.log(lines.join("\n"));
}
function cmdCleanup(flags) {
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
function cmdHash(flags) {
    const repo = resolveRepo(stringFlag(flags, "repo", "."));
    const rel = stringFlag(flags, "path", "");
    if (!rel) {
        throw usageError("hash", "--path is required");
    }
    console.log(repoFileHash(repo, rel));
}
function collectContextItems(repo, filters) {
    const keywords = filters.query
        .toLowerCase()
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean);
    const hasMemoryFilters = Boolean(filters.memoryType || filters.topic || filters.scope);
    const groups = filters.sourceFile || hasMemoryFilters
        ? [{ priority: 3, source_type: "knowledge", files: knowledgeMarkdownFiles(repo) }]
        : [
            { priority: 1, source_type: "openspec_change", files: globFiles(repo, "openspec/changes", [".md"]) },
            { priority: 2, source_type: "openspec_spec", files: globFiles(repo, "openspec/specs", [".md"]) },
            { priority: 3, source_type: "knowledge", files: knowledgeMarkdownFiles(repo) },
        ];
    const normalizedSourceFile = filters.sourceFile ? normalizeRepoPath(filters.sourceFile) : "";
    const sourceMatches = (metadata) => {
        if (!normalizedSourceFile) {
            return true;
        }
        return Boolean(metadata?.source_files.map(normalizeRepoPath).includes(normalizedSourceFile));
    };
    const metadataMatches = (metadata) => {
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
    const queryMatches = (source, content) => {
        if (!keywords.length) {
            return true;
        }
        const haystack = `${source}\n${content}`.toLowerCase();
        return keywords.some((keyword) => haystack.includes(keyword));
    };
    const items = [];
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
function renderContextMarkdown(items) {
    const lines = ["# Project Atlas Context Pack", ""];
    for (const item of items) {
        lines.push(`## Source: \`${item.source}\``, `Type: ${item.source_type}`);
        if (item.metadata?.memory_type)
            lines.push(`Memory Type: ${item.metadata.memory_type}`);
        if (item.metadata?.topic)
            lines.push(`Topic: ${item.metadata.topic}`);
        if (item.metadata?.scope)
            lines.push(`Scope: ${item.metadata.scope}`);
        lines.push("", item.content.trim(), "");
    }
    return lines.join("\n");
}
function contextMetadata(metadata) {
    if (!metadata) {
        return undefined;
    }
    const result = {};
    if (metadata.memory_type)
        result.memory_type = metadata.memory_type;
    if (metadata.topic)
        result.topic = metadata.topic;
    if (metadata.scope)
        result.scope = metadata.scope;
    if (metadata.confidence !== undefined)
        result.confidence = metadata.confidence;
    if (metadata.owner)
        result.owner = metadata.owner;
    if (metadata.related_docs?.length)
        result.related_docs = metadata.related_docs;
    return Object.keys(result).length ? result : undefined;
}
function budgetContextItems(items, budget) {
    let remaining = budget;
    return items.map((item) => {
        const content = remaining > 0 ? truncate(item.content, remaining).text : "";
        remaining = Math.max(0, remaining - content.length);
        return { ...item, content };
    });
}
function staleItems(repo) {
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
                suggestion: `Add project-atlas frontmatter or regenerate with project-atlas propose for ${rel}.`,
            };
        }
        const details = [];
        let status = "fresh";
        for (const source of metadata.source_files) {
            const current = repoFileHash(repo, source);
            const expected = metadata.source_hashes[source];
            if (current === "sha256:missing") {
                status = "missing_source";
                details.push(`${source} is missing`);
            }
            else if (!expected || expected !== current) {
                if (status !== "missing_source")
                    status = "stale";
                details.push(`${source} hash changed`);
            }
        }
        return { path: rel, status, source_files: metadata.source_files, details, suggestion: staleSuggestion(rel, status) };
    });
}
function renderStaleMarkdown(items) {
    return [
        "# Project Atlas Stale Report",
        "",
        ...items.map((item) => `- ${item.path}: ${item.status}${item.details.length ? ` (${item.details.join("; ")})` : ""}; Suggestion: ${item.suggestion}`),
        "",
    ].join("\n");
}
function checkKnowledge(repo) {
    const items = [];
    const manifestPath = path.join(repo, "knowledge/manifest.json");
    let requiredFiles = [];
    if (!existsSync(manifestPath)) {
        items.push(checkIssue("error", "missing_manifest", "knowledge/manifest.json", "knowledge manifest is missing.", "Run project-atlas init or restore knowledge/manifest.json."));
    }
    else {
        try {
            const manifest = readJson(manifestPath);
            if (Array.isArray(manifest.required_files)) {
                requiredFiles = manifest.required_files.filter((item) => typeof item === "string");
            }
            else {
                items.push(checkIssue("error", "invalid_manifest", "knowledge/manifest.json", "required_files must be an array.", "Repair knowledge/manifest.json."));
            }
        }
        catch {
            items.push(checkIssue("error", "invalid_manifest", "knowledge/manifest.json", "manifest must be valid JSON.", "Repair knowledge/manifest.json."));
        }
    }
    for (const rel of requiredFiles) {
        if (!existsSync(path.join(repo, rel))) {
            items.push(checkIssue("error", "missing_required_file", rel, "required knowledge file is missing.", "Restore the file or update required_files in knowledge/manifest.json."));
        }
    }
    if (existsSync(path.join(repo, ".opencode/kb-proposals"))) {
        items.push(checkIssue("warning", "legacy_opencode_proposals", ".opencode/kb-proposals", "legacy OpenCode proposal directory is present.", "Review or migrate pending proposals, then keep new proposals under .project-atlas/proposals."));
    }
    const topicPaths = new Map();
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
                items.push(checkIssue("error", "missing_metadata", rel, "frontmatter or source_files missing.", "Regenerate this file with project-atlas remember or project-atlas propose."));
            }
            continue;
        }
        for (const source of metadata.source_files) {
            const current = repoFileHash(repo, source);
            const expected = metadata.source_hashes[source];
            if (current === "sha256:missing") {
                items.push(checkIssue("error", "missing_source", rel, `source file is missing: ${source}`, "Restore the source file or refresh this memory with current evidence."));
            }
            else if (!expected || expected !== current) {
                items.push(checkIssue("error", "stale_source", rel, `source hash changed: ${source}`, "Refresh this memory with project-atlas remember or project-atlas propose."));
            }
        }
        items.push(...contentQualityIssues(rel, body, metadata.source_files));
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
        }
        catch {
            items.push(checkIssue("error", "invalid_schema_json", rel, "schema file must be valid JSON.", "Repair or remove the invalid schema file."));
        }
    }
    const ok = !items.some((item) => item.level === "error");
    return { schema_version: "1.0", repo, ok, items };
}
function renderCheckMarkdown(result) {
    const lines = ["# Project Atlas Check", "", `- ok: ${result.ok ? "yes" : "no"}`, `- issues: ${result.items.length}`, ""];
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
function checkIssue(level, ruleId, pathValue, message, suggestion) {
    return { level, rule_id: ruleId, path: pathValue, message, suggestion };
}
function contentQualityIssues(pathValue, body, sourceFiles) {
    if (isScaffoldKnowledgeFile(pathValue)) {
        return [];
    }
    const items = [];
    const normalizedBody = body.replace(/```[\s\S]*?```/g, "").trim();
    const nonEmptyLines = normalizedBody.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const bodyChars = normalizedBody.replace(/\s/g, "").length;
    if (bodyChars < 160 || nonEmptyLines.length < 4) {
        items.push(checkIssue("warning", "shallow_document", pathValue, "knowledge document appears too shallow for stable project reuse.", "Add evidence-backed responsibilities, entry points, key files, and change notes."));
    }
    if (sourceFiles.length <= 1 && sourceFiles.every((source) => /(^|\/)README\.md$/i.test(source))) {
        items.push(checkIssue("warning", "weak_evidence", pathValue, "knowledge document only cites README evidence.", "Regenerate with concrete source files such as entry points, schemas, adapter commands, tests, or configs."));
    }
    if (!hasPracticalSections(normalizedBody)) {
        items.push(checkIssue("warning", "missing_practical_sections", pathValue, "knowledge document is missing practical engineering sections.", "Include applicable sections for responsibilities, key entry points, key files, contracts, risks, tests, or change notes."));
    }
    return items;
}
function qualityScoreForUpdates(updateEvidence, findings) {
    const items = updateEvidence.map((update) => {
        const deductions = [];
        const updateFindings = findings.filter((item) => item.path === update.target);
        for (const finding of updateFindings) {
            deductions.push(finding.rule_id);
        }
        const evidenceTypes = evidenceTypesForFiles(update.source_files);
        if (evidenceTypes.size < 2) {
            deductions.push("narrow_evidence_types");
        }
        const score = Math.max(0, 100 - updateFindings.length * 25 - (evidenceTypes.size < 2 ? 15 : 0));
        return { target: update.target, score, deductions: unique(deductions) };
    });
    const score = items.length ? Math.round(items.reduce((total, item) => total + item.score, 0) / items.length) : 100;
    return { score, rating: score >= 80 ? "good" : score >= 70 ? "warning" : "poor", items };
}
function coverageScoreForUpdates(updateEvidence, evidencePlan, externalWarnings) {
    const warningRules = unique(externalWarnings.map((item) => item.rule_id));
    const items = updateEvidence.map((update) => {
        const plan = evidencePlan.find((item) => item.target === update.target);
        const plannedFiles = plan?.recommended_files ?? update.source_files;
        const actualFiles = update.source_files;
        const actualSet = new Set(actualFiles);
        const missingFiles = plannedFiles.filter((file) => !actualSet.has(file));
        const missingEvidenceTypes = plan?.missing_evidence ?? requiredEvidenceTypesForTarget(update.target).filter((type) => !evidenceTypesForFiles(actualFiles).has(type) && type !== "source_file");
        const deductions = unique([
            ...missingEvidenceTypes.map((type) => `missing_evidence:${type}`),
            ...(missingFiles.length ? ["missing_planned_files"] : []),
            ...(actualFiles.length <= 1 ? ["too_few_source_files"] : []),
            ...(warningRules.length ? ["external_evidence_warnings"] : []),
        ]);
        const score = Math.max(0, 100 - missingEvidenceTypes.length * 18 - Math.min(missingFiles.length, 3) * 8 - (actualFiles.length <= 1 ? 15 : 0) - warningRules.length * 10);
        return {
            target: update.target,
            score,
            planned_files: plannedFiles,
            actual_files: actualFiles,
            missing_files: missingFiles,
            missing_evidence_types: missingEvidenceTypes,
            external_warnings: warningRules,
            deductions,
        };
    });
    const score = items.length ? Math.round(items.reduce((total, item) => total + item.score, 0) / items.length) : 100;
    return { score, rating: score >= 80 ? "good" : score >= 70 ? "warning" : "poor", items };
}
function evidenceTypesForFiles(files) {
    const types = new Set();
    for (const file of files) {
        if (/(^|\/)README\.md$/i.test(file))
            types.add("readme");
        if (/(^|\/)(package\.json|pom\.xml|tsconfig\.json)$/.test(file))
            types.add("build_config");
        if (/(^|\/)(index|cli|main)\.[cm]?[jt]s$|bin\//.test(file))
            types.add("cli_entry");
        if (/(^|\/)(mcp|server)\.[cm]?[jt]s$|Mcp.*\.java$/.test(file))
            types.add("mcp_entry");
        if (/\/commands\//.test(file))
            types.add("adapter_command");
        if (/\/tools\//.test(file))
            types.add("adapter_tool");
        if (/^schema\/.*\.json$/.test(file))
            types.add("schema");
        if (/(^|\/)(test|tests|__tests__)\/|\.test\.[cm]?[jt]s$|\.spec\.[cm]?[jt]s$|Test\.java$/.test(file))
            types.add("tests");
        if (/^docs\/|(^|\/)(CHANGELOG|CONTRIBUTING|SECURITY|AGENTS)\.md$/i.test(file))
            types.add("docs");
        if (!types.size && file)
            types.add("source_file");
    }
    return types;
}
function proposalEvidencePlanSummary(updateEvidence) {
    return updateEvidence.map((update) => {
        const evidenceTypes = [...evidenceTypesForFiles(update.source_files)].sort();
        return {
            target: update.target,
            candidate_category: categoryFromTarget(update.target),
            recommended_files: update.source_files,
            required_evidence_types: requiredEvidenceTypesForTarget(update.target),
            reason: "proposal source evidence selected for this target",
            missing_evidence: requiredEvidenceTypesForTarget(update.target).filter((type) => !evidenceTypes.includes(type) && type !== "source_file"),
            confidence: evidenceTypes.length >= 2 ? 0.8 : 0.55,
        };
    });
}
function updateReasonSummary(repo, inputData, updateEvidence) {
    if (inputData.update_reason_summary?.trim()) {
        return inputData.update_reason_summary.trim();
    }
    const changed = new Set(changedFiles(repo));
    const changedEvidence = unique(updateEvidence.flatMap((update) => update.source_files).filter((source) => changed.has(source)));
    if (changedEvidence.length) {
        return `Stable knowledge update is tied to changed source files: ${changedEvidence.slice(0, 8).join(", ")}.`;
    }
    const externalTypes = unique((inputData.external_evidence ?? []).map((item) => item.source_type));
    if (externalTypes.length) {
        return `Stable knowledge update is supported by external evidence types: ${externalTypes.slice(0, 6).join(", ")}.`;
    }
    const targets = unique(updateEvidence.map((update) => update.target));
    return `Stable knowledge update covers ${targets.length} target file${targets.length === 1 ? "" : "s"} from explicit source evidence.`;
}
function requiredEvidenceTypesForTarget(target) {
    if (target.includes("/workflows/cli"))
        return ["cli_entry", "build_config", "tests"];
    if (target.includes("/integrations/mcp"))
        return ["mcp_entry", "schema", "tests"];
    if (target.includes("/integrations/agent"))
        return ["adapter_command", "adapter_tool", "docs"];
    if (target.includes("/contracts/"))
        return ["schema", "tests"];
    if (target.includes("/quality/"))
        return ["tests", "build_config", "docs"];
    if (target.includes("/project/"))
        return ["readme", "build_config", "docs"];
    return ["source_file", "tests"];
}
function categoryFromTarget(target) {
    const match = target.match(/^knowledge\/([^/]+)\//);
    return match?.[1] ?? "knowledge";
}
function hasPracticalSections(body) {
    const headingText = body
        .split(/\r?\n/)
        .filter((line) => /^#{2,4}\s+/.test(line))
        .join("\n")
        .toLowerCase();
    const patterns = [
        /responsibilit|职责|边界/,
        /entry point|入口/,
        /key file|关键文件/,
        /contract|契约|接口/,
        /workflow|flow|流程/,
        /risk|风险/,
        /test|验证|测试/,
        /change note|变更/,
    ];
    return patterns.filter((pattern) => pattern.test(headingText)).length >= 2;
}
function markdownRelativeLinks(content) {
    const links = [];
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const raw = match[1].trim();
        if (!raw || raw.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("/")) {
            continue;
        }
        links.push(raw.split("#")[0]);
    }
    return links.filter(Boolean);
}
function createProposal(repo, inputData, reason, inheritSourceMetadata = false) {
    const root = proposalRoot(repo);
    ensureDir(root);
    const proposalId = `kb-${timestamp()}-${Math.floor(Math.random() * 100000)}`;
    const dir = path.join(root, proposalId);
    ensureDir(dir);
    const targetFiles = inputData.updates.map((update) => validateKnowledgeTarget(update.target));
    const duplicateTarget = firstDuplicate(targetFiles);
    if (duplicateTarget) {
        throw new Error(`duplicate proposal target: ${duplicateTarget}`);
    }
    const inheritedSourceFiles = inheritSourceMetadata ? inheritedSourceFilesForTargets(repo, targetFiles) : [];
    const defaultSourceFiles = unique([...inheritedSourceFiles, ...(inputData.source_files ?? [])].filter(Boolean).map((source) => validateRepoRelativePath(source, "source_files item")));
    const updateEvidence = inputData.updates.map((update) => {
        const updateSourceFiles = update.source_files?.length ? update.source_files.map((source) => validateRepoRelativePath(source, "updates.source_files item")) : defaultSourceFiles;
        return {
            target: validateKnowledgeTarget(update.target),
            content: update.content,
            source_files: unique(updateSourceFiles),
        };
    });
    const sourceFiles = unique(updateEvidence.flatMap((update) => update.source_files));
    assertSourceFilesExist(repo, sourceFiles);
    const sourceHashes = Object.fromEntries(sourceFiles.map((source) => [source, repoFileHash(repo, source)]));
    const proposalQualityFindings = updateEvidence.flatMap((update) => contentQualityIssues(update.target, update.content, update.source_files));
    const qualityScore = qualityScoreForUpdates(updateEvidence, proposalQualityFindings);
    const evidencePlanSummary = proposalEvidencePlanSummary(updateEvidence);
    const proposalExternalEvidence = inputData.external_evidence ?? [];
    const externalWarnings = externalEvidenceQualityWarnings(repo, proposalExternalEvidence);
    const coverageScore = coverageScoreForUpdates(updateEvidence, evidencePlanSummary, externalWarnings);
    const reasonSummary = updateReasonSummary(repo, inputData, updateEvidence);
    const sensitiveFindings = updateEvidence.flatMap((update) => sensitiveContentFindings(update.target, update.content));
    const status = sensitiveFindings.length ? "blocked_sensitive" : "proposed";
    if (sensitiveFindings.length) {
        writeJson(path.join(dir, "blocked-sensitive-summary.json"), {
            schema_version: "1.0",
            blocked_at: new Date().toISOString(),
            items: sensitiveFindings,
        });
    }
    const operations = status === "blocked_sensitive"
        ? []
        : updateEvidence.map((update) => {
            const updateSourceHashes = Object.fromEntries(update.source_files.map((source) => [source, sourceHashes[source]]));
            const content = ensureKnowledgeFrontmatter(update.content, {
                source_files: update.source_files,
                source_hashes: updateSourceHashes,
                generated_by: "project-atlas",
                review_status: "draft",
            });
            return { type: "replace_file", path: update.target, content, source_files: update.source_files, source_hashes: updateSourceHashes, target_current_hash: repoFileHash(repo, update.target) };
        });
    const proposalBase = {
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
        update_reason_summary: reasonSummary,
        external_evidence: proposalExternalEvidence,
        evidence_plan_summary: evidencePlanSummary,
        quality_score: qualityScore,
        coverage_score: coverageScore,
        proposal_quality_findings: proposalQualityFindings,
        sensitive_scan_result: status === "blocked_sensitive" ? "blocked" : "passed",
        proposal_status: status,
    };
    const proposalHash = sha256Text(JSON.stringify(proposalBase));
    const proposal = { ...proposalBase, proposal_hash: proposalHash };
    writeJson(path.join(dir, "proposal.json"), proposal);
    writeFileSync(path.join(dir, "dry-run.diff"), status === "blocked_sensitive" ? "" : renderDryRunDiff(repo, operations), "utf8");
    writeEvidence(repo, proposalId, status, proposal.worktree_diff_hash, proposal.proposal_hash, "");
    return proposal;
}
function loadUpdateInput(repo, target, contentFile, updatesFile) {
    if (updatesFile) {
        const parsed = readJson(path.resolve(repo, updatesFile));
        if (!Array.isArray(parsed.updates) || parsed.updates.length === 0) {
            throw new Error("updates-file must contain a non-empty updates array.");
        }
        if (parsed.update_reason_summary !== undefined && typeof parsed.update_reason_summary !== "string") {
            throw new Error("updates-file update_reason_summary must be a string.");
        }
        return {
            source_files: validateSourceFiles(parsed.source_files ?? []),
            external_evidence: validateExternalEvidenceItems(parsed.external_evidence ?? []),
            update_reason_summary: typeof parsed.update_reason_summary === "string" ? validateFrontmatterScalar(parsed.update_reason_summary, "update_reason_summary") : undefined,
            updates: validateUpdateItems(parsed.updates),
        };
    }
    if (!target || !contentFile) {
        throw new Error("provide --updates-file or --target with --content-file");
    }
    return { source_files: [], external_evidence: [], updates: [{ target, content: readFileSync(path.resolve(repo, contentFile), "utf8") }] };
}
function validateUpdateItems(value) {
    if (!Array.isArray(value) || value.length === 0) {
        throw new Error("updates-file must contain a non-empty updates array.");
    }
    return value.map((raw) => {
        if (!isRecord(raw)) {
            throw new Error("updates item must be an object.");
        }
        const target = requiredUpdateString(raw, "target");
        const content = requiredUpdateString(raw, "content");
        const item = { target, content };
        if (raw.source_files !== undefined) {
            item.source_files = validateSourceFiles(raw.source_files, "updates.source_files item");
        }
        return item;
    });
}
function loadMemoryCandidate(repo, candidateFile) {
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(path.resolve(repo, candidateFile), "utf8"));
    }
    catch {
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
        return validateRepoRelativePath(source, "source_files item");
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
function validateMemoryCandidateItem(raw) {
    if (!isRecord(raw)) {
        throw new Error("memory item must be an object.");
    }
    const target = validateKnowledgeTarget(requiredMemoryString(raw, "target"));
    const memoryType = memoryTypeValue(requiredMemoryString(raw, "memory_type"), "memory item memory_type");
    const topic = validateFrontmatterScalar(requiredMemoryString(raw, "topic"), "memory item topic");
    const scope = validateFrontmatterScalar(requiredMemoryString(raw, "scope"), "memory item scope");
    const summary = validateFrontmatterScalar(requiredMemoryString(raw, "summary"), "memory item summary");
    const body = requiredMemoryString(raw, "body");
    const confidence = raw.confidence;
    if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
        throw new Error("memory item confidence must be a number between 0 and 1.");
    }
    const item = { target, memory_type: memoryType, topic, scope, confidence, summary, body };
    if (raw.owner !== undefined) {
        if (typeof raw.owner !== "string") {
            throw new Error("memory item owner must be a string.");
        }
        const owner = validateFrontmatterScalar(raw.owner, "memory item owner");
        if (owner)
            item.owner = owner;
    }
    if (raw.related_docs !== undefined) {
        if (!Array.isArray(raw.related_docs)) {
            throw new Error("memory item related_docs must be an array.");
        }
        item.related_docs = raw.related_docs.map((doc) => {
            if (typeof doc !== "string" || !doc.trim()) {
                throw new Error("memory item related_docs items must be strings.");
            }
            return validateRepoRelativePath(doc, "memory item related_docs item");
        });
    }
    return item;
}
function memoryCandidateToUpdateInput(repo, candidate, replaceExisting) {
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
function validateSourceFiles(value, itemLabel = "source_files item") {
    if (!Array.isArray(value)) {
        throw new Error("source_files must be an array.");
    }
    return value.map((source) => {
        if (typeof source !== "string" || !source.trim()) {
            throw new Error("source_files items must be strings.");
        }
        return validateRepoRelativePath(source, itemLabel);
    });
}
function assertSourceFilesExist(repo, sourceFiles) {
    for (const source of sourceFiles) {
        const abs = path.join(repo, source);
        if (!existsSync(abs) || !statSync(abs).isFile()) {
            throw new Error(`source file does not exist: ${source}`);
        }
    }
}
function assertProposalContentHasNoFrontmatter(updates) {
    for (const update of updates) {
        if (hasFrontmatter(update.content)) {
            throw new Error("proposal content must not include frontmatter; project-atlas generates metadata automatically.");
        }
    }
}
function buildMemoryContent(memory, sourceFiles, sourceHashes) {
    const body = memory.body.trim();
    const content = body.startsWith("#") ? `${body}\n` : `# ${memory.summary}\n\n${body}\n`;
    return `${buildFrontmatter({
        source_files: sourceFiles,
        source_hashes: sourceHashes,
        generated_by: "project-atlas",
        review_status: "draft",
        memory_type: memory.memory_type,
        topic: memory.topic,
        scope: memory.scope,
        confidence: memory.confidence,
        owner: memory.owner,
        related_docs: memory.related_docs,
    })}${content}`;
}
function loadExternalEvidence(repo, evidenceFile) {
    if (!evidenceFile) {
        return [];
    }
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(path.resolve(repo, evidenceFile), "utf8"));
    }
    catch {
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
function validateExternalEvidenceItems(value) {
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
        const item = {
            source,
            source_type: sourceType,
            path: normalizeRepoPath(itemPath),
        };
        for (const field of ["symbol", "summary", "locator"]) {
            const valueForField = raw[field];
            if (valueForField !== undefined) {
                if (typeof valueForField !== "string") {
                    throw new Error(`external_evidence item ${field} must be a string.`);
                }
                item[field] = valueForField;
            }
        }
        for (const field of ["generated_at", "base_commit", "tool_version", "coverage_summary"]) {
            const valueForField = raw[field];
            if (valueForField !== undefined) {
                if (typeof valueForField !== "string") {
                    throw new Error(`external_evidence item ${field} must be a string.`);
                }
                item[field] = valueForField;
            }
        }
        assertExternalEvidenceHasNoSensitiveContent(item);
        if (raw.confidence !== undefined) {
            if (typeof raw.confidence !== "number" || raw.confidence < 0 || raw.confidence > 1) {
                throw new Error("external_evidence item confidence must be a number between 0 and 1.");
            }
            item.confidence = raw.confidence;
        }
        return item;
    });
}
function assertExternalEvidenceHasNoSensitiveContent(item) {
    for (const field of ["source", "source_type", "path", "symbol", "summary", "locator", "generated_at", "base_commit", "tool_version", "coverage_summary"]) {
        const value = item[field];
        if (!value) {
            continue;
        }
        const match = sensitiveRuleMatches(value)[0];
        if (match) {
            throw new Error(`external_evidence item ${field} contains sensitive content: ${match.rule_id}`);
        }
    }
}
function requiredString(record, field) {
    const value = record[field];
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`external_evidence item ${field} is required.`);
    }
    return value.trim();
}
function requiredUpdateString(record, field) {
    const value = record[field];
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`updates item ${field} is required.`);
    }
    return value;
}
function requiredMemoryString(record, field) {
    const value = record[field];
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`memory item ${field} is required.`);
    }
    return value.trim();
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function writeEvidence(repo, proposalId, status, worktree, proposalHash, appliedHash) {
    const dir = path.join(proposalRoot(repo), proposalId);
    const latest = {
        proposal_id: proposalId,
        proposal_status: status,
        worktree_diff_hash: worktree,
        proposal_hash: proposalHash,
        applied_hash: appliedHash,
        updated_at: new Date().toISOString(),
    };
    const trigger = {
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
function assertProposalStillFresh(repo, proposal) {
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
function latestProposalId(repo) {
    const latestPath = path.join(proposalRoot(repo), "latest.json");
    return existsSync(latestPath) ? readJson(latestPath).proposal_id : "";
}
function renderDryRunDiff(repo, operations) {
    return operations
        .map((operation) => {
        const oldContent = existsSync(path.join(repo, operation.path)) ? readFileSync(path.join(repo, operation.path), "utf8") : "";
        return [`--- ${operation.path}`, `+++ ${operation.path}`, `@@`, `- ${oldContent.trim().split(/\r?\n/).slice(0, 12).join("\n- ")}`, `+ ${operation.content.trim().split(/\r?\n/).slice(0, 12).join("\n+ ")}`, ""].join("\n");
    })
        .join("\n");
}
function dryRunSummaryLines(diffPath, targetFiles) {
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
        if (line.startsWith("+"))
            additions++;
        if (line.startsWith("-"))
            deletions++;
    }
    return [`- target_files: ${targetFiles.length ? targetFiles.join(", ") : "none"}`, `- changed_lines: +${additions} -${deletions}`];
}
function reviewDecision(proposal, risk) {
    if (proposal.proposal_status === "blocked_sensitive" || proposal.sensitive_scan_result === "blocked") {
        return "blocked by sensitive content; do not apply.";
    }
    if ((proposal.proposal_quality_findings ?? []).length) {
        return "proposed content has quality warnings; regenerate with stronger evidence before apply.";
    }
    if (risk.hasLowQualityScore) {
        return "proposed content quality score is too low; regenerate with stronger evidence before apply.";
    }
    if (risk.hasLowCoverageScore) {
        return "proposed content coverage score is too low; add planned files, missing evidence types, or fresh external evidence before apply.";
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
function nextReviewStep(proposal, hasKnowledgeRisk, hasProposedQualityIssues = false) {
    if (proposal.proposal_status !== "proposed") {
        return `- No apply command is available for status ${proposal.proposal_status}.`;
    }
    if (hasProposedQualityIssues) {
        return "- Resolve proposed content warnings by adding stronger source evidence and practical sections, then regenerate the proposal.";
    }
    if (hasKnowledgeRisk) {
        return "- Resolve stale, missing source, or missing metadata items, then regenerate the proposal.";
    }
    return "- No apply command is available until Apply Safety is clear.";
}
function staleSuggestion(pathValue, status) {
    if (status === "fresh") {
        return "No action needed.";
    }
    if (status === "missing_source") {
        return `Check missing source file before refreshing ${pathValue}.`;
    }
    if (status === "missing_metadata") {
        return `Add project-atlas frontmatter or regenerate with project-atlas propose for ${pathValue}.`;
    }
    return `Run project-atlas propose with refreshed content for ${pathValue}.`;
}
function isScaffoldKnowledgeFile(pathValue) {
    return (pathValue === "knowledge/README.md" ||
        pathValue === "knowledge/index.md" ||
        pathValue === "knowledge/glossary.md" ||
        /^knowledge\/(domains|workflows|contracts|integrations|quality|decisions)\/README\.md$/.test(pathValue));
}
function inheritedSourceFilesForTargets(repo, targetFiles) {
    const sources = [];
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
function hasSensitiveContent(content) {
    return sensitiveRuleMatches(content).length > 0;
}
function sensitiveContentFindings(pathValue, content) {
    return sensitiveRuleMatches(content).map((rule) => ({
        path: pathValue,
        rule_id: rule.rule_id,
        rule_category: rule.rule_category,
        action: "blocked_full_diff",
    }));
}
function globFiles(repo, dir, suffixes) {
    const abs = path.join(repo, dir);
    if (!existsSync(abs)) {
        return [];
    }
    const output = [];
    const visit = (currentAbs, currentRel) => {
        for (const entry of readdirSync(currentAbs, { withFileTypes: true })) {
            const rel = path.posix.join(currentRel, entry.name);
            const childAbs = path.join(repo, rel);
            if (entry.isDirectory()) {
                visit(childAbs, rel);
            }
            else if (suffixes.some((suffix) => entry.name.endsWith(suffix))) {
                output.push(rel);
            }
        }
    };
    visit(abs, dir);
    return output.sort();
}
function knowledgeMarkdownFiles(repo) {
    return globFiles(repo, "knowledge", [".md"]).filter((rel) => !rel.startsWith("knowledge/logs/") && !rel.startsWith("knowledge/assets/"));
}
function listOrNone(items) {
    return items.length ? items.map((item) => `- ${item}`) : ["- none"];
}
function evidencePlanSummaryLines(items) {
    if (!items.length) {
        return ["- none"];
    }
    return items.map((item) => {
        const missing = item.missing_evidence.length ? `; missing: ${item.missing_evidence.join(", ")}` : "";
        return `- ${item.target}: files=${item.recommended_files.length}; required=${item.required_evidence_types.join(", ")}${missing}; confidence=${item.confidence}`;
    });
}
function qualityScoreLines(score) {
    if (!score) {
        return ["- none"];
    }
    return [
        `- overall: ${score.score}`,
        `- rating: ${score.rating}`,
        ...score.items.map((item) => `- ${item.target}: ${item.score}${item.deductions.length ? `; deductions: ${item.deductions.join(", ")}` : ""}`),
    ];
}
function coverageScoreLines(score) {
    if (!score) {
        return ["- none"];
    }
    return [
        `- overall: ${score.score}`,
        `- rating: ${score.rating}`,
        ...score.items.map((item) => {
            const details = [
                `planned_files=${item.planned_files.length}`,
                `actual_files=${item.actual_files.length}`,
                item.missing_files.length ? `missing_files=${item.missing_files.join(", ")}` : "",
                item.missing_evidence_types.length ? `missing_evidence=${item.missing_evidence_types.join(", ")}` : "",
                item.external_warnings.length ? `external_warnings=${item.external_warnings.join(", ")}` : "",
                item.deductions.length ? `deductions=${item.deductions.join(", ")}` : "",
            ].filter(Boolean);
            return `- ${item.target}: ${item.score}; ${details.join("; ")}`;
        }),
    ];
}
function externalEvidenceLines(items) {
    if (!items.length) {
        return ["- none"];
    }
    return items.map((item) => {
        const details = [`${item.source} (${item.source_type})`, item.path];
        if (item.symbol)
            details.push(`symbol: ${item.symbol}`);
        if (item.summary)
            details.push(item.summary);
        if (item.locator)
            details.push(`locator: ${item.locator}`);
        if (item.confidence !== undefined)
            details.push(`confidence: ${item.confidence}`);
        if (item.generated_at)
            details.push(`generated_at: ${item.generated_at}`);
        if (item.base_commit)
            details.push(`base_commit: ${item.base_commit}`);
        if (item.tool_version)
            details.push(`tool_version: ${item.tool_version}`);
        if (item.coverage_summary)
            details.push(`coverage: ${item.coverage_summary}`);
        return `- ${details.join(" | ")}`;
    });
}
function externalEvidenceQualityWarnings(repo, items) {
    const warnings = [];
    const head = currentCommit(repo);
    for (const item of items) {
        if (item.path && !existsSync(path.join(repo, item.path))) {
            warnings.push(checkIssue("warning", "external_evidence_missing_path", item.path, `external evidence path is missing: ${item.path}`, "Regenerate external evidence from the current repository."));
        }
        if (item.base_commit && head && item.base_commit !== head) {
            warnings.push(checkIssue("warning", "external_evidence_base_commit_differs", item.path, "external evidence base_commit differs from current HEAD.", "Regenerate or mark the evidence as intentionally reused."));
        }
        if (item.generated_at) {
            const generatedAt = Date.parse(item.generated_at);
            if (Number.isNaN(generatedAt)) {
                warnings.push(checkIssue("warning", "external_evidence_invalid_generated_at", item.path, "external evidence generated_at is not a valid date.", "Use an ISO date-time value."));
            }
            else if (Date.now() - generatedAt > 7 * 24 * 60 * 60 * 1000) {
                warnings.push(checkIssue("warning", "external_evidence_stale", item.path, "external evidence is older than 7 days.", "Regenerate evidence before using it for deep knowledge generation."));
            }
        }
    }
    return warnings;
}
function truncate(value, budget) {
    if (value.length <= budget) {
        return { text: value, budget_used: value.length, truncated: false };
    }
    const marker = "\n...(truncated)";
    const text = budget <= marker.length ? value.slice(0, budget) : `${value.slice(0, budget - marker.length)}${marker}`;
    return { text, budget_used: text.length, truncated: true };
}
function unique(values) {
    return [...new Set(values)];
}
function firstDuplicate(values) {
    const seen = new Set();
    for (const value of values) {
        if (seen.has(value)) {
            return value;
        }
        seen.add(value);
    }
    return "";
}
function normalizeRepoPath(value) {
    return value.replace(/\\/g, "/").split(path.sep).join("/");
}
function validateRepoRelativePath(value, label) {
    const normalizedSeparators = normalizeRepoPath(value);
    if (/[\r\n\0]/.test(normalizedSeparators)) {
        throw new Error(`${label} must be a repository-relative path without line breaks.`);
    }
    const raw = normalizedSeparators.trim();
    if (!raw) {
        throw new Error(`${label} must be a repository-relative path without line breaks.`);
    }
    if (/^[A-Za-z]:/.test(raw)) {
        throw new Error(`${label} must be a repository-relative path.`);
    }
    if (path.posix.isAbsolute(raw) || raw.split("/").includes("..")) {
        throw new Error(`${label} must stay inside the repository.`);
    }
    const normalized = path.posix.normalize(raw);
    if (!normalized || normalized === "." || path.posix.isAbsolute(normalized) || normalized.startsWith("../") || normalized.includes("/../")) {
        throw new Error(`${label} must stay inside the repository.`);
    }
    const root = normalized.split("/")[0];
    if (root === ".git" || root === ".project-atlas" || root === ".code-review-graph") {
        throw new Error(`${label} cannot reference local evidence or Git metadata paths.`);
    }
    return normalized;
}
function validateFrontmatterScalar(value, label) {
    if (/[\r\n\0]/.test(value)) {
        throw new Error(`${label} must not contain line breaks.`);
    }
    return value.trim();
}
function templateFlag(flags) {
    const value = stringFlag(flags, "template", "generic-service");
    if (value === "generic-service" || value === "java-backend" || value === "frontend-app") {
        return value;
    }
    throw usageError("init", "--template must be generic-service, java-backend, or frontend-app");
}
function timestamp() {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
function parseArgs(argv) {
    const [command = "", ...rest] = argv;
    const flags = {};
    for (let index = 0; index < rest.length; index++) {
        const item = rest[index];
        if (!item.startsWith("--")) {
            throw usageError(command, `Unexpected argument: ${item}`);
        }
        const key = item.slice(2);
        const next = rest[index + 1];
        if (!next || next.startsWith("--")) {
            flags[key] = true;
        }
        else {
            flags[key] = next;
            index++;
        }
    }
    return { command, flags };
}
function validateFlags(command, flags) {
    const allowed = new Set([...(commandOptions[command] ?? []), "help", "h"]);
    const booleanFlags = new Set([...(booleanOptions[command] ?? []), "help", "h"]);
    for (const key of Object.keys(flags)) {
        if (!allowed.has(key)) {
            throw usageError(command, `Unknown option: --${key}`);
        }
        if (booleanFlags.has(key) && typeof flags[key] === "string") {
            throw usageError(command, `--${key} does not take a value`);
        }
    }
}
function stringFlag(flags, key, fallback) {
    const value = flags[key];
    return typeof value === "string" ? value : fallback;
}
function optionalStringFlag(flags, key) {
    const value = flags[key];
    return typeof value === "string" ? value : undefined;
}
function numberFlag(flags, key, fallback, command = "") {
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
function formatFlag(flags, command) {
    const format = stringFlag(flags, "format", "markdown");
    if (format !== "markdown" && format !== "json") {
        throw usageError(command, "--format must be markdown or json");
    }
    return format;
}
function reviewDepthFlag(flags, command) {
    const value = stringFlag(flags, "review-depth", "standard");
    if (value === "standard" || value === "deep") {
        return value;
    }
    throw usageError(command, "--review-depth must be standard or deep");
}
function optionalMemoryTypeFlag(flags, command) {
    const value = optionalStringFlag(flags, "memory-type");
    return value ? memoryTypeValue(value, "--memory-type", command) : undefined;
}
function memoryTypeValue(value, label, command) {
    if (value === "decision" || value === "experience" || value === "project_fact") {
        return value;
    }
    const message = `${label} must be decision, experience, or project_fact`;
    if (command) {
        throw usageError(command, message);
    }
    throw new Error(message);
}
function includesIgnoreCase(value, query) {
    return Boolean(value?.toLowerCase().includes(query.toLowerCase()));
}
function usageError(command, message) {
    const help = commandHelp[command];
    if (!help) {
        return new Error(`${message}\n\nRun \`project-atlas --help\` to see available commands.`);
    }
    return new Error(`${message}\n\n${help}`);
}
