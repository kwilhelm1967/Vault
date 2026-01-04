# Test License Activation Endpoint
# This script tests the exact endpoint used by the app

$LICENSE_SERVER_URL = $env:VITE_LICENSE_SERVER_URL
if (-not $LICENSE_SERVER_URL) {
    $LICENSE_SERVER_URL = "https://api.localpasswordvault.com"
}

$ENDPOINT = "/api/lpv/license/activate"
$FULL_URL = "$LICENSE_SERVER_URL$ENDPOINT"

Write-Host "=================================================================================="
Write-Host "LICENSE ACTIVATION ENDPOINT TEST"
Write-Host "=================================================================================="
Write-Host ""
Write-Host "Configuration:"
Write-Host "  License Server URL: $LICENSE_SERVER_URL"
Write-Host "  Endpoint: $ENDPOINT"
Write-Host "  Full URL: $FULL_URL"
Write-Host ""

# Test payload
$testPayload = @{
    license_key = "PERS-TEST-TEST-TEST"
    device_id = "a" * 64
} | ConvertTo-Json

Write-Host "Test Payload:"
Write-Host $testPayload
Write-Host ""

Write-Host "Testing with curl (verbose TLS info)..."
Write-Host ""

# Use curl with verbose output to see TLS details
$curlCommand = "curl -v -X POST `"$FULL_URL`" -H `"Content-Type: application/json`" -d '$testPayload' --max-time 30"
Write-Host "Command: $curlCommand"
Write-Host ""
Write-Host "Output:"
Write-Host ""

Invoke-Expression $curlCommand

Write-Host ""
Write-Host "=================================================================================="
Write-Host "If curl is not available, use the Node.js diagnostic script:"
Write-Host "  node scripts/diagnose-activation-error.js"
Write-Host "=================================================================================="
