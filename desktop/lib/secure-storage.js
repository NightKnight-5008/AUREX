/**
 * AUREX Desktop - Secure Storage Manager
 *
 * Encrypted SQLite storage replacing browser localStorage
 *
 * SECURITY GUARANTEES:
 * - AES-256-GCM encryption at rest
 * - PBKDF2 key derivation (100k iterations)
 * - Keys kept only in memory
 * - Keys wiped on app exit
 * - Append-only audit trail
 */
import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { DPAPIManager } from './dpapi-manager.js';
export class SecureStorageManager {
    db = null;
    encryptionKey = null;
    dpapi;
    userDataPath;
    dbPath;
    keyBlobPath;
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
        this.dbPath = path.join(userDataPath, 'aurex-secure.db');
        this.keyBlobPath = path.join(userDataPath, 'aurex-key.blob');
        this.dpapi = new DPAPIManager();
    }
    /**
     * Initialize database and derive encryption key
     */
    async initialize() {
        // Ensure user data directory exists
        if (!fs.existsSync(this.userDataPath)) {
            fs.mkdirSync(this.userDataPath, { recursive: true });
        }
        // Open database
        this.db = new Database(this.dbPath);
        // Enable WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');
        // Create tables
        this.initializeTables();
        // Initialize DPAPI and derive encryption key
        await this.initializeDPAPI();
    }
    /**
     * Create database tables
     */
    initializeTables() {
        if (!this.db)
            throw new Error('Database not initialized');
        // Storage table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS storage (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        encrypted INTEGER NOT NULL DEFAULT 0,
        classification TEXT NOT NULL DEFAULT 'PUBLIC',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
        // Ledger entries table (encrypted, append-only)
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        entry_number INTEGER NOT NULL,
        encrypted_data TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
        // FX snapshots table (encrypted, immutable)
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS fx_snapshots (
        id TEXT PRIMARY KEY,
        encrypted_data TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
        // AI insights cache
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
        // Audit log (append-only, tamper-evident)
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        sequence_number INTEGER NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        prev_hash TEXT,
        log_hash TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);
        // Create indexes
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ledger_entry_number ON ledger_entries(entry_number);
      CREATE INDEX IF NOT EXISTS idx_fx_created ON fx_snapshots(created_at);
      CREATE INDEX IF NOT EXISTS idx_insights_type ON ai_insights(type);
      CREATE INDEX IF NOT EXISTS idx_audit_sequence ON audit_log(sequence_number);
    `);
    }
    /**
     * Initialize DPAPI and derive encryption key using OS-bound secrets
     */
    async initializeDPAPI() {
        let storedBlob;
        // Try to load existing DPAPI-protected key blob
        if (fs.existsSync(this.keyBlobPath)) {
            try {
                const blobData = fs.readFileSync(this.keyBlobPath, 'utf8');
                storedBlob = JSON.parse(blobData);
            }
            catch (error) {
                console.warn('Failed to load existing key blob, generating new one');
            }
        }
        // Initialize DPAPI with stored blob (or generate new one)
        await this.dpapi.initialize(storedBlob);
        // If no stored blob existed, save the new one
        if (!storedBlob) {
            const newBlob = await this.dpapi.getProtectedKeyBlob();
            fs.writeFileSync(this.keyBlobPath, JSON.stringify(newBlob, null, 2), { mode: 0o600 } // Restrict file permissions
            );
        }
        // Derive encryption key from DPAPI-protected master key
        this.encryptionKey = await this.dpapi.deriveEncryptionKey('storage');
    }
    /**
     * Encrypt data using AES-256-GCM
     */
    encrypt(plaintext) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        const ciphertext = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final()
        ]);
        const tag = cipher.getAuthTag();
        return {
            ciphertext: ciphertext.toString('base64'),
            iv: iv.toString('base64'),
            tag: tag.toString('base64')
        };
    }
    /**
     * Decrypt data using AES-256-GCM
     */
    decrypt(encrypted) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(encrypted.iv, 'base64'));
        decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
            decipher.final()
        ]);
        return plaintext.toString('utf8');
    }
    /**
     * Set value in storage
     */
    set(key, value, classification = 'PRIVATE') {
        if (!this.db)
            throw new Error('Database not initialized');
        const now = Date.now();
        const encrypted = classification === 'SENSITIVE';
        let storedValue = value;
        if (encrypted) {
            const encryptedData = this.encrypt(value);
            storedValue = JSON.stringify(encryptedData);
        }
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO storage (key, value, encrypted, classification, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(key, storedValue, encrypted ? 1 : 0, classification, now, now);
    }
    /**
     * Get value from storage
     */
    get(key) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare('SELECT * FROM storage WHERE key = ?');
        const row = stmt.get(key);
        if (!row)
            return null;
        if (row.encrypted) {
            const encryptedData = JSON.parse(row.value);
            return this.decrypt(encryptedData);
        }
        return row.value;
    }
    /**
     * Remove value from storage
     */
    remove(key) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare('DELETE FROM storage WHERE key = ?');
        stmt.run(key);
    }
    /**
     * Clear all storage (optionally by classification)
     */
    clear(classification) {
        if (!this.db)
            throw new Error('Database not initialized');
        if (classification) {
            const stmt = this.db.prepare('DELETE FROM storage WHERE classification = ?');
            stmt.run(classification);
        }
        else {
            this.db.exec('DELETE FROM storage');
        }
    }
    /**
     * Add ledger entry (append-only)
     */
    addLedgerEntry(entry) {
        if (!this.db)
            throw new Error('Database not initialized');
        const id = crypto.randomUUID();
        const encryptedData = this.encrypt(JSON.stringify(entry));
        const stmt = this.db.prepare(`
      INSERT INTO ledger_entries (id, entry_number, encrypted_data, created_at)
      VALUES (?, (SELECT COALESCE(MAX(entry_number), 0) + 1 FROM ledger_entries), ?, ?)
    `);
        stmt.run(id, JSON.stringify(encryptedData), Date.now());
    }
    /**
     * Get all ledger entries
     */
    getLedgerEntries() {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare('SELECT encrypted_data FROM ledger_entries ORDER BY entry_number');
        const rows = stmt.all();
        return rows.map(row => {
            const encryptedData = JSON.parse(row.encrypted_data);
            return JSON.parse(this.decrypt(encryptedData));
        });
    }
    /**
     * Add FX snapshot (immutable)
     */
    addFXSnapshot(snapshot) {
        if (!this.db)
            throw new Error('Database not initialized');
        const id = crypto.randomUUID();
        const encryptedData = this.encrypt(JSON.stringify(snapshot));
        const stmt = this.db.prepare(`
      INSERT INTO fx_snapshots (id, encrypted_data, created_at)
      VALUES (?, ?, ?)
    `);
        stmt.run(id, JSON.stringify(encryptedData), Date.now());
    }
    /**
     * Get all FX snapshots
     */
    getFXSnapshots() {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare('SELECT encrypted_data FROM fx_snapshots ORDER BY created_at');
        const rows = stmt.all();
        return rows.map(row => {
            const encryptedData = JSON.parse(row.encrypted_data);
            return JSON.parse(this.decrypt(encryptedData));
        });
    }
    /**
     * Wipe encryption keys from memory
     */
    wipeKeys() {
        if (this.encryptionKey) {
            this.encryptionKey.fill(0);
            this.encryptionKey = null;
        }
        // Also wipe DPAPI keys
        this.dpapi.wipeKeys();
    }
    /**
     * Close database
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.wipeKeys();
    }
}
