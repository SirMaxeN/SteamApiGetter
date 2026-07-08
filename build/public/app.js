const form = document.querySelector("#form");
const dataPanel = document.querySelector("#dataPanel");
const statusEl = document.querySelector("#status");
const tableHead = document.querySelector("#tableHead");
const tbody = document.querySelector("#games");
const search = document.querySelector("#search");
const exportButton = document.querySelector("#export");
const jsonButton = document.querySelector("#json");
const selectAllButton = document.querySelector("#selectAll");
const selectVisibleButton = document.querySelector("#selectVisible");
const toggleAll = document.querySelector("#toggleAll");
const selectionStatus = document.querySelector("#selectionStatus");
const languageSelect = document.querySelector("#language");
const progressPanel = document.querySelector("#progressPanel");
const progressLabel = document.querySelector("#progressLabel");
const etaLabel = document.querySelector("#etaLabel");
const progressBar = document.querySelector("#progressBar");
const stopExportButton = document.querySelector("#stopExport");
const downloadModal = document.querySelector("#downloadModal");
const downloadLink = document.querySelector("#downloadLink");
const downloadSummary = document.querySelector("#downloadSummary");
const closeModal = document.querySelector("#closeModal");

const translations = {
  en: {
    brandSub: "Secure library exporter",
    language: "Language",
    eyebrow: "Steam Web API toolkit",
    title: "Export Steam icons, artwork, and library stats.",
    subtitle: "Enter a profile, choose what to export, select games, and download everything as a ZIP.",
    profileLabel: "Steam profile or SteamID64",
    includeFree: "Include played free games",
    exportTypes: "Export data",
    typeMicro: "Micro icons",
    typeMicroDesc: "Only small library icons.",
    typeLibrary: "Library JSON",
    typeLibraryDesc: "Raw library data, app IDs, icons and playtime.",
    typePlaytime: "Playtime CSV",
    typePlaytimeDesc: "Spreadsheet-friendly playtime stats.",
    typeRecent: "Recent games",
    typeRecentDesc: "Recently played games returned by Steam.",
    typeStore: "Details",
    typeStoreDesc: "Name, icon, playtime, Steam app and SteamDB links.",
    load: "Load library",
    export: "Export selected ZIP",
    search: "Search games...",
    selectAll: "Select all",
    unselectAll: "Unselect all",
    selectVisible: "Select visible",
    downloadJson: "Download JSON",
    icon: "Icon",
    game: "Game",
    playtime: "Playtime",
    assets: "Assets",
    empty: "Load a Steam library to see games here.",
    exportReady: "Export ready",
    downloadTitle: "Your ZIP is ready",
    downloadZip: "Download ZIP",
    downloadNote: "Your browser will ask where to save it if download prompts are enabled.",
    ready: "Ready.",
    loading: "Connecting to Steam...",
    loadingRows: "Loading library...",
    loadFail: "Could not load the list.",
    noSearch: "Nothing matches your search.",
    loaded: "Loaded {count} games. SteamID64: {steamid}",
    showing: "Showing {shown}/{total}",
    loadingDetails: "Loading store details...",
    unavailable: "Unavailable",
    selected: "{count} selected",
    none: "none",
    open: "open",
    preparing: "Preparing export...",
    exporting: "Exporting {progress}/{total}...",
    stopping: "Stopping export...",
    stopExport: "Stop export",
    eta: "ETA: {eta}",
    etaUnknown: "ETA: --",
    done: "Export complete.",
    stopped: "Export stopped.",
    saved: "Saved {saved}/{total} items into {filename}.",
    partialSaved: "Stopped after {saved}/{total} items. Partial ZIP saved as {filename}.",
    chooseGame: "Select at least one game.",
    chooseType: "Select at least one export type.",
    maxExport: "Select {max} games or fewer for one export."
  },
  pl: {
    brandSub: "Bezpieczny eksport biblioteki",
    language: "Język",
    eyebrow: "Narzędzie Steam Web API",
    title: "Eksportuj ikony, grafiki i statystyki biblioteki Steam.",
    subtitle: "Wpisz profil, wybierz dane, zaznacz gry i pobierz wszystko jako ZIP.",
    profileLabel: "Profil Steam albo SteamID64",
    includeFree: "Dołącz grane darmowe gry",
    exportTypes: "Wybierz, co pokazać i eksportować",
    typeMicro: "Mikro ikony",
    typeMicroDesc: "Tylko małe ikony biblioteki.",
    typeLibrary: "Biblioteka JSON",
    typeLibraryDesc: "Surowe dane biblioteki, AppID, ikony i czas gry.",
    typePlaytime: "Czas gry CSV",
    typePlaytimeDesc: "Statystyki czasu gry gotowe do arkusza.",
    typeRecent: "Ostatnie gry",
    typeRecentDesc: "Ostatnio grane tytuły zwrócone przez Steam.",
    typeStore: "Detale",
    typeStoreDesc: "Nazwa, ikona, czas gry oraz linki Steam app i SteamDB.",
    load: "Pobierz bibliotekę",
    export: "Eksportuj ZIP",
    search: "Szukaj gier...",
    selectAll: "Zaznacz wszystko",
    unselectAll: "Odznacz wszystko",
    selectVisible: "Zaznacz widoczne",
    downloadJson: "Pobierz JSON",
    icon: "Ikona",
    game: "Gra",
    playtime: "Czas gry",
    assets: "Zasoby",
    empty: "Pobierz bibliotekę Steam, aby zobaczyć gry.",
    exportReady: "Eksport gotowy",
    downloadTitle: "Twój ZIP jest gotowy",
    downloadZip: "Pobierz ZIP",
    downloadNote: "Przeglądarka zapyta o miejsce zapisu, jeśli masz włączone pytanie przy pobieraniu.",
    ready: "Gotowe.",
    loading: "Łączenie ze Steam...",
    loadingRows: "Pobieram bibliotekę...",
    loadFail: "Nie udało się pobrać listy.",
    noSearch: "Nic nie pasuje do wyszukiwania.",
    loaded: "Pobrano {count} gier. SteamID64: {steamid}",
    showing: "Widoczne {shown}/{total}",
    loadingDetails: "Ładuję detale sklepu...",
    unavailable: "Niedostępne",
    selected: "Zaznaczono {count}",
    none: "brak",
    open: "otwórz",
    preparing: "Przygotowuję eksport...",
    exporting: "Eksport {progress}/{total}...",
    stopping: "Zatrzymuje eksport...",
    stopExport: "Stop eksport",
    eta: "ETA: {eta}",
    etaUnknown: "ETA: --",
    done: "Eksport gotowy.",
    stopped: "Eksport zatrzymany.",
    saved: "Zapisano {saved}/{total} elementów do {filename}.",
    partialSaved: "Zatrzymano po {saved}/{total} elementach. Czesciowy ZIP zapisany jako {filename}.",
    chooseGame: "Zaznacz przynajmniej jedną grę.",
    chooseType: "Wybierz przynajmniej jeden typ eksportu.",
    maxExport: "Zaznacz maksymalnie {max} gier na jeden eksport."
  },
  de: {
    brandSub: "Sicherer Bibliotheksexport",
    language: "Sprache",
    eyebrow: "Steam Web API Toolkit",
    title: "Exportiere Steam-Icons, Grafiken und Bibliotheksstatistiken.",
    subtitle: "Profil eingeben, Daten wählen, Spiele markieren und alles als ZIP laden.",
    profileLabel: "Steam-Profil oder SteamID64",
    includeFree: "Gespielte kostenlose Spiele einschließen",
    exportTypes: "Auswählen, was angezeigt und exportiert wird",
    typeMicro: "Micro-Icons",
    typeMicroDesc: "Nur kleine Bibliotheksicons.",
    typeLibrary: "Bibliothek JSON",
    typeLibraryDesc: "Rohdaten der Bibliothek, AppIDs, Icons und Spielzeit.",
    typePlaytime: "Spielzeit CSV",
    typePlaytimeDesc: "Tabellenfreundliche Spielzeitstatistiken.",
    typeRecent: "Zuletzt gespielt",
    typeRecentDesc: "Zuletzt gespielte Titel von Steam.",
    typeStore: "Details",
    typeStoreDesc: "Name, Icon, Spielzeit sowie Steam-App- und SteamDB-Links.",
    load: "Bibliothek laden",
    export: "ZIP exportieren",
    search: "Spiele suchen...",
    selectAll: "Alle auswählen",
    unselectAll: "Alle abwählen",
    selectVisible: "Sichtbare auswählen",
    downloadJson: "JSON laden",
    icon: "Icon",
    game: "Spiel",
    playtime: "Spielzeit",
    assets: "Assets",
    empty: "Lade eine Steam-Bibliothek, um Spiele zu sehen.",
    exportReady: "Export bereit",
    downloadTitle: "Deine ZIP ist bereit",
    downloadZip: "ZIP herunterladen",
    downloadNote: "Der Browser fragt nach dem Speicherort, wenn Download-Abfragen aktiviert sind.",
    ready: "Bereit.",
    loading: "Verbinde mit Steam...",
    loadingRows: "Bibliothek wird geladen...",
    loadFail: "Liste konnte nicht geladen werden.",
    noSearch: "Keine Treffer.",
    loaded: "{count} Spiele geladen. SteamID64: {steamid}",
    showing: "{shown}/{total} sichtbar",
    loadingDetails: "Store-Details werden geladen...",
    unavailable: "Nicht verfügbar",
    selected: "{count} ausgewählt",
    none: "keine",
    open: "öffnen",
    preparing: "Export wird vorbereitet...",
    exporting: "Export {progress}/{total}...",
    stopping: "Export wird gestoppt...",
    stopExport: "Export stoppen",
    eta: "ETA: {eta}",
    etaUnknown: "ETA: --",
    done: "Export abgeschlossen.",
    stopped: "Export gestoppt.",
    saved: "{saved}/{total} Elemente in {filename} gespeichert.",
    partialSaved: "Nach {saved}/{total} Elementen gestoppt. Teil-ZIP als {filename} gespeichert.",
    chooseGame: "Wähle mindestens ein Spiel aus.",
    chooseType: "Wähle mindestens einen Exporttyp aus.",
    maxExport: "Wähle höchstens {max} Spiele pro Export aus."
  },
  es: {
    brandSub: "Exportador seguro de biblioteca",
    language: "Idioma",
    eyebrow: "Herramienta Steam Web API",
    title: "Exporta iconos, arte y estadísticas de tu biblioteca de Steam.",
    subtitle: "Introduce un perfil, elige datos, selecciona juegos y descarga todo como ZIP.",
    profileLabel: "Perfil de Steam o SteamID64",
    includeFree: "Incluir juegos gratuitos jugados",
    exportTypes: "Elige qué mostrar y exportar",
    typeMicro: "Micro iconos",
    typeMicroDesc: "Solo iconos pequeños de biblioteca.",
    typeLibrary: "Biblioteca JSON",
    typeLibraryDesc: "Datos sin procesar, AppID, iconos y tiempo.",
    typePlaytime: "Tiempo CSV",
    typePlaytimeDesc: "Estadísticas de tiempo listas para hoja de cálculo.",
    typeRecent: "Juegos recientes",
    typeRecentDesc: "Juegos recientes devueltos por Steam.",
    typeStore: "Detalles",
    typeStoreDesc: "Nombre, icono, tiempo jugado y enlaces a Steam app y SteamDB.",
    load: "Cargar biblioteca",
    export: "Exportar ZIP",
    search: "Buscar juegos...",
    selectAll: "Seleccionar todo",
    unselectAll: "Deseleccionar todo",
    selectVisible: "Seleccionar visibles",
    downloadJson: "Descargar JSON",
    icon: "Icono",
    game: "Juego",
    playtime: "Tiempo",
    assets: "Recursos",
    empty: "Carga una biblioteca de Steam para ver juegos.",
    exportReady: "Exportación lista",
    downloadTitle: "Tu ZIP está listo",
    downloadZip: "Descargar ZIP",
    downloadNote: "El navegador preguntará dónde guardarlo si las solicitudes de descarga están activadas.",
    ready: "Listo.",
    loading: "Conectando con Steam...",
    loadingRows: "Cargando biblioteca...",
    loadFail: "No se pudo cargar la lista.",
    noSearch: "No hay resultados.",
    loaded: "{count} juegos cargados. SteamID64: {steamid}",
    showing: "Mostrando {shown}/{total}",
    loadingDetails: "Cargando detalles de tienda...",
    unavailable: "No disponible",
    selected: "{count} seleccionados",
    none: "ninguno",
    open: "abrir",
    preparing: "Preparando exportación...",
    exporting: "Exportando {progress}/{total}...",
    stopping: "Deteniendo exportacion...",
    stopExport: "Detener exportacion",
    eta: "ETA: {eta}",
    etaUnknown: "ETA: --",
    done: "Exportación completa.",
    stopped: "Exportacion detenida.",
    saved: "Guardados {saved}/{total} elementos en {filename}.",
    partialSaved: "Detenido despues de {saved}/{total} elementos. ZIP parcial guardado como {filename}.",
    chooseGame: "Selecciona al menos un juego.",
    chooseType: "Selecciona al menos un tipo de exportación.",
    maxExport: "Selecciona {max} juegos o menos por exportación."
  }
};

