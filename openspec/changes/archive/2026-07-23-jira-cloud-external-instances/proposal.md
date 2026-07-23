## Why

The application currently supports only Jira Server/Data Center instances as the external source, using Personal Access Token (PAT / Bearer) authentication. Many teams host their external Jira on Jira Cloud (Atlassian Cloud), which uses a different authentication scheme (email + API Token via Basic Auth) and slightly different API behavior. Without Cloud support, those teams cannot use the migration tool at all.

## What Changes

- Add an **instance type** selector (`server` | `cloud`) to the external Jira configuration form.
- When `cloud` is selected, swap PAT/Bearer auth for Basic Auth (email + API token).
- Store the chosen instance type and, for Cloud, the user email alongside the existing credentials in `localStorage`.
- Adjust all outgoing HTTP calls to the external Jira to use the correct `Authorization` header based on the configured instance type.
- Update connection validation / test to confirm the auth scheme against the selected type.
- Update the settings UI labels and help text to reflect both options.

## Capabilities

### New Capabilities

- `jira-cloud-auth`: Support Jira Cloud authentication (email + API token / Basic Auth) as an alternative to Server/Data Center PAT authentication for the external Jira instance.

### Modified Capabilities

- `jira-sync`: The external issue querying, migration, and update flows must use the correct auth header depending on the configured external instance type.

## Impact

- **`src/components/SettingsModal.tsx`**: New instance-type radio/select and conditional email field.
- **`src/hooks/useJiraConfig.ts`**: Extended config shape to include `instanceType` and `email` for the external instance.
- **`src/lib/jira-types.ts`**: `JiraConfig` extended with optional `instanceType` and `email` fields.
- **`src/lib/jira-server.ts`**: Auth header construction now depends on `instanceType`.
- No new external dependencies required (Basic Auth header is constructed manually).
- No breaking changes to internal Jira configuration (internal instance stays Server/PAT only).
