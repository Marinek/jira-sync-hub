## Context

The application bridges an external Jira instance (source) with an internal Jira instance (target). All HTTP calls to both Jira instances are made server-side via `src/lib/jira-server.ts`, using a single `fetchJira()` helper that always sends `Authorization: Bearer <PAT>`.

Jira Cloud requires **HTTP Basic Auth** (`Authorization: Basic base64(email:apiToken)`) instead of Bearer. This is a mandatory difference; Cloud rejects Bearer tokens from user accounts (only app tokens support Bearer on Cloud).

The internal Jira instance is assumed to always be a Data Center / Server deployment (PAT). Only the **external** instance needs Cloud support.

## Goals / Non-Goals

**Goals:**
- Allow users to configure the external Jira as either `server` (PAT/Bearer) or `cloud` (email + API token / Basic Auth).
- Persist the instance type and email alongside existing credentials in `localStorage`.
- Route the correct `Authorization` header in all server-side `fetchJira` calls for the external instance.
- Provide clear UI labeling and help text for both options in the settings modal.

**Non-Goals:**
- Supporting Jira Cloud for the **internal** instance.
- OAuth / App-link authentication flows.
- Automatic detection of the instance type from the URL.
- Changes to internal Jira API behavior or endpoints.

## Decisions

### Decision 1: Extend `JiraConfig` with `instanceType` and `email`

**Choice:** Add optional `instanceType: "server" | "cloud"` and optional `email: string` to the existing `JiraConfig` type.

**Rationale:** This is the minimal-invasive change. All call sites already pass a `JiraConfig` object, so adding optional fields avoids breaking any existing code. `instanceType` defaults to `"server"` when absent (backward-compatible).

**Alternative considered:** A separate `JiraCloudConfig` type with a discriminated union. Rejected because it would require wider refactoring at every call site for a simple auth swap.

---

### Decision 2: Centralize auth header construction in `fetchJira`

**Choice:** Modify `fetchJira` to accept a `JiraConfig` (instead of separate `url` + `pat` strings) and derive the `Authorization` header internally:
- `server` → `Bearer <pat>`
- `cloud` → `Basic base64(<email>:<pat>)` (where `pat` is the API token)

**Rationale:** All Jira HTTP calls go through `fetchJira`. One change point eliminates the risk of missing a call site.

**Alternative considered:** Passing a pre-computed `authHeader` string to `fetchJira`. Rejected because it leaks auth-scheme knowledge to every caller.

---

### Decision 3: Conditional settings UI (radio group + conditional email field)

**Choice:** In `SettingsModal`, add a radio group (`Server / Data Center` | `Cloud`) for the external instance. When `cloud` is selected, show an additional "Email" input field below the existing URL/Token fields. The existing "PAT / Token" label becomes "API Token" for Cloud.

**Rationale:** Minimal UI change. The email field is only relevant for Cloud, so hiding it for Server avoids confusion.

**Alternative considered:** Always showing the email field. Rejected to keep the Server form unchanged.

## Risks / Trade-offs

- **Base64 encoding in server context:** `btoa()` is available in Bun's server runtime; no additional library needed. Risk is low.
- **Credential storage in `localStorage`:** Email is a non-secret piece of information. The API token is already stored as plain text (same as the existing PAT). No new security exposure is introduced.
- **Backward compatibility:** Existing configurations without `instanceType` must silently default to `"server"` so that no user loses their saved config.

## Migration Plan

1. Deploy updated code — no database schema changes.
2. Existing `localStorage` configs without `instanceType` are treated as `"server"` automatically.
3. No rollback needed: the new fields are purely additive and ignored by older code if reverted.

## Open Questions

- Should the internal Jira instance eventually support Cloud too? Currently out of scope but the same pattern applies if needed.
