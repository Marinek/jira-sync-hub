## Context

Currently, the search field in the Migration Dashboard only filters issues locally in the frontend from a pre-fetched list of 100 issues. This results in older issues, which are not returned within the first 100 results from the JIRA API, being completely invisible to the user.

## Goals / Non-Goals

**Goals:**
- Perform text queries (searching by title/summary, description, or issue key) and issue type filtering directly on the JIRA API side via JQL.
- Trigger the search query explicitly via a "Search" button click or pressing Enter inside filter inputs, preventing automatic API requests on keystroke.
- Ensure that the search matches issues by title/summary, description, or key, and filters by the selected issue type on the API side.

**Non-Goals:**
- Full server-side pagination (this is not requested and the existing 100-limit per API query is sufficient when search is applied).

## Decisions

### 1. Integrate Search Query and Issue Type into JQL Construction
- **Option A (Chosen)**:
  - Append `AND (summary ~ "query" OR description ~ "query" OR key = "query")` to the JQL if a search term is specified.
  - Append `AND issuetype = "typeFilter"` if the issue type is not set to `"all"`.
  - *Rationale*: This ensures that the filtering is entirely handled by Jira's JQL engine, retrieving only relevant results for both text matches (exact on ID, contains on summary/description) and issue types.

### 2. Dependency Array & Triggering
- **Option A (Chosen)**: Use a `searchTrigger` counter/state that updates only when clicking the "Search" button or when pressing Enter inside the input fields. The `useEffect` hook that runs `fetchLiveIssues` will depend on `[isFullyConfigured, config, selectedExtProjectKey, searchTrigger]`.
  - *Rationale*: This avoids sending queries to the API on every keystroke, which is highly recommended since JQL queries can be slow and subject to rate limits. The user is in complete control of when to search.
- **Option B**: Automatic debouncing.
  - *Rationale*: Automatic fetching on a timer can trigger unnecessary backend loads while the user is still composing their search filters. An explicit click or Enter action provides a cleaner and more expected desktop/dashboard workflow.

## Risks / Trade-offs

- **Risk: Invalid JQL Syntax** → If the user types special characters (like quotes, brackets, etc.), the JIRA API JQL parser might return a 400 Bad Request error.
  - *Mitigation*: Escape double quotes in the query string by replacing `"` with `\"`. If a search request fails, display a clean error message without breaking the dashboard UI.
