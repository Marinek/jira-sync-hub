## 1. Server-Side Infrastructure

- [x] 1.1 Add `copyComments: boolean` parameter to `migrateJiraIssueFn` signature in `src/lib/jira-server.ts`
- [x] 1.2 Add `copyComments: boolean` parameter to `updateMappedJiraIssueFn` signature in `src/lib/jira-server.ts`
- [x] 1.3 Create helper function to post comments to a Jira issue (handle both Server/DC v2 and Cloud v3 endpoints)
- [x] 1.4 Implement comment fetching from source issue (reuse existing comment fetch logic or create shared helper)
- [x] 1.5 Add "Acceptance Criteria[Paragraph]" custom field to the fields parameter in `getJiraIssueDetailsFn`
- [x] 1.6 Create helper function to fetch Acceptance Criteria custom field by name (handle field ID discovery)

## 2. Migration Comment Copying

- [x] 2.1 In `migrateJiraIssueFn`: after successfully creating the target issue, conditionally fetch and copy comments if `copyComments === true`
- [x] 2.2 Handle comment copy failures gracefully—log errors but do not block the migration
- [x] 2.3 Return comment copy result in the migration response (e.g., `{ copiedCount: N, failedCount: M, errors: [...] }`)

## 3. Update Comment Copying

- [x] 3.1 In `updateMappedJiraIssueFn`: after successfully updating summary/description and attachments, conditionally fetch and copy comments if `copyComments === true`
- [x] 3.2 Avoid copying duplicate comments—track which comments already exist on the target before posting
- [x] 3.3 Handle comment copy failures gracefully (same as migration)
- [x] 3.4 Include comment copy result in the update response

## 4. UI: Migration Dialog

- [x] 4.1 Add checkbox "Copy comments" to the migration confirmation/settings area in `src/components/MigrationDashboard.tsx`
- [x] 4.2 Wire checkbox state to the migrate button click handler
- [x] 4.3 Pass `copyComments` flag to `migrateJiraIssueFn` call
- [x] 4.4 Display comment copy result (if any) in the success toast/message

## 5. UI: Update Flow

- [x] 5.1 Add checkbox "Copy new comments" to the update confirmation dialog in `src/components/MigrationDashboard.tsx`
- [x] 5.2 Wire checkbox state to the update button click handler
- [x] 5.3 Pass `copyComments` flag to `updateMappedJiraIssueFn` call
- [x] 5.4 Display comment copy result (if any) in the success/partial-success toast/message

## 6. Acceptance Criteria Display in Details Dialog

- [x] 6.1 Extend the issue details dialog to display "Acceptance Criteria" section when field is present
- [x] 6.2 Add styling/formatting for the acceptance criteria section (e.g., light background, clear heading)
- [x] 6.3 Handle ADF conversion for Cloud acceptance criteria (if returned as ADF format)

## 7. Acceptance Criteria Concatenation on Migration

- [x] 7.1 In `migrateJiraIssueFn`: after fetching source issue details, check if acceptance criteria field is present and non-empty
- [x] 7.2 If present, construct concatenated description: `{original_description}\n\n## Acceptance Criteria\n\n{acceptance_criteria}`
- [x] 7.3 Include the concatenated description in the target issue creation payload
- [x] 7.4 Handle cases where source description is empty (start with "## Acceptance Criteria" heading)

## 8. Testing & Validation

- [ ] 8.1 Test migration with `copyComments=false` (existing behavior, no comments copied)
- [ ] 8.2 Test migration with `copyComments=true` on a Server/DC instance and verify comments appear on target
- [ ] 8.3 Test migration with `copyComments=true` on a Cloud instance and verify comments appear on target (ADF handling)
- [ ] 8.4 Test update with `copyComments=false` (existing behavior)
- [ ] 8.5 Test update with `copyComments=true` and verify only missing comments are posted (no duplicates)
- [ ] 8.6 Test comment copy failure scenario (e.g., disable auth briefly) and verify migration/update still succeeds with partial result
- [ ] 8.7 Verify UI checkboxes are present, functional, and do not persist across page reloads (session-only preference)
- [ ] 8.8 Test acceptance criteria display in details dialog on issue with criteria
- [ ] 8.9 Test acceptance criteria display in details dialog on issue without criteria (section not shown)
- [ ] 8.10 Test migration with acceptance criteria concatenation (verify heading and formatting in target issue description)
- [ ] 8.11 Test migration without acceptance criteria (no extra section added to description)
- [ ] 8.12 Test acceptance criteria with both Server/DC and Cloud source instances (verify ADF conversion if needed)