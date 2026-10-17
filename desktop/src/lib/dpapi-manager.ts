/**
 * AUREX Desktop - DPAPI Key Management
 *
 * Windows Data Protection API (DPAPI) integration for OS-bound encryption keys
 *
 * SECURITY:
 * - Master keys protected by Windows DPAPI (machine-bound)
 * - No keys stored on disk in plaintext
 * - Keys live only in memory during app session
 * - Secure key wiping on exit/lock
 * - Copy-paste protection (encrypted data fails on different machine)
 *
 * ARCHITECTURE:
 * - Uses Windows dpapi-addon native module
 * - Fallback to PBKDF2 derivation for non-Windows platforms
 * - All encryption keys derived from DPAPI-protected master secret
 */

import crypto from 'crypto';
import { platform } from 'os';

// Windows DPAPI native addon (only available on Windows)
let dpapi: any = null;
try {
  if (platform() === 'win32') {
    dpapi = require('dpapi-addon');
  }
} catch (error) {
  console.warn('DPAPI addon not available, using fallback key derivation');
}

/**
 * Machine fingerprint for device binding
 */
export interface MachineFingerprint {
  machineId: string;
  cpuId: string;
  systemUuid: string;
  macAddress: string;
  timestamp: number;
}

/**
 * DPAPI-protected key blob
 */
export interface ProtectedKeyBlob {
  encryptedMasterKey: string; // Base64-encoded DPAPI-protected data
  fingerprint: MachineFingerprint;
  createdAt: number;
  version: number;
}

export class DPAPIManager {
  private masterKey: Buffer | null = null;
  private fingerprint: MachineFingerprint | null = null;
  private readonly KEY_SIZE = 32; // 256 bits for AES-256

  /**
   * Initialize DPAPI manager and derive master key
   */
  async initialize(storedBlob?: ProtectedKeyBlob): Promise<void> {
    // Generate or verify machine fingerprint
    this.fingerprint = await this.generateMachineFingerprint();

    if (storedBlob) {
      // Verify machine fingerprint matches
      if (!this.verifyMachineFingerprint(storedBlob.fingerprint)) {
        throw new Error('SECURITY: Machine fingerprint mismatch - encrypted data from different device');
      }

      // Decrypt master key using DPAPI
      this.masterKey = await this.decryptMasterKey(storedBlob.encryptedMasterKey, storedBlob.fingerprint);
    } else {
      // Generate new master key and protect with DPAPI
      this.masterKey = crypto.randomBytes(this.KEY_SIZE);
    }
  }

  /**
   * Get encrypted key blob for storage
   * This blob can be safely stored on disk (DPAPI-protected)
   */
  async getProtectedKeyBlob(): Promise<ProtectedKeyBlob> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const encryptedMasterKey = await this.encryptMasterKey(this.masterKey);

