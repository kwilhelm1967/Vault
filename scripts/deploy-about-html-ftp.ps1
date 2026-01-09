# Deploy about.html via FTP to Host Armada
# This uploads the updated about.html file directly to the server

param(
    [Parameter(Mandatory=$false)]
    [string]$FtpHost = "ftp.localpasswordvault.com",
    
    [Parameter(Mandatory=$false)]
    [string]$FtpUser,
    
    [Parameter(Mandatory=$false)]
    [string]$FtpPass,
    
    [Parameter(Mandatory=$false)]
    [string]$RemotePath = "/about.html"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying about.html via FTP (LPV)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$localFile = "C:\Users\kelly\OneDrive\Desktop\Vault-Main\LocalPasswordVault\LPV\about.html"

# Verify local file exists
if (-not (Test-Path $localFile)) {
    Write-Host "❌ ERROR: Local file not found: $localFile" -ForegroundColor Red
    exit 1
}

Write-Host "Local file: $localFile" -ForegroundColor Yellow
Write-Host "File size: $((Get-Item $localFile).Length / 1KB) KB" -ForegroundColor Gray
Write-Host ""

# If credentials provided, upload via FTP
if ($FtpUser -and $FtpPass) {
    Write-Host "Uploading via FTP..." -ForegroundColor Yellow
    Write-Host "Host: $FtpHost" -ForegroundColor Gray
    Write-Host "Path: $RemotePath" -ForegroundColor Gray
    Write-Host ""
    
    try {
        $ftpUri = "ftp://$FtpHost$RemotePath"
        $ftpRequest = [System.Net.FtpWebRequest]::Create($ftpUri)
        $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPass)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $ftpRequest.UseBinary = $true
        $ftpRequest.UsePassive = $true
        $ftpRequest.EnableSsl = $false
        
        $fileContent = [System.IO.File]::ReadAllBytes($localFile)
        $ftpRequest.ContentLength = $fileContent.Length
        
        Write-Host "Connecting..." -ForegroundColor Yellow
        $requestStream = $ftpRequest.GetRequestStream()
        $requestStream.Write($fileContent, 0, $fileContent.Length)
        $requestStream.Close()
        
        Write-Host "Uploading..." -ForegroundColor Yellow
        $response = $ftpRequest.GetResponse()
        Write-Host "✅ File uploaded successfully!" -ForegroundColor Green
        Write-Host "Status: $($response.StatusDescription)" -ForegroundColor Gray
        $response.Close()
        
        Write-Host ""
        Write-Host "✅ about.html deployed to server!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Note: You may need to clear your browser cache to see changes:" -ForegroundColor Yellow
        Write-Host "  - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)" -ForegroundColor White
        Write-Host "  - Or clear browser cache in settings" -ForegroundColor White
    } catch {
        Write-Host "❌ FTP Upload failed: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Make sure:" -ForegroundColor Yellow
        Write-Host "  1. FTP credentials are correct" -ForegroundColor White
        Write-Host "  2. FTP is enabled in Host Armada cPanel" -ForegroundColor White
        Write-Host "  3. Firewall allows FTP connections" -ForegroundColor White
        exit 1
    }
} else {
    Write-Host "FTP credentials not provided." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To upload via FTP, run:" -ForegroundColor Cyan
    Write-Host "  .\scripts\deploy-about-html-ftp.ps1 -FtpUser 'your_username' -FtpPass 'your_password'" -ForegroundColor White
    Write-Host ""
    Write-Host "Or get FTP credentials from Host Armada cPanel:" -ForegroundColor Yellow
    Write-Host "  1. Log into cPanel" -ForegroundColor White
    Write-Host "  2. Go to 'FTP Accounts'" -ForegroundColor White
    Write-Host "  3. Create or use existing FTP account" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Done!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
