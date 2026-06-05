---
description: Generate project-atlas update proposal
---

## Scenario

Use this command when the repository already has knowledge and changed source files may require a stable knowledge update.

## Input Rules

Call `project_atlas_scan` with `mode=changed` and `reviewDepth=deep`.

If `code-review-graph` or equivalent code graph tooling is available, use it to inspect changed files, impact radius, affected flows, hotspots, and missing tests before writing content. Save useful results as external evidence when practical, then pass them to `project_atlas_scan` through `externalEvidenceFile`. This is optional enrichment, not a hard dependency. If unavailable, continue with `project_atlas_scan` only.

Use the changed files, `scan.evidence_plan`, `scan.review_plan`, scan candidates, scan facts, and optional external evidence to decide whether stable knowledge changed. Treat `scan.evidence_plan` as the primary evidence reading plan and `scan.review_plan` as the impact and gap checklist. Only add nearby evidence when the plan has gaps. If there are no stable knowledge changes, stop and tell the user:

```text
No stable knowledge changes found.
```

When stable knowledge did change, read only the changed source files and nearby files needed to verify the update. Prefer files named in `candidates.source_files`, affected flow evidence, related tests, schemas, adapter commands/tools, and configs. Do not read the whole repository by default.

Before proposing, write a short `update_reason_summary` for `updates.json`. It must explain the stable knowledge delta using changed files, existing `source_files`, evidence plan coverage, and external impact radius when available. Do not propose updates for local refactors, formatting-only changes, speculative risks, or one-off implementation details unless they change a durable contract, workflow, boundary, risk, or review rule.

Create the proposal through `project_atlas_propose`.

Long Markdown content must use file input. Do not pass long generated Markdown directly as inline tool JSON.

- for multiple files, create a temporary `updates.json` with `source_files`, `update_reason_summary`, and `updates`, then call `project_atlas_propose` with `updatesFile=<path>`
- for one file, write the Markdown to a temporary content file, then call `project_atlas_propose` with `target=<knowledge path>`, `contentFile=<path>`, and `sourceFiles=[...]`
- do not pass `sourceFiles` together with `updatesFile`
- when using `updatesFile`, put source evidence under `source_files` inside that JSON file
- temporary files may live under `.project-atlas/tmp/` or the system temp directory
- do not write generated content directly into `knowledge/**`
- inline `updates` are only for short content where JSON arguments stay small and simple

Quality rules:

- pass proposal-level `sourceFiles` with every repo-relative source file used as evidence
- write only facts proven by changed source files, README files, config file names, or scan output
- do not write generic summaries, marketing text, guesses, or future plans
- do not write secrets, tokens, passwords, access keys, or raw sensitive values
- match each target under `knowledge/**` to the content responsibility
- avoid shallow documents. Each non-scaffold content file should include at least two practical sections such as responsibilities, key entry points, key files, contracts, workflows, risks, tests, or change notes
- do not write frontmatter. `project_atlas_propose` will add metadata and source hashes

## Success Result

Return an incremental knowledge proposal that only covers stable changes proven by the current diff and nearby evidence.

After proposing, tell the user to inspect `/kb-review`, especially `Quality Score`, `Evidence Plan Coverage`, `Deep Review Coverage`, `Proposed Content Warnings`, and `External Evidence Warnings`.

## Safety Boundary

Do not apply the proposal from OpenCode. Tell the user to run:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
project-atlas apply --repo <repo> --all --confirm
project-atlas apply --repo <repo> --all --confirm --yes-all
```
