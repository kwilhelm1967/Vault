# Create Download Packages Script
# Creates ZIP packages for Windows, macOS, and Linux installers

$ErrorActionPreference = "Stop"

Write-Host "Creating download packages..." -ForegroundColor Green

# Create download-packages directory
$packagesDir = "download-packages"
if (-not (Test-Path $packagesDir)) {
    New-Item -ItemType Directory -Path $packagesDir | Out-Null
    Write-Host "Created $packagesDir directory" -ForegroundColor Yellow
}

# Copy README.txt
if (Test-Path "$packagesDir\README.txt") {
    Write-Host "README.txt already exists" -ForegroundColor Yellow
} else {
    Write-Host "README.txt not found in $packagesDir - creating..." -ForegroundColor Yellow
}

# Documentation files to include
$docFiles = @(
    "docs\USER_MANUAL.md",
    "docs\QUICK_START_GUIDE.md",
    "docs\TROUBLESHOOTING_GUIDE.md"
)

# Windows Package
Write-Host "`nCreating Windows package..." -ForegroundColor Cyan
$winInstaller = "release\Local Password Vault Setup 1.2.0.exe"
if (Test-Path $winInstaller) {
    $winPackageDir = "$packagesDir\windows"
    if (-not (Test-Path $winPackageDir)) {
        New-Item -ItemType Directory -Path $winPackageDir | Out-Null
    }
    
    # Copy installer
    Copy-Item $winInstaller -Destination "$winPackageDir\" -Force
    Write-Host "  ✓ Copied Windows installer" -ForegroundColor Green
    
    # Copy README
    Copy-Item "$packagesDir\README.txt" -Destination "$winPackageDir\" -Force
    
    # Copy documentation
    foreach ($doc in $docFiles) {
        if (Test-Path $doc) {
            Copy-Item $doc -Destination "$winPackageDir\" -Force
            Write-Host "  ✓ Copied $(Split-Path $doc -Leaf)" -ForegroundColor Green
        }
    }
    
    # Create ZIP
    $zipPath = "$packagesDir\Local-Password-Vault-Windows-1.2.0.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    Compress-Archive -Path "$winPackageDir\*" -DestinationPath $zipPath -Force
    Write-Host "  ✓ Created ZIP: $zipPath" -ForegroundColor Green
} else {
    Write-Host "  ✗ Windows installer not found: $winInstaller" -ForegroundColor Red
}

# macOS Package (if exists)
Write-Host "`nChecking for macOS package..." -ForegroundColor Cyan
$macDmg = Get-ChildItem -Path "release" -Filter "*.dmg" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($macDmg) {
    $macPackageDir = "$packagesDir\macos"
    if (-not (Test-Path $macPackageDir)) {
        New-Item -ItemType Directory -Path $macPackageDir | Out-Null
    }
    
    Copy-Item $macDmg.FullName -Destination "$macPackageDir\" -Force
    Write-Host "  ✓ Copied macOS DMG" -ForegroundColor Green
    
    Copy-Item "$packagesDir\README.txt" -Destination "$macPackageDir\" -Force
    
    foreach ($doc in $docFiles) {
        if (Test-Path $doc) {
            Copy-Item $doc -Destination "$macPackageDir\" -Force
        }
    }
    
    $zipPath = "$packagesDir\Local-Password-Vault-macOS-1.2.0.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    Compress-Archive -Path "$macPackageDir\*" -DestinationPath $zipPath -Force
    Write-Host "  ✓ Created ZIP: $zipPath" -ForegroundColor Green
} else {
    Write-Host "  ⚠ macOS DMG not found (run: npm run dist:mac)" -ForegroundColor Yellow
}

# Linux Package (if exists)
Write-Host "`nChecking for Linux package..." -ForegroundColor Cyan
$linuxAppImage = Get-ChildItem -Path "release" -Filter "*.AppImage" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($linuxAppImage) {
    $linuxPackageDir = "$packagesDir\linux"
    if (-not (Test-Path $linuxPackageDir)) {
        New-Item -ItemType Directory -Path $linuxPackageDir | Out-Null
    }
    
    Copy-Item $linuxAppImage.FullName -Destination "$linuxPackageDir\" -Force
    Write-Host "  ✓ Copied Linux AppImage" -ForegroundColor Green
    
    Copy-Item "$packagesDir\README.txt" -Destination "$linuxPackageDir\" -Force
    
    foreach ($doc in $docFiles) {
        if (Test-Path $doc) {
            Copy-Item $doc -Destination "$linuxPackageDir\" -Force
        }
    }
    
    $zipPath = "$packagesDir\Local-Password-Vault-Linux-1.2.0.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    Compress-Archive -Path "$linuxPackageDir\*" -DestinationPath $zipPath -Force
    Write-Host "  ✓ Created ZIP: $zipPath" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Linux AppImage not found (run: npm run dist:linux)" -ForegroundColor Yellow
}

Write-Host "`nPackage creation complete!" -ForegroundColor Green
Write-Host "`nZIP files are in: $packagesDir\" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Upload ZIP files to GitHub Releases" -ForegroundColor White
Write-Host "2. Get download URLs from GitHub Releases" -ForegroundColor White
Write-Host "3. Update email templates with download URLs" -ForegroundColor White

