## 1. Backend Support for Project Details and Attachments

- [x] 1.1 Add `getJiraProjectDetailsFn` in `src/lib/jira-server.ts` to fetch project details (including available issue types)
- [x] 1.2 Update `migrateJiraIssueFn` in `src/lib/jira-server.ts` to copy attachments from the source ticket to the target ticket

## 2. Frontend Dynamic Mapping UI

- [x] 2.1 Implement an issue type selection modal in `MigrationDashboard.tsx` to handle mapping missing issue types
- [x] 2.2 Check target project issue types before executing migration, prompting the user if a mapping is required
