# Icon Generation Checklist

Use this checklist to track your progress in setting up icons for the AUREX Desktop App.

## Phase 1: Icon Generation (Required for Building)

- [ ] **Generate PNG files** (Choose one method):
  - [ ] Option A: Open `convert-icons.html` in browser and download all PNGs
  - [ ] Option B: Run `npm install --save-dev sharp && node generate-placeholder-icons.js`
  - [ ] Option C: Use online converter (https://cloudconvert.com/svg-to-png)

- [ ] **Verify PNG files exist**:
  - [ ] `icon.png` (512x512) exists in build-resources/
  - [ ] `tray-icon.png` (64x64) exists in build-resources/

- [ ] **Test the build**:
  - [ ] Run `npm run desktop:build` (should complete without errors)
  - [ ] Run `npm run desktop:package` (should create packaged app)
  - [ ] Check `release/` directory for output

## Phase 2: Platform-Specific Icons (Optional - electron-builder auto-generates)

- [ ] **Windows (.ico)**:
  - [ ] Either: Let electron-builder generate from icon.png (automatic)
  - [ ] Or: Manually create icon.ico and place in build-resources/

- [ ] **macOS (.icns)**:
  - [ ] Either: Let electron-builder generate from icon.png (automatic)
  - [ ] Or: Manually create icon.icns and place in build-resources/

## Phase 3: Testing (Recommended)

- [ ] **Visual verification**:
  - [ ] Open generated PNG files and verify they look correct
  - [ ] Check icon.png at different zoom levels (should be sharp)
  - [ ] Check tray-icon.png is simple and recognizable at small size

- [ ] **Build verification**:
  - [ ] Package for Windows: `npm run desktop:package:win`
  - [ ] Package for macOS: `npm run desktop:package:mac`
  - [ ] Package for Linux: `npm run desktop:package:linux`

- [ ] **Installation testing**:
  - [ ] Install packaged app on target platform
  - [ ] Verify application icon appears correctly
  - [ ] Verify system tray icon appears correctly
  - [ ] Check icon in taskbar/dock
  - [ ] Check icon in app switcher (Alt+Tab / Cmd+Tab)

## Phase 4: Production Preparation (Before Release)

- [ ] **Design review**:
  - [ ] Icons match brand guidelines
  - [ ] Colors are consistent with brand
  - [ ] Design is professional and polished

- [ ] **Multi-resolution optimization**:
  - [ ] Icons look good at 16x16 (smallest size)
  - [ ] Icons look good at 32x32 (common size)
  - [ ] Icons look good at 256x256 (large size)
  - [ ] Icons look good at 512x512+ (high-DPI)

- [ ] **Platform-specific testing**:
  - [ ] Test on Windows 10/11 (light and dark theme)
  - [ ] Test on macOS (light and dark mode)
  - [ ] Test on Linux (Ubuntu, Fedora, etc.)

- [ ] **Accessibility**:
  - [ ] Icons are distinguishable in grayscale
  - [ ] Icons work with high contrast themes
  - [ ] Icons are recognizable at all sizes

## Current Status

**Last Updated:** [Date]

**Status:** 
- ✅ SVG source files created
- ⏳ PNG files need to be generated
- ⏳ Build testing pending
- ⏳ Production icons pending

**Next Action:** 
Open `convert-icons.html` in your browser to generate PNG files, or run the Node.js generator script.

## Notes

- Minimum requirement: `icon.png` and `tray-icon.png`
- electron-builder will auto-generate `.ico` and `.icns` from `icon.png`
- Current icons are placeholders - customize before production release
- See `QUICK_START.md` for step-by-step instructions
- See `README.md` for overview and options
- See `ICON_GENERATION.md` for detailed technical guide
