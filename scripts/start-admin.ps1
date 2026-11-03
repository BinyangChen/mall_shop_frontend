$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path 'node_modules')) {
    npm install
}

Write-Host '管理端: http://localhost:5174/admin  (后端 API: http://localhost:8080)'
npm run dev:admin
