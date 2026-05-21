# Changelog

## 0.1.0

- Added the first `project-kb` CLI with `init`, `scan`, `context`, `stale`, `propose`, `apply`, `review-summary`, `cleanup`, and `hash`.
- Added Git-first knowledge layout under `knowledge/` and local proposal evidence under `.project-kb/proposals/`.
- Added interactive TTY-only `apply` flow for generated knowledge changes.
- Added OpenCode adapter examples for scan, context, and proposal generation without an apply tool.
- Added JSON Schemas for manifest, proposal, trigger result, and context pack outputs.
- Added context source lookup, multi-keyword query, stale suggestions, review summary safety sections, and init templates.
- Added optional external evidence import for scan and proposal review.
- Added local stdio MCP server and Claude Code, Cursor, and Continue adapter docs without model-callable apply.
