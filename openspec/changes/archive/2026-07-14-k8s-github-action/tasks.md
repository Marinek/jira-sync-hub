## 1. Docker Configuration

- [x] 1.1 Create the multi-stage `Dockerfile` configured to build with `NITRO_PRESET=node-server` and run via alpine Node.js runner stage
- [x] 1.2 Create `.dockerignore` file containing typical ignore directories (node_modules, .git, .output, etc.)

## 2. GitHub Actions Integration

- [x] 2.1 Create `.github/workflows/build-k8s-image.yml` defining the push triggers, checkout, GHCR authentication, and image build/push steps
- [x] 2.2 Verify the local Dockerfile compiles successfully by executing a local mock build command
