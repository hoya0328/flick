# Security policy

Please report suspected vulnerabilities privately through GitHub's security advisory feature. Do not open a public issue containing personal review data, credentials, or reproducible exploit details.

Reports involving row-level security, account isolation, admin authorization, AI prompt data, account deletion, or server-only credentials receive priority.

Dependency maintenance uses `npm ci`, `npm run check`, and `npm run security:audit` (including development tools). CI fails on moderate-or-higher known advisories. Do not disable install scripts or bypass the reviewed decoder compatibility check. See [dependency remediation and limitations](docs/SECURITY_REMEDIATION.md). A clean dependency audit is not a claim of complete application security.
