[CmdletBinding()]
param([switch]$SkipDownloads)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$tools = Join-Path $root '.tools'
$downloads = Join-Path $tools 'downloads'
$nodeVersion = '24.15.0'
$nodeDir = Join-Path $tools "node-v$nodeVersion-win-x64"
$bunDir = Join-Path $tools 'bun-windows-x64'
$runtime = Join-Path $tools 'runtime'

New-Item -ItemType Directory -Force $downloads | Out-Null

function Get-Archive($url, $file, $destination) {
    $archive = Join-Path $downloads $file
    if (-not (Test-Path $destination)) {
        if (-not (Test-Path $archive)) { Invoke-WebRequest $url -OutFile $archive -UseBasicParsing }
        Expand-Archive $archive -DestinationPath $tools -Force
    }
}

if (-not $SkipDownloads) {
    Get-Archive "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip" "node-$nodeVersion.zip" $nodeDir
    Get-Archive 'https://github.com/oven-sh/bun/releases/latest/download/bun-windows-x64.zip' 'bun-windows-x64.zip' $bunDir
}

$node = Join-Path $nodeDir 'node.exe'
$npm = Join-Path $nodeDir 'npm.cmd'
if (-not (Test-Path $node) -or -not (Test-Path $npm)) { throw "Node.js runtime missing. Rerun without -SkipDownloads." }

& $npm install --prefix $runtime claude-mem --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'Claude Mem installation failed.' }

$uvCache = Join-Path $tools 'uv-cache'
$uvTools = Join-Path $tools 'uv-tools'
$env:UV_CACHE_DIR = $uvCache
$env:UV_TOOL_DIR = $uvTools
if (Get-Command uv -ErrorAction SilentlyContinue) {
    uv tool install --python 3.13 'headroom-ai[all]'
    if ($LASTEXITCODE -ne 0) { Write-Warning 'Headroom install failed; rerun this script after fixing uv.' }
} else { Write-Warning 'uv is missing; install uv, then rerun to enable Headroom.' }

New-Item -ItemType Directory -Force (Join-Path $root '.local/claude-mem') | Out-Null
Write-Host ''
Write-Host 'Auxiliary skills are ready for this project.' -ForegroundColor Green
Write-Host 'Start memory: .\scripts\memory.ps1 start'
Write-Host 'Check memory: .\scripts\memory.ps1 status'
Write-Host 'Codex MCP config: .codex\config.toml'
Write-Host 'Provider sign-in: run codex login if Codex is not authenticated.'
