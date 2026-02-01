# Run Trial Flow - Opens trial page (backend must be running)
# Full flow: User clicks Get Trial -> Enters email -> Gets trial key
#
# Option A - Production: Open https://api.localpasswordvault.com/lpv/triallpv.html
# Option B - Local:  1) cd backend && npm start  2) Open http://localhost:3001/lpv/triallpv.html

$trialUrl = "https://api.localpasswordvault.com/lpv/triallpv.html"

# If backend is running locally, prefer that (same-origin = most reliable)
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($r.StatusCode -eq 200) {
        $trialUrl = "http://localhost:3001/lpv/triallpv.html"
        Write-Host "Using local backend." -ForegroundColor Green
    }
} catch {}

Write-Host ""
Write-Host "Opening trial page: $trialUrl" -ForegroundColor Cyan
Write-Host "1. Enter your email" -ForegroundColor White
Write-Host "2. Click Get My Trial Key" -ForegroundColor White
Write-Host "3. Get your trial key" -ForegroundColor White
Write-Host ""
Start-Process $trialUrl
