## Why

Currently, the migration dashboard only displays a high-level summary list of issues (ID, title, assignee, type). Users cannot view the description (text content) or the discussion history/comments of the external Jira issues directly in the dashboard before performing a migration. Having access to issue details and comments inside the dashboard helps users verify issue contexts and make informed decisions on migrating and mapping.

## What Changes

- **Issue Details View**: Add an expandable details panel or dialog for each issue in the dashboard.
- **Fetch Description and Comments**: Implement a server function to fetch the full description and comments of a specific external Jira issue.
- **Rich Formatted Display**: Render the issue description and comments with appropriate formatting (handling basic Jira wiki markup/markdown) in the UI.

## Capabilities

### New Capabilities

- `jira-issue-details`: Allow users to view an external Jira issue's full text description and formatted comments directly within the dashboard.

### Modified Capabilities

_None._

## Impact

- **Backend**: Add a new server function `getJiraIssueDetailsFn` in `src/lib/jira-server.ts` to retrieve an issue's description and comments.
- **Frontend**: Update the dashboard UI to allow expanding an issue row or opening a details modal, loading and rendering the description and comments using a clean, readable layout.
