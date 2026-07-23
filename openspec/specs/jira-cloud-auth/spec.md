# jira-cloud-auth Specification

## Purpose

Defines authentication requirements for connecting to Jira Cloud (Atlassian Cloud) as the external Jira instance, using email + API token via HTTP Basic Auth instead of the Server/Data Center PAT/Bearer scheme.

## Requirements

### Requirement: Jira Cloud Authentication Configuration

The system SHALL support Jira Cloud (Atlassian Cloud) as an authentication mode for the external Jira instance, using an email address and an API token via HTTP Basic Auth (`Authorization: Basic base64(email:apiToken)`).

#### Scenario: User configures external Jira as Cloud

- **WHEN** the user selects "Cloud" as the instance type for the external Jira in the settings form, enters a valid Jira Cloud URL, email address, and API token, and clicks "Save"
- **THEN** the system SHALL persist `instanceType: "cloud"`, the email, and the API token in `localStorage` and show a success notification

#### Scenario: User configures external Jira as Server / Data Center

- **WHEN** the user selects "Server / Data Center" as the instance type for the external Jira, enters a URL and PAT, and clicks "Save"
- **THEN** the system SHALL persist `instanceType: "server"` and the PAT in `localStorage`, with no email required

#### Scenario: Backward-compatible load of existing configuration

- **WHEN** the application loads a previously saved external Jira configuration that has no `instanceType` field
- **THEN** the system SHALL treat that configuration as `instanceType: "server"` and continue to work without requiring user re-entry

### Requirement: Cloud-aware Authorization Header

The system SHALL construct the correct `Authorization` HTTP header for all server-side requests to the external Jira instance based on the configured instance type.

#### Scenario: Server-side call to a Cloud external instance

- **WHEN** a server function makes an HTTP request to the external Jira and the configuration has `instanceType: "cloud"`
- **THEN** the system SHALL send `Authorization: Basic <base64(email:apiToken)>` and SHALL NOT send a Bearer header

#### Scenario: Server-side call to a Server / Data Center external instance

- **WHEN** a server function makes an HTTP request to the external Jira and the configuration has `instanceType: "server"` (or no `instanceType`)
- **THEN** the system SHALL send `Authorization: Bearer <pat>` as before
