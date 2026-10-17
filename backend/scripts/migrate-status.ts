#!/usr/bin/env node

/**
 * AUREX Database Migration Status
 * Shows which migrations have been applied
 * Usage: npm run migrate:status
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost/aurex';

async function showMigrationStatus(): Promise<void> {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('AUREX Database Migration Status\n');
    console.log(`Database: ${DATABASE_URL}\n`);

    // Check if migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'migrations'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('No migrations have been run yet.');
      console.log('Run "npm run migrate" to apply migrations.');
      return;
    }

    // Get applied migrations
    const result = await pool.query(`
      SELECT name, executed_at 
      FROM migrations 
      ORDER BY executed_at ASC
    `);

    if (result.rows.length === 0) {
      console.log('No migrations have been applied yet.');
    } else {
      console.log(`${result.rows.length} migration(s) applied:\n`);
      result.rows.forEach((row, index) => {
        const date = new Date(row.executed_at).toLocaleString();
        console.log(`${index + 1}. ${row.name}`);
        console.log(`   Applied: ${date}\n`);
      });
    }
  } catch (error) {
    console.error('Error checking migration status:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

showMigrationStatus().then(() => {
  process.exit(0);
});
