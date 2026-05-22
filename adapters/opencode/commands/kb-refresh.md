---
description: Generate project-atlas update proposal
---

Call `project_atlas_scan` with `mode=changed`. If the scan shows stable project knowledge changed, create a proposal through `project_atlas_propose`.

Do not apply the proposal from OpenCode. Tell the user to run:

```bash
project-atlas apply --repo <repo> --proposal-id <id> --confirm
```
