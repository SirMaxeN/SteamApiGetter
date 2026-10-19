# Steam API Getter

Steam API Getter is a secure Node.js web app for exporting Steam library data, micro icons, playtime stats, Store details, and recent games into a downloadable ZIP file.

## Description

This project provides a server-side Steam Web API toolkit for loading a public Steam library, browsing games in a modern dark UI, sorting and selecting titles, and exporting selected data as ZIP, JSON, or CSV files. The Steam API key is never sent to the browser; it is read only by the Node.js backend from hosting environment variables.

## Features

- Dark responsive UI built for desktop and mobile.
- Language selector: English by default, plus Polish, German, and Spanish.
- Secure server-side Steam Web API key handling.
- Table tabs for details and micro icons.
- ZIP exports include the selected tab data; the details export also includes Store metadata JSON/CSV when Steam returns it.
- Game table with search, select all, select visible, clear selection, and per-game checkboxes.
- Lazy table rendering: only the first batch of rows is rendered, then more rows load while scrolling.
- Lazy Store details: descriptions and review summaries load in small batches only for rendered rows.
- Sortable table headers; ZIP export follows the current filtered and sorted table order.
- ZIP export with progress bar, item count, ETA, and a download popup.
- Export cancellation that keeps a partial ZIP with files already collected.
- Production-friendly Node.js server with security headers, safe static file serving, request validation, API timeouts, and rate limits.
- In-memory Steam Store metadata cache, so repeated Store details exports do not refetch the same app metadata immediately.

## Requirements

- Node.js 18 or newer.
- A Steam Web API key.
- A hosting plan that can run a Node.js app behind your domain.

## Local Setup

Copy the example environment file:

```powershell
copy .env.example .env
```

Edit `.env` and set:

```text
STEAM_WEB_API_KEY=your_steam_key
PORT=5177
```

Start the app:

```powershell
npm.cmd start
```

Open:

```text
http://localhost:5177
```

## Secure Steam Key Configuration

The recommended setup is to keep the key in an environment variable:

```text
STEAM_WEB_API_KEY=your_steam_key
```

The frontend never receives or sends the Steam API key. Do not commit `.env`; it is ignored by git.

### Optional Encrypted Mode

You can store an encrypted key and keep the decryption secret only on the server:

```powershell
npm.cmd run encrypt-key -- "your_steam_key" "long_random_secret"
```

Then configure the server with:

```text
STEAM_WEB_API_KEY_ENCRYPTED=ssg1:...
STEAM_KEY_SECRET=long_random_secret
```

This only helps if `STEAM_KEY_SECRET` is never committed and exists only in the hosting environment.

## Deployment Under a Domain

In your hosting panel, create a Node.js app for the project directory and set:

```text
PORT=<port provided by hosting>
NODE_ENV=production
STEAM_WEB_API_KEY=your_steam_key
BASE_PATH=/web_apps/steam-api-getter
DEFAULT_PROFILE_LABEL=SirMaxeN
DEFAULT_STEAMID64=76561198040078356
```

If the panel asks for an entry file, use:

```text
app.js
```

If it asks for a start command, use:

```text
npm start
```

Point `/web_apps/steam-api-getter` to the Node.js app according to your hosting panel. The app serves both frontend files and API endpoints from the same origin.

## Build Upload Package

Create a clean server upload package with:

```powershell
npm.cmd run build
```

Upload the contents of `build/` to:

```text
web_apps/steam-api-getter/app
```

Do not upload `.env`, `.git`, `node_modules`, or local export folders. Production credentials are stored in the private app directory as `.env` with permissions `600`; the application loads them on startup.

## Security Defaults

The server includes:

- Steam key stored only on the server.
- No API key field in the browser.
- Same-origin API calls.
- CSP, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` headers.
- Safe static file path handling.
- Steam API request timeouts.
- Request body size limits.
- Export size limits.
- In-memory rate limits:

```text
RATE_LIMIT_IP_HOUR=5000
RATE_LIMIT_IP_DAY=20000
RATE_LIMIT_GLOBAL_DAY=50000
RATE_LIMIT_GLOBAL_MONTH=100000
MAX_EXPORT_GAMES=1000
STORE_CACHE_TTL_MS=86400000
```

For multi-process or high-traffic hosting, move rate-limit storage to Redis or another shared store.

## Export Flow

1. Load a Steam library with a profile URL, vanity name, or SteamID64.
2. Select one table/export tab:
   - Details: game name, icon, playtime, Steam client link, and SteamDB link
   - Micro icons: small Steam library icons
3. Select all games, visible games, or individual games.
4. Click `Export selected ZIP`.
5. Watch the progress bar and ETA.
6. Use `Stop export` if you want to stop a long export and keep a partial ZIP.
7. Download the generated ZIP from the popup.

ZIP names use this format:

```text
<profile>_<type>.zip
```

Examples: `SirMaxeN_details.zip`, `SirMaxeN_icons.zip`.

## Development Checks

```powershell
node --check server.js
node --check public\app.js
node --check scripts\encrypt-steam-key.js
```

Debug with:

```powershell
node --inspect server.js
```

Then open `chrome://inspect` in Chrome or Edge.

## Production layout

Public URL: https://komars.eu/web_apps/steam-api-getter/

The Node.js application lives in `~/web_apps/steam-api-getter/app`, outside the domain document root. CloudLinux maps the URL to this application. Only files in `public/` are served by the application; keep credentials, logs and backups private. The old kstrzebicka.pl URL redirects to the new URL.
