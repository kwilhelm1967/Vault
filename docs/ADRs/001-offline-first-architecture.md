# ADR-001: Offline-First Architecture

## Status
✅ Accepted

## Context
Local Password Vault is designed to be a privacy-focused password manager. Users need to access their passwords at all times, even without internet connectivity. Additionally, privacy-conscious users require that their sensitive data never leaves their device.

## Decision
The application uses an **offline-first architecture** where:
1. All vault operations work 100% offline after initial setup
2. No user data is transmitted to external servers
3. License activation is the only network operation (one-time, during activation)
4. All encryption/decryption happens locally on the user's device

## Consequences

### Positive
- ✅ **Privacy**: User data never leaves their device
- ✅ **Reliability**: Works without internet connection
- ✅ **Security**: No network attack surface for vault data
- ✅ **Performance**: No network latency for vault operations
- ✅ **Compliance**: Easier to meet privacy regulations (GDPR, etc.)

### Negative
- ❌ **No Cloud Sync**: Users cannot sync across devices (by design)
- ❌ **No Cloud Backup**: Users must manage their own backups
- ❌ **Manual Updates**: License transfers require manual process
- ❌ **No Collaboration**: Cannot share vaults with others

### Trade-offs
- **Privacy vs Convenience**: Prioritized privacy over convenience features
- **Security vs Features**: Limited feature set to maintain security boundaries
- **Offline vs Sync**: Chose offline reliability over multi-device sync

## Implementation Details
- Vault data encrypted and stored locally (Electron file storage / localStorage)
- License files stored locally with HMAC signatures for offline validation
- No analytics, telemetry, or crash reporting that includes user data
- All API calls are for license activation only (no vault data)

## Alternatives Considered
1. **Hybrid Approach**: Local-first with optional cloud sync
   - Rejected: Adds complexity and reduces privacy guarantees

2. **Cloud-Only**: All data in cloud with E2E encryption
   - Rejected: Requires internet, privacy concerns, attack surface

3. **Peer-to-Peer Sync**: Local with optional P2P sync
   - Rejected: Complex, potential security vulnerabilities

## References
- [Offline Operation Guide](../OFFLINE_OPERATION_GUIDE.md)
- [Data Privacy Verification](../DATA_PRIVACY_VERIFICATION.md)

