# FLICK project instructions

## Workflow triggers

- `서비스 기획`: update the product problem, MVP, priorities, metrics, and durable planning docs.
- `서비스 세팅`: execute the complete audit, safe repair, and focused verification flow.
- `서비스 설계`: define flows, architecture, data, permissions, APIs, responsive UX, visual rules, and deployment shape before implementation.
- `기능 개발: <기능명>`: implement and validate only the named feature against approved plans.
- `릴리스 점검`: run the release quality gate; do not deploy unless publication is requested.
- `운영 점검`: review live evidence, costs, reliability, feedback, and priorities.

## Product boundaries

- Keep FLICK fully independent from Focus Quest.
- Preserve the `발견 → 감상 → 기록 → 회고 → 재발견` product loop.
- Treat Light and Core as selectable recording modes.
- AI may guide questions, organize keywords, and draft text, but the user must review before saving or publishing.
- Keep private recording as the default; public community features are post-MVP unless a later decision changes scope.
- Keep the MVP taste report as a core payoff, not a decorative dashboard.

## Engineering and safety

- Preserve TypeScript, React Native, Expo, Expo Router, npm, and Supabase unless an architecture change is explicitly approved.
- Keep one shared iOS, web, and Android codebase; allow platform-specific files only for real platform differences.
- Inspect `git status --short` before edits and preserve unrelated work and history.
- Never commit secrets, local environment files, dependencies, caches, builds, logs, or archives.
- Preserve deployment IDs exactly if hosting metadata is added later.
- Match validation to risk; setup-only work requires JSON parsing, workspace checks, Git diff/status, and focused configuration checks.
- A user request to develop or continue developing FLICK includes focused validation, GitHub push, and deployment to the existing EAS Hosting `beta` alias unless the user explicitly excludes publication.
- Never create or switch a deployment target implicitly. Stop and report before any paid deployment requirement or when the authorized existing target is unavailable.

## Continuity

- Record durable product facts in `docs/PROJECT_CONTEXT.md`.
- Record material choices in `docs/DECISIONS.md` and the next action in `docs/HANDOFF.md`.
- Use `FLICK.code-workspace` as the named VS Code entry point.
