$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$env:DATA_DIR = Join-Path $projectRoot '.local/omniroute'
$env:PORT = '20128'
$env:HOSTNAME = '127.0.0.1'
$env:OMNIROUTE_MIGRATIONS_DIR = Join-Path $projectRoot '.local/omniroute/migrations'
$env:REQUIRE_API_KEY = 'true'
New-Item -ItemType Directory -Force $env:OMNIROUTE_MIGRATIONS_DIR | Out-Null
$env:Path = "$projectRoot/.tools/node-v24.15.0-win-x64;$env:Path"
$entry = Join-Path $projectRoot '.tools/runtime/node_modules/omniroute/dist/server.js'
& "$projectRoot/.tools/node-v24.15.0-win-x64/node.exe" $entry @args
exit $LASTEXITCODE
