---
description: Read project-atlas context pack
---

## Scenario

Use this command before broad source search. It is the default entry for task context inside OpenCode.

## Input Rules

Call `project_atlas_context`.

Choose the narrowest input that matches the task:

- use `query` when the user describes a topic or feature
- use source file lookup when the user names a concrete source file
- use memory type lookup when the task needs decisions, experience, or project facts

If the result is truncated, narrow the query or ask for a larger budget instead of treating the partial result as complete.

## Success Result

Return the matching knowledge items and cite the returned source paths when you use project knowledge in the answer.

## Safety Boundary

This command is read-only. It does not create or apply proposals.
