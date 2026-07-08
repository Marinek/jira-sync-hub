## Why

We want to allow users to search for specific issues on an external Jira instance (e.g. issues assigned to a specific person X and not in the 'Done' status category) and copy/migrate these issues to an internal Jira instance. This makes it easier for project managers to synchronize and migrate tasks across systems from a unified dashboard.

## What Changes

- **Jira Connection Configuration**: Add a configuration UI to enter API credentials (URL, Personal Access Token (PAT)) for both external and internal Jira instances.
- **Local Configuration Storage**: Save and read configuration details to/from `localStorage` (client-side) to avoid requiring backend credentials databases.
- **External Issue Search**: Search and filter external Jira issues dynamically using JQL queries. The selection criteria (such as assignee and statusCategory exclusion) MUST be configurable/editable by the user via the user interface.
- **Issue Migration/Copying**: Provide a trigger to clone issues from the external Jira instance into the internal Jira instance and display the mapped ID relations.

## Capabilities

### New Capabilities

- `jira-sync`: Connection management (external/internal), external issue querying, and migration execution to the internal system.

### Modified Capabilities

- None

## Impact

- `src/components/MigrationDashboard.tsx`: Rewrite component to use configured Jira connection credentials and retrieve real data via server functions or direct fetch.
- `src/lib/jira-mock.ts` or new api modules: Introduce server functions or service APIs to proxy requests to Atlassian's REST API, bypassing CORS issues.
- `localStorage`: Use local browser storage keys for configuration state.
