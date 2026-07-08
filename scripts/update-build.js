import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const build = join(root, "build");

if (existsSync(build)) {
  if (!resolve(build).startsWith(root)) {
    throw new Error("Refusing to clean a build directory outside the project root.");
  }
  rmSync(build, { recursive: true, force: true });
}

mkdirSync(build, { recursive: true });

for (const file of ["app.js", "server.js", "package.json", "README.md", ".env.example"]) {
  cpSync(join(root, file), join(build, file));
}

for (const directory of ["public", "scripts"]) {
  cpSync(join(root, directory), join(build, directory), { recursive: true });
}

writeFileSync(
  join(build, "DEPLOYMENT.md"),
  `# Server Upload Package

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
`,
  "utf8"
);

console.log(`Build package updated: ${build}`);
