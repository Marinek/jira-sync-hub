## Why

Issues can currently be copied from the source Jira to the target Jira, but subsequent changes in the source issue are not propagated to the already created target issue. This causes manual rework and inconsistent ticket data.

## What Changes

- Add a dedicated "Update in target" action for already mapped issues.
- During update, synchronize the target issue summary and description with the current values from the source issue.
- Transfer new attachments from the source issue to the target issue without duplicating attachments already present in the target.
- Show a visible per-row update status in the dashboard, including success/error feedback.
- Reuse existing mapping data (external to internal issue ID) without changing that mapping.

## Capabilities

### New Capabilities
- `sync-updated-copied-issues`: Post-copy synchronization of fields and attachments for already copied issues.

### Modified Capabilities
- `jira-sync`: Extend migration behavior with re-synchronization (summary, description, attachments) for existing mappings.

## Impact

- UI: Extend the issue list with an update action and status indicator.
- Server/API: Add or extend endpoint logic for updating existing target issues.
- Jira integration: Read source issue data including attachments, compare with target issue, and upload only missing attachments.
- Error handling: Provide detailed messages for partial failures (for example, failed attachment upload).
