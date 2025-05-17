const { v4: uuidv4 } = require('uuid');
const db = require('../../db/database');

/**
 * Get all characters for the current user
 */
async function getCharacters(req, res) {
  try {
    const result = await db.query(
      `SELECT id, level, experience, gold, gems, stats, created_at, last_played
       FROM ${db.TABLES.CHARACTERS}
       WHERE user_id = $1
       ORDER BY last_played DESC`,
      [req.user.id]
    );
    
    res.json({ characters: result.rows });
  } catch (error) {
    console.error('Get characters error:', error);
    res.status(500).json({ message: 'Failed to retrieve characters' });
  }
}

/**
 * Get a specific character by ID
 */
async function getCharacter(req, res) {
  const { id } = req.params;
  
  try {
    // Get character data
    const characterResult = await db.query(
      `SELECT c.id, c.level, c.experience, c.gold, c.gems, c.stats, c.created_at, c.last_played
       FROM ${db.TABLES.CHARACTERS} c
       WHERE c.id = $1 AND c.user_id = $2`,
      [id, req.user.id]
    );
    
    if (characterResult.rowCount === 0) {
      return res.status(404).json({ message: 'Character not found' });
    }
    
    const character = characterResult.rows[0];
    
    // Get inventory data
    const inventoryResult = await db.query(
      `SELECT id, items FROM ${db.TABLES.INVENTORY} WHERE character_id = $1`,
      [id]
    );
    
    // Get dungeon progress
    const dungeonResult = await db.query(
      `SELECT id, seed, completed_waves, status, started_at, last_updated
       FROM ${db.TABLES.DUNGEON_PROGRESS}
       WHERE character_id = $1
       ORDER BY last_updated DESC
       LIMIT 5`,
      [id]
    );
    
    // Combine data
    const response = {
      ...character,
      inventory: inventoryResult.rows[0]?.items || [],
      dungeonProgress: dungeonResult.rows || []
    };
    
    res.json(response);
  } catch (error) {
    console.error('Get character error:', error);
    res.status(500).json({ message: 'Failed to retrieve character' });
  }
}

/**
 * Create a new character
 */
async function createCharacter(req, res) {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Character name is required' });
  }
  
  // Start transaction
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create character with starting values based on GDD
    const characterId = uuidv4();
    const startingStats = { str: 1, int: 1, agi: 1, dex: 1, luk: 1 };
    
    const characterResult = await client.query(
      `INSERT INTO ${db.TABLES.CHARACTERS} 
       (id, user_id, level, experience, gold, gems, stats)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, level, gold, gems, stats`,
      [characterId, req.user.id, 1, 0, 100, 0, startingStats]
    );
    
    // Create empty inventory with starting equipment based on GDD
    const startingEquipment = [
      {
        id: uuidv4(),
        type: 'weapon',
        subType: 'sword',
        name: 'Short Sword',
        attack: 3,
        rarity: 'F',
        stats: {},
        equipped: true
      },
      {
        id: uuidv4(),
        type: 'armor',
        subType: 'head',
        name: 'Cloth Helmet',
        defense: 1,
        rarity: 'F',
        stats: {},
        equipped: true
      },
      {
        id: uuidv4(),
        type: 'armor',
        subType: 'body',
        name: 'Cloth Tunic',
        defense: 2,
        rarity: 'F',
        stats: {},
        equipped: true
      },
      {
        id: uuidv4(),
        type: 'armor',
        subType: 'legs',
        name: 'Cloth Leggings',
        defense: 1,
        rarity: 'F',
        stats: {},
        equipped: true
      },
      {
        id: uuidv4(),
        type: 'consumable',
        subType: 'potion',
        name: 'Minor Health Potion',
        effect: { type: 'heal', value: 50 },
        quantity: 3
      }
    ];
    
    await client.query(
      `INSERT INTO ${db.TABLES.INVENTORY} (id, character_id, items)
       VALUES ($1, $2, $3)`,
      [uuidv4(), characterId, JSON.stringify(startingEquipment)]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Character created successfully',
      character: {
        ...characterResult.rows[0],
        name
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create character error:', error);
    res.status(500).json({ message: 'Failed to create character' });
  } finally {
    client.release();
  }
}

