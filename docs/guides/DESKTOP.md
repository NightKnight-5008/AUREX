# Desktop Application Guide (Electron)

## Overview

This guide shows how to convert AUREX into a standalone desktop application with a Windows installer (.exe setup file) using Electron.

---

## Part 1: Electron Setup

### 1. Install Electron Dependencies

```bash
npm install --save-dev electron electron-builder concurrently wait-on cross-env
```

### 2. Create Electron Main Process (electron/main.js)

```javascript
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'AUREX - Financial Intelligence Platform',
    backgroundColor: '#000000',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  const menuTemplate = [
    { label: 'File', submenu: [{ label: 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: 'Help', submenu: [{ label: 'About AUREX' }] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

### 3. Create Preload Script (electron/preload.js)

```javascript
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});
```

### 4. Update package.json

```json
{
  "name": "aurex",
  "version": "1.0.0",
  "description": "AUREX - Financial Intelligence Platform",
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "npm run check:safe && NODE_OPTIONS='--max-old-space-size=1792' vite build",
    "electron": "cross-env NODE_ENV=development electron .",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && npm run electron\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:mac": "npm run build && electron-builder --mac",
    "electron:build:linux": "npm run build && electron-builder --linux",
    "dist": "npm run build && electron-builder --win --mac --linux"
  },
  "build": {
    "appId": "com.aurex.financial",
    "productName": "AUREX",
    "directories": { "output": "release", "buildResources": "build" },
    "files": ["dist/**/*", "electron/**/*", "package.json"],
    "win": {
      "target": [{ "target": "nsis", "arch": ["x64", "ia32"] }],
      "icon": "build/icon.ico",
      "artifactName": "AUREX-Setup-${version}.${ext}"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "AUREX"
    },
    "mac": { "target": ["dmg", "zip"], "icon": "build/icon.icns" },
    "linux": { "target": ["AppImage", "deb"], "icon": "build/icon.png" }
  }
}
```

---

## Part 2: Create App Icons

Create icons in build/ directory:
- build/icon.ico (Windows)
- build/icon.icns (macOS)
- build/icon.png (Linux)

Quick icon setup:

```bash
mkdir build
# Add your 256x256 PNG icon as build/icon.png
```

For Windows .ico conversion:

```bash
npm install --save-dev electron-icon-builder
npx electron-icon-builder --input=./build/icon.png --output=./build --flatten
```

---

## Part 3: Update Vite Config for Electron

Update vite.config.ts:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON === 'true' ? './' : '/',
  build: { outDir: 'dist', assetsDir: 'assets', emptyOutDir: true },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

---

## Part 4: Build Desktop App

### Development Mode (Test Electron)

```bash
npm run electron:dev
```

This will:
1. Start Vite dev server on port 5173
2. Launch Electron pointing to the dev server
3. Enable hot reload

### Production Build

#### Build for Windows (.exe installer):

```bash
npm run electron:build:win
```

Output: release/AUREX-Setup-1.0.0.exe

#### Build for macOS (.dmg):

```bash
npm run electron:build:mac
```

Output: release/AUREX-1.0.0.dmg

#### Build for Linux (.AppImage):

```bash
npm run electron:build:linux
```

Output: release/AUREX-1.0.0.AppImage

---

## Part 5: Advanced Features

### Auto Updates

```bash
npm install electron-updater
```

Update electron/main.js:

```javascript
const { autoUpdater } = require('electron-updater');

app.whenReady().then(() => {
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new version has been downloaded. Restart to apply updates.',
    buttons: ['Restart', 'Later']
  }).then((result) => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});
```

### Local Database (SQLite)

```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

### System Tray Integration

```javascript
const { Tray } = require('electron');

let tray;

function createTray() {
  tray = new Tray(path.join(__dirname, '../public/tray-icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show AUREX', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('AUREX Financial Platform');
  tray.setContextMenu(contextMenu);
}
```

---

## Part 6: Code Signing (For Distribution)

### Windows Code Signing

1. Get a code signing certificate (Sectigo, DigiCert, etc.)
2. Add to package.json:

```json
"win": {
  "certificateFile": "path/to/certificate.pfx",
  "certificatePassword": "your-password",
  "signingHashAlgorithms": ["sha256"],
  "sign": "./customSign.js"
}
```

### macOS Code Signing

```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)",
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "build/entitlements.mac.plist"
}
```

---

## Part 7: Testing the Installer

### Windows Testing

1. Build: npm run electron:build:win
2. Navigate to release/ folder
3. Run AUREX-Setup-1.0.0.exe
4. Follow installer wizard
5. App will be installed to C:\Users\{username}\AppData\Local\Programs\AUREX\
6. Desktop shortcut and Start Menu entry created

### Installer Features

The NSIS installer includes:
- Installation directory selection
- Desktop shortcut option
- Start Menu integration
- Uninstaller
- Auto-launch option

---

## Troubleshooting

### Issue: Blank white screen in production
**Fix**: Check base path in vite.config.ts is set to ./

### Issue: Build fails on Windows
**Fix**: Install Windows Build Tools:
```bash
npm install --global windows-build-tools
```

### Issue: Icons not showing
**Fix**: Ensure icon files exist in build/ directory with correct names

---

## Checklist

- [ ] Electron dependencies installed
- [ ] electron/main.js created
- [ ] electron/preload.js created
- [ ] Icons created in build/ folder
- [ ] package.json updated with electron scripts
- [ ] Development mode tested (npm run electron:dev)
- [ ] Windows build tested (npm run electron:build:win)
- [ ] Installer tested on Windows machine
- [ ] Auto-updates configured (optional)
- [ ] Code signing set up (optional)
