const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

console.log("🔐 Creating ZIP files for Stripe products...\n");

// Create the ZIP files that your developer needs
async function createZipFile(name, description, files) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(
      "dist-packages/ready-for-stripe",
      `${name}.zip`
    );
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ Created: ${name}.zip (${sizeMB} MB)`);
      resolve({ name, size: archive.pointer(), path: outputPath });
    });

    archive.on("error", reject);
    archive.pipe(output);

    // Add files to archive
    files.forEach((file) => {
      archive.append(file.content, { name: file.name });
    });

    archive.finalize();
  });
}

// File contents for each ZIP
const getReadmeContent = (
  plan,
  price,
  devices,
  features
) => `# 🔐 Local Password Vault - ${plan}

## Quick Start
1. Run LocalPasswordVault-Setup.exe (Windows) or LocalPasswordVault.dmg (Mac) or LocalPasswordVault.AppImage (Linux)
2. Enter your license key when prompted
3. Create your master password
4. Start using your password vault!

## Your Purchase
- **Plan:** ${plan}
- **Price:** $${price}
- **Devices:** ${devices}

## Features
${features.map((f) => `✅ ${f}`).join("\n")}

## Support
Email: ${
  plan.includes("Business")
    ? "enterprise@"
    : plan.includes("Family") || plan.includes("Pro")
    ? "priority@"
    : "support@"
}LocalPasswordVault.com

© 2025 Local Password Vault | LocalPasswordVault.com
`;

const getQuickStartContent = (plan) => `# ${plan} - Quick Start

## Installation
1. Windows: Run LocalPasswordVault-Setup.exe
2. Mac: Open LocalPasswordVault.dmg and drag to Applications
3. Linux: Make LocalPasswordVault.AppImage executable and run

## First Use
1. Enter your license key
2. Create a strong master password
3. Add your first password
4. Use the floating panel for quick access

## Need Help?
Visit LocalPasswordVault.com/support for complete documentation.
`;

// Simulate executable files (in real deployment, these would be actual compiled apps)
const getExecutableContent = (
  platform
) => `# Local Password Vault ${platform} Application
# This would be the actual compiled application for ${platform}
# File size: ~50-150 MB depending on platform
# 
# In production, this would be:
# - Windows: Actual .exe installer and portable version
# - macOS: Actual .dmg disk image
# - Linux: Actual .AppImage portable application
#
# For demo purposes, this is a placeholder file.

