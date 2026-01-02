# Deploy Documentation Packages to Server
# This script prepares the documentation files for upload to Host Armada

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Documentation Deployment Preparation" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Get version from package.json
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version
Write-Host "Version: $version`n" -ForegroundColor Yellow

# Source directory
$sourceDir = "documentation-packages"
if (-not (Test-Path $sourceDir)) {
    Write-Host "[ERROR] Documentation packages not found. Run create-documentation-packages.ps1 first." -ForegroundColor Red
    exit 1
}

# Deployment directory
$deployDir = "deploy-documentation"
if (Test-Path $deployDir) {
    Remove-Item $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $deployDir | Out-Null
Write-Host "Created deployment directory: $deployDir" -ForegroundColor Green

# Create folder structure matching server
$serverStructure = Join-Path $deployDir "downloads\documentation"
New-Item -ItemType Directory -Path $serverStructure -Force | Out-Null
Write-Host "Created server folder structure: downloads\documentation" -ForegroundColor Green

# Copy zip files
Write-Host "`nCopying documentation packages..." -ForegroundColor Cyan
$zipFiles = @(
    "Local-Password-Vault-Windows-Documentation-$version.zip",
    "Local-Password-Vault-macOS-Documentation-$version.zip",
    "Local-Password-Vault-Linux-Documentation-$version.zip"
)

foreach ($zipFile in $zipFiles) {
    $sourcePath = Join-Path $sourceDir $zipFile
    $destPath = Join-Path $serverStructure $zipFile
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath -Destination $destPath -Force
        $fileSize = (Get-Item $destPath).Length / 1KB
        Write-Host "  [OK] Copied $zipFile ($([math]::Round($fileSize, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Not found: $zipFile" -ForegroundColor Yellow
    }
}

# Create upload instructions
$instructions = @"
# Documentation Upload Instructions
## Local Password Vault - Version $version

## Files Ready for Upload
Location: $deployDir\downloads\documentation\

Files to upload:
1. Local-Password-Vault-Windows-Documentation-$version.zip
2. Local-Password-Vault-macOS-Documentation-$version.zip
3. Local-Password-Vault-Linux-Documentation-$version.zip

## Upload Steps (Host Armada cPanel)

### Step 1: Access File Manager
1. Log into Host Armada cPanel
2. Open File Manager
3. Navigate to: localpasswordvault.com/

### Step 2: Create Folder Structure
1. If 'downloads' folder doesn't exist, create it
2. Inside 'downloads', create 'documentation' folder
3. Final path: localpasswordvault.com/downloads/documentation/

### Step 3: Upload Files
1. Navigate to: localpasswordvault.com/downloads/documentation/
2. Click "Upload" button
3. Upload all 3 zip files from: $deployDir\downloads\documentation\
4. Wait for upload to complete

### Step 4: Verify Upload
Test these URLs in your browser:
- https://localpasswordvault.com/downloads/documentation/Local-Password-Vault-Windows-Documentation-$version.zip
- https://localpasswordvault.com/downloads/documentation/Local-Password-Vault-macOS-Documentation-$version.zip
- https://localpasswordvault.com/downloads/documentation/Local-Password-Vault-Linux-Documentation-$version.zip

Each should download the zip file.

### Step 5: Test on Trial Success Page
1. Visit: https://localpasswordvault.com/trial-success.html
2. Click each documentation download button
3. Verify files download correctly

## File Permissions
Ensure files have read permissions (644 or 755):
- Right-click each file in File Manager
- Select "Change Permissions"
- Set to: 644 (or 755)

## Troubleshooting
- If downloads fail, check file permissions
- Verify folder path matches exactly: /downloads/documentation/
- Check that filenames match exactly (case-sensitive)
- Clear browser cache if links don't work

## Server Path Structure
```
localpasswordvault.com/
├── LPV/                              (HTML files)
│   ├── trial-success.html
│   └── (other HTML files)
└── downloads/
    └── documentation/
        ├── Local-Password-Vault-Windows-Documentation-$version.zip
        ├── Local-Password-Vault-macOS-Documentation-$version.zip
        └── Local-Password-Vault-Linux-Documentation-$version.zip
```

## Next Steps
After uploading, test the download links on the trial-success.html page.
"@

$instructionsPath = Join-Path $deployDir "UPLOAD_INSTRUCTIONS.txt"
$instructions | Out-File -FilePath $instructionsPath -Encoding UTF8
Write-Host "`nCreated upload instructions: $instructionsPath" -ForegroundColor Green

# Create quick reference
$quickRef = @"
QUICK UPLOAD CHECKLIST
=======================

1. [ ] Open Host Armada cPanel File Manager
2. [ ] Navigate to: localpasswordvault.com/
3. [ ] Create folder: downloads/documentation/
4. [ ] Upload 3 zip files from: $deployDir\downloads\documentation\
5. [ ] Verify file permissions (644 or 755)
6. [ ] Test download URLs in browser
7. [ ] Test on trial-success.html page

Files to upload:
- Local-Password-Vault-Windows-Documentation-$version.zip
- Local-Password-Vault-macOS-Documentation-$version.zip
- Local-Password-Vault-Linux-Documentation-$version.zip

Location: $deployDir\downloads\documentation\
"@

$quickRefPath = Join-Path $deployDir "QUICK_REFERENCE.txt"
$quickRef | Out-File -FilePath $quickRefPath -Encoding UTF8
Write-Host "Created quick reference: $quickRefPath" -ForegroundColor Green

# Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Package Ready!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Deployment package location:" -ForegroundColor Cyan
Write-Host "  $deployDir\" -ForegroundColor White
Write-Host "`nFiles ready for upload:" -ForegroundColor Cyan
Write-Host "  $deployDir\downloads\documentation\" -ForegroundColor White
Get-ChildItem (Join-Path $deployDir "downloads\documentation") | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "    - $($_.Name) ($size KB)" -ForegroundColor White
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Review: $deployDir\UPLOAD_INSTRUCTIONS.txt" -ForegroundColor White
Write-Host "  2. Upload files to Host Armada cPanel" -ForegroundColor White
Write-Host "  3. Test download links" -ForegroundColor White
Write-Host "`n"



