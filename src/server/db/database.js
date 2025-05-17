const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/unison_legends',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database tables based on schema defined in the GDD
const TABLES = {
  USERS: 'users',
  CHARACTERS: 'characters',
  INVENTORY: 'inventory',
  DUNGEON_PROGRESS: 'dungeon_progress',
  EVENT: 'event',
  EVENT_PARTICIPATION: 'event_participation',
  BALANCE_PARAMETERS: 'balance_parameters',
  METRICS_TIME_SERIES: 'metrics_time_series',
  ANOMALY_DETECTION: 'anomaly_detection',
  PVP_MATCHES: 'pvp_matches'
};

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.USERS} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
      )
    `);
    
    // Characters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.CHARACTERS} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES ${TABLES.USERS}(id) ON DELETE CASCADE,
        level INTEGER NOT NULL DEFAULT 1,
        experience INTEGER NOT NULL DEFAULT 0,
        gold INTEGER NOT NULL DEFAULT 100,
        gems INTEGER NOT NULL DEFAULT 0,
        stats JSONB NOT NULL DEFAULT '{"str": 1, "int": 1, "agi": 1, "dex": 1, "luk": 1}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_played TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Inventory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.INVENTORY} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        character_id UUID REFERENCES ${TABLES.CHARACTERS}(id) ON DELETE CASCADE,
        items JSONB NOT NULL DEFAULT '[]',
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Dungeon Progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.DUNGEON_PROGRESS} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        character_id UUID REFERENCES ${TABLES.CHARACTERS}(id) ON DELETE CASCADE,
        seed VARCHAR(100) NOT NULL,
        completed_waves INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.EVENT} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
        parameters JSONB NOT NULL DEFAULT '{}',
        rewards JSONB NOT NULL DEFAULT '[]'
      )
    `);
    
    // Event Participation table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.EVENT_PARTICIPATION} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES ${TABLES.EVENT}(id) ON DELETE CASCADE,
        character_id UUID REFERENCES ${TABLES.CHARACTERS}(id) ON DELETE CASCADE,
        join_time TIMESTAMP NOT NULL DEFAULT NOW(),
        score INTEGER NOT NULL DEFAULT 0,
        rewards_claimed BOOLEAN NOT NULL DEFAULT FALSE,
        last_activity TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Balance Parameters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.BALANCE_PARAMETERS} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parameter_key VARCHAR(100) UNIQUE NOT NULL,
        value DOUBLE PRECISION NOT NULL,
        min_value DOUBLE PRECISION NOT NULL,
        max_value DOUBLE PRECISION NOT NULL,
        default_value DOUBLE PRECISION NOT NULL,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
        description TEXT,
        category VARCHAR(50) NOT NULL
      )
    `);
    
    // Metrics Time Series table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.METRICS_TIME_SERIES} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_key VARCHAR(100) NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        value DOUBLE PRECISION NOT NULL,
        sample_size INTEGER NOT NULL DEFAULT 1
      )
    `);
    
    // Anomaly Detection table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.ANOMALY_DETECTION} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        character_id UUID REFERENCES ${TABLES.CHARACTERS}(id) ON DELETE CASCADE,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        metric_key VARCHAR(100) NOT NULL,
        expected_value DOUBLE PRECISION NOT NULL,
        actual_value DOUBLE PRECISION NOT NULL,
        z_score DOUBLE PRECISION NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'FLAGGED'
      )
    `);
    
    // PVP Matches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLES.PVP_MATCHES} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        winner_id UUID REFERENCES ${TABLES.CHARACTERS}(id) ON DELETE SET NULL,
        loser_id UUID REFERENCES ${TABLES.CHARACTERS}(id) ON DELETE SET NULL,
        match_type VARCHAR(50) NOT NULL DEFAULT 'duel',
        result_reason VARCHAR(50) NOT NULL,
        match_date TIMESTAMP NOT NULL DEFAULT NOW(),
        match_details JSONB NOT NULL DEFAULT '{}'
      )
    `);
    
    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON ${TABLES.USERS}(username)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON ${TABLES.USERS}(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_status ON ${TABLES.USERS}(status)`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_characters_user_id ON ${TABLES.CHARACTERS}(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_characters_level ON ${TABLES.CHARACTERS}(level)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_characters_last_played ON ${TABLES.CHARACTERS}(last_played)`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_inventory_character_id ON ${TABLES.INVENTORY}(character_id)`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dungeon_progress_character_id ON ${TABLES.DUNGEON_PROGRESS}(character_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dungeon_progress_status ON ${TABLES.DUNGEON_PROGRESS}(status)`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_event_type ON ${TABLES.EVENT}(event_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_event_status ON ${TABLES.EVENT}(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_event_timerange ON ${TABLES.EVENT}(start_time, end_time)`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_event_participation_composite ON ${TABLES.EVENT_PARTICIPATION}(event_id, character_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_event_participation_score ON ${TABLES.EVENT_PARTICIPATION}(score)`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_balance_parameter_category ON ${TABLES.BALANCE_PARAMETERS}(category)`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_metrics_composite ON ${TABLES.METRICS_TIME_SERIES}(metric_key, timestamp)`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_anomaly_character_id ON ${TABLES.ANOMALY_DETECTION}(character_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_anomaly_status ON ${TABLES.ANOMALY_DETECTION}(status)`);
    
    // Add index for PVP Matches (after other indexes)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pvp_matches_winner ON ${TABLES.PVP_MATCHES}(winner_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pvp_matches_loser ON ${TABLES.PVP_MATCHES}(loser_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pvp_matches_date ON ${TABLES.PVP_MATCHES}(match_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pvp_matches_type ON ${TABLES.PVP_MATCHES}(match_type)`);
    
    // Default balance parameters
    await client.query(`
      INSERT INTO ${TABLES.BALANCE_PARAMETERS} (parameter_key, value, min_value, max_value, default_value, description, category)
      VALUES 
      ('drop_rate_multiplier', 1.0, 0.5, 2.0, 1.0, 'Global multiplier for item drop rates', 'ECONOMY'),
      ('rarity_threshold_adjustment', 0.0, -0.1, 0.1, 0.0, 'Adjustment to rarity thresholds', 'ECONOMY'),
      ('global_difficulty_modifier', 1.0, 0.5, 1.5, 1.0, 'Global difficulty multiplier', 'COMBAT')
      ON CONFLICT (parameter_key) DO NOTHING
    `);
    
    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  TABLES,
  initializeDatabase,
  query: (text, params) => pool.query(text, params)
}; 