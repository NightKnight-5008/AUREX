#!/usr/bin/env node

/**
 * Generate Placeholder Icons for AUREX Desktop App
 * 
 * This script creates simple placeholder PNG icons that can be used
 * for development and testing. For production, replace with proper
 * professionally-designed icons.
 * 
 * Requirements:
 * - Node.js
 * - sharp package: npm install sharp
 * 
 * Usage:
 * node generate-placeholder-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Error: sharp package is not installed');
  console.error('Please install it with: npm install sharp');
  console.error('Or use the SVG files with online conversion tools (see ICON_GENERATION.md)');
  process.exit(1);
}

const buildResourcesDir = __dirname;

async function generateIcons() {
  console.log('🎨 Generating placeholder icons for AUREX Desktop App...\n');

  try {
    // Read the SVG files
    const iconSvgPath = path.join(buildResourcesDir, 'icon.svg');
    const trayIconSvgPath = path.join(buildResourcesDir, 'tray-icon.svg');

    if (!fs.existsSync(iconSvgPath)) {
      throw new Error('icon.svg not found in build-resources directory');
    }
    if (!fs.existsSync(trayIconSvgPath)) {
      throw new Error('tray-icon.svg not found in build-resources directory');
    }

    // Generate icon.png (512x512 for Linux)
    console.log('📦 Generating icon.png (512x512)...');
    await sharp(iconSvgPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(buildResourcesDir, 'icon.png'));
    console.log('✅ Created icon.png');

    // Generate tray-icon.png (64x64)
    console.log('📦 Generating tray-icon.png (64x64)...');
    await sharp(trayIconSvgPath)
      .resize(64, 64)
      .png()
      .toFile(path.join(buildResourcesDir, 'tray-icon.png'));
    console.log('✅ Created tray-icon.png');

    // Generate icon.ico (Windows) - multiple sizes
    console.log('📦 Generating icon.ico (256x256)...');
    await sharp(iconSvgPath)
      .resize(256, 256)
      .png()
      .toFile(path.join(buildResourcesDir, 'icon-256.png'));
    
    // Note: Converting PNG to ICO requires additional tools
    // electron-builder will handle this automatically if icon.png is provided
    console.log('ℹ️  For icon.ico: electron-builder will generate it from icon.png');
    console.log('   Or use online tools to convert icon.svg to icon.ico');

    // Generate icon.icns (macOS) - requires additional tools
    console.log('📦 Generating high-res PNG for macOS...');
    await sharp(iconSvgPath)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(buildResourcesDir, 'icon-1024.png'));
    console.log('ℹ️  For icon.icns: Use png2icns or online tools to convert icon-1024.png');
    console.log('   Or electron-builder will generate it from icon.png');

    console.log('\n✨ Icon generation complete!\n');
    console.log('Generated files:');
    console.log('  ✅ icon.png (512x512) - Linux application icon');
    console.log('  ✅ tray-icon.png (64x64) - System tray icon');
    console.log('  ✅ icon-256.png (256x256) - Intermediate for Windows');
    console.log('  ✅ icon-1024.png (1024x1024) - Intermediate for macOS');
    console.log('\nNext steps:');
    console.log('  1. For production, generate icon.ico and icon.icns using:');
    console.log('     - Online tools (see ICON_GENERATION.md)');
    console.log('     - Or let electron-builder generate them automatically');
    console.log('  2. Test the icons by running: npm run desktop:package');
    console.log('  3. Replace with professionally-designed icons before release');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    console.error('\nFallback options:');
    console.error('  1. Use online SVG to PNG/ICO/ICNS converters (see ICON_GENERATION.md)');
    console.error('  2. Use ImageMagick: magick icon.svg -resize 512x512 icon.png');
    console.error('  3. Let electron-builder generate formats automatically from icon.png');
    process.exit(1);
  }
}

// Run the generator
generateIcons();
