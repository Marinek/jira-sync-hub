## MODIFIED Requirements

### Requirement: Issue Migration Execution

The system SHALL clone a selected external issue to the internal Jira instance, transfer its attachments, optionally transfer its comments, concatenate the "Acceptance Criteria[Paragraph]" field (if present) to the target description, support custom issue type mapping fallback when the source issue type is not available in the target project, include the external issue ID as a label/keyword, store the link between the external and internal issue IDs on the server, and allow subsequent re-synchronization of summary, description, newly added attachments, and optionally comments for existing mappings.

#### Scenario: Successfully migrate an issue with type mapping and attachments

- **WHEN** the user clicks "Migrate" on an external issue row whose issue type does not exist in the target project
- **THEN** the system SHALL prompt the user to map the issue type, download all attachments from the external issue, upload them to the newly created internal JIRA issue, store the issue type mapping per target project in `localStorage`, store the issue mapping on the server, and display the newly created internal JIRA issue ID on the UI

#### Scenario: Successfully migrate an issue with comment copying enabled

- **WHEN** the user enables "Copy comments" checkbox and clicks "Migrate" on an external issue
- **THEN** the system SHALL complete the migration, and additionally fetch all comments from the source issue and post them to the target issue, preserving author name and timestamps

#### Scenario: Successfully migrate an issue with Acceptance Criteria

- **WHEN** the user migrates an external issue that has a non-empty "Acceptance Criteria[Paragraph]" field
- **THEN** the system SHALL create the target issue with the source description, and append the acceptance criteria with an "## Acceptance Criteria" heading to the target issue description

#### Scenario: Successfully update an already migrated issue

- **WHEN** the user triggers an update action on an external issue row that already has a mapped internal issue ID
- **THEN** the system SHALL update the mapped internal issue summary and description from the current external issue, transfer only missing attachments, preserve the existing mapping, and display the update outcome in the UI

#### Scenario: Successfully update an already migrated issue with comment copying enabled

- **WHEN** the user enables "Copy new comments" checkbox and triggers an update on a mapped external issue
- **THEN** the system SHALL update the mapped internal issue summary and description, transfer missing attachments, and additionally post any comments from the source issue that do not yet exist on the target issue

### Requirement: Update previously copied issue content

The system SHALL allow users to update an already mapped target Jira issue from its source Jira issue without creating a new target issue. Comment synchronization is optional and controlled by the user on a per-update basis.

#### Scenario: User updates a mapped issue

- **WHEN** a user triggers update for a source issue that already has a stored target issue mapping
- **THEN** the system SHALL load the mapped target issue and execute an update flow against that target issue

#### Scenario: User updates a mapped issue and selects comment copying

- **WHEN** a user triggers update, enables "Copy new comments", and the source issue has comments not yet on the target
- **THEN** the system SHALL update the target issue and additionally post the new comments to the target issue
