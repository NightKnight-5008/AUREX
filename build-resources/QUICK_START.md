# Quick Start: Generate Icons for AUREX Desktop App

This guide will help you quickly generate all required icon files for the desktop application.

## ✅ What's Already Done

- ✅ SVG source files created (`icon.svg`, `tray-icon.svg`)
- ✅ Icon generation scripts created
- ✅ Comprehensive documentation provided

## ⚡ Fastest Method: Browser-Based Conversion (2 minutes)

**No installation required!**

1. **Open the converter in your browser:**
   ```bash
   # From the project root
   open build-resources/convert-icons.html
   # Or on Windows: start build-resources/convert-icons.html
   # Or on Linux: xdg-open build-resources/convert-icons.html
   ```

2. **Download all 4 PNG files:**
   - Click "Download icon.png" (512x512)
   - Click "Download tray-icon.png" (64x64)
   - Click "Download icon-256.png" (256x256)
   - Click "Download icon-1024.png" (1024x1024)

3. **Move downloaded files to build-resources:**
   ```bash
   # Move from your Downloads folder to build-resources/
   mv ~/Downloads/icon*.png build-resources/
   mv ~/Downloads/tray-icon.png build-resources/
   ```

4. **Done!** electron-builder will automatically generate `.ico` and `.icns` files during packaging.

## 🔧 Alternative: Node.js Script (If you prefer automation)

1. **Install sharp:**
   ```bash
   npm install --save-dev sharp
   ```

2. **Run the generator:**
   ```bash
   node build-resources/generate-placeholder-icons.js
   ```

3. **Done!** All PNG files will be created automatically.

## 🧪 Test the Icons

After generating the PNG files, test them:

```bash
# Build the desktop app
npm run desktop:build

# Package for your current platform
npm run desktop:package

# Check the packaged app in release/ directory
```

## 📋 Required Files Checklist

After generation, you should have these files in `build-resources/`:

- [ ] `icon.png` (512x512) - Linux application icon
- [ ] `tray-icon.png` (64x64) - System tray icon
- [ ] `icon-256.png` (256x256) - Optional, for Windows
- [ ] `icon-1024.png` (1024x1024) - Optional, for macOS

**Note:** `icon.ico` and `icon.icns` will be generated automatically by electron-builder from `icon.png` during the packaging process. You don't need to create them manually unless you want custom multi-resolution icons.

## 🎨 Customizing the Icons

The current icons are placeholder designs. To customize:

1. **Edit the SVG files:**
   - Open `icon.svg` or `tray-icon.svg` in a vector editor (Figma, Illustrator, Inkscape)
   - Modify colors, shapes, or add your logo
   - Save the SVG

2. **Regenerate PNGs:**
   - Use the browser converter or Node.js script again
   - Or use online tools like https://cloudconvert.com/svg-to-png

3. **Test the new icons:**
   - Run `npm run desktop:package` to see them in action

## 🚀 Production Considerations

For production release:

1. **Professional Design**: Consider hiring a designer for custom icons
2. **Multi-Resolution**: Create optimized versions for each size (not just scaled)
3. **Platform Testing**: Test on Windows, macOS, and Linux
4. **High-DPI**: Ensure icons look sharp on Retina/4K displays

## 📚 Need More Help?

- See `README.md` for overview and quick reference
- See `ICON_GENERATION.md` for detailed instructions and best practices
- Check electron-builder docs: https://www.electron.build/icons

## ❓ Troubleshooting

**Q: The browser converter doesn't work**
- Try a different browser (Chrome, Firefox, Safari)
- Check browser console for errors (F12)
- Use the Node.js script instead

**Q: electron-builder fails with "icon not found"**
- Ensure `icon.png` exists in `build-resources/`
- Check file permissions (should be readable)
- Verify PNG files are valid (open them in an image viewer)

**Q: Icons look blurry on high-DPI displays**
- Use higher resolution source images
- Ensure SVG files are vector-based (not embedded raster images)
- Consider creating @2x versions for Retina displays

**Q: System tray icon doesn't appear**
- Ensure `tray-icon.png` is 64x64 or smaller
- Try a simpler design (complex icons don't work well at small sizes)
- Check that the icon has transparency (not a solid background)
