## Context

When migrating JIRA issues:

1. The target JIRA project might not have the same issue types (e.g., custom workflows, or different languages/naming). If we try to create an issue with a type that does not exist in the target project, the JIRA API will fail.
2. The external issues might have attachments (files, images) that are essential to copy over.

## Goals / Non-Goals

**Goals:**

- Dynamically detect if the source issue type is available in the target project.
- Prompt the user to select an existing target issue type if the source type is not available.
- Download attachments from the source issue and upload them to the target issue.

## Decisions

### Decision 1: Project Metadata Fetching

We will fetch the target project's metadata using `/rest/api/2/project/{key}` (using a new server function `getJiraProjectDetailsFn`). This endpoint returns the list of available `issuetypes` for that project.
Before performing migration:

1. We check if the target project details have already been fetched.
2. If the source issue type is not in the target project's `issuetypes`, we display an interactive Dialog to prompt the user to map the source type to one of the target project's available types.
3. Once selected, we save this mapping in `localStorage` under `jira_type_mapping_${targetProjectKey}` (mapping source issue type to target issue type) and proceed with the migration using the mapped type. Future migrations for the same project and source issue type will automatically reuse this saved mapping unless the user decides to change it.

### Decision 2: Backend Attachment Migration Flow

In `migrateJiraIssueFn`:

1. Retrieve issue details from the external JIRA. If `fields.attachment` contains files:
2. For each attachment:
   - Perform a GET request to the attachment's `content` URL (authenticating with the external PAT).
   - Retrieve the file content as an ArrayBuffer/Buffer.
   - Perform a POST request to `/rest/api/2/issue/{internalId}/attachments` (authenticating with the internal PAT).
   - Use a `FormData` payload containing the file buffer. We must set headers correctly (including `X-Atlassian-Token: no-check` required by JIRA attachments API).

## Risks / Trade-offs

- **Attachment Size**: Very large attachments could timeout or hit memory limits. We will add try/catch block around the attachment copy so that if copying attachments fails, the main issue is still successfully created, and we log/warn the user about the attachment copy failure.
