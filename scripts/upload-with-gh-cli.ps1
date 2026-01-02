# Upload Documentation Files to GitHub Releases using GitHub CLI
# This script uses gh CLI to upload files

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Uploading Documentation via GitHub CLI" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuration
$repoOwner = "kwilhelm1967"
$repoName = "Vault"
$version = "1.2.0"
$tag = "v$version"

# Check if gh is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] GitHub CLI (gh) is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please restart your terminal or add gh to PATH." -ForegroundColor Yellow
    exit 1
}

Write-Host "GitHub CLI found!" -ForegroundColor Green

# Check authentication
Write-Host "`nChecking authentication..." -ForegroundColor Cyan
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[INFO] Not authenticated. Starting authentication..." -ForegroundColor Yellow
    Write-Host "A browser window will open for GitHub authentication." -ForegroundColor Yellow
    Write-Host "Please complete the authentication in the browser." -ForegroundColor Yellow
    Write-Host ""
    
    # Start authentication (this will open browser)
    gh auth login --web --scopes "repo"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Authentication failed or was cancelled." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[OK] Authentication successful!" -ForegroundColor Green
} else {
    Write-Host "[OK] Already authenticated!" -ForegroundColor Green
    Write-Host $authStatus
}

# Files to upload
$filesDir = "github-releases-docs"
$files = @(
    "Local-Password-Vault-Windows-Documentation-$version.zip",
    "Local-Password-Vault-macOS-Documentation-$version.zip",
    "Local-Password-Vault-Linux-Documentation-$version.zip"
)

# Verify files exist
Write-Host "`nVerifying files..." -ForegroundColor Cyan
foreach ($file in $files) {
    $filePath = Join-Path $filesDir $file
    if (Test-Path $filePath) {
        $size = [math]::Round((Get-Item $filePath).Length / 1KB, 2)
        Write-Host "  [OK] $file ($size KB)" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Not found: $file" -ForegroundColor Red
        exit 1
    }
}

# Check if release exists
Write-Host "`nChecking for release: $tag" -ForegroundColor Cyan
$releaseExists = gh release view $tag --repo "$repoOwner/$repoName" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [INFO] Release not found. Creating new release..." -ForegroundColor Yellow
    
    # Create release
    gh release create $tag `
        --repo "$repoOwner/$repoName" `
        --title "Local Password Vault $version" `
        --notes "Documentation packages for Local Password Vault $version" `
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

# Upload files
Write-Host "`nUploading files to release..." -ForegroundColor Cyan
foreach ($file in $files) {
    $filePath = Join-Path $filesDir $file
    $fileName = Split-Path $filePath -Leaf
    
    Write-Host "  Uploading: $fileName" -ForegroundColor Yellow
    
    # Upload using gh CLI
    gh release upload $tag $filePath --repo "$repoOwner/$repoName" --clobber
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [OK] Uploaded successfully!" -ForegroundColor Green
    } else {
        Write-Host "    [WARNING] Upload may have failed or file already exists." -ForegroundColor Yellow
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Upload Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# Get release URL
$releaseUrl = gh release view $tag --repo "$repoOwner/$repoName" --json url --jq .url
Write-Host "Release URL: $releaseUrl" -ForegroundColor Cyan

Write-Host "`nTest download URLs:" -ForegroundColor Yellow
foreach ($file in $files) {
    $fileName = Split-Path $file -Leaf
    Write-Host "  https://github.com/$repoOwner/$repoName/releases/latest/download/$fileName" -ForegroundColor White
}

Write-Host "`nVerifying uploads..." -ForegroundColor Cyan
gh release view $tag --repo "$repoOwner/$repoName" --json assets --jq '.assets[] | "  - \(.name) (\(.size | . / 1024 | floor) KB)"'

Write-Host "`n✅ All done! Documentation files are now available on GitHub Releases." -ForegroundColor Green
Write-Host ""



