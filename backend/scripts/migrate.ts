#!/usr/bin/env node

/**
 * AUREX Database Migration Runner
 * Executes SQL migration files in sequential order
 * Usage: npm run migrate
 */

import fs from 'fs';
import path from 'path';
import { Pool, type PoolClient } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost/aurex';

interface MigrationFile {
  name: string;
  path: string;
  sequence: number;
}

/**
 * Get all migration files sorted by sequence number
 */
function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = path.join(process.cwd(), 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql') && file.match(/^\d+_/))
    .map((file) => {
      const match = file.match(/^(\d+)_/);
      return {
        name: file,
        path: path.join(migrationsDir, file),
        sequence: parseInt(match?.[1] || '0', 10),
      };
    })
    .sort((a, b) => a.sequence - b.sequence);
}

/**
 * Read migration file content
 */
function readMigrationFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read migration file ${filePath}: ${error}`);
  }
}

/**
 * Create migrations tracking table
 */
async function createMigrationsTable(client: PoolClient): Promise<void> {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await client.query(createTableSQL);
    console.log('✓ Migrations tracking table ready');
  } catch (error) {
    throw new Error(`Failed to create migrations table: ${error}`);
  }
}

/**
 * Record migration execution
 */
async function recordMigration(client: PoolClient, migrationName: string): Promise<void> {
  const insertSQL = `
    INSERT INTO migrations (name) VALUES ($1)
    ON CONFLICT DO NOTHING;
  `;

  try {
    await client.query(insertSQL, [migrationName]);
  } catch (error) {
    throw new Error(`Failed to record migration ${migrationName}: ${error}`);
  }
}

/**
 * Check if migration has been applied
 */
async function hasMigrationBeenApplied(client: PoolClient, migrationName: string): Promise<boolean> {
  try {
    const result = await client.query(
      'SELECT EXISTS (SELECT 1 FROM migrations WHERE name = $1)',
      [migrationName]
    );
    return result.rows[0].exists;
  } catch {
    // migrations table doesn't exist yet
    return false;
  }
}

/**
 * Main migration runner
 */
async function runMigrations(): Promise<void> {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('Starting AUREX database migrations...\n');
    console.log(`Database: ${DATABASE_URL}\n`);

    // Create migrations table
    await createMigrationsTable(client);

    // Get migration files
    const migrations = getMigrationFiles();

    if (migrations.length === 0) {
      console.log('No migration files found.');
      return;
    }

    console.log(`Found ${migrations.length} migration(s)\n`);

    // Execute each migration
    let executedCount = 0;
    for (const migration of migrations) {
      try {
        // Check if already executed
        const alreadyApplied = await hasMigrationBeenApplied(client, migration.name);

        if (alreadyApplied) {
          console.log(`⊘ ${migration.name} (already applied)`);
        } else {
          const sql = readMigrationFile(migration.path);
          await client.query(sql);
          await recordMigration(client, migration.name);
          console.log(`✓ ${migration.name}`);
          executedCount++;
        }
      } catch (error) {
        console.error(`✗ ${migration.name} failed`);
        throw error;
      }
    }

    console.log(`\n${executedCount} new migration(s) applied successfully`);
  } catch (error) {
    console.error('\nMigration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations().then(() => {
  console.log('\nDatabase migration complete!');
  process.exit(0);
});
