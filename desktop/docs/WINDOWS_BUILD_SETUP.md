# Windows Build Setup Guide

This guide explains how to set up and build the AUREX Desktop App for Windows.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build the application
npm run desktop:build

# 3. Package for Windows
npm run desktop:package:win
```

The installer will be created in the `release/` directory.

## Configuration Summary

### NSIS Installer Settings

| Setting | Value | Description |
|---------|-------|-------------|
| **Target** | NSIS | Windows installer format |
| **One-Click Install** | No | Users can customize installation |
| **Custom Directory** | Yes | Users can choose install location |
| **Desktop Shortcut** | Yes | Creates desktop shortcut |
| **Start Menu Shortcut** | Yes | Creates Start Menu entry |
| **Run After Install** | Yes | Launches app after installation |
| **Per-Machine Install** | No | Installs for current user only |
| **Allow Elevation** | Yes | Can install for all users if admin |
| **Preserve User Data** | Yes | Keeps data on uninstall |

### Code Signing

Code signing is configured but optional for development:

- **Certificate File**: `${WINDOWS_CERT_FILE}` (environment variable)
- **Certificate Password**: `${WINDOWS_CERT_PASSWORD}` (environment variable)
- **Hash Algorithm**: SHA-256

## Development Build (No Code Signing)

For development and testing, you can build without code signing:

```bash
# Build without signing
npm run desktop:package:win
```

Windows will show an "Unknown Publisher" warning, but you can bypass it:
1. Click "More info"
2. Click "Run anyway"

## Production Build (With Code Signing)

For production releases, set up code signing:

### 1. Obtain a Code Signing Certificate

Purchase from a trusted Certificate Authority:
- DigiCert
- Sectigo (formerly Comodo)
- GlobalSign

Cost: ~$200-500/year

### 2. Set Environment Variables

```bash
# Windows (PowerShell)
$env:WINDOWS_CERT_FILE="C:\path\to\certificate.pfx"
$env:WINDOWS_CERT_PASSWORD="your-password"

# Windows (Command Prompt)
set WINDOWS_CERT_FILE=C:\path\to\certificate.pfx
set WINDOWS_CERT_PASSWORD=your-password

# Linux/macOS
export WINDOWS_CERT_FILE="/path/to/certificate.pfx"
export WINDOWS_CERT_PASSWORD="your-password"
```

### 3. Build and Sign

```bash
npm run desktop:package:win
```

The installer will be automatically signed during the build process.

## CI/CD Setup

### GitHub Actions

Add secrets to your repository:
- `WINDOWS_CERT_FILE`: Base64-encoded certificate
- `WINDOWS_CERT_PASSWORD`: Certificate password

```yaml
- name: Decode certificate
  run: |
    echo "${{ secrets.WINDOWS_CERT_FILE }}" | base64 -d > certificate.pfx
  
- name: Build Windows installer
  env:
    WINDOWS_CERT_FILE: certificate.pfx
    WINDOWS_CERT_PASSWORD: ${{ secrets.WINDOWS_CERT_PASSWORD }}
  run: npm run desktop:package:win
```

### Encoding Certificate for CI/CD

```bash
# Encode certificate to base64
base64 certificate.pfx > certificate.txt