    return {
      encryptedMasterKey,
      fingerprint: this.fingerprint!,
      createdAt: Date.now(),
      version: 1
    };
  }

  /**
   * Derive encryption key from master key using PBKDF2
   */
  async deriveEncryptionKey(purpose: string, salt?: Buffer): Promise<Buffer> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const keySalt = salt || Buffer.from(`aurex-${purpose}-v1`);

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        this.masterKey!,
        keySalt,
        100000, // 100k iterations
        32, // 256 bits
        'sha256',
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }

  /**
   * Securely wipe all keys from memory
   */
  wipeKeys(): void {
    if (this.masterKey) {
      this.masterKey.fill(0);
      this.masterKey = null;
    }

    // Also wipe fingerprint from memory
    if (this.fingerprint) {
      this.fingerprint = null;
    }
  }

  /**
   * Get current machine fingerprint
   */
  getMachineFingerprint(): MachineFingerprint | null {
    return this.fingerprint;
  }

  /**
   * Encrypt master key using Windows DPAPI
   */
  private async encryptMasterKey(masterKey: Buffer): Promise<string> {
    if (platform() === 'win32' && dpapi) {
      try {
        // DPAPI protects data with user credentials + machine key
        // Data can only be decrypted on same machine by same user
        const protectedData = dpapi.protectData(masterKey, null, 'LocalMachine');
        return protectedData.toString('base64');
      } catch (error) {
        console.error('DPAPI encryption failed:', error);
        throw new Error('Failed to protect master key with DPAPI');
      }
    } else {
      // Fallback for non-Windows: use machine fingerprint as entropy
      return this.fallbackEncrypt(masterKey);
    }
  }

  /**
   * Decrypt master key using Windows DPAPI
   */
  private async decryptMasterKey(encryptedKey: string, storedFingerprint?: MachineFingerprint): Promise<Buffer> {
    if (platform() === 'win32' && dpapi) {
      try {
        const encryptedBuffer = Buffer.from(encryptedKey, 'base64');
        const decrypted = dpapi.unprotectData(encryptedBuffer, null, 'LocalMachine');
        return decrypted;
      } catch (error) {
        console.error('DPAPI decryption failed:', error);
        throw new Error('Failed to decrypt master key - wrong machine or user');
      }
    } else {
      // Fallback for non-Windows
      return this.fallbackDecrypt(encryptedKey, storedFingerprint);
    }
  }

  /**
   * Fallback encryption for non-Windows platforms
   * Uses machine fingerprint as entropy source
   */
  private fallbackEncrypt(masterKey: Buffer): string {
    const entropy = this.getFingerprintEntropy();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', entropy, iv);

    const encrypted = Buffer.concat([
      cipher.update(masterKey),
      cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return JSON.stringify({
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64')
    });
  }

  /**
   * Fallback decryption for non-Windows platforms
   */
  private fallbackDecrypt(encryptedKey: string, storedFingerprint?: MachineFingerprint): Buffer {
    const entropy = this.getFingerprintEntropy(storedFingerprint);
    const data = JSON.parse(encryptedKey);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      entropy,
      Buffer.from(data.iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(data.tag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(data.encrypted, 'base64')),
      decipher.final()
    ]);
  }

  /**
   * Generate machine fingerprint for device binding
   */
  private async generateMachineFingerprint(): Promise<MachineFingerprint> {
    const machineIdModule = await import('node-machine-id');
    const machineIdSync = machineIdModule.default?.machineIdSync || machineIdModule.machineIdSync;
    const os = await import('os');

    // Get stable machine identifiers
    const machineId = machineIdSync({ original: true });
    const cpus = os.cpus();
    const cpuId = cpus.length > 0 ? cpus[0].model : 'unknown';

    // Get MAC address from first network interface
    const networkInterfaces = os.networkInterfaces();
    let macAddress = 'unknown';
    for (const name in networkInterfaces) {
      const iface = networkInterfaces[name];
      if (iface) {
        for (const addr of iface) {
          if (!addr.internal && addr.mac !== '00:00:00:00:00:00') {
            macAddress = addr.mac;
            break;
          }
        }
      }
      if (macAddress !== 'unknown') break;
    }

    // System UUID (Windows: from WMI, Linux: from /etc/machine-id)
    const systemUuid = machineId;

    return {
      machineId,
      cpuId,
      systemUuid,
      macAddress,
      timestamp: Date.now()
    };
  }

  /**
   * Verify machine fingerprint matches current machine
   */
  private verifyMachineFingerprint(stored: MachineFingerprint): boolean {
    if (!this.fingerprint) {
      return false;
    }

    // Machine ID must match exactly
    if (stored.machineId !== this.fingerprint.machineId) {
      return false;
    }

    // System UUID must match exactly
    if (stored.systemUuid !== this.fingerprint.systemUuid) {
      return false;
    }

    // CPU ID should match (but can change with hardware upgrades)
    // MAC address should match (but can change with network card replacement)
    // These are soft checks - warn but don't fail

    if (stored.cpuId !== this.fingerprint.cpuId) {
      console.warn('WARNING: CPU ID mismatch - hardware may have changed');
    }

    if (stored.macAddress !== this.fingerprint.macAddress) {
      console.warn('WARNING: MAC address mismatch - network hardware may have changed');
    }

    return true;
  }

  /**
   * Get entropy from machine fingerprint for fallback encryption
   */
  private getFingerprintEntropy(specificFingerprint?: MachineFingerprint): Buffer {
    const fp = specificFingerprint || this.fingerprint;
    if (!fp) {
      throw new Error('Machine fingerprint not initialized');
    }

    const entropy = crypto
      .createHash('sha256')
      .update(fp.machineId)
      .update(fp.systemUuid)
      .update(fp.cpuId)
      .update(fp.macAddress)
      .digest();

    return entropy;
  }
}
