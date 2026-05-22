---
name: project-knowledge-base
description: Use when reading, checking, or proposing updates to a project-atlas knowledge base.
---

Use `project-atlas` as the source of truth for project knowledge governance.

Rules:

- Read context with `project-atlas context` or the OpenCode `project_atlas_context` tool.
- Generate evidence with `project-atlas scan`, `project-atlas stale`, and `project-atlas review-summary`.
- Generate proposals with `project-atlas propose` or the OpenCode `project_atlas_propose` tool.
- Generate project memory proposals with `project-atlas remember` or the OpenCode `project_atlas_remember` tool.
- Check knowledge health with `project-atlas check` or the OpenCode `project_atlas_check` tool.
- Review proposal safety with `project-atlas review-summary` or the OpenCode `project_atlas_review_summary` tool.
- Never apply knowledge changes from an agent tool.
- Real writes require a human terminal command with TTY confirmation.
- Do not write secrets, tokens, passwords, or access keys into knowledge files.
