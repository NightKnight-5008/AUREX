# Tray Icon Setup

## Overview

The TrayManager class requires a tray icon image to display in the system tray (Windows and Linux only).

## Icon Requirements

- **Format**: PNG (recommended) or ICO
- **Size**: 16x16 or 32x32 pixels (Windows), 22x22 pixels (Linux)
- **Location**: `build-resources/tray-icon.png`
- **Transparency**: Recommended for better appearance

## Creating a Tray Icon

### Option 1: Use an existing icon
Copy your application icon and resize it to 16x16 or 32x32 pixels:

```bash
# Using ImageMagick
convert icon.png -resize 16x16 build-resources/tray-icon.png
```

### Option 2: Create a simple icon
You can create a simple icon using any image editor:
- Create a 16x16 or 32x32 pixel image
- Use your brand colors
- Keep it simple and recognizable at small sizes
- Save as PNG with transparency

### Option 3: Use a placeholder
For development, you can use a simple colored square or your app's logo.

## Platform-Specific Notes

### Windows
- Supports 16x16 and 32x32 pixel icons
- ICO format is native but PNG works well
- Icon appears in the system tray (bottom-right corner)

### Linux
- Typically uses 22x22 pixel icons
- PNG format is standard
- Icon appears in the system tray (varies by desktop environment)

### macOS
- TrayManager is **not** used on macOS (skipped automatically)
- macOS uses the native menu bar instead

## Current Status

The TrayManager is implemented and integrated into the main process. To complete the setup:

1. Create or obtain a tray icon image
2. Place it at `build-resources/tray-icon.png`
3. The TrayManager will automatically load it on Windows and Linux

If no icon is found, the TrayManager will log a warning and use an empty icon as a fallback.
