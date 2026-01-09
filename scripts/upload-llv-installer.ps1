# Upload Local Legacy Vault Installer to GitHub Releases
# This script uploads the LLV installer to the LocalLegacyVault repository
# 
# LOCKED IN: This script is for Local Legacy Vault (LLV) ONLY
# Repository: kwilhelm1967/LocalLegacyVault
# NEVER use kwilhelm1967/Vault - that is a different product/repository

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Uploading LLV Installer to GitHub" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuration - LLV repository ONLY
# LOCKED: Local Legacy Vault uses kwilhelm1967/LocalLegacyVault repository ONLY
# NEVER CHANGE TO kwilhelm1967/Vault - that is a different product/repository
$repoOwner = "kwilhelm1967"
$repoName = "LocalLegacyVault"
$version = "1.2.0"
$tag = "V$version"

# Installer file
$installerFile = "release\Local Legacy Vault Setup $version-x64.exe"
$installerPath = Join-Path (Get-Location) $installerFile

# Check if file exists
if (-not (Test-Path $installerPath)) {
    Write-Host "[ERROR] Installer file not found: $installerPath" -ForegroundColor Red
    Write-Host "Expected location: release\Local Legacy Vault Setup $version-x64.exe" -ForegroundColor Yellow
    exit 1
}

$fileSize = [math]::Round((Get-Item $installerPath).Length / 1MB, 2)
Write-Host "Installer found: $installerFile ($fileSize MB)" -ForegroundColor Green

# Check if gh CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] GitHub CLI (gh) is not installed." -ForegroundColor Red
    Write-Host "Please install GitHub CLI: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host "`nOr upload manually:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://github.com/$repoOwner/$repoName/releases" -ForegroundColor White
    Write-Host "2. Edit or create release: $tag" -ForegroundColor White
    Write-Host "3. Upload file: $installerFile" -ForegroundColor White
    exit 1
}

Write-Host "GitHub CLI found!" -ForegroundColor Green

# Check authentication
Write-Host "`nChecking authentication..." -ForegroundColor Cyan
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[INFO] Not authenticated. Starting authentication..." -ForegroundColor Yellow
    Write-Host "A browser window will open for GitHub authentication." -ForegroundColor Yellow
    gh auth login --web --scopes "repo"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Authentication failed." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[OK] Authentication successful!" -ForegroundColor Green
} else {
    Write-Host "[OK] Already authenticated!" -ForegroundColor Green
}

# Check if release exists
Write-Host "`nChecking for release: $tag" -ForegroundColor Cyan
try {
    $null = gh release view $tag --repo "$repoOwner/$repoName" 2>&1 | Out-Null
    $releaseExists = $LASTEXITCODE -eq 0
} catch {
    $releaseExists = $false
}

if (-not $releaseExists) {
    Write-Host "  [INFO] Release not found. Creating new release..." -ForegroundColor Yellow
    
    gh release create $tag `
        --repo "$repoOwner/$repoName" `
        --title "Local Legacy Vault $version" `
        --notes "Local Legacy Vault $version installer" `
        --draft=false `
        --prerelease=false
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Failed to create release." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  [OK] Release created!" -ForegroundColor Green
} else {
    Write-Host "  [OK] Release exists!" -ForegroundColor Green
}

# Upload installer
Write-Host "`nUploading installer..." -ForegroundColor Cyan
Write-Host "  File: $installerFile" -ForegroundColor Yellow
Write-Host "  Size: $fileSize MB" -ForegroundColor Yellow
Write-Host "  This may take a few minutes..." -ForegroundColor Yellow

gh release upload $tag $installerPath --repo "$repoOwner/$repoName" --clobber

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Uploaded successfully!" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Upload failed." -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Upload Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# Get release URL
$releaseUrl = gh release view $tag --repo "$repoOwner/$repoName" --json url --jq .url
Write-Host "Release URL: $releaseUrl" -ForegroundColor Cyan

Write-Host "`nDownload URL:" -ForegroundColor Yellow
$downloadUrl = "https://github.com/$repoOwner/$repoName/releases/download/$tag/Local%20Legacy%20Vault%20Setup%20$version-x64.exe"
Write-Host "  $downloadUrl" -ForegroundColor White

Write-Host "`n✅ Installer is now available on GitHub Releases!" -ForegroundColor Green
Write-Host "The trial success page download links will now work." -ForegroundColor Green
