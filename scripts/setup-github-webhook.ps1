# Setup GitHub Webhook for Auto-Deployment
# This creates a webhook in GitHub that will trigger auto-deployment on push

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GitHub Webhook Setup for Auto-Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To enable auto-deployment:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://github.com/kwilhelm1967/Vault/settings/hooks" -ForegroundColor White
Write-Host "2. Click 'Add webhook'" -ForegroundColor White
Write-Host "3. Set Payload URL: https://api.localpasswordvault.com/api/webhooks/github" -ForegroundColor Green
Write-Host "4. Set Content type: application/json" -ForegroundColor White
Write-Host "5. Set Secret: (generate a random string, add to server .env as GITHUB_WEBHOOK_SECRET)" -ForegroundColor White
Write-Host "6. Select events: Just the push event" -ForegroundColor White
Write-Host "7. Click 'Add webhook'" -ForegroundColor White
Write-Host ""
Write-Host "After setup, every push to main will auto-deploy!" -ForegroundColor Green
Write-Host ""
