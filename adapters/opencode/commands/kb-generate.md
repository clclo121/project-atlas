---
description: Generate first project-atlas knowledge proposal
---

## Scenario

Use this command for the first knowledge generation in a repository that already has a Project Atlas knowledge base.

## Input Rules

Call `project_atlas_scan` with `mode=full`.

If `knowledge.has_manifest` is false, stop and tell the user to initialize the knowledge base first:

```bash
project-atlas init --repo <repo> --template <generic-service|java-backend|frontend-app>
```

Use the scan result to generate first knowledge content. Read only the source files needed to verify each section. Prefer README files, build files, controller entries, service entries, integration entries, workflow entries, config file names, and files named in `candidates`. Do not read the whole repository by default.

Generation scope is core + candidates:

- always prepare `knowledge/project/overview.md`
- always prepare `knowledge/glossary.md`
- prepare `knowledge/domains/**` only from scan domain candidates or clear domain entries
- prepare `knowledge/workflows/**` only from scan workflow candidates or clear workflow entries
- prepare `knowledge/integrations/**` only from scan integration candidates or clear integration entries
- prepare `knowledge/quality/**` from scan risk candidates, sensitive findings, or clear quality risks
- do not fill `knowledge/contracts/**` or `knowledge/decisions/**` without direct evidence

Write high quality Markdown content that matches the `knowledge/` structure:

- pass proposal-level `sourceFiles` with every repo-relative source file used as evidence
- every proposal-level `sourceFiles` entry must be a repo-relative file that was actually used as evidence
- write only facts proven by source files, README files, config file names, or scan output
- do not write generic summaries, marketing text, guesses, or future plans
- do not write secrets, tokens, passwords, access keys, or raw sensitive values
- match each title to the target file responsibility
- each content file should include practical sections such as responsibility, key entry points, key files, and change notes when evidence supports them
- use concise wording
- keep unknowns out of the knowledge body instead of guessing
- do not write frontmatter. `project_atlas_propose` will add metadata and source hashes

Long Markdown content must use file input. Do not pass long generated Markdown directly as inline tool JSON.

- for multiple files, create a temporary `updates.json` with `source_files` and `updates`, then call `project_atlas_propose` with `updatesFile=<path>`
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

## Safety Boundary

Do not apply the proposal from OpenCode. Tell the user to review the proposal and run:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
project-atlas apply --repo <repo> --all --confirm
project-atlas apply --repo <repo> --all --confirm --yes-all
```
