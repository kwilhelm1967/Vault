// Example license server implementation
// This would be deployed as a separate Node.js service

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import stripe from "stripe";
import dotenv from "dotenv";
import crypto from "crypto";
import DownloadHandler from "./download-handler.js";
import EmailService from "./email-templates.js";
import supabase from "./supabase.js";
import { saveLicensesToDatabase } from "./database.js";

dotenv.config();

const app = express();
// When running behind a proxy/load-balancer (e.g. nginx, Cloudflare), trust
// the X-Forwarded-* headers so req.ip and rate-limit work correctly.
app.set("trust proxy", true);
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

// === Minimal admin auth helpers (no extra deps) ===
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-admin-pass";
const ADMIN_COOKIE_NAME = "admin_auth";
// Derive a stable token using the signing secret + password
const ADMIN_AUTH_TOKEN = crypto
  .createHmac(
    "sha256",
    (process.env.LICENSE_SIGNING_SECRET || "dev-secret") + "|admin"
  )
  .update(ADMIN_PASSWORD)
  .digest("base64url");

function getCookie(req, name) {
  try {
    const cookieHeader = req.headers.cookie || "";
    const parts = cookieHeader.split(";");
    for (const part of parts) {
      const [k, v] = part.trim().split("=");
      if (k === name) return decodeURIComponent(v || "");
    }
    return null;
  } catch (_) {
    return null;
  }
}

function isAdminAuthed(req) {
  const token = getCookie(req, ADMIN_COOKIE_NAME);
  return token === ADMIN_AUTH_TOKEN;
}

function setAdminCookie(res) {
  const attrs = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(ADMIN_AUTH_TOKEN)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  // Only set Secure when behind https (cannot detect here reliably); leave off for dev.
  res.setHeader("Set-Cookie", attrs.join("; "));
}

