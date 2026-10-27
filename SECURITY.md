# Security policy

Please report suspected vulnerabilities privately through GitHub's security advisory feature. Do not open a public issue containing personal review data, credentials, or reproducible exploit details.

Reports involving row-level security, account isolation, admin authorization, AI prompt data, account deletion, or server-only credentials receive priority.

Credentials must remain outside Git and client bundles. See [key locations and secret publication guards](docs/SECRETS_MANAGEMENT.md). Run `npm run security:secrets` before committing, and enable the repository's reviewed `.githooks` for local staged/history checks. Public Supabase publishable/anon identifiers are not server secrets; authorization remains enforced by Auth/RLS/server checks. Suspected exposed server credentials must be revoked, not merely deleted from the latest commit.

Public-key-only and cross-account authorization must also be tested separately. See [live anonymous HTTP and rollback-only record isolation QA](docs/ACCOUNT_ISOLATION_QA.md), including positive owner controls, intended public reads, privileged RPC denial and storage boundaries. DB role tests are not described as two-user end-to-end browser authentication.

Dependency maintenance uses `npm ci`, `npm run check`, and `npm run security:audit` (including development tools). CI fails on moderate-or-higher known advisories. Do not disable install scripts or bypass the reviewed decoder compatibility check. See [dependency remediation and limitations](docs/SECURITY_REMEDIATION.md). A clean dependency audit is not a claim of complete application security.
