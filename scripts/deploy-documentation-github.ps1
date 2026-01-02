# Deploy Documentation Packages to GitHub Releases
# This script prepares the documentation files for upload to GitHub Releases

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "GitHub Releases Deployment Preparation" -ForegroundColor Cyan
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

# GitHub Releases directory
$githubDir = "github-releases-docs"
if (Test-Path $githubDir) {
    Remove-Item $githubDir -Recurse -Force
}
New-Item -ItemType Directory -Path $githubDir | Out-Null
Write-Host "Created GitHub Releases directory: $githubDir" -ForegroundColor Green

# Copy zip files
Write-Host "`nPreparing files for GitHub Releases..." -ForegroundColor Cyan
$zipFiles = @(
    "Local-Password-Vault-Windows-Documentation-$version.zip",
    "Local-Password-Vault-macOS-Documentation-$version.zip",
    "Local-Password-Vault-Linux-Documentation-$version.zip"
)

foreach ($zipFile in $zipFiles) {
    $sourcePath = Join-Path $sourceDir $zipFile
    $destPath = Join-Path $githubDir $zipFile
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath -Destination $destPath -Force
        $fileSize = (Get-Item $destPath).Length / 1KB
        Write-Host "  [OK] Prepared $zipFile ($([math]::Round($fileSize, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Not found: $zipFile" -ForegroundColor Yellow
    }
}

# Create GitHub upload instructions
$instructions = @"
# Upload Documentation to GitHub Releases
## Local Password Vault - Version $version

## Files Ready for Upload
Location: $githubDir\

Files to upload:
1. Local-Password-Vault-Windows-Documentation-$version.zip
2. Local-Password-Vault-macOS-Documentation-$version.zip
3. Local-Password-Vault-Linux-Documentation-$version.zip

## Upload Steps

### Option 1: Upload to Existing Release
1. Go to: https://github.com/kwilhelm1967/Vault/releases
2. Find the release for version $version (or create a new one)
3. Click "Edit" on the release
4. Scroll to "Attach binaries by dropping them here or selecting them"
5. Drag and drop all 3 zip files from: $githubDir\
6. Click "Update release"

### Option 2: Create New Release
1. Go to: https://github.com/kwilhelm1967/Vault/releases
2. Click "Draft a new release"
3. Tag version: v$version (or your version tag)
4. Release title: "Local Password Vault $version"
5. Description: (add release notes)
6. Scroll to "Attach binaries by dropping them here or selecting them"
7. Drag and drop all 3 zip files from: $githubDir\
8. Click "Publish release"

## Verify Upload
After uploading, test these URLs:
- https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-Windows-Documentation-$version.zip
- https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-macOS-Documentation-$version.zip
- https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-Linux-Documentation-$version.zip

Each should download the zip file.

## HTML Links
The trial-success.html file has been updated with these GitHub Releases URLs:
- Windows: https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-Windows-Documentation-$version.zip
- macOS: https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-macOS-Documentation-$version.zip
- Linux: https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-Linux-Documentation-$version.zip

## Important Notes
- The `/latest/download/` path automatically points to the latest release
- If you create a new release, the links will automatically point to it
- Filenames must match exactly (case-sensitive)
- All 3 files should be uploaded to the same release

## Testing
After uploading:
1. Visit: https://localpasswordvault.com/trial-success.html
2. Click each documentation download button
3. Verify files download correctly from GitHub
"@

$instructionsPath = Join-Path $githubDir "GITHUB_UPLOAD_INSTRUCTIONS.txt"
$instructions | Out-File -FilePath $instructionsPath -Encoding UTF8
Write-Host "`nCreated upload instructions: $instructionsPath" -ForegroundColor Green

# Create quick reference
$quickRef = @"
QUICK GITHUB UPLOAD CHECKLIST
==============================

1. [ ] Go to: https://github.com/kwilhelm1967/Vault/releases
2. [ ] Find or create release for version $version
3. [ ] Click "Edit" or "Draft a new release"
4. [ ] Drag and drop 3 zip files from: $githubDir\
5. [ ] Click "Update release" or "Publish release"
6. [ ] Test download URLs in browser
7. [ ] Test on trial-success.html page

Files to upload:
- Local-Password-Vault-Windows-Documentation-$version.zip
- Local-Password-Vault-macOS-Documentation-$version.zip
- Local-Password-Vault-Linux-Documentation-$version.zip

Location: $githubDir\
"@

$quickRefPath = Join-Path $githubDir "QUICK_REFERENCE.txt"
$quickRef | Out-File -FilePath $quickRefPath -Encoding UTF8
Write-Host "Created quick reference: $quickRefPath" -ForegroundColor Green

# Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "GitHub Releases Package Ready!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Files ready for GitHub Releases:" -ForegroundColor Cyan
Write-Host "  $githubDir\" -ForegroundColor White
Get-ChildItem $githubDir -Filter "*.zip" | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "    - $($_.Name) ($size KB)" -ForegroundColor White
}

Write-Host "`nGitHub Releases URLs:" -ForegroundColor Cyan
Write-Host "  Windows: https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-Windows-Documentation-$version.zip" -ForegroundColor White
Write-Host "  macOS: https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-macOS-Documentation-$version.zip" -ForegroundColor White
Write-Host "  Linux: https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-Linux-Documentation-$version.zip" -ForegroundColor White

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Review: $githubDir\GITHUB_UPLOAD_INSTRUCTIONS.txt" -ForegroundColor White
Write-Host "  2. Upload files to GitHub Releases" -ForegroundColor White
Write-Host "  3. Test download links" -ForegroundColor White
Write-Host "`nHTML file updated: LPV/trial-success.html" -ForegroundColor Green
Write-Host ""



