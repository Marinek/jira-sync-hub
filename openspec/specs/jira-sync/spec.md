# jira-sync Specification

## Purpose

TBD - created by archiving change jira-external-search-and-sync. Update Purpose after archive.
## Requirements
### Requirement: Jira Configuration Management

The system SHALL allow the user to save and retrieve connection credentials (URL, Personal Access Token (PAT) or API Token, and optionally email) for both the external and internal Jira instances in `localStorage`. The external instance additionally requires an **instance type** selection (`server` or `cloud`) that determines the authentication scheme used.

#### Scenario: Save configurations to localStorage

- **WHEN** the user enters credentials for both external and internal Jira instances in the settings form, selects the external instance type, provides an email if Cloud is selected, and clicks "Save"
- **THEN** the system SHALL store the configurations including `instanceType` (and `email` for Cloud) in `localStorage` under appropriate keys and show a success notification

#### Scenario: Load configurations on app initialization

- **WHEN** the dashboard page loads
- **THEN** the system SHALL load the saved configurations from `localStorage`, defaulting `instanceType` to `"server"` if absent, to initialize the client state

### Requirement: External Issue Querying

The system SHALL query the external Jira instance for issues using a JQL query based on the configurable selection criteria (such as assignee, status category exclusions, issue type, and search text queries) entered by the user in the UI, only when the user explicitly triggers the search.

#### Scenario: Search issues with custom assignee, status, issue type, and search text or ID criteria

- **WHEN** the user selects or enters a target assignee (e.g., "Person X"), specifies status exclusions, selects an issue type (e.g., "Bug"), and/or enters a search query (e.g., "PROJ-123" or "login") in the search filters, and clicks the "Search" button or presses Enter
- **THEN** the system SHALL construct the corresponding JQL query (e.g., `assignee = "Person X" AND statusCategory != Done AND issuetype = "Bug" AND (summary ~ "login" OR description ~ "login" OR key = "login")` or `issuetype = "Bug" AND (summary ~ "PROJ-123" OR description ~ "PROJ-123" OR key = "PROJ-123")`) using exact match for the issue key (`key = ...`), exact match for issue type (`issuetype = ...`), and text contains search for summary/description (`summary ~ ...`), and call the external Jira search API to fetch and display matching issues

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

### Requirement: Manual Mapping Management

The system SHALL allow the user to manually add, edit, or clear the target JIRA issue ID mapping associated with any external issue directly in the UI, persisting these changes on the server to be shared with all users.

#### Scenario: Manually set an issue mapping relationship

- **WHEN** the user manually enters a target internal issue key for an unmapped external issue row and saves it
- **THEN** the system SHALL update the mapping on the server and display the mapped ID as a link to the target issue for all users

#### Scenario: Edit or clear an existing issue mapping relationship

- **WHEN** the user edits or clicks "Clear" on an active issue mapping link
- **THEN** the system SHALL modify or remove the mapping on the server and reset the row status back to pending

### Requirement: Automatic Target Project Selection

The system SHALL automatically pre-select the target internal project in the selector if there is an existing ticket mapping from the selected source project.

#### Scenario: Pre-select target project based on historical mappings

- **WHEN** the user selects a source external project
- **THEN** the system SHALL check if any existing mappings link issues from this external project to an internal project, and if so, automatically select that internal project as the target project in the UI

### Requirement: Update previously copied issue content
The system SHALL allow users to update an already mapped target Jira issue from its source Jira issue without creating a new target issue. Comment synchronization is optional and controlled by the user on a per-update basis.

#### Scenario: User updates a mapped issue
- **WHEN** a user triggers update for a source issue that already has a stored target issue mapping
- **THEN** the system SHALL load the mapped target issue and execute an update flow against that target issue

#### Scenario: User updates a mapped issue and selects comment copying

- **WHEN** a user triggers update, enables "Copy new comments", and the source issue has comments not yet on the target
- **THEN** the system SHALL update the target issue and additionally post the new comments to the target issue

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

