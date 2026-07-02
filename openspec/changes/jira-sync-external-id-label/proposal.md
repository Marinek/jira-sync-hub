## Why

When migrating issues from the external JIRA instance to the internal JIRA instance, it is difficult to search or filter issues in the internal JIRA by their original external issue ID. Including the external issue ID (e.g. `EXT-1042`) as a label/keyword in the newly created internal JIRA issue will make tracking and grouping migrated issues much easier.

## What Changes

- **External ID Labeling**: When creating an issue on the target internal JIRA, include the external JIRA issue ID as a label/keyword in the JIRA issue payload fields.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `jira-sync`: Add requirement to include the external issue ID as a label on the target issue during migration.

## Impact

- `src/lib/jira-server.ts`: Update the `migrateJiraIssueFn` server function to add the external issue ID to the `labels` array field in the payload sent to the internal JIRA create API.
