// License Key Generation API Examples
// Use these examples to integrate license generation with your payment system

// ============================================================================
// 1. STRIPE INTEGRATION EXAMPLE
// ============================================================================

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

// License key generation function (same as frontend)
function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    // Generate 15 random characters
    for (let i = 0; i < 15; i++) {
        if (i > 0 && i % 4 === 0) {
            result += '-';
        }
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Add checksum
    let checksum = 0;
    const cleanKey = result.replace(/-/g, '');
    for (let i = 0; i < cleanKey.length; i++) {
        checksum += cleanKey.charCodeAt(i);
    }
    result += (checksum % 36).toString(36).toUpperCase();
    
    return result;
}

// Validate license key
function validateLicenseKey(licenseKey) {
    const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!pattern.test(licenseKey)) {
        return false;
    }
    
    const cleanKey = licenseKey.replace(/-/g, '');
    let checksum = 0;
    for (let i = 0; i < cleanKey.length - 1; i++) {
        checksum += cleanKey.charCodeAt(i);
    }
    const expectedChecksum = (checksum % 36).toString(36).toUpperCase();
    return cleanKey[cleanKey.length - 1] === expectedChecksum;
}

// Email configuration
const transporter = nodemailer.createTransporter({
    service: 'gmail', // or your email service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Stripe webhook handler
app.post('/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.log(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const customerEmail = session.customer_details.email;
        const productId = session.metadata.product_id;
        
        // Determine license type and quantity
        let licenseType = 'pro';
        let quantity = 1;
        
        switch (productId) {
            case 'price_pro_license':
                licenseType = 'pro';
                quantity = 1;
                break;
            case 'price_family_pack':
                licenseType = 'family';
                quantity = 3;
                break;
            case 'price_business_license':
                licenseType = 'business';
                quantity = 10;
                break;
        }
        
        // Generate license keys
        const licenses = [];
        for (let i = 0; i < quantity; i++) {
            const licenseKey = generateLicenseKey();
            licenses.push({
                key: licenseKey,
                type: licenseType,
                email: customerEmail,
                createdAt: new Date(),
                status: 'active',
                orderId: session.id
            });
        }
        
        // Save to database (replace with your database logic)
        await saveLicensesToDatabase(licenses);
        
        // Send email with license keys
        await sendLicenseEmail(customerEmail, licenses, licenseType);
        
        console.log(`Generated ${quantity} ${licenseType} license(s) for ${customerEmail}`);
    }

    res.json({received: true});
});

// Save licenses to database
async function saveLicensesToDatabase(licenses) {
    // Replace with your database implementation
    // Example with MongoDB:
    /*
    const License = require('./models/License');
    await License.insertMany(licenses);
    */
    
    // Example with PostgreSQL:
    /*
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    for (const license of licenses) {
        await pool.query(
            'INSERT INTO licenses (key, type, email, created_at, status, order_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [license.key, license.type, license.email, license.createdAt, license.status, license.orderId]
        );
    }
    */
    
    console.log('Licenses saved to database:', licenses);
}

