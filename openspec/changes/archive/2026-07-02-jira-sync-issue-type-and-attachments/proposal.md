## Why

Currently, when migrating an issue, the tool assumes that the source issue type (e.g., "Bug", "Story") exists on the target JIRA instance. If it doesn't, the JIRA API returns an error and migration fails. Allowing the user to select an existing target issue type in such cases ensures smooth migration.
Additionally, issues often contain attachments (images, PDFs, documents) which are critical to the context and must be transferred as part of the migration.

## What Changes

- **Target Issue Type Mapping**: Before migrating an issue, we should verify if the source issue type exists in the target project. If it does not, prompt the user with a dialog to select from the target project's available issue types.
- **Attachment Transfer**: During migration, download all attachments from the external issue and upload them to the newly created internal JIRA issue.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `jira-sync`: Add requirement for target issue type mapping fallback and attachment transfer during migration.

## Impact

- `src/lib/jira-server.ts`: Add helper functions to fetch available issue types of a target project and upload attachments.
- `src/components/MigrationDashboard.tsx`: Add a modal/dialog to prompt the user for issue type mapping if the source type is missing, and handle transferring attachments in the migration flow.
