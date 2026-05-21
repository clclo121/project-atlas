# Changelog

## Unreleased

- Fixed proposal freshness checks so `apply` blocks when the base commit or source file hashes changed after proposal creation.
- Added proposal-level `source_hashes` snapshots to the public proposal schema.
- Fixed `review-summary` apply safety so missing source and missing metadata in non-scaffold knowledge documents block apply.
- Included `docs/site` in the npm package because README links to the documentation site.
- Simplified `npm run verify` to avoid running the build step twice.
- Added project memory proposal generation through `project-kb remember`.
- Added `project-kb check` for knowledge health checks.
- Added context filters and JSON metadata for project memory documents.
- Added MCP tools for remember and check without changing the terminal apply boundary.
- Added `schema/memory-candidate.schema.json`.

## 0.1.0

- Added the first `project-kb` CLI with `init`, `scan`, `context`, `stale`, `propose`, `apply`, `review-summary`, `cleanup`, and `hash`.
- Added Git-first knowledge layout under `knowledge/` and local proposal evidence under `.project-kb/proposals/`.
- Added interactive TTY-only `apply` flow for generated knowledge changes.
- Added OpenCode adapter examples for scan, context, and proposal generation without an apply tool.
- Added JSON Schemas for manifest, proposal, trigger result, and context pack outputs.
- Added context source lookup, multi-keyword query, stale suggestions, review summary safety sections, and init templates.
- Added optional external evidence import for scan and proposal review.
- Added local stdio MCP server and Claude Code, Cursor, and Continue adapter docs without model-callable apply.
- Added Markdown documentation site, GitHub Actions CI, and release governance notes.
- Updated the supported Node.js engine to `>=22`.
