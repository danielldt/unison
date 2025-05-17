const db = require('./database');

async function setupDatabase() {
  console.log('Setting up database...');
  
  try {
    // Check if tables exist before trying to modify them
    const tablesExist = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ($1, $2)
    `, [db.TABLES.DUNGEON_PROGRESS, db.TABLES.BALANCE_PARAMETERS]);
    
    const existingTables = tablesExist.rows.map(row => row.table_name);
    
    // 1. Check and modify DUNGEON_PROGRESS table if it exists
    if (existingTables.includes(db.TABLES.DUNGEON_PROGRESS)) {
      try {
        const tableCheck = await db.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1
        `, [db.TABLES.DUNGEON_PROGRESS]);
        
        // Check if we need to alter the table structure
        const columns = tableCheck.rows.map(row => row.column_name);
        
        if (!columns.includes('seed')) {
          console.log('Adding seed column to dungeon_progress table...');
          await db.query(`
            ALTER TABLE ${db.TABLES.DUNGEON_PROGRESS}
            ADD COLUMN seed TEXT
          `);
        }
        
        if (!columns.includes('status')) {
          console.log('Adding status column to dungeon_progress table...');
          await db.query(`
            ALTER TABLE ${db.TABLES.DUNGEON_PROGRESS}
            ADD COLUMN status VARCHAR(20) DEFAULT 'IN_PROGRESS'
          `);
        }
        
        if (!columns.includes('completed_waves')) {
          console.log('Adding completed_waves column to dungeon_progress table...');
          await db.query(`
            ALTER TABLE ${db.TABLES.DUNGEON_PROGRESS}
            ADD COLUMN completed_waves INTEGER DEFAULT 0
          `);
        }
        
        // Check if progress column can be dropped
        if (columns.includes('progress') && columns.includes('seed') && 
            columns.includes('status') && columns.includes('completed_waves')) {
          console.log('Removing deprecated progress column from dungeon_progress table...');
          await db.query(`
            ALTER TABLE ${db.TABLES.DUNGEON_PROGRESS}
            DROP COLUMN IF EXISTS progress
          `);
        }
        
        // Check if dungeon_id column can be dropped
        if (columns.includes('dungeon_id') && columns.includes('seed')) {
          console.log('Removing deprecated dungeon_id column from dungeon_progress table...');
          await db.query(`
            ALTER TABLE ${db.TABLES.DUNGEON_PROGRESS}
            DROP COLUMN IF EXISTS dungeon_id
          `);
        }
      } catch (error) {
        console.error('Error checking/modifying dungeon_progress table:', error);
      }
    } else {
      console.log(`Table ${db.TABLES.DUNGEON_PROGRESS} doesn't exist yet, will be created on startup`);
    }
    
    // 2. Check and modify BALANCE_PARAMETERS table if it exists
    if (existingTables.includes(db.TABLES.BALANCE_PARAMETERS)) {
      try {
        const balanceCheck = await db.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1
        `, [db.TABLES.BALANCE_PARAMETERS]);
        
        // Check if we need to alter the table structure
        const columns = balanceCheck.rows.map(row => row.column_name);
        const dataTypes = balanceCheck.rows.reduce((acc, row) => {
          acc[row.column_name] = row.data_type;
          return acc;
        }, {});
        
        // Fix value column if it's JSONB
        if (columns.includes('value') && dataTypes.value === 'jsonb') {
          console.log('Modifying value column in balance_parameters table...');
          // Create a temporary column
          await db.query(`
            ALTER TABLE ${db.TABLES.BALANCE_PARAMETERS}
            ADD COLUMN value_temp TEXT
          `);
          
          // Copy data, converting JSONB to text
          await db.query(`
            UPDATE ${db.TABLES.BALANCE_PARAMETERS}
            SET value_temp = value::text
          `);
          
          // Drop the JSONB column
          await db.query(`
            ALTER TABLE ${db.TABLES.BALANCE_PARAMETERS}
            DROP COLUMN value
          `);
          
          // Rename the temporary column
          await db.query(`
            ALTER TABLE ${db.TABLES.BALANCE_PARAMETERS}
            RENAME COLUMN value_temp TO value
          `);
          
          // Set the proper type
          await db.query(`
            ALTER TABLE ${db.TABLES.BALANCE_PARAMETERS}
            ALTER COLUMN value TYPE DECIMAL USING (value::decimal)
          `);
        }
        
        // Create default balance parameters if none exist
        const paramsCount = await db.query(`
          SELECT COUNT(*) FROM ${db.TABLES.BALANCE_PARAMETERS}
        `);
        
        if (parseInt(paramsCount.rows[0].count) === 0) {
          console.log('Adding default balance parameters...');
          const defaultParams = [
            { key: 'drop_rate_multiplier', value: 1.0 },
            { key: 'rarity_threshold_adjustment', value: 0.0 },
            { key: 'global_difficulty_modifier', value: 1.0 }
          ];
          
          for (const param of defaultParams) {
            await db.query(`
              INSERT INTO ${db.TABLES.BALANCE_PARAMETERS} 
              (id, parameter_key, value, created_at, updated_at) 
              VALUES ($1, $2, $3, NOW(), NOW())
            `, [require('uuid').v4(), param.key, param.value]);
          }
        }
      } catch (error) {
        console.error('Error checking/modifying balance_parameters table:', error);
      }
    } else {
      console.log(`Table ${db.TABLES.BALANCE_PARAMETERS} doesn't exist yet, will be created on startup`);
    }
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Database setup error:', error);
    throw error;
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  db.initDatabase()
    .then(() => setupDatabase())
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Setup failed:', err);
      process.exit(1);
    });
} else {
  module.exports = setupDatabase;
} 