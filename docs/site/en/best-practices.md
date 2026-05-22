# Best Practices

Project Atlas works best for stable, verifiable knowledge that will be reused across tasks. It is not meant to dump a full repository scan into one long document.

## What To Keep

Prefer these kinds of knowledge:

- project positioning, module boundaries, and directory responsibilities
- business terms and the real meaning of key pages, APIs, and jobs
- stable workflows such as ordering, payment, review, or synchronization
- external contracts such as APIs, MQ topics, file formats, and config constraints
- risk points such as sensitive configuration, manual steps, and migration assumptions
- confirmed technical or business decisions
- verified project memory with durable reuse value

## What Not To Keep

Do not store these as governed knowledge:

- temporary debugging notes
- unverified guesses
- large copied source blocks
- outdated design drafts
- secrets, tokens, passwords, or real sensitive values
- personal preferences with no project-wide value

## Keep Sources Clear

Each knowledge document should point back to source files. A practical priority order is:

1. README files, requirement docs, and release notes
2. OpenSpec or other formal specs
3. key source entry points and config examples
4. confirmed development logs and review conclusions

`source_files` and `source_hashes` are not decoration. They are what allow `stale` to detect outdated knowledge.

## How To Use Project Memory

Project memory fits three types:

- `decision`
  confirmed choices that later work should follow
- `experience`
  reusable lessons from completed work
- `project_fact`
  stable, objective project facts

Project memory also needs evidence. Good sources include README files, development logs, formal specs, key code entry points, and review conclusions.

Do not turn chat transcripts, guesses, or unverified summaries into project memory.

## Choose The Right Directory

Put knowledge in the nearest matching area:

- decisions in `knowledge/decisions/`
- overall project background in `knowledge/project/`
- business facts in `knowledge/domains/`
- process descriptions in `knowledge/workflows/`
- contract and integration notes in `knowledge/contracts/` or `knowledge/integrations/`
- quality rules and troubleshooting lessons in `knowledge/quality/`

## A Simple Update Rhythm

The recommended rhythm is:

1. read `context` before starting a task
2. decide whether durable knowledge changed
3. create `propose` or `remember` only when needed
4. let reviewers read `review-summary` first
5. let a human run `apply`

For cross-module work, pre-release checks, and handoffs, also run:

```bash
project-atlas check --repo /path/to/repo --format json
project-atlas stale --repo /path/to/repo
```

## Advice For Agents

Agents should not start with a full repository search. Read context first:

```bash
project-atlas context --repo /path/to/repo --query "<task topic>" --budget 8000 --format json
```

If the task changed durable project knowledge, create a proposal:

```bash
project-atlas propose --repo /path/to/repo --updates-file updates.json --reason "refresh project knowledge"
```

The goal is not to produce more documents. The goal is to make reusable project knowledge more trustworthy.
