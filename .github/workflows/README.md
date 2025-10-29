# GitHub Actions - Electron Build Workflow

This directory contains the GitHub Actions workflow for building the LocalPasswordVault Electron application across all platforms.

## 🚀 Workflow Features

- **Multi-platform builds**: Windows, macOS, and Linux
- **Automatic triggers**: Push to main branches, pull requests, and releases
- **Artifact storage**: Build artifacts stored for 30 days
- **Release integration**: Automatic attachment to GitHub releases

## 📋 Workflow Triggers

The workflow runs on:
- Push to `main` or `final-branch` branches
- Pull requests to `main` branch
- Published releases (for automatic distribution)

## 🔧 Required GitHub Secrets

For macOS code signing (optional but recommended):
- `CSC_LINK`: Base64-encoded .p12 certificate
- `CSC_KEY_PASSWORD`: Password for the certificate

For Windows code signing (optional):
- Set up in your `electron-builder.json` configuration

## 📦 Build Outputs

### Windows
- `Local Password Vault Setup.exe` (installer)
- `LocalPasswordVault-1.2.0-Portable.exe` (portable version)

### macOS
- `Local Password Vault-1.2.0.dmg` (disk image)

### Linux
- `LocalPasswordVault-1.2.0.AppImage` (universal binary)

## 🛠️ Local Development

To test builds locally before pushing:

```bash
# Install dependencies
npm install

# Build Electron app for current platform
npm run dist
```

## 📁 Workflow Structure

```
.github/workflows/
├── electron-build.yml    # Main build workflow
└── README.md            # This file
```

## 🔄 CI/CD Process

1. **Code Push** → Workflow triggers
2. **Setup** → Node.js environment and dependencies
3. **Build** → Application compilation
4. **Package** → Electron builds for each platform
5. **Upload** → Artifacts stored or attached to releases
6. **Notify** → Build status updated

## 🐛 Troubleshooting

### Build Failures
- Check `npm run dist` works locally first
- Verify `package.json` scripts are correct
- Ensure `electron-builder.json` is properly configured

### macOS Code Signing
- Certificate must be in .p12 format
- Use `base64 -i certificate.p12 | pbcopy` to encode
- Add to GitHub repository secrets

### Permission Issues
- Ensure GitHub Actions has permissions to upload artifacts
- Check repository settings for Actions permissions

## 📚 Additional Resources

- [Electron Builder Documentation](https://electron.build/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js Setup Action](https://github.com/actions/setup-node)
- [Upload Artifact Action](https://github.com/actions/upload-artifact)