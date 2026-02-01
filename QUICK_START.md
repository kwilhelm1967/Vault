# Local Password Vault - Quick Start Guide

## 🚀 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run with Electron
npm run electron:dev
```

## 📦 Build for Production

```bash
# Web build
npm run build

# Electron build (all platforms)
npm run electron:build

# Platform-specific
npm run electron:build:win    # Windows
npm run electron:build:mac    # macOS
npm run electron:build:linux  # Linux
```

## 🔧 Environment Setup

Create `.env` file:

```env
# Admin Portal (Optional)
VITE_ADMIN_PORTAL_ENABLED=true
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# App Type
VITE_APP_TYPE=lpv
```

## 📱 Mobile Access Feature

### How It Works:
1. **Desktop**: Settings → Mobile Access → Create Token
2. **Mobile**: Scan QR code → View passwords (read-only)
3. **Security**: Tokens auto-expire (1h - 7 days)

### Files:
- `src/components/MobileAccess.tsx` - Token management UI
- `src/components/MobileViewer.tsx` - Mobile viewer page
- `src/utils/mobileService.ts` - Token & entry management
- `src/App.tsx` - Route: `/mobile?token=xxx`

## 🎨 Admin Portal

### Access:
- **Keyboard**: `Ctrl+Shift+A` (Windows/Linux) or `Cmd+Shift+A` (Mac)
- **Overlay**: Opens as overlay in main window

### Files:
- `src/components/AdminPortal.tsx` - Main portal
- `src/components/AdminDashboard.tsx` - Dashboard UI
- `src/contexts/AdminContext.tsx` - State management
- `src/styles/adminTheme.ts` - LPV theme (cyan/navy)

## 🔒 Security Features

- **Encryption**: AES-256-GCM
- **Key Derivation**: PBKDF2 (100,000 iterations)
- **Storage**: Local only (no cloud)
- **Mobile Access**: Time-limited, view-only tokens
- **Admin Portal**: Separate authentication

## 🧪 Testing

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Test build
npm run build
```

## 📂 Key Directories

```
src/
├── components/          # React components
│   ├── MobileAccess.tsx
│   ├── MobileViewer.tsx
│   ├── AdminPortal.tsx
│   └── ...
├── utils/              # Services & utilities
│   ├── mobileService.ts
│   ├── storage.ts
│   └── ...
├── contexts/           # React contexts
│   ├── AdminContext.tsx
│   └── VaultContext.tsx
└── styles/             # Themes & styles
    └── adminTheme.ts
```

## 🐛 Troubleshooting

### Build Fails:
```bash
npm run clean
npm install
npm run build
```

### Mobile Viewer 404:
- Check token is valid
- Verify route is `/mobile?token=xxx`
- Ensure entries were shared when token created

### Admin Portal Won't Open:
- Check `VITE_ADMIN_PORTAL_ENABLED=true`
- Verify keyboard shortcut (Ctrl+Shift+A)
- Check browser console for errors

## 📝 Common Tasks

### Add New Component:
1. Create in `src/components/`
2. Export from `src/components/index.ts`
3. Import where needed

### Update Theme:
- Edit `src/index.css` for global styles
- Edit `src/styles/adminTheme.ts` for admin portal

### Add New Route:
- Update `src/App.tsx`
- Add route handling logic
- Test with development server

## 🎯 Next Steps

1. **Test Mobile Access**: Create token, scan QR, verify viewer
2. **Test Admin Portal**: Press Ctrl+Shift+A, verify dashboard
3. **Build Electron App**: Run `npm run electron:build`
4. **Deploy**: Distribute built executables

---

**Need Help?** Check `DEPLOYMENT_READY.md` for detailed documentation.
