#!/bin/bash
# Code Signing Certificate Setup Script for macOS/Linux
# This script helps set up code signing certificates

echo "========================================"
echo "Code Signing Certificate Setup"
echo "========================================"
echo ""

# Check if certs directory exists
if [ ! -d "certs" ]; then
    echo "Creating certs directory..."
    mkdir -p certs
    echo "✓ Created certs directory"
fi

echo ""
echo "STEP 1: Download Certificate from SSL.com"
echo "----------------------------------------"
echo "1. Go to: https://www.ssl.com/account/"
echo "2. Navigate to: My Certificates → Code Signing Certificates"
echo "3. Download certificate as PKCS#12 (.pfx) format"
echo "4. Save the password provided by SSL.com"
echo ""
read -p "Press Enter when you have downloaded the certificate file"

echo ""
echo "STEP 2: Place Certificate File"
echo "----------------------------------------"
read -p "Enter the path to your downloaded .pfx certificate file: " certPath

# Clean up path (remove quotes if present)
certPath=$(echo "$certPath" | sed 's/^"//;s/"$//')

# Check if file exists
if [ ! -f "$certPath" ]; then
    echo "❌ Error: Certificate file not found at: $certPath"
    echo "Please check the path and try again."
    exit 1
fi

# Get filename
fileName=$(basename "$certPath")

# Copy to certs directory
targetPath="certs/$fileName"
echo ""
echo "Copying certificate to certs directory..."
cp "$certPath" "$targetPath"
echo "✓ Certificate copied to: $targetPath"

echo ""
echo "STEP 3: Certificate Password"
echo "----------------------------------------"
read -sp "Enter the certificate password from SSL.com: " certPassword
echo ""

echo ""
echo "STEP 4: Create .env File"
echo "----------------------------------------"

# Check if .env exists
if [ -f ".env" ]; then
    echo "⚠ .env file already exists"
    read -p "Do you want to add code signing config? (y/n): " overwrite
    if [ "$overwrite" = "y" ] || [ "$overwrite" = "Y" ]; then
        # Check if code signing already exists
        if grep -q "CSC_LINK" .env; then
            echo "⚠ Code signing config already exists in .env"
            read -p "Replace existing code signing config? (y/n): " replace
            if [ "$replace" = "y" ] || [ "$replace" = "Y" ]; then
                # Remove old code signing lines
                sed -i.bak '/^CSC_LINK=/d' .env
                sed -i.bak '/^CSC_KEY_PASSWORD=/d' .env
            else
                echo "Keeping existing configuration."
                exit 0
            fi
        fi
        # Add new code signing config
        echo "" >> .env
        echo "# Windows Code Signing (SSL.com)" >> .env
        echo "CSC_LINK=certs/$fileName" >> .env
        echo "CSC_KEY_PASSWORD=$certPassword" >> .env
        echo "✓ Added code signing config to .env"
    fi
else
    # Create new .env file
    cat > .env << EOF
# Windows Code Signing (SSL.com)
CSC_LINK=certs/$fileName
CSC_KEY_PASSWORD=$certPassword
EOF
    echo "✓ Created .env file with code signing config"
fi

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Test code signing: npm run dist:win"
echo "2. Verify signature: Check installer Properties → Digital Signatures"
echo ""
echo "Certificate location: $targetPath"
echo "✓ Certificate is in .gitignore (won't be committed)"
echo ""

