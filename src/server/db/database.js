/**
 * Database Module
 * PostgreSQL database connection and query methods
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database tables
const TABLES = {
  USERS: 'users',
  CHARACTERS: 'characters',
  INVENTORY: 'inventory',
  DUNGEON_PROGRESS: 'dungeon_progress',
  EVENT: 'events',
  EVENT_PARTICIPATION: 'event_participation',
  BALANCE_PARAMETERS: 'balance_parameters'
};

// Track if we're using mock database
let usingMockDatabase = false;
let mockTables = null;

// Create a connection pool with fallback values
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
console.log(`Using database connection: ${connectionString}`);

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,               // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection not established
  maxUses: 7500,         // Close a connection after it has been used 7500 times
  application_name: 'unison_rpg'
});

// Mock client
const mockClient = {
  query: async (sql, params = []) => {
    console.log(`[MOCK] Query: ${sql}`);
    console.log(`[MOCK] Params: ${JSON.stringify(params)}`);
    
    // Handle transactions
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rowCount: 0, rows: [] };
    }
    
    // Extract table name from query
    const tableMatch = sql.match(/FROM\s+(\w+)/i) || sql.match(/INTO\s+(\w+)/i) || sql.match(/UPDATE\s+(\w+)/i);
    const tableName = tableMatch ? tableMatch[1].toLowerCase() : null;
    
    if (!tableName || !mockTables[tableName]) {
      return { rowCount: 0, rows: [] };
    }
    
    // Handle INSERT
    if (sql.includes('INSERT INTO')) {
      const newRow = {};
      
      // Extract column names from query
      const columnsMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
      if (columnsMatch) {
        const columns = columnsMatch[1].split(',').map(c => c.trim());
        
        // Map params to columns
        columns.forEach((col, index) => {
          if (params[index] !== undefined) {
            newRow[col] = params[index];
          }
        });
        
        // Add timestamp for created_at if not provided
        if (!newRow.created_at) {
          newRow.created_at = new Date().toISOString();
        }
        
        mockTables[tableName].push(newRow);
        return { rowCount: 1, rows: [newRow] };
      }
    }
    
    // Handle SELECT
    if (sql.includes('SELECT')) {
      let filteredRows = [...mockTables[tableName]];
      
      // Apply WHERE conditions if present
      if (sql.includes('WHERE') && params.length > 0) {
        const whereMatch = sql.match(/WHERE\s+([^;]+)/i);
        if (whereMatch) {
          const conditions = whereMatch[1];
          
          // Very basic WHERE handling - just checking first condition
          if (conditions.includes('=')) {
            const column = conditions.split('=')[0].trim().replace(/^\w+\./, '');
            const paramIndex = parseInt(conditions.split('$')[1]) - 1;
            
            if (paramIndex >= 0 && paramIndex < params.length) {
              filteredRows = filteredRows.filter(row => row[column] == params[paramIndex]);
            }
          }
        }
      }
      
      return { rowCount: filteredRows.length, rows: filteredRows };
    }
    
    // Handle UPDATE
    if (sql.includes('UPDATE')) {
      const whereMatch = sql.match(/WHERE\s+([^;]+)/i);
      if (whereMatch && params.length > 0) {
        const conditions = whereMatch[1];
        const column = conditions.split('=')[0].trim().replace(/^\w+\./, '');
        const paramIndex = parseInt(conditions.split('$')[1]) - 1;
        
        // Find index of row to update
        const rowIndex = mockTables[tableName].findIndex(row => row[column] == params[paramIndex]);
        
        if (rowIndex !== -1) {
          // Get column to update
          const setMatch = sql.match(/SET\s+([^=]+)=/i);
          if (setMatch) {
            const updateColumn = setMatch[1].trim();
            // Assuming next param is the value
            mockTables[tableName][rowIndex][updateColumn] = params[0];
          }
          
          return { rowCount: 1, rows: [mockTables[tableName][rowIndex]] };
        }
      }
    }
    
    // Handle DELETE
    if (sql.includes('DELETE')) {
      const whereMatch = sql.match(/WHERE\s+([^;]+)/i);
      if (whereMatch && params.length > 0) {
        const conditions = whereMatch[1];
        const column = conditions.split('=')[0].trim().replace(/^\w+\./, '');
        const paramIndex = parseInt(conditions.split('$')[1]) - 1;
        
        const initialLength = mockTables[tableName].length;
        mockTables[tableName] = mockTables[tableName].filter(row => row[column] != params[paramIndex]);
        
        return { rowCount: initialLength - mockTables[tableName].length, rows: [] };
      }
    }
    
    return { rowCount: 0, rows: [] };
  },
  release: () => {
    console.log('[MOCK] Client released');
  }
};

/**
 * Initialize the database connection and create tables if they don't exist
 * @returns {Promise} - Database connection result
 */
