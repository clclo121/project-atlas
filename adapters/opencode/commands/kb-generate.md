---
description: Generate first project-atlas knowledge proposal
---

## Scenario

Use this command for the first knowledge generation in a repository that already has a Project Atlas knowledge base.

## Input Rules

Call `project_atlas_scan` with `mode=full` and `reviewDepth=deep`.

If `code-review-graph` or equivalent code graph tooling is available in the current environment, use it before content generation to summarize the repository structure, key nodes, impacted flows, hotspots, and test coverage gaps. Save the useful summary as external evidence when practical, then pass it to `project_atlas_scan` through `externalEvidenceFile`. This is optional enrichment, not a hard dependency. If it is unavailable, continue with `project_atlas_scan` only.

If `knowledge.has_manifest` is false, stop and tell the user to initialize the knowledge base first:

```bash
project-atlas init --repo <repo> --template <generic-service|java-backend|frontend-app>
```

Use `scan.evidence_plan` as the primary evidence reading plan and `scan.review_plan` as the deep review checklist before writing content. Use `scan.facts`, `candidates.source_files`, and optional external evidence to fill gaps in those plans. Read only the source files needed to verify each section. Prefer README files, package/build files, CLI entries, MCP entries, adapter commands/tools, schemas, tests, controller entries, service entries, integration entries, workflow entries, config file names, and files named in `evidence_plan.recommended_files` or `review_plan.recommended_files`. Do not read the whole repository by default.

Generation scope is core + candidates:

- always prepare `knowledge/project/overview.md`
- always prepare `knowledge/glossary.md`
- prepare `knowledge/domains/**` only from scan domain candidates or clear domain entries
- prepare `knowledge/workflows/**` only from scan workflow candidates or clear workflow entries
- prepare `knowledge/integrations/**` only from scan integration candidates or clear integration entries
- prepare `knowledge/quality/**` from scan risk candidates, sensitive findings, or clear quality risks
- prepare `knowledge/contracts/**` from schema, API, DTO, MCP, or protocol candidates with direct evidence
- do not fill `knowledge/decisions/**` without direct evidence

Write high quality Markdown content that matches the `knowledge/` structure:

- pass proposal-level `sourceFiles` with every repo-relative source file used as evidence
- every proposal-level `sourceFiles` entry must be a repo-relative file that was actually used as evidence
- write only facts proven by source files, README files, config file names, or scan output
- do not write generic summaries, marketing text, guesses, or future plans
- do not write secrets, tokens, passwords, access keys, or raw sensitive values
- match each title to the target file responsibility
- each content file should include practical sections such as responsibility, key entry points, key files, and change notes when evidence supports them
- avoid shallow documents. Each non-scaffold content file should include at least two practical sections such as responsibilities, key entry points, key files, contracts, workflows, risks, tests, or change notes
- use concise wording
- keep unknowns out of the knowledge body instead of guessing
- do not write frontmatter. `project_atlas_propose` will add metadata and source hashes

Long Markdown content must use file input. Do not pass long generated Markdown directly as inline tool JSON.

- for multiple files, create a temporary `updates.json` with `source_files` and `updates`, then call `project_atlas_propose` with `updatesFile=<path>`
- when using changed or external impact evidence, include an `update_reason_summary` in `updates.json` that explains why this is a stable knowledge update
- for one file, write the Markdown to a temporary content file, then call `project_atlas_propose` with `target=<knowledge path>`, `contentFile=<path>`, and `sourceFiles=[...]`
- do not pass `sourceFiles` together with `updatesFile`
- when using `updatesFile`, put source evidence under `source_files` inside that JSON file
- temporary files may live under `.project-atlas/tmp/` or the system temp directory
- do not write generated content directly into `knowledge/**`
- inline `updates` are only for short content where JSON arguments stay small and simple

Call `project_atlas_propose` with the generated updates and a reason like:

```text
Generate first Project Atlas knowledge content from full scan evidence
```

## Success Result

Return a new proposal for the first knowledge draft, with evidence and source hashes attached by `project_atlas_propose`.

After proposing, tell the user to inspect `/kb-review`, especially `Quality Score`, `Evidence Plan Coverage`, `Deep Review Coverage`, `Proposed Content Warnings`, and `External Evidence Warnings`.

## Safety Boundary

Do not apply the proposal from OpenCode. Tell the user to review the proposal and run:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
project-atlas apply --repo <repo> --all --confirm
project-atlas apply --repo <repo> --all --confirm --yes-all
```