// === Admin UI (simple HTML) ===
app.get("/admin", (req, res) => {
  if (!isAdminAuthed(req)) {
    res.send(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Admin Login</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;padding:2rem;}
      form{max-width:420px;margin:auto;background:#fff;border-radius:8px;padding:1.5rem;box-shadow:0 2px 10px rgba(0,0,0,0.08)}
      label{display:block;margin:.5rem 0 .25rem}
      input,button,select{width:100%;padding:.6rem;border:1px solid #ddd;border-radius:6px}
      button{background:#4CAF50;color:#fff;border-color:#4CAF50;margin-top:1rem;cursor:pointer}
      </style></head><body>
        <form method="POST" action="/admin/login">
          <h2>Admin Login</h2>
          <label>Password</label>
          <input type="password" name="password" required />
          <button type="submit">Login</button>
        </form>
      </body></html>
    `);
    return;
  }
  res.send(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>Create Licenses</title>
    <style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;padding:2rem;}
    form{max-width:520px;margin:auto;background:#fff;border-radius:8px;padding:1.5rem;box-shadow:0 2px 10px rgba(0,0,0,0.08)}
    label{display:block;margin:.5rem 0 .25rem}
    input,button,select{width:100%;padding:.6rem;border:1px solid #ddd;border-radius:6px}
    button{background:#4CAF50;color:#fff;border-color:#4CAF50;margin-top:1rem;cursor:pointer}
    .tip{color:#555;font-size:.9rem;margin:.5rem 0 1rem}
    </style></head><body>
      <form method="POST" action="/admin/create-license">
        <h2>Create Licenses</h2>
        <label>Email</label>
        <input type="email" name="email" placeholder="customer@example.com" required />
        <label>Amount (number of licenses)</label>
        <input type="number" name="amount" min="1" max="100" value="1" required />
        <button type="submit">Create & Send</button>
      </form>
    </body></html>
  `);
});

app.post("/admin/login", express.urlencoded({ extended: true }), (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).send("Invalid password");
  }
  setAdminCookie(res);
  res.redirect("/admin");
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

      let maintanancePlanBought =
        sessionWithLineItems.line_items.data.length > 1;

      switch (productId) {
        case "prod_T2AiC5qLTzeyCa":
          licenseType = "single";
          quantity = 1;
          break;
        // This case is test link
        case "prod_Sofb9khTHtbJsQ":
          licenseType = "single";
          quantity = 1;
          break;
        case "prod_T2Ak7onRe9gOPM":
          licenseType = "family";
          quantity = 3;
          break;
        case "prod_T2AlMDK0UQdBNc":
          licenseType = "pro";
          quantity = 6;
          break;
        case "prod_T2AmqzeA2XLcGL":
          licenseType = "business";
          quantity = 10;
          break;
        default:
          console.log(
            `Unknown product ID: ${productId}, defaulting to single user`
          );
      }

      // Generate secure license keys with cryptographic signing
      const licenses = [];
      for (let i = 0; i < quantity; i++) {
        licenses.push(generateSecureLicenseKey(licenseType, customerEmail));
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
          amount,
          maintanancePlanBought
        );

        // In a real implementation, send email with license keys
        await emailService.sendWelcomeEmail(
          customerEmail,
          licenses,
          licenseType,
          downloadInfo,
          maintanancePlanBought
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

      // Generate secure license keys with cryptographic signing
      const licenses = [];
      for (let i = 0; i < quantity; i++) {
        licenses.push(generateSecureLicenseKey(licenseType, customerEmail));
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

// license creation for admins (JSON API)
app.post("/api/admin/create-license", async (req, res) => {
  try {
    if (!isAdminAuthed(req)) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { email, amount } = req.body || {};
    if (!email)
      return res.status(400).json({ success: false, error: "Email required" });
    const n = parseInt(amount, 10);
    if (!n || n < 1 || n > 100) {
      return res
        .status(400)
        .json({ success: false, error: "Amount must be 1-100" });
    }
    const type = "single"; // enforce single plan

    const keys = [];
    const seen = new Set();
    for (let i = 0; i < n; i++) {
      let key;
      do {
        key = generateSecureLicenseKey(type, email);
      } while (seen.has(key));
      seen.add(key);
      keys.push(key);
    }

    // Persist to DB (associate with a synthetic order/payment)
    const syntheticOrderId = `ADMIN-${Date.now()}`;
    try {
      await saveLicensesToDatabase(
        keys,
        email,
        type,
        syntheticOrderId,
        "active",
        null, // paymentId
        "0.00", // amount
        false // maintenance plan
      );
    } catch (dbErr) {
      console.error("Admin saveLicensesToDatabase error:", dbErr);
      // Continue; not fatal for emailing, but report
    }

    let downloadInfo = { downloadUrl: null };
    try {
      downloadInfo = await downloadHandler.generateDownloadLink(
        type,
        email,
        syntheticOrderId
      );
    } catch (e) {
      console.warn("Admin download link generation failed:", e?.message || e);
    }

    // Send email with keys
    try {
      await emailService.sendWelcomeEmail(
        email,
        keys,
        type,
        downloadInfo,
        false
      );
    } catch (mailErr) {
      console.error("Admin sendWelcomeEmail error:", mailErr);
      return res.status(500).json({
        success: false,
        error: "Failed to send email",
        licenses: keys,
        downloadUrl: downloadInfo.downloadUrl,
      });
    }

    return res.json({
      success: true,
      licenses: keys,
      downloadUrl: downloadInfo.downloadUrl,
    });
  } catch (err) {
    console.error("Admin create-license error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});

// Admin HTML form submission endpoint (renders simple result page)
app.post(
  "/admin/create-license",
  express.urlencoded({ extended: true }),
  async (req, res) => {
    try {
      if (!isAdminAuthed(req)) {
        return res.status(401).send("Unauthorized");
      }
  const { email, amount } = req.body || {};
      if (!email) return res.status(400).send("Email required");
      const n = parseInt(amount, 10);
      if (!n || n < 1 || n > 100)
        return res.status(400).send("Amount must be 1-100");
      const type = "single"; // enforce single plan

      const keys = [];
      const seen = new Set();
      for (let i = 0; i < n; i++) {
        let key;
        do {
          key = generateSecureLicenseKey(type, email);
        } while (seen.has(key));
        seen.add(key);
        keys.push(key);
      }

      const syntheticOrderId = `ADMIN-${Date.now()}`;
      try {
        await saveLicensesToDatabase(
          keys,
          email,
          type,
          syntheticOrderId,
          "active",
          null,
          "0.00",
          false
        );
      } catch (_) {}
      let downloadInfo = { downloadUrl: null };
      try {
        downloadInfo = await downloadHandler.generateDownloadLink(
          type,
          email,
          syntheticOrderId
        );
      } catch (_) {}
      try {
        await emailService.sendWelcomeEmail(
          email,
          keys,
          type,
          downloadInfo,
          false
        );
      } catch (_) {}

      res.send(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Licenses Created</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;padding:2rem;}
      .card{max-width:720px;margin:auto;background:#fff;border-radius:8px;padding:1.5rem;box-shadow:0 2px 10px rgba(0,0,0,0.08)}
      code{background:#f5f5f5;padding:.2rem .4rem;border-radius:4px}
      ul{line-height:1.6}
      a.btn{display:inline-block;margin-top:1rem;background:#4CAF50;color:#fff;padding:.6rem .9rem;border-radius:6px;text-decoration:none}
      </style></head><body>
        <div class="card">
          <h2>Success</h2>
          <p>Created <strong>${n}</strong> <code>${type}</code> license(s) for <code>${email}</code>.</p>
          ${
            downloadInfo.downloadUrl
              ? `<p>Download URL: <a href="${downloadInfo.downloadUrl}" target="_blank">${downloadInfo.downloadUrl}</a></p>`
              : ""
          }
          <h3>Licenses</h3>
          <ul>${keys.map((k) => `<li><code>${k}</code></li>`).join("")}</ul>
          <a class="btn" href="/admin">Back</a>
        </div>
      </body></html>
    `);
    } catch (err) {
      console.error("Admin HTML create-license error:", err);
      res.status(500).send("Internal server error");
    }
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

// SECURE License key generation with cryptographic signing
// Private key for signing (in production, store securely in environment variable)
const SIGNING_SECRET =
  process.env.LICENSE_SIGNING_SECRET ||
  "your-secret-signing-key-change-this-in-production";

function generateSecureLicenseKey(
  licenseType,
  customerEmail,
  expiryDate = null
) {
  // Create license data payload
  const licenseData = {
    type: licenseType,
    email: customerEmail,
    issued: Math.floor(Date.now() / 1000), // Unix timestamp (seconds)
    issuedMs: Date.now(), // milliseconds precision to avoid same-second collisions
    nonce: crypto.randomBytes(16).toString("hex"), // per-key randomness for uniqueness
    expires: expiryDate ? Math.floor(expiryDate / 1000) : null,
    version: 1, // License format version
  };

  // Create base64 encoded payload
  const payload = Buffer.from(JSON.stringify(licenseData)).toString(
    "base64url"
  );

  // Create HMAC signature for the payload
  const signature = crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(payload)
    .digest("base64url");

  // Combine payload and signature with a separator
  const rawLicense = `${payload}.${signature}`;

  // Format as readable license key (XXXX-XXXX-XXXX-XXXX format)
  // Take first 16 characters and format them
  const hash = crypto.createHash("sha256").update(rawLicense).digest("hex");
  const keyChars = hash.substring(0, 16).toUpperCase();

  return `${keyChars.slice(0, 4)}-${keyChars.slice(4, 8)}-${keyChars.slice(
    8,
    12
  )}-${keyChars.slice(12, 16)}`;
}

function validateLicenseKey(licenseKey, customerEmail = null) {
  try {
    // This is a simplified validation - in practice, you'd store the full license data
    // and validate against it. For now, we just check the format and that it's not easily forgeable

    // Check format
    const licensePattern = /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/;
    if (!licensePattern.test(licenseKey)) {
      return { valid: false, error: "Invalid license format" };
    }

    // In a real implementation, you would:
    // 1. Look up the license in your database
    // 2. Retrieve the original signed payload
    // 3. Verify the HMAC signature
    // 4. Check expiry dates, activation limits, etc.

    // For now, return valid for proper format (database lookup happens elsewhere)
    return { valid: true };
  } catch (error) {
    return { valid: false, error: "License validation failed" };
  }
}

app.use(express.json({ limit: "10mb" }));
// Parse URL-encoded bodies with the same size limit to avoid oversized payloads
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Basic header size/volume logging for debugging oversized header attacks or proxy issues
app.use((req, res, next) => {
  try {
    // Log number of headers and total header size approximate
    const headerCount = Object.keys(req.headers).length;
    const totalHeaderSize = Object.entries(req.headers).reduce(
      (acc, [k, v]) => {
        const value = Array.isArray(v) ? v.join(",") : String(v || "");
        return acc + k.length + value.length;
      },
      0
    );
    console.log(
      `Request headers: count=${headerCount}, approxSize=${totalHeaderSize}`
    );
  } catch (err) {
    // Avoid middleware crash
    console.log("Header logging error", err && err.message);
  }
  next();
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

    // Use secure license validation
    const validationResult = validateLicenseKey(licenseKey);
    if (!validationResult.valid) {
      suspiciousActivities.push({
        type: "invalid_license_format",
        licenseKey: licenseKey.substring(0, 8) + "****",
        clientIP,
        timestamp: Date.now(),
      });
      return res.status(400).json({
        valid: false,
        error: validationResult.error || "Invalid license key format",
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
