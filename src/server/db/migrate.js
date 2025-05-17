const db = require('./database');

async function runMigrations() {
  console.log('Running database migrations...');
  
  try {
    // Start transaction
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // First check if the tables exist
      const tablesExist = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('dungeon_progress', 'balance_parameters', 'inventory')
      `);
      
      const existingTables = tablesExist.rows.map(row => row.table_name);
      
      // Migration 1: Update dungeon_progress table
      if (existingTables.includes('dungeon_progress')) {
        console.log('Checking dungeon_progress table structure...');
        const columnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'dungeon_progress'
        `);
        
        const existingColumns = columnCheck.rows.map(row => row.column_name);
        
        // Add seed column if it doesn't exist
        if (!existingColumns.includes('seed')) {
          console.log('Adding seed column to dungeon_progress table...');
          await client.query(`
            ALTER TABLE dungeon_progress
            ADD COLUMN seed TEXT
          `);
        }
        
        // Add status column if it doesn't exist
        if (!existingColumns.includes('status')) {
          console.log('Adding status column to dungeon_progress table...');
          await client.query(`
            ALTER TABLE dungeon_progress
            ADD COLUMN status VARCHAR(20) DEFAULT 'IN_PROGRESS'
          `);
        }
        
        // Add completed_waves column if it doesn't exist
        if (!existingColumns.includes('completed_waves')) {
          console.log('Adding completed_waves column to dungeon_progress table...');
          await client.query(`
            ALTER TABLE dungeon_progress
            ADD COLUMN completed_waves INTEGER DEFAULT 0
          `);
        }
        
        // Fill seed column with dummy data for existing records
        if (existingColumns.includes('dungeon_id') && !existingColumns.includes('seed')) {
          console.log('Populating seed field for existing dungeon records...');
          await client.query(`
            UPDATE dungeon_progress
            SET seed = 'legacy-' || dungeon_id || '-' || id
            WHERE seed IS NULL
          `);
        }
      } else {
        console.log('dungeon_progress table does not exist yet, will be created on startup');
      }
      
      // Migration 2: Check and update balance_parameters table
      if (existingTables.includes('balance_parameters')) {
        console.log('Checking balance_parameters table...');
        const balanceCheck = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'balance_parameters'
        `);
        
        const balanceColumns = balanceCheck.rows.reduce((acc, row) => {
          acc[row.column_name] = row.data_type;
          return acc;
        }, {});
        
        // Check if value column needs to be changed from JSONB to DECIMAL
        if (balanceColumns.value && balanceColumns.value === 'jsonb') {
          console.log('Converting balance_parameters.value from JSONB to DECIMAL...');
          
          await client.query(`
            ALTER TABLE balance_parameters
            ADD COLUMN value_temp DECIMAL
          `);
          
          // Convert data if possible
          try {
            await client.query(`
              UPDATE balance_parameters
              SET value_temp = (value->>'value')::DECIMAL
            `);
          } catch (convError) {
            console.log('Could not convert existing values, using defaults instead');
          }
          
          await client.query(`
            ALTER TABLE balance_parameters
            DROP COLUMN value
          `);
          
          await client.query(`
            ALTER TABLE balance_parameters
            RENAME COLUMN value_temp TO value
          `);
        }
        
        // Insert default balance parameters if needed
        const paramsCount = await client.query(`
          SELECT COUNT(*) FROM balance_parameters
        `);
        
        if (parseInt(paramsCount.rows[0].count) === 0) {
          console.log('Adding default balance parameters...');
          
          const { v4: uuid } = require('uuid');
          const defaultParams = [
            { key: 'drop_rate_multiplier', value: 1.0 },
            { key: 'rarity_threshold_adjustment', value: 0.0 },
            { key: 'global_difficulty_modifier', value: 1.0 }
          ];
          
          for (const param of defaultParams) {
            await client.query(`
              INSERT INTO balance_parameters (id, parameter_key, value, created_at, updated_at)
              VALUES ($1, $2, $3, NOW(), NOW())
            `, [uuid(), param.key, param.value]);
          }
        }
      } else {
        console.log('balance_parameters table does not exist yet, will be created on startup');
      }
      
      // Migration 3: Check and update inventory table
      if (existingTables.includes('inventory')) {
        console.log('Checking inventory table structure...');
        const columnCheck = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'inventory'
        `);
        
        const existingColumns = columnCheck.rows.map(row => row.column_name);
        const dataTypes = columnCheck.rows.reduce((acc, row) => {
          acc[row.column_name] = row.data_type;
          return acc;
        }, {});
        
        // Check if we need to migrate from the old schema
        const hasLegacySchema = existingColumns.includes('item_data') && !existingColumns.includes('items');
        
        if (hasLegacySchema) {
          console.log('Migrating from legacy inventory schema to new schema...');
          
          // First add the items column
          if (!existingColumns.includes('items')) {
            console.log('Adding items column to inventory table...');
            await client.query(`
              ALTER TABLE inventory
              ADD COLUMN items JSONB DEFAULT '[]'
            `);
          }
          
          // Get all existing items and migrate them
          console.log('Fetching existing inventory items...');
          const inventoryItems = await client.query(`
            SELECT id, character_id, item_data, equipped 
            FROM inventory
          `);
          
          console.log(`Found ${inventoryItems.rowCount} inventory records to migrate`);
          
          // Group items by character ID
          const characterItems = {};
          
          for (const row of inventoryItems.rows) {
            const { character_id, id, item_data, equipped } = row;
            
            if (!characterItems[character_id]) {
              characterItems[character_id] = [];
            }
            
            if (item_data) {
              characterItems[character_id].push({
                ...item_data,
                inventoryId: id,
                equipped: equipped || false
              });
            }
          }
          
          // Create new inventory records with the items array
          console.log('Migrating items to new format...');
          const { v4: uuidv4 } = require('uuid');
          
          for (const characterId in characterItems) {
            if (characterItems[characterId].length > 0) {
              const items = characterItems[characterId];
              
              try {
                // Delete the old inventory records for this character
                await client.query(`
                  DELETE FROM inventory WHERE character_id = $1
                `, [characterId]);
                
                // Create a new record with the items array
                const newInventoryId = uuidv4();
                await client.query(`
                  INSERT INTO inventory (id, character_id, items)
                  VALUES ($1, $2, $3)
                `, [newInventoryId, characterId, JSON.stringify(items)]);
                
                console.log(`Migrated ${items.length} items for character ${characterId}`);
              } catch (err) {
                console.error(`Error migrating items for character ${characterId}:`, err);
              }
            }
          }
          
          // After successful migration, remove the old columns
          console.log('Removing legacy columns...');
          if (existingColumns.includes('item_data')) {
            await client.query(`
              ALTER TABLE inventory 
              DROP COLUMN IF EXISTS item_data
            `);
          }
          
          if (existingColumns.includes('equipped')) {
            await client.query(`
              ALTER TABLE inventory 
              DROP COLUMN IF EXISTS equipped
            `);
          }
        } else if (!existingColumns.includes('items')) {
          // If the table exists but doesn't have items column, add it
          console.log('Adding items column to inventory table...');
          await client.query(`
            ALTER TABLE inventory
            ADD COLUMN items JSONB DEFAULT '[]'
          `);
        }
      } else {
        console.log('inventory table does not exist yet, will be created on startup');
      }
      
      await client.query('COMMIT');
      console.log('Migrations completed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration error:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration script failed:', error);
    throw error;
  }
}

if (require.main === module) {
  // Run migrations directly if this script is executed
  db.initDatabase()
    .then(() => runMigrations())
    .then(() => {
      console.log('Migrations completed successfully!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
} else {
  // Export for use in other scripts
  module.exports = runMigrations;
} 