let currentLang = localStorage.getItem("lang") || "en";
let currentGames = [];
let lastParams = null;
let selectedAppids = new Set();
let lastLibrary = null;
let exportStartedAt = 0;
let currentExportJobId = "";
let currentExportEvents = null;
let activeType = "storeDetails";
let renderedCount = 0;
let visibleCache = [];
let maxExportGames = 1000;
let sortState = { key: "name", direction: "asc" };
const PAGE_SIZE = 150;
const DETAILS_BATCH_SIZE = 20;
const DEFAULT_PROFILE = "https://steamcommunity.com/id/SirMaxeN/";
const storeDetailsCache = new Map();
const pendingStoreDetails = new Set();
let detailQueue = [];
let detailQueueRunning = false;

function t(key, vars = {}) {
  const template = translations[currentLang]?.[key] || translations.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
}

function setStatus(message) {
  statusEl.textContent = message;
}

function applyLanguage() {
  document.documentElement.lang = currentLang;
  languageSelect.value = currentLang;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  updateSelectionStatus();
  if (!currentGames.length) setStatus(t("ready"));
  render();
}

function minutesToLabel(minutes) {
  if (!minutes) return "0 h";
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours.toLocaleString(currentLang)} h`;
}

function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 1) return "--";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.ceil(seconds % 60);
  return `${minutes}m ${rest}s`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getVisibleGames() {
  const q = search.value.trim().toLowerCase();
  const filtered = q
    ? currentGames.filter((game) => game.name.toLowerCase().includes(q) || String(game.appid).includes(q))
    : currentGames;
  return sortGames(filtered);
}

function sortGames(games) {
  const direction = sortState.direction === "asc" ? 1 : -1;
  return [...games].sort((a, b) => {
    const aValue = sortValue(a, sortState.key);
    const bValue = sortValue(b, sortState.key);
    if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * direction;
    return String(aValue).localeCompare(String(bValue), currentLang, { numeric: true, sensitivity: "base" }) * direction;
  });
}

function sortValue(game, key) {
  if (key === "appid") return Number(game.appid || 0);
  if (key === "playtime") return Number(game.playtimeForeverMinutes || 0);
  if (key === "twoWeeks") return Number(game.playtimeTwoWeeksMinutes || 0);
  if (key === "rating") return storeDetailsCache.get(game.appid)?.reviewSummary?.reviewScore || -1;
  if (key === "description") return storeDetailsCache.get(game.appid)?.shortDescription || "";
  return game.name || "";
}

function resetRenderedRows() {
  renderedCount = 0;
  visibleCache = getVisibleGames();
}

function selectedTypeLabel() {
  const typeToKey = {
    microIcons: "typeMicro",
    storeDetails: "typeStore"
  };
  return t(typeToKey[activeType] || "typeMicro");
}

function checkboxCell(game) {
  const checked = selectedAppids.has(game.appid) ? "checked" : "";
  return `<td class="select-col"><input class="game-check" type="checkbox" data-appid="${game.appid}" ${checked} aria-label="Select ${escapeHtml(game.name || game.appid)}"></td>`;
}

function sortIndicator(key) {
  if (sortState.key !== key) return "";
  return sortState.direction === "asc" ? " ↑" : " ↓";
}

function renderTableHead(columns) {
  tableHead.innerHTML = `<tr>
    <th class="select-col"><input id="toggleAll" type="checkbox" ${currentGames.length ? "" : "disabled"} aria-label="Select all games" /></th>
    ${columns.map((column) => `<th>${column.key ? `<button class="sort-button" type="button" data-sort="${column.key}">${column.label}${sortIndicator(column.key)}</button>` : column.label}</th>`).join("")}
  </tr>`;
}

function row(game) {
  if (activeType === "storeDetails") {
    const icon = game.iconUrl ? `<img class="icon" src="${game.iconUrl}" alt="" loading="lazy">` : "";
    const details = storeDetailsCache.get(game.appid);
    const rating = details?.reviewSummary?.reviewScoreDescription || (details?.metacriticScore ? `Metacritic ${details.metacriticScore}` : "...");
    const description = details?.shortDescription || t("loadingDetails");
    return `<tr>
      ${checkboxCell(game)}
      <td><div class="game-title">${icon}<div><div class="name">${escapeHtml(game.name)}</div><span class="subtle">${game.appid}</span></div></div></td>
      <td class="rating-cell" data-rating-appid="${game.appid}">${escapeHtml(rating)}</td>
      <td class="description-cell" data-description-appid="${game.appid}">${escapeHtml(description)}</td>
      <td>${minutesToLabel(game.playtimeForeverMinutes)}</td>
      <td>${minutesToLabel(game.playtimeTwoWeeksMinutes)}</td>
      <td><a href="steam://store/${game.appid}">Steam app</a> / <a href="https://steamdb.info/app/${game.appid}/" target="_blank" rel="noopener">SteamDB</a></td>
    </tr>`;
  }

  const icon = game.iconUrl ? `<img class="icon" src="${game.iconUrl}" alt="" loading="lazy">` : `<span class="subtle">${t("none")}</span>`;

  return `<tr>
    ${checkboxCell(game)}
    <td>${icon}</td>
    <td><div class="name">${escapeHtml(game.name)}</div><span class="subtle">${game.appid}</span></td>
    <td>${game.appid}</td>
    <td>${minutesToLabel(game.playtimeForeverMinutes)}</td>
    <td>${game.iconUrl ? `<a href="${game.iconUrl}" target="_blank" rel="noreferrer">${t("open")}</a>` : `<span class="subtle">${t("none")}</span>`}</td>
  </tr>`;
}

function renderHeadersForActiveType() {
  const headers = {
    storeDetails: [
      { label: t("game"), key: "name" },
      { label: "Rating", key: "rating" },
      { label: "Description", key: "description" },
      { label: "Total playtime", key: "playtime" },
      { label: "Two weeks", key: "twoWeeks" },
      { label: "Links" }
    ],
    microIcons: [
      { label: t("icon") },
      { label: t("game"), key: "name" },
      { label: "AppID", key: "appid" },
      { label: "Time played", key: "playtime" },
      { label: "URL" }
    ]
  };
  renderTableHead(headers[activeType] || headers.microIcons);
}

function render() {
  document.body.dataset.view = activeType;
  renderHeadersForActiveType();
  resetRenderedRows();
  tbody.innerHTML = "";
  if (!visibleCache.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">${currentGames.length ? t("noSearch") : t("empty")}</td></tr>`;
  } else {
    appendRows();
  }
  bindToggleAll();
  updateSelectionStatus();
}

