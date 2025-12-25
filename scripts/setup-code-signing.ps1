# Code Signing Certificate Setup Script for Windows
# This script helps set up code signing certificates

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Code Signing Certificate Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if certs directory exists
if (-not (Test-Path "certs")) {
    Write-Host "Creating certs directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "certs" | Out-Null
    Write-Host "✓ Created certs directory" -ForegroundColor Green
}

Write-Host ""
Write-Host "STEP 1: Download Certificate from SSL.com" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow
Write-Host "1. Go to: https://www.ssl.com/account/" -ForegroundColor White
Write-Host "2. Navigate to: My Certificates → Code Signing Certificates" -ForegroundColor White
Write-Host "3. Download certificate as PKCS#12 (.pfx) format" -ForegroundColor White
Write-Host "4. Save the password provided by SSL.com" -ForegroundColor White
Write-Host ""
$continue = Read-Host "Press Enter when you have downloaded the certificate file"

Write-Host ""
Write-Host "STEP 2: Place Certificate File" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow
Write-Host "Please provide the path to your downloaded .pfx certificate file:" -ForegroundColor White
$certPath = Read-Host "Certificate file path (or drag and drop file here)"

# Clean up path (remove quotes if present)
$certPath = $certPath.Trim('"')

# Check if file exists
if (-not (Test-Path $certPath)) {
    Write-Host "❌ Error: Certificate file not found at: $certPath" -ForegroundColor Red
    Write-Host "Please check the path and try again." -ForegroundColor Red
    exit 1
}

# Get filename
$fileName = Split-Path $certPath -Leaf

# Copy to certs directory
$targetPath = Join-Path "certs" $fileName
Write-Host ""
Write-Host "Copying certificate to certs directory..." -ForegroundColor Yellow
Copy-Item $certPath $targetPath -Force
Write-Host "✓ Certificate copied to: $targetPath" -ForegroundColor Green

Write-Host ""
Write-Host "STEP 3: Certificate Password" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow
$certPassword = Read-Host "Enter the certificate password from SSL.com" -AsSecureString
$certPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($certPassword)
)

Write-Host ""
Write-Host "STEP 4: Create .env File" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "⚠ .env file already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to add code signing config? (y/n)"
    if ($overwrite -eq "y" -or $overwrite -eq "Y") {
        # Read existing .env
        $existingEnv = Get-Content ".env" -Raw
        # Check if code signing already exists
        if ($existingEnv -match "CSC_LINK") {
            Write-Host "⚠ Code signing config already exists in .env" -ForegroundColor Yellow
            $replace = Read-Host "Replace existing code signing config? (y/n)"
            if ($replace -eq "y" -or $replace -eq "Y") {
                # Remove old code signing lines
                $existingEnv = $existingEnv -replace "(?m)^CSC_LINK=.*$", ""
                $existingEnv = $existingEnv -replace "(?m)^CSC_KEY_PASSWORD=.*$", ""
            } else {
                Write-Host "Keeping existing configuration." -ForegroundColor Green
                exit 0
            }
        }
        # Add new code signing config
        $newConfig = @"

# Windows Code Signing (SSL.com)
CSC_LINK=certs/$fileName
CSC_KEY_PASSWORD=$certPasswordPlain
"@
        Add-Content ".env" $newConfig
        Write-Host "✓ Added code signing config to .env" -ForegroundColor Green
    }
} else {
    # Create new .env file
    $envContent = @"
# Windows Code Signing (SSL.com)
CSC_LINK=certs/$fileName
CSC_KEY_PASSWORD=$certPasswordPlain
"@
    Set-Content ".env" $envContent
    Write-Host "✓ Created .env file with code signing config" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test code signing: npm run dist:win" -ForegroundColor White
Write-Host "2. Verify signature: Right-click installer → Properties → Digital Signatures" -ForegroundColor White
Write-Host ""
Write-Host "Certificate location: $targetPath" -ForegroundColor Cyan
Write-Host "✓ Certificate is in .gitignore (won't be committed)" -ForegroundColor Green
Write-Host ""

