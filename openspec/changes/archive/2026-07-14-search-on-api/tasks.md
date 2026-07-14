## 1. Backend Search JQL Integration

- [x] 1.1 Add the search `query` and `typeFilter` parameters into the JQL query construction inside the `fetchLiveIssues` function in `MigrationDashboard.tsx`
- [x] 1.2 Properly escape double quotes in the `query` input to prevent syntax errors in the constructed JQL string

## 2. Frontend Filtering & Trigger Adjustment

- [x] 2.1 Add a new `searchTrigger` counter/trigger state in `MigrationDashboard.tsx` and add it to the dependency array of the `fetchLiveIssues` `useEffect` hook (removing `query`, `typeFilter`, and `assigneeFilter` from the dependencies, but keeping `selectedExtProjectKey`)
- [x] 2.2 Add a "Search" button to the filter bar in the UI next to the inputs, and wire up clicking the button (and pressing Enter in inputs) to increment the `searchTrigger` state
- [x] 2.3 Modify the `filtered` `useMemo` block in `MigrationDashboard.tsx` to return the fetched `issues` directly, removing both the local search string and local issue type filtering checks
- [x] 2.4 Verify the implementation by running local manual and automated tests
