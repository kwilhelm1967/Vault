import fs from "fs";
import path from "path";
import archiver from "archiver";

class PackageGenerator {
  constructor() {
    this.packageConfigs = {
      "single-user": {
        name: "LocalPasswordVault",
        description: "Single User License Package",
        files: this.getUserFiles(),
      },
      "family-plan": {
        name: "LocalPasswordVault",
        description: "Family Plan License Package",
        files: this.getUserFiles(),
      },
      pro: {
        name: "LocalPasswordVault",
        description: "Pro License Package",
        files: this.getUserFiles(),
      },
      "business-plan": {
        name: "LocalPasswordVault",
        description: "Business Plan License Package",
        files: this.getUserFiles(),
      },
    };
  }

  // Generate ZIP file for specific package type
  async generatePackage(packageType, outputDir = "./downloads") {
    const config = this.packageConfigs[packageType];
    if (!config) {
      throw new Error(`Unknown package type: ${packageType}`);
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `${config.name}.zip`);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on("close", () => {
        resolve({
          filePath: outputPath,
          fileName: `${config.name}.zip`,
          size: archive.pointer(),
          description: config.description,
        });
      });

      archive.on("error", reject);
      archive.pipe(output);

      // Add files to archive
      config.files.forEach((file) => {
        if (file.type === "file") {
          if (fs.existsSync(file.source)) {
            archive.file(file.source, { name: file.destination });
          } else {
            console.warn(`File not found: ${file.source}`);
          }
        } else if (file.type === "content") {
          archive.append(file.content, { name: file.destination });
        }
      });

      archive.finalize();
    });
  }

  // Single User package files - ONLY .exe files + docs
  getUserFiles() {
    return [
      // All platform executables (NO source code)
      {
        type: "file",
        source: "release/LocalPasswordVault-Setup.exe",
        destination: "LocalPasswordVault-Setup.exe",
      },
      {
        type: "file",
        source: "release/LocalPasswordVault.dmg",
        destination: "LocalPasswordVault.dmg",
      },
      {
        type: "file",
        source: "release/LocalPasswordVault.AppImage",
        destination: "LocalPasswordVault.AppImage",
      },

      // Documentation only
      {
        type: "content",
        content: this.getReadme("single-user"),
        destination: "README.txt",
      },
      {
        type: "content",
        content: this.getQuickStart("single-user"),
        destination: "QUICK_START.txt",
      },
    ];
  }

  // Family Plan package files - ONLY .exe files + docs
  getFamilyPlanFiles() {
    return [
      // All platform executables (NO source code)
      {
        type: "file",
        source: "release/LocalPasswordVault-Setup.exe",
        destination: "LocalPasswordVault-Setup.exe",
      },
      {
        type: "file",
        source: "release/LocalPasswordVault-Portable.exe",
        destination: "LocalPasswordVault-Portable.exe",
      },
      {
        type: "file",
        source: "release/LocalPasswordVault.dmg",
        destination: "LocalPasswordVault.dmg",
      },
      {
        type: "file",
        source: "release/LocalPasswordVault.AppImage",
        destination: "LocalPasswordVault.AppImage",
      },

      // Family-specific documentation
      {
        type: "content",
        content: this.getReadme("family-plan"),
        destination: "README.txt",
      },
      {
        type: "content",
        content: this.getQuickStart("family-plan"),
        destination: "QUICK_START.txt",
      },
      {
        type: "content",
        content: this.getFamilySharingGuide(),
        destination: "FAMILY_SHARING_GUIDE.txt",
      },
    ];
  }
  LocalPasswordVault;

  // Pro package files - ONLY .exe files + docs
  getProFiles() {
    return [
      // All platform executables (NO source code)
      {
        type: "file",
        source: "release/LocalPasswordVault-Setup.exe",
        destination: "LocalPasswordVault-Setup.exe",
      },
      {
        type: "file",
        source: "release/LocalPasswordVault-Portable.exe",
        destination: "LocalPasswordVault-Portable.exe",
      },
      {
        type: "file",
        source: "release/LocalPasswordVault.dmg",
        destination: "LocalPasswordVault.dmg",
      },
      {
        type: "file",
        source: "release/LocalPasswordVault.AppImage",
        destination: "LocalPasswordVault.AppImage",
      },

      // Pro-specific documentation
      {
        type: "content",
        content: this.getReadme("pro"),
        destination: "README.txt",
      },
      {
        type: "content",
        content: this.getQuickStart("pro"),
        destination: "QUICK_START.txt",
      },
      {
        type: "content",
        content: this.getMultiDeviceGuide(),
        destination: "MULTI_DEVICE_GUIDE.txt",
      },
    ];
  }

  // Business Plan package files - ONLY .exe files + docs
  getBusinessPlanFiles() {
    return [
      // All platform executables (NO source code)
      {
        type: "file",
        source: "release/LocalPasswordVault-Setup.exe",
        destination: "LocalPasswordVault-Setup.exe",
      },
      {
        type: "file",
        source: "release/LocalPasswordVault-Portable.exe",
        destination: "LocalPasswordVault-Portable.exe",
      },
      {
        type: "file",
        source: "release/LocalPasswordVault.dmg",
        destination: "LocalPasswordVault.dmg",
      },
      {
        type: "file",
        source: "release/LocalPasswordVault.AppImage",
        destination: "LocalPasswordVault.AppImage",
      },

      // Pre-built license server files (NO source code)
      {
        type: "content",
        content: this.getLicenseServerExecutable(),
        destination: "license-server/license-server.exe",
      },
      {
        type: "content",
        content: this.getLicenseServerConfig(),
        destination: "license-server/config.json",
      },
      {
        type: "content",
        content: this.getLicenseServerReadme(),
        destination: "license-server/README.txt",
      },

      // Business-specific documentation
      {
        type: "content",
        content: this.getReadme("business-plan"),
        destination: "README.txt",
      },
      {
        type: "content",
        content: this.getQuickStart("business-plan"),
        destination: "QUICK_START.txt",
      },
      {
        type: "content",
        content: this.getEnterpriseGuide(),
        destination: "ENTERPRISE_DEPLOYMENT_GUIDE.txt",
      },
    ];
  }

  // README for each tier
  getReadme(tier) {
    const userCountBasedOnTier = {
      "single-user": 1,
      "family-plan": 3,
      pro: 6,
      "business-plan": 10,
    }[tier];

    const readmes = {
      "single-user": `# Local Password Vault - Single User

## Quick Start
1. Run LocalPasswordVault-Setup.exe (Windows) or LocalPasswordVault.dmg (Mac) or LocalPasswordVault.AppImage (Linux)
2. Enter your license key when prompted
3. Create your master password
4. Start using your password vault!

## Features
- ${userCountBasedOnTier} device license
- Unlimited passwords
- Offline security
- AES-256 encryption

## What You Get
- Full independence - no server dependency
- Working password manager software
- Pre-built applications for all platforms
- Complete setup documentation
- Full independence - no server dependency

## Support
Email: support@LocalPasswordVault.com

© 2025 Local Password Vault`,

      "family-plan": `# Local Password Vault - Family Plan

## Quick Start
1. Install on up to 3 devices using the provided installers
2. Use a different license key for each device (3 keys provided)
3. Create master passwords on each device

## Features
- 3 device licenses
- All Single User features

## What You Get
- Full independence - no server dependency
- Working password manager software
- Pre-built applications for all platforms
- Full independence - no server dependency

## Support
Email: support@LocalPasswordVault.com

© 2025 Local Password Vault`,

      pro: `# Local Password Vault - Pro

## Quick Start
1. Install on up to 6 devices using the provided installers
2. Use a different license key for each device (6 keys provided)
3. Create master passwords on each device

## Features
- 6 device licenses
- Advanced security features
- Multi-device management

## What You Get
- Full independence - no server dependency
- Working password manager software
- Pre-built applications for all platforms
- Full independence - no server dependency

## Support
Email: support@LocalPasswordVault.com

© 2025 Local Password Vault`,

      "business-plan": `# Local Password Vault - Business Plan

## Quick Start
1. Install on up to 6 devices using the provided installers
2. Use a different license key for each device (6 keys provided)
3. Create master passwords on each device


## Features
- 10 device licenses

## What You Get
- Full independence - no server dependency
- Working password manager software
- Pre-built applications for all platforms

## Support
Email: support@LocalPasswordVault.com

© 2025 Local Password Vault`,
    };

    return readmes["single-user"];
  }

  // Quick start guide for each tier
  getQuickStart(tier) {
    const userCountBasedOnTier = {
      "single-user": 1,
      "family-plan": 3,
      pro: 6,
      "business-plan": 10,
    }[tier];

    const userTierheading = {
      "single-user": "Single User",
      "family-plan": "Family Plan",
      pro: "Pro Plan",
      "business-plan": "Business Plan",
    }[tier];

    const guides = {
      "single-user": `# ${userTierheading} Quick Start

## Installation
1. Windows: Run LocalPasswordVault-Setup.exe
2. Mac: Open LocalPasswordVault.dmg and drag to Applications
3. Linux: Make LocalPasswordVault.AppImage executable and run

## First Use
1. Enter your license key
2. Create a strong master password
3. Add your first password
4. Use the floating panel for quick access

## License
- ${userCountBasedOnTier} license key provided
- Use on ${userCountBasedOnTier} device only

Support: support@LocalPasswordVault.com`,

      "family-plan": `# Family Plan Quick Start

## Installation (3 Devices)
1. Install on each device using the appropriate installer
2. Use a different license key for each device
3. Create master passwords on each device

## License
- 3 license keys provided
- Use different key for each device`,

      pro: `# Pro License Quick Start

## Installation (6 Devices)
1. Install on each device using the appropriate installer
2. Use the same license key on all devices
3. Create master passwords on each device

## Multi-Device Sync
1. Export vault from primary device

## License
- 1 license key provided
- Use same key on up to 6 devices

Priority support: priority@LocalPasswordVault.com`,

      "business-plan": `# Business Plan Quick Start

## Admin Setup
1. Install on admin device first
2. Use admin license key
3. Access Admin Dashboard in Settings
4. Configure organization settings

## Team Deployment
1. Distribute user license keys to team
2. Have users install and activate
3. Configure teams and sharing

## License
- 10 license keys provided
- 1 admin key + 9 user keys

Enterprise support: enterprise@LocalPasswordVault.com
Phone: +1-555-123-4567`,
    };

    return guides["single-user"];
  }

  // Additional content generators for specific packages
  getFamilySharingGuide() {
    return `# Family Sharing Setup Guide

## Setting Up Family Sharing
1. Install Local Password Vault on each device (up to 3)
2. Use a different license key for each device
3. On the primary device, go to Settings > Family Sharing
4. Generate a sharing key
5. On other devices, enter the sharing key
6. Select which passwords to share

## Best Practices
- Use strong master passwords on each device
- Only share passwords that need to be shared
- Review shared passwords regularly
- Remove access when family members no longer need it

Support: priority@LocalPasswordVault.com`;
  }

  getMultiDeviceGuide() {
    return `# Multi-Device Setup Guide

## Setting Up 6 Devices
1. Install Local Password Vault on each device (up to 6)
2. Use a different license key for each device
3. Create unique master passwords for each device
4. Export vault from primary device
5. Import on other devices to sync data

## Device Management
- Keep track of which devices are active
- Deactivate old devices when replacing
- Regular exports for backup and sync
- Use consistent categories across devices

Support: priority@LocalPasswordVault.com`;
  }

  getEnterpriseGuide() {
    return `# Enterprise Deployment Guide

## Admin Setup
1. Install on admin device using admin license key
2. Access Admin Dashboard in Settings
3. Configure organization settings
4. Set up teams and roles

## Team Deployment
1. Distribute user license keys to team members
2. Have users install and activate individually
3. Configure team sharing and permissions
4. Monitor usage through Admin Dashboard

## License Server (Optional)
1. Run license-server.exe on your server
2. Configure with your organization settings
3. Manage all licenses centrally
4. Generate reports and analytics

Enterprise Support: enterprise@LocalPasswordVault.com
Phone: +1-555-123-4567`;
  }

  getLicenseServerExecutable() {
    return `# This would be a compiled license server executable
# In a real implementation, this would be a binary file
# For now, this is a placeholder for the compiled server

License Server v1.0
Compiled executable for enterprise license management

To run: ./license-server.exe --config license-server-config.json
`;
  }

  getLicenseServerConfig() {
    return JSON.stringify(
      {
        server: {
          port: 3000,
          host: "0.0.0.0",
        },
        database: {
          type: "sqlite",
          path: "./licenses.db",
        },
        security: {
          enableRateLimit: true,
          maxRequestsPerMinute: 100,
        },
        organization: {
          name: "Your Organization",
          maxLicenses: 10,
          adminEmail: "admin@yourcompany.com",
        },
      },
      null,
      2
    );
  }

  getLicenseServerReadme() {
    return `# License Server Setup

## Quick Start
1. Run license-server.exe
2. Configure config.json with your settings
3. Access admin panel at http://localhost:3000
4. Manage your organization's licenses

## Configuration
Edit config.json to customize:
- Server port and host
- Database settings
- Organization details
- Security settings

## Usage
- Generate license keys for your team
- Monitor license usage
- Manage user access
- Generate compliance reports

Enterprise Support: enterprise@LocalPasswordVault.com`;
  }
}

export default PackageGenerator;