// Send license email
async function sendLicenseEmail(email, licenses, licenseType) {
    const licenseKeys = licenses.map(l => l.key).join('\n');
    
    const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .license-key { background: #1e293b; color: #06b6d4; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 18px; text-align: center; margin: 10px 0; letter-spacing: 2px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Your Local Password Vault License</h1>
            <p>Thank you for your purchase!</p>
        </div>
        <div class="content">
            <h2>License Details</h2>
            <p><strong>License Type:</strong> ${licenseType.toUpperCase()}</p>
            <p><strong>Number of Licenses:</strong> ${licenses.length}</p>
            
            <h3>Your License Key${licenses.length > 1 ? 's' : ''}:</h3>
            ${licenses.map(license => `<div class="license-key">${license.key}</div>`).join('')}
            
            <h3>How to Activate:</h3>
            <ol>
                <li>Download and install the Password Vault application</li>
                <li>Launch the application</li>
                <li>Enter your license key when prompted</li>
                <li>Enjoy unlimited password storage and premium features!</li>
            </ol>
            
            <a href="https://LocalPasswordvault.com/download" class="button">Download Password Vault</a>
            
            <h3>Important Notes:</h3>
            <ul>
                <li>Each license is tied to one device for security</li>
                <li>Keep your license key safe - you'll need it if you reinstall</li>
                <li>Contact support if you need to transfer to a new device</li>
            </ul>
        </div>
        <div class="footer">
            <p>Need help? Contact us at support@LocalPasswordvault.com</p>
            <p>© 2025 Local Password Vault. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Your Password Vault ${licenseType.toUpperCase()} License Key`,
        html: emailTemplate
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`License email sent to ${email}`);
    } catch (error) {
        console.error('Failed to send license email:', error);
    }
}

// ============================================================================
// 2. PAYPAL INTEGRATION EXAMPLE
// ============================================================================

const paypal = require('@paypal/checkout-server-sdk');

// PayPal environment setup
const environment = process.env.NODE_ENV === 'production' 
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);

const client = new paypal.core.PayPalHttpClient(environment);

// PayPal webhook handler
app.post('/webhook/paypal', express.json(), async (req, res) => {
    const event = req.body;
    
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const capture = event.resource;
        const customId = capture.custom_id; // Contains product info
        const payerEmail = capture.payer.email_address;
        
        // Parse product info from custom_id
        const [productType, quantity] = customId.split('_');
        
        // Generate licenses
        const licenses = [];
        for (let i = 0; i < parseInt(quantity); i++) {
            licenses.push({
                key: generateLicenseKey(),
                type: productType,
                email: payerEmail,
                createdAt: new Date(),
                status: 'active',
                paymentId: capture.id
            });
        }
        
        await saveLicensesToDatabase(licenses);
        await sendLicenseEmail(payerEmail, licenses, productType);
    }
    
    res.status(200).send('OK');
});

// ============================================================================
// 3. MANUAL LICENSE GENERATION (for direct sales)
// ============================================================================

app.post('/api/generate-license', async (req, res) => {
    const { type, quantity, email, notes } = req.body;
    
    // Validate input
    if (!type || !quantity || quantity < 1 || quantity > 100) {
        return res.status(400).json({ error: 'Invalid input parameters' });
    }
    
    try {
        const licenses = [];
        for (let i = 0; i < quantity; i++) {
            licenses.push({
                key: generateLicenseKey(),
                type: type,
                email: email || '',
                notes: notes || '',
                createdAt: new Date(),
                status: 'active'
            });
        }
        
        await saveLicensesToDatabase(licenses);
        
        if (email) {
            await sendLicenseEmail(email, licenses, type);
        }
        
        res.json({ 
            success: true, 
            licenses: licenses.map(l => l.key),
            message: `Generated ${quantity} ${type} license(s)`
        });
        
    } catch (error) {
        console.error('License generation failed:', error);
        res.status(500).json({ error: 'License generation failed' });
    }
});

// ============================================================================
// 4. LICENSE VALIDATION API (optional - for server-side validation)
// ============================================================================

app.post('/api/validate-license', async (req, res) => {
    const { licenseKey, hardwareId } = req.body;
    
    if (!validateLicenseKey(licenseKey)) {
        return res.json({ valid: false, error: 'Invalid license key format' });
    }
    
    try {
        // Check database for license
        const license = await getLicenseFromDatabase(licenseKey);
        
        if (!license) {
            return res.json({ valid: false, error: 'License not found' });
        }
        
        if (license.status !== 'active') {
            return res.json({ valid: false, error: 'License is not active' });
        }
        
        // Check hardware binding
        if (license.hardwareId && license.hardwareId !== hardwareId) {
            return res.json({ valid: false, error: 'License is bound to another device' });
        }
        
        // Bind to hardware if first use
        if (!license.hardwareId) {
            await updateLicenseHardwareId(licenseKey, hardwareId);
        }
        
        res.json({ 
            valid: true, 
            type: license.type,
            features: getLicenseFeatures(license.type)
        });
        
    } catch (error) {
        console.error('License validation failed:', error);
        res.status(500).json({ valid: false, error: 'Validation failed' });
    }
});

function getLicenseFeatures(licenseType) {
    const features = {
        pro: {
            maxEntries: -1,
            canExport: true,
            canImport: true,
            hasFloatingPanel: true
        },
        family: {
            maxEntries: -1,
            canExport: true,
            canImport: true,
            hasFloatingPanel: true,
            maxDevices: 3
        },
        business: {
            maxEntries: -1,
            canExport: true,
            canImport: true,
            hasFloatingPanel: true,
            maxDevices: 10,
            hasAdvancedSecurity: true
        }
    };
    
    return features[licenseType] || features.pro;
}

// ============================================================================
// 5. ENVIRONMENT VARIABLES SETUP
// ============================================================================

/*
Create a .env file with these variables:

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Email
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Database
DATABASE_URL=postgresql://user:pass@localhost/dbname

# App
NODE_ENV=development
PORT=3000
*/

module.exports = {
    generateLicenseKey,
    validateLicenseKey,
    saveLicensesToDatabase,
    sendLicenseEmail
};