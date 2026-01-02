# Create Complete Packages Script
# Creates ZIP packages with BOTH app installer AND documentation for each OS

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Creating Complete Packages" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Get version from package.json
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version
Write-Host "Version: $version`n" -ForegroundColor Yellow

# Create packages directory
$packagesDir = "complete-packages"
if (Test-Path $packagesDir) {
    Remove-Item $packagesDir -Recurse -Force
}
New-Item -ItemType Directory -Path $packagesDir | Out-Null
Write-Host "Created $packagesDir directory" -ForegroundColor Green

# App installer locations (from GitHub Releases or local)
$installers = @{
    Windows = @{
        FileName = "Local Password Vault-Setup-$version.exe"
        LocalPath = "release\Local Password Vault Setup $version.exe"
        GitHubUrl = "https://github.com/kwilhelm1967/Vault/releases/latest/download/Local%20Password%20Vault-Setup-$version.exe"
        Description = "Windows 10/11 Installer"
    }
    macOS = @{
        FileName = "Local Password Vault-$version-mac.dmg"
        LocalPath = "release\Local Password Vault-$version-mac.dmg"
        GitHubUrl = "https://github.com/kwilhelm1967/Vault/releases/latest/download/Local%20Password%20Vault-$version-mac.dmg"
        Description = "macOS Installer (Intel and Apple Silicon)"
    }
    Linux = @{
        FileName = "Local Password Vault-$version.AppImage"
        LocalPath = "release\Local Password Vault-$version.AppImage"
        GitHubUrl = "https://github.com/kwilhelm1967/Vault/releases/latest/download/Local%20Password%20Vault-$version.AppImage"
        Description = "Linux AppImage"
    }
}

# Documentation files
$docFiles = @(
    "QUICK_START_GUIDE.md",
    "USER_MANUAL.md",
    "TROUBLESHOOTING_GUIDE.md",
    "PRIVACY_POLICY.md",
    "TERMS_OF_SERVICE.md"
)

# Function to create OS-specific README
function Create-Complete-README {
    param(
        [string]$OS,
        [string]$InstallerName,
        [string]$InstallerDescription,
        [string]$OutputPath
    )
    
    $installInstructions = ""
    if ($OS -eq "Windows") {
        $installInstructions = @"
1. Extract this ZIP file to a folder
2. Run "$InstallerName" to install Local Password Vault
3. Launch the app from Start Menu
4. Enter your trial key when prompted
"@
    } elseif ($OS -eq "macOS") {
        $installInstructions = @"
1. Extract this ZIP file
2. Open "$InstallerName"
3. Drag Local Password Vault to your Applications folder
4. Launch from Applications
5. Enter your trial key when prompted
"@
    } else {
        $installInstructions = @"
1. Extract this ZIP file
2. Make "$InstallerName" executable: chmod +x "$InstallerName"
3. Run: ./"$InstallerName"
4. Enter your trial key when prompted
"@
    }
    
    $readmeContent = @"
Local Password Vault - Complete Package
========================================
Version: $version
Platform: $OS

This package contains EVERYTHING you need to get started:
- The application installer ($InstallerDescription)
- Complete user documentation
- Setup guides and troubleshooting

CONTENTS:
---------
1. $InstallerName
   - The Local Password Vault application installer
   - $InstallerDescription

2. QUICK_START_GUIDE.md
   - Get started in 5 minutes
   - Installation and setup instructions
   - Basic usage guide

3. USER_MANUAL.md
   - Complete user manual
   - All features explained
   - Advanced usage and tips
   - Keyboard shortcuts

4. TROUBLESHOOTING_GUIDE.md
   - Common issues and solutions
   - Installation problems
   - Activation issues
   - Data recovery

5. PRIVACY_POLICY.md
   - Privacy policy and data handling
   - Security practices
   - Your rights and our commitments

6. TERMS_OF_SERVICE.md
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
- This package contains the full application and documentation
- No source code is included
- All documentation is in Markdown (.md) format
- You can open .md files with any text editor or Markdown viewer

© 2025 Local Password Vault. All rights reserved.
"@
    
    $readmeContent | Out-File -FilePath $OutputPath -Encoding UTF8
}

# Process each OS
foreach ($osKey in $installers.Keys) {
    $os = $installers[$osKey]
    Write-Host "`nProcessing $osKey package..." -ForegroundColor Cyan
    
    $packageDir = Join-Path $packagesDir $osKey.ToLower()
    New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
    
    # Check for installer locally first
    $installerFound = $false
    if (Test-Path $os.LocalPath) {
        Copy-Item $os.LocalPath -Destination (Join-Path $packageDir $os.FileName) -Force
        Write-Host "  [OK] Found installer locally: $($os.FileName)" -ForegroundColor Green
        $installerFound = $true
    } else {
        Write-Host "  [INFO] Installer not found locally: $($os.FileName)" -ForegroundColor Yellow
        Write-Host "  [INFO] You'll need to download it from GitHub Releases" -ForegroundColor Yellow
        Write-Host "  [INFO] URL: $($os.GitHubUrl)" -ForegroundColor Yellow
    }
    
    # Copy documentation files
    $docsSource = Join-Path "documentation-packages" $osKey.ToLower()
    foreach ($docFile in $docFiles) {
        $sourcePath = Join-Path $docsSource $docFile
        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath -Destination (Join-Path $packageDir $docFile) -Force
            Write-Host "  [OK] Copied $docFile" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] Not found: $docFile" -ForegroundColor Yellow
        }
    }
    
    # Create README
    Create-Complete-README -OS $osKey -InstallerName $os.FileName -InstallerDescription $os.Description -OutputPath (Join-Path $packageDir "README.txt")
    Write-Host "  [OK] Created README.txt" -ForegroundColor Green
    
    # Create ZIP (only if installer is present)
    if ($installerFound) {
        $zipPath = Join-Path $packagesDir "Local-Password-Vault-$osKey-Complete-$version.zip"
        if (Test-Path $zipPath) {
            Remove-Item $zipPath -Force
        }
        Compress-Archive -Path "$packageDir\*" -DestinationPath $zipPath -Force
        $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
        Write-Host "  [OK] Created ZIP: $(Split-Path $zipPath -Leaf) ($zipSize MB)" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] ZIP not created - installer missing" -ForegroundColor Yellow
        Write-Host "  [INFO] Add installer to: $packageDir\$($os.FileName)" -ForegroundColor Yellow
        Write-Host "  [INFO] Then run this script again to create ZIP" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Package Creation Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Complete packages location: $packagesDir\" -ForegroundColor Cyan
Write-Host "`nEach complete package includes:" -ForegroundColor Yellow
Write-Host "  ✓ Application installer (.exe/.dmg/.AppImage)" -ForegroundColor White
Write-Host "  ✓ Quick Start Guide" -ForegroundColor White
Write-Host "  ✓ User Manual" -ForegroundColor White
Write-Host "  ✓ Troubleshooting Guide" -ForegroundColor White
Write-Host "  ✓ Privacy Policy" -ForegroundColor White
Write-Host "  ✓ Terms of Service" -ForegroundColor White
Write-Host "  ✓ README.txt (installation instructions)" -ForegroundColor White

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. If installers are missing, download from GitHub Releases" -ForegroundColor White
Write-Host "  2. Place installers in the appropriate package folders" -ForegroundColor White
Write-Host "  3. Run this script again to create final ZIP files" -ForegroundColor White
Write-Host "  4. Upload ZIP files to GitHub Releases" -ForegroundColor White
Write-Host "  5. Update trial-success.html links to point to complete packages" -ForegroundColor White
Write-Host ""
Write-Host ""

