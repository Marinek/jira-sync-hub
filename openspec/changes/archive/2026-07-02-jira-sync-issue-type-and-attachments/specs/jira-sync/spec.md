## MODIFIED Requirements

### Requirement: Issue Migration Execution
The system SHALL clone a selected external issue to the internal Jira instance, transfer its attachments, support custom issue type mapping fallback when the source issue type is not available in the target project, include the external issue ID as a label/keyword, and store the link between the external and internal issue IDs.

#### Scenario: Successfully migrate an issue with type mapping and attachments
- **WHEN** the user clicks "Migrate" on an external issue row whose issue type does not exist in the target project
- **THEN** the system SHALL prompt the user to map the issue type, download all attachments from the external issue, upload them to the newly created internal JIRA issue, store the issue type mapping per target project in `localStorage`, store the issue mapping in `localStorage`, and display the newly created internal JIRA issue ID on the UI
