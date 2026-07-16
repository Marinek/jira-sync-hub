## Why

To deploy the application to a Kubernetes (k8s) cluster, we need to containerize the TanStack Start application. Automating this building and pushing process through a GitHub Actions workflow ensures consistent, reproducible image builds on every release or push to the main branch.

## What Changes

- Add a `Dockerfile` configuration optimized for building and running the TanStack Start application.
- Add a `.dockerignore` file to exclude local build artifacts and node modules from the Docker context.
- Create a GitHub Actions workflow `.github/workflows/build-k8s-image.yml` that builds the Docker image and pushes it to the GitHub Container Registry (GHCR).

## Capabilities

### New Capabilities
<!-- None: This is a tooling and infrastructure change, no new user-facing capabilities are introduced. -->

### Modified Capabilities
<!-- None -->

## Impact

- Infrastructure / CI/CD: Adds Docker configuration and GitHub Action workflow. No impact on existing source code or application runtime dependencies.