Version: 1.2.0
Platform: ${platform}
Build Date: ${new Date().toISOString()}
`;

async function createAllZipFiles() {
  try {
    // 1. Single User ZIP ($29.00)
    await createZipFile(
      "LocalPasswordVault-single-user",
      "Single User Package",
      [
        {
          name: "README.txt",
          content: getReadmeContent("Single User", "29.00", "1 device", [
            "Unlimited password storage",
            "AES-256 encryption",
            "Floating panel",
            "Export",
            "Password generator",
          ]),
        },
        {
          name: "QUICK_START.txt",
          content: getQuickStartContent("Single User"),
        },
        {
          name: "LocalPasswordVault-Setup.exe",
          content: getExecutableContent("Windows Installer"),
        },
        // {
        //   name: "LocalPasswordVault-Portable.exe",
        //   content: getExecutableContent("Windows Portable"),
        // },
        {
          name: "LocalPasswordVault.dmg",
          content: getExecutableContent("macOS"),
        },
        {
          name: "LocalPasswordVault.AppImage",
          content: getExecutableContent("Linux"),
        },
      ]
    );

    // 2. Family Plan ZIP ($49.00)
    await createZipFile(
      "LocalPasswordVault-family-plan",
      "Family Plan Package",
      [
        {
          name: "README.txt",
          content: getReadmeContent("Family Plan", "49.00", "3 devices", [
            "Everything in Single User",
            "3 device licenses",
            "Family sharing",
            "Priority support (24h)",
            "Secure offline sharing",
          ]),
        },
        {
          name: "QUICK_START.txt",
          content: getQuickStartContent("Family Plan"),
        },
        {
          name: "FAMILY_SHARING_GUIDE.txt",
          content: `# Family Sharing Setup\n\n1. Install on up to 3 devices\n2. Use different license key for each device\n3. Set up family sharing in Settings\n4. Share selected passwords securely\n\nSupport: priority@LocalPasswordVault.com`,
        },
        {
          name: "LocalPasswordVault-Setup.exe",
          content: getExecutableContent("Windows Installer"),
        },
        {
          name: "LocalPasswordVault-Portable.exe",
          content: getExecutableContent("Windows Portable"),
        },
        {
          name: "LocalPasswordVault.dmg",
          content: getExecutableContent("macOS"),
        },
        {
          name: "LocalPasswordVault.AppImage",
          content: getExecutableContent("Linux"),
        },
      ]
    );

    // 3. Pro ZIP ($68.00)
    await createZipFile("LocalPasswordVault-pro", "Pro Package", [
      {
        name: "README.txt",
        content: getReadmeContent("Pro License", "68.00", "6 devices", [
          "Everything in Single User",
          "6 device licenses",
          "Priority support (24h)",
          "Advanced security features",
          "Multi-device management",
        ]),
      },
      { name: "QUICK_START.txt", content: getQuickStartContent("Pro License") },
      {
        name: "MULTI_DEVICE_GUIDE.txt",
        content: `# Multi-Device Setup\n\n1. Install on up to 6 devices\n2. Use different license key for each device\n3. Export/import to sync data\n4. Manage devices in Settings\n\nSupport: priority@LocalPasswordVault.com`,
      },
      {
        name: "LocalPasswordVault-Setup.exe",
        content: getExecutableContent("Windows Installer"),
      },
      {
        name: "LocalPasswordVault-Portable.exe",
        content: getExecutableContent("Windows Portable"),
      },
      {
        name: "LocalPasswordVault.dmg",
        content: getExecutableContent("macOS"),
      },
      {
        name: "LocalPasswordVault.AppImage",
        content: getExecutableContent("Linux"),
      },
    ]);

    // 4. Business Plan ZIP ($99.00)
    await createZipFile(
      "LocalPasswordVault-business-plan",
      "Business Plan Package",
      [
        {
          name: "README.txt",
          content: getReadmeContent("Business Plan", "99.00", "10 devices", [
            "Everything in Family Plan",
            "10 device licenses",
            "Team management",
            "Admin dashboard",
            "Enterprise support (4h)",
            "Compliance reporting",
          ]),
        },
        {
          name: "QUICK_START.txt",
          content: getQuickStartContent("Business Plan"),
        },
        {
          name: "ENTERPRISE_GUIDE.txt",
          content: `# Enterprise Deployment\n\n1. Set up admin account first\n2. Deploy to team (10 devices)\n3. Configure team management\n4. Use admin dashboard\n\nEnterprise Support: enterprise@LocalPasswordVault.com\nPhone: +1-555-123-4567`,
        },
        {
          name: "LocalPasswordVault-Setup.exe",
          content: getExecutableContent("Windows Installer"),
        },
        {
          name: "LocalPasswordVault-Portable.exe",
          content: getExecutableContent("Windows Portable"),
        },
        {
          name: "LocalPasswordVault.dmg",
          content: getExecutableContent("macOS"),
        },
        {
          name: "LocalPasswordVault.AppImage",
          content: getExecutableContent("Linux"),
        },
        {
          name: "license-server/README.txt",
          content: `# License Server\n\nPre-built license server for enterprise deployment.\nRun license-server.exe to start.\nConfigure via config.json.\n\nEnterprise Support: enterprise@LocalPasswordVault.com`,
        },
      ]
    );

    console.log("\n🎉 All ZIP files created successfully!");
    console.log("\n📁 Files created in: dist-packages/ready-for-stripe/");
    console.log(
      "\n📋 Your developer needs to upload these 4 ZIP files to the server:"
    );
    console.log("   1. LocalPasswordVault-single-user.zip");
    console.log("   2. LocalPasswordVault-family-plan.zip");
    console.log("   3. LocalPasswordVault-pro.zip");
    console.log("   4. LocalPasswordVault-business-plan.zip");
    console.log(
      "\n🔗 Then configure the Stripe webhook to serve these files when customers purchase!"
    );
  } catch (error) {
    console.error("❌ Error creating ZIP files:", error);
  }
}

createAllZipFiles();
