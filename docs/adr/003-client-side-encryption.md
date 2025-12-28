# ADR-003: Client-Side Encryption Architecture

**Status:** Accepted  
**Date:** 2025-01-XX  
**Deciders:** Development Team  
**Tags:** security, encryption, privacy

## Context

Local Password Vault stores sensitive password data locally. To protect user data:
1. All password data must be encrypted at rest
2. Encryption must be performed entirely client-side
3. Master password/key must never leave the device
4. Must use industry-standard encryption algorithms
5. Must support password recovery without compromising security

## Decision

We implement **client-side encryption** using the following architecture:

### Encryption Strategy

1. **Algorithm**: AES-256-GCM
   - Industry-standard symmetric encryption
   - Authenticated encryption (prevents tampering)
   - 256-bit key strength

2. **Key Derivation**: PBKDF2
   - Derives encryption key from master password
   - 100,000 iterations (configurable)
   - SHA-256 hash function
   - Salt: unique per vault

3. **Storage**: Browser localStorage
   - Encrypted vault data stored in localStorage
   - Master password never stored
   - Key derivation parameters stored with vault

4. **Recovery**: BIP39 Recovery Phrase
   - 12-word recovery phrase
   - Cryptographically secure word list
   - Allows password recovery without storing master password
   - Recovery phrase hashed and stored securely

### Technical Implementation

- **Encryption Flow**:
  1. User enters master password
  2. Generate random salt (16 bytes)
  3. Derive key using PBKDF2 (100k iterations)
  4. Encrypt vault data with AES-256-GCM
  5. Store encrypted data + salt in localStorage

- **Decryption Flow**:
  1. User enters master password
  2. Load salt from stored vault
  3. Derive key using PBKDF2
  4. Decrypt vault data
  5. Validate decryption (GCM authentication tag)

- **Recovery Flow**:
  1. User generates recovery phrase (12 words)
  2. Hash recovery phrase (constant-time comparison)
  3. Store hash (not phrase itself)
  4. On recovery: user enters phrase, verify hash
  5. If valid, allow password reset

### Security Properties

- **Confidentiality**: AES-256 encryption
- **Integrity**: GCM authentication tag
- **Key Security**: PBKDF2 with high iteration count
- **Salt Uniqueness**: Random salt per vault
- **Constant-Time**: Recovery phrase comparison uses constant-time algorithm

## Consequences

### Positive

- ✅ **Security**: Industry-standard encryption
- ✅ **Privacy**: All encryption client-side, no server involvement
- ✅ **Recovery**: BIP39 recovery phrase for password recovery
- ✅ **Tamper-Proof**: GCM authentication prevents data modification
- ✅ **Performance**: Fast encryption/decryption for typical vault sizes

### Negative

- ❌ **Master Password Loss**: Without recovery phrase, data is lost
- ❌ **Performance**: PBKDF2 key derivation takes time (by design)
- ❌ **No Cloud Backup**: Encrypted data stored locally only

### Mitigations

- **Recovery Phrase**: Users can recover access
- **Export/Import**: Users can manually backup encrypted vault
- **Clear Warnings**: Users informed about recovery phrase importance
- **Key Derivation**: Optimized iteration count for balance of security/performance

## Alternatives Considered

### Alternative 1: Server-Side Encryption
- **Pros**: Easier key management, cloud backup
- **Cons**: Master password transmitted, privacy risk
- **Rejected**: Conflicts with privacy goals and offline-first architecture

### Alternative 2: Hardware Security Module (HSM)
- **Pros**: Strongest security, hardware-backed keys
- **Cons**: Complex, requires hardware, poor UX
- **Rejected**: Too complex for desktop application

### Alternative 3: WebAuthn/Passkeys
- **Pros**: Modern standard, hardware-backed
- **Cons**: Requires hardware, not suitable for password storage
- **Rejected**: Not applicable for password manager use case

## Validation

This architecture:
- Uses industry-standard encryption (AES-256-GCM)
- Implements secure key derivation (PBKDF2)
- Provides recovery mechanism (BIP39)
- Maintains privacy (all client-side)
- Aligns with security best practices

## References

- [ADR-001: Offline-First Architecture](./001-offline-first-architecture.md)
- [Encryption Implementation](../src/utils/encryption.ts)
- [Recovery Phrase Implementation](../src/utils/recoveryPhrase.ts)
- NIST SP 800-63B: Digital Identity Guidelines
- BIP39: Mnemonic Code for Generating Deterministic Keys

