## Context

Currently, the external-to-internal Jira ticket mappings are stored in the user's browser `localStorage` under the key `jira_sync_migration_mapping`. This prevents team collaboration and multiple users from seeing the migrated status or mapped ticket links. We need to transition this storage to the server.

## Goals / Non-Goals

**Goals:**

- Store external-to-internal Jira ticket mappings in a persistent JSON file (`data/mappings.json`) on the server.
- Expose new server functions: `getMigrationMappingsFn` and `updateMigrationMappingFn` in `src/lib/jira-server.ts`.
- Integrate server mappings into the UI to show synced statuses and links to all users.
- Automatically select the matching internal target project based on previous mappings for the selected source project.

**Non-Goals:**

- Setting up a full database server (e.g. Postgres) or SQLite database. A simple JSON file database is sufficient.
- Migrating user settings (Jira URLs, PAT tokens) to the server. Settings will remain in `localStorage` per user.

## Decisions

### 1. JSON File Storage on the Server

- **Option A**: SQLite database.
- **Option B (Chosen)**: A simple JSON file (`data/mappings.json`) inside the project root, using `fs/promises` for reading and writing.
- **Rationale**: Since this is a simple local app with low concurrency requirements, a JSON file requires no external dependencies, is easy to set up, and is perfectly adequate for sharing ticket mappings.

### 2. Server Functions for API Access

- Use `@tanstack/react-start` server functions `createServerFn` to query and update the mappings on the server.
- The functions will be called from the dashboard component.

### 3. Automatic Target Project Selection Logic

- When a source project is selected (or when mappings are loaded), the dashboard will scan the server-side mappings.
- If an existing mapping key starts with the source project prefix (e.g., `EXT-123`) and maps to an internal key (e.g., `INT-456`), the code will extract the prefix of the internal key (`INT`) and automatically update the selected target project key state to match `INT` if it is present in the target projects list.

## Risks / Trade-offs

- **Concurrent Write Conflict**: If two users update mappings at the exact same millisecond, one write could overwrite the other.
  - _Mitigation_: We will perform read-modify-write operations using a simple helper function. For low concurrency, standard async file operations are sufficient.
- **Server Restart/Data Loss**: Storing files in the root folder might get cleared if deployed to ephemeral environments.
  - _Mitigation_: Storing the JSON file in `data/mappings.json` in the workspace ensures that mappings are persisted locally.
