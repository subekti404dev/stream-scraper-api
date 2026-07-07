# Stremio Integration Guide

## Endpoints

### Manifest

```
GET /api/stremio/manifest.json
```

Returns Stremio addon manifest:

```json
{
  "id": "community.stream-scrapper",
  "version": "1.0.0",
  "name": "Stream Scrapper",
  "description": "scrape for stream",
  "resources": ["stream"],
  "types": ["movie", "series"],
  "catalogs": [],
  "idPrefixes": ["tmdb:"]
}
```

### Stream

```
GET /api/stremio/stream/{type}/{id}.json
```

**Parameters:**
- `type`: `movie` or `series`
- `id`: TMDB ID format:
  - Movie: `tmdb:550` (Fight Club)
  - Series: `tmdb:1399:1:1` (Game of Thrones S01E01)
    - Format: `tmdb:{tmdb_id}:{season}:{episode}`

**Response:**

```json
{
  "streams": [
    {
      "name": "Provider Name",
      "title": "1080p",
      "url": "https://example.com/stream.mp4"
    }
  ]
}
```

## How It Works

1. **Stremio sends TMDB ID** → `/api/stremio/stream/movie/tmdb:550.json`
2. **Resolve TMDB → IMDB** → Uses TMDB API `/external_ids` endpoint
3. **Load settings** → Gets `manifestUrl` from server settings
4. **Run scrape** → Uses existing scraper engine with providers
5. **Return streams** → Format compatible with Stremio

## Installation in Stremio

### Option 1: Direct URL

1. Open Stremio
2. Go to **Addons** → **Community Addons**
3. Click **Install from URL**
4. Enter your addon URL:
   ```
   https://your-domain.com/api/stremio/manifest.json
   ```
5. Click **Install**

### Option 2: Self-Hosted

If running locally:

```
http://localhost:3000/api/stremio/manifest.json
```

**Note:** Stremio desktop can access `localhost`. Stremio Web requires public HTTPS URL.

## Testing

### Test Manifest

```bash
curl http://localhost:3000/api/stremio/manifest.json
```

### Test Movie Stream

```bash
# Fight Club (TMDB ID: 550)
curl http://localhost:3000/api/stremio/stream/movie/tmdb:550.json
```

### Test Series Stream

```bash
# Game of Thrones S01E01 (TMDB ID: 1399)
curl http://localhost:3000/api/stremio/stream/series/tmdb:1399:1:1.json
```

## Requirements

1. **TMDB API Key** — Set in `.env`:
   ```bash
   TMDB_API_KEY=your_key_here
   ```

2. **Settings Configured** — Go to `/settings` and set:
   - Manifest URL (provider list)
   - Provider timeout

3. **Providers Enabled** — Go to `/providers` and toggle ON desired scrapers

## Debugging

### Check Server Logs

```bash
# Docker
docker logs -f stream-scraper

# Local dev
npm --prefix web run dev
```

Look for:
```
[Stremio Stream] Error: ...
```

### Common Issues

**"Could not resolve TMDB ID to IMDB ID"**
- TMDB ID might be invalid
- Check TMDB API key is set
- Verify TMDB ID exists: https://www.themoviedb.org/movie/{id}

**"Missing manifestUrl"**
- Go to `/settings` and configure manifest URL
- Default URL loads automatically if not set

**No streams returned**
- Check providers are enabled at `/providers`
- Verify provider timeout is sufficient (30s default)
- Some content may not be available

**CORS errors (browser only)**
- CORS is handled automatically
- If issues persist, check browser console

## Architecture

```
Stremio Request
  ↓
Manifest Endpoint (/api/stremio/manifest.json)
  ↓
Stream Endpoint (/api/stremio/stream/{type}/{id}.json)
  ↓
Resolve TMDB → IMDB (TMDB API)
  ↓
Load Server Settings (manifestUrl)
  ↓
Run Scraper Engine
  ↓
Fetch Providers (from manifest)
  ↓
Run Workers (parallel scraping)
  ↓
Normalize & Dedupe Streams
  ↓
Return to Stremio
```

## Performance

- **TMDB Resolution:** ~100-300ms (cached after first request)
- **Scraping:** ~5-30s depending on provider count and timeout
- **Caching:** TMDB lookups cached for 6 hours
- **Concurrency:** Up to 30 providers run in parallel

## Security

- CORS enabled for Stremio clients
- No authentication required (public addon)
- Rate limiting recommended for production
- TMDB API key kept server-side (never exposed)

## Production Deployment

### Docker

```bash
docker run -d \
  --name stream-scraper \
  -p 3000:3000 \
  -e TMDB_API_KEY=your_key \
  ghcr.io/subekti404dev/stream-scraper-api:latest
```

### HTTPS Required

Stremio Web requires HTTPS. Use:
- Cloudflare Tunnel
- Nginx reverse proxy with Let's Encrypt
- Cloudflare Pages/Workers

### Cloudflare Tunnel Example

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Create tunnel
./cloudflared tunnel login
./cloudflared tunnel create stream-scraper
./cloudflared tunnel route dns stream-scraper scraper.yourdomain.com

# Run tunnel
./cloudflared tunnel run stream-scraper --url http://localhost:3000
```

Your addon URL:
```
https://scraper.yourdomain.com/api/stremio/manifest.json
```

## Limitations

- No catalog support (search/browse) — only resolves direct requests
- Depends on upstream provider availability
- TMDB ID resolution required (no direct IMDB ID support yet)
- No subtitle support (providers focus on video streams)

## Roadmap

- [ ] Direct IMDB ID support (skip TMDB resolution)
- [ ] Catalog implementation (trending, popular)
- [ ] Stream quality filtering
- [ ] Subtitle support
- [ ] Provider health checks
- [ ] Rate limiting
- [ ] Authentication (optional)

## Contributing

Found a bug? Open an issue:
https://github.com/subekti404dev/stream-scraper-api/issues

---

**Note:** This addon aggregates streams from third-party providers. Ensure you comply with local laws and provider Terms of Service.