# Copy the content of certificate.txt to GitHub Secrets
```

## Build Output

After building, you'll find in the `release/` directory:

```
release/
├── AUREX Financial OS Setup 1.0.0.exe          # Installer
├── AUREX Financial OS Setup 1.0.0.exe.blockmap # Update metadata
└── win-unpacked/                                # Unpacked app (for testing)
```

### Installer Details

- **Size**: ~150-200 MB
- **Format**: NSIS executable installer
- **Compression**: LZMA (high compression)
- **Architecture**: x64 only

## Testing the Installer

### 1. Install

```bash
# Run the installer
.\release\AUREX Financial OS Setup 1.0.0.exe
```

Follow the installation wizard:
1. Choose installation location (or use default)
2. Select shortcut options
3. Click Install
4. Application launches automatically

### 2. Verify Installation

Check that the following were created:
- Desktop shortcut (if selected)
- Start Menu entry
- Installation directory with app files
- User data directory: `%APPDATA%\AUREX Financial OS`

### 3. Test Application

- Launch from desktop shortcut
- Launch from Start Menu
- Verify all features work
- Check auto-update functionality

### 4. Test Uninstall

1. Open "Add or Remove Programs"
2. Find "AUREX Financial OS"
3. Click Uninstall
4. Verify clean uninstall
5. Check that user data is preserved (in `%APPDATA%`)

## Troubleshooting

### Build Fails with Certificate Error

**Problem**: `Error: Cannot find certificate file`

**Solution**: 
- Verify `WINDOWS_CERT_FILE` path is correct
- Check file exists and is readable
- Ensure path uses forward slashes or escaped backslashes

### "Unknown Publisher" Warning

**Problem**: Windows SmartScreen shows warning

**Solution**:
- For development: Click "More info" → "Run anyway"
- For production: Sign with valid certificate
- Build reputation by distributing signed builds

### Installation Requires Admin Rights

**Problem**: Installer asks for admin password

**Solution**:
- This is normal if installing for all users
- To install for current user only, uncheck "Install for all users" option
- Or set `perMachine: false` in config (already set)

### Auto-Update Not Working

**Problem**: Updates don't download/install

**Solution**:
- Check `publish` configuration in package.json
- Verify GitHub releases are public
- Check network connectivity
- Review electron-updater logs

### Build is Too Large

**Problem**: Installer is larger than expected

**Solution**:
- This is normal (includes Chromium + Node.js)
- Typical size: 150-200 MB
- ASAR compression is already enabled
- Consider excluding unnecessary dependencies

## Advanced Configuration

### Custom Install Location

Default: `%LOCALAPPDATA%\Programs\AUREX Financial OS`

To change, modify `package.json`:

```json
{
  "build": {
    "nsis": {
      "installerHeader": "build-resources/installerHeader.bmp",
      "installerSidebar": "build-resources/installerSidebar.bmp"
    }
  }
}
```

### Custom Installer UI

Add custom images:
- `installerHeader.bmp`: 150x57 pixels
- `installerSidebar.bmp`: 164x314 pixels

### Multi-Language Support

```json
{
  "build": {
    "nsis": {
      "language": "1033",
      "multiLanguageInstaller": true
    }
  }
}
```

## Requirements Satisfied

This configuration satisfies the following requirements:

- **Requirement 3.8**: Windows NSIS installer target ✓
- **Requirement 11.7**: electron-builder Windows configuration ✓
- **Requirements 18.1-18.8**: NSIS installer options ✓
  - One-click install configuration ✓
  - Installation directory selection ✓
  - Desktop shortcut ✓
  - Start menu shortcut ✓
  - Installer icon ✓
  - Uninstaller icon ✓
  - Run after finish ✓
  - User data preservation ✓
- **Requirement 19.1**: Windows 10+ support ✓
- **Requirement 19.7**: Code signing configuration ✓

## Security Best Practices

1. **Never commit certificates to git**
   - Add `*.pfx` and `*.p12` to `.gitignore`
   - Use environment variables or secrets management

2. **Protect certificate passwords**
   - Store in CI/CD secrets
   - Never hardcode in scripts
   - Use strong passwords

3. **Rotate certificates before expiration**
   - Set calendar reminders
   - Plan for certificate renewal
   - Test new certificates before old ones expire

4. **Enable update verification in production**
   - Set `verifyUpdateCodeSignature: true` for production
   - Ensures updates are from trusted source
   - Prevents tampering

## Support

For issues or questions:
- Check [electron-builder documentation](https://www.electron.build/)
- Review [NSIS documentation](https://nsis.sourceforge.io/)
- See [Windows Code Signing Guide](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)

## Next Steps

After building for Windows:
1. Test the installer thoroughly
2. Set up code signing for production
3. Configure auto-updates
4. Build for other platforms (macOS, Linux)
5. Set up CI/CD pipeline
