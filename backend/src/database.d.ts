/**
 * Type declarations for database.js module
 */

import type { Pool, PoolClient, QueryResult } from 'pg';

export function initializeDatabase(): Promise<void>;

export function query(text: string, params?: any[]): Promise<QueryResult>;

export function getClient(): Promise<PoolClient>;

export function closePool(): Promise<void>;

declare const pool: Pool;
export default pool;
