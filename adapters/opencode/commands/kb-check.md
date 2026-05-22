---
description: Check project-atlas knowledge health
---

## Scenario

Use this command before trusting generated knowledge, before review, and before any human terminal apply.

## Input Rules

Call `project_atlas_check` with `format=markdown`.

Check at least these issue groups:

- missing manifest
- missing required files
- missing source metadata
- stale source hashes
- missing source files
- broken relative links
- duplicate topic entries

## Success Result

Return a health summary for the current knowledge base. If the result is not healthy, summarize the blocking issues and tell the user which knowledge files need review.

## Safety Boundary

This command does not create or apply proposals. Do not apply any proposal from OpenCode.
