# This script updates your server with the latest code
# It connects to your server, downloads new code, and restarts the server

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$false)]
    [string]$ServerUser = "root",
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectRoot = "/var/www/lpv-api/Vault",
    
    [Parameter(Mandatory=$false)]
    [string]$PM2AppName = "lpv-api"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Updating Server Code" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if you can connect to server
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Cannot connect to server. You need to install OpenSSH or use PuTTY." -ForegroundColor Red
    exit 1
}

Write-Host "Connecting to: $ServerUser@$ServerIP" -ForegroundColor Yellow
Write-Host "Project root (backend + LPV): $ProjectRoot" -ForegroundColor Yellow
Write-Host "App name: $PM2AppName" -ForegroundColor Yellow
Write-Host ""

# Git pull from project root so both backend/ and LPV/ get updated (trial flow needs LPV)
$sshCommand = @"
cd $ProjectRoot
echo 'Current folder:' 
pwd
echo ''
echo 'Checking what changed...'
git status
echo ''
echo 'Downloading new code (backend + LPV)...'
git pull
echo ''
echo 'Restarting server...'
pm2 restart $PM2AppName
echo ''
echo 'Checking if server is running...'
pm2 status
echo ''
echo 'Recent server messages...'
pm2 logs $PM2AppName --lines 20 --nostream
"@

# Connect to server and run commands
Write-Host "Connecting and updating..." -ForegroundColor Green
ssh "$ServerUser@$ServerIP" $sshCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Update completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Update failed. Look at the errors above." -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
