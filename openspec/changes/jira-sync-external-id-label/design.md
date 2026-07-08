## Context

During issue migration, we clone the ticket from the external JIRA to the internal JIRA. We want to tag the newly created ticket on the target instance with the external JIRA issue ID as a label (e.g. `EXT-1042`).

## Goals / Non-Goals

**Goals:**

- Include the external issue ID as a label in the internal JIRA ticket fields.
- Make it easier to search/filter tickets by external source IDs in the target JIRA instance.

**Non-Goals:**

- Copying or syncing existing labels from the external JIRA issue (we only tag the external issue ID itself).

## Decisions

### Decision 1: Use the `labels` field in JIRA REST API v2

In JIRA REST API `/rest/api/2/issue` POST payload, there is a `labels` field under `fields` which takes an array of strings:

```json
{
  "fields": {
    "project": { "key": "INT" },
    "summary": "...",
    "labels": ["EXT-1042"]
  }
}
```

We will pass the external `issueId` string directly as a single-element array inside this `labels` field.

## Risks / Trade-offs

- **Risk: invalid characters in labels** → JIRA labels must not contain spaces. Since JIRA issue keys (e.g., `EXT-1042`) only contain alphanumeric characters and hyphens, they are always valid JIRA labels.
