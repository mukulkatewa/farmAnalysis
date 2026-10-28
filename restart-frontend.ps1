# Clear cache and restart Vite dev server

Write-Host "🧹 Clearing Vite cache..." -ForegroundColor Cyan
Write-Host ""

Set-Location frontend

# Stop any running dev server
Write-Host "Stopping any running dev servers..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | ForEach-Object {
    Write-Host "  Stopping process: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
}

# Clear node_modules/.vite cache
if (Test-Path "node_modules/.vite") {
    Write-Host "Deleting node_modules/.vite cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules/.vite"
    Write-Host "✅ Cache cleared!" -ForegroundColor Green
} else {
    Write-Host "ℹ️ No cache found to clear" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🚀 Starting Vite dev server..." -ForegroundColor Cyan
Write-Host ""

npm run dev

Set-Location ..


