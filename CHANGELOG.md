# Changelog

## Unreleased

## 0.1.4 - 2026-06-08

- Added a public scan result schema with enriched candidate metadata and new `contracts` and `quality` candidate groups while keeping legacy candidate groups compatible.
- Expanded `scan` discovery for TypeScript CLI, MCP, adapters, schemas, docs, tests, build files, external evidence, and sensitive config rules.
- Added proposal content quality warnings for shallow documents, weak evidence, and missing practical sections.
- Added a `code-review-graph` external evidence example and updated agent/OpenCode documentation for evidence-driven knowledge generation.
- Added `scan --format json`, external evidence sensitive-content rejection, per-update proposal evidence, and conservative review-summary apply safety for proposed content warnings.
- Added scan `facts` and `evidence_plan`, proposal `evidence_plan_summary` and `quality_score`, and external evidence freshness warnings.
- Added `scan --review-depth deep`, scan `review_plan`, proposal `coverage_score` and `update_reason_summary`, and review-summary Deep Review Coverage apply gating.

## 0.1.3 - 2026-05-22

- Consolidated the OpenCode-facing docs into a clearer product entry with aligned site navigation and onboarding copy.
- Added a scripted npm release flow with preflight checks, publish validation, tag handling, and local install smoke tests.
- Expanded release documentation and test coverage for scripted publishing and package governance.

## 0.1.2 - 2026-05-22

- Added a fuller OpenCode adapter surface with check, remember, review-summary, generate, and status command flows.
- Added shared OpenCode adapter helpers for command execution and review-summary output formatting.
- Extended OpenCode adapter documentation, skills, and development logs for the productized command set.
- Expanded automated test coverage for the OpenCode adapter commands and safe entrypoints.

## 0.1.1 - 2026-05-22

- Reworked the documentation into a bilingual product-style landing experience across the root README, site homepages, quick start guides, agent onboarding guides, and publish-now guides.
- Added matching development-log notes for the documentation restructuring and style follow-up work.

## 0.1.0 - 2026-05-22

- Fixed proposal freshness checks so `apply` blocks when the base commit or source file hashes changed after proposal creation.
- Added proposal-level `source_hashes` snapshots to the public proposal schema.
- Fixed `review-summary` apply safety so missing source and missing metadata in non-scaffold knowledge documents block apply.
- Included `docs/site` in the npm package because README links to the documentation site.
- Simplified `npm run verify` to avoid running the build step twice.
- Added project memory proposal generation through `project-atlas remember`.
- Added `project-atlas check` for knowledge health checks.
- Added context filters and JSON metadata for project memory documents.
- Added MCP tools for remember and check without changing the terminal apply boundary.
- Added `schema/memory-candidate.schema.json`.
- Hardened memory and proposal inputs by rejecting unsafe source paths, frontmatter line breaks, duplicate targets, and boolean flag values.
- Rewrote README in Chinese and added a concrete npm publishing guide.
- Renamed the project, package, CLI, MCP server, adapter tools, and local evidence directory to Project Atlas.
- Added bilingual documentation entry points and agent-first quick onboarding docs.
- Added the first `project-atlas` CLI with `init`, `scan`, `context`, `stale`, `propose`, `apply`, `review-summary`, `cleanup`, and `hash`.
- Added Git-first knowledge layout under `knowledge/` and local proposal evidence under `.project-atlas/proposals/`.
- Added interactive TTY-only `apply` flow for generated knowledge changes.
- Added OpenCode adapter examples for scan, context, and proposal generation without an apply tool.
- Added JSON Schemas for manifest, proposal, trigger result, and context pack outputs.
- Added context source lookup, multi-keyword query, stale suggestions, review summary safety sections, and init templates.
- Added optional external evidence import for scan and proposal review.
- Added local stdio MCP server and Claude Code, Cursor, and Continue adapter docs without model-callable apply.
- Added Markdown documentation site, GitHub Actions CI, and release governance notes.
- Updated the supported Node.js engine to `>=22`.
