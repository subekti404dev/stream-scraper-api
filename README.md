# Stream Scraper API

Next.js application untuk menjalankan provider scrapers yang didaftarkan via `manifest.json`. Mendukung dynamic provider management dengan toggle ON/OFF per provider.

## ✨ Fitur

- **Settings** — Konfigurasi `manifest.json` URL dan runner settings
- **Providers** — List provider dari manifest dengan toggle ON/OFF individual
- **Scrape** — Input `imdb_id`, `type` (`movie`/`tv`), `season`/`episode` untuk TV shows
- **Server-side scraping** — Via `POST /api/scrape` (lebih stabil, bypass CORS browser)
- **Multi-arch Docker** — Support amd64 dan arm64/v8

## 🚀 Quick Start

### Opsi 1: Docker (Recommended)

```bash
# Pull dan run
docker run -d \
  --name stream-scraper \
  -p 3000:3000 \
  -e TMDB_API_KEY=your_tmdb_api_key \
  -v $(pwd)/data:/app/data \
  ghcr.io/subekti404dev/stream-scraper-api:latest
```

Akses di `http://localhost:3000`

### Opsi 2: Development (Local)

#### 1. Clone repository

```bash
git clone https://github.com/subekti404dev/stream-scraper-api.git
cd stream-scraper-api
```

#### 2. Setup environment

```bash
# Copy template .env
cp .env.example .env

# Edit .env dan isi TMDB_API_KEY
# Dapatkan key dari: https://www.themoviedb.org/settings/api
nano .env
```

#### 3. Install dependencies

```bash
npm --prefix web install
```

#### 4. Run development server

```bash
npm --prefix web run dev
```

Akses di `http://localhost:3000`

## 📝 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TMDB_API_KEY` | **Yes** | - | TMDB API key untuk IMDB→TMDB resolution |
| `WEB_PORT` | No | `3000` | Port untuk Next.js server |
| `APP_SETTINGS_PATH` | No | `/tmp/scraper-app/settings.json` | Lokasi file settings |
| `DEFAULT_MANIFEST_URL` | No | (upstream) | Default provider manifest URL |

**Cara mendapatkan TMDB API Key:**
1. Buat akun di [themoviedb.org](https://www.themoviedb.org/signup)
2. Go to [API Settings](https://www.themoviedb.org/settings/api)
3. Request API key (pilih "Developer")
4. Copy "API Key (v3 auth)"

## 🐳 Docker

### Docker Compose

```yaml
version: '3.8'

services:
  scraper:
    image: ghcr.io/subekti404dev/stream-scraper-api:latest
    container_name: stream-scraper
    ports:
      - "3000:3000"
    environment:
      - TMDB_API_KEY=${TMDB_API_KEY}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

Run:

```bash
echo "TMDB_API_KEY=your_key" > .env
docker-compose up -d
```

### Build dari Source

```bash
# Manual build & push (multi-arch)
./build-push-docker.sh

# Atau dengan custom version
VERSION=v1.0.0 GITHUB_USERNAME=your-username ./build-push-docker.sh
```

Lihat [DOCKER.md](./DOCKER.md) untuk dokumentasi lengkap.

## 📱 Platform Support

Docker images tersedia untuk:
- **linux/amd64** — Intel/AMD x86_64 (cloud VMs, desktops)
- **linux/arm64/v8** — ARM64 (Raspberry Pi 4/5, Apple Silicon, AWS Graviton)

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Node.js 20
- **Styling**: Brutalist CSS (custom)
- **Scraping**: Cheerio, Crypto-JS
- **API**: RESTful endpoints

## 📂 Project Structure

```
.
├── web/                    # Next.js application
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── features/      # Feature modules
│   │   │   ├── scraper/   # Scraping engine
│   │   │   ├── settings/  # Settings management
│   │   │   ├── providers/ # Provider management
│   │   │   └── stremio/   # Stremio integration
│   │   └── shared/        # Shared utilities
│   ├── Dockerfile         # Production Docker image
│   └── package.json
├── .github/
│   └── workflows/         # GitHub Actions CI/CD
├── build-push-docker.sh   # Docker build script
├── DOCKER.md             # Docker documentation
└── README.md             # This file
```

## 🔧 Development

### Available Scripts

```bash
# Development server
npm --prefix web run dev

# Production build
npm --prefix web run build

# Start production server
npm --prefix web start

# Linting
npm --prefix web run lint
```

### Adding Providers

Providers dikelola via `manifest.json` yang di-load dari URL. Format:

```json
{
  "providers": [
    {
      "id": "provider-id",
      "name": "Provider Name",
      "url": "https://example.com/provider.js",
      "enabled": true
    }
  ]
}
```

## 📖 API Endpoints

### Scrape

```http
POST /api/scrape
Content-Type: application/json

{
  "imdb_id": "tt1234567",
  "type": "movie",
  "season": 1,      // Optional, for TV
  "episode": 1      // Optional, for TV
}
```

### Settings

```http
GET /api/settings
POST /api/settings
```

### TMDB Resolve

```http
GET /api/tmdb/resolve?imdb_id=tt1234567&type=movie
```

### Stremio Manifest

```http
GET /api/stremio/manifest.json
```

### Stremio Stream

```http
GET /api/stremio/stream/{type}/{id}.json
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - lihat [LICENSE](LICENSE) untuk detail.

## 🙏 Acknowledgments

- Provider scrapers dari [nuvio-providers](https://github.com/yoruix/nuvio-providers)
- TMDB untuk movie/TV metadata
- Next.js dan Vercel team

## 📞 Support

Jika menemukan bug atau punya pertanyaan:
- Open issue di [GitHub Issues](https://github.com/subekti404dev/stream-scraper-api/issues)
- Check [DOCKER.md](./DOCKER.md) untuk troubleshooting Docker

---

**Note**: Project ini hanya untuk tujuan edukasi. Pastikan mematuhi Terms of Service dari provider yang digunakan.
