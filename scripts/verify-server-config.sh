#!/bin/bash
# Server Configuration Verification Script
# Run this on the server (45.79.40.42) via SSH to verify backend is ready

echo "=================================================================================="
echo "BACKEND SERVER CONFIGURATION VERIFICATION"
echo "=================================================================================="
echo ""

# Step 1: Check PM2 status
echo "STEP 1: CHECKING BACKEND PROCESS"
echo "-------------------------------"
pm2 status
if [ $? -eq 0 ]; then
    echo "✓ PM2 is running"
    pm2 list | grep -q "lpv-api.*online"
    if [ $? -eq 0 ]; then
        echo "✓ Backend (lpv-api) is online"
    else
        echo "✗ Backend (lpv-api) is NOT online"
        echo "  Fix: pm2 restart lpv-api"
    fi
else
    echo "✗ PM2 is not running"
    echo "  Fix: pm2 start backend/server.js --name lpv-api"
fi
echo ""

# Step 2: Check backend health endpoint (localhost)
echo "STEP 2: CHECKING BACKEND HEALTH (LOCALHOST)"
echo "-------------------------------------------"
curl -s http://localhost:3001/health
if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Backend responds on localhost:3001"
else
    echo "✗ Backend does not respond on localhost:3001"
    echo "  Check: pm2 logs lpv-api"
fi
echo ""

# Step 3: Check SSL certificate
echo "STEP 3: CHECKING SSL CERTIFICATE"
echo "-------------------------------"
certbot certificates 2>/dev/null | grep -q "api.localpasswordvault.com"
if [ $? -eq 0 ]; then
    echo "✓ SSL certificate exists for api.localpasswordvault.com"
    
    # Check certificate expiration
    CERT_EXPIRY=$(certbot certificates 2>/dev/null | grep -A 5 "api.localpasswordvault.com" | grep "Expiry Date" | awk '{print $3, $4, $5}')
    if [ ! -z "$CERT_EXPIRY" ]; then
        echo "  Certificate expires: $CERT_EXPIRY"
    fi
else
    echo "✗ SSL certificate does NOT exist for api.localpasswordvault.com"
    echo "  Note: SSL certificate must be configured for HTTPS to work"
    echo "  Check your SSL setup (certbot, cloud provider, or other method)"
fi
echo ""

# Step 4: Test HTTPS endpoint from server
echo "STEP 4: TESTING HTTPS ENDPOINT (FROM SERVER)"
echo "--------------------------------------------"
curl -s https://api.localpasswordvault.com/health 2>/dev/null
if [ $? -eq 0 ]; then
    echo ""
    echo "✓ HTTPS endpoint responds from server"
else
    echo "✗ HTTPS endpoint does not respond"
    echo "  Check: SSL certificate and HTTPS configuration"
fi
echo ""

# Step 5: Test activation endpoint from server
echo "STEP 5: TESTING ACTIVATION ENDPOINT (FROM SERVER)"
echo "------------------------------------------------"
TEST_PAYLOAD='{"license_key":"PERS-TEST","device_id":"'$(python3 -c "print('a'*64)")'"}'
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/lpv/license/activate \
    -H "Content-Type: application/json" \
    -d "$TEST_PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "404" ]; then
    echo "✓ Activation endpoint responds (HTTP $HTTP_CODE - expected for test key)"
    echo "  Response: $BODY"
else
    echo "✗ Activation endpoint issue (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
fi
echo ""

# Summary
echo "=================================================================================="
echo "VERIFICATION SUMMARY"
echo "=================================================================================="
echo ""
echo "If all checks passed, the backend is ready."
echo ""
echo "Next steps:"
echo "1. Add DNS A record: api.localpasswordvault.com -> 45.79.40.42"
echo "2. Wait 5-10 minutes for DNS propagation"
echo "3. Run fix-dns-and-verify.ps1 from your local machine"
echo "4. Test activation in the app"
echo ""
