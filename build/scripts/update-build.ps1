$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$build = Join-Path $root "build"

if (Test-Path $build) {
  $resolvedBuild = Resolve-Path $build
  if (-not $resolvedBuild.Path.StartsWith($root.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clean a build directory outside the project root."
  }
  Remove-Item -LiteralPath (Join-Path $build "*") -Recurse -Force
} else {
  New-Item -ItemType Directory -Path $build | Out-Null
}

$files = @(
  "app.js",
  "server.js",
  "package.json",
  "README.md",
  ".env.example"
)

foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination $build -Force
}

Copy-Item -LiteralPath (Join-Path $root "public") -Destination $build -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root "scripts") -Destination $build -Recurse -Force

@"
# Server Upload Package

Upload the contents of this folder to:

web_apps/steam-api-getter/app

Do not upload a local .env file. Configure secrets in the hosting environment variables panel.

Required environment variables:

STEAM_WEB_API_KEY=your_real_steam_api_key
BASE_PATH=/web_apps/steam-api-getter
DEFAULT_PROFILE_LABEL=SirMaxeN
DEFAULT_STEAMID64=76561198040078356
NODE_ENV=production

Startup file:

app.js
"@ | Set-Content -LiteralPath (Join-Path $build "DEPLOYMENT.md") -Encoding UTF8

Write-Host "Build package updated: $build"
