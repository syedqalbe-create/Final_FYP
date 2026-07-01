const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_IMAGE = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\491678c9-1200-43c6-9e5b-19cae7f62157\\media__1782858784994.png';
const RES_DIR = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const SIZES = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

async function generateIcons() {
  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error('Source image not found:', SOURCE_IMAGE);
    return;
  }

  console.log('Generating Android icons...');

  for (const [density, size] of Object.entries(SIZES)) {
    const dir = path.join(RES_DIR, `mipmap-${density}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate square icon
    await sharp(SOURCE_IMAGE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(dir, 'ic_launcher.png'));

    // Generate round icon (same for now since image already has nice rounded corners)
    await sharp(SOURCE_IMAGE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    console.log(`✅ Generated ${density} icons (${size}x${size})`);
  }

  console.log('\n🎉 All icons generated successfully!');
  console.log('Please restart your app (and uninstall the old one if needed) to see the new icon!');
}

generateIcons().catch(console.error);
