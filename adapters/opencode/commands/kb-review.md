---
description: Review latest project-atlas proposal
---

## Scenario

Use this command right after proposal creation or when the user asks whether the latest proposal is safe to apply.

## Input Rules

Call `project_atlas_review_summary`.

Use the latest proposal by default. If the user provides a proposal id, pass it to `project_atlas_review_summary`.

If there is no latest proposal, do not treat that as a broken knowledge base. Tell the user:

```text
No proposal is waiting for review.
```

## Success Result

Summarize the review result for the user:

- proposal id
- proposal status
- source files
- target files
- dry-run summary
- stale status
- review decision
- apply safety

## Safety Boundary

Do not apply the proposal from OpenCode. Tell the user that a human must review the summary and run:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
project-atlas apply --repo <repo> --all --confirm
project-atlas apply --repo <repo> --all --confirm --yes-all
```
