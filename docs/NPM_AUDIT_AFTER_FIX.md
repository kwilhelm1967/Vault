# NPM Audit After Fix (no --force)

**Date:** 2025-02-10  
**Node:** v24.13.0  
**npm:** 11.6.2  
**Commit (before this run):** ad5edf0a7dfe00a552f6a4ff0685986f0b4e71eb  

**Actions:** `npm ci` then `npm audit fix` (no `--force`).  
**Result:** 6 packages added, 4 removed, 29 changed. Audit re-run below.

---

## Full npm audit output (after fix)

```
# npm audit report

electron  <35.7.5
Severity: moderate
...
esbuild  <=0.24.2
Severity: moderate
...
form-data  <2.5.4
Severity: critical
...
jpeg-js  <=0.4.3
Severity: high
...
minimist  <=0.2.3
Severity: critical
...
nodemailer  <=7.0.10
Severity: moderate
...
qs  <6.14.1
Severity: high
...
tar  <=7.5.6
Severity: high
...
tough-cookie  <4.1.3
Severity: moderate
...
url-regex  *
Severity: high
...

20 vulnerabilities (7 moderate, 8 high, 5 critical)
```

---

**Summary (after Step 2):** Critical and high were not zero. Step 3 applied.

---

## After Step 3 (targeted fixes)

**Changes applied:**
- **jspdf:** Bumped to `4.1.0` (direct dependency).
- **to-ico:** Pinned to `1.0.1` (removes vulnerable jimp/request/form-data/jpeg-js/minimist/qs/tough-cookie/url-regex chain).
- **overrides:** `tar` >=7.5.7, `qs` >=6.14.1.

**Final npm audit (after targeted fixes):**
- **0 critical, 0 high.**
- 4 moderate only (see docs/NPM_AUDIT_RISK_ACCEPTANCE.md).
