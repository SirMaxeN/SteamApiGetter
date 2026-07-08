import { createServer } from "node:http";
import { readFile, readFileSync } from "node:fs";
import { createDecipheriv, pbkdf2Sync, randomUUID } from "node:crypto";
import { extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));

loadDotEnv();

const PORT = Number(process.env.PORT || 5177);
const BASE_PATH = normalizeBasePath(process.env.BASE_PATH || "");
const PUBLIC = join(ROOT, "public");
const STEAM_API_KEY = loadSteamApiKey();
const MAX_EXPORT_GAMES = Number(process.env.MAX_EXPORT_GAMES || 1000);
const JOB_TTL_MS = Number(process.env.EXPORT_JOB_TTL_MS || 20 * 60 * 1000);
const STEAM_TIMEOUT_MS = Number(process.env.STEAM_TIMEOUT_MS || 15000);
const STORE_CACHE_TTL_MS = Number(process.env.STORE_CACHE_TTL_MS || 24 * 60 * 60 * 1000);
const DEFAULT_PROFILE_LABEL = process.env.DEFAULT_PROFILE_LABEL || "SirMaxeN";
const DEFAULT_STEAMID64 = process.env.DEFAULT_STEAMID64 || "76561198040078356";
const VALID_TYPES = new Set(["microIcons", "libraryJson", "playtimeCsv", "recentGames", "storeDetails"]);

