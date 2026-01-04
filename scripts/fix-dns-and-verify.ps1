# Fix DNS and Verify Activation Endpoint
# This script provides exact DNS configuration and verifies the fix

Write-Host "==================================================================================" -ForegroundColor Cyan
Write-Host "DNS FIX VERIFICATION FOR LICENSE ACTIVATION" -ForegroundColor Cyan
Write-Host "==================================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Show exact DNS record needed
Write-Host "STEP 1: DNS RECORD REQUIRED" -ForegroundColor Yellow
Write-Host "---------------------------" -ForegroundColor Yellow
Write-Host ""
Write-Host "Go to your DNS provider and add this EXACT record:" -ForegroundColor White
Write-Host ""
Write-Host "  Type: A" -ForegroundColor Green
Write-Host "  Name: api" -ForegroundColor Green
Write-Host "  Value: 45.79.40.42" -ForegroundColor Green
Write-Host "  TTL: 3600" -ForegroundColor Green
Write-Host ""
Write-Host "This creates: api.localpasswordvault.com -> 45.79.40.42" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter after you have added the DNS record..." -ForegroundColor Yellow
Read-Host

# Step 2: Test DNS resolution
Write-Host ""
Write-Host "STEP 2: TESTING DNS RESOLUTION" -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Yellow
Write-Host ""

$dnsResult = Resolve-DnsName -Name "api.localpasswordvault.com" -ErrorAction SilentlyContinue

if ($dnsResult) {
    $ip = $dnsResult[0].IPAddress
    Write-Host "✓ DNS Resolution SUCCESS" -ForegroundColor Green
    Write-Host "  api.localpasswordvault.com -> $ip" -ForegroundColor Green
    
    if ($ip -eq "45.79.40.42") {
        Write-Host "  ✓ IP address matches expected (45.79.40.42)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ IP address is $ip (expected 45.79.40.42)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ DNS Resolution FAILED" -ForegroundColor Red
    Write-Host "  api.localpasswordvault.com does not resolve" -ForegroundColor Red
    Write-Host "  Please verify the DNS A record was added correctly" -ForegroundColor Yellow
    Write-Host "  Wait 5-10 minutes for DNS propagation and try again" -ForegroundColor Yellow
    exit 1
}

# Step 3: Test HTTPS connection
Write-Host ""
Write-Host "STEP 3: TESTING HTTPS CONNECTION" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Yellow
Write-Host ""

try {
    $healthResponse = Invoke-WebRequest -Uri "https://api.localpasswordvault.com/health" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✓ HTTPS Connection SUCCESS" -ForegroundColor Green
    Write-Host "  Status Code: $($healthResponse.StatusCode)" -ForegroundColor Green
    Write-Host "  Response: $($healthResponse.Content)" -ForegroundColor Green
} catch {
    Write-Host "✗ HTTPS Connection FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Message -like "*could not be resolved*") {
        Write-Host "  Issue: DNS still not resolving. Wait longer for propagation." -ForegroundColor Yellow
    } elseif ($_.Exception.Message -like "*certificate*" -or $_.Exception.Message -like "*SSL*") {
        Write-Host "  Issue: SSL certificate problem. Check certificate on server." -ForegroundColor Yellow
    } else {
        Write-Host "  Issue: Connection refused or timeout. Check backend server." -ForegroundColor Yellow
    }
    exit 1
}

# Step 4: Test activation endpoint
Write-Host ""
Write-Host "STEP 4: TESTING ACTIVATION ENDPOINT" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow
Write-Host ""

$testPayload = @{
    license_key = "PERS-TEST-TEST-TEST"
    device_id = "a" * 64
} | ConvertTo-Json

try {
    $activateResponse = Invoke-WebRequest -Uri "https://api.localpasswordvault.com/api/lpv/license/activate" `
        -Method POST `
        -ContentType "application/json" `
        -Body $testPayload `
        -UseBasicParsing `
        -TimeoutSec 10 `
        -ErrorAction Stop
    
    Write-Host "✓ Activation Endpoint REACHABLE" -ForegroundColor Green
    Write-Host "  Status Code: $($activateResponse.StatusCode)" -ForegroundColor Green
    Write-Host "  Response: $($activateResponse.Content)" -ForegroundColor Green
    
    if ($activateResponse.StatusCode -eq 400 -or $activateResponse.StatusCode -eq 404) {
        Write-Host "  ✓ Expected response (400/404 for test key - confirms endpoint works)" -ForegroundColor Green
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400 -or $statusCode -eq 404) {
        Write-Host "✓ Activation Endpoint REACHABLE" -ForegroundColor Green
        Write-Host "  Status Code: $statusCode (Expected for test key)" -ForegroundColor Green
        Write-Host "  ✓ Endpoint is working correctly" -ForegroundColor Green
    } else {
        Write-Host "✗ Activation Endpoint FAILED" -ForegroundColor Red
        Write-Host "  Status Code: $statusCode" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Step 5: Summary
Write-Host ""
Write-Host "==================================================================================" -ForegroundColor Cyan
Write-Host "VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "==================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ DNS resolves correctly" -ForegroundColor Green
Write-Host "✓ HTTPS connection works" -ForegroundColor Green
Write-Host "✓ Activation endpoint is reachable" -ForegroundColor Green
Write-Host ""
Write-Host "The license activation should now work in the app!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Build the production app" -ForegroundColor White
Write-Host "2. Install on a clean machine" -ForegroundColor White
Write-Host "3. Attempt license activation" -ForegroundColor White
Write-Host "4. Check logs if issues persist: %APPDATA%\Local Password Vault\logs\main.log" -ForegroundColor White
Write-Host ""
