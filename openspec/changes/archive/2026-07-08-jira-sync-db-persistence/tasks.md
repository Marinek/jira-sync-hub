## 1. Backend Server-side Persistence Setup

- [x] 1.1 Implement server-side persistence utilities and ensure the `data/` directory and `data/mappings.json` exist
- [x] 1.2 Implement the get-mappings server function (`getMigrationMappingsFn`) in `src/lib/jira-server.ts`
- [x] 1.3 Implement the update-mapping server function (`updateMigrationMappingFn`) in `src/lib/jira-server.ts`

## 2. Frontend Integration

- [x] 2.1 Fetch server-side issue mappings on dashboard initialization and merge them into the list of issues instead of reading from `localStorage`
- [x] 2.2 Update the migration execution logic in `MigrationDashboard.tsx` to save mappings to the server via `updateMigrationMappingFn`
- [x] 2.3 Update the manual mapping update / clear handlers in `MigrationDashboard.tsx` to use `updateMigrationMappingFn`
- [x] 2.4 Implement automatic pre-selection of the target project in `MigrationDashboard.tsx` based on matching existing issue mapping prefixes when the source project changes
- [x] 2.5 Verify all user sessions display mapped issues correctly and test sync status updates
