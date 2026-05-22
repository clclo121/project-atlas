---
description: Show project-atlas knowledge status
---

Call `project_atlas_check` with `format=markdown`.

Then call `project_atlas_review_summary` for the latest proposal.

If review summary reports no proposal, do not treat that as a failure. Tell the user:

```text
当前没有待 review proposal
```

Summarize the current status:

- knowledge health
- blocking health issues
- latest proposal id, if any
- latest proposal apply safety, if any
- whether a human terminal apply is needed

Do not apply any proposal from OpenCode.
