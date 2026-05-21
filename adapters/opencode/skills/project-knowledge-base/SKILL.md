---
name: project-knowledge-base
description: Use when reading, checking, or proposing updates to a project-kb knowledge base.
---

Use `project-kb` as the source of truth for project knowledge governance.

Rules:

- Read context with `project-kb context` or the OpenCode `project_kb_context` tool.
- Generate evidence with `project-kb scan`, `project-kb stale`, and `project-kb review-summary`.
- Generate proposals with `project-kb propose` or the OpenCode `project_kb_propose` tool.
- Never apply knowledge changes from an agent tool.
- Real writes require a human terminal command with TTY confirmation.
- Do not write secrets, tokens, passwords, or access keys into knowledge files.
