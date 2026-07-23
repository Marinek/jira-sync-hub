## Context

The application already supports issue migration and updating between external and internal Jira instances. Currently, comments from the source issue are **not** copied to the target issue. All comment data is fetched server-side (in `getJiraIssueDetailsFn`) and displayed in the UI, but the migration and update flows discard it.

The change seeks to make comment copying an optional feature that users can toggle per migration/update session.

## Goals / Non-Goals

**Goals:**
- Allow users to optionally include comments when migrating or updating an issue.
- Preserve comment author names and timestamps in the target system.
- Keep the feature non-breaking—comment copying is disabled by default or must be explicitly opted-in per session.
- Handle comment copy failures gracefully (warn but don't block the migration/update).

**Non-Goals:**
- Comment editing or deletion after copy.
- Copying reactions or other comment metadata (only body + author + timestamp).
- Comment copying for issues that are already migrated (only new migrations and explicit updates).
- Bulk preference persistence across browsers (preference stored per-session in memory or `localStorage`, not server-side).

## Decisions

### Decision 1: UI Preference as Session Checkbox (Not Persisted)

**Choice:** Add a checkbox/toggle in the migration dialog before "Migrate" button is clicked. This preference is **not** persisted; each migration starts with the checkbox unchecked.

**Rationale:** Keeps the default safe (no comments copied unless explicitly requested). Users consciously opt-in per migration, reducing risk of unintended bulk comment copies.

**Alternative considered:** Persist preference in `localStorage`. Rejected—users may want different behavior for different migrations, and a session-based approach is simpler.

---

### Decision 2: `copyComments` Parameter in Server Functions

**Choice:** Add an optional `copyComments: boolean` parameter to both `migrateJiraIssueFn` and `updateMappedJiraIssueFn`. When `false` (default), the functions skip comment copying. When `true`, they fetch and post comments after the issue is created/updated.

**Rationale:** Server-side processing allows secure, rate-limit-friendly copying without exposing attachment URLs or auth tokens to client. Keeps API surfaces clean.

**Alternative considered:** Client-side copying (fetch comments on client, post directly). Rejected—cross-origin risks and no benefit over server-side.

---

### Decision 3: Comment Posting via REST API

**Choice:** For each comment from the source issue, use the standard Jira REST API endpoint to add a comment to the target issue:
- **Server/DC**: `POST /rest/api/2/issue/{issueKey}/comments`
- **Cloud**: `POST /rest/api/3/issue/{issueKey}/comments`

Include `author` (displayName) in the comment body as a prefix (e.g., `"**Posted by: John Doe**\n\n{original comment body}"`). This simulates attribution since the API server account is always the poster.

**Rationale:** Simple, uses standard Jira APIs, and preserves comment content without workarounds. Author name is visible in the body.

**Alternative considered:** Store comment metadata in a custom field. Rejected—over-engineered and ties comments to a custom schema.

---

### Decision 4: Graceful Failure Handling

**Choice:** If comment copying fails (e.g., 403, network error, rate limit), log the error, add to an error list, but **do not** fail the entire migration/update. The issue itself is created/updated successfully; comments are "best effort."

Return a summary indicating: "Migration successful. X of Y comments copied. Z failed."

**Rationale:** Avoids blocking the user's primary task (migrating the issue) for a secondary concern (comments). User can manually add missed comments or retry later.

---

### Decision 5: Acceptance Criteria[Paragraph] Handling

**Choice:** Fetch the "Acceptance Criteria[Paragraph]" custom field from the source issue during `getJiraIssueDetailsFn`. Display it as a separate field in the issue details dialog. During migration, if present, concatenate it into the target issue description with an "## Acceptance Criteria" heading.

**Rationale:** Acceptance criteria are important context for developers working on migrated issues. Displaying separately preserves readability in the UI. Concatenating with description (rather than creating a custom field on target) ensures compatibility across all Jira instances regardless of custom field schema.

**Alternative considered:** Create a separate custom field for acceptance criteria on target instance. Rejected—adds complexity and doesn't guarantee field availability on all target projects.

---

## Risks / Trade-offs

- **Rate limiting**: Copying many comments (e.g., 50+ on a single issue) may hit Jira rate limits. Mitigation: Add small delay between comment POSTs; handle 429 with exponential backoff.
- **Author attribution**: Comments posted by the service account, not original authors. Mitigation: Include original author name in comment body.
- **Comment metadata loss**: Reactions, mentions, rich formatting may be lost. Mitigation: Document this in UI help text.
- **Dangling comment references**: Comments may reference other issues or have @mentions that don't exist in target instance. Mitigation: Accept this as out-of-scope; comments will still be readable.
- **Custom field identification**: "Acceptance Criteria[Paragraph]" field may have different custom field IDs across instances. Mitigation: Fetch by field name when available; gracefully skip if not found.

## Migration Plan

1. Deploy new code with `copyComments` flag (defaults to `false`).
2. Users will not see comment copying behavior unless they explicitly opt-in via the new checkbox.
3. No rollback needed: feature is additive and disabled by default.

## Open Questions

- Should we offer bulk comment copy preference in a "Settings" modal, or keep it per-migration? (Currently: per-migration via checkbox.)
- Should we expose a "copy comments only" mode for issues already migrated? (Currently: out of scope.)