async function initDatabase() {
  console.log("Initializing PostgreSQL database connection...");
  
  try {
    // First connect to the default postgres database to create our database if needed
    const adminPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres',
      ssl: false
    });
    
    const adminClient = await adminPool.connect();
    try {
      // Check if our database exists
      const dbResult = await adminClient.query(
        "SELECT 1 FROM pg_database WHERE datname='unison'"
      );
      
      // Create database if it doesn't exist
      if (dbResult.rowCount === 0) {
        console.log("Creating database 'unison'...");
        await adminClient.query('CREATE DATABASE unison');
        console.log("Database 'unison' created successfully");
      } else {
        console.log("Database 'unison' already exists");
      }
    } finally {
      adminClient.release();
      await adminPool.end();
    }
    
    // Now connect to our application database
    const appPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/unison',
      ssl: false
    });
    
    // Update the pool reference
    Object.assign(pool, appPool);
    
    // Test the connection
    const client = await pool.connect();
    console.log("Successfully connected to PostgreSQL database 'unison'");
    
    // Create tables if they don't exist
    await createTablesIfNotExist(client);
    
    client.release();
    return { connected: true, connectionStartTime: Date.now() };
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
}

/**
 * Create database tables if they don't exist
 * @param {Object} client - Database client
 * @returns {Promise} - Creation result
 */
async function createTablesIfNotExist(client) {
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.USERS} (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login TIMESTAMP,
        settings JSONB DEFAULT '{}'
      )
    `);
    
    // Create characters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.CHARACTERS} (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES ${TABLES.USERS}(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        experience INTEGER NOT NULL DEFAULT 0,
        gold INTEGER NOT NULL DEFAULT 100,
        gems INTEGER NOT NULL DEFAULT 0,
        stats JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_played TIMESTAMP
      )
    `);
    
    // Create inventory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.INVENTORY} (
        id VARCHAR(36) PRIMARY KEY,
        character_id VARCHAR(36) REFERENCES ${TABLES.CHARACTERS}(id) ON DELETE CASCADE,
        items JSONB DEFAULT '[]',
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create dungeon progress table - ensure all required columns are present
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.DUNGEON_PROGRESS} (
        id VARCHAR(36) PRIMARY KEY,
        character_id VARCHAR(36) REFERENCES ${TABLES.CHARACTERS}(id) ON DELETE CASCADE,
        seed TEXT,
        status VARCHAR(20) DEFAULT 'IN_PROGRESS',
        completed_waves INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);
    
    // Create events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.EVENT} (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        event_data JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create event participation table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.EVENT_PARTICIPATION} (
        id VARCHAR(36) PRIMARY KEY,
        event_id VARCHAR(36) REFERENCES ${TABLES.EVENT}(id) ON DELETE CASCADE,
        character_id VARCHAR(36) REFERENCES ${TABLES.CHARACTERS}(id) ON DELETE CASCADE,
        participation_data JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);
    
    // Create balance parameters table with correct data type
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.BALANCE_PARAMETERS} (
        id VARCHAR(36) PRIMARY KEY,
        parameter_key VARCHAR(100) UNIQUE NOT NULL,
        value DECIMAL NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);
    
    // Insert default balance parameters if the table is empty
    const paramsCount = await client.query(
      `SELECT COUNT(*) FROM ${TABLES.BALANCE_PARAMETERS}`
    );
    
    if (parseInt(paramsCount.rows[0].count) === 0) {
      console.log("Adding default balance parameters...");
      
      const defaultParams = [
        { key: 'drop_rate_multiplier', value: 1.0 },
        { key: 'rarity_threshold_adjustment', value: 0.0 },
        { key: 'global_difficulty_modifier', value: 1.0 }
      ];
      
      for (const param of defaultParams) {
        await client.query(
          `INSERT INTO ${TABLES.BALANCE_PARAMETERS} (id, parameter_key, value, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())`,
          [require('uuid').v4(), param.key, param.value]
        );
      }
    }
    
    console.log("Database tables created or already exist");
    
    return true;
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
}

/**
 * Execute a database query
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Object} - Query result
 */
async function query(sql, params = []) {
  try {
    if (usingMockDatabase) {
      return await mockClient.query(sql, params);
    }
    
    const result = await pool.query(sql, params);
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

/**
 * Get a database client for transaction operations
 * @returns {Object} - Database client
 */
async function getClient() {
  if (usingMockDatabase) {
    return mockClient;
  }
  return await pool.connect();
}

module.exports = {
  initDatabase,
  query,
  pool,
  TABLES,
  getClient
}; 