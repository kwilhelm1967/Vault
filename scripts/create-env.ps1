# Create .env file for frontend
# This script creates the .env file with the correct backend URL

Write-Host "=== Creating .env File ===" -ForegroundColor Cyan
Write-Host ""

$envFile = ".env"
$envExample = ".env.example"

# Check if .env already exists
if (Test-Path $envFile) {
    Write-Host "⚠️  .env file already exists!" -ForegroundColor Yellow
    Write-Host ""
    $overwrite = Read-Host "Do you want to overwrite it? (y/n)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Cancelled. .env file not changed." -ForegroundColor Yellow
        exit 0
    }
}

# Create .env file
$content = @"
# Frontend Environment Variables
# License Server URL - For local development
VITE_LICENSE_SERVER_URL=http://localhost:3001

# License Signing Secret (must match backend LICENSE_SIGNING_SECRET)
# Copy from backend/.env file
VITE_LICENSE_SIGNING_SECRET=

# App Mode
VITE_APP_MODE=development

# Stripe Publishable Key (optional, for checkout)
VITE_STRIPE_PUBLISHABLE_KEY=
"@

try {
    Set-Content -Path $envFile -Value $content
    Write-Host "✅ Created .env file successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Make sure backend is running: cd backend && npm start"
    Write-Host "  2. Restart the app (close and reopen)"
    Write-Host "  3. The activation error should be gone"
    Write-Host ""
    Write-Host "Note: If you have LICENSE_SIGNING_SECRET in backend/.env,"
    Write-Host "     copy it to VITE_LICENSE_SIGNING_SECRET in .env"
} catch {
    Write-Host "❌ Failed to create .env file: $_" -ForegroundColor Red
    exit 1
}
