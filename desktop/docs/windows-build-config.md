# Windows Build Configuration

This document explains the Windows-specific electron-builder configuration for the AUREX Desktop App.

## Overview

The Windows build uses NSIS (Nullsoft Scriptable Install System) to create a professional installer for Windows 10 and later.

## Configuration Details

### Target Platform

- **Target**: NSIS installer
- **Format**: `.exe` installer
- **Supported OS**: Windows 10 and later
- **Architecture**: x64

### Installer Options

#### User Experience
- **One-Click Install**: Disabled (`oneClick: false`)
  - Users can customize installation location
  - Users see installation progress
  - More control over installation process

- **Installation Directory**: User-selectable (`allowToChangeInstallationDirectory: true`)
  - Default: `C:\Users\<username>\AppData\Local\Programs\AUREX Financial OS`
  - Users can choose custom location during installation

- **Shortcuts**: Automatically created
  - Desktop shortcut (`createDesktopShortcut: true`)
  - Start Menu shortcut (`createStartMenuShortcut: true`)

#### Installation Behavior
- **Per-Machine Install**: Disabled (`perMachine: false`)
  - Installs for current user only
  - No administrator privileges required by default
  - User data stored in user's AppData folder

- **Elevation**: Allowed (`allowElevation: true`)
  - User can choose to install for all users
  - Prompts for admin rights if needed

- **Run After Finish**: Enabled (`runAfterFinish: true`)
  - Application launches automatically after installation
  - User can uncheck this option during install

- **Uninstall Behavior**: Preserves user data (`deleteAppDataOnUninstall: false`)
  - User data and settings are kept after uninstall
  - Users can manually delete data if desired

### Code Signing Configuration

Code signing is essential for:
- Windows SmartScreen reputation
- User trust and security
- Preventing "Unknown Publisher" warnings

#### Configuration
```json
{
  "certificateFile": "${WINDOWS_CERT_FILE}",
  "certificatePassword": "${WINDOWS_CERT_PASSWORD}",
  "signingHashAlgorithms": ["sha256"]
}
```

#### Environment Variables
- `WINDOWS_CERT_FILE`: Path to the `.pfx` or `.p12` certificate file
- `WINDOWS_CERT_PASSWORD`: Password for the certificate file

#### Development vs Production

**Development**:
- Code signing is optional
- Builds work without certificates
- Windows will show "Unknown Publisher" warning
- Suitable for testing and internal distribution

**Production**:
- Code signing is required
- Obtain certificate from trusted CA (DigiCert, Sectigo, etc.)
- Set environment variables in CI/CD pipeline
- Never commit certificate files to repository

### Obtaining a Code Signing Certificate

1. **Purchase Certificate**
   - Buy from trusted CA (DigiCert, Sectigo, GlobalSign)
   - Choose "Code Signing Certificate" for Windows
   - Cost: ~$200-500/year

2. **Validate Identity**
   - CA will verify your organization
   - May require business documents
   - Process takes 1-7 days

3. **Receive Certificate**
   - Download as `.pfx` or `.p12` file
   - Store securely (never commit to git)
   - Set password for certificate

4. **Configure Build**
   ```bash
   # Set environment variables
   export WINDOWS_CERT_FILE="/path/to/certificate.pfx"
   export WINDOWS_CERT_PASSWORD="your-secure-password"
   
   # Build and sign
   npm run desktop:package:win
   ```

### CI/CD Integration

For GitHub Actions or other CI/CD:

```yaml
- name: Package app (Windows)
  if: matrix.os == 'windows-latest'
  env:
    WINDOWS_CERT_FILE: ${{ secrets.WINDOWS_CERT_FILE }}
    WINDOWS_CERT_PASSWORD: ${{ secrets.WINDOWS_CERT_PASSWORD }}
  run: npm run desktop:package:win
```

Store certificate as base64-encoded secret:
```bash
# Encode certificate
base64 certificate.pfx > certificate.txt

# Add to GitHub Secrets as WINDOWS_CERT_FILE
# Add password as WINDOWS_CERT_PASSWORD

# In CI/CD, decode before use
echo "$WINDOWS_CERT_FILE" | base64 -d > certificate.pfx
```

## Building for Windows

### Prerequisites
- Node.js 20+
- npm or yarn
- Windows 10+ (for testing)

### Build Commands

```bash
# Build React app and compile main process
npm run desktop:build

# Package for Windows (current platform)
npm run desktop:package:win

# Package for all platforms
npm run desktop:package:all
```

### Output

Built installers are placed in `release/` directory:
- `AUREX Financial OS Setup 1.0.0.exe` - NSIS installer
- `AUREX Financial OS Setup 1.0.0.exe.blockmap` - Update metadata

### Installer Size
- Typical size: 150-200 MB
- Includes Chromium engine and Node.js runtime
- ASAR compression reduces file count

## Testing the Installer

1. **Build the installer**
   ```bash
   npm run desktop:package:win
   ```

2. **Run the installer**
   - Double-click the `.exe` file in `release/`
   - Follow installation wizard
   - Choose installation location
   - Select shortcut options

3. **Verify installation**
   - Check desktop shortcut created
   - Check Start Menu entry
   - Launch application
   - Verify auto-update works

4. **Test uninstall**
   - Use Windows "Add or Remove Programs"
   - Verify clean uninstall
   - Check if user data preserved (if desired)

## Troubleshooting

### "Unknown Publisher" Warning
- **Cause**: Application not code-signed
- **Solution**: Sign with valid certificate or click "More info" → "Run anyway" for testing

### Installation Fails
- **Cause**: Insufficient permissions
- **Solution**: Run installer as administrator or choose user-only install

### Auto-Update Not Working
- **Cause**: Code signature verification enabled without signing
- **Solution**: Set `verifyUpdateCodeSignature: false` for development

### Certificate Errors
- **Cause**: Invalid certificate or wrong password
- **Solution**: Verify certificate file path and password are correct

## Security Considerations

1. **Certificate Storage**
   - Never commit certificates to git
   - Use environment variables or secrets management
   - Rotate certificates before expiration

2. **Password Security**
   - Use strong passwords for certificates
   - Store in CI/CD secrets, not in code
   - Limit access to certificate files

3. **Update Verification**
   - Enable `verifyUpdateCodeSignature` in production
   - Ensures updates are from trusted source
   - Prevents man-in-the-middle attacks

## References

- [electron-builder Windows Configuration](https://www.electron.build/configuration/win)
- [NSIS Configuration](https://www.electron.build/configuration/nsis)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [Windows Code Signing Best Practices](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
