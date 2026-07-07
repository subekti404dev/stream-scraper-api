## Scraper App (Manifest Providers)

Next.js app untuk menjalankan provider scrapers yang didaftarkan via `manifest.json` (repo URL dinamis, provider bisa on/off).

### Fitur

- **Settings**: set `manifest.json` URL + konfigurasi runner.
- **Providers**: list provider dari manifest + toggle ON/OFF per provider.
- **Scrape**: input `imdb_id`, `type` (`movie|tv`), `season/episode` (opsional untuk tv), jalankan scraping **server-side** via `POST /api/scrape` (lebih stabil, tidak kena CORS browser).

## Getting Started

### 1) Install deps

```bash
npm -C web install
```

### 2) Set env TMDB API Key (untuk IMDB→TMDB resolve)

Scrape input menggunakan `imdb_id`, sementara banyak provider butuh `tmdb_id`. Backend membutuhkan env var berikut:

```bash
export TMDB_API_KEY="YOUR_TMDB_API_KEY"
```

### 3) Run dev server

Run dari folder `web/`:

```bash
npm -C web run dev
```

Open `http://localhost:3000` lalu mulai dari:

- `/settings`
- `/providers`
- `/scrape`

### Dependencies provider yang sudah di-install

- `cheerio-without-node-native`
- `crypto-js`

