---
description: Generate first project-atlas knowledge proposal
---

Call `project_atlas_scan` with `mode=full`.

If `knowledge.has_manifest` is false, stop. Tell the user to initialize the knowledge base first:

```bash
project-atlas init --repo <repo> --template <generic-service|java-backend|frontend-app>
```

Use the scan result to generate first knowledge content. Read only the source files needed to verify each section. Prefer README files, build files, controller entries, service entries, integration entries, workflow entries, config file names, and files named in `candidates`. Do not read the whole repository by default.

Generation scope is core + candidates:

- Always prepare `knowledge/project/overview.md`.
- Always prepare `knowledge/glossary.md`.
- Prepare `knowledge/domains/**` only from scan domain candidates or clear domain entries.
- Prepare `knowledge/workflows/**` only from scan workflow candidates or clear workflow entries.
- Prepare `knowledge/integrations/**` only from scan integration candidates or clear integration entries.
- Prepare `knowledge/quality/**` from scan risk candidates, sensitive findings, or clear quality risks.
- Do not fill `knowledge/contracts/**` or `knowledge/decisions/**` without direct evidence.

Write high quality Markdown content that matches the `knowledge/` structure:

- Each update must include `target` and `content` when calling `project_atlas_propose`.
- Pass proposal-level `sourceFiles` with every repo-relative source file used as evidence.
- Every proposal-level `sourceFiles` entry must be a repo-relative file that was actually used as evidence.
- Write only facts proven by source files, README files, config file names, or scan output.
- Do not write generic summaries, marketing text, guesses, or future plans.
- Do not write secrets, tokens, passwords, access keys, or raw sensitive values.
- Match each title to the target file responsibility.
- Each content file should include practical sections such as responsibility, key entry points, key files, and change notes when evidence supports them.
- Use concise wording. Keep unknowns out of the knowledge body instead of guessing.
- Do not write frontmatter. `project_atlas_propose` will add metadata and source hashes.

Call `project_atlas_propose` with the generated updates and a reason like:

```text
Generate first Project Atlas knowledge content from full scan evidence
```

Do not apply the proposal from OpenCode. Tell the user to review the proposal and run:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
```
