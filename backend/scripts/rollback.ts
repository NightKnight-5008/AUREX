#!/usr/bin/env node

/**
 * AUREX Database Rollback Script
 * Rolls back database to previous state
 * Usage: npm run rollback
 *
 * WARNING: This script will drop all tables and data!
 * Only use in development environments.
 */

import fs from 'fs';
import path from 'path';
import { Pool, type PoolClient } from 'pg';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost/aurex';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Prompt user for confirmation
 */
function promptConfirmation(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Drop all triggers
 */
async function dropTriggers(client: PoolClient): Promise<void> {
  const triggersSQL = `
    SELECT trigger_name, event_object_schema, event_object_table
    FROM information_schema.triggers
    WHERE event_object_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY trigger_name;
  `;

  const triggers = await client.query(triggersSQL);

  for (const trigger of triggers.rows) {
    const dropSQL = `DROP TRIGGER IF EXISTS ${trigger.trigger_name} ON ${trigger.event_object_schema}.${trigger.event_object_table} CASCADE;`;
    try {
      await client.query(dropSQL);
      console.log(`  Dropped trigger: ${trigger.trigger_name}`);
    } catch (error) {
      console.warn(`  Warning: Could not drop trigger ${trigger.trigger_name}`);
    }
  }
}

/**
 * Drop all functions
 */
async function dropFunctions(client: PoolClient): Promise<void> {
  const functionsSQL = `
    SELECT routine_name, routine_schema
    FROM information_schema.routines
    WHERE routine_schema NOT IN ('pg_catalog', 'information_schema')
    AND routine_type = 'FUNCTION'
    ORDER BY routine_name;
  `;

  const functions = await client.query(functionsSQL);

  for (const fn of functions.rows) {
    const dropSQL = `DROP FUNCTION IF EXISTS ${fn.routine_schema}.${fn.routine_name}() CASCADE;`;
    try {
      await client.query(dropSQL);
      console.log(`  Dropped function: ${fn.routine_name}`);
    } catch (error) {
      console.warn(`  Warning: Could not drop function ${fn.routine_name}`);
    }
  }
}

/**
 * Drop all tables
 */
async function dropTables(client: PoolClient): Promise<void> {
  const tablesSQL = `
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  const tables = await client.query(tablesSQL);

  for (const table of tables.rows) {
    const dropSQL = `DROP TABLE IF EXISTS ${table.table_name} CASCADE;`;
    try {
      await client.query(dropSQL);
      console.log(`  Dropped table: ${table.table_name}`);
    } catch (error) {
      console.warn(`  Warning: Could not drop table ${table.table_name}`);
    }
  }
}

/**
 * Main rollback function
 */
async function rollbackDatabase(): Promise<void> {
  // Safety check - warn in production
  if (NODE_ENV === 'production') {
    console.error('\n[ERROR] Cannot rollback in production environment!');
    console.error('Set NODE_ENV=development to enable rollback.\n');
    process.exit(1);
  }

  // Confirm with user
  console.log('\n' + '='.repeat(70));
  console.log('AUREX DATABASE ROLLBACK');
  console.log('='.repeat(70));
  console.log(`\nDatabase: ${DATABASE_URL}`);
  console.log('Environment: ' + NODE_ENV);
  console.log('\nWARNING: This will DELETE all tables, functions, and triggers!');
  console.log('This operation CANNOT be undone.\n');

  const confirmed = await promptConfirmation('Type "yes" to confirm rollback: ');

  if (!confirmed) {
    console.log('Rollback cancelled.');
    process.exit(0);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('\nStarting rollback...\n');

    // Drop triggers first (they depend on tables and functions)
    console.log('Dropping triggers...');
    await dropTriggers(client);

    // Drop functions (some may depend on tables)
    console.log('\nDropping functions...');
    await dropFunctions(client);

    // Drop tables
    console.log('\nDropping tables...');
    await dropTables(client);

    // Clear migrations table
    try {
      await client.query('DROP TABLE IF EXISTS migrations CASCADE;');
      console.log('  Dropped migrations table');
    } catch (error) {
      console.warn('  Warning: Could not drop migrations table');
    }

    console.log('\n' + '='.repeat(70));
    console.log('Rollback complete! Database is now empty.');
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('\nRollback failed:');
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run rollback
rollbackDatabase();
