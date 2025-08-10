#!/bin/bash

# Local Password Vault - Customer Package Creator
# This script creates ZIP packages for each license tier

echo "🔐 Creating Local Password Vault Customer Packages..."

# Create base directories
mkdir -p dist-packages

# Function to create a package
create_package() {
    local tier=$1
    local display_name=$2
    
    echo "📦 Creating $display_name package..."
    
    # Create temporary directory
    mkdir -p "temp-$tier"
    
    # Copy tier-specific files
    cp -r "customer-packages/$tier/"* "temp-$tier/"
    
    # Copy common files
    cp README.md "temp-$tier/PROJECT_README.md"
    cp package.json "temp-$tier/"
    cp vite.config.ts "temp-$tier/"
    cp tailwind.config.js "temp-$tier/"
    cp tsconfig.json "temp-$tier/"
    cp tsconfig.app.json "temp-$tier/"
    cp tsconfig.node.json "temp-$tier/"
    cp eslint.config.js "temp-$tier/"
    cp postcss.config.js "temp-$tier/"
    
    # Copy source code
    cp -r src "temp-$tier/"
    cp -r public "temp-$tier/"
    cp index.html "temp-$tier/"
    
    # Copy electron files
    cp -r electron "temp-$tier/"
    cp electron-builder.json "temp-$tier/"
    
    # Copy license generator
    cp -r license-generator "temp-$tier/"
    
    # Copy business documentation
    cp BUSINESS_PLAN.txt "temp-$tier/"
    cp MARKETING_STRATEGY.txt "temp-$tier/"
    cp BUILD_DISTRIBUTION_GUIDE.txt "temp-$tier/"
    cp CUSTOMER_DISTRIBUTION_GUIDE.txt "temp-$tier/"
    cp LICENSE_KEY_MANAGEMENT_GUIDE.txt "temp-$tier/"
    
    # Create the ZIP package
    cd "temp-$tier"
    zip -r "../dist-packages/LocalPasswordVault-$tier.zip" . -x "*.DS_Store" "node_modules/*" ".git/*"
    cd ..
    
    # Clean up
    rm -rf "temp-$tier"
    
    echo "✅ $display_name package created: dist-packages/LocalPasswordVault-$tier.zip"
}

# Create packages for each tier
create_package "single-user" "Single User"
create_package "family-plan" "Family Plan"
create_package "pro" "Pro"
create_package "business-plan" "Business Plan"

# Create a complete package with all tiers
echo "📦 Creating Complete Package with all tiers..."
mkdir -p temp-complete

# Copy all tier packages
cp -r customer-packages/* temp-complete/

# Copy all project files
cp README.md temp-complete/PROJECT_README.md
cp package.json temp-complete/
cp vite.config.ts temp-complete/
cp tailwind.config.js temp-complete/
cp tsconfig.json temp-complete/
cp tsconfig.app.json temp-complete/
cp tsconfig.node.json temp-complete/
cp eslint.config.js temp-complete/
cp postcss.config.js temp-complete/

# Copy source code
cp -r src temp-complete/
cp -r public temp-complete/
cp index.html temp-complete/

# Copy electron files
cp -r electron temp-complete/
cp electron-builder.json temp-complete/

# Copy license generator and server examples
cp -r license-generator temp-complete/
cp -r server-api-examples temp-complete/

# Copy all business documentation
cp BUSINESS_PLAN.txt temp-complete/
cp MARKETING_STRATEGY.txt temp-complete/
cp BUILD_DISTRIBUTION_GUIDE.txt temp-complete/
cp CUSTOMER_DISTRIBUTION_GUIDE.txt temp-complete/
cp LICENSE_KEY_MANAGEMENT_GUIDE.txt temp-complete/
cp TESTING_INSTRUCTIONS.txt temp-complete/
cp WHITE_LABEL_GUIDE.txt temp-complete/

# Create complete package
cd temp-complete
zip -r "../dist-packages/LocalPasswordVault-Complete.zip" . -x "*.DS_Store" "node_modules/*" ".git/*"
cd ..

# Clean up
rm -rf temp-complete

echo "✅ Complete package created: dist-packages/LocalPasswordVault-Complete.zip"

# Display package information
echo ""
echo "📊 Package Summary:"
echo "==================="
ls -lh dist-packages/

echo ""
echo "🎉 All customer packages created successfully!"
echo ""
echo "Package Contents:"
echo "- LocalPasswordVault-single-user.zip: Single User license package"
echo "- LocalPasswordVault-family-plan.zip: Family Plan license package"  
echo "- LocalPasswordVault-pro.zip: Pro license package"
echo "- LocalPasswordVault-business-plan.zip: Business Plan license package"
echo "- LocalPasswordVault-Complete.zip: Complete package with all tiers"
echo ""
echo "Each package includes:"
echo "- Complete source code"
echo "- Installation guides"
echo "- License documentation"
echo "- Business resources"
echo "- License generator tools"
echo ""
echo "Ready for customer distribution! 🚀"