# Fix "Unable to connect to license server" Error

## 🔍 The Problem

When starting the app, you see:
- **Error:** "Activation Error"
- **Message:** "Unable to connect to license server. Please check your internet connection and try again."

## ✅ What I Fixed

1. **Created `.env.example` file** as a template
2. **Identified the issue:** App is trying to connect to `https://server.localpasswordvault.com` but backend is running on `http://localhost:3001`

## 🔧 Steps You Must Do

### Step 1: Create .env File

**Create a `.env` file in the project root** (same folder as `package.json`):

1. **Copy the example:**
   ```bash
   copy .env.example .env
   ```
   Or on Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```

2. **Or create it manually:**
   - Create a new file named `.env` in the project root
   - Add this line:
     ```env
     VITE_LICENSE_SERVER_URL=http://localhost:3001
     ```

### Step 2: Verify Backend Server is Running

The backend server **MUST** be running for the app to connect:

```bash
cd backend
npm start
```

**You should see:**
- "Server running on port 3001"
- "Email service initialized"

**If backend is not running, the app will show the activation error!**

### Step 3: Restart the App

**Important:** After changing `.env` file, you **MUST** restart the app:

1. **Stop the app** (close it completely)
2. **Start it again:**
   ```bash
   npm run dev
   ```
   Or if using Electron:
   ```bash
   npm run dev
   ```

### Step 4: Verify Connection

1. **Start the app**
2. **Try activating a license key**
3. **The error should be gone**

---

## 🚨 Common Issues

### Issue 1: Backend Server Not Running

**Symptom:** Still getting "Unable to connect" error

**Fix:**
```bash
cd backend
npm start
```

Make sure you see "Server running on port 3001"

### Issue 2: Wrong Backend URL

**Symptom:** App trying to connect to wrong URL

**Fix:**
1. Check `.env` file in project root
2. Make sure it has: `VITE_LICENSE_SERVER_URL=http://localhost:3001`
3. Restart the app

### Issue 3: App Not Reading .env File

**Symptom:** Changes to `.env` not taking effect

**Fix:**
1. **Stop the app completely**
2. **Delete `node_modules/.vite` folder** (clears Vite cache):
   ```bash
   rm -rf node_modules/.vite
   ```
   Or on Windows:
   ```bash
   rmdir /s node_modules\.vite
   ```
3. **Restart the app**

### Issue 4: Port 3001 Already in Use

**Symptom:** Backend won't start, port 3001 in use

**Fix:**
1. **Find what's using port 3001:**
   ```bash
   netstat -ano | findstr :3001
   ```
2. **Kill the process** or change backend port in `backend/.env`:
   ```env
   PORT=3002
   ```
3. **Update frontend `.env`** to match:
   ```env
   VITE_LICENSE_SERVER_URL=http://localhost:3002
   ```

---

## 📋 Quick Checklist

Before reporting issues, verify:

- [ ] Backend server is running (`npm start` in `backend/` directory)
- [ ] Backend shows "Server running on port 3001"
- [ ] `.env` file exists in project root (not just `backend/.env`)
- [ ] `.env` has `VITE_LICENSE_SERVER_URL=http://localhost:3001`
- [ ] App was restarted after changing `.env`
- [ ] Vite cache cleared (delete `node_modules/.vite` if needed)

---

## 🔍 Testing the Connection

You can test if the backend is reachable:

**In browser:**
```
http://localhost:3001/health
```

**Should return:**
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

**If you get an error:**
- Backend server is not running
- Wrong port
- Firewall blocking connection

---

## 📝 For Production

When deploying to production:

1. **Update `.env` file:**
   ```env
   VITE_LICENSE_SERVER_URL=https://server.localpasswordvault.com
   ```

2. **Rebuild the app:**
   ```bash
   npm run build
   ```

3. **The production build will use the production URL**

---

**Last Updated:** After fixing activation connection error
