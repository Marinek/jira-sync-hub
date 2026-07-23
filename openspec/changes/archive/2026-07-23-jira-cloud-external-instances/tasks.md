## 1. Types & Core Auth

- [x] 1.1 Extend `JiraConfig` in `src/lib/jira-types.ts` with optional `instanceType: "server" | "cloud"` and optional `email: string` fields
- [x] 1.2 Refactor `fetchJira` in `src/lib/jira-server.ts` to accept a full `JiraConfig` object instead of separate `url` + `pat` parameters
- [x] 1.3 Implement auth header logic in `fetchJira`: `Bearer <pat>` for `server`, `Basic base64(<email>:<pat>)` for `cloud` (use `btoa`)
- [x] 1.4 Update all existing callers of `fetchJira` in `src/lib/jira-server.ts` to pass the full `JiraConfig` object

## 2. Hook & State

- [x] 2.1 Extend `useJiraConfig` in `src/hooks/useJiraConfig.ts` to read and write `instanceType` and `email` for the external Jira config
- [x] 2.2 Ensure backward-compat: when loading from `localStorage`, default `instanceType` to `"server"` if the field is absent

## 3. Settings UI

- [x] 3.1 Add a radio group (or select) for "Instance Type: Server / Data Center | Cloud" to the external Jira section in `src/components/SettingsModal.tsx`
- [x] 3.2 Conditionally render an "Email" input field below the URL field when `cloud` is selected
- [x] 3.3 Update the PAT label to "Personal Access Token" for `server` and "API Token" for `cloud`
- [x] 3.4 Wire the new fields to the config state and include them in the Save action

## 4. Validation & Testing

- [x] 4.1 Ensure the Save button validates that `email` is provided when `cloud` is selected (non-empty check)
- [x] 4.2 Manually verify a Cloud instance connection works end-to-end (search, migrate, update) with Basic Auth headers
- [x] 4.3 Manually verify existing Server / Data Center configuration still works unchanged after the refactor
