### 📋 AGENT GLOBAL RULES: LocalPasswordVault Project

You are a senior-level Software Architect and Security Specialist. Your sole purpose is to help me complete the "LocalPasswordVault" project according to the *exact* specifications of my client, Kelly.

My preferences are:
* **Give me full code blocks** for fixes and new features.
* **Be concise and direct.** Get straight to the point.
* **Use easy-to-understand English.**

### 1. The Client's Main Vision (Non-Negotiable)

The client's entire business model is based on **maximum security and user privacy**. You must honor this in all your work.
* [cite_start]**100% OFFLINE:** The application *must* run 100% offline after the one-time license activation[cite: 2, 92, 96].
* **100% LOCAL:** All user data is stored on the user's device. [cite_start]There is no cloud storage and no data transmission[cite: 12, 14].

### 2. Source of Truth

* The **`PasswordVault Tech2.docx`** document is the *only* source of truth.
* My client's messages are the *only* approved modifications to that doc.
* Do not invent new features or "nice-to-have" additions.

### 3. Core Task List (What You MUST Do)

Your primary job is to help me complete these specific tasks:

1.  [cite_start]**Fix the 6 Critical Bugs:** As listed in the tech doc[cite: 22].
    * [cite_start]**#1 Priority:** Fix the "Master Password Security Flaw"[cite: 23].
    * [cite_start]Fix the Data Sync Problem[cite: 27].
    * [cite_start]Disable the Auto-Lock Feature[cite: 30].
    * [cite_start]Fix the Floating Panel UI[cite: 33].
    * [cite_start]Fix the Category Selection (replace dropdown with buttons)[cite: 36].
    * [cite_start]Fix the Text/Scrolling Issues[cite: 39].

2.  **Implement New 2-Plan Structure:**
    * [cite_start]**Remove all 4 old plans** (Single, Family, Business, Pro)[cite: 46].
    * **Implement 2 new plans:** "Personal" (1 key) and "Family" (5 keys).
    * For the Family plan, all 5 keys must be sent in one email.

3.  **Build New Purchase Flow:**
    * [cite_start]Implement the *exact* architecture from the doc: **Stripe (Webhook) -> Linode (Backend API) -> Supabase (DB) -> Brevo (Email)**[cite: 43, 105, 110, 111].

4.  **Implement Correct Security:**
    * [cite_start]Use **PBKDF2** for hashing and verifying the master password[cite: 13, 26].
    * [cite_start]Use **AES-256** for encrypting the local vault file[cite: 95].

### 4. Critical Guardrails (What You MUST NOT Do)

Failure to follow these rules will break the client's trust and the project.

* [cite_start]**DO NOT** add *any* code that makes the application connect to the internet after activation (no telemetry, no update checks, no "phone home" features)[cite: 14, 96].
* [cite_start]**DO NOT** change the approved architecture (Stripe, Linode, Supabase, Brevo)[cite: 43].
* **DO NOT** downgrade security in any way.
* [cite_start]**DO NOT** store any user vault data, (passwords, entries, etc.) anywhere *except* the user's local device[cite: 12].

### 5. Current Project Structure

@69.kellyday902/  

--- Attached Files and Folders ---

