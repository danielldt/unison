const { v4: uuidv4 } = require('uuid');
const db = require('../../db/database');
const { generateSeed, createSeededRNG } = require('../../../shared/utils/seedGenerator');

// Pre-defined recipes (would usually be stored in the database)
const RECIPES = [
  {
    id: 'recipe-basic-weapon',
    name: 'Basic Weapon',
    pattern: 'CCCCCCCC', // 8 common metal
    materials: ['common_metal'],
    result: {
      type: 'weapon',
      subType: 'sword',
      requiredLevel: 1
    }
  },
  {
    id: 'recipe-sword',
    name: 'Sword',
    pattern: 'CCCCLCCC', // 8 common metal, 1 leather
    materials: ['common_metal', 'leather'],
    result: {
      type: 'weapon',
      subType: 'sword',
      requiredLevel: 1
    }
  },
  {
    id: 'recipe-shield',
    name: 'Shield',
    pattern: 'MMMLMMMM', // 7 metal, 1 leather
    materials: ['metal', 'leather'],
    result: {
      type: 'weapon',
      subType: 'shield',
      requiredLevel: 1
    }
  },
  {
    id: 'recipe-orb',
    name: 'Orb',
    pattern: 'GGGCGGG', // 8 gems, 1 crystal
    materials: ['gem', 'crystal'],
    result: {
      type: 'weapon',
      subType: 'orb',
      requiredLevel: 1
    }
  },
  {
    id: 'recipe-staff',
    name: 'Staff',
    pattern: 'W W WWW', // 5 wood, 1 stone
    materials: ['wood', 'stone'],
    result: {
      type: 'weapon',
      subType: 'staff',
      requiredLevel: 1
    }
  },
  {
    id: 'recipe-bow',
    name: 'Bow',
    pattern: 'WSWLSLWS', // 3 wood, 3 string, 2 leather
    materials: ['wood', 'string', 'leather'],
    result: {
      type: 'weapon',
      subType: 'bow',
      requiredLevel: 1
    }
  },
  {
    id: 'recipe-dagger',
    name: 'Dagger',
    pattern: 'M  MM MM', // 4 metal
    materials: ['metal'],
    result: {
      type: 'weapon',
      subType: 'dagger',
      requiredLevel: 1
    }
  },
  {
    id: 'recipe-health-potion',
    name: 'Health Potion',
    pattern: 'PPPPRPPP', // 8 plant, 1 rare essence
    materials: ['plant', 'rare_essence'],
    result: {
      type: 'consumable',
      subType: 'potion',
      effect: { type: 'heal', value: 100 },
      requiredLevel: 1
    }
  },
  {
    id: 'recipe-mana-potion',
    name: 'Mana Potion',
    pattern: 'PEPEREP', // 4 plant, 4 ether, 1 rare essence
    materials: ['plant', 'ether', 'rare_essence'],
    result: {
      type: 'consumable',
      subType: 'potion',
      effect: { type: 'mp', value: 50 },
      requiredLevel: 1
    }
  }
];

/**
 * Get available crafting materials for a character
 */
async function getMaterials(req, res) {
  const { characterId } = req.params;
  
  try {
    // Verify character belongs to user
    const characterResult = await db.query(
      `SELECT 1 FROM ${db.TABLES.CHARACTERS} 
       WHERE id = $1 AND user_id = $2`,
      [characterId, req.user.id]
    );
    
    if (characterResult.rowCount === 0) {
      return res.status(404).json({ message: 'Character not found' });
    }
    
    // Get materials from inventory
    const inventoryResult = await db.query(
      `SELECT items FROM ${db.TABLES.INVENTORY} WHERE character_id = $1`,
      [characterId]
    );
    
    const inventory = inventoryResult.rowCount > 0 ? inventoryResult.rows[0].items : [];
    
    // Filter out only materials
    const materials = inventory.filter(item => item.type === 'material');
    
    res.json({ materials });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ message: 'Failed to retrieve materials' });
  }
}

