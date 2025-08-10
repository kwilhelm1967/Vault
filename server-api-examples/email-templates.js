import nodemailer from "nodemailer";
class EmailService {
  constructor() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn(
        "Email service not configured - emails will be logged instead of sent"
      );
      this.transporter = null;
    } else {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }
  }

  // Send license email with download link
  async sendLicenseEmail(customerEmail, licenses, licenseType, downloadInfo) {
    try {
      const template = this.getEmailTemplate(
        licenseType,
        licenses,
        downloadInfo
      );

      const mailOptions = {
        from: process.env.EMAIL_SERVICE,
        to: customerEmail,
        subject: `Your Local Password Vault ${this.getLicenseDisplayName(
          licenseType
        )} License`,
        html: template,
      };

      const response = await this.transporter.sendMail(mailOptions);
      console.log("send response", response);

      // Check if email was actually accepted
      if (response.rejected && response.rejected.length > 0) {
        console.error("Some emails were rejected:", response.rejected);
      }

      if (response.accepted && response.accepted.length > 0) {
        console.log("✅ Email accepted by server for:", response.accepted);
        console.log(
          "📧 Check Brevo dashboard and spam folder for delivery status"
        );
      }
    } catch (error) {
      console.error("Failed to send license email:", error);
      throw error;
    }
  }

  // Get email template based on license type
  getEmailTemplate(licenseType, licenses, downloadInfo) {
    const licenseKeys = Array.isArray(licenses) ? licenses : [licenses];
    const displayName = this.getLicenseDisplayName(licenseType);
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Local Password Vault ${displayName} License</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #ffffff;
            padding: 30px;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .license-key {
            background: #1e293b;
            color: #06b6d4;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 18px;
            text-align: center;
            margin: 10px 0;
            letter-spacing: 2px;
        }
        .download-section {
            background: #f0f9ff;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }
        .download-button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 18px;
            margin: 10px 0;
        }
        .download-button:hover {
            background: #2563eb;
        }
        .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
        }
        .divider {
            border-top: 1px solid #e5e7eb;
            margin: 25px 0;
        }
        .feature-list {
            background: #f1f5f9;
            padding: 15px;
            border-radius: 8px;
        }
        .important-note {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Your Local Password Vault ${displayName}</h1>
            <p>Thank you for your purchase!</p>
        </div>
        <div class="content">
            <h2>Your ${displayName} License</h2>
            <p>Thank you for purchasing Local Password Vault! Your secure, offline password management solution is ready to use.</p>
            
            <div class="important-note">
                <strong>Important:</strong> Please download your software package within 30 days. The download link will expire after that time.
            </div>
            
            <div class="download-section">
                <h3>📦 Download Your Software Package</h3>
                <p><strong>Package:</strong> ${downloadInfo.fileName}</p>
                <p><strong>Size:</strong> ${(
                  downloadInfo.size /
                  1024 /
                  1024
                ).toFixed(2)} MB</p>
                <p><strong>Expires:</strong> ${new Date(
                  downloadInfo.expiresAt
                ).toLocaleDateString()}</p>
                
                <a href="${
                  process.env.SERVER_URL || "https://your-server.com"
                }${downloadInfo.downloadUrl}" class="download-button">
                    📥 Download Local Password Vault
                </a>
                
                <p style="margin-top: 15px; font-size: 14px; color: #059669;">
                    This package contains everything you need: source code, documentation, license tools, and business resources.
                </p>
            </div>
            
            <h3>Your License Key${licenseKeys.length > 1 ? "s" : ""}:</h3>
            ${licenseKeys
              .map(
                (key, index) => `
                ${
                  licenseKeys.length > 1
                    ? `<p><strong>Device ${index + 1}:</strong></p>`
                    : ""
                }
                <div class="license-key">${key}</div>
            `
              )
              .join("")}
            
            <div class="divider"></div>
            
            <h3>What's Included in Your Package:</h3>
            <div class="feature-list">
                <ul>
                    <li><strong>Complete Source Code</strong> - Full React/TypeScript application</li>
                    <li><strong>Desktop Applications</strong> - Windows, macOS, and Linux builds</li>
                    <li><strong>Documentation</strong> - Installation guides and user manuals</li>
                    <li><strong>License Generator</strong> - Tools for managing license keys</li>
                    <li><strong>Business Resources</strong> - Marketing and business documentation</li>
                    ${
                      licenseType === "business-plan"
                        ? "<li><strong>License Server</strong> - Complete backend for enterprise deployment</li>"
                        : ""
                    }
                </ul>
            </div>
            
            <div class="divider"></div>
            
            <h3>Quick Start:</h3>
            <ol>
                <li>Download the package using the button above</li>
                <li>Extract the ZIP file to a folder on your computer</li>
                <li>Follow the README.txt file for detailed setup instructions</li>
                <li>Install Node.js if you plan to build from source</li>
                <li>Use your license key(s) to activate the application</li>
            </ol>
            
            <div class="divider"></div>
            
            <h3>Need Help?</h3>
            <p>Check out these resources:</p>
            <ul>
                <li><strong>Setup Instructions:</strong> Included in your download package</li>
                <li><strong>Documentation:</strong> Complete guides included</li>
                <li><strong>Email Support:</strong> <a href="mailto:support@LocalPasswordVault.com">support@LocalPasswordVault.com</a></li>
                ${
                  licenseType !== "single-user"
                    ? '<li><strong>Priority Support:</strong> <a href="mailto:priority@LocalPasswordVault.com">priority@LocalPasswordVault.com</a></li>'
                    : ""
                }
                ${
                  licenseType === "business-plan"
                    ? '<li><strong>Enterprise Support:</strong> <a href="mailto:enterprise@LocalPasswordVault.com">enterprise@LocalPasswordVault.com</a></li>'
                    : ""
                }
            </ul>
            
            <p>Thank you for choosing Local Password Vault for your password security needs!</p>
            
            <p>Sincerely,<br>
            The Local Password Vault Team</p>
        </div>
        <div class="footer">
            <p>© 2025 Local Password Vault | <a href="https://LocalPasswordVault.com">LocalPasswordVault.com</a></p>
            <p>This email contains your license information and download link. Please keep it for your records.</p>
        </div>
    </div>
</body>
</html>`;
  }

  getLicenseDisplayName(licenseType) {
    const names = {
      single: "Single User License",
      "single-user": "Single User License",
      family: "Family Plan",
      "family-plan": "Family Plan",
      pro: "Pro License",
      business: "Business Plan",
      "business-plan": "Business Plan",
    };

    return names[licenseType] || "License";
  }
}

export default EmailService;
