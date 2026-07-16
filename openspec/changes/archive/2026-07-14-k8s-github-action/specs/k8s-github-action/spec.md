## ADDED Requirements

### Requirement: Docker Containerization

The system SHALL provide a Dockerfile configuration to build the application into a container image.

#### Scenario: Build Docker Image
- **WHEN** the Docker build command is executed on the Dockerfile
- **THEN** the system SHALL produce a production-ready image containing the compiled Node.js server starting at `.output/server/index.mjs`

### Requirement: GitHub Actions Build Pipeline

The build pipeline SHALL compile the application, build a Docker image, and publish it to the GitHub Container Registry on pushes to the main branch.

#### Scenario: Trigger CI Build
- **WHEN** code is pushed to the main branch
- **THEN** GitHub Actions SHALL trigger the build workflow, authenticate with GHCR, build the image, and push the tags `latest` and the commit SHA
