## MODIFIED Requirements

### Requirement: Issue Migration Execution
The system SHALL clone a selected external issue to the internal Jira instance, include the external issue ID as a label/keyword, and store the link between the external and internal issue IDs.

#### Scenario: Successfully migrate an issue
- **WHEN** the user clicks "Migrate" on an external issue row
- **THEN** the system SHALL call the internal Jira API to create a new issue with identical summary, description, and issue type, include the external issue ID as a label, store the mapping in `localStorage`, and display the newly created internal Jira issue ID on the UI
