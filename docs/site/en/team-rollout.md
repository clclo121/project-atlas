# Team Rollout

Project Atlas works best when a team starts with one real pilot repository instead of pushing it across every repository at once.

## Step 1: Pick A Pilot Repository

Choose a repository where:

- the team repeats the same explanations often
- the business workflow is relatively stable
- there is already some README, requirement, or development-log material
- real feature work is coming soon

That makes it easier to show value quickly.

## Step 2: Initialize The Knowledge Base

Have a maintainer or project owner run:

```bash
project-atlas init --repo /path/to/repo --template generic-service
```

Use a more specific template for Java backend or frontend repositories:

```bash
project-atlas init --repo /path/to/repo --template java-backend
project-atlas init --repo /path/to/repo --template frontend-app
```

## Step 3: Set Team Rules

Agree on a short set of rules first:

- agents read `project-atlas context` before implementation
- only stable knowledge gets updated after a task
- all knowledge updates go through `project-atlas propose`
- project memory goes through `project-atlas remember`
- reviewers read `project-atlas review-summary` first
- only humans run terminal `apply`

## Step 4: Integrate Agents

The common integration paths are:

- call the `project-atlas` CLI directly
- use `project-atlas-mcp`
- use the example adapters in this repository

No matter which path you use, keep the same boundary:

- agents may read context
- agents may create proposals
- agents may not write the knowledge base directly

## Step 5: Add Fixed Checkpoints

Check the knowledge base at these moments:

- after finishing a feature
- before a release
- before handing the project to a new teammate
- after changing a key API or workflow
- before writing project memory

This command belongs on the team checklist:

```bash
project-atlas check --repo /path/to/repo --format json
```

It helps catch missing sources, stale knowledge, bad links, and duplicate topics before review.

## Step 6: Expand Carefully

Only after the pilot feels stable should you expand to more repositories. Reuse these pieces first:

- one agent onboarding guide
- one reviewer habit
- one release-time checklist
- one development-log convention

The goal is not documentation volume. The goal is faster reuse of trusted knowledge.
