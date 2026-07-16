## 1. API and service extension

- [x] 1.1 Add a server endpoint for "update mapped issue" and validate inputs (source issue key + mapped target key).
- [x] 1.2 Extend the Jira service with an update operation for summary/description on an existing target issue.
- [x] 1.3 Implement attachment comparison (fingerprint by name+size, optional hash hook) and upload only missing files.
- [x] 1.4 Model a structured result response (success | partial | failure, including failed attachments).

## 2. UI integration in the dashboard

- [x] 2.1 Add an "Update" action for each mapped row and disable/hide it for unmapped rows.
- [x] 2.2 Represent loading, success, and error states per row (including partial-failure attachment details).
- [x] 2.3 Keep the existing mapping view unchanged and add only the re-sync flow.

## 3. Robustness and error handling

- [x] 3.1 Add error classification for permission errors, rate limits, and timeout cases, and display user-friendly messages.
- [x] 3.2 Define retryable points (especially attachment uploads) without creating duplicate files.

## 4. Verification

- [ ] 4.1 Test case: Updating a mapped issue updates summary and description in the target.
- [ ] 4.2 Test case: Existing attachments are not duplicated, and new attachments are transferred.
- [ ] 4.3 Test case: A partial failure on at least one attachment returns status "partial" with detailed information.
- [ ] 4.4 Perform a manual end-to-end check in the dashboard against source/target Jira with clear UI feedback.
