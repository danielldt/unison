const { v4: uuidv4 } = require('uuid');
const db = require('../../db/database');
const { generateDungeon } = require('../../../shared/utils/dungeonGenerator');
const { generateUniqueSeed } = require('../../../shared/utils/seedGenerator');

/**
 * Get available dungeons for the player
 */
async function getAvailableDungeons(req, res) {
  try {
    // Get the character's level to determine available dungeons
    const characterId = req.query.characterId;
    
    if (!characterId) {
      return res.status(400).json({ message: 'Character ID is required' });
    }
    
    // Verify character belongs to user
    const characterResult = await db.query(
      `SELECT level FROM ${db.TABLES.CHARACTERS} 
       WHERE id = $1 AND user_id = $2`,
      [characterId, req.user.id]
    );
    
    if (characterResult.rowCount === 0) {
      return res.status(404).json({ message: 'Character not found' });
    }
    
    // Get the character's level
    const characterLevel = characterResult.rows[0].level;
    
    // Get balance parameters for dungeon generation
    let balanceParams = {};
    try {
      const balanceResult = await db.query(
        `SELECT parameter_key, value FROM ${db.TABLES.BALANCE_PARAMETERS}
         WHERE parameter_key IN ('drop_rate_multiplier', 'rarity_threshold_adjustment', 'global_difficulty_modifier')`
      );
      
      // Convert to object
      balanceResult.rows.forEach(row => {
        balanceParams[row.parameter_key] = parseFloat(row.value);
      });
    } catch (balanceError) {
      console.error('Error retrieving balance parameters:', balanceError);
      // If balance parameters fail, use default values
      balanceParams = {
        'drop_rate_multiplier': 1.0,
        'rarity_threshold_adjustment': 0.0,
        'global_difficulty_modifier': 1.0
      };
    }
    
    // Get dungeons in progress from database
    const dungeons = [];
    
    try {
      const dungeonResult = await db.query(
        `SELECT dp.id, dp.seed, dp.status, dp.completed_waves, c.level 
         FROM ${db.TABLES.DUNGEON_PROGRESS} dp
         JOIN ${db.TABLES.CHARACTERS} c ON dp.character_id = c.id
         WHERE dp.character_id = $1 AND dp.status = 'IN_PROGRESS'`,
        [characterId]
      );
      
      if (dungeonResult.rowCount > 0) {
        for (const row of dungeonResult.rows) {
          try {
            // Skip if seed is missing
            if (!row.seed) {
              console.error(`Dungeon ${row.id} has no seed, skipping`);
              continue;
            }
            
            // Determine dungeon type from seed
            let dungeonType = 'normal';
            if (row.seed.includes('elite')) {
              dungeonType = 'elite';
            } else if (row.seed.includes('raid')) {
              dungeonType = 'raid';
            }
            
            // Regenerate dungeon from seed
            console.log(`Regenerating dungeon with seed "${row.seed}", level ${row.level}, type ${dungeonType}`);
            const dungeon = generateDungeon(row.seed, row.level, dungeonType, balanceParams);
            
            // Validate the regenerated dungeon
            if (!dungeon.waves || dungeon.waves.length === 0) {
              console.error(`Dungeon ${row.id} generated without waves, skipping`);
              continue;
            }
            
            // Fix name if undefined
            if (!dungeon.name || dungeon.name.includes('undefined')) {
              console.log(`Fixing invalid name for dungeon ${row.id}`);
              dungeon.name = `${dungeonType.charAt(0).toUpperCase() + dungeonType.slice(1)} Dungeon`;
            }
            
            // Add progress information
            dungeon.progressId = row.id;
            dungeon.status = row.status;
            dungeon.completedWaves = row.completed_waves;
            
            dungeons.push(dungeon);
          } catch (dungeonGenError) {
            console.error('Error generating dungeon from saved seed:', dungeonGenError);
            // Skip this dungeon if there's an error generating it
          }
        }
      }
    } catch (dungeonQueryError) {
      console.error('Error querying dungeon progress:', dungeonQueryError);
      // If dungeon query fails, continue with empty dungeons array
    }
    
    // Return available dungeons
    res.json({ dungeons });
  } catch (error) {
    console.error('Get available dungeons error:', error);
    res.status(500).json({ message: 'Failed to retrieve available dungeons', error: error.message });
  }
}

