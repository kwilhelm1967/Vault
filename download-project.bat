@echo off
echo Creating a download package for Local Password Vault...

:: Create a temporary directory
mkdir temp-download

:: Create exclude.txt file for xcopy
echo node_modules\ > exclude.txt
echo .git\ >> exclude.txt
echo dist\ >> exclude.txt
echo release\ >> exclude.txt
echo .cache\ >> exclude.txt
echo temp-download\ >> exclude.txt

:: Copy all relevant files, excluding large directories
echo Copying project files...
xcopy /E /I /Y /EXCLUDE:exclude.txt . temp-download

:: Create a zip file using PowerShell
echo Creating zip file...
powershell -command "Compress-Archive -Path temp-download\* -DestinationPath local-password-vault.zip -Force"

:: Cleanup
echo Cleaning up...
rmdir /S /Q temp-download
del exclude.txt

echo Download package created: local-password-vault.zip
echo You can now download this file to your computer.
pause