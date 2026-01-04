@echo off
REM Test License Activation Endpoint
REM This script tests the exact endpoint used by the app

set LICENSE_SERVER_URL=%VITE_LICENSE_SERVER_URL%
if "%LICENSE_SERVER_URL%"=="" set LICENSE_SERVER_URL=https://api.localpasswordvault.com

set ENDPOINT=/api/lpv/license/activate
set FULL_URL=%LICENSE_SERVER_URL%%ENDPOINT%

echo ==================================================================================
echo LICENSE ACTIVATION ENDPOINT TEST
echo ==================================================================================
echo.
echo Configuration:
echo   License Server URL: %LICENSE_SERVER_URL%
echo   Endpoint: %ENDPOINT%
echo   Full URL: %FULL_URL%
echo.

echo Test Payload:
echo {"license_key":"PERS-TEST-TEST-TEST","device_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}
echo.

echo Testing with curl (verbose TLS info)...
echo.

curl -v -X POST "%FULL_URL%" -H "Content-Type: application/json" -d "{\"license_key\":\"PERS-TEST-TEST-TEST\",\"device_id\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}" --max-time 30

echo.
echo ==================================================================================
echo If curl is not available, use the Node.js diagnostic script:
echo   node scripts/diagnose-activation-error.js
echo ==================================================================================
pause
