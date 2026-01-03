# This script sets up your server to start automatically
# After running this, your server will start even if the server computer restarts

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
Write-Host "Setting Up Auto-Start for Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will make your server start automatically when the server computer restarts." -ForegroundColor Yellow
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
echo 'Step 1: Making sure server is running...'
pm2 start server.js --name $PM2AppName 2>/dev/null || pm2 restart $PM2AppName
echo ''
echo 'Step 2: Saving current setup...'
pm2 save
echo ''
echo 'Step 3: Setting up auto-start...'
echo 'This will show a command - you need to run it next'
pm2 startup
echo ''
echo 'IMPORTANT: Copy the command shown above (starts with sudo env PATH=...)'
echo 'Then run it to complete auto-start setup'
"@

# Connect to server and run commands
Write-Host "Setting up auto-start..." -ForegroundColor Green
ssh "$ServerUser@$ServerIP" $sshCommand

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "IMPORTANT NEXT STEP:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "The server showed you a command that starts with 'sudo env PATH=...'" -ForegroundColor White
Write-Host "You need to:" -ForegroundColor White
Write-Host "1. Copy that ENTIRE command" -ForegroundColor White
Write-Host "2. Connect to server again: ssh root@YOUR_SERVER_IP" -ForegroundColor White
Write-Host "3. Paste and run that command" -ForegroundColor White
Write-Host "4. This completes the auto-start setup" -ForegroundColor White
Write-Host ""
Write-Host "After this, your server will start automatically!" -ForegroundColor Green
Write-Host ""
