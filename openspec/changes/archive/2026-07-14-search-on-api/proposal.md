## Why

The current issue search in the Migration Dashboard filters issues locally in the frontend from a pre-fetched list of 100 issues. This prevents users from finding older issues that are not part of the initial list returned by the API. Performing the search query directly via the Jira JQL API ensures that all matching issues from the target project can be found and displayed.

## What Changes

- Update the issues list fetch trigger in the Migration Dashboard to execute only when the user clicks a "Search" button or presses Enter, rather than auto-fetching on keystrokes.
- Construct the JQL query passed to the JIRA API to search for the query string in text fields (using summary or description contains), exact match for the issue ID (key), and selected issue type (issuetype) when the search is triggered.
- Add a "Search" button next to the filter controls to trigger the API request.
- Remove local frontend filtering, performing all filtering directly via the server API.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `jira-sync`: Update the search scenario under "External Issue Querying" to include the text search query parameter in the JQL query construction, ensuring the search is performed via the API.

## Impact

- `src/components/MigrationDashboard.tsx`: Update the search query state hook, `fetchLiveIssues` dependency array (adding both `query` and `typeFilter`), JQL construction (appending `issuetype` filter), and remove local frontend filtering of `issues` completely.