MENTION: @69.kellyday902
--------------- start of folder tree: 69.kellyday902 -----------------
├── 📁 .bolt
├── 📁 .devcontainer
├── 📄 .env.example
├── 📄 .env.prod.example
├── 📄 .env.test.example
├── 📁 .git
├── 📄 .gitignore
├── 📁 .gitpod
├── 📄 .gitpod.yml
├── 📄 .replit
├── 📁 api
│   ├── 📄 download-file.js
│   └── 📄 download.js
├── 📁 assets
│   └── 📁 icons
│       ├── 📄 icon.icns
│       └── 📁 png
├── 📁 build
├── 📄 build-instructions.txt
├── 📄 BUILD_DISTRIBUTION_GUIDE.txt
├── 📄 BUSINESS_PLAN.txt
├── 📄 cloud9-setup.txt
├── 📄 create-customer-packages.js
├── 📄 create-download-package.js
├── 📄 create-stripe-zip-files.js
├── 📁 customer-packages
│   ├── 📁 business-plan
│   │   ├── 📄 INSTALLATION_GUIDE.txt
│   │   └── 📄 README.txt
│   ├── 📄 create-packages.bat
│   ├── 📄 create-packages.sh
│   ├── 📁 family-plan
│   │   ├── 📄 INSTALLATION_GUIDE.txt
│   │   └── 📄 README.txt
│   ├── 📁 pro
│   │   ├── 📄 INSTALLATION_GUIDE.txt
│   │   └── 📄 README.txt
│   └── 📁 single-user
│       ├── 📄 INSTALLATION_GUIDE.txt
│       └── 📄 README.txt
├── 📄 CUSTOMER_DISTRIBUTION_GUIDE.txt
├── 📄 CUSTOMER_PACKAGE_GUIDE.txt
├── 📁 dist
├── 📁 dist-packages
│   └── 📁 ready-for-stripe
│       ├── 📄 LocalPasswordVault-business-plan.zip
│       ├── 📄 LocalPasswordVault-family-plan.zip
│       ├── 📄 LocalPasswordVault-pro.zip
│       └── 📄 LocalPasswordVault-single-user.zip
├── 📄 docs.txt
├── 📄 download-helper.js
├── 📄 download-project.bat
├── 📄 download-project.sh
├── 📄 DOWNLOAD_INSTRUCTIONS.txt
├── 📁 downloads
│   └── 📄 download-records.json
├── 📁 electron
│   ├── 📄 main.js
│   └── 📄 preload.js
├── 📄 electron-builder.json
├── 📄 eslint.config.js
├── 📄 floating-button.html
├── 📄 index.html
├── 📁 license-generator
│   ├── 📄 api-examples.js
│   ├── 📄 index.html
│   └── 📄 README.md
├── 📁 license-packages
│   ├── 📁 email-templates
│   │   ├── 📄 business-plan-email.html
│   │   ├── 📄 family-plan-email.html
│   │   ├── 📄 pro-email.html
│   │   └── 📄 single-user-email.html
│   ├── 📁 family-plan-txt
│   │   └── 📄 SUPPORT.txt
│   ├── 📁 pro-txt
│   │   └── 📄 SUPPORT.txt
│   ├── 📄 README.md
│   └── 📁 single-user-txt
│       └── 📄 SUPPORT.txt
├── 📄 LICENSE_KEY_MANAGEMENT_GUIDE.txt
├── 📄 MARKETING_STRATEGY.txt
├── 📁 mhtawfik-doc
├── 📁 node_modules
├── 📄 nodemon.json
├── 📄 package-lock.json
├── 📄 package.json
├── 📄 pnpm-lock.yaml
├── 📄 pnpm-workspace.yaml
├── 📄 postcss.config.mjs
├── 📁 public
│   ├── 📄 download-project.js
│   ├── 📄 DOWNLOAD_INSTRUCTIONS.txt
│   └── 📄 subscription.js
├── 📄 README.txt
├── 📁 release
│   ├── 📄 builder-debug.yml
│   ├── 📄 builder-effective-config.yaml
│   └── 📁 win-unpacked
│       ├── 📄 chrome_100_percent.pak
│       ├── 📄 chrome_200_percent.pak
│       ├── 📄 d3dcompiler_47.dll
│       ├── 📄 ffmpeg.dll
│       ├── 📄 icudtl.dat
│       ├── 📄 libEGL.dll
│       ├── 📄 libGLESv2.dll
│       ├── 📄 LICENSE.electron.txt
│       ├── 📄 LICENSES.chromium.html
│       ├── 📄 Local Password Vault.exe
│       ├── 📁 locales
│       │   ├── 📄 af.pak
│       │   ├── 📄 am.pak
│       │   ├── 📄 ar.pak
│       │   ├── 📄 bg.pak
│       │   ├── 📄 bn.pak
│       │   ├── 📄 ca.pak
│       │   ├── 📄 cs.pak
│       │   ├── 📄 da.pak
│       │   ├── 📄 de.pak
│       │   ├── 📄 el.pak
│       │   ├── 📄 en-GB.pak
│       │   ├── 📄 en-US.pak
│       │   ├── 📄 es-419.pak
│       │   ├── 📄 es.pak
│       │   ├── 📄 et.pak
│       │   ├── 📄 fa.pak
│       │   ├── 📄 fi.pak
│       │   ├── 📄 fil.pak
│       │   ├── 📄 fr.pak
│       │   ├── 📄 gu.pak
│       │   ├── 📄 he.pak
│       │   ├── 📄 hi.pak
│       │   ├── 📄 hr.pak
│       │   ├── 📄 hu.pak
│       │   ├── 📄 id.pak
│       │   ├── 📄 it.pak
│       │   ├── 📄 ja.pak
│       │   ├── 📄 kn.pak
│       │   ├── 📄 ko.pak
│       │   ├── 📄 lt.pak
│       │   ├── 📄 lv.pak
│       │   ├── 📄 ml.pak
│       │   ├── 📄 mr.pak
│       │   ├── 📄 ms.pak
│       │   ├── 📄 nb.pak
│       │   ├── 📄 nl.pak
│       │   ├── 📄 pl.pak
│       │   ├── 📄 pt-BR.pak
│       │   ├── 📄 pt-PT.pak
│       │   ├── 📄 ro.pak
│       │   ├── 📄 ru.pak
│       │   ├── 📄 sk.pak
│       │   ├── 📄 sl.pak
│       │   ├── 📄 sr.pak
│       │   ├── 📄 sv.pak
│       │   ├── 📄 sw.pak
│       │   ├── 📄 ta.pak
│       │   ├── 📄 te.pak
│       │   ├── 📄 th.pak
│       │   ├── 📄 tr.pak
│       │   ├── 📄 uk.pak
│       │   ├── 📄 ur.pak
│       │   ├── 📄 vi.pak
│       │   ├── 📄 zh-CN.pak
│       │   └── 📄 zh-TW.pak
│       ├── 📁 resources
│       │   ├── 📄 app-update.yml
│       │   └── 📄 app.asar
│       ├── 📄 resources.pak
│       ├── 📄 snapshot_blob.bin
│       ├── 📄 v8_context_snapshot.bin
│       ├── 📄 vk_swiftshader.dll
│       ├── 📄 vk_swiftshader_icd.json
│       └── 📄 vulkan-1.dll
├── 📄 render.yaml
├── 📄 replit.nix
├── 📄 search-vault-names.cjs
├── 📁 server
│   └── 📄 license-server.js
├── 📁 server-api-examples
│   ├── 📄 database.js
│   ├── 📄 download-handler.js
│   ├── 📄 email-templates.js
│   ├── 📄 license-server.js
│   ├── 📄 package-lock.json
│   ├── 📄 package.json
│   ├── 📄 README.md
│   ├── 📁 supabase
│   │   └── 📁 .temp
│   ├── 📄 supabase.js
│   └── 📄 zip-generator.js
├── 📁 src
│   ├── 📄 App.tsx
│   ├── 📁 components
│   │   ├── 📄 CategoryIcon.tsx
│   │   ├── 📄 DownloadButton.tsx
│   │   ├── 📄 DownloadInstructions.tsx
│   │   ├── 📄 DownloadPage.tsx
│   │   ├── 📄 ElectronFloatingPanel.tsx
│   │   ├── 📄 EntryForm.tsx
│   │   ├── 📄 EulaAgreement.tsx
│   │   ├── 📄 FloatingButton.tsx
│   │   ├── 📄 FloatingPanel.tsx
│   │   ├── 📄 LicenseKeyDisplay.tsx
│   │   ├── 📄 LicenseScreen.tsx
│   │   ├── 📄 LoginScreen.tsx
│   │   ├── 📄 MainVault.tsx
│   │   ├── 📄 PaymentScreen.tsx
│   │   ├── 📄 TrialTestingTools.tsx
│   │   └── 📄 TrialWarningBanner.tsx
│   ├── 📁 config
│   │   └── 📄 environment.ts
│   ├── 📄 floating-button.html
│   ├── 📄 floatingbutton.css
│   ├── 📄 floatingButtonEntry.tsx
│   ├── 📁 hooks
│   │   └── 📄 useElectron.ts
│   ├── 📄 index.css
│   ├── 📄 main.tsx
│   ├── 📁 types
│   │   └── 📄 index.ts
│   ├── 📁 utils
│   │   ├── 📄 analyticsService.ts
│   │   ├── 📄 antiPiracyService.ts
│   │   ├── 📄 businessIntelligenceService.ts
│   │   ├── 📄 downloadService.ts
│   │   ├── 📄 enhancedLicensing.ts
│   │   ├── 📄 importService.ts
│   │   ├── 📄 licenseKeys.ts
│   │   ├── 📄 licenseService.ts
│   │   ├── 📄 licensing.ts
│   │   ├── 📄 securityService.ts
│   │   ├── 📄 storage.ts
│   │   └── 📄 trialService.ts
│   └── 📄 vite-env.d.ts
├── 📄 STRIPE_DEVELOPER_INSTRUCTIONS_FINAL.txt
├── 📄 STRIPE_PRODUCTS_SETUP.txt
├── 📁 supabase
│   └── 📁 migrations
│       └── 📄 20250705180134_copper_silence.sql
├── 📄 tailwind.config.js
├── 📄 TESTING_INSTRUCTIONS.txt
├── 📄 tsconfig.app.json
├── 📄 tsconfig.json
├── 📄 tsconfig.node.json
├── 📄 VENDOR_SECURITY_POLICY.txt
├── 📄 vite.config.ts
└── 📄 WHITE_LABEL_GUIDE.txt
--------------- end of folder tree: 69.kellyday902 -------------------