# ADR-001: Offline-First Architecture

**Status:** Accepted  
**Date:** 2025-01-XX  
**Deciders:** Development Team  
**Tags:** architecture, privacy, security

## Context

Local Password Vault is a password manager that prioritizes user privacy and security. The core value proposition is that user data never leaves their device. This requires an architecture that:

1. Works completely offline after initial license activation
2. Stores all data locally (no cloud sync)
3. Never transmits password data to external servers
4. Maintains security and encryption standards
5. Provides a seamless user experience

## Decision

We will implement an **offline-first architecture** with the following characteristics:

### Core Principles

1. **Local Storage Only**
   - All password entries stored in browser localStorage (encrypted)
   - No cloud storage or synchronization
   - No data transmission after license activation

2. **Client-Side Encryption**
   - AES-256-GCM encryption performed entirely in the browser
   - Master password never leaves the device
   - Encryption keys derived using PBKDF2 (100,000 iterations)

3. **Minimal Network Requirements**
   - Network only required for:
     - Initial license activation (one-time)
     - License transfer (when moving to new device)
     - Trial activation (one-time)
   - All other operations work offline

4. **No Telemetry or Analytics**
   - No user behavior tracking
   - No performance metrics sent to servers
   - No error reporting to external services (in production)
   - Privacy-preserving development tools only (dev mode)

### Technical Implementation

- **Frontend**: React + TypeScript + Electron
- **Storage**: Browser localStorage (encrypted)
- **Encryption**: Web Crypto API (AES-256-GCM)
- **License System**: Minimal API calls (activation only)
- **Backend**: Only for license validation (no password data)

## Consequences

### Positive

- ✅ **Maximum Privacy**: User data never leaves device
- ✅ **Security**: No attack surface from cloud storage
- ✅ **Performance**: No network latency for operations
- ✅ **Reliability**: Works without internet connection
- ✅ **Compliance**: Easier to meet privacy regulations
- ✅ **User Trust**: Clear privacy guarantee

### Negative

- ❌ **No Cloud Sync**: Users can't sync across devices (by design)
- ❌ **No Backup**: Users must manually export/backup
- ❌ **Limited Observability**: Can't track usage patterns (privacy trade-off)
- ❌ **Device Binding**: License tied to device (requires transfer for new device)

### Mitigations

- **Backup**: Export/import functionality for manual backups
- **Multi-Device**: Family plan allows multiple licenses
- **Recovery**: Recovery phrase system for password recovery
- **Support**: Ticketing system for user assistance

## Alternatives Considered

### Alternative 1: Cloud Sync with End-to-End Encryption
- **Pros**: Multi-device sync, automatic backup
- **Cons**: Requires cloud infrastructure, potential privacy concerns, more complex
- **Rejected**: Conflicts with core value proposition of "no data leaves device"

### Alternative 2: Hybrid (Local + Optional Cloud)
- **Pros**: Flexibility for users
- **Cons**: Complexity, privacy concerns, maintenance overhead
- **Rejected**: Adds complexity without clear benefit for target market

### Alternative 3: P2P Sync
- **Pros**: No central server, privacy-preserving
- **Cons**: Complex implementation, reliability issues, requires internet
- **Rejected**: Too complex for MVP, doesn't align with offline-first goal

## Validation

This architecture aligns with:
- User privacy expectations
- Security best practices
- Product positioning ("Local" in the name)
- Regulatory compliance (GDPR, etc.)

## References

- [Privacy Policy](../PRIVACY_POLICY.md)
- [Data Privacy Verification](../DATA_PRIVACY_VERIFICATION.md)
- [Offline Operation Guide](../OFFLINE_OPERATION_GUIDE.md)

