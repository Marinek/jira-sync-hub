## Context

For flexibility, the JIRA Sync Hub needs to allow manual overriding of ticket relationships. If a ticket was manually migrated or needs correction (due to deletion or project mistakes), users should be able to alter the client-side migration mapping registry.

## Goals / Non-Goals

**Goals:**
- Provide clear UI actions on each issue row to add, edit, or remove the target JIRA ID mapping.
- Update `localStorage` dynamically to keep the status, badges, and statistics synchronized.

**Non-Goals:**
- Creating actual issues in JIRA when manually mapping (this is purely database/record-keeping alignment).

## Decisions

### Decision 1: Inline Row Editing UI
We will update the `IssueRow` component to support an "Edit Mode" state:
- **For Migrated Issues**: Show an "Edit" icon and "Delete/Unlink" icon next to the mapped ID badge. Clicking "Edit" replaces the badge with an inline text input and a save/cancel button. Clicking "Delete" removes the mapped ID.
- **For Pending Issues**: Show a "Link" icon next to the "Migrate" button. Clicking it displays an inline input to enter a target ID directly (e.g., `INT-789`), which registers the link manually.

### Decision 2: Callback Handlers in Dashboard
We will expose a callback `onUpdateMapping(issueId, newInternalId | null)` from `MigrationDashboard` to `IssueRow`. When called:
1. Load `jira_sync_migration_mapping` from `localStorage`.
2. If `newInternalId` is provided, set `mappings[issueId] = newInternalId`.
3. If `newInternalId` is `null`, delete `mappings[issueId]`.
4. Save mappings back to `localStorage`.
5. Update the local `issues` state array to reflect the new mapping status instantly.
6. Re-calculate the stats.

## Risks / Trade-offs

- **Format Validation**: Users might input typos (like `int-123` instead of `INT-123`). We will automatically uppercase the input and trim whitespaces before saving.
