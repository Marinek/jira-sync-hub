## ADDED Requirements

### Requirement: Update previously copied issue content
The system SHALL allow users to update an already mapped target Jira issue from its source Jira issue without creating a new target issue.

#### Scenario: User updates a mapped issue
- **WHEN** a user triggers update for a source issue that already has a stored target issue mapping
- **THEN** the system SHALL load the mapped target issue and execute an update flow against that target issue

### Requirement: Synchronize summary and description on update
The system SHALL overwrite the target issue summary and description with the current source issue summary and description during update.

#### Scenario: Source text fields changed after initial migration
- **WHEN** source issue summary or description differs from the current target issue values
- **THEN** the system SHALL persist the source summary and description onto the mapped target issue

### Requirement: Transfer only missing attachments on update
The system SHALL transfer only attachments that are present on the source issue but not yet present on the mapped target issue.

#### Scenario: Source contains new and existing attachments
- **WHEN** update is triggered and the source has attachments where some already exist on the target
- **THEN** the system SHALL upload only the missing attachments and SHALL NOT duplicate attachments already present on the target

### Requirement: Report partial update outcomes
The system SHALL return a structured update result that distinguishes full success, partial success, and failure.

#### Scenario: Text update succeeds but one attachment upload fails
- **WHEN** summary/description update succeeds and at least one attachment transfer fails
- **THEN** the system SHALL mark the result as partial success and include failed attachment details

## MODIFIED Requirements

### Requirement: Issue Migration Execution
The system SHALL clone a selected external issue to the internal Jira instance, transfer its attachments, support custom issue type mapping fallback when the source issue type is not available in the target project, include the external issue ID as a label/keyword, store the link between the external and internal issue IDs on the server, and allow subsequent re-synchronization of summary, description, and newly added attachments for existing mappings.

#### Scenario: Successfully migrate an issue with type mapping and attachments
- **WHEN** the user clicks "Migrate" on an external issue row whose issue type does not exist in the target project
- **THEN** the system SHALL prompt the user to map the issue type, download all attachments from the external issue, upload them to the newly created internal JIRA issue, store the issue type mapping per target project in `localStorage`, store the issue mapping on the server, and display the newly created internal JIRA issue ID on the UI

#### Scenario: Successfully update an already migrated issue
- **WHEN** the user triggers an update action on an external issue row that already has a mapped internal issue ID
- **THEN** the system SHALL update the mapped internal issue summary and description from the current external issue, transfer only missing attachments, preserve the existing mapping, and display the update outcome in the UI
