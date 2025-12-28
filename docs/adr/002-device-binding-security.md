# ADR-002: Device Binding Security Model

**Status:** Accepted  
**Date:** 2025-01-XX  
**Deciders:** Development Team  
**Tags:** security, licensing, privacy

## Context

Local Password Vault requires a licensing system that:
1. Prevents license key sharing across multiple devices
2. Binds licenses to specific devices for security
3. Allows license transfer when users get new devices
4. Maintains 100% offline operation after activation
5. Never transmits user password data

## Decision

We implement a **device-binding security model** with the following characteristics:

### Core Security Principles

1. **Hardware Fingerprinting**
   - Uses multiple hardware identifiers (CPU, memory, disk, network)
   - Creates a unique, stable device ID
   - Cannot be easily spoofed or transferred

2. **Signed License Files**
   - License file cryptographically signed by server
   - Contains device ID, license key, activation date
   - Signature prevents tampering
   - Stored locally (100% offline after activation)

3. **Device Validation**
   - On app start, validates license file signature
   - Checks device ID matches stored device ID
   - If mismatch detected, requires transfer (not activation)

4. **Transfer Mechanism**
   - User can transfer license to new device
   - Requires internet connection (one-time)
   - Server validates transfer request
   - Old device license is invalidated
   - New device receives signed license file

### Technical Implementation

- **Device Fingerprinting**: `getLPVDeviceFingerprint()`
  - Combines CPU info, memory, disk serial, MAC address
  - Creates SHA-256 hash
  - Stable across app restarts

- **License File Structure**:
  ```typescript
  {
    license_key: string;
    device_id: string;
    plan_type: 'personal' | 'family';
    max_devices: number;
    activated_at: string;
    signature: string;  // Cryptographic signature
    signed_at: string;
  }
  ```

- **Validation Flow**:
  1. Load license file from localStorage
  2. Verify cryptographic signature
  3. Compare device_id with current device fingerprint
  4. If match: valid license
  5. If mismatch: requires transfer

- **Transfer Flow**:
  1. User initiates transfer on new device
  2. App sends license key + new device fingerprint to server
  3. Server validates key, invalidates old device
  4. Server returns signed license file for new device
  5. App stores license file locally
  6. App works 100% offline from this point

## Consequences

### Positive

- ✅ **Security**: Prevents license key sharing
- ✅ **Privacy**: No user data transmitted (only license key + device hash)
- ✅ **Offline**: Works completely offline after activation
- ✅ **Transferable**: Users can move to new devices
- ✅ **Tamper-Proof**: Cryptographic signatures prevent license file modification

### Negative

- ❌ **Device Binding**: License tied to specific device
- ❌ **Transfer Required**: Must transfer license for new device (one-time internet)
- ❌ **No Multi-Device**: Single device per license (by design for personal plan)

### Mitigations

- **Family Plan**: Allows multiple devices (up to max_devices)
- **Transfer Process**: Simple, one-time process
- **Clear Communication**: Users informed about device binding
- **Recovery**: Support can help with transfer issues

## Alternatives Considered

### Alternative 1: Cloud-Based License Validation
- **Pros**: Easier multi-device, no device binding
- **Cons**: Requires internet, privacy concerns
- **Rejected**: Conflicts with offline-first architecture and privacy goals

### Alternative 2: No Device Binding
- **Pros**: Simpler, no transfer needed
- **Cons**: License key sharing, security risk
- **Rejected**: Would allow unlimited sharing, business risk

### Alternative 3: Hardware Dongle
- **Pros**: Strong security, physical device
- **Cons**: Complex, requires hardware, poor UX
- **Rejected**: Too complex for software product

## Validation

This model:
- Prevents license key sharing effectively
- Maintains privacy (no password data transmitted)
- Works offline after activation
- Provides clear user experience
- Aligns with security best practices

## References

- [ADR-001: Offline-First Architecture](./001-offline-first-architecture.md)
- [Device Fingerprinting Implementation](../src/utils/deviceFingerprint.ts)
- [License Service Implementation](../src/utils/licenseService.ts)

