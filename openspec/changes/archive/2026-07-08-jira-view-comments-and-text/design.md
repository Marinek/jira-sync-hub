## Context

Currently, the migration dashboard only displays a high-level summary list of issues. To help users verify issue details, we need to show the description (text content) and comments history for the selected issue.

## Goals / Non-Goals

**Goals:**

- Implement a new server function `getJiraIssueDetailsFn` to fetch issue description and comments on demand.
- Add a user-friendly UI panel (such as a sheet/drawer or modal dialog) to read the description and comment thread.
- Render the text formatting cleanly.

**Non-Goals:**

- Downloading or displaying binary attachments, images, or metadata fields not relevant to the text content.
- Inline issue editing.

## Decisions

### 1. Fetch Details On-Demand

- **Option A**: Fetch description and comments for all issues in the main issue search query.
- **Option B (Chosen)**: Fetch issue details on-demand when the user expands/clicks on an issue.
- **Rationale**: Keeps the initial dashboard loading/search fast. Most users will only need details for specific issues.

### 2. UI presentation

- **Option A**: Expandable table rows.
- **Option B (Chosen)**: A side drawer (using Radix Sheet/Dialog components) that slides open.
- **Rationale**: Provides more screen space for reading long descriptions and comment histories without breaking the tabular dashboard layout.

## Risks / Trade-offs

- **Rate Limits / Performance**: Multiple API requests when clicking different issues.
  - _Mitigation_: Show a clean loader state during data fetching. Cache details in React state during the active user session.
