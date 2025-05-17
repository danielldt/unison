const { v4: uuidv4 } = require('uuid');
const db = require('../../db/database');

/**
 * Get all characters for the current user
 */
async function getCharacters(req, res) {
  try {
    const result = await db.query(
      `SELECT id, name, level, experience, gold, gems, stats, created_at, last_played
       FROM ${db.TABLES.CHARACTERS}
       WHERE user_id = $1
       ORDER BY last_played DESC NULLS LAST, created_at DESC`,
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
      `SELECT c.id, c.name, c.level, c.experience, c.gold, c.gems, c.stats, c.created_at, c.last_played
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
      `SELECT id, item_data, equipped
       FROM ${db.TABLES.INVENTORY}
       WHERE character_id = $1`,
      [id]
    );
    
    // Get dungeon progress
    const dungeonResult = await db.query(
      `SELECT id, dungeon_id, progress, completed, created_at, updated_at
       FROM ${db.TABLES.DUNGEON_PROGRESS}
       WHERE character_id = $1
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 5`,
      [id]
    );
    
    // Combine data
    const response = {
      ...character,
      inventory: inventoryResult.rows || [],
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
    
    // Verify user exists in the database
    const userResult = await client.query(
      `SELECT id FROM ${db.TABLES.USERS} WHERE id = $1`,
      [req.user.id]
    );
    
    if (userResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(401).json({ 
        message: 'User account not found. Please log out and log in again.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if character name is already taken
    const nameCheckResult = await client.query(
      `SELECT id FROM ${db.TABLES.CHARACTERS} WHERE name = $1`,
      [name]
    );
    
    if (nameCheckResult.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        message: 'Character name already exists',
        code: 'NAME_TAKEN' 
      });
    }
    
    // Create character with starting values based on section 1.1
    const characterId = uuidv4();
    const startingStats = { str: 1, int: 1, agi: 1, dex: 1, luk: 1 }; // Section 1.1
    
    const characterResult = await client.query(
      `INSERT INTO ${db.TABLES.CHARACTERS} 
       (id, user_id, name, level, experience, gold, gems, stats)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, level, gold, gems, stats`,
      [characterId, req.user.id, name, 1, 0, 100, 0, startingStats]
    );
    
    // Create starting equipment based on section 1.1.2
    const startingItems = [
      {
        id: uuidv4(),
        name: 'Short Sword', 
        type: 'weapon',
        subType: 'sword',
        attack: 3, 
        rarity: 'F',
        stats: {},
        equipped: true
      },
      {
        id: uuidv4(),
        name: 'Cloth Helmet',
        type: 'armor',
        subType: 'head',
        defense: 1,
        rarity: 'F',
        stats: {},
        equipped: true
      },
      {
        id: uuidv4(),
        name: 'Cloth Tunic',
        type: 'armor',
        subType: 'body',
        defense: 2,
        rarity: 'F',
        stats: {},
        equipped: true
      },
      {
        id: uuidv4(),
        name: 'Cloth Leggings',
        type: 'armor',
        subType: 'legs',
        defense: 1,
        rarity: 'F',
        stats: {},
        equipped: true
      },
      {
        id: uuidv4(),
        name: 'Minor Health Potion',
        type: 'consumable',
        subType: 'potion',
        effect: { type: 'heal', value: 50 },
        quantity: 3
      }
    ];
    
    // Create inventory with starting items as a single record with items array (section 16.2)
    await client.query(
      `INSERT INTO ${db.TABLES.INVENTORY} (id, character_id, items)
       VALUES ($1, $2, $3)`,
      [uuidv4(), characterId, JSON.stringify(startingItems)]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Character created successfully',
      character: characterResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create character error:', error);
    
    // Provide more specific error message
    if (error.code === '23505' && error.constraint.includes('characters_name')) {
      return res.status(409).json({ 
        message: 'Character name already exists', 
        code: 'NAME_TAKEN' 
      });
    } else if (error.code === '23503' && error.constraint.includes('user_id')) {
      return res.status(401).json({ 
        message: 'User account not found. Please log out and log in again.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to create character',
      error: error.message
    });
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
    
    // Update name
    const updateResult = await db.query(
      `UPDATE ${db.TABLES.CHARACTERS} 
       SET name = $1
       WHERE id = $2
       RETURNING id, name, level, gold, gems, stats`,
      [name, id]
    );
    
    res.json({
      message: 'Character updated successfully',
      character: updateResult.rows[0]
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