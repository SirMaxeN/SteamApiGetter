# Server Upload Package

Upload the contents of this folder to:

domains/kstrzebicka.pl/public_html/games/steam-api-getter

Do not upload a local .env file. Configure secrets in the hosting environment variables panel.

Required environment variables:

STEAM_WEB_API_KEY=your_real_steam_api_key
BASE_PATH=/games/steam-api-getter
DEFAULT_PROFILE_LABEL=SirMaxeN
DEFAULT_STEAMID64=76561198040078356
NODE_ENV=production

Startup file:

app.js