/**
 * Generate a new dungeon
 */
async function generateDungeonFromAPI(req, res) {
  const { characterId, dungeonType = 'normal', seed } = req.body;
  
  if (!characterId) {
    return res.status(400).json({ message: 'Character ID is required' });
  }
  
  try {
    // Verify character belongs to user
    const characterResult = await db.query(
      `SELECT level FROM ${db.TABLES.CHARACTERS} 
       WHERE id = $1 AND user_id = $2`,
      [characterId, req.user.id]
    );
    
    if (characterResult.rowCount === 0) {
      return res.status(404).json({ message: 'Character not found' });
    }
    
    const characterLevel = characterResult.rows[0].level;
    
    // Get balance parameters
    let balanceParams = {};
    try {
      const balanceResult = await db.query(
        `SELECT parameter_key, value FROM ${db.TABLES.BALANCE_PARAMETERS}
         WHERE parameter_key IN ('drop_rate_multiplier', 'rarity_threshold_adjustment', 'global_difficulty_modifier')`
      );
      
      balanceResult.rows.forEach(row => {
        balanceParams[row.parameter_key] = parseFloat(row.value);
      });
    } catch (balanceError) {
      console.error('Error retrieving balance parameters:', balanceError);
      // If balance parameters fail, use default values
      balanceParams = {
        'drop_rate_multiplier': 1.0,
        'rarity_threshold_adjustment': 0.0,
        'global_difficulty_modifier': 1.0
      };
    }
    
    let dungeonSeed;
    
    // Handle different seed formats
    if (seed) {
      if (typeof seed === 'object' && seed.adjective && seed.place && seed.object) {
        // Format the seed to match what the generator expects
        // Use a consistent format of Adjective_Place_Object_Timestamp
        const timestamp = Date.now();
        dungeonSeed = `${seed.adjective}_${seed.place}_${seed.object}_${timestamp}`;
        console.log(`Created seed from components: ${dungeonSeed}`);
      } else if (typeof seed === 'string') {
        // If it's a string, use it directly (for backward compatibility)
        dungeonSeed = seed;
        console.log(`Using provided seed string: ${dungeonSeed}`);
      } else {
        // If invalid seed format, generate a unique one
        const generatedSeed = generateUniqueSeed(`dungeon-${characterId}-${Date.now()}`, 'dungeon');
        dungeonSeed = generatedSeed.seedString;
        console.log(`Generated unique seed: ${dungeonSeed}`);
      }
    } else {
      // No seed provided, generate a unique one
      const generatedSeed = generateUniqueSeed(`dungeon-${characterId}-${Date.now()}`, 'dungeon');
      dungeonSeed = generatedSeed.seedString;
      console.log(`Generated unique seed (no seed provided): ${dungeonSeed}`);
    }
    
    // Generate dungeon
    console.log(`Generating dungeon with seed "${dungeonSeed}", level ${characterLevel}, type ${dungeonType}`);
    const dungeon = generateDungeon(dungeonSeed, characterLevel, dungeonType, balanceParams);
    
    if (!dungeon.waves || dungeon.waves.length === 0 || !dungeon.name || dungeon.name.includes('undefined')) {
      console.error('Dungeon generation produced invalid result:', dungeon);
      return res.status(500).json({ 
        message: 'Failed to generate valid dungeon', 
        error: 'Invalid dungeon data was generated'
      });
    }
    
    // Save dungeon progress to database
    const dungeonId = uuidv4();
    await db.query(
      `INSERT INTO ${db.TABLES.DUNGEON_PROGRESS} 
       (id, character_id, seed, status, completed_waves) 
       VALUES ($1, $2, $3, $4, $5)`,
      [dungeonId, characterId, dungeonSeed, 'IN_PROGRESS', 0]
    );
    
    // Add database ID to dungeon
    dungeon.progressId = dungeonId;
    
    res.json(dungeon);
  } catch (error) {
    console.error('Generate dungeon error:', error);
    res.status(500).json({ message: 'Failed to generate dungeon', error: error.message });
  }
}

