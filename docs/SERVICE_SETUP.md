# SERVICE SETUP

## Baseline

- Project root: `C:\Users\letsh\Documents\Click`
- Workspace label: `FLICK`
- Relationship: fully independent from Focus Quest
- Git branch: `main`
- Application stack: intentionally unresolved until `서비스 설계`
- Hosting metadata: none; no deployment was created
- VS Code entry: `FLICK.code-workspace`
- Codex extension: `openai.chatgpt`

## Track and ignore policy

Track product docs, source, tests, public assets, lockfiles, CI, and future required hosting metadata. Ignore secrets, local environment files, dependencies, virtual environments, caches, generated builds, coverage, logs, temporary files, and archives.

## Verification checklist

- Git repository and branch exist
- `.gitignore` covers secret and generated content
- workspace and VS Code settings parse as JSON
- workspace folder display name is `FLICK`
- generated clutter is hidden, not deleted
- root `AGENTS.md` contains project-specific operating rules
- official Codex extension is installed
- no hosting ID or external remote was created
- Git whitespace and status checks pass

## Next stage

Run `서비스 설계` to decide the initial platform, application architecture, data ownership, movie data provider boundary, AI processing flow, privacy model, responsive UX, and deployment shape.
