## MODIFIED Requirements

### Requirement: External Issue Querying

The system SHALL query the external Jira instance for issues using a JQL query based on the configurable selection criteria (such as assignee, status category exclusions, issue type, and search text queries) entered by the user in the UI, only when the user explicitly triggers the search.

#### Scenario: Search issues with custom assignee, status, issue type, and search text or ID criteria

- **WHEN** the user selects or enters a target assignee (e.g., "Person X"), specifies status exclusions, selects an issue type (e.g., "Bug"), and/or enters a search query (e.g., "PROJ-123" or "login") in the search filters, and clicks the "Search" button or presses Enter
- **THEN** the system SHALL construct the corresponding JQL query (e.g., `assignee = "Person X" AND statusCategory != Done AND issuetype = "Bug" AND (summary ~ "login" OR description ~ "login" OR key = "login")` or `issuetype = "Bug" AND (summary ~ "PROJ-123" OR description ~ "PROJ-123" OR key = "PROJ-123")`) using exact match for the issue key (`key = ...`), exact match for issue type (`issuetype = ...`), and text contains search for summary/description (`summary ~ ...`), and call the external Jira search API to fetch and display matching issues
