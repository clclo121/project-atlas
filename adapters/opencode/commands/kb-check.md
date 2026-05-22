---
description: Check project-atlas knowledge health
---

Call `project_atlas_check` with `format=markdown`.

Use the result to report knowledge health before trusting or applying generated content. Check at least these issue groups:

- missing manifest
- missing required files
- missing source metadata
- stale source hashes
- missing source files
- broken relative links
- duplicate topic entries

If the result is not healthy, summarize the blocking issues and tell the user which knowledge files need review. Do not apply any proposal from OpenCode.