const jobs = new Map();
const storeCache = new Map();
const rateState = {
  ipHour: new Map(),
  ipDay: new Map(),
  globalDay: new Map(),
  globalMonth: new Map()
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function loadDotEnv() {
  try {
    const env = readFileSync(join(ROOT, ".env"), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (!match) continue;

      const key = match[1];
      let value = match[2].trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Could not read local .env file.");
  }
}

function decryptSteamApiKey(encrypted, secret) {
  const parts = String(encrypted || "").split(":");
  if (parts.length !== 5 || parts[0] !== "ssg1") {
    throw new Error("Invalid STEAM_WEB_API_KEY_ENCRYPTED format.");
  }

  const salt = Buffer.from(parts[1], "base64");
  const iv = Buffer.from(parts[2], "base64");
  const tag = Buffer.from(parts[3], "base64");
  const ciphertext = Buffer.from(parts[4], "base64");
  const key = pbkdf2Sync(secret, salt, 310000, 32, "sha256");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8").trim();
}

function loadSteamApiKey() {
  const plain = process.env.STEAM_WEB_API_KEY?.trim();
  if (plain) return plain;

  const encrypted = process.env.STEAM_WEB_API_KEY_ENCRYPTED?.trim();
  if (!encrypted) return "";

  const secret = process.env.STEAM_KEY_SECRET?.trim();
  if (!secret) {
    console.warn("STEAM_WEB_API_KEY_ENCRYPTED is set, but STEAM_KEY_SECRET is missing.");
    return "";
  }

  try {
    return decryptSteamApiKey(encrypted, secret);
  } catch {
    console.warn("Could not decrypt STEAM_WEB_API_KEY_ENCRYPTED.");
    return "";
  }
}

function securityHeaders(extra = {}) {
  return {
    "content-security-policy": [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data: https://media.steampowered.com https://cdn.cloudflare.steamstatic.com",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'"
    ].join("; "),
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    ...extra
  };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, securityHeaders(headers));
  res.end(body);
}

function sendJson(res, status, body) {
  send(res, status, JSON.stringify(body), {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
}

function sendSafeError(res, status, message) {
  sendJson(res, status, { error: message });
}

function ensureSteamApiKey(res) {
  if (STEAM_API_KEY) return true;
  sendSafeError(res, 503, "Steam API key is not configured on the server.");
  return false;
}

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function limitBucket(map, key, limit, windowMs) {
  const now = Date.now();
  const bucket = map.get(key);
  if (!bucket || bucket.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function checkRateLimit(req) {
  const ip = getIp(req);
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const month = 30 * day;

  return (
    limitBucket(rateState.ipHour, ip, Number(process.env.RATE_LIMIT_IP_HOUR || 5000), hour) &&
    limitBucket(rateState.ipDay, ip, Number(process.env.RATE_LIMIT_IP_DAY || 20000), day) &&
    limitBucket(rateState.globalDay, "global", Number(process.env.RATE_LIMIT_GLOBAL_DAY || 50000), day) &&
    limitBucket(rateState.globalMonth, "global", Number(process.env.RATE_LIMIT_GLOBAL_MONTH || 100000), month)
  );
}

function cleanName(value) {
  return String(value || "unknown")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function cleanFilenamePart(value) {
  return cleanName(value)
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "steam";
}

function exportTypeName(types) {
  if (types.includes("storeDetails")) return "details";
  if (types.includes("microIcons")) return "icons";
  return cleanFilenamePart(types.join("_") || "export");
}

function normalizeBasePath(value) {
  const raw = String(value || "").trim().replace(/\/+$/g, "");
  if (!raw || raw === "/") return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function stripBasePath(pathname) {
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH) return "/";
  if (pathname.startsWith(`${BASE_PATH}/`)) return pathname.slice(BASE_PATH.length) || "/";
  return pathname;
}

function withBasePath(pathname) {
  return `${BASE_PATH}${pathname}`;
}

function profileLabelForExport(profile, steamid, requestedLabel) {
  const rawLabel = cleanFilenamePart(requestedLabel || "");
  if (rawLabel && !/^\d{17}$/.test(rawLabel)) return rawLabel;

  const parsed = profileInputToSteamId(profile);
  if (parsed.vanity) return cleanFilenamePart(parsed.vanity);
  if (steamid === DEFAULT_STEAMID64 || profile === DEFAULT_STEAMID64) return cleanFilenamePart(DEFAULT_PROFILE_LABEL);
  return cleanFilenamePart(rawLabel || profile || steamid || "steam");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function steamImageUrl(appid, hash) {
  return hash ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${hash}.jpg` : "";
}

function profileInputToSteamId(value) {
  const raw = String(value || "").trim();
  if (/^\d{17}$/.test(raw)) return { steamid: raw };

  const match = raw.match(/steamcommunity\.com\/(?:id|profiles)\/([^/?#]+)/i);
  if (match?.[1]) {
    const profilePart = decodeURIComponent(match[1]);
    if (/^\d{17}$/.test(profilePart)) return { steamid: profilePart };
    return { vanity: profilePart };
  }

  if (/^[a-z0-9_-]{2,64}$/i.test(raw)) return { vanity: raw };
  return {};
}

async function parseJsonBody(req, maxBytes = 64 * 1024) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) {
      throw new Error("Request body is too large.");
    }
  }
  if (!body.trim()) return {};
  return JSON.parse(body);
}

function combineSignals(...signals) {
  const activeSignals = signals.filter(Boolean);
  if (activeSignals.length === 1) return activeSignals[0];
  if (typeof AbortSignal.any === "function") return AbortSignal.any(activeSignals);

  const controller = new AbortController();
  for (const signal of activeSignals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

async function steamFetchJson(endpoint, params, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STEAM_TIMEOUT_MS);
  const requestSignal = combineSignals(controller.signal, signal);
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url, { signal: requestSignal });
    const text = await response.text();
    if (!response.ok) throw new Error(`Steam API returned ${response.status}.`);

    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Steam API did not return valid JSON.");
    }
  } finally {
    clearTimeout(timer);
  }
}

async function resolveSteamId(key, profileInput, signal) {
  const parsed = profileInputToSteamId(profileInput);
  if (parsed.steamid) return parsed.steamid;
  if (!parsed.vanity) throw new Error("Enter a SteamID64, a Steam profile link, or a vanity profile name.");

  const data = await steamFetchJson("https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/", {
    key,
    vanityurl: parsed.vanity,
    format: "json"
  }, signal);

  if (data?.response?.success !== 1 || !data?.response?.steamid) {
    throw new Error(`Could not resolve "${parsed.vanity}" to a SteamID64.`);
  }
  return data.response.steamid;
}

async function fetchOwnedGames({ key, steamid, includeFree, signal }) {
  const data = await steamFetchJson("https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/", {
    key,
    steamid,
    include_appinfo: "true",
    include_played_free_games: includeFree ? "true" : "false",
    format: "json"
  }, signal);

  const games = data?.response?.games;
  if (!Array.isArray(games)) return { count: 0, totalPlaytimeMinutes: 0, games: [] };

  const normalized = games
    .map((game) => ({
      appid: Number(game.appid),
      name: game.name || `App ${game.appid}`,
      playtimeForeverMinutes: Number(game.playtime_forever || 0),
      playtimeTwoWeeksMinutes: Number(game.playtime_2weeks || 0),
      iconHash: game.img_icon_url || "",
      logoHash: game.img_logo_url || "",
      iconUrl: steamImageUrl(game.appid, game.img_icon_url),
      logoUrl: steamImageUrl(game.appid, game.img_logo_url)
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  return {
    count: data.response.game_count ?? normalized.length,
    totalPlaytimeMinutes: normalized.reduce((sum, game) => sum + game.playtimeForeverMinutes, 0),
    games: normalized
  };
}

async function fetchRecentGames({ key, steamid, signal }) {
  const data = await steamFetchJson("https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/", {
    key,
    steamid,
    count: "20",
    format: "json"
  }, signal);

  return Array.isArray(data?.response?.games) ? data.response.games : [];
}

async function fetchStoreDetails(appid, signal) {
  const cached = storeCache.get(appid);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const detailsUrl = new URL("https://store.steampowered.com/api/appdetails");
  detailsUrl.searchParams.set("appids", String(appid));
  detailsUrl.searchParams.set("filters", "basic,genres,metacritic,recommendations,release_date");

  const reviewsUrl = new URL(`https://store.steampowered.com/appreviews/${appid}`);
  reviewsUrl.searchParams.set("json", "1");
  reviewsUrl.searchParams.set("language", "all");
  reviewsUrl.searchParams.set("purchase_type", "all");
  reviewsUrl.searchParams.set("num_per_page", "0");

  const [details, reviews] = await Promise.all([
    fetchPublicSteamJson(detailsUrl, signal).catch(() => ({})),
    fetchPublicSteamJson(reviewsUrl, signal).catch(() => ({}))
  ]);

  const app = details?.[appid]?.data || {};
  const reviewSummary = reviews?.query_summary || {};

  const value = {
    appid,
    name: app.name || `App ${appid}`,
    shortDescription: app.short_description || "",
    type: app.type || "",
    releaseDate: app.release_date?.date || "",
    comingSoon: Boolean(app.release_date?.coming_soon),
    genres: Array.isArray(app.genres) ? app.genres.map((genre) => genre.description).filter(Boolean) : [],
    recommendations: app.recommendations?.total || 0,
    metacriticScore: app.metacritic?.score || null,
    metacriticUrl: app.metacritic?.url || "",
    reviewSummary: {
      totalPositive: reviewSummary.total_positive || 0,
      totalNegative: reviewSummary.total_negative || 0,
      totalReviews: reviewSummary.total_reviews || 0,
      reviewScore: reviewSummary.review_score || 0,
      reviewScoreDescription: reviewSummary.review_score_desc || ""
    },
    storeUrl: `https://store.steampowered.com/app/${appid}/${slugify(app.name || `App ${appid}`)}/`
  };
  storeCache.set(appid, { value, expiresAt: Date.now() + STORE_CACHE_TTL_MS });
  return value;
}

async function fetchPublicSteamJson(url, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STEAM_TIMEOUT_MS);
  const requestSignal = combineSignals(controller.signal, signal);
  try {
    const response = await fetch(url, {
      signal: requestSignal,
      headers: {
        "accept": "application/json,text/plain,*/*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "referer": "https://store.steampowered.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
      }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Steam Store returned ${response.status}.`);
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

function normalizeTypes(value) {
  const types = Array.isArray(value) ? value : [];
  const unique = [...new Set(types.filter((type) => VALID_TYPES.has(type)))];
  return unique.length ? unique : ["microIcons"];
}

function normalizeAppids(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter((appid) => Number.isInteger(appid) && appid > 0))];
}

async function handleLibrary(req, res) {
  if (!ensureSteamApiKey(res)) return;

  const body = await parseJsonBody(req);
  const profile = String(body.steamid || "").trim();
  if (!profile) {
    sendSafeError(res, 400, "Enter a SteamID64 or a Steam profile link.");
    return;
  }

  const steamid = await resolveSteamId(STEAM_API_KEY, profile);
  const profileLabel = profileLabelForExport(profile, steamid, body.profileLabel);
  const library = await fetchOwnedGames({
    key: STEAM_API_KEY,
    steamid,
    includeFree: body.includeFree !== false
  });

  sendJson(res, 200, {
    steamid,
    profileLabel,
    fetchedAt: new Date().toISOString(),
    maxExportGames: MAX_EXPORT_GAMES,
    ...library
  });
}

async function handlePreview(req, res) {
  if (!ensureSteamApiKey(res)) return;

  const body = await parseJsonBody(req);
  const profile = String(body.steamid || "").trim();
  const type = String(body.type || "microIcons");
  const appids = normalizeAppids(body.appids).slice(0, MAX_EXPORT_GAMES);

  if (!profile) {
    sendSafeError(res, 400, "Enter a SteamID64 or a Steam profile link.");
    return;
  }
  if (!VALID_TYPES.has(type)) {
    sendSafeError(res, 400, "Unknown preview type.");
    return;
  }

  const steamid = await resolveSteamId(STEAM_API_KEY, profile);
  if (type === "recentGames") {
    sendJson(res, 200, {
      steamid,
      type,
      items: await fetchRecentGames({ key: STEAM_API_KEY, steamid })
    });
    return;
  }

  if (type === "storeDetails") {
    const items = [];
    for (const appid of appids) {
      try {
        items.push(await fetchStoreDetails(appid));
      } catch (error) {
        items.push({ appid, error: error.message || "Could not load store details." });
      }
    }
    sendJson(res, 200, { steamid, type, items });
    return;
  }

  sendJson(res, 200, { steamid, type, items: [] });
}

function jobPayload(job) {
  const hasZip = Boolean(job.zip) && (job.status === "done" || job.status === "cancelled");
  return {
    id: job.id,
    status: job.status,
    filename: job.filename,
    progress: job.progress,
    total: job.total,
    saved: job.saved,
    cancelled: Boolean(job.cancelled),
    error: job.error || "",
    downloadUrl: hasZip ? withBasePath(`/api/export-jobs/${job.id}/download`) : ""
  };
}

function emitJob(job) {
  const payload = `data: ${JSON.stringify(jobPayload(job))}\n\n`;
  for (const client of job.clients) {
    client.write(payload);
  }
}

function finalizeCancelledJob(job) {
  if (job.finalized) return;
  job.cancelRequested = true;
  job.cancelled = true;
  job.finalized = true;
  job.status = "cancelled";
  job.abortController?.abort();
  job.zip = createZip(job.files);
  emitJob(job);
}

function finalizeDoneJob(job) {
  if (job.finalized) return;
  job.finalized = true;
  job.cancelled = false;
  job.status = "done";
  job.progress = job.total;
  job.zip = createZip(job.files);
  emitJob(job);
}

function emitJobProgress(job, amount = 1) {
  if (job.finalized || job.cancelRequested) return;
  job.progress += amount;
  emitJob(job);
}

async function downloadFile(url, signal) {
  if (!url.startsWith("https://media.steampowered.com/")) {
    throw new Error("Unsupported download URL.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STEAM_TIMEOUT_MS);
  const requestSignal = combineSignals(controller.signal, signal);
  try {
    const response = await fetch(url, { signal: requestSignal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function handleCreateExportJob(req, res) {
  if (!ensureSteamApiKey(res)) return;

  const body = await parseJsonBody(req);
  const profile = String(body.steamid || "").trim();
  if (!profile) {
    sendSafeError(res, 400, "Enter a SteamID64 or a Steam profile link.");
    return;
  }

  const appids = normalizeAppids(body.appids);
  if (!appids.length) {
    sendSafeError(res, 400, "Select at least one game.");
    return;
  }
  if (appids.length > MAX_EXPORT_GAMES) {
    sendSafeError(res, 400, `Select ${MAX_EXPORT_GAMES} games or fewer for one export.`);
    return;
  }

  const types = normalizeTypes(body.types);
  const steamid = await resolveSteamId(STEAM_API_KEY, profile);
  const profileLabel = profileLabelForExport(profile, steamid, body.profileLabel);
  const id = randomUUID();
  const filename = `${profileLabel}_${exportTypeName(types)}.zip`;
  const job = {
    id,
    steamid,
    filename,
    status: "queued",
    progress: 0,
    total: 1,
    saved: 0,
    error: "",
    zip: null,
    files: [],
    abortController: new AbortController(),
    cancelRequested: false,
    cancelled: false,
    finalized: false,
    clients: new Set(),
    createdAt: Date.now()
  };
  jobs.set(id, job);
  processExportJob(job, {
    includeFree: body.includeFree !== false,
    selectedAppids: new Set(appids),
    orderedAppids: appids,
    types
  });

  sendJson(res, 202, { jobId: id, eventsUrl: withBasePath(`/api/export-jobs/${id}/events`) });
}

async function processExportJob(job, options) {
  try {
    if (job.finalized) return;
    job.status = "running";
    emitJob(job);

    const library = await fetchOwnedGames({
      key: STEAM_API_KEY,
      steamid: job.steamid,
      includeFree: options.includeFree,
      signal: job.abortController.signal
    });
    if (job.finalized || job.cancelRequested) return;
    const gamesByAppid = new Map(library.games.map((game) => [game.appid, game]));
    const selectedGames = options.orderedAppids.map((appid) => gamesByAppid.get(appid)).filter(Boolean);
    const files = job.files;
    const manifest = [];
    const downloadableCount = selectedGames.reduce((count, game) => {
      return count + (options.types.includes("microIcons") && game.iconUrl ? 1 : 0);
    }, 0);
    const dataFileCount = 1 + (options.types.includes("libraryJson") ? 1 : 0) + (options.types.includes("playtimeCsv") ? 1 : 0) + (options.types.includes("recentGames") ? 1 : 0);
    const storeDetailsCount = options.types.includes("storeDetails") ? selectedGames.length : 0;

    job.total = Math.max(1, downloadableCount + dataFileCount + storeDetailsCount);
    emitJob(job);

    if (job.finalized || job.cancelRequested) return;
    files.push({
      name: "manifest.json",
      data: Buffer.from(JSON.stringify({ steamid: job.steamid, selectedTypes: options.types, games: selectedGames }, null, 2), "utf8")
    });
    job.progress += 1;
    job.saved += 1;
    emitJob(job);

    if (options.types.includes("libraryJson")) {
      if (job.finalized || job.cancelRequested) return;
      files.push({
        name: "library.json",
        data: Buffer.from(JSON.stringify({ steamid: job.steamid, ...library }, null, 2), "utf8")
      });
      job.progress += 1;
      job.saved += 1;
      emitJob(job);
    }

    if (options.types.includes("playtimeCsv")) {
      if (job.finalized || job.cancelRequested) return;
      const csv = ["appid,name,playtime_forever_minutes,playtime_2weeks_minutes"]
        .concat(selectedGames.map((game) => [game.appid, csvEscape(game.name), game.playtimeForeverMinutes, game.playtimeTwoWeeksMinutes].join(",")))
        .join("\n");
      files.push({ name: "playtime.csv", data: Buffer.from(csv, "utf8") });
      job.progress += 1;
      job.saved += 1;
      emitJob(job);
    }

    if (options.types.includes("recentGames")) {
      if (job.finalized || job.cancelRequested) return;
      const recent = await fetchRecentGames({ key: STEAM_API_KEY, steamid: job.steamid, signal: job.abortController.signal });
      if (job.finalized || job.cancelRequested) return;
      files.push({ name: "recent-games.json", data: Buffer.from(JSON.stringify(recent, null, 2), "utf8") });
      job.progress += 1;
      job.saved += 1;
      emitJob(job);
    }

    if (options.types.includes("storeDetails")) {
      const storeDetails = [];
      for (const game of selectedGames) {
        if (job.finalized || job.cancelRequested) return;
        try {
          const details = await fetchStoreDetails(game.appid, job.abortController.signal);
          if (job.finalized || job.cancelRequested) return;
          storeDetails.push(details);
          job.saved += 1;
        } catch (error) {
          if (job.finalized || job.cancelRequested) return;
          storeDetails.push({
            appid: game.appid,
            name: game.name,
            error: error.message || "Could not load store details."
          });
        } finally {
          emitJobProgress(job);
        }
      }
      if (job.finalized || job.cancelRequested) return;
      files.push({
        name: "store-details.json",
        data: Buffer.from(JSON.stringify(storeDetails, null, 2), "utf8")
      });
      const csv = ["appid,name,playtime_forever_minutes,release_date,genres,review_summary,recommendations,metacritic,store_url"]
        .concat(storeDetails.map((item) => [
          item.appid,
          csvEscape(item.name),
          selectedGames.find((game) => game.appid === item.appid)?.playtimeForeverMinutes || 0,
          csvEscape(item.releaseDate || ""),
          csvEscape((item.genres || []).join("; ")),
          csvEscape(item.reviewSummary?.reviewScoreDescription || ""),
          item.recommendations || 0,
          item.metacriticScore || "",
          item.storeUrl || `https://store.steampowered.com/app/${item.appid}/`
        ].join(",")))
        .join("\n");
      files.push({ name: "details.csv", data: Buffer.from(csv, "utf8") });
    }

    for (const game of selectedGames) {
      if (job.finalized || job.cancelRequested) return;
      if (options.types.includes("microIcons") && game.iconUrl) {
        await appendDownloadedAsset({ files, job, game, url: game.iconUrl, folder: "micro-icons", suffix: "icon" });
      }
    }

    finalizeDoneJob(job);
  } catch (error) {
    if (job.cancelRequested || job.finalized) {
      finalizeCancelledJob(job);
      return;
    }
    if (job.finalized) return;
    job.status = "error";
    job.error = error.message || "Export failed.";
    emitJob(job);
  } finally {
    setTimeout(() => {
      for (const client of job.clients) client.end();
      jobs.delete(job.id);
    }, JOB_TTL_MS);
  }
}

async function appendDownloadedAsset({ files, job, game, url, folder, suffix }) {
  if (job.finalized || job.cancelRequested) return;

  const entry = { appid: game.appid, name: game.name, type: suffix, sourceUrl: url, saved: false };
  try {
    const data = await downloadFile(url, job.abortController.signal);
    if (job.finalized || job.cancelRequested) return;
    const filename = `${folder}/${game.appid}-${cleanName(game.name)}-${suffix}.jpg`;
    files.push({ name: filename, data });
    entry.saved = true;
    entry.filename = filename;
    job.saved += 1;
  } catch (error) {
    if (job.finalized || job.cancelRequested) return;
    entry.reason = error.message;
  } finally {
    emitJobProgress(job);
  }
}

function csvEscape(value) {
  const raw = String(value ?? "");
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, "\"\"")}"` : raw;
}

function handleJobEvents(req, res, id) {
  const job = jobs.get(id);
  if (!job) {
    sendSafeError(res, 404, "Export job not found.");
    return;
  }

  res.writeHead(200, securityHeaders({
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
    connection: "keep-alive"
  }));
  job.clients.add(res);
  res.write(`data: ${JSON.stringify(jobPayload(job))}\n\n`);
  req.on("close", () => job.clients.delete(res));
}

function handleJobCancel(res, id) {
  const job = jobs.get(id);
  if (!job) {
    sendSafeError(res, 404, "Export job not found.");
    return;
  }

  if (job.status === "done" || job.status === "cancelled" || job.status === "error") {
    sendJson(res, 200, jobPayload(job));
    return;
  }

  finalizeCancelledJob(job);
  sendJson(res, 200, jobPayload(job));
}

function handleJobDownload(res, id) {
  const job = jobs.get(id);
  if (!job || !["done", "cancelled"].includes(job.status) || !job.zip) {
    sendSafeError(res, 404, "Export file is not ready.");
    return;
  }

  send(res, 200, job.zip, {
    "content-type": "application/zip",
    "content-disposition": `attachment; filename="${job.filename}"`,
    "cache-control": "no-store"
  });
}

async function handleApi(req, res, url) {
  if (!checkRateLimit(req)) {
    sendSafeError(res, 429, "Rate limit exceeded. Try again later.");
    return;
  }

  try {
    if (req.method === "POST" && url.pathname === "/api/library") {
      await handleLibrary(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/preview") {
      await handlePreview(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/export-jobs") {
      await handleCreateExportJob(req, res);
      return;
    }

    const cancelMatch = url.pathname.match(/^\/api\/export-jobs\/([^/]+)\/cancel$/);
    if (req.method === "POST" && cancelMatch) {
      handleJobCancel(res, cancelMatch[1]);
      return;
    }

    const eventsMatch = url.pathname.match(/^\/api\/export-jobs\/([^/]+)\/events$/);
    if (req.method === "GET" && eventsMatch) {
      handleJobEvents(req, res, eventsMatch[1]);
      return;
    }

    const downloadMatch = url.pathname.match(/^\/api\/export-jobs\/([^/]+)\/download$/);
    if (req.method === "GET" && downloadMatch) {
      handleJobDownload(res, downloadMatch[1]);
      return;
    }

    sendSafeError(res, 404, "Endpoint not found.");
  } catch (error) {
    sendSafeError(res, error.message === "Request body is too large." ? 413 : 400, error.message || "Request failed.");
  }
}

function serveStatic(res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const target = normalize(join(PUBLIC, safePath.replace(/^\/+/, "")));
  const publicRelative = relative(PUBLIC, target);

  if (publicRelative.startsWith("..") || publicRelative.includes("..\\")) {
    send(res, 404, "File not found.", { "content-type": "text/plain; charset=utf-8" });
    return;
  }

  readFile(target, (error, file) => {
    if (error) {
      send(res, 404, "File not found.", { "content-type": "text/plain; charset=utf-8" });
      return;
    }
    send(res, 200, file, {
      "content-type": MIME[extname(target)] || "application/octet-stream",
      "cache-control": "no-store"
    });
  });
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = dosDateTime();

  for (const entry of entries) {
    const name = Buffer.from(entry.name.replace(/\\/g, "/"), "utf8");
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(now.time, 10);
    local.writeUInt16LE(now.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(now.time, 12);
    central.writeUInt16LE(now.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (BASE_PATH && url.pathname === BASE_PATH) {
    send(res, 308, "", {
      location: `${BASE_PATH}/${url.search || ""}`,
      "cache-control": "no-store"
    });
    return;
  }
  url.pathname = stripBasePath(url.pathname);

  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method not allowed.", { "content-type": "text/plain; charset=utf-8" });
    return;
  }

  serveStatic(res, url.pathname);
}).listen(PORT, () => {
  console.log(`Steam Icons App: http://localhost:${PORT}`);
});
