## Why

Currently, when migrating an issue, the relationship between the external JIRA issue ID and the newly created internal JIRA issue ID is saved automatically in `localStorage`. However, if an issue is deleted on the target JIRA, migrated to the wrong project, or migrated manually beforehand outside this tool, the user has no way to correct, register, or delete the mapping in this tool.
Providing a way to manually add, edit, or delete the mapped internal ID directly from the dashboard row ensures proper record-keeping and sync states.

## What Changes

- **Manual Mapping Assignment & Editing**: Add UI buttons/inputs in each issue row to manually assign, edit, or clear the associated internal JIRA issue ID mapping.
- **Persistent Mapping Actions**: Modifying a mapping manually updates the local registry in `localStorage` under `jira_sync_migration_mapping`.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `jira-sync`: Add requirement for manually managing issue mapping relationships.

## Impact

- `src/components/MigrationDashboard.tsx`: Update the issue row display to render an edit/assign action next to the migration status. Implement inline inputs or action buttons to set/clear mapped target issue IDs.
