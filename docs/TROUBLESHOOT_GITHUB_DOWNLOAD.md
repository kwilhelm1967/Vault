# Troubleshoot GitHub Download 404 Error

## 🔍 Problem: Still Getting 404

Even after fixing the filename, still getting 404 error.

---

## ✅ Solution: Use Specific Tag Path

GitHub's `/latest/download/` might not work immediately. Use the specific tag path instead.

### Your GitHub Release Info:
- **Tag:** `V1.2.0` (capital V)
- **Filename:** `Local.Password.Vault.Setup.1.2.0.exe`

### Correct Download URL:

Use this format:
```
https://github.com/kwilhelm1967/Vault/releases/download/V1.2.0/Local.Password.Vault.Setup.1.2.0.exe
```

**Note:** Use the exact tag name `V1.2.0` (capital V) in the URL.

---

## 🔧 Update the Code

### Update HTML File

In `LPV/trial-success.html`, change line 435 from:
```html
<a href="https://github.com/kwilhelm1967/Vault/releases/latest/download/Local.Password.Vault.Setup.1.2.0.exe">
```

To:
```html
<a href="https://github.com/kwilhelm1967/Vault/releases/download/V1.2.0/Local.Password.Vault.Setup.1.2.0.exe">
```

### Update TypeScript Config

In `src/config/downloadUrls.ts`, change:
```typescript
export const DOWNLOAD_BASE_URL = 'https://github.com/kwilhelm1967/Vault/releases/latest/download';
```

To:
```typescript
export const DOWNLOAD_BASE_URL = 'https://github.com/kwilhelm1967/Vault/releases/download/V1.2.0';
```

---

## 🧪 Test URLs

Try these URLs directly in your browser:

1. **With specific tag (recommended):**
   ```
   https://github.com/kwilhelm1967/Vault/releases/download/V1.2.0/Local.Password.Vault.Setup.1.2.0.exe
   ```

2. **With lowercase tag:**
   ```
   https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/Local.Password.Vault.Setup.1.2.0.exe
   ```

3. **With /latest/download/:**
   ```
   https://github.com/kwilhelm1967/Vault/releases/latest/download/Local.Password.Vault.Setup.1.2.0.exe
   ```

**Whichever one works, use that format!**

---

## 📋 Alternative: Rename GitHub Release Tag

If you want to use `/latest/download/`, you could:

1. Edit the GitHub release
2. Change tag from `V1.2.0` to `v1.2.0` (lowercase)
3. Then `/latest/download/` should work

But using the specific tag path is more reliable and works immediately.

---

**Last Updated:** 2025