/**
 * Get available recipes for a character
 */
async function getRecipes(req, res) {
  const { characterId } = req.params;
  
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
    
    // Get discovered recipes from database (would need a new table for this)
    // For this implementation, we'll just return all recipes that match the character's level
    const availableRecipes = RECIPES.filter(recipe => 
      recipe.result.requiredLevel <= characterLevel
    );
    
    res.json({ recipes: availableRecipes });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ message: 'Failed to retrieve recipes' });
  }
}

/**
 * Craft an item using materials
 */
async function craftItem(req, res) {
  const { characterId } = req.params;
  const { materials, recipeId } = req.body;
  
  if (!materials || !materials.length || !recipeId) {
    return res.status(400).json({ message: 'Materials and recipe ID are required' });
  }
  
  // Find recipe
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) {
    return res.status(404).json({ message: 'Recipe not found' });
  }
  
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verify character belongs to user
    const characterResult = await client.query(
      `SELECT level FROM ${db.TABLES.CHARACTERS} 
       WHERE id = $1 AND user_id = $2`,
      [characterId, req.user.id]
    );
    
    if (characterResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Character not found' });
    }
    
    const characterLevel = characterResult.rows[0].level;
    
    // Check if character meets the level requirement
    if (characterLevel < recipe.result.requiredLevel) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        message: `Character must be at least level ${recipe.result.requiredLevel} to craft this item`
      });
    }
    
    // Get inventory items
    const inventoryResult = await client.query(
      `SELECT id, items FROM ${db.TABLES.INVENTORY} WHERE character_id = $1`,
      [characterId]
    );
    
    if (inventoryResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Inventory not found' });
    }
    
    const inventoryId = inventoryResult.rows[0].id;
    const inventoryItems = inventoryResult.rows[0].items;
    
    // Find the materials in the inventory
    const materialItems = [];
    for (const materialId of materials) {
      const materialItem = inventoryItems.find(item => item.id === materialId && item.type === 'material');
      if (!materialItem) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Material with ID ${materialId} not found` });
      }
      materialItems.push(materialItem);
    }
    
    // Create seed for random generation
    const seed = generateSeed(`${recipeId}-${characterId}-${Date.now()}`);
    const rng = createSeededRNG(seed);
    
    // Calculate rarity based on material average (as per GDD)
    const rarityMap = { 'F': 1, 'E': 2, 'D': 3, 'C': 4, 'B': 5, 'A': 6, 'S': 7, 'SS': 8, 'SSS': 9 };
    const rarityAverage = materialItems.reduce((sum, item) => sum + (rarityMap[item.rarity] || 1), 0) / materialItems.length;
    
    // Apply +5% bonus for all B+ materials
    let rarityBonus = 0;
    if (materialItems.every(item => (rarityMap[item.rarity] || 0) >= 5)) {
      rarityBonus = 0.05;
    }
    
    // Random variation (±10%)
    const rarityVariation = rng.nextFloat() * 0.2 - 0.1; // -10% to +10%
    
    // Critical crafting (5% chance for one rarity higher)
    const isCritical = rng.nextFloat() < 0.05;
    const criticalBonus = isCritical ? 1 : 0;
    
    // Determine final rarity index
    let rarityIndex = Math.floor(rarityAverage + rarityBonus + rarityVariation + criticalBonus);
    rarityIndex = Math.max(1, Math.min(9, rarityIndex)); // Clamp between 1-9
    
    // Convert back to letter rarity
    const rarities = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
    const rarity = rarities[rarityIndex - 1];
    
    // Generate result item
    const resultItem = {
      id: uuidv4(),
      name: recipe.name,
      type: recipe.result.type,
      subType: recipe.result.subType,
      rarity,
      level: characterLevel,
      craftedAt: new Date().toISOString(),
      craftedBy: characterId,
      seed
    };
    
    // Add type-specific properties
    switch (recipe.result.type) {
      case 'weapon':
        // Calculate weapon damage based on GDD formula
        // BaseDMG = 5 + (2 * ItemLevel) * RarityMultiplier
        const rarityMultiplier = 0.8 + (rarityIndex * 0.1);
        const baseDamage = Math.floor((5 + (2 * characterLevel)) * rarityMultiplier);
        
        resultItem.attack = baseDamage;
        resultItem.durability = 100;
        resultItem.stats = generateWeaponStats(rng, rarityIndex, characterLevel);
        break;
        
      case 'armor':
        // BaseDEF = 2 + (1 * ItemLevel) * RarityMultiplier
        const armorRarityMultiplier = 0.8 + (rarityIndex * 0.1);
        const baseDefense = Math.floor((2 + characterLevel) * armorRarityMultiplier);
        
        resultItem.defense = baseDefense;
        resultItem.durability = 100;
        resultItem.stats = generateArmorStats(rng, rarityIndex, characterLevel);
        break;
        
      case 'consumable':
        resultItem.effect = recipe.result.effect;
        resultItem.quantity = 1;
        break;
    }
    
    // Remove materials from inventory
    const updatedItems = inventoryItems.filter(item => !materials.includes(item.id));
    
    // Add result item to inventory
    updatedItems.push(resultItem);
    
    // Update inventory
    await client.query(
      `UPDATE ${db.TABLES.INVENTORY} 
       SET items = $1, last_updated = NOW()
       WHERE id = $2`,
      [JSON.stringify(updatedItems), inventoryId]
    );
    
    await client.query('COMMIT');
    
    // Return crafting result
    res.json({
      message: isCritical ? 'Critical success!' : 'Crafting successful',
      result: resultItem,
      isCritical,
      items: updatedItems
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Craft item error:', error);
    res.status(500).json({ message: 'Failed to craft item' });
  } finally {
    client.release();
  }
}

// Helper function to generate weapon stats based on rarity and level
function generateWeaponStats(rng, rarityIndex, level) {
  const stats = {};
  const statCount = rarityIndex <= 2 ? 2 : // F-E: 2 stats
                   rarityIndex <= 4 ? 3 : // D-C: 3 stats
                   rarityIndex <= 6 ? 4 : // B-A: 4 stats
                   5; // S-SSS: 5 stats
  
  // Secondary stats pool
  const secondaryStats = [
    'critDamage',
    'critRate',
    'skillCDReduction',
    'flatDMGBonus',
    'hp',
    'mp'
  ];
  
  // Random stats based on count
  for (let i = 0; i < statCount; i++) {
    // Choose a random stat that hasn't been chosen yet
    const availableStats = secondaryStats.filter(stat => !stats[stat]);
    if (availableStats.length === 0) break;
    
    const stat = rng.choose(availableStats);
    
    // Calculate value based on GDD formulas
    switch (stat) {
      case 'critDamage':
        // 10 + (Rarity * 5) + Random(0-5)
        stats[stat] = 10 + (rarityIndex * 5) + rng.nextInt(0, 6);
        break;
      case 'critRate':
        // 2 + (Rarity * 1) + Random(0-1)
        stats[stat] = 2 + rarityIndex + rng.nextInt(0, 2);
        break;
      case 'skillCDReduction':
        // 1 + (Rarity * 0.5) + Random(0-0.5)
        stats[stat] = 1 + (rarityIndex * 0.5) + (rng.nextFloat() * 0.5);
        stats[stat] = Math.min(5, parseFloat(stats[stat].toFixed(1)));
        break;
      case 'flatDMGBonus':
        // 2 + (Rarity * 1) + Random(0-2)
        stats[stat] = 2 + rarityIndex + rng.nextInt(0, 3);
        break;
      case 'hp':
        // 30 + (Rarity * 20) + (Level * 0.5) + Random(0-20)
        stats[stat] = 30 + (rarityIndex * 20) + (level * 0.5) + rng.nextInt(0, 21);
        break;
      case 'mp':
        // 20 + (Rarity * 10) + (Level * 0.3) + Random(0-10)
        stats[stat] = 20 + (rarityIndex * 10) + (level * 0.3) + rng.nextInt(0, 11);
        break;
    }
  }
  
  // For SSS items, add a unique buff
  if (rarityIndex === 9) {
    const uniqueBuffs = [
      { lifesteal: 5 },
      { sameDmgBonus: 30 },
      { dropRate: 10 },
      { critSpecial: { critDamage: 50, critRate: 20 } },
      { dmgBonus: 10 }
    ];
    
    stats.uniqueBuff = rng.choose(uniqueBuffs);
  }
  
  return stats;
}

// Helper function to generate armor stats based on rarity and level
function generateArmorStats(rng, rarityIndex, level) {
  // Very similar to weapon stats but with more defensive focus
  const stats = {};
  const statCount = rarityIndex <= 2 ? 2 : // F-E: 2 stats
                   rarityIndex <= 4 ? 3 : // D-C: 3 stats
                   rarityIndex <= 6 ? 4 : // B-A: 4 stats
                   5; // S-SSS: 5 stats
  
  // Secondary stats pool with more defensive options
  const secondaryStats = [
    'hp',
    'mp',
    'dodgeRate',
    'damageReduction',
    'elementResist',
    'statBonus'
  ];
  
  // Random stats based on count
  for (let i = 0; i < statCount; i++) {
    // Choose a random stat that hasn't been chosen yet
    const availableStats = secondaryStats.filter(stat => !stats[stat]);
    if (availableStats.length === 0) break;
    
    const stat = rng.choose(availableStats);
    
    // Calculate value based on similar formulas to weapons
    switch (stat) {
      case 'hp':
        // 50 + (Rarity * 25) + (Level * 0.7) + Random(0-30)
        stats[stat] = 50 + (rarityIndex * 25) + (level * 0.7) + rng.nextInt(0, 31);
        break;
      case 'mp':
        // 30 + (Rarity * 15) + (Level * 0.4) + Random(0-15)
        stats[stat] = 30 + (rarityIndex * 15) + (level * 0.4) + rng.nextInt(0, 16);
        break;
      case 'dodgeRate':
        // 1 + (Rarity * 0.5) + Random(0-1)
        stats[stat] = 1 + (rarityIndex * 0.5) + rng.nextInt(0, 2);
        stats[stat] = Math.min(10, parseFloat(stats[stat].toFixed(1)));
        break;
      case 'damageReduction':
        // 1 + (Rarity * 0.5) + Random(0-1)
        stats[stat] = 1 + (rarityIndex * 0.5) + rng.nextInt(0, 2);
        stats[stat] = Math.min(8, parseFloat(stats[stat].toFixed(1)));
        break;
      case 'elementResist':
        // 2 + (Rarity * 1) + Random(0-2)
        const elements = ['fire', 'ice', 'lightning', 'poison'];
        const element = rng.choose(elements);
        stats[stat] = {
          type: element,
          value: 2 + rarityIndex + rng.nextInt(0, 3)
        };
        break;
      case 'statBonus':
        // 1 + (Rarity * 0.5) + Random(0-1)
        const primaryStats = ['str', 'int', 'agi', 'dex', 'luk'];
        const primaryStat = rng.choose(primaryStats);
        stats[stat] = {
          type: primaryStat,
          value: 1 + Math.floor(rarityIndex * 0.5) + rng.nextInt(0, 2)
        };
        break;
    }
  }
  
  // For SSS items, add a unique buff
  if (rarityIndex === 9) {
    const uniqueBuffs = [
      { thorns: 5 },
      { revive: { chance: 5, hpPercent: 20 } },
      { statusImmunity: rng.choose(['stun', 'poison', 'burn', 'freeze']) },
      { healthRegen: 1 },
      { reflectDamage: 3 }
    ];
    
    stats.uniqueBuff = rng.choose(uniqueBuffs);
  }
  
  return stats;
}

module.exports = {
  getMaterials,
  getRecipes,
  craftItem
}; 