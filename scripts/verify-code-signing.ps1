# Code Signing Verification Script
# Verifies that code signing is properly configured

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Code Signing Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0

# Check 1: .env file exists
Write-Host "Checking .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✓ .env file exists" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "  Run: scripts/setup-code-signing.ps1" -ForegroundColor Yellow
    $errors++
}

# Check 2: Certificate file exists
Write-Host ""
Write-Host "Checking certificate file..." -ForegroundColor Yellow
$envContent = Get-Content ".env" -ErrorAction SilentlyContinue
if ($envContent) {
    $cscLink = ($envContent | Select-String "CSC_LINK=").ToString() -replace "CSC_LINK=", ""
    $cscLink = $cscLink.Trim()
    
    if ($cscLink) {
        if (Test-Path $cscLink) {
            Write-Host "✓ Certificate file found: $cscLink" -ForegroundColor Green
            $fileSize = (Get-Item $cscLink).Length
            Write-Host "  File size: $([math]::Round($fileSize/1KB, 2)) KB" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Certificate file not found: $cscLink" -ForegroundColor Red
            Write-Host "  Check CSC_LINK path in .env file" -ForegroundColor Yellow
            $errors++
        }
    } else {
        Write-Host "❌ CSC_LINK not found in .env" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "❌ Cannot read .env file" -ForegroundColor Red
    $errors++
}

# Check 3: Certificate password set
Write-Host ""
Write-Host "Checking certificate password..." -ForegroundColor Yellow
if ($envContent) {
    $cscPassword = ($envContent | Select-String "CSC_KEY_PASSWORD=").ToString() -replace "CSC_KEY_PASSWORD=", ""
    $cscPassword = $cscPassword.Trim()
    
    if ($cscPassword) {
        Write-Host "✓ Certificate password is set" -ForegroundColor Green
    } else {
        Write-Host "❌ CSC_KEY_PASSWORD not found in .env" -ForegroundColor Red
        $errors++
    }
}

# Check 4: Verify certificate is in .gitignore
Write-Host ""
Write-Host "Checking .gitignore..." -ForegroundColor Yellow
$gitignore = Get-Content ".gitignore" -ErrorAction SilentlyContinue
if ($gitignore -match "certs/" -or $gitignore -match "\.pfx" -or $gitignore -match "\.p12") {
    Write-Host "✓ Certificate files are in .gitignore" -ForegroundColor Green
} else {
    Write-Host "⚠ Certificate files may not be in .gitignore" -ForegroundColor Yellow
    Write-Host "  (This is okay if certs/ folder is ignored)" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "✓ All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now build signed installers:" -ForegroundColor Yellow
    Write-Host "  npm run dist:win" -ForegroundColor White
} else {
    Write-Host "❌ Found $errors issue(s)" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix:" -ForegroundColor Yellow
    Write-Host "  Run: scripts/setup-code-signing.ps1" -ForegroundColor White
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

