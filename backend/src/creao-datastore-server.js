/**
 * Creao Platform DataStore API-Compatible Server
 *
 * This server implements the same API endpoints as the configured AI_API_BASE_URL
 * but stores data in a local PostgreSQL database instead.
 *
 * The frontend ORM files can use this server by changing BASE_URL in client.ts
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const app = express();
const PORT = process.env.DATASTORE_PORT || 3002;

// PostgreSQL connection pool
let pool = null;

function initializePool() {
  if (pool) return pool;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Initialize database schema
async function initializeDatabase() {
  const pool = initializePool();

  try {
    console.log('🔧 Initializing Creao-compatible database schema...');

    // Create main data storage table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_store (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        namespace VARCHAR(255) NOT NULL,
        entity_name VARCHAR(255) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        entity_version VARCHAR(255) NOT NULL,
        task_id VARCHAR(255) NOT NULL,
        data_creator VARCHAR(255),
        data_updater VARCHAR(255),
        create_time BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        update_time BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        structured_data JSONB NOT NULL,
        indexes JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(namespace, entity_name, indexes)
      );
    `);

    // Create indexes for fast querying
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_data_store_namespace ON data_store(namespace);
      CREATE INDEX IF NOT EXISTS idx_data_store_entity_name ON data_store(entity_name);
      CREATE INDEX IF NOT EXISTS idx_data_store_task_id ON data_store(task_id);
      CREATE INDEX IF NOT EXISTS idx_data_store_indexes_gin ON data_store USING GIN (indexes);
      CREATE INDEX IF NOT EXISTS idx_data_store_structured_gin ON data_store USING GIN (structured_data);
      CREATE INDEX IF NOT EXISTS idx_data_store_composite ON data_store(namespace, entity_name, task_id);
    `);

    // Update trigger
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_data_store_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        NEW.update_time = EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_data_store_timestamp ON data_store;
      CREATE TRIGGER trigger_update_data_store_timestamp
        BEFORE UPDATE ON data_store
        FOR EACH ROW
        EXECUTE FUNCTION update_data_store_timestamp();
    `);

    console.log('✅ Creao-compatible database schema initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    throw error;
  }
}

// Helper: Convert Value array to object
function valuesToObject(values) {
  if (!Array.isArray(values)) return {};

  const result = {};
  for (const value of values) {
    if (!value.name) continue;

    switch (value.type) {
      case 1: result[value.name] = value.string || ''; break;
      case 2: result[value.name] = value.number || 0; break;
      case 3: result[value.name] = value.boolean || false; break;
      case 100: result[value.name] = value.enumeration || 0; break;
      case 101: result[value.name] = (value.array || []).map(v => valuesToObject([v])); break;
      case 102:
      case 103: result[value.name] = valuesToObject(value.object || []); break;
      default: result[value.name] = value.string || '';
    }
  }

  return result;
}

// Helper: Convert object to Value array
function objectToValues(obj) {
  if (!obj || typeof obj !== 'object') return [];

  const values = [];
  for (const [key, val] of Object.entries(obj)) {
    const value = { name: key, object: [], array: [] };

    if (typeof val === 'string') {
      value.type = 1;
      value.string = val;
    } else if (typeof val === 'number') {
      value.type = 2;
      value.number = val;
    } else if (typeof val === 'boolean') {
      value.type = 3;
      value.boolean = val;
    } else if (Array.isArray(val)) {
      value.type = 101;
      value.array = val.map(item => {
        if (typeof item === 'object') {
          return { type: 102, object: objectToValues(item), array: [] };
        }
        return { type: 1, string: String(item), object: [], array: [] };
      });
    } else if (typeof val === 'object' && val !== null) {
      value.type = 102;
      value.object = objectToValues(val);
    } else {
      value.type = 1;
      value.string = String(val || '');
    }

    values.push(value);
  }

  return values;
}

// Helper: Build index JSON from request
function buildIndexJson(index) {
  if (!index || !index.fields || !index.values) return {};

  const indexJson = {};
  for (let i = 0; i < index.fields.length; i++) {
    const field = index.fields[i];
    const value = index.values[i];

    if (value) {
      switch (value.type) {
        case 1: indexJson[field] = value.string; break;
        case 2: indexJson[field] = value.number; break;
        case 3: indexJson[field] = value.boolean; break;
        case 100: indexJson[field] = value.enumeration; break;
        default: indexJson[field] = value.string || '';
      }
    }
  }

  return indexJson;
}

// ============================================================================
// CREAO PLATFORM API ENDPOINTS
// ============================================================================

// POST /data/store/v1/all - Get all records for an entity
app.post('/data/store/v1/all', async (req, res) => {
  try {
    const { namespace, name, version, task, format } = req.body;

    const result = await pool.query(
      `SELECT * FROM data_store
       WHERE namespace = $1 AND entity_name = $2 AND entity_version = $3 AND task_id = $4
       ORDER BY create_time DESC`,
      [namespace, name, version, task]
    );

    const values = result.rows.map(row => ({
      structured: format?.structured ? row.structured_data : undefined,
      serialized: format?.serialized ? JSON.stringify(valuesToObject(row.structured_data)) : undefined
    }));

    res.json({
      code: 0,
      data: { values, page: { number: 0, size: values.length, total: values.length } }
    });
  } catch (error) {
    console.error('Error in /all:', error);
    res.status(500).json({ code: 1, error: error.message });
  }
});

// POST /data/store/v1/insert - Insert new records
app.post('/data/store/v1/insert', async (req, res) => {
  try {
    const { namespace, name, version, task, data, batch, upsert, format, id: userId } = req.body;

    const recordsToInsert = batch || (data ? [data] : []);
    const insertedRecords = [];

    for (const record of recordsToInsert) {
      const structuredData = record.structured || [];
      const dataObj = valuesToObject(structuredData);

      // Build index from structured data (id, email, etc.)
      const indexes = {};
      for (const field of structuredData) {
        if (field.name === 'id' || field.name === 'email' || field.name === 'auth_token' || field.name === 'phone_number') {
          indexes[field.name] = field.string || field.number || field.boolean;
        }
      }

      const currentTime = Math.floor(Date.now() / 1000);

      // Add system fields if not present
      if (!dataObj.id) dataObj.id = '';
      if (!dataObj.data_creator) dataObj.data_creator = userId || '';
      if (!dataObj.data_updater) dataObj.data_updater = userId || '';
      if (!dataObj.create_time) dataObj.create_time = currentTime.toString();
      if (!dataObj.update_time) dataObj.update_time = currentTime.toString();

      const fullStructuredData = objectToValues(dataObj);

      if (upsert && indexes.id) {
        // Upsert logic
        const existing = await pool.query(
          `SELECT * FROM data_store WHERE namespace = $1 AND entity_name = $2 AND indexes @> $3`,
          [namespace, name, JSON.stringify({ id: indexes.id })]
        );

        if (existing.rows.length > 0) {
          await pool.query(
            `UPDATE data_store SET structured_data = $1, data_updater = $2, indexes = $3
             WHERE id = $4`,
            [JSON.stringify(fullStructuredData), userId, JSON.stringify(indexes), existing.rows[0].id]
          );

          insertedRecords.push({ structured: fullStructuredData });
        } else {
          await pool.query(
            `INSERT INTO data_store (namespace, entity_name, entity_id, entity_version, task_id, data_creator, data_updater, create_time, update_time, structured_data, indexes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [namespace, name, name, version, task, userId, userId, currentTime, currentTime, JSON.stringify(fullStructuredData), JSON.stringify(indexes)]
          );

          insertedRecords.push({ structured: fullStructuredData });
        }
      } else {
        await pool.query(
          `INSERT INTO data_store (namespace, entity_name, entity_id, entity_version, task_id, data_creator, data_updater, create_time, update_time, structured_data, indexes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [namespace, name, name, version, task, userId, userId, currentTime, currentTime, JSON.stringify(fullStructuredData), JSON.stringify(indexes)]
        );

        insertedRecords.push({ structured: fullStructuredData });
      }
    }

    res.json({
      code: 0,
      data: { values: insertedRecords }
    });
  } catch (error) {
    console.error('Error in /insert:', error);
    res.status(500).json({ code: 1, error: error.message });
  }
});

// POST /data/store/v1/get - Get record by index
app.post('/data/store/v1/get', async (req, res) => {
  try {
    const { namespace, name, version, task, index, ids, format } = req.body;

    let result;

    if (ids && ids.length > 0) {
      // Get by IDs
      result = await pool.query(
        `SELECT * FROM data_store
         WHERE namespace = $1 AND entity_name = $2 AND indexes->>'id' = ANY($3)`,
        [namespace, name, ids]
      );
    } else if (index) {
      // Get by index
      const indexJson = buildIndexJson(index);
      result = await pool.query(
        `SELECT * FROM data_store
         WHERE namespace = $1 AND entity_name = $2 AND indexes @> $3`,
        [namespace, name, JSON.stringify(indexJson)]
      );
    } else {
      result = { rows: [] };
    }

    const values = result.rows.map(row => ({
      structured: format?.structured ? row.structured_data : undefined,
      serialized: format?.serialized ? JSON.stringify(valuesToObject(row.structured_data)) : undefined
    }));

    res.json({
      code: 0,
      data: { values }
    });
  } catch (error) {
    console.error('Error in /get:', error);
    res.status(500).json({ code: 1, error: error.message });
  }
});

// POST /data/store/v1/set - Update record
app.post('/data/store/v1/set', async (req, res) => {
  try {
    const { namespace, name, index, data, format, id: userId } = req.body;

    const structuredData = data.structured || [];
    const dataObj = valuesToObject(structuredData);
    dataObj.data_updater = userId || '';
    dataObj.update_time = Math.floor(Date.now() / 1000).toString();

    const fullStructuredData = objectToValues(dataObj);
    const indexJson = buildIndexJson(index);

    await pool.query(
      `UPDATE data_store
       SET structured_data = $1, data_updater = $2
       WHERE namespace = $3 AND entity_name = $4 AND indexes @> $5`,
      [JSON.stringify(fullStructuredData), userId, namespace, name, JSON.stringify(indexJson)]
    );

    res.json({
      code: 0,
      data: { values: [{ structured: fullStructuredData }] }
    });
  } catch (error) {
    console.error('Error in /set:', error);
    res.status(500).json({ code: 1, error: error.message });
  }
});

// POST /data/store/v1/delete - Delete record
app.post('/data/store/v1/delete', async (req, res) => {
  try {
    const { namespace, name, index, ids } = req.body;

    if (ids && ids.length > 0) {
      await pool.query(
        `DELETE FROM data_store
         WHERE namespace = $1 AND entity_name = $2 AND indexes->>'id' = ANY($3)`,
        [namespace, name, ids]
      );
    } else if (index) {
      const indexJson = buildIndexJson(index);
      await pool.query(
        `DELETE FROM data_store
         WHERE namespace = $1 AND entity_name = $2 AND indexes @> $3`,
        [namespace, name, JSON.stringify(indexJson)]
      );
    }

    res.json({ code: 0, data: {} });
  } catch (error) {
    console.error('Error in /delete:', error);
    res.status(500).json({ code: 1, error: error.message });
  }
});

// POST /data/store/v1/list - List records with filtering
app.post('/data/store/v1/list', async (req, res) => {
  try {
    const { namespace, name, version, task, filter, sort, paginate, format } = req.body;

    let query = `SELECT * FROM data_store WHERE namespace = $1 AND entity_name = $2`;
    const params = [namespace, name];

    // Apply pagination
    const page = paginate || { number: 0, size: 50 };
    const offset = page.number * page.size;

    query += ` ORDER BY create_time DESC LIMIT $3 OFFSET $4`;
    params.push(page.size, offset);

    const result = await pool.query(query, params);

    const values = result.rows.map(row => ({
      structured: format?.structured ? row.structured_data : undefined,
      serialized: format?.serialized ? JSON.stringify(valuesToObject(row.structured_data)) : undefined
    }));

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM data_store WHERE namespace = $1 AND entity_name = $2`,
      [namespace, name]
    );

    res.json({
      code: 0,
      data: {
        values,
        page: {
          number: page.number,
          size: page.size,
          total: parseInt(countResult.rows[0].count)
        }
      }
    });
  } catch (error) {
    console.error('Error in /list:', error);
    res.status(500).json({ code: 1, error: error.message });
  }
});

// POST /data/store/v1/purge - Delete all records for entity
app.post('/data/store/v1/purge', async (req, res) => {
  try {
    const { namespace, name } = req.body;

    await pool.query(
      `DELETE FROM data_store WHERE namespace = $1 AND entity_name = $2`,
      [namespace, name]
    );

    res.json({ code: 0, data: {} });
  } catch (error) {
    console.error('Error in /purge:', error);
    res.status(500).json({ code: 1, error: error.message });
  }
});

// POST /data/store/v1/mget - Multi-get
app.post('/data/store/v1/mget', async (req, res) => {
  try {
    const { namespace, name, indexes, format } = req.body;

    const values = [];
    for (const index of indexes || []) {
      const indexJson = buildIndexJson(index);
      const result = await pool.query(
        `SELECT * FROM data_store
         WHERE namespace = $1 AND entity_name = $2 AND indexes @> $3`,
        [namespace, name, JSON.stringify(indexJson)]
      );

      if (result.rows.length > 0) {
        values.push({
          structured: format?.structured ? result.rows[0].structured_data : undefined,
          serialized: format?.serialized ? JSON.stringify(valuesToObject(result.rows[0].structured_data)) : undefined
        });
      }
    }

    res.json({ code: 0, data: { values } });
  } catch (error) {
    console.error('Error in /mget:', error);
    res.status(500).json({ code: 1, error: error.message });
  }
});

// POST /data/store/v1/mset - Multi-set
app.post('/data/store/v1/mset', async (req, res) => {
  try {
    const { namespace, name, indexes, data: dataArray, format, id: userId } = req.body;

    const values = [];
    for (let i = 0; i < (indexes || []).length; i++) {
      const index = indexes[i];
      const data = dataArray[i];

      const structuredData = data.structured || [];
      const dataObj = valuesToObject(structuredData);
      dataObj.data_updater = userId || '';
      dataObj.update_time = Math.floor(Date.now() / 1000).toString();

      const fullStructuredData = objectToValues(dataObj);
      const indexJson = buildIndexJson(index);

      await pool.query(
        `UPDATE data_store
         SET structured_data = $1, data_updater = $2
         WHERE namespace = $3 AND entity_name = $4 AND indexes @> $5`,
        [JSON.stringify(fullStructuredData), userId, namespace, name, JSON.stringify(indexJson)]
      );

      values.push({ structured: fullStructuredData });
    }

    res.json({ code: 0, data: { values } });
  } catch (error) {
    console.error('Error in /mset:', error);
    res.status(500).json({ code: 1, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Creao DataStore API (PostgreSQL)', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Creao-Compatible DataStore Server`);
      console.log(`📡 Running on: http://0.0.0.0:${PORT}`);
      console.log(`🌐 Accessible at: http://localhost:${PORT}`);
      console.log(`\n📋 Creao Platform API Endpoints:`);
      console.log(`   POST /data/store/v1/all`);
      console.log(`   POST /data/store/v1/insert`);
      console.log(`   POST /data/store/v1/get`);
      console.log(`   POST /data/store/v1/set`);
      console.log(`   POST /data/store/v1/delete`);
      console.log(`   POST /data/store/v1/list`);
      console.log(`   POST /data/store/v1/purge`);
      console.log(`   POST /data/store/v1/mget`);
      console.log(`   POST /data/store/v1/mset`);
      console.log(`   GET  /health`);
      console.log(`\n✅ Using PostgreSQL: ${process.env.DATABASE_URL?.split('@')[1] || 'configured'}`);
      console.log(`⚡ Ready to serve ORM requests!\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n Shutting down gracefully...');
  if (pool) await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (pool) await pool.end();
  process.exit(0);
});
