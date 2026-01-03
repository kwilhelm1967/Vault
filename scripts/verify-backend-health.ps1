# This script checks if your server is working
# It tries to connect to your server and see if it responds

param(
    [Parameter(Mandatory=$false)]
    [string]$HealthUrl = "https://api.localpasswordvault.com/health"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking if Server is Working" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Testing server: $HealthUrl" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $HealthUrl -Method GET -TimeoutSec 10 -UseBasicParsing
    
    Write-Host "Server responded with code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Server message:" -ForegroundColor Green
    Write-Host $response.Content -ForegroundColor White
    
    if ($response.StatusCode -eq 200) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Server is working!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        exit 0
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host "Server responded but with an error code" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Cannot connect to server" -ForegroundColor Red
    Write-Host "Error message: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Things to check:" -ForegroundColor Yellow
    Write-Host "  - Is the server turned on?" -ForegroundColor Yellow
    Write-Host "  - Can you access the internet?" -ForegroundColor Yellow
    Write-Host "  - Is your firewall blocking the connection?" -ForegroundColor Yellow
    Write-Host "  - Is the website address correct?" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Server is NOT accessible" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
