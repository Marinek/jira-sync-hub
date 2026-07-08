## 1. Backend: Fetching Description and Comments

- [x] 1.1 Add `getJiraIssueDetailsFn` server function to fetch description and comments from the JIRA API in `src/lib/jira-server.ts`
- [x] 1.2 Update the mock JIRA service in `src/lib/jira-mock.ts` to support fetching mockup descriptions and comments when real configuration is missing

## 2. Frontend: Details Panel / Dialog

- [x] 2.1 Implement a Dialog/Drawer component in `MigrationDashboard.tsx` to display full issue description and comment thread
- [x] 2.2 Add a "View Details" button to `IssueRow` that triggers the Dialog/Drawer and calls `getJiraIssueDetailsFn`
- [x] 2.3 Format description and comments cleanly (e.g. style text paragraphs, user names, dates, and comment avatars)
- [x] 2.4 Verify all details load successfully with a clean loading spinner state and match the mocked/live Jira issues
