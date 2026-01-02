# Upload Documentation Files to GitHub Releases
# This script uploads the documentation zip files to GitHub Releases

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Uploading Documentation to GitHub Releases" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuration
$repoOwner = "kwilhelm1967"
$repoName = "Vault"
$version = "1.2.0"
$tag = "v$version"

# Check for GitHub token
$token = $env:GITHUB_TOKEN
if (-not $token) {
    Write-Host "[INFO] No GITHUB_TOKEN environment variable found." -ForegroundColor Yellow
    Write-Host "Checking for GitHub CLI authentication..." -ForegroundColor Yellow
    
    # Try to get token from GitHub CLI config (if installed)
    $ghConfigPath = "$env:USERPROFILE\.config\gh\hosts.yml"
    if (Test-Path $ghConfigPath) {
        Write-Host "Found GitHub CLI config, but token access requires GitHub CLI." -ForegroundColor Yellow
    }
    
    Write-Host "`nTo upload files, you need a GitHub Personal Access Token." -ForegroundColor Yellow
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  1. Set GITHUB_TOKEN environment variable" -ForegroundColor White
    Write-Host "  2. Install GitHub CLI (gh) and authenticate" -ForegroundColor White
    Write-Host "  3. Use manual upload via browser (already opened)" -ForegroundColor White
    Write-Host ""
    Write-Host "For now, I'll check if the release exists and prepare the upload..." -ForegroundColor Cyan
}

# Files to upload
$filesDir = "github-releases-docs"
$files = @(
    "Local-Password-Vault-Windows-Documentation-$version.zip",
    "Local-Password-Vault-macOS-Documentation-$version.zip",
    "Local-Password-Vault-Linux-Documentation-$version.zip"
)

# Verify files exist
Write-Host "Verifying files..." -ForegroundColor Cyan
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

if ($token) {
    Write-Host "`nGitHub token found. Attempting to upload via API..." -ForegroundColor Green
    
    # Headers for GitHub API
    $headers = @{
        "Authorization" = "token $token"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    # Check if release exists
    Write-Host "`nChecking for existing release: $tag" -ForegroundColor Cyan
    $releaseUrl = "https://api.github.com/repos/$repoOwner/$repoName/releases/tags/$tag"
    
    try {
        $release = Invoke-RestMethod -Uri $releaseUrl -Headers $headers -Method Get -ErrorAction SilentlyContinue
        
        if ($release) {
            Write-Host "  [OK] Release found: $($release.name)" -ForegroundColor Green
            $releaseId = $release.id
        }
    } catch {
        Write-Host "  [INFO] Release not found. Will create new release." -ForegroundColor Yellow
        $releaseId = $null
    }
    
    # Create release if it doesn't exist
    if (-not $releaseId) {
        Write-Host "`nCreating new release: $tag" -ForegroundColor Cyan
        $createReleaseBody = @{
            tag_name = $tag
            name = "Local Password Vault $version"
            body = "Documentation packages for Local Password Vault $version"
            draft = $false
            prerelease = $false
        } | ConvertTo-Json
        
        try {
            $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repoOwner/$repoName/releases" `
                -Headers $headers `
                -Method Post `
                -Body $createReleaseBody `
                -ContentType "application/json"
            
            $releaseId = $release.id
            Write-Host "  [OK] Release created: $($release.name)" -ForegroundColor Green
        } catch {
            Write-Host "  [ERROR] Failed to create release: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "  Check your GitHub token permissions (needs 'repo' scope)" -ForegroundColor Yellow
            exit 1
        }
    }
    
    # Upload files
    Write-Host "`nUploading files to release..." -ForegroundColor Cyan
    foreach ($file in $files) {
        $filePath = Join-Path $filesDir $file
        $fileName = Split-Path $filePath -Leaf
        
        Write-Host "  Uploading: $fileName" -ForegroundColor Yellow
        
        # GitHub API endpoint for uploading release assets
        $uploadUrl = "https://uploads.github.com/repos/$repoOwner/$repoName/releases/$releaseId/assets?name=$fileName"
        
        # Read file as bytes
        $fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $filePath))
        
        # Upload headers (different for file uploads)
        $uploadHeaders = @{
            "Authorization" = "token $token"
            "Accept" = "application/vnd.github.v3+json"
            "Content-Type" = "application/zip"
        }
        
        try {
            $result = Invoke-RestMethod -Uri $uploadUrl `
                -Headers $uploadHeaders `
                -Method Post `
                -Body $fileBytes
            
            Write-Host "    [OK] Uploaded successfully!" -ForegroundColor Green
        } catch {
            Write-Host "    [ERROR] Upload failed: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Response.StatusCode -eq 422) {
                Write-Host "    File may already exist. Delete it from the release first." -ForegroundColor Yellow
            }
        }
    }
    
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "Upload Complete!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "Release URL: $($release.html_url)" -ForegroundColor Cyan
    Write-Host "`nTest download URLs:" -ForegroundColor Yellow
    foreach ($file in $files) {
        $fileName = Split-Path $file -Leaf
        Write-Host "  https://github.com/$repoOwner/$repoName/releases/latest/download/$fileName" -ForegroundColor White
    }
    
} else {
    Write-Host "`n========================================" -ForegroundColor Yellow
    Write-Host "Manual Upload Required" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Yellow
    
    Write-Host "To enable automatic uploads, set a GitHub Personal Access Token:" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://github.com/settings/tokens" -ForegroundColor White
    Write-Host "  2. Generate new token with 'repo' scope" -ForegroundColor White
    Write-Host "  3. Set environment variable: `$env:GITHUB_TOKEN = 'your-token-here'" -ForegroundColor White
    Write-Host "  4. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "For now, use the browser window that was opened to drag and drop files." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Files ready in: $filesDir\" -ForegroundColor Cyan
}



