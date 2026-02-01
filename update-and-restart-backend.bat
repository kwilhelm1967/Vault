@echo off
echo ========================================================================
echo UPDATE AND RESTART BACKEND SERVER
echo ========================================================================
echo.
echo This will:
echo 1. Connect to your Linode server (172.236.111.48)
echo 2. Download latest code from GitHub
echo 3. Restart the backend server
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Step 1: Connecting to server...
echo.

ssh root@172.236.111.48 "cd /var/www/lpv-api/Vault && echo 'Current directory:' && pwd && echo '' && echo 'Pulling latest code (backend + LPV)...' && git pull origin main && echo '' && echo 'Restarting server...' && pm2 restart lpv-api && echo '' && echo 'Checking status...' && pm2 status"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================================
    echo SUCCESS!
    echo ========================================================================
    echo.
    echo Backend server has been updated and restarted.
    echo It will now generate LLVT- keys for LLV trial signups.
    echo.
) else (
    echo.
    echo ========================================================================
    echo ERROR: Could not connect to server
    echo ========================================================================
    echo.
    echo The script could not connect via SSH.
    echo.
    echo Options:
    echo 1. Check if SSH is enabled in Linode Cloud Manager
    echo 2. Check firewall settings (port 22 should be open)
    echo 3. Try using Linode LISH Console manually
    echo.
    echo To use LISH Console:
    echo 1. Go to https://cloud.linode.com
    echo 2. Find server 172.236.111.48
    echo 3. Click "Launch LISH Console"
    echo 4. Run: cd /var/www/lpv-api/Vault
    echo 5. Run: git pull origin main
    echo 6. Run: pm2 restart lpv-api
    echo 7. Run: pm2 status
    echo.
)

pause
