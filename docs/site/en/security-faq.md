# Security FAQ

## Can An Agent Write The Knowledge Base Directly

No. The Project Atlas adapters and `project-atlas-mcp` do not expose an apply tool.

Agents may:

- `scan`
- `context`
- `stale`
- `propose`
- `remember`
- `check`
- `review-summary`

Agents may not:

- call `project-atlas apply`
- bypass proposals and write `knowledge/**` directly
- run apply in a non-TTY environment

## Why Must Apply Run In A Terminal

`apply` performs the real write to knowledge documents. Project Atlas requires a human to run it with `--confirm` in a terminal so a model cannot change the knowledge base without review.

## How Is Sensitive Content Handled

Configuration scanning reports rule types and file paths, not real values.

If a proposal hits a sensitive rule, its status becomes `blocked_sensitive`, and the sensitive raw value is not saved.

## Is External Evidence Safe

`external_evidence` stores structured summaries from external tools. It does not automatically run Serena, Aider Repo Map, or other graph tools at runtime.

Before importing external evidence, the team still needs to confirm that the JSON file does not contain secrets, tokens, passwords, or customer-sensitive data.

## Does MCP Introduce Write Risk

`project-atlas-mcp` is a local stdio MCP server that exposes safe tools only. It does not expose apply.

If an MCP client supports custom commands, do not register `project-atlas apply` as a model-callable tool there either.

## Does Project Memory Become Personal Memory

No. `remember` reads only the structured candidate JSON you provide and creates a proposal. It does not read chat history and does not write a personal long-term memory store.

Once project memory lands in `knowledge/`, it becomes team-shared content and still goes through Git review.

## Should `.project-atlas/` Be Committed

Usually no. `.project-atlas/proposals/` is a local evidence directory for the current review and manual confirmation flow.

Durable knowledge should live in `knowledge/**` and follow normal version control review.
