// Example license server implementation
// This would be deployed as a separate Node.js service

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import stripe from "stripe";
import dotenv from "dotenv";
import DownloadHandler from "./download-handler.js";
import EmailService from "./email-templates.js";
import supabase from "./supabase.js";
import { saveLicensesToDatabase } from "./database.js";

dotenv.config();

const app = express();
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
const downloadHandler = new DownloadHandler();

const emailService = new EmailService();

console.log(supabase, "supabase");

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
});
app.use("/api/", limiter);

// Stricter rate limiting for license validation
const licenseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 license requests per minute
  message: "Too many license requests",
});

// Health check endpoint with status page
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Password Vault License Server</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: #333;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 2.5em;
          font-weight: 300;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 1.1em;
        }
        .content {
          padding: 30px;
        }
        .status-card {
          background: #f8f9fa;
          border-left: 4px solid #4CAF50;
          padding: 20px;
          margin-bottom: 30px;
          border-radius: 0 8px 8px 0;
        }
        .status-card h3 {
          margin: 0 0 10px 0;
          color: #4CAF50;
        }
        .api-section {
          margin-top: 30px;
        }
        .api-section h3 {
          color: #333;
          border-bottom: 2px solid #eee;
          padding-bottom: 10px;
        }
        .api-section ul {
          list-style: none;
          padding: 0;
        }
        .api-section li {
          background: #f8f9fa;
          margin: 10px 0;
          padding: 15px;
          border-radius: 6px;
          border-left: 3px solid #667eea;
        }
        code {
          background: #e9ecef;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Consolas', monospace;
          color: #d63384;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          border-top: 1px solid #eee;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 License Server Status</h1>
          <p>Server is active and ready to process license requests and subscriptions</p>
        </div>
        <div class="content">
          <div class="status-card">
            <h3>✅ Server Status: Online</h3>
            <p>All systems operational. Ready to process license validation, activation, and payment webhooks.</p>
            <p><strong>Server Time:</strong> ${new Date().toISOString()}</p>
          </div>
          
          <div class="api-section">
            <h3>Available Endpoints</h3>
            <ul>
              <li><code>/webhook/stripe</code> - Processes Stripe payment and subscription webhooks</li>
              <li><code>/api/validate-license</code> - Validates license keys</li>
              <li><code>/api/activate-license</code> - Activates license keys</li>
              <li><code>/api/create-subscription</code> - Creates a trial subscription</li>
              <li><code>/api/transfer-license</code> - Transfers license to new device</li>
              <li><code>/api/check-updates</code> - Checks for application updates</li>
              <li><code>/api/analytics</code> - Receives usage analytics</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>Password Vault License Server v1.0</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// For Stripe webhook - needs raw body
app.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const body = req.body;
    let event;

    try {
      // Verify the event came from Stripe
      event = stripeClient.webhooks.constructEvent(
        Buffer.from(body),
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle checkout.session.completed event (one-time payment)
    if (
      event.type === "checkout.session.completed" &&
      !event.data.object.subscription
    ) {
      const session = event.data.object;

      const paymentId = session.payment_intent;

      const amount = (session.amount_total / 100).toFixed(2);

      // Retrieve the product id using session line items
      const sessionWithLineItems =
        await stripeClient.checkout.sessions.retrieve(session.id, {
          expand: ["line_items"],
        });

      // Get the first line item to extract product information
      const lineItem = sessionWithLineItems.line_items.data[0];
      const productId = lineItem.price.product;

      // Get customer email and product info
      const customerEmail = session.customer_details.email;

      // Determine license type based on product
      let licenseType = "single";
      let quantity = 1;

      switch (productId) {
        case "prod_Sf9ECSYYWb9O9N":
          licenseType = "single";
          quantity = 1;
          break;
        case "prod_Sofb9khTHtbJsQ":
          licenseType = "single";
          quantity = 1;
          break;
        case "prod_Sf9HiDE4eqPoCE":
          licenseType = "family";
          quantity = 3;
          break;
        case "prod_SfoSPqyGwHMeZp":
          licenseType = "pro";
          quantity = 1;
          break;
        case "prod_Sf9IHRQdNePn0J":
          licenseType = "business";
          quantity = 10;
          break;
        default:
          console.log(
            `Unknown product ID: ${productId}, defaulting to single user`
          );
      }

      // Generate license keys
      const licenses = [];
      for (let i = 0; i < quantity; i++) {
        licenses.push(generateLicenseKey());
      }

      try {
        // Generate download package
        const downloadInfo = await downloadHandler.generateDownloadLink(
          licenseType,
          customerEmail,
          session.id
        );

        // In a real implementation, save to database
        await saveLicensesToDatabase(
          licenses,
          customerEmail,
          licenseType,
          session.id,
          "active",
          paymentId,
          amount
        );

        // In a real implementation, send email with license keys
        await emailService.sendWelcomeEmail(
          customerEmail,
          licenses,
          licenseType,
          downloadInfo
        );

        // For now, just log the licenses
        console.log("Generated licenses:", licenses);
        console.log("Download URL:", downloadInfo.downloadUrl);
      } catch (error) {
        console.error("Error processing license:", error);
      }
    }

    // Handle subscription events
    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object;
      console.log(`New subscription created: ${subscription.id}`);

      // Store subscription info for later
      // In a real implementation, save to database
      console.log("Subscription details:", {
        customerId: subscription.customer,
        subscriptionId: subscription.id,
        status: subscription.status,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
      });
    }

    // Handle trial ending soon
    if (event.type === "customer.subscription.trial_will_end") {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      // Get customer email
      const customer = await stripeClient.customers.retrieve(customerId);
      const customerEmail = customer.email;

      console.log(`Trial ending soon for customer ${customerEmail}`);

      // In a real implementation, send reminder email
      // await sendTrialEndingEmail(customerEmail, subscription);
    }

    // Handle successful payment after trial
    if (
      event.type === "invoice.paid" &&
      event.data.object.billing_reason === "subscription_cycle"
    ) {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      const customerId = invoice.customer;

      // Get customer email
      const customer = await stripeClient.customers.retrieve(customerId);
      const customerEmail = customer.email;

      // Get subscription details
      const subscription = await stripeClient.subscriptions.retrieve(
        subscriptionId
      );
      const productId = subscription.items.data[0].price.product;

      // Get product details
      const product = await stripeClient.products.retrieve(productId);
      const productName = product.name;

      console.log(
        `Subscription payment successful for ${customerEmail}, product: ${productName}`
      );

      // Determine license type based on product
      let licenseType = "single";
      let quantity = 1;

      if (productName.includes("Family")) {
        licenseType = "family";
        quantity = 3;
      } else if (productName.includes("Pro")) {
        licenseType = "pro";
        quantity = 1;
      } else if (productName.includes("Business")) {
        licenseType = "business";
        quantity = 10;
      }

      // Generate license keys
      const licenses = [];
      for (let i = 0; i < quantity; i++) {
        licenses.push(generateLicenseKey());
      }

      console.log(
        `Generated ${quantity} ${licenseType} license(s) for ${customerEmail} after trial`
      );

      // In a real implementation, save to database and send email
      console.log("Generated licenses:", licenses);
    }

    res.json({ received: true });
  }
);

