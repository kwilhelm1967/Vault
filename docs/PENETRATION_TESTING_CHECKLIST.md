# Penetration Testing Checklist

**Application:** Local Password Vault  
**Version:** 1.2.0  
**Type:** Desktop Application (Electron)  

---

## Purpose

This checklist provides a structured approach for security testing of Local Password Vault. It covers both automated and manual testing procedures.

---

## Pre-Test Setup

### Environment Preparation

- [ ] Install application on test machine
- [ ] Create test vault with sample data
- [ ] Set up network monitoring (Wireshark/Fiddler)
- [ ] Prepare debugging tools (DevTools, memory analyzers)
- [ ] Document baseline behavior

### Test Accounts

```
Test Master Password: TestP@ssw0rd123!
Test License Key: TEST-1234-5678-9012
```

---

## 1. Authentication Testing

### 1.1 Password Security

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Create vault with weak password (<8 chars) | Rejected/Warning | | |
| Create vault with common password | Warning shown | | |
| Login with incorrect password | Denied, generic error | | |
| Brute force (>5 attempts in 1 min) | Rate limited | | |
| Password not visible in memory dump | Not plaintext | | |
| Password hint doesn't reveal password | Hint only | | |

### 1.2 Session Management

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Auto-lock after timeout | Vault locks | | |
| Manual lock clears session | Session cleared | | |
| App restart requires re-auth | Must re-enter password | | |
| Multiple failed logins | Progressive lockout | | |

### 1.3 Commands

```bash
# Memory dump analysis (Windows)
procdump -ma LocalPasswordVault.exe vault_dump.dmp
strings vault_dump.dmp | grep -i "password"

# Memory dump analysis (Mac/Linux)
gcore -o vault_dump $(pgrep LocalPasswordVault)
strings vault_dump | grep -i "password"
```

---

## 2. Encryption Testing

### 2.1 Data at Rest

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Vault file is encrypted | Not readable | | |
| Vault file modified externally | Detected/rejected | | |
| Export without password | User notified of risk | | |
| Encrypted export is secure | AES-256 verified | | |

### 2.2 Cryptographic Verification

```bash
# Check encryption algorithm in use
# Open DevTools and run:
console.log(crypto.subtle.generateKey)

# Verify PBKDF2 parameters
# Check storage.ts for iteration count
grep -r "iterations" src/utils/storage.ts
```

### 2.3 Key Derivation

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Same password = same key (with salt) | Different keys | | |
| Key not stored in localStorage | Not present | | |
| Key cleared on lock | Memory cleared | | |

---

## 3. Input Validation Testing

### 3.1 Entry Fields

| Test | Input | Expected | Actual | Pass/Fail |
|------|-------|----------|--------|-----------|
| Account name XSS | `<script>alert(1)</script>` | Escaped | | |
| Username SQL injection | `'; DROP TABLE--` | Stored safely | | |
| Password special chars | `<>&"'` | Handled correctly | | |
| URL validation | `javascript:alert(1)` | Rejected/sanitized | | |
| Notes overflow | 100,000 chars | Truncated/handled | | |
| Custom field injection | `{{constructor}}` | Sanitized | | |

### 3.2 Import Testing

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Malformed JSON import | Error, no crash | | |
| CSV with malicious content | Sanitized | | |
| Oversized file import | Handled gracefully | | |
| Import with script tags | Escaped | | |

### 3.3 Test Payloads

```javascript
// XSS Payloads
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
javascript:alert('XSS')
<svg onload=alert('XSS')>

// Injection Payloads
'; DROP TABLE entries;--
{{constructor.constructor('alert(1)')()}}
${7*7}
```

---

## 4. Network Security Testing

### 4.1 Traffic Analysis

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| No password in network traffic | Verified | | |
| No vault data transmitted | Verified | | |
| License check uses HTTPS | HTTPS only | | |
| No unexpected outbound connections | None | | |

### 4.2 Network Monitoring Commands

```bash
# Windows (PowerShell)
netstat -b | findstr "LocalPassword"

# Mac/Linux
lsof -i -P | grep LocalPassword
sudo tcpdump -i any host localpasswordvault.com

# Wireshark filter
tcp.port == 443 && ip.addr == <app_ip>
```

### 4.3 Man-in-the-Middle Test

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Intercept license validation | Certificate pinning or warning | | |
| Modify update response | Signature validation fails | | |

---

## 5. Electron-Specific Testing

