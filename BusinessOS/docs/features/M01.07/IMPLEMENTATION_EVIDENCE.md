# M01.07 implementation evidence

| Area | Delivery |
|---|---|
| Trace and risk | Master section 20, SEC-002/SEC-003 and G-01. High risk. Roni paul approved the design on 24 November 2026. [Approval record](APPROVAL.md) · [Work item](../../../prompts/CommerceOS_v3_3_General_BusinessOS_Execution_Pack/prompts/M01/M01.07.md) |
| Bootstrap and configuration | `createProtectedApi` validates declaration of protected mode and loads the required key material before creating the Nest application. The entry point for the unconfigured shell refuses protected settings without the injected adapters. [API composition](../../../apps/api/src/create-api.ts) · [Config loader](../../../apps/api/src/security/config.ts) |
| Identity and isolation | The provider adapter verifies credential integrity and the base checks issuer, audience, transport, purpose, time and assurance. Session authority binds the provider subject to an active application subject. Membership authority supplies tenant membership. Existing scoped authorization still checks operation, tenant and branch. [Protected authentication](../../../apps/api/src/security/protected.ts) |
| Secret lifecycle | The secret store reads only configured verification references for the tenant-session purpose. Rotation validates a complete candidate before selecting it. The request checks authoritative key status and rechecks the selected version before admission. Failed refresh may retain a still-authorized snapshot. [Secret interface and rotation](../../../apps/api/src/security/protected.ts) |
| HTTP protection | Existing identity routes use bearer authentication. Cookie admission requires an explicitly marked route and HTTPS. Unsafe cookie requests require an exact configured Origin and a session-bound CSRF token. Headers apply before routing and body parsing. [HTTP policy](../../../apps/api/src/security/http.ts) |
| Logging and CI | Security logs emit an allowlisted result, server-generated correlation and duration. Gitleaks 8.30.1 scans the BusinessOS source snapshot in PR CI and requires a redacted generated positive control. [Log projection](../../../apps/api/src/security/policy.ts) · [Scan runner](../../../scripts/security/scan-secrets.mjs) · [CI workflow](../../../../.github/workflows/businessos-m0107-security.yml) |
| DB, API and UI impact | Existing HTTP contracts and the M01.05 API context are used by this infrastructure. New routes, OpenAPI client generation, database schema, external events and UI are `NOT_APPLICABLE`. |
| Release controls | Live provider, enrollment, recovery, workload identity and privileged policy decisions remain with their G-01 owners. Hosted CI and independent security review are pending before merge. [Verification](VERIFICATION.md) |

## Configuration contract

| Setting | Accepted values or default |
|---|---|
| `BUSINESSOS_AUTH_MODE` | `shell` by default. `protected` requires the explicit API composition root and adapters. Unexpected `BUSINESSOS_AUTH_*` fields and partial protected configuration fail startup. |
| `BUSINESSOS_AUTH_ISSUER`, `BUSINESSOS_AUTH_AUDIENCE` | Required HTTPS issuer and exact tenant-session audience. The issuer excludes credentials, query and fragment fields. |
| `BUSINESSOS_AUTH_TRANSPORT` | `bearer` or `bearer-with-cookie`. Cookie routes require `CookieAuth` metadata. Existing bearer routes continue to select bearer. |
| `BUSINESSOS_AUTH_HTTPS` | `required` for protected deployments. `loopback-test` allows bearer on loopback when `NODE_ENV=test`. Cookie requests require HTTPS in both settings. |
| `BUSINESSOS_AUTH_BROWSER_ORIGINS`, `BUSINESSOS_AUTH_TRUSTED_PROXIES` | Up to 16 comma-separated exact HTTPS origins for cookie admission, and up to 16 explicitly trusted immediate proxy IP addresses. Trusted proxies must set one authoritative `X-Forwarded-Proto` value. |
| `BUSINESSOS_AUTH_CURRENT_REF` | Required opaque server-side reference. The store returns versioned material between 32 and 8192 bytes and its validity cutoff. |
| `BUSINESSOS_AUTH_PREVIOUS_REF`, `BUSINESSOS_AUTH_PREVIOUS_UNTIL` | Optional distinct reference and epoch-second cutoff. Configure both together. The future overlap is capped at ten minutes. |
| `BUSINESSOS_AUTH_VERIFY_MS`, `BUSINESSOS_AUTH_MAX_TOKEN_SECONDS`, `BUSINESSOS_AUTH_MIN_ASSURANCE` | Request and secret lookup budget defaults to 1000 ms within 50–2000 ms. Token lifetime ceiling defaults to 900 seconds with a maximum of 3600. Assurance defaults to `standard` and also supports `elevated`, which both the credential and session must satisfy. |

The cookie helper serializes a session-only `__Host-businessos-session` cookie with Secure, HttpOnly, Path=/ and SameSite=Lax. The browser fixture uses an authoritative SHA-256 digest of a per-session random token and sends the corresponding proof in `X-CSRF-Token`. Credentialed cross-origin access requires a separate policy. HSTS applies to trusted HTTPS in required mode, with a one-year max age. The existing transport response correlation and the generated security log correlation are separate. [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

## Reproduce and recover

```powershell
pnpm.cmd --filter businessos --filter @businessos/api... install --frozen-lockfile
pnpm.cmd --filter @businessos/api test:auth
node --test tests/security/http.test.mjs tests/contracts/http.test.mjs infra/local/host-smoke.test.mjs
node scripts/security/scan-secrets.mjs
```

Set `GITLEAKS_BIN` to a checksum-verified version 8.30.1 binary when it is outside PATH. The script checks the version, scans the checked-out tracked and unignored source snapshot against stock rules, detects a randomly generated positive control, and suppresses raw scanner output in both cases. [Pinned Gitleaks release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)

To recover from a failed rotation, retain the last valid and authorized snapshot, correct the staged material and refresh from the trusted host. Maintain authoritative session and key revocations during code rollback. A credential whose version or session was revoked stays denied. Stop serving protected traffic when the verification dependencies cannot supply a trustworthy result. No data migration is required.
