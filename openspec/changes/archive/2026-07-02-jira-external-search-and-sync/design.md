## Context

The JIRA Migration Dashboard is a local tool designed to help developers and project managers review issues from an external JIRA instance and copy/migrate them to an internal JIRA instance. The application currently uses static mock data. We need to implement connection settings, real API calls using JQL queries, and the copying/creation of issues in the target system.

## Goals / Non-Goals

**Goals:**
- Add a Settings modal to configure URL and Personal Access Tokens (PAT) for both external and internal JIRA instances.
- Save credentials locally in `localStorage`.
- Query external issues via dynamically built JQL queries based on editable selection criteria (such as custom assignee names/IDs and status filters).
- Clone external issues (summary, description, type) into the internal JIRA instance.
- Avoid browser CORS limitations by using TanStack Start server functions.

**Non-Goals:**
- Multi-user authentication or hosting the application in a public/production cloud environment.
- Two-way synchronization (updating the external JIRA when the internal JIRA changes).
- Full custom-field mapping (only standard JIRA fields will be copied).

## Decisions

### Decision 1: Proxying Requests via TanStack Start Server Functions
To query the JIRA REST API, we must authenticate using a Personal Access Token (PAT) passed via Bearer auth (`Authorization: Bearer <PAT>`). Direct client-side requests from the browser will fail due to CORS. Therefore, we discard client-side fetching entirely.

Instead, we will pass the credentials from `localStorage` to a TanStack Start server function. The server function executes the request to JIRA and returns the response. This bypasses CORS and keeps token transmission local to the user's machine.

### Decision 2: Store Credentials in localStorage
Since this is a local utility tool run via `npm run dev` / `bun dev`, there is no central database. We will store connection settings directly in the browser's `localStorage` as plaintext. This is convenient, easy to implement, and works out-of-the-box for a local-only workflow. We will display a warning in the UI reminding the user to only run the app locally.

## Risks / Trade-offs

- **Risk: CORS on Localhost** → Mitigation: Use Server-side functions to query Jira APIs.
- **Risk: Plaintext Tokens in Browser** → Mitigation: Show a warning in the UI that the settings are stored in `localStorage` and this dashboard must only be run locally.
- **Risk: JIRA API Version Mismatch** → Mitigation: Use standard REST API v3 endpoints `/rest/api/3/search` and `/rest/api/3/issue` which are supported across all Jira Cloud instances.
