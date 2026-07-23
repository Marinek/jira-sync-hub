## MODIFIED Requirements

### Requirement: Jira Configuration Management

The system SHALL allow the user to save and retrieve connection credentials (URL, Personal Access Token (PAT) or API Token, and optionally email) for both the external and internal Jira instances in `localStorage`. The external instance additionally requires an **instance type** selection (`server` or `cloud`) that determines the authentication scheme used.

#### Scenario: Save configurations to localStorage

- **WHEN** the user enters credentials for both external and internal Jira instances in the settings form, selects the external instance type, provides an email if Cloud is selected, and clicks "Save"
- **THEN** the system SHALL store the configurations including `instanceType` (and `email` for Cloud) in `localStorage` under appropriate keys and show a success notification

#### Scenario: Load configurations on app initialization

- **WHEN** the dashboard page loads
- **THEN** the system SHALL load the saved configurations from `localStorage`, defaulting `instanceType` to `"server"` if absent, to initialize the client state
