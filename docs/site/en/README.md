# Project Atlas Documentation

Project Atlas is a Git-first project knowledge base CLI for open source maintainers, engineering teams, and AI coding agents.

It stores durable project knowledge under `knowledge/`, turns knowledge updates into reviewable proposals, and keeps final writes behind a human terminal confirmation.

Chinese documentation is available at [../README.md](../README.md).

## What To Expect

Project Atlas is useful when you want to:

- give AI agents trusted project context before broad source exploration
- keep stable project knowledge in Git instead of scattered chat history
- review knowledge changes with source evidence and hashes
- capture durable project memory without allowing automatic writes

Its core boundary stays simple:

- agents may read context and create proposals
- agents must not run `project-atlas apply`
- real writes still require a human terminal confirmation

## Start With One Path

Choose the shortest route for your goal:

- Try it now
  Read [Quick Start](quick-start.md)
- Integrate an agent
  Read [Agent Quickstart](agent-quickstart.md)
- Publish this repo
  Read [Publish Now](publish-now.md)

## Documentation Map

- [Quick Start](quick-start.md)
  The shortest path for a first successful run
- [Agent Quickstart](agent-quickstart.md)
  The execution protocol for agent and MCP usage
- [Best Practices](best-practices.md)
  What knowledge to keep, what to leave out, and how to keep it trustworthy
- [Team Rollout](team-rollout.md)
  A practical order for introducing Project Atlas to a team
- [Security FAQ](security-faq.md)
  Why apply is manual and how sensitive evidence is handled
- [Release Process](release-process.md)
  The long-term release policy for this package
- [Publish Now](publish-now.md)
  The current repository-specific release checklist

## Typical Flow

The most common sequence is:

1. run `init` to create the knowledge base skeleton
2. run `context` to read governed project context
3. run `propose` or `remember` to create reviewable updates
4. run `review-summary` before approval
5. let a human run `apply` in a terminal

If you want commands first, start with [Quick Start](quick-start.md).
