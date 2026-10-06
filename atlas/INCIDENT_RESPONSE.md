# ATLAS – Security Incident Response Plan

Scope: security incidents affecting ATLAS infrastructure, customer data, or
Amazon Selling Partner API (SP-API) credentials/data specifically.

## 1. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| **Incident Commander** (Engineering Lead / CTO) | Owns the incident end-to-end: declares severity, coordinates response, approves external communication, signs off on closure. |
| **Technical Lead** (on-call engineer) | Leads detection/containment/investigation/remediation; executes credential revocation, deploys fixes, restores service. |
| **Security Owner** | Confirms scope, determines whether Amazon SP-API data/credentials were affected, drives Amazon notification and any regulatory/customer notification. |
| **Communications Owner** | Drafts and sends internal, customer, and (with Security Owner) Amazon-facing notifications; keeps the incident timeline. |

One person may hold multiple roles for smaller incidents; for anything
touching Amazon credentials or customer data, Incident Commander and
Security Owner must be different people.

## 2. Lifecycle

1. **Detect** — Triggers: application/error-rate alerts, anomalous audit-log
   entries (`AuditLogsService` flagged/suspicious activity,
   `marketplace-provider-credentials` credential-status changes), failed-login
   spikes, dependency-scan CI failures, external report (including from
   Amazon), or manual discovery.
2. **Contain** — Stop ongoing exposure first: disable/revoke the affected
   marketplace provider credential (`POST /marketplace-provider-credentials/:id/revoke`
   or `/disable`), rotate `ATLAS_CREDENTIAL_KEY` / `JWT_SECRET` /
   `JWT_REFRESH_SECRET` if those may be compromised, disable the affected
   user account, or block the offending IP/traffic pattern.
3. **Investigate** — Establish scope and timeline using the central audit
   ledger (`AuditLogsService` — login, role/permission, and marketplace
   provider/config/credential entries) and application logs. Identify root
   cause, what data/credentials were exposed, and which workspaces/accounts
   were affected.
4. **Remediate** — Fix the root cause (patch, config change, dependency
   upgrade), re-issue any rotated credentials/tokens to legitimate users, and
   verify the fix closes the gap (e.g. re-run the relevant CI dependency
   scan, confirm the guard/policy is enforced).
5. **Recover** — Restore normal operation, confirm monitoring is clean,
   re-enable any temporarily disabled account/credential once safe, and hold
   a post-incident review documenting root cause, impact, and follow-up
   actions with owners and due dates.

## 3. Amazon Notification (SP-API)

If an incident involves unauthorized access to, or disclosure of, Amazon
Information — Amazon Selling Partner API data or credentials (client
secret, refresh token, access token, or data retrieved via SP-API) — the
Security Owner **must email security@amazon.com within 24 hours** of
detecting the incident. This is in addition to, not instead of, any
notification required by ATLAS's SP-API developer agreement.

The notification must include, at minimum:
- Date/time the incident was detected.
- A description of the incident and its scope (what happened).
- Which Amazon Information was or may have been affected (data types,
  affected seller/workspace accounts, approximate record counts if known).
- Containment actions already taken (e.g. credential revocation).
- A point of contact for Amazon's follow-up.

The Communications Owner records the notification (date/time sent, content,
and any Amazon reference/case number) in the incident timeline.

## 4. Review Cadence

This plan, including the roles above and the incident log, is reviewed by
the Incident Commander and Security Owner **at least every 6 months**, and
additionally after any Severity-1 incident. Reviews confirm: role
assignments are current, contact/escalation paths still work, and lessons
from recent incidents have been incorporated.
