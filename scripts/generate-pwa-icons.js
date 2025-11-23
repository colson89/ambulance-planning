import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, '../client/public/icons');
const svgPath = path.join(iconDir, 'icon.svg');

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  const svgBuffer = fs.readFileSync(svgPath);
  
  for (const size of sizes) {
    const outputPath = path.join(iconDir, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✓ Generated ${size}x${size} icon`);
  }
  
  console.log('✓ All PWA icons generated successfully!');
}

generateIcons().catch(console.error);
