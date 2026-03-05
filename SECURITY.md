# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in ThirdEye, **please do not open a public issue.**

Instead, report it privately via [GitHub Security Advisories](https://github.com/jakduch/thirdeye/security/advisories/new).

You can expect:

- An acknowledgement within **48 hours**.
- A follow-up with an assessment and timeline within **7 days**.
- A fix released as a patch version as soon as practical.

## Scope

ThirdEye is a desktop client that communicates exclusively with the GitHub API using a user-provided Personal Access Token (PAT). The token is stored locally via [electron-store](https://github.com/sindresorhus/electron-store) and is never transmitted to any server other than `api.github.com`.

Areas of particular interest:

- Token storage and handling
- IPC channel security between main and renderer processes
- Dependency vulnerabilities

## Best Practices for Users

- Use a PAT with the **minimum required scopes** (`repo`, `notifications`).
- Regenerate your token periodically.
- Keep ThirdEye updated to the latest version.
