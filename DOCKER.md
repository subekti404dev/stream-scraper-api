# Docker Build & Deploy Guide

## Quick Start

### Pull from GitHub Container Registry

```bash
# Pull latest image (multi-arch: amd64, arm64/v8)
docker pull ghcr.io/YOUR_USERNAME/stream-scraper-api:latest

# Run container
docker run -d \
  --name stream-scraper \
  -p 3000:3000 \
  -e TMDB_API_KEY=your_tmdb_api_key_here \
  -v $(pwd)/data:/app/data \
  ghcr.io/YOUR_USERNAME/stream-scraper-api:latest
```

## Manual Build & Push

### Prerequisites

1. **Docker with buildx** (for multi-arch builds)
2. **GitHub Personal Access Token** with `write:packages` scope
3. **Login to GHCR**:

```bash
export GITHUB_USERNAME="your-username"
export GITHUB_TOKEN="your-token"

echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin
```

### Build & Push Script

Use the provided script:

```bash
# Build and push with default settings
./build-push-docker.sh

# Build and push with custom version
VERSION=v1.0.0 ./build-push-docker.sh

# Build and push with custom username
GITHUB_USERNAME=your-username ./build-push-docker.sh
```

The script will:
- Create a multi-arch builder if needed
- Build for `linux/amd64` and `linux/arm64/v8`
- Push to `ghcr.io/YOUR_USERNAME/stream-scraper-api`
- Tag as both `:latest` and `:VERSION`

### Manual Build Commands

If you prefer manual control:

```bash
# Create builder
docker buildx create --name multiarch-builder --driver docker-container --bootstrap
docker buildx use multiarch-builder

# Build and push
cd web
docker buildx build \
  --platform linux/amd64,linux/arm64/v8 \
  --tag ghcr.io/YOUR_USERNAME/stream-scraper-api:latest \
  --push \
  .
```

## GitHub Actions (Automated)

The repo includes a GitHub Actions workflow that automatically builds and pushes on:
- **Push to `main`**: Tagged as `latest`
- **Version tags** (`v*`): Tagged with version number
- **Manual trigger**: Via GitHub UI

### Setup

1. Push this repo to GitHub
2. Go to **Settings → Packages**
3. Ensure package visibility is set (public/private)
4. The workflow will run automatically on push

No secrets needed — uses `GITHUB_TOKEN` automatically.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TMDB_API_KEY` | Yes | - | TMDB API key for IMDB→TMDB resolution |
| `WEB_PORT` | No | `3000` | Port for Next.js server |
| `APP_SETTINGS_PATH` | No | `/app/data/settings.json` | Settings file location |
| `DEFAULT_MANIFEST_URL` | No | (upstream URL) | Default provider manifest |

## Docker Compose

Example `docker-compose.yml`:

```yaml
version: '3.8'

services:
  scraper:
    image: ghcr.io/YOUR_USERNAME/stream-scraper-api:latest
    container_name: stream-scraper
    ports:
      - "3000:3000"
    environment:
      - TMDB_API_KEY=${TMDB_API_KEY}
      - APP_SETTINGS_PATH=/app/data/settings.json
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

Run with:

```bash
# Create .env file with TMDB_API_KEY
echo "TMDB_API_KEY=your_key_here" > .env

# Start
docker-compose up -d

# View logs
docker-compose logs -f scraper
```

## Platform Support

Built for:
- **linux/amd64** — Intel/AMD x86_64 (most cloud VMs, desktops)
- **linux/arm64/v8** — ARM64 (Raspberry Pi 4/5, Apple Silicon via Docker Desktop, AWS Graviton)

Docker automatically pulls the correct architecture.

## Verify Multi-Arch

Check supported platforms:

```bash
docker buildx imagetools inspect ghcr.io/YOUR_USERNAME/stream-scraper-api:latest
```

Output should show:
```
MediaType: application/vnd.docker.distribution.manifest.list.v2+json
Platforms:
  - linux/amd64
  - linux/arm64
```

## Troubleshooting

### Build fails on ARM

```bash
# Install QEMU for cross-compilation
docker run --privileged --rm tonistiigi/binfmt --install all
```

### Permission denied on script

```bash
chmod +x build-push-docker.sh
```

### Login fails

```bash
# Check token has write:packages scope
# Regenerate token at: https://github.com/settings/tokens
```

## Registry URL

Your images will be at:
```
ghcr.io/YOUR_USERNAME/stream-scraper-api:latest
ghcr.io/YOUR_USERNAME/stream-scraper-api:v1.0.0
```

Replace `YOUR_USERNAME` with your actual GitHub username (lowercase).
