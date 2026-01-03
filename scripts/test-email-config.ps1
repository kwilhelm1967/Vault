# This script tests if email sending is working
# It sends a test email to make sure emails will be delivered

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$false)]
    [string]$ServerUser = "root",
    
    [Parameter(Mandatory=$false)]
    [string]$BackendPath = "/var/www/lpv-api/backend",
    
    [Parameter(Mandatory=$true)]
    [string]$TestEmail
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Email Sending" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Server: $ServerUser@$ServerIP" -ForegroundColor Yellow
Write-Host "Server folder: $BackendPath" -ForegroundColor Yellow
Write-Host "Test email address: $TestEmail" -ForegroundColor Yellow
Write-Host ""

# Commands to run on server
$sshCommand = @"
cd $BackendPath
echo 'Sending test email...'
node scripts/test-email.js $TestEmail
"@

Write-Host "Sending test email..." -ForegroundColor Green
ssh "$ServerUser@$ServerIP" $sshCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Test email sent!" -ForegroundColor Green
    Write-Host "Check your email inbox: $TestEmail" -ForegroundColor Green
    Write-Host "Also check your spam folder" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Email test failed. Look at errors above." -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
