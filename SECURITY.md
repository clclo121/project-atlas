# Security Policy

## Supported Versions

Project Atlas is pre-1.0. Security fixes target the latest published version and the `main` branch.

## Reporting A Vulnerability

Please report security issues through GitHub private vulnerability reporting if it is enabled for this repository.

If private vulnerability reporting is not enabled, open a minimal GitHub issue that does not include exploit details, credentials, proprietary code, or private project data.

## Security Boundaries

Project Atlas is designed around these boundaries:

- Agents may read context.
- Agents may create proposals.
- Agents must not apply proposals.
- MCP and adapter integrations must not expose an apply tool.
- `project-atlas apply` requires human terminal confirmation.
- Local proposal evidence under `.project-atlas/` should not be committed.

## Sensitive Data

Project Atlas can scan project files and generate knowledge proposals. Users should review generated proposal content before applying it.

Do not store secrets in `knowledge/`. If sensitive data is detected in a proposal, reject the proposal and replace it with a redacted summary.
