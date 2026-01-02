# Create Documentation Packages Script
# Creates ZIP packages with user documentation (NO source code) for Windows, macOS, and Linux

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Creating Documentation Packages" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Get version from package.json
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version
Write-Host "Version: $version`n" -ForegroundColor Yellow

# Create packages directory
$packagesDir = "documentation-packages"
if (Test-Path $packagesDir) {
    Remove-Item $packagesDir -Recurse -Force
}
New-Item -ItemType Directory -Path $packagesDir | Out-Null
Write-Host "Created $packagesDir directory" -ForegroundColor Green

# Documentation files to include
$docFiles = @(
    @{ Source = "docs\QUICK_START_GUIDE.md"; Dest = "QUICK_START_GUIDE.md" },
    @{ Source = "docs\USER_MANUAL.md"; Dest = "USER_MANUAL.md" },
    @{ Source = "docs\TROUBLESHOOTING_GUIDE.md"; Dest = "TROUBLESHOOTING_GUIDE.md" },
    @{ Source = "docs\PRIVACY_POLICY.md"; Dest = "PRIVACY_POLICY.md" },
    @{ Source = "docs\TERMS_OF_SERVICE.md"; Dest = "TERMS_OF_SERVICE.md" }
)

# Verify all documentation files exist
Write-Host "`nVerifying documentation files..." -ForegroundColor Cyan
$missingFiles = @()
foreach ($doc in $docFiles) {
    if (-not (Test-Path $doc.Source)) {
        $missingFiles += $doc.Source
        Write-Host "  [WARNING] Missing: $($doc.Source)" -ForegroundColor Yellow
    } else {
        Write-Host "  [OK] Found: $($doc.Source)" -ForegroundColor Green
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`n[ERROR] Missing required documentation files. Cannot create packages." -ForegroundColor Red
    exit 1
}

# Function to create OS-specific README
function Create-OS-README {
    param(
        [string]$OS,
        [string]$OutputPath
    )
    
    # Build installation instructions based on OS
    $installInstructions = ""
    if ($OS -eq "Windows") {
        $installInstructions = "1. Download the Windows installer (.exe) from localpasswordvault.com`n2. Run the installer and follow the setup wizard`n3. Launch Local Password Vault from the Start Menu"
    } elseif ($OS -eq "macOS") {
        $installInstructions = "1. Download the macOS disk image (.dmg) from localpasswordvault.com`n2. Open the DMG file`n3. Drag Local Password Vault to your Applications folder`n4. Launch from Applications"
    } else {
        $installInstructions = "1. Download the Linux AppImage from localpasswordvault.com`n2. Make it executable: chmod +x Local-Password-Vault-*.AppImage`n3. Run: ./Local-Password-Vault-*.AppImage"
    }
    
    $readmeContent = @"
Local Password Vault - Documentation Package
============================================
Version: $version
Platform: $OS

This package contains user documentation for Local Password Vault.
NO SOURCE CODE is included in this package.

CONTENTS:
---------
1. QUICK_START_GUIDE.md
   - Get started in 5 minutes
   - Installation and setup instructions
   - Basic usage guide

2. USER_MANUAL.md
   - Complete user manual
   - All features explained
   - Advanced usage and tips
   - Keyboard shortcuts

3. TROUBLESHOOTING_GUIDE.md
   - Common issues and solutions
   - Installation problems
   - Activation issues
   - Data recovery

4. PRIVACY_POLICY.md
   - Privacy policy and data handling
   - Security practices
   - Your rights and our commitments

5. TERMS_OF_SERVICE.md
   - Terms of service
   - License agreement
   - Usage terms

INSTALLATION:
-------------
$installInstructions

SUPPORT:
--------
Website: https://localpasswordvault.com
Email: support@localpasswordvault.com

For technical support or questions, please refer to the TROUBLESHOOTING_GUIDE.md
or contact our support team.

IMPORTANT:
----------
- This package contains documentation only
- No source code is included
- All documentation is in Markdown (.md) format
- You can open .md files with any text editor or Markdown viewer

© 2025 Local Password Vault. All rights reserved.
"@
    
    $readmeContent | Out-File -FilePath $OutputPath -Encoding UTF8
}

# Create Windows Package
Write-Host "`nCreating Windows documentation package..." -ForegroundColor Cyan
$winPackageDir = "$packagesDir\windows"
New-Item -ItemType Directory -Path $winPackageDir | Out-Null

