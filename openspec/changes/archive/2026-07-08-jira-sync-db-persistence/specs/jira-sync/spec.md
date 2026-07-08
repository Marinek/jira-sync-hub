## ADDED Requirements

### Requirement: Automatic Target Project Selection

The system SHALL automatically pre-select the target internal project in the selector if there is an existing ticket mapping from the selected source project.

#### Scenario: Pre-select target project based on historical mappings

- **WHEN** the user selects a source external project
- **THEN** the system SHALL check if any existing mappings link issues from this external project to an internal project, and if so, automatically select that internal project as the target project in the UI

## MODIFIED Requirements

### Requirement: Issue Migration Execution

The system SHALL clone a selected external issue to the internal Jira instance, transfer its attachments, support custom issue type mapping fallback when the source issue type is not available in the target project, include the external issue ID as a label/keyword, and store the link between the external and internal issue IDs on the server.

#### Scenario: Successfully migrate an issue with type mapping and attachments

- **WHEN** the user clicks "Migrate" on an external issue row whose issue type does not exist in the target project
- **THEN** the system SHALL prompt the user to map the issue type, download all attachments from the external issue, upload them to the newly created internal JIRA issue, store the issue type mapping per target project in `localStorage`, store the issue mapping on the server, and display the newly created internal JIRA issue ID on the UI

### Requirement: Manual Mapping Management

The system SHALL allow the user to manually add, edit, or clear the target JIRA issue ID mapping associated with any external issue directly in the UI, persisting these changes on the server to be shared with all users.

#### Scenario: Manually set an issue mapping relationship

- **WHEN** the user manually enters a target internal issue key for an unmapped external issue row and saves it
- **THEN** the system SHALL update the mapping on the server and display the mapped ID as a link to the target issue for all users

#### Scenario: Edit or clear an existing issue mapping relationship

- **WHEN** the user edits or clicks "Clear" on an active issue mapping link
- **THEN** the system SHALL modify or remove the mapping on the server and reset the row status back to pending
