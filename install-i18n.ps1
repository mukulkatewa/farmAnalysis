# Install i18next packages for multi-language support

Write-Host "🌐 Installing i18next packages..." -ForegroundColor Cyan
Write-Host ""

Set-Location frontend

Write-Host "Installing i18next and react-i18next..." -ForegroundColor Yellow
npm install i18next react-i18next

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Successfully installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Installed packages:" -ForegroundColor Cyan
    Write-Host "  - i18next (internationalization framework)" -ForegroundColor White
    Write-Host "  - react-i18next (React bindings for i18next)" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Language selector is now ready!" -ForegroundColor Green
    Write-Host "   Supports: English, Hindi, Bangla" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Installation failed!" -ForegroundColor Red
    Write-Host "Try manually: cd frontend && npm install i18next react-i18next" -ForegroundColor Yellow
}

Write-Host ""
Set-Location ..
pause


