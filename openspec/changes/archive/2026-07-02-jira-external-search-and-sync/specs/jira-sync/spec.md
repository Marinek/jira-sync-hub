## ADDED Requirements

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
The system SHALL clone a selected external issue to the internal Jira instance and store the link between the external and internal issue IDs.

#### Scenario: Successfully migrate an issue
- **WHEN** the user clicks "Migrate" on an external issue row
- **THEN** the system SHALL call the internal Jira API to create a new issue with identical summary, description, and issue type, store the mapping in `localStorage`, and display the newly created internal Jira issue ID on the UI
