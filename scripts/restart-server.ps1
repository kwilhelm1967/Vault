# This script restarts your server if it's down
# It connects to your server and starts or restarts the server program

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$false)]
    [string]$ServerUser = "root",
    
    [Parameter(Mandatory=$false)]
    [string]$BackendPath = "/var/www/lpv-api/backend",
    
    [Parameter(Mandatory=$false)]
    [string]$PM2AppName = "lpv-api"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Restarting Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if you can connect to server
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Cannot connect to server. You need to install OpenSSH or use PuTTY." -ForegroundColor Red
    exit 1
}

Write-Host "Connecting to: $ServerUser@$ServerIP" -ForegroundColor Yellow
Write-Host "Server folder: $BackendPath" -ForegroundColor Yellow
Write-Host "App name: $PM2AppName" -ForegroundColor Yellow
Write-Host ""

# Commands to run on the server
$sshCommand = @"
cd $BackendPath
echo 'Checking server status...'
pm2 status
echo ''
echo 'Stopping server (if running)...'
pm2 stop $PM2AppName 2>/dev/null || echo 'Server was not running'
echo ''
echo 'Starting server...'
pm2 start server.js --name $PM2AppName
echo ''
echo 'Waiting 3 seconds...'
sleep 3
echo ''
echo 'Checking if server started...'
pm2 status
echo ''
echo 'Recent server messages...'
pm2 logs $PM2AppName --lines 20 --nostream
"@

# Connect to server and run commands
Write-Host "Connecting and restarting server..." -ForegroundColor Green
ssh "$ServerUser@$ServerIP" $sshCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Server restart completed!" -ForegroundColor Green
    Write-Host "Check the status above to see if server is 'online'" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Server restart failed. Look at errors above." -ForegroundColor Red
    Write-Host "See SERVER_UP_AND_RUNNING.txt for troubleshooting help" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