/**
 * Update character information
 */
async function updateCharacter(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }
  
  try {
    // First check if character belongs to user
    const checkResult = await db.query(
      `SELECT 1 FROM ${db.TABLES.CHARACTERS} WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ message: 'Character not found' });
    }
    
    // Update name (assuming name is stored as a metadata field)
    await db.query(
      `UPDATE ${db.TABLES.CHARACTERS} 
       SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{name}', $1)
       WHERE id = $2`,
      [JSON.stringify(name), id]
    );
    
    res.json({
      message: 'Character updated successfully'
    });
  } catch (error) {
    console.error('Update character error:', error);
    res.status(500).json({ message: 'Failed to update character' });
  }
}

/**
 * Allocate stat points
 */
async function allocateStats(req, res) {
  const { id } = req.params;
  const { stats } = req.body;
  
  if (!stats || typeof stats !== 'object') {
    return res.status(400).json({ message: 'Stats object is required' });
  }
  
  // Validate stats (must be STR, INT, AGI, DEX, LUK)
  const validStats = ['str', 'int', 'agi', 'dex', 'luk'];
  const statsToAllocate = {};
  
  for (const [key, value] of Object.entries(stats)) {
    const normalizedKey = key.toLowerCase();
    if (!validStats.includes(normalizedKey)) {
      return res.status(400).json({ message: `Invalid stat: ${key}` });
    }
    if (!Number.isInteger(value) || value <= 0) {
      return res.status(400).json({ message: `Invalid value for ${key}: must be a positive integer` });
    }
    statsToAllocate[normalizedKey] = value;
  }
  
  // Start transaction
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current character stats and available points
    const characterResult = await client.query(
      `SELECT level, stats FROM ${db.TABLES.CHARACTERS} WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    
    if (characterResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Character not found' });
    }
    
    const character = characterResult.rows[0];
    const currentStats = character.stats;
    
    // Calculate total available stat points based on level (as per GDD: 5 per level)
    const totalAvailablePoints = character.level * 5;
    
    // Calculate total allocated points so far
    const currentAllocatedPoints = Object.values(currentStats).reduce((sum, value) => sum + value, 0) - 5; // Subtract 5 because starting stats are 1 each
    
    // Calculate remaining points available
    const remainingPoints = totalAvailablePoints - currentAllocatedPoints;
    
    // Calculate total points being allocated in this request
    const pointsToAllocate = Object.values(statsToAllocate).reduce((sum, value) => sum + value, 0);
    
    if (pointsToAllocate > remainingPoints) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: 'Not enough stat points available',
        available: remainingPoints,
        requested: pointsToAllocate
      });
    }
    
    // Check if any stat would exceed the maximum (200 as per GDD)
    const MAX_STAT_VALUE = 200;
    for (const [stat, value] of Object.entries(statsToAllocate)) {
      const newValue = (currentStats[stat] || 0) + value;
      if (newValue > MAX_STAT_VALUE) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `Cannot exceed maximum stat value of ${MAX_STAT_VALUE} for ${stat}`,
          currentValue: currentStats[stat] || 0,
          requested: value,
          maximum: MAX_STAT_VALUE
        });
      }
    }
    
    // Update stats
    const newStats = { ...currentStats };
    for (const [stat, value] of Object.entries(statsToAllocate)) {
      newStats[stat] = (newStats[stat] || 0) + value;
    }
    
    await client.query(
      `UPDATE ${db.TABLES.CHARACTERS} SET stats = $1 WHERE id = $2`,
      [newStats, id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      message: 'Stats allocated successfully',
      newStats,
      remainingPoints: remainingPoints - pointsToAllocate
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Allocate stats error:', error);
    res.status(500).json({ message: 'Failed to allocate stats' });
  } finally {
    client.release();
  }
}

module.exports = {
  getCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  allocateStats
}; 