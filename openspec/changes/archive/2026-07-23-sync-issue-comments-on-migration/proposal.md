## Why

When migrating or updating issues between Jira instances, users currently cannot copy comments from the source issue to the target issue. Comments are often critical context for understanding why an issue was created, how it evolved, and what decisions were made. Adding optional comment synchronization improves completeness of issue migration and keeps team communication history intact across instances.

## What Changes

- Add an **optional toggle** in the UI (Migration Dialog / Update flow) to enable comment copying during migration or update operations.
- When enabled, copy all comments from the source issue to the target issue with original author names and timestamps preserved.
- Store comment copy preference persistently (in `localStorage`).
- Update migration and issue update operations to conditionally include comments based on user preference.
- Gracefully handle comment copy failures without blocking the entire migration/update.

## Capabilities

### New Capabilities

- `issue-comments-sync`: Support copying comments from source issues to target issues during migration and update operations, with optional user control.

### Modified Capabilities

- `jira-sync`: Extend issue migration and update flows to support optional comment synchronization.

## Impact

- **`src/components/MigrationDashboard.tsx`**: Add UI toggle for comment copying preference; pass preference to migration/update functions.
- **`src/lib/jira-server.ts`**: Extend `migrateJiraIssueFn` and `updateMappedJiraIssueFn` to accept a `copyComments` flag and copy comments from external to internal issue if enabled.
- **`src/hooks/useJiraConfig.ts`**: Store and retrieve `copyComments` preference in `localStorage`.
- **`src/lib/jira-types.ts`**: Optional new types for comment copy results (if needed for detailed feedback).
- No new external dependencies required.
- No breaking changes to existing migration/update APIs; comment copying is purely additive.
