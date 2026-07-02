# jira-sync Specification

## Purpose
TBD - created by archiving change jira-external-search-and-sync. Update Purpose after archive.
## Requirements
### Requirement: Jira Configuration Management
The system SHALL allow the user to save and retrieve connection credentials (URL, Personal Access Token (PAT)) for both the external and internal Jira instances in `localStorage`.

#### Scenario: Save configurations to localStorage
- **WHEN** the user enters the credentials for both external and internal Jira instances in the settings form and clicks "Save"
- **THEN** the system SHALL store the configurations in `localStorage` under appropriate keys and show a success notification

#### Scenario: Load configurations on app initialization
- **WHEN** the dashboard page loads
- **THEN** the system SHALL load the saved configurations from `localStorage` to initialize the client state

### Requirement: External Issue Querying
The system SHALL query the external Jira instance for issues using a JQL query based on the configurable selection criteria (such as assignee and status category exclusions) entered by the user in the UI.

#### Scenario: Search issues with custom assignee and status criteria
- **WHEN** the user selects or enters a target assignee (e.g. "Person X") and specifies status exclusions in the search filters
- **THEN** the system SHALL construct the corresponding JQL query (e.g. `assignee = "Person X" AND statusCategory != Done`) and call the external Jira search API to fetch and display matching issues

### Requirement: Issue Migration Execution
The system SHALL clone a selected external issue to the internal Jira instance, transfer its attachments, support custom issue type mapping fallback when the source issue type is not available in the target project, include the external issue ID as a label/keyword, and store the link between the external and internal issue IDs.

#### Scenario: Successfully migrate an issue with type mapping and attachments
- **WHEN** the user clicks "Migrate" on an external issue row whose issue type does not exist in the target project
- **THEN** the system SHALL prompt the user to map the issue type, download all attachments from the external issue, upload them to the newly created internal JIRA issue, store the issue type mapping per target project in `localStorage`, store the issue mapping in `localStorage`, and display the newly created internal JIRA issue ID on the UI

### Requirement: Manual Mapping Management
The system SHALL allow the user to manually add, edit, or clear the target JIRA issue ID mapping associated with any external issue directly in the UI.

#### Scenario: Manually set an issue mapping relationship
- **WHEN** the user manually enters a target internal issue key for an unmapped external issue row and saves it
- **THEN** the system SHALL update `localStorage` under `jira_sync_migration_mapping` and display the mapped ID as a link to the target issue

#### Scenario: Edit or clear an existing issue mapping relationship
- **WHEN** the user edits or clicks "Clear" on an active issue mapping link
- **THEN** the system SHALL modify or remove the mapping from `localStorage` and reset the row status back to pending

