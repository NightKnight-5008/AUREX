# Icon Generation Instructions

This directory contains placeholder SVG icons for the AUREX Financial OS desktop application. These need to be converted to platform-specific formats for production use.

## Current Files

- `icon.svg` - Main application icon source (1024x1024)
- `tray-icon.svg` - System tray icon source (64x64)
- `entitlements.mac.plist` - macOS entitlements configuration

## Required Icon Formats

### For Production Builds

You need to generate the following icon files from the SVG sources:

1. **macOS**: `icon.icns` (1024x1024 base resolution)
2. **Windows**: `icon.ico` (256x256 with multiple sizes embedded)
3. **Linux**: `icon.png` (512x512)
4. **System Tray**: `tray-icon.png` (64x64 or 32x32)

## Conversion Methods

### Option 1: Using Online Tools (Easiest)

1. **For .icns (macOS)**:
   - Visit https://cloudconvert.com/svg-to-icns
   - Upload `icon.svg`
   - Set size to 1024x1024
   - Download `icon.icns` and place in this directory

2. **For .ico (Windows)**:
   - Visit https://cloudconvert.com/svg-to-ico
   - Upload `icon.svg`
   - Set size to 256x256
   - Download `icon.ico` and place in this directory

3. **For .png (Linux & Tray)**:
   - Visit https://cloudconvert.com/svg-to-png
   - Upload `icon.svg`, set size to 512x512, download as `icon.png`
   - Upload `tray-icon.svg`, set size to 64x64, download as `tray-icon.png`
   - Place both in this directory

### Option 2: Using ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
# Convert to PNG formats
magick icon.svg -resize 512x512 icon.png
magick tray-icon.svg -resize 64x64 tray-icon.png

# Convert to ICO (Windows)
magick icon.svg -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico

# Convert to ICNS (macOS) - requires additional tools
# Install png2icns: brew install libicns
png2icns icon.icns icon.png
```

### Option 3: Using Electron Icon Maker (Automated)

Install and use electron-icon-maker:

```bash
npm install -g electron-icon-maker

# Generate all formats from SVG
electron-icon-maker --input=icon.svg --output=./
```

### Option 4: Using Professional Design Tools

For production-quality icons:

1. Open `icon.svg` in Adobe Illustrator, Figma, or Sketch
2. Customize the design with your brand colors and style
3. Export to required formats:
   - macOS: Export as .icns or use Icon Composer
   - Windows: Export as .ico with multiple sizes (16, 32, 48, 64, 128, 256)
   - Linux: Export as .png at 512x512
   - Tray: Export as .png at 64x64 (or 32x32 for high-DPI)

## Icon Design Guidelines

### Application Icon (icon.svg)

- **Size**: 1024x1024 base resolution
- **Style**: Should be recognizable at small sizes (16x16)
- **Colors**: Use brand colors (currently blue gradient with gold accent)
- **Content**: Includes AUREX "A" logo with financial chart element
- **Background**: Rounded rectangle (180px radius) for modern look

### Tray Icon (tray-icon.svg)

- **Size**: 64x64 (will be displayed at 16x16 or 32x32)
- **Style**: Simple, monochrome-friendly design
- **Colors**: Should work on both light and dark system trays
- **Content**: Simplified "A" logo without text
- **Background**: Circular for better small-size appearance

## Platform-Specific Notes

### macOS (.icns)

- Should include multiple resolutions: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
- Each resolution should be optimized (not just scaled)
- Use rounded square shape (squircle) for consistency with macOS design

### Windows (.ico)

- Should include multiple sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- Consider high-DPI displays (include @2x versions)
- Test on both light and dark Windows themes

### Linux (.png)

- Standard size is 512x512
- Should be a simple PNG with transparency
- Works with most Linux desktop environments

### System Tray (.png)

- Keep it simple - will be displayed at 16x16 or 32x32
- Should be recognizable at tiny sizes
- Consider creating separate light/dark versions if needed
- Transparency is important for different system tray backgrounds

## Verification

After generating the icons, verify them:

1. **Visual Check**: Open each icon file and verify it looks correct
2. **Size Check**: Ensure dimensions match requirements
3. **Build Test**: Run `npm run desktop:package` and check the packaged app
4. **Platform Test**: Install the app on each platform and verify icon appearance

## Current Status

✅ SVG source files created (placeholder designs)
⚠️ Platform-specific formats need to be generated
⚠️ Icons should be customized with final brand design

## Next Steps

1. Generate required icon formats using one of the methods above
2. Place generated files in this directory:
   - `icon.icns` (macOS)
   - `icon.ico` (Windows)
   - `icon.png` (Linux, 512x512)
   - `tray-icon.png` (System tray, 64x64)
3. Test the icons by building the application
4. Optionally, customize the SVG designs with final branding

## Resources

- [Electron Icon Requirements](https://www.electron.build/icons)
- [macOS Icon Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Windows Icon Guidelines](https://docs.microsoft.com/en-us/windows/apps/design/style/iconography/app-icon-design)
- [electron-builder Icon Configuration](https://www.electron.build/configuration/configuration#PlatformSpecificBuildOptions-icon)
