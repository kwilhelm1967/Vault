# Quick DNS and Connection Check
# Run this script to check if DNS has propagated and connection works

Write-Host "==================================================================================" -ForegroundColor Cyan
Write-Host "DNS PROPAGATION CHECK" -ForegroundColor Cyan
Write-Host "==================================================================================" -ForegroundColor Cyan
Write-Host ""

# Test DNS Resolution
Write-Host "Testing DNS resolution..." -ForegroundColor Yellow
$dnsResult = Resolve-DnsName -Name "api.localpasswordvault.com" -ErrorAction SilentlyContinue

if ($dnsResult) {
    $ip = $dnsResult[0].IPAddress
    Write-Host "✓ DNS Resolution SUCCESS" -ForegroundColor Green
    Write-Host "  api.localpasswordvault.com -> $ip" -ForegroundColor Green
    
    if ($ip -eq "45.79.40.42") {
        Write-Host "  ✓ IP address matches expected (45.79.40.42)" -ForegroundColor Green
        Write-Host ""
        
        # Test HTTPS Connection
        Write-Host "Testing HTTPS connection..." -ForegroundColor Yellow
        try {
            $healthResponse = Invoke-WebRequest -Uri "https://api.localpasswordvault.com/health" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
            Write-Host "✓ HTTPS Connection SUCCESS" -ForegroundColor Green
            Write-Host "  Status Code: $($healthResponse.StatusCode)" -ForegroundColor Green
            Write-Host "  Response: $($healthResponse.Content)" -ForegroundColor Green
            Write-Host ""
            Write-Host "==================================================================================" -ForegroundColor Green
            Write-Host "READY! DNS has propagated and backend is accessible." -ForegroundColor Green
            Write-Host "You can now test license activation in the app." -ForegroundColor Green
            Write-Host "==================================================================================" -ForegroundColor Green
        } catch {
            Write-Host "✗ HTTPS Connection FAILED" -ForegroundColor Red
            Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Message -like "*certificate*" -or $_.Exception.Message -like "*SSL*") {
                Write-Host "  Issue: SSL certificate problem. Check server SSL configuration." -ForegroundColor Yellow
            } else {
                Write-Host "  Issue: Connection refused or timeout. Check backend server." -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  ⚠ IP address is $ip (expected 45.79.40.42)" -ForegroundColor Yellow
        Write-Host "  DNS may still be propagating or pointing to wrong IP." -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ DNS Resolution FAILED - Still propagating" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "DNS propagation can take:" -ForegroundColor White
    Write-Host "  - Usually: 5-30 minutes" -ForegroundColor White
    Write-Host "  - Sometimes: Up to 48 hours (rare)" -ForegroundColor White
    Write-Host ""
    Write-Host "Run this script again in a few minutes to check." -ForegroundColor Yellow
    Write-Host "Command: .\scripts\check-dns-ready.ps1" -ForegroundColor Cyan
}

Write-Host ""