# Copy documentation
foreach ($doc in $docFiles) {
    Copy-Item $doc.Source -Destination "$winPackageDir\$($doc.Dest)" -Force
    Write-Host "  [OK] Copied $($doc.Dest)" -ForegroundColor Green
}

# Create Windows README
Create-OS-README -OS "Windows" -OutputPath "$winPackageDir\README.txt"
Write-Host "  [OK] Created README.txt" -ForegroundColor Green

# Create ZIP
$winZipPath = "$packagesDir\Local-Password-Vault-Windows-Documentation-$version.zip"
if (Test-Path $winZipPath) {
    Remove-Item $winZipPath -Force
}
Compress-Archive -Path "$winPackageDir\*" -DestinationPath $winZipPath -Force
Write-Host "  [OK] Created ZIP: $(Split-Path $winZipPath -Leaf)" -ForegroundColor Green

# Create macOS Package
Write-Host "`nCreating macOS documentation package..." -ForegroundColor Cyan
$macPackageDir = "$packagesDir\macos"
New-Item -ItemType Directory -Path $macPackageDir | Out-Null

# Copy documentation
foreach ($doc in $docFiles) {
    Copy-Item $doc.Source -Destination "$macPackageDir\$($doc.Dest)" -Force
    Write-Host "  [OK] Copied $($doc.Dest)" -ForegroundColor Green
}

# Create macOS README
Create-OS-README -OS "macOS" -OutputPath "$macPackageDir\README.txt"
Write-Host "  [OK] Created README.txt" -ForegroundColor Green

# Create ZIP
$macZipPath = "$packagesDir\Local-Password-Vault-macOS-Documentation-$version.zip"
if (Test-Path $macZipPath) {
    Remove-Item $macZipPath -Force
}
Compress-Archive -Path "$macPackageDir\*" -DestinationPath $macZipPath -Force
Write-Host "  [OK] Created ZIP: $(Split-Path $macZipPath -Leaf)" -ForegroundColor Green

# Create Linux Package
Write-Host "`nCreating Linux documentation package..." -ForegroundColor Cyan
$linuxPackageDir = "$packagesDir\linux"
New-Item -ItemType Directory -Path $linuxPackageDir | Out-Null

# Copy documentation
foreach ($doc in $docFiles) {
    Copy-Item $doc.Source -Destination "$linuxPackageDir\$($doc.Dest)" -Force
    Write-Host "  [OK] Copied $($doc.Dest)" -ForegroundColor Green
}

# Create Linux README
Create-OS-README -OS "Linux" -OutputPath "$linuxPackageDir\README.txt"
Write-Host "  [OK] Created README.txt" -ForegroundColor Green

# Create ZIP
$linuxZipPath = "$packagesDir\Local-Password-Vault-Linux-Documentation-$version.zip"
if (Test-Path $linuxZipPath) {
    Remove-Item $linuxZipPath -Force
}
Compress-Archive -Path "$linuxPackageDir\*" -DestinationPath $linuxZipPath -Force
Write-Host "  [OK] Created ZIP: $(Split-Path $linuxZipPath -Leaf)" -ForegroundColor Green

# Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Package Creation Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Created packages:" -ForegroundColor Cyan
Write-Host "  1. $(Split-Path $winZipPath -Leaf)" -ForegroundColor White
Write-Host "  2. $(Split-Path $macZipPath -Leaf)" -ForegroundColor White
Write-Host "  3. $(Split-Path $linuxZipPath -Leaf)" -ForegroundColor White

$packagesPath = Join-Path (Get-Location) $packagesDir
Write-Host "`nLocation: $packagesPath" -ForegroundColor Yellow
Write-Host "`nEach package contains:" -ForegroundColor Yellow
Write-Host "  - Quick Start Guide" -ForegroundColor White
Write-Host "  - User Manual" -ForegroundColor White
Write-Host "  - Troubleshooting Guide" -ForegroundColor White
Write-Host "  - Privacy Policy" -ForegroundColor White
Write-Host "  - Terms of Service" -ForegroundColor White
Write-Host "  - README.txt (platform-specific)" -ForegroundColor White
Write-Host "`nNO SOURCE CODE included" -ForegroundColor Green

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Review the packages" -ForegroundColor White
Write-Host "  2. Upload to distribution platform" -ForegroundColor White
Write-Host "  3. Share download links" -ForegroundColor White
Write-Host ""

