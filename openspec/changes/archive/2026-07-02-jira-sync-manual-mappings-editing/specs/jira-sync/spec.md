## ADDED Requirements

### Requirement: Manual Mapping Management

The system SHALL allow the user to manually add, edit, or clear the target JIRA issue ID mapping associated with any external issue directly in the UI.

#### Scenario: Manually set an issue mapping relationship

- **WHEN** the user manually enters a target internal issue key for an unmapped external issue row and saves it
- **THEN** the system SHALL update `localStorage` under `jira_sync_migration_mapping` and display the mapped ID as a link to the target issue

#### Scenario: Edit or clear an existing issue mapping relationship

- **WHEN** the user edits or clicks "Clear" on an active issue mapping link
- **THEN** the system SHALL modify or remove the mapping from `localStorage` and reset the row status back to pending
