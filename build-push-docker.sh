#!/bin/bash
set -e

# Configuration
IMAGE_NAME="ghcr.io/${GITHUB_USERNAME:-subekti404dev}/stream-scraper-api"
VERSION="${VERSION:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Docker Multi-Arch Build & Push Script ===${NC}"
echo -e "Image: ${YELLOW}${IMAGE_NAME}:${VERSION}${NC}"
echo -e "Platforms: ${YELLOW}linux/amd64,linux/arm64/v8${NC}"
echo ""

# Check if logged in to GHCR
if ! docker info 2>/dev/null | grep -q "ghcr.io"; then
    echo -e "${YELLOW}Not logged in to ghcr.io${NC}"
    echo "Please login first:"
    echo "  echo \$GITHUB_TOKEN | docker login ghcr.io -u \$GITHUB_USERNAME --password-stdin"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if buildx is available
if ! docker buildx version &> /dev/null; then
    echo -e "${RED}Error: docker buildx not found${NC}"
    echo "Install it with: docker buildx install"
    exit 1
fi

# Create or use existing builder
BUILDER_NAME="multiarch-builder"
if ! docker buildx ls | grep -q "$BUILDER_NAME"; then
    echo -e "${GREEN}Creating buildx builder: ${BUILDER_NAME}${NC}"
    docker buildx create --name "$BUILDER_NAME" --driver docker-container --bootstrap
fi

echo -e "${GREEN}Using builder: ${BUILDER_NAME}${NC}"
docker buildx use "$BUILDER_NAME"

# Build and push multi-arch image
echo -e "${GREEN}Building and pushing multi-arch image...${NC}"
cd web

docker buildx build \
  --platform linux/amd64,linux/arm64/v8 \
  --tag "${IMAGE_NAME}:${VERSION}" \
  --tag "${IMAGE_NAME}:latest" \
  --push \
  --progress=plain \
  .

echo ""
echo -e "${GREEN}✓ Successfully built and pushed:${NC}"
echo -e "  ${YELLOW}${IMAGE_NAME}:${VERSION}${NC}"
echo -e "  ${YELLOW}${IMAGE_NAME}:latest${NC}"
echo ""
echo -e "${GREEN}Platforms:${NC}"
echo -e "  - linux/amd64"
echo -e "  - linux/arm64/v8"
echo ""
echo -e "${GREEN}Pull command:${NC}"
echo -e "  docker pull ${IMAGE_NAME}:${VERSION}"
