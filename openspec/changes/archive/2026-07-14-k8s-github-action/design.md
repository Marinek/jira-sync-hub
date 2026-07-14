## Context

To run this TanStack Start application in a Kubernetes cluster, we need to build a container image and store it in a container registry. The application also uses a local JSON file (`data/mappings.json`) to persist migration mappings, which requires consideration for persistent storage in Kubernetes.

## Goals / Non-Goals

**Goals:**
- Containerize the TanStack Start application using a Dockerfile.
- Configure a multi-stage Docker build to keep the runner image size minimal.
- Build the server output using the standard `node-server` Nitro preset so it can run via Node.js in the container.
- Automate building and pushing the image to GitHub Container Registry (GHCR) using a GitHub Actions workflow on pushes to the `main` branch.

**Non-Goals:**
- Writing Kubernetes manifest files (YAMLs) for deployment, service, ingress, etc. (we only build the container image suitable for k8s).

## Decisions

### 1. Dockerfile Multi-Stage Build
- **Builder Stage**: Uses a complete Node.js alpine image, runs `npm ci`, sets `NITRO_PRESET=node-server`, and compiles the application via `npm run build`.
- **Runner Stage**: Uses a fresh lightweight Node.js alpine image. Only copies the compiled `.output` directory and sets the startup command to `node .output/server/index.mjs`.
  - *Rationale*: Keeps the production image clean, small, and free from development-only modules.

### 2. Handling Persisted Mappings
- **Data Persistence**: The server reads/writes to `data/mappings.json` located relative to the current working directory (`process.cwd()`).
- **Kubernetes mount recommendation**: The deployment should mount a persistent volume at `/app/data` to ensure mappings persist across container restarts. We will make sure the runner stage creates this folder with appropriate permissions.

### 3. GitHub Actions Workflow Trigger and Registry
- **Registry**: GitHub Container Registry (`ghcr.io`) will be used because it integrates seamlessly with repository permissions.
- **Workflow Triggers**: Trigger the build on pushes to the `main` branch or on manual triggers (`workflow_dispatch`).
- **Tags**: Generate tags for the commit SHA and `latest`.

## Risks / Trade-offs

- **Risk: Permission issues with local volume mounts** → Alpine images run as root by default unless a non-root user is configured.
  - *Mitigation*: Ensure the runner stage creates the `/app/data` directory before running so it has the correct permissions when local mounts are initialized.