// Download endpoint
app.get("/api/download/:token", downloadHandler.handleDownloadRequest());

// Download stats endpoint (for admin)
app.get("/api/admin/downloads", (req, res) => {
  try {
    const stats = downloadHandler.getDownloadStats();
    res.json(stats);
  } catch (error) {
    console.error("Error getting download stats:", error);
    res.status(500).json({ error: "Failed to get download stats" });
  }
});

// Manual package generation endpoint (for testing)
app.post("/api/generate-package", async (req, res) => {
  try {
    const { packageType, customerEmail } = req.body;

    if (!packageType) {
      return res.status(400).json({ error: "Package type required" });
    }

    const downloadInfo = await downloadHandler.generateDownloadLink(
      packageType,
      customerEmail || "test@example.com",
      "manual_" + Date.now()
    );

    res.json({
      success: true,
      downloadUrl: downloadInfo.downloadUrl,
      fileName: downloadInfo.fileName,
      size: downloadInfo.size,
      description: downloadInfo.description,
    });
  } catch (error) {
    console.error("Error generating package:", error);
    res.status(500).json({ error: "Failed to generate package" });
  }
});

// Cleanup expired downloads (run periodically)
setInterval(() => {
  downloadHandler.cleanupExpiredDownloads();
}, 24 * 60 * 60 * 1000); // Run daily
// Create a subscription with 7-day trial
app.post("/api/create-subscription", express.json(), async (req, res) => {
  try {
    const { email, paymentMethodId, priceId, productId } = req.body;

    if (!email || !paymentMethodId || !priceId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Create or retrieve customer
    let customer;
    const existingCustomers = await stripeClient.customers.list({ email });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripeClient.customers.create({
        email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    // Create subscription with 7-day trial
    const subscription = await stripeClient.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      trial_period_days: 7,
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        product_id: productId,
      },
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      trialEnd: new Date(subscription.trial_end * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Subscription creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// License key generation function
function generateLicenseKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = [];

  for (let i = 0; i < 4; i++) {
    let segment = "";
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }

  return segments.join("-");
}

app.use(express.json({ limit: "10mb" }));

// In-memory storage (use a real database in production)
const licenses = new Map();
const usageLog = [];
const suspiciousActivities = [];

// Initialize with some demo licenses
licenses.set("DEMO-1234-5678-9ABC", {
  key: "DEMO-1234-5678-9ABC",
  type: "pro",
  status: "active",
  customerEmail: "demo@example.com",
  createdAt: Date.now(),
  hardwareId: null,
  maxActivations: 1,
  activationCount: 0,
});

// License validation endpoint
app.post("/api/validate-license", licenseLimiter, async (req, res) => {
  try {
    const {
      licenseKey,
      hardwareId,
      timestamp,
      userAgent,
      platform,
      securityInfo,
    } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Log the validation attempt
    const logEntry = {
      licenseKey: licenseKey.substring(0, 8) + "****",
      hardwareId: hardwareId.substring(0, 8) + "****",
      clientIP,
      userAgent,
      platform,
      timestamp: Date.now(),
      action: "validate",
    };
    usageLog.push(logEntry);

    // Basic validation
    if (!licenseKey || !hardwareId) {
      return res.status(400).json({
        valid: false,
        error: "Missing required parameters",
      });
    }

    // Check license format
    const licensePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!licensePattern.test(licenseKey)) {
      suspiciousActivities.push({
        type: "invalid_license_format",
        licenseKey: licenseKey.substring(0, 8) + "****",
        clientIP,
        timestamp: Date.now(),
      });
      return res.status(400).json({
        valid: false,
        error: "Invalid license key format",
      });
    }

    // Check if license exists
    const { data: license, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("license_key", licenseKey)
      .single();

    if (error) {
      console.error("License retrieval error:", error);
      return res.status(500).json({
        valid: false,
        error: "Internal server error",
      });
    }

    if (!license) {
      suspiciousActivities.push({
        type: "license_not_found",
        licenseKey: licenseKey.substring(0, 8) + "****",
        clientIP,
        timestamp: Date.now(),
      });
      return res.status(404).json({
        valid: false,
        error: "License not found",
      });
    }

    // Check license status
    if (license.status !== "active") {
      return res.status(403).json({
        valid: false,
        error: `License is ${license.status}`,
      });
    }

    // Check hardware binding
    if (license.hardwareId && license.hardwareId !== hardwareId) {
      // Check if it's a similar hardware (minor changes)
      const similarity = calculateHardwareSimilarity(
        license.hardwareId,
        hardwareId
      );
      if (similarity < 0.8) {
        suspiciousActivities.push({
          type: "hardware_mismatch",
          licenseKey: licenseKey.substring(0, 8) + "****",
          storedHardware: license.hardwareId.substring(0, 8) + "****",
          currentHardware: hardwareId.substring(0, 8) + "****",
          similarity,
          clientIP,
          timestamp: Date.now(),
        });
        return res.status(403).json({
          valid: false,
          error: "License is bound to another device",
        });
      } else {
        // Minor hardware change - update binding
        license.hardwareId = hardwareId;
        license.lastUpdated = Date.now();
      }
    } else if (!license.hardwareId) {
      // First activation - bind to hardware
      if (license.activationCount >= license.maxActivations) {
        return res.status(403).json({
          valid: false,
          error: "Maximum activations exceeded",
        });
      }
      license.hardwareId = hardwareId;
      license.activationCount++;
      license.activatedAt = Date.now();
    }

    // Check for suspicious security info
    if (
      securityInfo &&
      securityInfo.violations &&
      securityInfo.violations.length > 0
    ) {
      suspiciousActivities.push({
        type: "security_violations",
        licenseKey: licenseKey.substring(0, 8) + "****",
        violations: securityInfo.violations,
        clientIP,
        timestamp: Date.now(),
      });
    }

    // Update license last used
    license.lastUsed = Date.now();

    // Return success
    res.json({
      valid: true,
      licenseData: {
        type: license.type,
        status: license.status,
        activatedAt: license.activatedAt,
        expiresAt: license.expiresAt || null,
      },
    });
  } catch (error) {
    console.error("License validation error:", error);
    res.status(500).json({
      valid: false,
      error: "Internal server error",
    });
  }
});

// License activation endpoint (for new purchases)
app.post("/api/activate-license", licenseLimiter, async (req, res) => {
  try {
    const { licenseKey, hardwareId } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Check if license exists and is unactivated
    const { data: license, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("license_key", licenseKey)
      .single();

    if (error) {
      console.error("License retrieval error:", error);
      return res.status(500).json({
        success: false,
        error: "License not found",
      });
    }

    if (!license) {
      return res.status(404).json({
        success: false,
        error: "License not found",
      });
    }

    if (license.hardware_id && license.hardware_id !== hardwareId) {
      return res.status(409).json({
        success: false,
        error: "License already activated",
      });
    }

    // Update the activated license
    const { data: updatedLicense, error: updateError } = await supabase
      .from("licenses")
      .update({
        hardware_id: hardwareId,
        activated_at: new Date().toISOString(),
      })
      .eq("license_key", licenseKey)
      .select()
      .single();

    if (updateError) {
      return res.status(updateError.status || 500).json({
        success: false,
        error: updateError.message,
      });
    }

    // Log activation
    usageLog.push({
      licenseKey: licenseKey.substring(0, 8) + "****",
      hardwareId: hardwareId.substring(0, 8) + "****",
      clientIP,
      timestamp: Date.now(),
      action: "activate",
    });

    res.json({
      success: true,
      licenseData: {
        type: updatedLicense.license_type,
        activatedAt: updatedLicense.activated_at,
      },
    });
  } catch (error) {
    console.error("License activation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// License transfer endpoint
app.post("/api/transfer-license", licenseLimiter, async (req, res) => {
  try {
    const { licenseKey, newHardwareId, transferReason } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    const license = licenses.get(licenseKey);
    if (!license) {
      return res.status(404).json({
        success: false,
        error: "License not found",
      });
    }

    // Check transfer limits (e.g., max 3 transfers per license)
    const transferCount = license.transferCount || 0;
    if (transferCount >= 3) {
      return res.status(403).json({
        success: false,
        error: "Maximum transfers exceeded",
      });
    }

    // Update license
    license.hardwareId = newHardwareId;
    license.transferCount = transferCount + 1;
    license.lastTransfer = Date.now();
    license.transferReason = transferReason;

    // Log transfer
    usageLog.push({
      licenseKey: licenseKey.substring(0, 8) + "****",
      hardwareId: newHardwareId.substring(0, 8) + "****",
      clientIP,
      timestamp: Date.now(),
      action: "transfer",
      reason: transferReason,
    });

    res.json({
      success: true,
      transfersRemaining: 3 - license.transferCount,
    });
  } catch (error) {
    console.error("License transfer error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Analytics endpoint
app.post("/api/analytics", (req, res) => {
  try {
    const { events, sessionId, userId } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Store analytics (in production, use a proper analytics service)
    events.forEach((event) => {
      console.log("Analytics:", {
        ...event,
        sessionId,
        userId,
        clientIP,
        timestamp: Date.now(),
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ success: false });
  }
});

// Suspicious activity reporting
app.post("/api/report-suspicious-activity", (req, res) => {
  try {
    const activity = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    suspiciousActivities.push({
      ...activity,
      clientIP,
      reportedAt: Date.now(),
    });

    console.warn("Suspicious activity reported:", activity);

    res.json({ success: true });
  } catch (error) {
    console.error("Suspicious activity reporting error:", error);
    res.status(500).json({ success: false });
  }
});

// Admin endpoints (protected with API key in production)
app.get("/api/admin/licenses", (req, res) => {
  const licenseList = Array.from(licenses.values()).map((license) => ({
    ...license,
    key: license.key.substring(0, 8) + "****",
    hardwareId: license.hardwareId
      ? license.hardwareId.substring(0, 8) + "****"
      : null,
  }));

  res.json({
    licenses: licenseList,
    totalCount: licenses.size,
    activeCount: licenseList.filter((l) => l.status === "active").length,
  });
});

app.get("/api/admin/usage", (req, res) => {
  const recentUsage = usageLog.slice(-100); // Last 100 entries
  res.json({
    usage: recentUsage,
    totalRequests: usageLog.length,
  });
});

app.get("/api/admin/suspicious", (req, res) => {
  const recentActivities = suspiciousActivities.slice(-50); // Last 50 entries
  res.json({
    activities: recentActivities,
    totalCount: suspiciousActivities.length,
  });
});

// Update check endpoint
app.post("/api/check-updates", (req, res) => {
  const { currentVersion, platform } = req.body;

  // Mock update check (implement real logic)
  const latestVersion = "1.2.0";
  const hasUpdate = currentVersion !== latestVersion;

  res.json({
    hasUpdate,
    latestVersion: hasUpdate ? latestVersion : undefined,
    downloadUrl: hasUpdate
      ? `https://releases.example.com/v${latestVersion}/${platform}`
      : undefined,
    releaseNotes: hasUpdate ? "Bug fixes and security improvements" : undefined,
    critical: false,
  });
});

// Get subscription status
app.get("/api/subscription/:subscriptionId", async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await stripeClient.subscriptions.retrieve(
      subscriptionId
    );

    res.json({
      status: subscription.status,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error("Error retrieving subscription:", error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
app.post("/api/subscription/:subscriptionId/cancel", async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await stripeClient.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    res.json({
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
function calculateHardwareSimilarity(hardware1, hardware2) {
  if (hardware1 === hardware2) return 1.0;

  const common = hardware1
    .split("")
    .filter((char) => hardware2.includes(char)).length;
  const total = Math.max(hardware1.length, hardware2.length);

  return common / total;
}

// Error handling
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`License server running on port ${PORT}`);
  console.log("Demo license available: DEMO-1234-5678-9ABC");
});

export default app;
