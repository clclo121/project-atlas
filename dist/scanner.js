import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { entryRules, entryTypes, sensitiveRules } from "./rules.js";
import { changedFiles, currentCommit, runGit, walkFiles, worktreeHash } from "./utils.js";
export function scanRepo(repo, mode, externalEvidence = [], reviewDepth = "standard") {
    const allFiles = walkFiles(repo);
    const scopedFiles = mode === "changed" ? changedFiles(repo) : allFiles;
    const entries = Object.fromEntries(entryTypes.map((type) => [type, []]));
    for (const rel of scopedFiles) {
        const type = entryType(rel);
        if (type) {
            entries[type].push({ path: rel, name: titleFromPath(rel) });
        }
    }
    const pomFiles = allFiles.filter((rel) => rel === "pom.xml" || rel.endsWith("/pom.xml")).sort();
    const modules = pomFiles.map((rel) => parsePom(repo, rel));
    const knowledgeFiles = allFiles.filter((rel) => rel.startsWith("knowledge/")).sort();
    const facts = detectFacts(repo, allFiles, entries);
    const candidates = detectCandidates(scopedFiles, entries, externalEvidence);
    const evidencePlan = buildEvidencePlan(candidates);
    return {
        schema_version: "1.0",
        mode,
        review_depth: reviewDepth,
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
        facts,
        candidates,
        evidence_plan: evidencePlan,
        review_plan: reviewDepth === "deep" ? buildReviewPlan(evidencePlan, candidates, facts, externalEvidence) : [],
        sensitive_config_findings: sensitiveFindings(repo, scopedFiles.length ? scopedFiles : allFiles),
        external_evidence: externalEvidence,
        external_evidence_warnings: externalEvidenceWarnings(repo, externalEvidence),
    };
}
function buildReviewPlan(evidencePlan, candidates, facts, externalEvidence) {
    const candidateByTarget = new Map();
    for (const candidate of Object.values(candidates).flat()) {
        if (!candidateByTarget.has(candidate.target)) {
            candidateByTarget.set(candidate.target, candidate);
        }
    }
    const externalTypes = new Set(externalEvidence.map((item) => normalizeExternalEvidenceType(item.source_type)));
    return evidencePlan.map((item) => {
        const candidate = candidateByTarget.get(item.target);
        const expectedExternal = expectedExternalEvidenceTypes(item.candidate_category);
        const requiredExternal = expectedExternal.filter((type) => !externalTypes.has(type));
        return {
            target: item.target,
            review_depth: "deep",
            focus: reviewFocus(item.candidate_category),
            required_external_evidence: requiredExternal,
            risk_flags: reviewRiskFlags(item, requiredExternal),
            related_facts: relatedFactIds(candidate, facts),
            recommended_files: item.recommended_files,
            confidence: Math.min(0.95, Math.max(0.35, item.confidence - requiredExternal.length * 0.05 - item.missing_evidence.length * 0.04)),
        };
    });
}
function reviewFocus(category) {
    switch (category) {
        case "cli":
            return ["command contract", "argument validation", "proposal handoff", "test coverage"];
        case "mcp":
            return ["tool surface", "input schema", "no apply exposure", "test coverage"];
        case "adapter":
            return ["command prompt contract", "tool wiring", "human apply boundary", "failure output"];
        case "schema":
            return ["public schema fields", "required fields", "compatibility", "test fixtures"];
        case "quality":
            return ["test commands", "release checks", "risk hotspots", "verification gaps"];
        case "governance":
            return ["proposal lifecycle", "apply safety", "review summary", "stable knowledge update criteria"];
        case "external_evidence":
            return ["impact radius", "key nodes", "test gaps", "evidence freshness"];
        case "project":
            return ["runtime entry", "project boundary", "build contract", "source evidence"];
        default:
            return ["responsibility", "entry points", "source evidence", "test coverage"];
    }
}
function expectedExternalEvidenceTypes(category) {
    switch (category) {
        case "cli":
        case "mcp":
        case "adapter":
        case "schema":
        case "governance":
            return ["architecture_overview", "impact_radius", "test_gap"];
        case "quality":
        case "external_evidence":
            return ["impact_radius", "test_gap"];
        default:
            return ["architecture_overview"];
    }
}
function normalizeExternalEvidenceType(value) {
    if (value === "code_graph" || value === "repo_map")
        return "architecture_overview";
    if (value === "impact" || value === "impact_analysis")
        return "impact_radius";
    if (value === "test_gaps" || value === "coverage_gap")
        return "test_gap";
    return value;
}
function reviewRiskFlags(item, missingExternal) {
    return unique([
        ...item.missing_evidence.map((type) => `missing_evidence:${type}`),
        ...missingExternal.map((type) => `missing_external_evidence:${type}`),
        ...(item.confidence < 0.7 ? ["low_candidate_confidence"] : []),
    ]);
}
function relatedFactIds(candidate, facts) {
    const explicit = candidate?.fact_ids ?? [];
    if (!explicit.length) {
        return [];
    }
    const expanded = explicit.flatMap((id) => {
        if (!id.endsWith(":*"))
            return [id];
        const prefix = id.slice(0, -1);
        return allFactIds(facts).filter((factId) => factId.startsWith(prefix));
    });
    return unique(expanded).slice(0, 12);
}
function allFactIds(facts) {
    return unique([
        ...(facts.package_json ? ["package:package.json"] : []),
        ...facts.mcp_tools.map((item) => item.id),
        ...facts.adapter_assets.map((item) => item.id),
        ...facts.schemas.map((item) => item.id),
        ...facts.tests.map((item) => item.id),
    ]);
}
function parsePom(repo, rel) {
    const text = read(repo, rel);
    const tag = (name) => text.match(new RegExp(`<${name}>\\s*([^<]+?)\\s*</${name}>`))?.[1] ?? "";
    const modules = [...text.matchAll(/<module>\s*([^<]+?)\s*<\/module>/g)].map((match) => match[1]);
    return { path: rel, groupId: tag("groupId"), artifactId: tag("artifactId"), version: tag("version"), modules };
}
function read(repo, rel) {
    try {
        return readFileSync(path.join(repo, rel), "utf8");
    }
    catch {
        return "";
    }
}
function entryType(rel) {
    for (const rule of entryRules) {
        if (rule.requiresJava && !rel.endsWith(".java")) {
            continue;
        }
        if (rule.pattern.test(rel)) {
            return rule.type;
        }
    }
    return "";
}
function titleFromPath(rel) {
    return path.basename(rel).replace(/\.(java|xml|ya?ml|properties|md|json|[cm]?[jt]s)$/i, "");
}
function detectFacts(repo, files, entries) {
    return {
        package_json: packageJsonFact(repo, files),
        mcp_tools: entries.mcp.flatMap((entry) => mcpToolFacts(repo, entry.path)),
        adapter_assets: adapterFacts(entries),
        schemas: entries.schema.map((entry) => schemaFact(repo, entry.path)),
        tests: entries.tests.map((entry) => ({ id: `test:${entry.path}`, type: "test", path: entry.path, name: entry.name, summary: testSummary(entry.path) })),
    };
}
function packageJsonFact(repo, files) {
    const rel = files.find((item) => item === "package.json");
    if (!rel) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(read(repo, rel));
        return {
            path: rel,
            name: typeof parsed.name === "string" ? parsed.name : undefined,
            bin: objectKeys(parsed.bin),
            scripts: objectKeys(parsed.scripts),
            files: Array.isArray(parsed.files) ? parsed.files.filter((item) => typeof item === "string") : [],
            exports: typeof parsed.exports === "string" ? [parsed.exports] : objectKeys(parsed.exports),
        };
    }
    catch {
        return { path: rel, bin: [], scripts: [], files: [], exports: [] };
    }
}
function mcpToolFacts(repo, rel) {
    const text = read(repo, rel);
    const tools = [...text.matchAll(/registerTool\(\s*["']([^"']+)["']/g)].map((match) => match[1]);
    if (!tools.length) {
        return [{ id: `mcp:${rel}`, type: "mcp_entry", path: rel, name: titleFromPath(rel) }];
    }
    return tools.map((name) => ({ id: `mcp_tool:${name}`, type: "mcp_tool", path: rel, name, summary: "MCP registered tool" }));
}
function adapterFacts(entries) {
    return unique([...entries.adapter, ...entries.commands, ...entries.tools].map((entry) => entry.path)).map((rel) => {
        const type = rel.includes("/commands/") ? "adapter_command" : rel.includes("/tools/") ? "adapter_tool" : "adapter_doc";
        return { id: `${type}:${rel}`, type, path: rel, name: titleFromPath(rel) };
    });
}
function schemaFact(repo, rel) {
    try {
        const parsed = JSON.parse(read(repo, rel));
        const required = Array.isArray(parsed.required) ? parsed.required.filter((item) => typeof item === "string") : [];
        const id = typeof parsed.$id === "string" ? parsed.$id : rel;
        return { id: `schema:${rel}`, type: "schema", path: rel, name: titleFromPath(rel), summary: `${id}; required=${required.join(",")}` };
    }
    catch {
        return { id: `schema:${rel}`, type: "schema", path: rel, name: titleFromPath(rel), summary: "invalid json schema" };
    }
}
function testSummary(rel) {
    if (/cli/i.test(rel))
        return "CLI regression test asset";
    if (/mcp/i.test(rel))
        return "MCP regression test asset";
    return "test asset";
}
function objectKeys(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).sort() : [];
}
function detectCandidates(files, entries, externalEvidence) {
    const text = files.join("\n").toLowerCase();
    const has = (items) => items.some((item) => text.includes(item));
    const domains = [];
    const workflows = [];
    const integrations = [];
    const risks = [];
    const contracts = [];
    const quality = [];
    const evidenceFiles = (keys, fallback = []) => unique(keys.flatMap((key) => entries[key]?.map((item) => item.path) ?? []).concat(fallback)).slice(0, 12);
    const push = (items, candidate) => {
        if (!items.some((item) => item.target === candidate.target)) {
            items.push(candidate);
        }
    };
    const hasAnyEntry = (keys) => keys.some((key) => entries[key]?.length);
    if (files.includes("README.md") || files.some((rel) => /(^|\/)package\.json$|(^|\/)pom\.xml$/.test(rel))) {
        push(domains, {
            target: "knowledge/project/overview.md",
            reason: "project overview evidence detected",
            source_files: evidenceFiles(["build", "docs"], ["README.md"].filter((rel) => files.includes(rel))),
            confidence: 0.9,
            category: "project",
            fact_ids: ["package:package.json"],
        });
    }
    if (hasAnyEntry(["cli"])) {
        push(workflows, {
            target: "knowledge/workflows/cli-commands.md",
            reason: "CLI entry points detected",
            source_files: evidenceFiles(["cli", "build", "tests"]),
            confidence: 0.86,
            category: "cli",
            fact_ids: ["package:package.json"],
        });
    }
    if (hasAnyEntry(["mcp"])) {
        push(integrations, {
            target: "knowledge/integrations/mcp-server.md",
            reason: "MCP server entry detected",
            source_files: evidenceFiles(["mcp", "schema", "tests"]),
            confidence: 0.86,
            category: "mcp",
            fact_ids: ["mcp:*"],
        });
    }
    if (hasAnyEntry(["adapter", "commands", "tools"])) {
        push(integrations, {
            target: "knowledge/integrations/agent-adapters.md",
            reason: "agent adapter assets detected",
            source_files: unique([
                ...(entries.commands ?? []).map((item) => item.path).slice(0, 4),
                ...(entries.tools ?? []).map((item) => item.path).slice(0, 4),
                ...entries.adapter.map((item) => item.path).filter((rel) => /(^|\/)README\.md$/i.test(rel)),
                ...evidenceFiles(["adapter", "docs"]),
            ]).slice(0, 12),
            confidence: 0.84,
            category: "adapter",
            fact_ids: ["adapter:*"],
        });
    }
    if (hasAnyEntry(["schema"])) {
        const candidate = {
            target: "knowledge/contracts/data-schemas.md",
            reason: "JSON schema contracts detected",
            source_files: evidenceFiles(["schema", "tests"]),
            confidence: 0.88,
            category: "schema",
            fact_ids: ["schema:*"],
        };
        push(contracts, candidate);
        push(integrations, candidate);
    }
    if (hasAnyEntry(["tests", "build"])) {
        const candidate = {
            target: "knowledge/quality/test-and-release.md",
            reason: "test and build assets detected",
            source_files: evidenceFiles(["tests", "build", "docs"]),
            confidence: 0.8,
            category: "quality",
            fact_ids: ["test:*", "package:package.json"],
        };
        push(quality, candidate);
        push(risks, candidate);
    }
    if (has(["proposal", "apply", "review-summary", "human apply"])) {
        push(workflows, {
            target: "knowledge/workflows/proposal-apply-flow.md",
            reason: "proposal and apply workflow evidence detected",
            source_files: evidenceFiles(["cli", "mcp", "tests", "commands", "tools", "docs"]),
            confidence: 0.82,
            category: "governance",
            fact_ids: ["mcp:*", "adapter:*"],
        });
    }
    if (externalEvidence.length) {
        const candidate = {
            target: "knowledge/quality/code-review-graph-evidence.md",
            reason: "external code graph or repo map evidence detected",
            source_files: unique(externalEvidence.map((item) => item.path)).slice(0, 12),
            confidence: Math.max(...externalEvidence.map((item) => item.confidence ?? 0.75)),
            category: "external_evidence",
            fact_ids: ["external_evidence:*"],
        };
        push(quality, candidate);
        push(risks, candidate);
    }
    if (has(["goods", "商品"]))
        push(domains, { target: "knowledge/domains/goods-master.md", reason: "goods domain entry detected", source_files: evidenceFiles(["controller", "service", "docs"]), confidence: 0.72, category: "domain" });
    if (has(["precisionorder", "精准订货"]))
        push(domains, { target: "knowledge/domains/precision-order.md", reason: "precision order entry detected", source_files: evidenceFiles(["controller", "service", "docs"]), confidence: 0.72, category: "domain" });
    if (has(["hddatasync", "hd", "海鼎"]))
        push(workflows, { target: "knowledge/workflows/hd-sync.md", reason: "HD sync entry detected", source_files: evidenceFiles(["tasks", "service", "docs"]), confidence: 0.7, category: "workflow" });
    if (has(["precisionorder", "精准订货"]))
        push(workflows, { target: "knowledge/workflows/precision-order-flow.md", reason: "precision order workflow detected", source_files: evidenceFiles(["controller", "service", "docs"]), confidence: 0.7, category: "workflow" });
    if (has(["mall", "feign", "mq", "remote", "thirdapi"]))
        push(integrations, { target: "knowledge/integrations/external-systems.md", reason: "external integration entry detected", source_files: evidenceFiles(["feign", "mq", "remote", "service", "docs"]), confidence: 0.72, category: "integration" });
    if (has(["datafix", "inner", "thirdapi", "password", "secret", "token", "accesskey"])) {
        const candidate = { target: "knowledge/quality/risk-hotspots.md", reason: "risk-sensitive entry detected", source_files: evidenceFiles(["config", "service", "docs"]), confidence: 0.68, category: "risk" };
        push(quality, candidate);
        push(risks, candidate);
    }
    return { domains, workflows, integrations, risks, contracts, quality };
}
function buildEvidencePlan(candidates) {
    const candidatesByTarget = new Map();
    for (const candidate of Object.values(candidates).flat()) {
        if (!candidatesByTarget.has(candidate.target)) {
            candidatesByTarget.set(candidate.target, candidate);
        }
    }
    return [...candidatesByTarget.values()].map((candidate) => {
        const required = requiredEvidenceTypes(candidate);
        const recommended = unique(candidate.source_files ?? []).slice(0, 12);
        return {
            target: candidate.target,
            candidate_category: candidate.category ?? "unknown",
            recommended_files: recommended,
            required_evidence_types: required,
            reason: candidate.reason,
            missing_evidence: missingEvidenceTypes(required, recommended),
            confidence: candidate.confidence ?? 0.7,
        };
    });
}
function requiredEvidenceTypes(candidate) {
    switch (candidate.category) {
        case "cli":
            return ["cli_entry", "build_config", "tests"];
        case "mcp":
            return ["mcp_entry", "schema", "tests"];
        case "adapter":
            return ["adapter_command", "adapter_tool", "docs"];
        case "schema":
            return ["schema", "tests"];
        case "quality":
            return ["tests", "build_config", "release_docs"];
        case "governance":
            return ["cli_entry", "adapter_command", "tests"];
        case "external_evidence":
            return ["external_evidence", "source_file"];
        case "project":
            return ["readme", "build_config", "docs"];
        default:
            return ["source_file", "tests"];
    }
}
function missingEvidenceTypes(required, files) {
    return required.filter((type) => !files.some((file) => fileMatchesEvidenceType(file, type)));
}
function fileMatchesEvidenceType(file, type) {
    if (type === "readme")
        return /(^|\/)README\.md$/i.test(file);
    if (type === "build_config")
        return /(^|\/)(package\.json|pom\.xml|tsconfig\.json)$/.test(file);
    if (type === "cli_entry")
        return /(^|\/)(index|cli|main)\.[cm]?[jt]s$|bin\//.test(file);
    if (type === "mcp_entry")
        return /(^|\/)(mcp|server)\.[cm]?[jt]s$|Mcp.*\.java$/.test(file);
    if (type === "adapter_command")
        return /\/commands\//.test(file);
    if (type === "adapter_tool")
        return /\/tools\//.test(file);
    if (type === "schema")
        return /^schema\/.*\.json$/.test(file);
    if (type === "tests")
        return /(^|\/)(test|tests|__tests__)\/|\.test\.[cm]?[jt]s$|\.spec\.[cm]?[jt]s$|Test\.java$/.test(file);
    if (type === "docs" || type === "release_docs")
        return /(^|\/)(README|CHANGELOG|CONTRIBUTING|SECURITY|AGENTS)\.md$|^docs\//i.test(file);
    if (type === "source_file" || type === "external_evidence")
        return Boolean(file);
    return false;
}
function externalEvidenceWarnings(repo, items) {
    const warnings = [];
    const head = currentCommit(repo);
    for (const item of items) {
        if (item.path && !existsSync(path.join(repo, item.path))) {
            warnings.push(evidenceWarning(item.path, "external_evidence_missing_path", `external evidence path is missing: ${item.path}`, "Regenerate external evidence from the current repository."));
        }
        if (item.base_commit && head && item.base_commit !== head) {
            warnings.push(evidenceWarning(item.path, "external_evidence_base_commit_differs", "external evidence base_commit differs from current HEAD.", "Regenerate or mark the evidence as intentionally reused."));
        }
        if (item.generated_at) {
            const generatedAt = Date.parse(item.generated_at);
            if (Number.isNaN(generatedAt)) {
                warnings.push(evidenceWarning(item.path, "external_evidence_invalid_generated_at", "external evidence generated_at is not a valid date.", "Use an ISO date-time value."));
            }
            else if (Date.now() - generatedAt > 7 * 24 * 60 * 60 * 1000) {
                warnings.push(evidenceWarning(item.path, "external_evidence_stale", "external evidence is older than 7 days.", "Regenerate evidence before using it for deep knowledge generation."));
            }
        }
    }
    return warnings;
}
function evidenceWarning(pathValue, ruleId, message, suggestion) {
    return { level: "warning", rule_id: ruleId, path: pathValue, message, suggestion };
}
function unique(values) {
    return [...new Set(values.filter(Boolean))];
}
function sensitiveFindings(repo, files) {
    const findings = [];
    const configFiles = files.filter((rel) => isSensitiveConfigCandidate(rel));
    for (const rel of configFiles) {
        const text = read(repo, rel);
        for (const rule of sensitiveRules) {
            if (rule.pattern.test(text)) {
                findings.push({ path: rel, rule_id: rule.rule_id, rule_category: rule.rule_category, action: "redact_value" });
            }
        }
    }
    return findings;
}
function isSensitiveConfigCandidate(rel) {
    return (/(^|\/)(application|bootstrap|config).*\.(ya?ml|properties|json)$/.test(rel) ||
        /(^|\/)\.env(\..*)?$/.test(rel) ||
        /(^|\/)\.npmrc$/.test(rel) ||
        rel.includes("/config/") ||
        /\.(env|ya?ml|properties|json)$/.test(rel));
}
export function gitChangedFiles(repo) {
    return runGit(repo, ["diff", "--name-only"]).split(/\r?\n/).filter(Boolean);
}