function appendRows() {
  const next = visibleCache.slice(renderedCount, renderedCount + PAGE_SIZE);
  if (!next.length) return;
  tbody.insertAdjacentHTML("beforeend", next.map(row).join(""));
  renderedCount += next.length;
  updateSelectionStatus();
  queueStoreDetails(next);
}

function maybeAppendRows() {
  const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 700;
  if (nearBottom && renderedCount < visibleCache.length) appendRows();
}

function refreshRenderedRowsOnly() {
  const rendered = visibleCache.slice(0, renderedCount || PAGE_SIZE);
  tbody.innerHTML = rendered.length
    ? rendered.map(row).join("")
    : `<tr><td colspan="6" class="empty">${currentGames.length ? t("noSearch") : t("empty")}</td></tr>`;
  bindToggleAll();
  updateSelectionStatus();
  queueStoreDetails(rendered);
}

function queueStoreDetails(games) {
  if (activeType !== "storeDetails" || !lastParams) return;
  const missing = games
    .map((game) => game.appid)
    .filter((appid) => !storeDetailsCache.has(appid) && !pendingStoreDetails.has(appid));
  if (!missing.length) return;

  for (const appid of missing) pendingStoreDetails.add(appid);
  detailQueue.push(...missing);
  processDetailQueue();
}

