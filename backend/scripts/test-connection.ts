#!/usr/bin/env node

/**
 * Test database connection
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function testConnection(): Promise<void> {
  console.log('Testing database connection...\n');
  console.log('DATABASE_URL:', DATABASE_URL ? 'Set' : 'Not set');
  
  if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set in .env file');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const client = await pool.connect();
    console.log('✓ Connected to database successfully!');
    
    const result = await client.query('SELECT version()');
    console.log('\nPostgreSQL version:');
    console.log(result.rows[0].version);
    
    client.release();
  } catch (error) {
    console.error('✗ Connection failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection().then(() => {
  console.log('\nConnection test complete!');
  process.exit(0);
});