/**
 * Get a specific dungeon
 */
async function getDungeon(req, res) {
  const { id } = req.params;
  
  try {
    // Get dungeon progress from database
    const progressResult = await db.query(
      `SELECT dp.id, dp.seed, dp.status, dp.completed_waves, c.level, dp.character_id
       FROM ${db.TABLES.DUNGEON_PROGRESS} dp
       JOIN ${db.TABLES.CHARACTERS} c ON dp.character_id = c.id
       WHERE dp.id = $1 AND c.user_id = $2`,
      [id, req.user.id]
    );
    
    if (progressResult.rowCount === 0) {
      return res.status(404).json({ message: 'Dungeon not found' });
    }
    
    const progress = progressResult.rows[0];
    
    // Log the retrieved seed for debugging
    console.log(`Retrieved dungeon with seed: ${progress.seed}`);
    
    // Verify seed exists
    if (!progress.seed) {
      console.error('Dungeon has no seed value in the database');
      return res.status(500).json({ message: 'Dungeon data corrupted (missing seed)' });
    }
    
    // Get balance parameters
    let balanceParams = {};
    try {
      const balanceResult = await db.query(
        `SELECT parameter_key, value FROM ${db.TABLES.BALANCE_PARAMETERS}
         WHERE parameter_key IN ('drop_rate_multiplier', 'rarity_threshold_adjustment', 'global_difficulty_modifier')`
      );
      
      balanceResult.rows.forEach(row => {
        balanceParams[row.parameter_key] = parseFloat(row.value);
      });
    } catch (balanceError) {
      console.error('Error retrieving balance parameters:', balanceError);
      // If balance parameters fail, use default values
      balanceParams = {
        'drop_rate_multiplier': 1.0,
        'rarity_threshold_adjustment': 0.0,
        'global_difficulty_modifier': 1.0
      };
    }
    
    // Determine dungeon type based on seed
    let dungeonType = 'normal';
    if (progress.seed.startsWith('elite-') || progress.seed.includes('elite')) {
      dungeonType = 'elite';
    } else if (progress.seed.startsWith('raid-') || progress.seed.includes('raid')) {
      dungeonType = 'raid';
    }
    
    // Regenerate dungeon from seed
    console.log(`Regenerating dungeon with seed "${progress.seed}", level ${progress.level}, type ${dungeonType}`);
    const dungeon = generateDungeon(progress.seed, progress.level, dungeonType, balanceParams);
    
    // Validate generated dungeon
    if (!dungeon.waves || dungeon.waves.length === 0) {
      console.error('Generated dungeon has no waves:', dungeon);
      return res.status(500).json({ message: 'Failed to regenerate dungeon properly (no waves)' });
    }
    
    if (!dungeon.name || dungeon.name.includes('undefined')) {
      console.error('Generated dungeon has invalid name:', dungeon.name);
      // Fix the name if undefined
      dungeon.name = `${dungeonType.charAt(0).toUpperCase() + dungeonType.slice(1)} Dungeon`;
    }
    
    // Add progress information
    dungeon.progressId = progress.id;
    dungeon.status = progress.status;
    dungeon.completedWaves = progress.completed_waves;
    dungeon.characterId = progress.character_id;
    
    res.json(dungeon);
  } catch (error) {
    console.error('Get dungeon error:', error);
    res.status(500).json({ message: 'Failed to retrieve dungeon', error: error.message });
  }
}

module.exports = {
  getAvailableDungeons,
  generateDungeon: generateDungeonFromAPI,
  getDungeon
}; 