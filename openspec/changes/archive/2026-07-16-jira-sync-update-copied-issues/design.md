## Context

The current solution supports initial migration of issues from the source Jira to a target Jira, including mapping persistence. However, after migration, source issues are often changed (updated summary, revised description, new attachments), and those changes currently must be applied manually in the target. This design adds an explicit re-sync path for already mapped issues without changing the existing initial migration path.

## Goals / Non-Goals

**Goals:**
- Provide a safe update operation for already mapped issues.
- Synchronize summary and description from the source issue to the target issue.
- Transfer only new attachments from the source issue to avoid duplicates.
- Return clear per-issue feedback for full success, partial success, or failure.

**Non-Goals:**
- No bidirectional sync between source and target.
- No synchronization of additional fields such as status, priority, labels, or comments.
- No background/cron synchronization; updates are user-triggered only.

## Decisions

1. Explicit "Update" UI action per already mapped issue.
- Rationale: Prevents unintended writes and matches the existing manual-trigger approach.
- Alternative: Automatic update run after each search. Rejected due to load, rate limits, and lower traceability.

2. Server-side orchestration of update steps (read source, patch target, transfer attachments).
- Rationale: Centralized error handling, no PAT exposure in frontend requests, and consistent retry points.
- Alternative: Frontend orchestrates direct calls. Rejected due to higher complexity and weaker resilience.

3. Idempotent attachment synchronization via fingerprint comparison.
- Rationale: Goal is "upload only missing attachments." Jira attachment IDs are not usable across instances, so compare by filename plus size (and optionally hash where available).
- Alternative: Always re-download/re-upload all attachments. Rejected because of duplicates and unnecessary API load.

4. Return partial failures transparently instead of silently swallowing best-effort errors.
- Rationale: If field updates succeed but an upload fails, the UI must display a partial status.
- Alternative: Boolean success/failure only. Rejected because it hinders operational follow-up.

## Risks / Trade-offs

- [Attachment fingerprint may be ambiguous] -> Mitigation: Add optional hash-based comparison on collisions and return a warning in the response.
- [Jira API rate limits during batch updates] -> Mitigation: Process sequentially per issue, apply optional short delays, and return clear 429 messages.
- [Large attachments increase processing time] -> Mitigation: Show progress/loading status in the UI, enforce server-side timeouts, and provide clear retry guidance.
- [Different permissions between source and target] -> Mitigation: Return per-step errors with Jira response details so users can identify root causes.
