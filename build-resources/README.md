# AUREX Desktop App Icons

This directory contains icon resources for the AUREX Financial OS desktop application.

## Current Status

✅ **SVG Source Files Created**
- `icon.svg` - Main application icon (1024x1024)
- `tray-icon.svg` - System tray icon (64x64)

⚠️ **Platform-Specific Formats Needed**
- `icon.icns` - macOS application icon (required for macOS builds)
- `icon.ico` - Windows application icon (required for Windows builds)
- `icon.png` - Linux application icon (required for Linux builds)
- `tray-icon.png` - System tray icon (required for all platforms)

## Quick Start: Generate Icons Now

### Option 1: Automatic Generation (Recommended)

Install sharp and run the generator script:

```bash
npm install --save-dev sharp
node build-resources/generate-placeholder-icons.js
```

This will create:
- `icon.png` (512x512) for Linux
- `tray-icon.png` (64x64) for system tray
- Intermediate files for Windows and macOS

electron-builder will automatically generate `icon.ico` and `icon.icns` from `icon.png` during the build process.

### Option 2: Online Conversion (No Installation Required)

1. Go to https://cloudconvert.com/svg-to-png
2. Upload `icon.svg` and convert to PNG at 512x512 → Save as `icon.png`
3. Upload `tray-icon.svg` and convert to PNG at 64x64 → Save as `tray-icon.png`
4. Place both files in this directory

electron-builder will handle the rest automatically.

### Option 3: Manual Conversion with ImageMagick

If you have ImageMagick installed:

```bash
cd build-resources
magick icon.svg -resize 512x512 icon.png
magick tray-icon.svg -resize 64x64 tray-icon.png
```

## Icon Design

### Main Application Icon (icon.svg)

The main icon features:
- **AUREX "A" Logo**: Stylized letter "A" in gold gradient
- **Financial Chart**: Overlay showing upward trend line with data points
- **Blue Gradient Background**: Professional blue color scheme (#1e3a8a to #3b82f6)
- **Rounded Rectangle**: Modern rounded corners (180px radius)
- **"AUREX" Text**: Brand name at bottom in white

This design is recognizable at all sizes from 16x16 to 1024x1024.

### System Tray Icon (tray-icon.svg)

The tray icon is a simplified version:
- **Circular Background**: Blue gradient circle
- **Simplified "A"**: White letter "A" without extra details
- **Gold Accent Bar**: Small gold horizontal bar
- **Minimal Design**: Works well at 16x16 and 32x32 sizes

## Platform Requirements

### macOS (icon.icns)
- **Required**: Yes, for macOS builds
- **Format**: Apple Icon Image (.icns)
- **Sizes**: Multiple resolutions embedded (16, 32, 64, 128, 256, 512, 1024)
- **Auto-generation**: electron-builder can generate from icon.png

### Windows (icon.ico)
- **Required**: Yes, for Windows builds
- **Format**: Windows Icon (.ico)
- **Sizes**: Multiple resolutions embedded (16, 32, 48, 64, 128, 256)
- **Auto-generation**: electron-builder can generate from icon.png

### Linux (icon.png)
- **Required**: Yes, for Linux builds
- **Format**: PNG image
- **Size**: 512x512 pixels
- **Transparency**: Supported

### System Tray (tray-icon.png)
- **Required**: Yes, for all platforms
- **Format**: PNG image
- **Size**: 64x64 pixels (displayed at 16x16 or 32x32)
- **Transparency**: Supported
- **Note**: Should be simple and recognizable at small sizes

## Testing Icons

After generating the icons, test them:

```bash
# Build the desktop app
npm run desktop:build

# Package for your platform
npm run desktop:package

# Or package for all platforms
npm run desktop:package:all
```

Check the packaged app in the `release/` directory.

## Production Considerations

The current SVG icons are **placeholder designs** suitable for development and testing. For production release:

1. **Professional Design**: Consider hiring a designer to create custom icons
2. **Brand Consistency**: Ensure icons match your brand guidelines
3. **Size Optimization**: Test icons at all sizes (16x16 to 1024x1024)
4. **Platform Testing**: Verify appearance on Windows, macOS, and Linux
5. **High-DPI Support**: Ensure icons look sharp on Retina/4K displays
6. **Accessibility**: Test with different system themes (light/dark mode)

## Files in This Directory

- `icon.svg` - Main application icon source (SVG)
- `tray-icon.svg` - System tray icon source (SVG)
- `entitlements.mac.plist` - macOS entitlements configuration
- `generate-placeholder-icons.js` - Icon generation script
- `ICON_GENERATION.md` - Detailed icon generation guide
- `README.md` - This file

## Need Help?

See `ICON_GENERATION.md` for detailed instructions on:
- Converting SVG to platform-specific formats
- Using professional design tools
- Icon design best practices
- Platform-specific guidelines

## Resources

- [Electron Builder Icons](https://www.electron.build/icons)
- [macOS Icon Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Windows Icon Guidelines](https://docs.microsoft.com/en-us/windows/apps/design/style/iconography/app-icon-design)
