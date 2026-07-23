# issue-comments-sync Specification

## Purpose

Defines requirements for optional comment synchronization during issue migration and update, and display of Acceptance Criteria fields from source Jira issues.

## Requirements

### Requirement: Optional Comment Synchronization on Migration

The system SHALL support optional copying of all comments from a source Jira issue to a target Jira issue during migration operations. Users SHALL have control over whether comments are copied on a per-migration basis.

#### Scenario: User enables comment copying during migration

- **WHEN** the user selects "Copy comments" checkbox before clicking "Migrate" on an external issue
- **THEN** the system SHALL, after successfully creating the target issue, fetch all comments from the source issue and post them to the target issue with author name and original timestamp preserved

#### Scenario: User skips comment copying during migration

- **WHEN** the user leaves "Copy comments" unchecked before clicking "Migrate"
- **THEN** the system SHALL complete the migration without copying any comments, as before

#### Scenario: Comment copying fails gracefully

- **WHEN** comment copying is enabled but fails (e.g., due to network error or rate limit) for one or more comments
- **THEN** the system SHALL log the error, skip the failed comments, continue with remaining comments, and return a partial success result indicating how many comments were copied and how many failed

### Requirement: Optional Comment Synchronization on Update

The system SHALL support optional copying of newly added comments from the source issue to the target issue during update operations. Users SHALL have control over whether comments are copied on a per-update basis.

#### Scenario: User enables comment copying during update

- **WHEN** the user selects "Copy new comments" checkbox before clicking "Update" on an external issue that has an existing target mapping
- **THEN** the system SHALL, after successfully updating summary and description, fetch all comments from the source issue and post any comments not yet present on the target issue

#### Scenario: User skips comment copying during update

- **WHEN** the user leaves "Copy new comments" unchecked before clicking "Update"
- **THEN** the system SHALL complete the update without copying any comments, as before

### Requirement: Display Acceptance Criteria in Issue Details

The system SHALL fetch and display the "Acceptance Criteria[Paragraph]" custom field from the source issue in the issue details dialog as a separate section when available.

#### Scenario: Issue has Acceptance Criteria

- **WHEN** the user opens the issue details dialog for an external issue that has a non-empty "Acceptance Criteria[Paragraph]" field
- **THEN** the system SHALL display the acceptance criteria text in a clearly labeled "Acceptance Criteria" section below the description

#### Scenario: Issue lacks Acceptance Criteria

- **WHEN** the user opens the issue details dialog for an external issue that does not have an "Acceptance Criteria[Paragraph]" field or it is empty
- **THEN** the system SHALL not display an acceptance criteria section

### Requirement: Include Acceptance Criteria in Migration Description

The system SHALL concatenate the "Acceptance Criteria[Paragraph]" field with the target issue description during migration when the field is present in the source issue.

#### Scenario: Migrate issue with Acceptance Criteria

- **WHEN** the user migrates an external issue that has a non-empty "Acceptance Criteria[Paragraph]" field
- **THEN** the system SHALL append the acceptance criteria to the target issue description with an "## Acceptance Criteria" heading, preserving the original source description and criteria text

#### Scenario: Migrate issue without Acceptance Criteria

- **WHEN** the user migrates an external issue that does not have an "Acceptance Criteria[Paragraph]" field or it is empty
- **THEN** the system SHALL migrate the issue with only the source description, without adding any acceptance criteria section