async function processDetailQueue() {
  if (detailQueueRunning) return;
  detailQueueRunning = true;

  try {
    while (detailQueue.length) {
      const batch = detailQueue.splice(0, DETAILS_BATCH_SIZE);
      const data = await postJson("/api/preview", {
        ...lastParams,
        type: "storeDetails",
        appids: batch
      });

      for (const item of data.items || []) {
        const appid = Number(item.appid);
        storeDetailsCache.set(appid, item);
        pendingStoreDetails.delete(appid);
        updateStoreDetailsRow(appid, item);
      }
    }
  } catch (error) {
    setStatus(error.message);
  } finally {
    detailQueueRunning = false;
  }
}

function updateStoreDetailsRow(appid, details) {
  const ratingCell = document.querySelector(`[data-rating-appid="${appid}"]`);
  const descriptionCell = document.querySelector(`[data-description-appid="${appid}"]`);
  if (ratingCell) {
    ratingCell.textContent = details.reviewSummary?.reviewScoreDescription || (details.metacriticScore ? `Metacritic ${details.metacriticScore}` : t("unavailable"));
  }
  if (descriptionCell) {
    descriptionCell.textContent = details.shortDescription || t("unavailable");
  }
}

function selectedTypes() {
  const selected = document.querySelector('input[name="type"]:checked');
  return selected ? [selected.value] : [];
}

