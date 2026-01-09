# CORS Fix Deployment - Production

## ✅ What Was Fixed

The backend server's CORS configuration has been updated to allow all localhost origins for local testing. This fixes the "Failed to fetch" error when testing the trial form from `http://localhost:8080`.

**Commit:** `fb3abfa` - "Fix CORS: Allow localhost origins for local testing (including localhost:8080)"

**File Changed:** `backend/server.js`

**Key Change:**
```javascript
// Allow localhost origins for local development/testing (regardless of NODE_ENV)
if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
  return callback(null, true);
}
```

## 🚀 Deployment Steps

### Option 1: SSH Access (Recommended)

If you have SSH access to the server:

```bash
# 1. Connect to server
ssh root@45.79.40.42

# 2. Navigate to backend directory
cd /var/www/lpv-api/backend
# (or wherever your backend is located - use: find / -name "server.js" to find it)

# 3. Pull latest code from GitHub
git pull origin main

# 4. Restart the server
pm2 restart lpv-api

# 5. Verify server is running
pm2 status

# 6. Check logs for any errors
pm2 logs lpv-api --lines 20
```

### Option 2: Server Control Panel / Web Console

If you have access to Linode or your server's web-based console:

1. Log into your server control panel
2. Open the web-based terminal/console
3. Follow the steps from Option 1

### Option 3: Manual File Upload

If SSH is not available:

1. **Download the updated file:**
   - Go to: https://github.com/kwilhelm1967/Vault/blob/main/backend/server.js
   - Download `server.js`

2. **Upload to server via SFTP/FTP:**
   - Connect using FileZilla, WinSCP, or similar
   - Upload to: `/var/www/lpv-api/backend/server.js`
   - (Replace path with your actual backend location)

3. **Restart server via web console or control panel:**
   ```bash
   pm2 restart lpv-api
   ```

## ✅ Verification

After deployment:

1. **Test the health endpoint:**
   ```bash
   curl https://api.localpasswordvault.com/health
   ```
   Should return: `{"status":"ok",...}`

2. **Test the trial form:**
   - Open: `http://localhost:8080/trial.html`
   - Enter an email address
   - Click "Get My Trial Key"
   - The "Failed to fetch" error should be gone

3. **Check server logs:**
   ```bash
   pm2 logs lpv-api --lines 50
   ```
   Look for any CORS-related errors

## 📋 What This Fix Does

- **Before:** Only allowed specific production domains and `localhost:5173`/`localhost:3000` in development mode
- **After:** Allows ALL localhost and 127.0.0.1 origins on ANY port, regardless of environment

This means:
- ✅ `http://localhost:8080` - Now allowed
- ✅ `http://localhost:5173` - Still allowed
- ✅ `http://localhost:3000` - Still allowed
- ✅ `http://127.0.0.1:8080` - Now allowed
- ✅ Any other localhost port - Now allowed

## 🔒 Security Note

This change only affects localhost origins, which are safe for local development. Production domains (`localpasswordvault.com`, `locallegacyvault.com`) remain protected and unchanged.

## 📞 Need Help?

If deployment fails or you encounter issues:
1. Check server logs: `pm2 logs lpv-api`
2. Verify server is running: `pm2 status`
3. Test API health: `curl https://api.localpasswordvault.com/health`
