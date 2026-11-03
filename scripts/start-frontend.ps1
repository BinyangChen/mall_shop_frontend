$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path 'node_modules')) {
    npm install
}

Write-Host '顾客端: http://localhost:5173  (后端 API: http://localhost:8080)'
npm run dev
