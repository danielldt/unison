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
    
    const characterLevel = characterResult.rows[0].level;
    
    // Get balance parameters from database
    const balanceResult = await db.query(
      `SELECT parameter_key, value FROM ${db.TABLES.BALANCE_PARAMETERS}
       WHERE parameter_key IN ('drop_rate_multiplier', 'rarity_threshold_adjustment', 'global_difficulty_modifier')`
    );
    
    // Convert to object
    const balanceParams = {};
    balanceResult.rows.forEach(row => {
      balanceParams[row.parameter_key] = parseFloat(row.value);
    });
    
    // Generate a mix of dungeon types based on character level
    const dungeons = [];
    
    // Normal dungeons (always available)
    for (let i = 0; i < 5; i++) {
      const seed = `normal-${characterLevel}-${i}-${Date.now()}`;
      const dungeon = generateDungeon(seed, characterLevel, 'normal', balanceParams);
      dungeons.push(dungeon);
    }
    
    // Elite dungeons (available from level 50)
    if (characterLevel >= 50) {
      for (let i = 0; i < 3; i++) {
        const seed = `elite-${characterLevel}-${i}-${Date.now()}`;
        const dungeon = generateDungeon(seed, characterLevel, 'elite', balanceParams);
        dungeons.push(dungeon);
      }
    }
    
    // Raid dungeons (available from level 70, one per week)
    if (characterLevel >= 70) {
      // In a real implementation, we'd check if the player has already done the weekly raid
      const hasCompletedWeeklyRaid = false;
      
      if (!hasCompletedWeeklyRaid) {
        const seed = `raid-${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`; // Weekly seed
        const dungeon = generateDungeon(seed, characterLevel, 'raid', balanceParams);
        dungeons.push(dungeon);
      }
    }
    
    res.json({ dungeons });
  } catch (error) {
    console.error('Get available dungeons error:', error);
    res.status(500).json({ message: 'Failed to retrieve available dungeons' });
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
    const balanceResult = await db.query(
      `SELECT parameter_key, value FROM ${db.TABLES.BALANCE_PARAMETERS}
       WHERE parameter_key IN ('drop_rate_multiplier', 'rarity_threshold_adjustment', 'global_difficulty_modifier')`
    );
    
    const balanceParams = {};
    balanceResult.rows.forEach(row => {
      balanceParams[row.parameter_key] = parseFloat(row.value);
    });
    
    // Generate a unique seed if not provided
    const dungeonSeed = seed || generateUniqueSeed(`dungeon-${characterId}-${Date.now()}`, 'dungeon').seedString;
    
    // Generate dungeon
    const dungeon = generateDungeon(dungeonSeed, characterLevel, dungeonType, balanceParams);
    
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
    res.status(500).json({ message: 'Failed to generate dungeon' });
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
    
    // Get balance parameters
    const balanceResult = await db.query(
      `SELECT parameter_key, value FROM ${db.TABLES.BALANCE_PARAMETERS}
       WHERE parameter_key IN ('drop_rate_multiplier', 'rarity_threshold_adjustment', 'global_difficulty_modifier')`
    );
    
    const balanceParams = {};
    balanceResult.rows.forEach(row => {
      balanceParams[row.parameter_key] = parseFloat(row.value);
    });
    
    // Determine dungeon type based on seed
    let dungeonType = 'normal';
    if (progress.seed.startsWith('elite-')) {
      dungeonType = 'elite';
    } else if (progress.seed.startsWith('raid-')) {
      dungeonType = 'raid';
    }
    
    // Regenerate dungeon from seed
    const dungeon = generateDungeon(progress.seed, progress.level, dungeonType, balanceParams);
    
    // Add progress information
    dungeon.progressId = progress.id;
    dungeon.status = progress.status;
    dungeon.completedWaves = progress.completed_waves;
    dungeon.characterId = progress.character_id;
    
    res.json(dungeon);
  } catch (error) {
    console.error('Get dungeon error:', error);
    res.status(500).json({ message: 'Failed to retrieve dungeon' });
  }
}

module.exports = {
  getAvailableDungeons,
  generateDungeon: generateDungeonFromAPI,
  getDungeon
}; 