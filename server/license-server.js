// License server for Local Password Vault
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "https://localpasswordvault.com",
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

// For regular routes
app.use(express.json());

// For Stripe webhook - needs raw body
app.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      // Verify the event came from Stripe
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Get customer email and product info
      const customerEmail = session.customer_details.email;
      const productId = session.metadata?.product_id;

  

      // Determine license type based on product
      let licenseType = "single";
      let quantity = 1;

      switch (productId) {
        case "prod_single_user":
          licenseType = "single";
          quantity = 1;
          break;
        case "prod_family_plan":
          licenseType = "family";
          quantity = 3;
          break;
        case "prod_pro_license":
          licenseType = "pro";
          quantity = 1;
          break;
        case "prod_business_plan":
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

      console.log(
        `Generated ${quantity} ${licenseType} license(s) for ${customerEmail}`
      );

      try {
        // In a real implementation, save to database
        // await saveLicensesToDatabase(licenses, customerEmail, licenseType, session.id);

        // In a real implementation, send email with license keys
        // await sendLicenseEmail(customerEmail, licenses, licenseType);

        // For now, just log the licenses
        console.log("Generated licenses:", licenses);
      } catch (error) {
        console.error("Error processing license:", error);
      }
    }

    res.json({ received: true });
  }
);

// License key generation function
function generateLicenseKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  // Generate 15 random characters
  for (let i = 0; i < 15; i++) {
    if (i > 0 && i % 4 === 0) {
      result += "-";
    }
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Add checksum
  let checksum = 0;
  const cleanKey = result.replace(/-/g, "");
  for (let i = 0; i < cleanKey.length; i++) {
    checksum += cleanKey.charCodeAt(i);
  }
  result += (checksum % 36).toString(36).toUpperCase();

  return result;
}

// Health check endpoint
app.get("/", (req, res) => {
  res.send("License server is running");
});

// Start server
app.listen(PORT, () => {
  console.log(`License server running on port ${PORT}`);
});

module.exports = app;
