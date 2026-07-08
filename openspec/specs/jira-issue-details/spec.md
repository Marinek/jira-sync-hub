# jira-issue-details Specification

## Purpose

TBD - created by archiving change jira-view-comments-and-text. Update Purpose after archive.

## Requirements

### Requirement: Issue Description and Comments Fetching

The system SHALL fetch the description text and comment history of an external Jira issue from the JIRA API.

#### Scenario: Fetch description and comments from JIRA API

- **WHEN** the user expands or requests details for a specific external issue
- **THEN** the system SHALL call the server function to fetch the issue's description and comment history from the external Jira instance and show a loading indicator

### Requirement: Rich Detail Display

The system SHALL render the description and formatted comments of the external issue in a readable dashboard component.

#### Scenario: Display formatted text and comment history

- **WHEN** the description and comments are successfully loaded
- **THEN** the system SHALL display the issue description and comment thread (with user names, initials, and formatting) in a modal or side drawer, excluding files and attachments.
