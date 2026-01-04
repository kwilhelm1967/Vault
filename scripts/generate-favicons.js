const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const sourceImage = path.join(__dirname, '..', 'public', 'padlock-icon.png');
const publicDir = path.join(__dirname, '..', 'public');
const lpvDir = path.join(__dirname, '..', 'LPV');

async function generateFavicons() {
  try {
    // Check if source image exists
    if (!fs.existsSync(sourceImage)) {
      console.error(`Source image not found: ${sourceImage}`);
      process.exit(1);
    }

    console.log('Generating favicons from:', sourceImage);

    // Generate PNG buffers for ICO creation
    const png16 = await sharp(sourceImage)
      .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const png32 = await sharp(sourceImage)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Generate favicon.ico for public folder (multi-resolution)
    const icoBuffer = await toIco([png16, png32]);
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
    console.log('✓ Generated public/favicon.ico');

    // Generate favicon.ico for LPV folder (multi-resolution)
    fs.writeFileSync(path.join(lpvDir, 'favicon.ico'), icoBuffer);
    console.log('✓ Generated LPV/favicon.ico');

    // Generate favicon-16x16.png for LPV folder (use buffer we already created)
    fs.writeFileSync(path.join(lpvDir, 'favicon-16x16.png'), png16);
    console.log('✓ Generated LPV/favicon-16x16.png');

    // Generate favicon-32x32.png for LPV folder (use buffer we already created)
    fs.writeFileSync(path.join(lpvDir, 'favicon-32x32.png'), png32);
    console.log('✓ Generated LPV/favicon-32x32.png');

    // Generate apple-touch-icon.png (180x180) for LPV folder
    await sharp(sourceImage)
      .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(lpvDir, 'apple-touch-icon.png'));

    console.log('✓ Generated LPV/apple-touch-icon.png');

    // Also generate android-chrome icons for LPV folder
    await sharp(sourceImage)
      .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(lpvDir, 'android-chrome-192x192.png'));

    console.log('✓ Generated LPV/android-chrome-192x192.png');

    await sharp(sourceImage)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(lpvDir, 'android-chrome-512x512.png'));

    console.log('✓ Generated LPV/android-chrome-512x512.png');

    console.log('\n✅ All favicons generated successfully!');
  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
