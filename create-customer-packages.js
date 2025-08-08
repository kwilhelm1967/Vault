// Customer Package Creator
// Run this script to generate ZIP files for each customer tier

const PackageGenerator = require('./server-api-examples/zip-generator');
const fs = require('fs');
const path = require('path');

async function createAllPackages() {
  const generator = new PackageGenerator();
  const outputDir = './customer-packages-ready';
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('🔐 Creating Local Password Vault Customer Packages...\n');
  
  try {
    // Create Single User package
    console.log('📦 Creating Single User package...');
    const singleUser = await generator.generatePackage('single-user', outputDir);
    console.log(`✅ Created: ${singleUser.fileName} (${(singleUser.size / 1024 / 1024).toFixed(2)} MB)\n`);
    
    // Create Family Plan package
    console.log('📦 Creating Family Plan package...');
    const familyPlan = await generator.generatePackage('family-plan', outputDir);
    console.log(`✅ Created: ${familyPlan.fileName} (${(familyPlan.size / 1024 / 1024).toFixed(2)} MB)\n`);
    
    // Create Pro package
    console.log('📦 Creating Pro package...');
    const pro = await generator.generatePackage('pro', outputDir);
    console.log(`✅ Created: ${pro.fileName} (${(pro.size / 1024 / 1024).toFixed(2)} MB)\n`);
    
    // Create Business Plan package
    console.log('📦 Creating Business Plan package...');
    const business = await generator.generatePackage('business-plan', outputDir);
    console.log(`✅ Created: ${business.fileName} (${(business.size / 1024 / 1024).toFixed(2)} MB)\n`);
    
    console.log('🎉 All customer packages created successfully!\n');
    console.log('📊 Package Summary:');
    console.log('==================');
    console.log(`Single User: ${singleUser.fileName} - ${(singleUser.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Family Plan: ${familyPlan.fileName} - ${(familyPlan.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Pro: ${pro.fileName} - ${(pro.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Business: ${business.fileName} - ${(business.size / 1024 / 1024).toFixed(2)} MB\n`);
    
    console.log('📁 Files created in: ./customer-packages-ready/');
    console.log('🚀 Ready for customer distribution!');
    
  } catch (error) {
    console.error('❌ Error creating packages:', error);
  }
}

// Run the package creation
createAllPackages();