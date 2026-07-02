## 1. Server API & Types Setup

- [x] 1.1 Create TypeScript types for Jira configs and Jira issues under `src/lib/jira-types.ts`
- [x] 1.2 Implement TanStack Start Server Functions in `src/server.ts` or a new file to proxy requests to Jira Cloud REST API
- [x] 1.3 Add a server-side route or function to search issues accepting dynamic JQL query strings constructed from UI inputs
- [x] 1.4 Add a server-side route or function to create/copy an issue in the internal Jira instance

## 2. Connection Settings UI

- [x] 2.1 Create a settings dialog/modal component in `src/components/SettingsModal.tsx`
- [x] 2.2 Implement configuration saving and loading to/from `localStorage`
- [x] 2.3 Add a "Settings" button to the `MigrationDashboard` header to open the dialog
- [x] 2.4 Add visual indicators showing connection status (e.g. green indicator if credentials are set)

## 3. External Search Integration

- [x] 3.1 Replace static mock data fetch in `MigrationDashboard` with real server function calls
- [x] 3.2 Update filters to dynamically trigger search via JQL when the query/assignee changes
- [x] 3.3 Add loading states and error toasts for issue querying

## 4. Migration Execution

- [x] 4.1 Update `handleMigration` to call the copy/migration server function
- [x] 4.2 Save the mapping of external issue ID to internal issue ID in local storage to persist migrated state locally
- [x] 4.3 Update the issue row UI to display the new internal issue link and visual success state
