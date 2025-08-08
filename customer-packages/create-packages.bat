@echo off
REM Local Password Vault - Customer Package Creator (Windows)
REM This script creates ZIP packages for each license tier

echo 🔐 Creating Local Password Vault Customer Packages...

REM Create base directories
if not exist dist-packages mkdir dist-packages

REM Function to create a package
call :create_package single-user "Single User"
call :create_package family-plan "Family Plan"
call :create_package pro "Pro"
call :create_package business-plan "Business Plan"

REM Create complete package
echo 📦 Creating Complete Package with all tiers...
if not exist temp-complete mkdir temp-complete

REM Copy all tier packages
xcopy customer-packages temp-complete\ /E /I /Y

REM Copy project files
copy README.md temp-complete\PROJECT_README.md
copy package.json temp-complete\
copy vite.config.ts temp-complete\
copy tailwind.config.js temp-complete\
copy tsconfig.json temp-complete\
copy tsconfig.app.json temp-complete\
copy tsconfig.node.json temp-complete\
copy eslint.config.js temp-complete\
copy postcss.config.js temp-complete\

REM Copy source code
xcopy src temp-complete\src\ /E /I /Y
xcopy public temp-complete\public\ /E /I /Y
copy index.html temp-complete\

REM Copy electron files
xcopy electron temp-complete\electron\ /E /I /Y
copy electron-builder.json temp-complete\

REM Copy license generator and server examples
xcopy license-generator temp-complete\license-generator\ /E /I /Y
xcopy server-api-examples temp-complete\server-api-examples\ /E /I /Y

REM Copy business documentation
copy BUSINESS_PLAN.txt temp-complete\
copy MARKETING_STRATEGY.txt temp-complete\
copy BUILD_DISTRIBUTION_GUIDE.txt temp-complete\
copy CUSTOMER_DISTRIBUTION_GUIDE.txt temp-complete\
copy LICENSE_KEY_MANAGEMENT_GUIDE.txt temp-complete\
copy TESTING_INSTRUCTIONS.txt temp-complete\
copy WHITE_LABEL_GUIDE.txt temp-complete\

REM Create complete package using PowerShell
powershell -command "Compress-Archive -Path temp-complete\* -DestinationPath dist-packages\LocalPasswordVault-Complete.zip -Force"

REM Clean up
rmdir /S /Q temp-complete

echo ✅ Complete package created: dist-packages\LocalPasswordVault-Complete.zip

echo.
echo 📊 Package Summary:
echo ===================
dir dist-packages\

echo.
echo 🎉 All customer packages created successfully!
echo.
echo Package Contents:
echo - LocalPasswordVault-single-user.zip: Single User license package
echo - LocalPasswordVault-family-plan.zip: Family Plan license package
echo - LocalPasswordVault-pro.zip: Pro license package
echo - LocalPasswordVault-business-plan.zip: Business Plan license package
echo - LocalPasswordVault-Complete.zip: Complete package with all tiers
echo.
echo Each package includes:
echo - Complete source code
echo - Installation guides
echo - License documentation
echo - Business resources
echo - License generator tools
echo.
echo Ready for customer distribution! 🚀

goto :eof

:create_package
set tier=%1
set display_name=%2

echo 📦 Creating %display_name% package...

REM Create temporary directory
if not exist temp-%tier% mkdir temp-%tier%

REM Copy tier-specific files
xcopy customer-packages\%tier%\* temp-%tier%\ /E /I /Y

REM Copy common files
copy README.md temp-%tier%\PROJECT_README.md
copy package.json temp-%tier%\
copy vite.config.ts temp-%tier%\
copy tailwind.config.js temp-%tier%\
copy tsconfig.json temp-%tier%\
copy tsconfig.app.json temp-%tier%\
copy tsconfig.node.json temp-%tier%\
copy eslint.config.js temp-%tier%\
copy postcss.config.js temp-%tier%\

REM Copy source code
xcopy src temp-%tier%\src\ /E /I /Y
xcopy public temp-%tier%\public\ /E /I /Y
copy index.html temp-%tier%\

REM Copy electron files
xcopy electron temp-%tier%\electron\ /E /I /Y
copy electron-builder.json temp-%tier%\

REM Copy license generator
xcopy license-generator temp-%tier%\license-generator\ /E /I /Y

REM Copy business documentation
copy BUSINESS_PLAN.txt temp-%tier%\
copy MARKETING_STRATEGY.txt temp-%tier%\
copy BUILD_DISTRIBUTION_GUIDE.txt temp-%tier%\
copy CUSTOMER_DISTRIBUTION_GUIDE.txt temp-%tier%\
copy LICENSE_KEY_MANAGEMENT_GUIDE.txt temp-%tier%\

REM Create ZIP package using PowerShell
powershell -command "Compress-Archive -Path temp-%tier%\* -DestinationPath dist-packages\LocalPasswordVault-%tier%.zip -Force"

REM Clean up
rmdir /S /Q temp-%tier%

echo ✅ %display_name% package created: dist-packages\LocalPasswordVault-%tier%.zip

goto :eof