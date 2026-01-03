# Create production .env file for frontend
# Run this script to create .env with production settings

$envContent = @"
# Production Environment Variables
# Frontend configuration for production build

# Backend API URL (production server)
# Use IP address for testing, or domain if configured
VITE_LICENSE_SERVER_URL=https://api.localpasswordvault.com

# App Mode
VITE_APP_MODE=production

# License Signing Secret (must match backend LICENSE_SIGNING_SECRET)
# Get from: backend/.env on your server
# Run on server: grep LICENSE_SIGNING_SECRET /var/www/lpv-api/Vault/backend/.env
VITE_LICENSE_SIGNING_SECRET=

# Stripe Publishable Key (production)
# Get from: https://dashboard.stripe.com/apikeys
# Use pk_live_xxxxx for production
VITE_STRIPE_PUBLISHABLE_KEY=
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline

Write-Host "✅ Created .env file in project root" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: You need to fill in these values:" -ForegroundColor Yellow
Write-Host "   1. VITE_LICENSE_SIGNING_SECRET - Get from server" -ForegroundColor Yellow
Write-Host "   2. VITE_STRIPE_PUBLISHABLE_KEY - Get from Stripe Dashboard" -ForegroundColor Yellow
Write-Host ""