### 5.1 Context Isolation

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Access Node.js from renderer | Blocked | | |
| Access require() from renderer | Blocked | | |
| Remote module access | Disabled | | |

### 5.2 DevTools Tests

```javascript
// Run in DevTools console

// Test Node access (should fail)
try { require('fs') } catch(e) { console.log('PASS: Node blocked') }

// Test context isolation
console.log(typeof window.electronAPI) // Should be object
console.log(typeof window.require) // Should be undefined
```

### 5.3 IPC Security

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Unauthorized IPC call | Rejected | | |
| IPC with malformed data | Handled safely | | |
| IPC flood attack | Rate limited or handled | | |

---

## 6. File System Testing

### 6.1 Data Files

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Vault file permissions | User-only access | | |
| Config file not world-readable | Proper permissions | | |
| Temp files cleaned up | No sensitive temp files | | |
| Uninstall removes data | Configurable | | |

### 6.2 File Paths

```bash
# Windows
%APPDATA%\Local Password Vault\

# Mac
~/Library/Application Support/Local Password Vault/

# Linux
~/.config/Local Password Vault/
```

### 6.3 Path Traversal Test

| Test | Input | Expected | Actual | Pass/Fail |
|------|-------|----------|--------|-----------|
| Export path traversal | `../../../etc/passwd` | Blocked | | |
| Import path traversal | `..\..\Windows\System32` | Blocked | | |

---

## 7. Memory Analysis

### 7.1 Sensitive Data in Memory

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Master password in memory | Cleared after use | | |
| Decrypted entries in memory | Cleared on lock | | |
| Clipboard cleared | After 30s | | |

### 7.2 Memory Testing Tools

```bash
# Process memory dump
procdump -ma <pid> dump.dmp

# Search for sensitive strings
strings dump.dmp | grep -E "(password|secret|key)"

# Heap analysis (Windows)
windbg -p <pid>
!heap -stat

# Memory scanner (manual)
# Use Cheat Engine or similar to scan for known values
```

---

## 8. Denial of Service Testing

### 8.1 Resource Exhaustion

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| 10,000 entries | Handles gracefully | | |
| 1MB single note | Truncated/rejected | | |
| Rapid add/delete | No crash | | |
| Large import file | Memory managed | | |

### 8.2 UI Responsiveness

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Search with 10,000 entries | Responsive (<100ms) | | |
| Scroll large list | Smooth (virtualized) | | |
| Multiple rapid searches | No crash | | |

---

## 9. Update Mechanism Testing

### 9.1 Auto-Update Security

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Update served over HTTPS | Yes | | |
| Update signature verification | Implemented | | |
| Rollback on failed update | Graceful | | |
| Malicious update injection | Rejected | | |

---

## 10. Social Engineering Vectors

### 10.1 Phishing Resistance

| Test | Expected Result | Actual | Pass/Fail |
|------|-----------------|--------|-----------|
| Fake login screen in app | Not possible | | |
| URL spoofing in entries | Visible/validated | | |
| Clipboard hijacking awareness | User warned | | |

---

## Post-Test Checklist

- [ ] Document all findings
- [ ] Classify by severity (Critical/High/Medium/Low/Info)
- [ ] Provide remediation recommendations
- [ ] Clean up test data
- [ ] Reset test environment
- [ ] Store test artifacts securely

---

## Severity Classification

| Severity | Definition | Example |
|----------|------------|---------|
| Critical | Immediate exploitation risk | Unencrypted passwords |
| High | Significant security impact | Broken authentication |
| Medium | Moderate risk | Missing rate limiting |
| Low | Minor security concern | Verbose error messages |
| Info | Best practice improvement | Code quality |

---

## Reporting Template

```markdown
## Finding: [Title]

**Severity:** [Critical/High/Medium/Low/Info]
**Category:** [Auth/Crypto/Input/Network/etc.]
**Status:** [Open/Fixed/Accepted Risk]

### Description
[Detailed description of the vulnerability]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Impact
[Potential impact if exploited]

### Recommendation
[How to fix or mitigate]

### Evidence
[Screenshots, logs, code snippets]
```

---

## Tools Reference

| Tool | Purpose | Platform |
|------|---------|----------|
| Wireshark | Network analysis | All |
| Burp Suite | HTTP interception | All |
| Process Monitor | File/registry monitoring | Windows |
| fs_usage | File system monitoring | Mac |
| strace | System call tracing | Linux |
| DevTools | JavaScript debugging | Built-in |
| strings | Binary analysis | All |

---

*Last Updated: December 2024*

