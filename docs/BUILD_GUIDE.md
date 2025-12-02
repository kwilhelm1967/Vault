# Build Guide for Local Password Vault

This guide covers how to build installers for Windows, Mac, and Linux.

## Prerequisites

- Node.js 18+ (20 recommended)
- npm 9+
- Git

## Quick Build Commands

```bash
# Build for your current platform
npm run dist

# Build for specific platforms
npm run dist:win    # Windows (.exe installer + portable)
npm run dist:mac    # Mac (.dmg + .zip)
npm run dist:linux  # Linux (.AppImage + .deb)

# Build for all platforms (from Mac only)
npm run dist:all
```

## Build Output

All installers are created in the `release/` folder:

```
release/
├── Local Password Vault-Setup-1.2.0.exe       # Windows NSIS installer
├── Local Password Vault-1.2.0-Portable.exe    # Windows portable
├── Local Password Vault-1.2.0-win-x64.exe     # Windows x64
├── Local Password Vault-1.2.0-win-ia32.exe    # Windows x86
├── Local Password Vault-1.2.0-mac.dmg         # Mac DMG
├── Local Password Vault-1.2.0-mac.zip         # Mac ZIP
├── Local Password Vault-1.2.0.AppImage        # Linux AppImage
└── Local Password Vault-1.2.0-linux-x64.deb   # Linux Debian
```

## Step-by-Step Build Process

### 1. Install Dependencies
```bash
npm ci
```

### 2. Build the App
```bash
npm run build:prod
```

### 3. Package for Distribution

**Windows (from Windows):**
```bash
npm run dist:win
```

**Mac (from Mac):**
```bash
npm run dist:mac
```

**Linux (from Linux or Mac):**
```bash
npm run dist:linux
```

## Windows Build Details

### NSIS Installer Features
- Custom installation directory
- Desktop and Start Menu shortcuts
- Run after install option
- Proper uninstaller
- Per-user installation (no admin required)

### Portable Version
- Single executable
- No installation required
- Settings stored in app folder

## Mac Build Details

### Universal Binary
- Supports both Intel (x64) and Apple Silicon (arm64)
- Single app for all Macs

### DMG Features
- Drag-to-Applications interface
- Custom background (if provided)
- Proper volume icon

## Linux Build Details

### AppImage
- Universal format for most distros
- Self-contained, no dependencies
- Just make executable and run

### Debian Package
- For Ubuntu, Debian, and derivatives
- Proper desktop integration
- Install with: `sudo dpkg -i package.deb`

## Auto-Updates

Auto-updates are enabled when building with GitHub releases:

```bash
npm run release      # Build and publish to GitHub
npm run release:win  # Windows only
npm run release:mac  # Mac only
```

**Requirements:**
- Set `GH_TOKEN` environment variable
- Create a GitHub release (draft or published)

## Code Signing

See [CODE_SIGNING_GUIDE.md](./CODE_SIGNING_GUIDE.md) for detailed instructions.

**Quick Setup:**

Windows:
```env
CSC_LINK=path/to/certificate.pfx
CSC_KEY_PASSWORD=your_password
```

Mac:
```env
APPLE_ID=your@email.com
APPLE_ID_PASSWORD=app-specific-password
APPLE_TEAM_ID=YOUR_TEAM_ID
```

## CI/CD with GitHub Actions

Automated builds are configured in `.github/workflows/build.yml`:

1. Push a tag: `git tag v1.2.0 && git push --tags`
2. GitHub Actions builds all platforms
3. Artifacts uploaded to the release

## Troubleshooting

### "Cannot find module electron-builder"
```bash
npm ci
```

### Windows: "NSIS error"
- Ensure NSIS is available (installed with electron-builder)
- Check file paths for special characters

### Mac: "Code signing failed"
- Check certificate is in Keychain
- Verify team ID in electron-builder.json

### Linux: "AppImage won't run"
```bash
chmod +x "Local Password Vault-1.2.0.AppImage"
./Local\ Password\ Vault-1.2.0.AppImage
```

### Build too slow
- Use `npm run dist` instead of `npm run dist:all`
- Build on the target platform for fastest results

## Version Bumping

Before building a release:

1. Update version in `package.json`
2. Update `APP_VERSION` in `src/config/changelog.ts`
3. Add changelog entry
4. Commit changes
5. Create git tag: `git tag v1.2.0`

## Build Performance

| Platform | Build Time | Output Size |
|----------|------------|-------------|
| Windows | ~2-3 min | ~80-90 MB |
| Mac | ~3-4 min | ~100-120 MB |
| Linux | ~2-3 min | ~85-95 MB |

## Security Notes

- Never commit certificates or passwords
- Use environment variables for secrets
- Review electron-builder.json before releases
- Test installers before distribution

