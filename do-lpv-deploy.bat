@echo off
REM One script: deploy backend, build LPV zip, show the 2 things only you do.
cd /d "%~dp0"

call "%~dp0deploy-backend-simple.bat"
if %ERRORLEVEL% NEQ 0 pause

call "%~dp0scripts\run-lpv-zip-only.bat"
if %ERRORLEVEL% NEQ 0 (
    pause
    exit /b 1
)

set LPV_DIR=%~dp0LPV
set INST=%LPV_DIR%\DEPLOY_INSTRUCTIONS.txt
(
echo 1. Upload lpv-website-from-LOCAL.zip to Host Armada -^> File Manager -^> public_html -^> extract. Overwrite all.
echo.
echo 2. If backend did not update: open DEPLOY-BACKEND-VIA-LISH.txt in project root. In Linode LISH Console paste the 4 commands.
echo.
echo 3. If trial emails don't send: Linode LISH -^> cd /var/www/lpv-api/backend -^> nano .env -^> add BREVO_API_KEY=xkeysib-xxx -^> Ctrl+O Enter Ctrl+X -^> pm2 restart lpv-api
) > "%INST%"

start "" "%LPV_DIR%"
echo Done. Folder opened. Do 1 and if needed 2 and 3 in DEPLOY_INSTRUCTIONS.txt.
pause
