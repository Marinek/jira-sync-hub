## Why

Storing ticket links in `localStorage` isolates the migration history and ticket mappings to a single user's browser. Persisting these mappings on the server allows all users to see, share, and manage ticket mapping relationships collaboratively.

## What Changes

- **Server-Side Persistence**: Introduce server-side persistence (e.g., a local JSON file database) for external-to-internal Jira ticket mappings.
- **Server Functions**: Add server functions to fetch, add, update, and remove ticket mappings.
- **Dashboard Sync**: Update the frontend Migration Dashboard to read and modify mappings via the server, removing reliance on `localStorage` for mappings and displaying them to all users.
- **Automatic Target Project Selection**: Automatically pre-select the target internal project in the selector if there is an existing ticket mapping from the selected source project.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `jira-sync`: Update requirements to persist, retrieve, and delete ticket mapping relationships on the server instead of `localStorage` so that they are visible and shared among all users.

## Impact

- **Backend**: Add persistence logic and server functions (`getMigrationMappingsFn`, `updateMigrationMappingFn`) to `src/lib/jira-server.ts`.
- **Frontend**: Update `MigrationDashboard.tsx` to call these server functions instead of reading/writing to `localStorage` under `jira_sync_migration_mapping`.
