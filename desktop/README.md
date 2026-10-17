# Desktop Directory

This directory contains the Electron main process code for the AUREX desktop application.

## Structure

```
desktop/
├── src/              # TypeScript source files for main process
│   ├── main.ts       # Main entry point
│   ├── preload.ts    # Preload script (secure bridge)
│   ├── window-manager.ts
│   ├── menu-manager.ts
│   ├── auto-updater.ts
│   └── ...           # Other main process modules
├── tsconfig.json     # TypeScript configuration for main process
├── main.js           # Compiled main process entry (generated)
├── preload.js        # Compiled preload script (generated)
└── README.md         # This file
```

## Development

### Compile TypeScript

```bash
# One-time compilation
npm run desktop:compile

# Watch mode (auto-recompile on changes)
npm run desktop:compile:watch
```

### Run Desktop App in Development

```bash
# Start Vite dev server and Electron
npm run desktop:dev
```

This will:

1. Start the Vite dev server on <http://localhost:3000>
2. Wait for the dev server to be ready
3. Launch Electron and load the dev server URL
4. Enable hot-reload for renderer process changes

### Build for Production

```bash
# Build React app and compile main process
npm run desktop:build

# Package for current platform
npm run desktop:package

# Package for specific platforms
npm run desktop:package:win    # Windows
npm run desktop:package:mac    # macOS
npm run desktop:package:linux  # Linux

# Package for all platforms
npm run desktop:package:all
```

## TypeScript Configuration

The `tsconfig.json` in this directory is specifically configured for the Electron main process:

- **Target**: ES2022 (modern JavaScript features)
- **Module**: CommonJS (Node.js compatibility)
- **Output**: Compiled files go to `desktop/` directory
- **Types**: Includes Node.js and Electron type definitions
- **Strict**: Full TypeScript strict mode enabled

## Main Process vs Renderer Process

- **Main Process** (this directory): Node.js process that manages app lifecycle, windows, and native OS integration
- **Renderer Process** (`src/` directory): Chromium process that runs the React web application
- **Preload Script**: Secure bridge that exposes whitelisted APIs from main to renderer

## Security

The desktop app follows Electron security best practices:

- Context isolation enabled
- Node integration disabled in renderer
- Preload script exposes only whitelisted APIs
- Content Security Policy enforced
- External navigation blocked

## Next Steps

After setting up the project structure, the next tasks will implement:

1. Main process entry point (`main.ts`)
2. Preload script (`preload.ts`)
3. Window manager
4. Security services integration
5. Auto-update system
6. Native menus
7. IPC handlers
