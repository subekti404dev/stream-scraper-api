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
- `id`: **IMDB ID format** (standard Stremio):
  - Movie: `tt0137523` (Fight Club)
  - Series: `tt0944947:1:1` (Game of Thrones S01E01)
    - Format: `{imdb_id}:{season}:{episode}`

**Note:** Uses standard Stremio IMDB IDs, not TMDB IDs.

## How It Works

1. **Stremio sends IMDB ID** → `/api/stremio/stream/movie/tt0137523.json`
2. **Load settings** → Gets `manifestUrl` from server settings
3. **Run scrape** → Uses existing scraper engine with IMDB ID
4. **Return streams** → Format compatible with Stremio

**Note:** IMDB → TMDB resolution happens inside the scraper engine when needed by providers.

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
# Fight Club (IMDB: tt0137523)
curl http://localhost:3000/api/stremio/stream/movie/tt0137523.json
```

### Test Series Stream

```bash
# Game of Thrones S01E01 (IMDB: tt0944947)
curl http://localhost:3000/api/stremio/stream/series/tt0944947:1:1.json
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

**"Invalid IMDB ID format"**
- IMDB ID must start with `tt` followed by numbers
- Example: `tt0137523` not `0137523` or `imdb:tt0137523`
- For series, use format: `tt0944947:1:1` (season:episode)

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
Stremio Request (IMDB ID)
  ↓
Manifest Endpoint (/api/stremio/manifest.json)
  ↓
Stream Endpoint (/api/stremio/stream/{type}/{id}.json)
  ↓
Load Server Settings (manifestUrl)
  ↓
Run Scraper Engine (with IMDB ID)
  ↓
Fetch Providers (from manifest)
  ↓
Run Workers (parallel scraping, IMDB→TMDB if needed)
  ↓
Normalize & Dedupe Streams
  ↓
Return to Stremio
```

## Performance

- **Scraping:** ~5-30s depending on provider count and timeout
- **Caching:** Provider results cached per request
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
- No subtitle support (providers focus on video streams)
- Some providers may need TMDB ID (automatic conversion inside scraper)

## Roadmap

- [x] Direct IMDB ID support (standard Stremio format)
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
