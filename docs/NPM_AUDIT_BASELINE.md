# NPM Audit Baseline

**Date:** 2025-02-10  
**Node:** v24.13.0  
**npm:** 11.6.2  
**Commit:** ad5edf0a7dfe00a552f6a4ff0685986f0b4e71eb  
**Branch:** fix/npm-audit-v1  

---

## Full npm audit output

```
# npm audit report

@eslint/plugin-kit  <0.3.4
@eslint/plugin-kit is vulnerable to Regular Expression Denial of Service attacks through ConfigCommentParser - https://github.com/advisories/GHSA-xffm-g5w8-qvg7
fix available via `npm audit fix`
node_modules/@eslint/plugin-kit
  eslint  9.10.0 - 9.26.0
  Depends on vulnerable versions of @eslint/plugin-kit
  node_modules/eslint

axios  <=1.13.4
Severity: high
Axios is Vulnerable to Denial of Service via __proto__ Key in mergeConfig - https://github.com/advisories/GHSA-43fc-jf86-j433
fix available via `npm audit fix`
node_modules/axios

electron  <35.7.5
Severity: moderate
Electron has ASAR Integrity Bypass via resource modification - https://github.com/advisories/GHSA-vmqv-hx8q-j7mg
fix available via `npm audit fix --force`
Will install electron@40.2.1, which is a breaking change
node_modules/electron

esbuild  <=0.24.2
Severity: moderate
esbuild enables any website to send any requests to the development server and read the response - https://github.com/advisories/GHSA-67mh-4wv8-2f99
fix available via `npm audit fix --force`
Will install vite@7.3.1, which is a breaking change
node_modules/esbuild
  vite  0.11.0 - 6.1.6
  Depends on vulnerable versions of esbuild
  node_modules/vite
    @vitejs/plugin-react  2.0.0-alpha.0 - 4.3.3
    Depends on vulnerable versions of vite
    node_modules/@vitejs/plugin-react

form-data  <2.5.4
Severity: critical
form-data uses unsafe random function in form-data for choosing boundary - https://github.com/advisories/GHSA-fjxv-7rqg-78g4
fix available via `npm audit fix --force`
Will install to-ico@1.0.1, which is a breaking change
node_modules/request/node_modules/form-data
  request  *
  Depends on vulnerable versions of form-data
  Depends on vulnerable versions of qs
  Depends on vulnerable versions of tough-cookie
  node_modules/request
    jimp  <=0.3.5
    Depends on vulnerable versions of jpeg-js
    Depends on vulnerable versions of mkdirp
    Depends on vulnerable versions of request
    Depends on vulnerable versions of url-regex
    node_modules/jimp
      resize-img  <=1.1.2
      Depends on vulnerable versions of jimp
      Depends on vulnerable versions of jpeg-js
      node_modules/resize-img
        to-ico  >=1.1.0
        Depends on vulnerable versions of resize-img
        node_modules/to-ico

jpeg-js  <=0.4.3
Severity: high
Infinite loop in jpeg-js - https://github.com/advisories/GHSA-xvf7-4v9q-58w6
Uncontrolled resource consumption in jpeg-js - https://github.com/advisories/GHSA-w7q9-p3jq-fmhm
fix available via `npm audit fix --force`
Will install to-ico@1.0.1, which is a breaking change
node_modules/jimp/node_modules/jpeg-js
node_modules/jpeg-js

jspdf  <=4.0.0
Severity: high
jsPDF has PDF Injection in AcroFormChoiceField that allows Arbitrary JavaScript Execution - https://github.com/advisories/GHSA-pqxr-3g65-p328
jsPDF Vulnerable to Denial of Service (DoS) via Unvalidated BMP Dimensions in BMPDecoder - https://github.com/advisories/GHSA-95fx-jjr5-f39c
jsPDF Vulnerable to Stored XMP Metadata Injection (Spoofing & Integrity Violation) - https://github.com/advisories/GHSA-vm32-vv63-w422
jsPDF has Shared State Race Condition in addJS Plugin - https://github.com/advisories/GHSA-cjw8-79x6-5cj4
fix available via `npm audit fix`
node_modules/jspdf

lodash  4.0.0 - 4.17.21
Severity: moderate
Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions - https://github.com/advisories/GHSA-xxjr-mmjv-4gpg
fix available via `npm audit fix`
node_modules/lodash

minimist  <=0.2.3
Severity: critical
Prototype Pollution in minimist - https://github.com/advisories/GHSA-vh95-rmgr-6w4m
Prototype Pollution in minimist - https://github.com/advisories/GHSA-xvch-5gv4-984h
fix available via `npm audit fix --force`
Will install to-ico@1.0.1, which is a breaking change
node_modules/jimp/node_modules/minimist
  mkdirp  0.4.1 - 0.5.1
  Depends on vulnerable versions of minimist
  node_modules/jimp/node_modules/mkdirp

nodemailer  <=7.0.10
Severity: moderate
Nodemailer: Email to an unintended domain can occur due to Interpretation Conflict - https://github.com/advisories/GHSA-mm7p-fcc7-pg87
Nodemailer's addressparser is vulnerable to DoS caused by recursive calls - https://github.com/advisories/GHSA-rcmh-qjqh-p98v
fix available via `npm audit fix --force`
Will install nodemailer@8.0.1, which is a breaking change
node_modules/nodemailer

qs  <6.14.1
Severity: high
qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion - https://github.com/advisories/GHSA-6rw7-vpxm-498p
fix available via `npm audit fix --force`
Will install to-ico@1.0.1, which is a breaking change
node_modules/body-parser/node_modules/qs
node_modules/express/node_modules/qs
node_modules/qs
node_modules/request/node_modules/qs
  body-parser  <=1.20.3 || 2.0.0-beta.1 - 2.0.2
  Depends on vulnerable versions of qs
  node_modules/body-parser
    express  2.5.8 - 2.5.11 || 3.2.1 - 3.2.3 || 4.0.0-rc1 - 4.21.2 || 5.0.0-alpha.1 - 5.0.1
    Depends on vulnerable versions of body-parser
    Depends on vulnerable versions of qs
    node_modules/express


tar  <=7.5.6
Severity: high
node-tar is Vulnerable to Arbitrary File Overwrite and Symlink Poisoning via Insufficient Path Sanitization - https://github.com/advisories/GHSA-8qq5-rm4j-mr97
Race Condition in node-tar Path Reservations via Unicode Ligature Collisions on macOS APFS - https://github.com/advisories/GHSA-r6q2-hw4h-h46w
node-tar Vulnerable to Arbitrary File Creation/Overwrite via Hardlink Path Traversal - https://github.com/advisories/GHSA-34x7-hfp2-rc4v
fix available via `npm audit fix --force`
Will install electron-builder@26.7.0, which is a breaking change
node_modules/tar
  app-builder-lib  23.0.7 - 26.4.1
  Depends on vulnerable versions of dmg-builder
  Depends on vulnerable versions of electron-builder-squirrel-windows
  Depends on vulnerable versions of tar
  node_modules/app-builder-lib
    dmg-builder  23.0.7 - 26.4.1
    Depends on vulnerable versions of app-builder-lib
    node_modules/dmg-builder
      electron-builder  19.25.0 || 23.0.7 - 26.4.1
      Depends on vulnerable versions of app-builder-lib
      Depends on vulnerable versions of dmg-builder
      node_modules/electron-builder
    electron-builder-squirrel-windows  23.0.7 - 26.4.1
    Depends on vulnerable versions of app-builder-lib
      node_modules/electron-builder-squirrel-windows

tough-cookie  <4.1.3
Severity: moderate
tough-cookie Prototype Pollution vulnerability - https://github.com/advisories/GHSA-72xf-g2v4-qvf3
fix available via `npm audit fix --force`
Will install to-ico@1.0.1, which is a breaking change
node_modules/request/node_modules/tough-cookie

url-regex  *
Severity: high
Regular expression denial of service in url-regex - https://github.com/advisories/GHSA-v4rh-8p82-6h5w
fix available via `npm audit fix`
node_modules/url-regex

28 vulnerabilities (2 low, 9 moderate, 12 high, 5 critical)
```

---

**Summary:** 5 critical, 12 high. Goal: 0 critical, 0 high.
