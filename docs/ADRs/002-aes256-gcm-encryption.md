# ADR-002: AES-256-GCM Encryption

## Status
✅ Accepted

## Context
Password managers must encrypt sensitive data with industry-standard algorithms. The choice of encryption algorithm and mode affects security, performance, and compatibility.

## Decision
Use **AES-256-GCM** (Galois/Counter Mode) for encrypting vault data with:
- **Key Derivation**: PBKDF2 with 100,000 iterations and SHA-256
- **Key Size**: 256-bit (32 bytes)
- **IV**: 12 bytes, randomly generated per encryption operation
- **Authentication Tag**: 16 bytes, included with encrypted data

## Consequences

### Positive
- ✅ **Strong Security**: AES-256 is military-grade encryption
- ✅ **Authenticated Encryption**: GCM provides both confidentiality and authenticity
- ✅ **Tamper Detection**: Authentication tag prevents data modification
- ✅ **Performance**: GCM is faster than CBC mode with HMAC
- ✅ **Industry Standard**: Widely supported and audited

### Negative
- ❌ **Slower than AES-128**: 256-bit keys are slower (acceptable trade-off)
- ❌ **PBKDF2 Iterations**: 100k iterations adds ~500ms to unlock (security benefit)
- ❌ **No Hardware Acceleration**: Pure JavaScript implementation (Electron provides native)

### Trade-offs
- **Security vs Performance**: Chose security (AES-256) over speed
- **PBKDF2 Iterations**: 100k is a balance between security and user experience
- **GCM vs CBC+HMAC**: Chose GCM for simplicity and performance

## Implementation Details
```typescript
// Encryption flow
Master Password → PBKDF2(100k iterations) → 32-byte Key
                                                 ↓
Data + Random IV(12 bytes) → AES-256-GCM → Encrypted Data + Tag(16 bytes)

// Decryption flow
Encrypted Data + Tag → AES-256-GCM(verify tag) → Original Data
```

## Alternatives Considered
1. **AES-128-GCM**: Faster but less secure
   - Rejected: 128-bit keys may become vulnerable in future

2. **AES-256-CBC + HMAC**: Similar security, more complex
   - Rejected: GCM is simpler and faster

3. **ChaCha20-Poly1305**: Modern alternative to AES
   - Rejected: Less widely supported, AES is standard

4. **Argon2 for Key Derivation**: More modern than PBKDF2
   - Rejected: Less browser support, PBKDF2 is sufficient

## Security Considerations
- **IV Reuse**: Prevented by generating random IV per operation
- **Tag Verification**: Always verified before accepting decrypted data
- **Key Storage**: Never stored, derived from master password each time
- **Memory Security**: Best-effort clearing of sensitive data after use

## References
- [Security Documentation](../SECURITY.md)
- NIST Recommendation: SP 800-38D (GCM Mode)
- OWASP: Cryptographic Storage Cheat Sheet