function paramsFromForm() {
  const data = new FormData(form);
  const rawSteamid = String(data.get("steamid") || "").trim() || DEFAULT_PROFILE;
  return {
    steamid: rawSteamid,
    profileLabel: profileLabelFromInput(rawSteamid),
    includeFree: document.querySelector("#includeFree").checked
  };
}

function profileLabelFromInput(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/steamcommunity\.com\/(?:id|profiles)\/([^/?#]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);
  if (/^76561198040078356$/.test(raw)) return "SirMaxeN";
  return raw || "steam";
}

function setControlsEnabled(enabled) {
  dataPanel.hidden = !enabled;
  search.disabled = !enabled;
  jsonButton.disabled = !enabled;
  exportButton.disabled = !enabled || selectedAppids.size === 0;
  selectAllButton.disabled = !enabled;
  selectVisibleButton.disabled = !enabled;
  const currentToggleAll = document.querySelector("#toggleAll");
  if (currentToggleAll) currentToggleAll.disabled = !enabled;
}

function updateSelectionStatus() {
  selectionStatus.textContent = `${t("selected", { count: selectedAppids.size.toLocaleString(currentLang) })} · ${t("showing", {
    shown: Math.min(renderedCount, visibleCache.length).toLocaleString(currentLang),
    total: visibleCache.length.toLocaleString(currentLang)
  })}`;
  const allSelected = currentGames.length > 0 && currentGames.every((game) => selectedAppids.has(game.appid));
  selectAllButton.textContent = allSelected ? t("unselectAll") : t("selectAll");
  exportButton.disabled = currentGames.length === 0 || selectedAppids.size === 0;
  const visible = getVisibleGames();
  const currentToggleAll = document.querySelector("#toggleAll");
  if (!currentToggleAll) return;
  currentToggleAll.checked = visible.length > 0 && visible.every((game) => selectedAppids.has(game.appid));
  currentToggleAll.indeterminate = visible.some((game) => selectedAppids.has(game.appid)) && !currentToggleAll.checked;
}

function appBaseUrl() {
  const path = window.location.pathname;
  if (path.endsWith("/")) return path;
  if (/\.[a-z0-9]+$/i.test(path)) return path.replace(/\/[^/]*$/, "/");
  return `${path}/`;
}

function apiUrl(path) {
  return new URL(path.replace(/^\/+/, ""), `${window.location.origin}${appBaseUrl()}`).toString();
}

async function postJson(url, body) {
  const response = await fetch(apiUrl(url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

async function loadGames(event) {
  event.preventDefault();
  const params = paramsFromForm();
  lastParams = params;
  selectedAppids = new Set();
  currentGames = [];
  lastLibrary = null;
  setControlsEnabled(false);
  setStatus(t("loading"));
  tbody.innerHTML = `<tr><td colspan="6" class="empty">${t("loadingRows")}</td></tr>`;

  try {
    const data = await postJson("/api/library", params);
    lastLibrary = data;
    lastParams = { ...params, profileLabel: data.profileLabel || params.profileLabel };
    currentGames = data.games || [];
    storeDetailsCache.clear();
    pendingStoreDetails.clear();
    detailQueue = [];
    maxExportGames = Number(data.maxExportGames || 1000);
    sortState = { key: "name", direction: "asc" };
    selectedAppids = new Set(currentGames.map((game) => game.appid));
    setStatus(t("loaded", {
      count: currentGames.length.toLocaleString(currentLang),
      steamid: data.steamid
    }));
    setControlsEnabled(currentGames.length > 0);
    await loadActivePreview();
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(error.message)}</td></tr>`;
    setStatus(t("loadFail"));
  }
}

async function loadActivePreview() {
  render();
  setStatus(t("loaded", {
    count: currentGames.length.toLocaleString(currentLang),
    steamid: lastLibrary?.steamid || ""
  }));
}

function updateExportProgress(job) {
  const progress = Number(job.progress || 0);
  const total = Math.max(1, Number(job.total || 1));
  const percent = Math.min(100, Math.round((progress / total) * 100));
  const elapsed = (Date.now() - exportStartedAt) / 1000;
  const eta = progress > 0 ? ((total - progress) * elapsed) / progress : Infinity;

  progressPanel.hidden = false;
  progressBar.style.width = `${percent}%`;
  if (job.status === "done") {
    progressLabel.textContent = t("done");
    etaLabel.textContent = t("eta", { eta: "0s" });
    return;
  }
  if (job.status === "cancelled") {
    progressLabel.textContent = t("stopped");
    etaLabel.textContent = t("eta", { eta: "0s" });
    return;
  }
  if (job.status === "stopping") {
    progressLabel.textContent = t("stopping");
    etaLabel.textContent = t("eta", { eta: formatEta(eta) });
    return;
  }
  progressLabel.textContent = t("exporting", { progress, total });
  etaLabel.textContent = t("eta", { eta: formatEta(eta) });
}

async function exportSelected() {
  if (!lastParams) return;
  if (!selectedAppids.size) {
    setStatus(t("chooseGame"));
    return;
  }
  const exportAppids = getVisibleGames().filter((game) => selectedAppids.has(game.appid)).map((game) => game.appid);
  if (exportAppids.length > maxExportGames) {
    setStatus(t("maxExport", { max: maxExportGames.toLocaleString(currentLang) }));
    return;
  }

  const types = selectedTypes();
  if (!types.length) {
    setStatus(t("chooseType"));
    return;
  }

  exportButton.disabled = true;
  stopExportButton.disabled = true;
  currentExportJobId = "";
  if (currentExportEvents) {
    currentExportEvents.close();
    currentExportEvents = null;
  }
  exportStartedAt = Date.now();
  progressPanel.hidden = false;
  progressBar.style.width = "0%";
  progressLabel.textContent = t("preparing");
  etaLabel.textContent = t("etaUnknown");
  setStatus(t("preparing"));

  try {
    const job = await postJson("/api/export-jobs", {
      ...lastParams,
      profileLabel: lastLibrary?.profileLabel || lastParams.profileLabel,
      types,
      appids: exportAppids
    });

    currentExportJobId = job.jobId;
    stopExportButton.disabled = false;
    const events = new EventSource(job.eventsUrl);
    currentExportEvents = events;
    events.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updateExportProgress(data);

      if (data.status === "done" || data.status === "cancelled") {
        events.close();
        currentExportEvents = null;
        currentExportJobId = "";
        stopExportButton.disabled = true;
        downloadLink.href = data.downloadUrl;
        downloadLink.download = data.filename;
        downloadSummary.textContent = t(data.status === "cancelled" ? "partialSaved" : "saved", {
          saved: Number(data.saved || 0).toLocaleString(currentLang),
          total: Number(data.total || 0).toLocaleString(currentLang),
          filename: data.filename
        });
        downloadModal.hidden = false;
        setStatus(data.status === "cancelled" ? t("stopped") : t("done"));
        exportButton.disabled = false;
      }

      if (data.status === "error") {
        events.close();
        currentExportEvents = null;
        currentExportJobId = "";
        stopExportButton.disabled = true;
        setStatus(data.error || "Export failed.");
        exportButton.disabled = false;
      }
    };
    events.onerror = () => {
      events.close();
      currentExportEvents = null;
      currentExportJobId = "";
      stopExportButton.disabled = true;
      setStatus("Export connection failed.");
      exportButton.disabled = false;
    };
  } catch (error) {
    currentExportJobId = "";
    stopExportButton.disabled = true;
    setStatus(error.message);
    exportButton.disabled = false;
  }
}

async function stopExport() {
  if (!currentExportJobId) return;
  stopExportButton.disabled = true;
  setStatus(t("stopping"));
  progressLabel.textContent = t("stopping");
  try {
    await postJson(`/api/export-jobs/${currentExportJobId}/cancel`, {});
  } catch (error) {
    setStatus(error.message);
    stopExportButton.disabled = false;
  }
}

function downloadJson() {
  if (!lastLibrary) return;
  const blob = new Blob([JSON.stringify(lastLibrary, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${lastLibrary.steamid || "steam"}-library.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function selectGames(games, selected) {
  for (const game of games) {
    if (selected) selectedAppids.add(game.appid);
    else selectedAppids.delete(game.appid);
  }
  updateSelectionStatus();
  refreshRenderedRowsOnly();
}

form.addEventListener("submit", loadGames);
search.addEventListener("input", render);
exportButton.addEventListener("click", exportSelected);
jsonButton.addEventListener("click", downloadJson);
stopExportButton.addEventListener("click", stopExport);
selectAllButton.addEventListener("click", () => {
  const allSelected = currentGames.length > 0 && currentGames.every((game) => selectedAppids.has(game.appid));
  selectGames(currentGames, !allSelected);
});
selectVisibleButton.addEventListener("click", () => selectGames(getVisibleGames(), true));
function bindToggleAll() {
  const currentToggleAll = document.querySelector("#toggleAll");
  if (!currentToggleAll || currentToggleAll.dataset.bound) return;
  currentToggleAll.dataset.bound = "true";
  currentToggleAll.addEventListener("change", () => selectGames(getVisibleGames(), currentToggleAll.checked));
}
closeModal.addEventListener("click", () => {
  downloadModal.hidden = true;
});
downloadModal.addEventListener("click", (event) => {
  if (event.target === downloadModal) downloadModal.hidden = true;
});
tbody.addEventListener("change", (event) => {
  if (!event.target.classList.contains("game-check")) return;
  const appid = Number(event.target.dataset.appid);
  if (event.target.checked) selectedAppids.add(appid);
  else selectedAppids.delete(appid);
  updateSelectionStatus();
});
tableHead.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sort]");
  if (!button) return;
  const key = button.dataset.sort;
  sortState = {
    key,
    direction: sortState.key === key && sortState.direction === "asc" ? "desc" : "asc"
  };
  render();
});
languageSelect.addEventListener("change", () => {
  currentLang = languageSelect.value;
  localStorage.setItem("lang", currentLang);
  applyLanguage();
});
document.querySelectorAll('input[name="type"]').forEach((input) => {
  input.addEventListener("change", async () => {
    activeType = input.value;
    try {
      await loadActivePreview();
    } catch (error) {
      setStatus(error.message);
      render();
    }
  });
});
window.addEventListener("scroll", maybeAppendRows, { passive: true });

applyLanguage();
