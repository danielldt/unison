const db = require('../../db/database');
const { v4: uuidv4 } = require('uuid');
const { createSeededRNG } = require('../../../shared/utils/seedGenerator');

/**
 * Get inventory for a character
 */
async function getInventory(req, res) {
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
    
    // Get inventory
    const inventoryResult = await db.query(
      `SELECT items FROM ${db.TABLES.INVENTORY} WHERE character_id = $1`,
      [characterId]
    );
    
    if (inventoryResult.rowCount === 0) {
      return res.json({ items: [] });
    }
    
    res.json({ items: inventoryResult.rows[0].items });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Failed to retrieve inventory' });
  }
}

/**
 * Equip an item
 */
async function equipItem(req, res) {
  const { characterId } = req.params;
  const { itemId } = req.body;
  
  if (!itemId) {
    return res.status(400).json({ message: 'Item ID is required' });
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
    
    // Get inventory
    const inventoryResult = await client.query(
      `SELECT id, items FROM ${db.TABLES.INVENTORY} WHERE character_id = $1`,
      [characterId]
    );
    
    if (inventoryResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Inventory not found' });
    }
    
    const inventoryId = inventoryResult.rows[0].id;
    const items = inventoryResult.rows[0].items;
    
    // Find the item
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const item = items[itemIndex];
    
    // Check if item can be equipped
    if (!['weapon', 'armor'].includes(item.type)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This item cannot be equipped' });
    }
    
    // Check level requirement
    if (item.requiredLevel && characterLevel < item.requiredLevel) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        message: `Character must be at least level ${item.requiredLevel} to equip this item` 
      });
    }
    
    // Unequip any currently equipped items of the same type & slot
    for (let i = 0; i < items.length; i++) {
      if (i !== itemIndex && 
          items[i].type === item.type && 
          items[i].subType === item.subType && 
          items[i].equipped) {
        items[i].equipped = false;
      }
    }
    
    // Equip the item
    items[itemIndex].equipped = true;
    
    // Update inventory
    await client.query(
      `UPDATE ${db.TABLES.INVENTORY} 
       SET items = $1, last_updated = NOW()
       WHERE id = $2`,
      [JSON.stringify(items), inventoryId]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Item equipped successfully',
      items
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Equip item error:', error);
    res.status(500).json({ message: 'Failed to equip item' });
  } finally {
    client.release();
  }
}

/**
 * Unequip an item
 */
async function unequipItem(req, res) {
  const { characterId } = req.params;
  const { itemId } = req.body;
  
  if (!itemId) {
    return res.status(400).json({ message: 'Item ID is required' });
  }
  
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
    
    // Get inventory
    const inventoryResult = await db.query(
      `SELECT id, items FROM ${db.TABLES.INVENTORY} WHERE character_id = $1`,
      [characterId]
    );
    
    if (inventoryResult.rowCount === 0) {
      return res.status(404).json({ message: 'Inventory not found' });
    }
    
    const inventoryId = inventoryResult.rows[0].id;
    const items = inventoryResult.rows[0].items;
    
    // Find the item
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Unequip the item
    items[itemIndex].equipped = false;
    
    // Update inventory
    await db.query(
      `UPDATE ${db.TABLES.INVENTORY} 
       SET items = $1, last_updated = NOW()
       WHERE id = $2`,
      [JSON.stringify(items), inventoryId]
    );
    
    res.json({ 
      message: 'Item unequipped successfully',
      items
    });
  } catch (error) {
    console.error('Unequip item error:', error);
    res.status(500).json({ message: 'Failed to unequip item' });
  }
}

/**
 * Use a consumable item
 */
async function useItem(req, res) {
  const { characterId } = req.params;
  const { itemId } = req.body;
  
  if (!itemId) {
    return res.status(400).json({ message: 'Item ID is required' });
  }
  
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verify character belongs to user
    const characterResult = await client.query(
      `SELECT id, stats FROM ${db.TABLES.CHARACTERS} 
       WHERE id = $1 AND user_id = $2`,
      [characterId, req.user.id]
    );
    
    if (characterResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Character not found' });
    }
    
    // Get inventory
    const inventoryResult = await client.query(
      `SELECT id, items FROM ${db.TABLES.INVENTORY} WHERE character_id = $1`,
      [characterId]
    );
    
    if (inventoryResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Inventory not found' });
    }
    
    const inventoryId = inventoryResult.rows[0].id;
    const items = inventoryResult.rows[0].items;
    
    // Find the item
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const item = items[itemIndex];
    
    // Check if item is a consumable
    if (item.type !== 'consumable') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This item cannot be used' });
    }
    
    // Apply item effect (would normally affect character stats)
    const effect = {
      type: 'ITEM_USED',
      itemId: item.id,
      itemName: item.name,
      effect: item.effect
    };
    
    // Reduce quantity
    if (item.quantity > 1) {
      items[itemIndex].quantity -= 1;
    } else {
      // Remove item if last one
      items.splice(itemIndex, 1);
    }
    
    // Update inventory
    await client.query(
      `UPDATE ${db.TABLES.INVENTORY} 
       SET items = $1, last_updated = NOW()
       WHERE id = $2`,
      [JSON.stringify(items), inventoryId]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Item used successfully',
      effect,
      items
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Use item error:', error);
    res.status(500).json({ message: 'Failed to use item' });
  } finally {
    client.release();
  }
}

/**
 * Enhance an item
 */
async function enhanceItem(req, res) {
  const { characterId } = req.params;
  const { itemId, useProtection = false } = req.body;
  
  if (!itemId) {
    return res.status(400).json({ message: 'Item ID is required' });
  }
  
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verify character belongs to user and get gold
    const characterResult = await client.query(
      `SELECT gold FROM ${db.TABLES.CHARACTERS} 
       WHERE id = $1 AND user_id = $2`,
      [characterId, req.user.id]
    );
    
    if (characterResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Character not found' });
    }
    
    let characterGold = characterResult.rows[0].gold;
    
    // Get inventory
    const inventoryResult = await client.query(
      `SELECT id, items FROM ${db.TABLES.INVENTORY} WHERE character_id = $1`,
      [characterId]
    );
    
    if (inventoryResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Inventory not found' });
    }
    
    const inventoryId = inventoryResult.rows[0].id;
    const items = inventoryResult.rows[0].items;
    
    // Find the item
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const item = items[itemIndex];
    
    // Check if item can be enhanced
    if (!['weapon', 'armor'].includes(item.type)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This item cannot be enhanced' });
    }
    
    // Get current enhancement level
    const enhanceLevel = item.enhanceLevel || 0;
    
    // Calculate costs and success rates based on GDD
    let successRate, goldCost;
    if (enhanceLevel < 10) {
      successRate = 100;
      goldCost = 500;
    } else if (enhanceLevel < 21) {
      successRate = 80;
      goldCost = 1000;
    } else if (enhanceLevel < 31) {
      successRate = 70;
      goldCost = 2000;
    } else if (enhanceLevel < 41) {
      successRate = 60;
      goldCost = 5000;
    } else if (enhanceLevel < 51) {
      successRate = 50;
      goldCost = 10000;
    } else if (enhanceLevel < 61) {
      successRate = 40;
      goldCost = 20000;
    } else if (enhanceLevel < 71) {
      successRate = 30;
      goldCost = 50000;
    } else if (enhanceLevel < 81) {
      successRate = 20;
      goldCost = 100000;
    } else if (enhanceLevel < 91) {
      successRate = 10;
      goldCost = 250000;
    } else if (enhanceLevel < 99) {
      successRate = 5;
      goldCost = 500000;
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Item is already at maximum enhancement level' });
    }
    
    // Check if character has enough gold
    if (characterGold < goldCost) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        message: `Not enough gold. Enhancement costs ${goldCost} gold.` 
      });
    }
    
    // Look for protection scroll if requested
    let protectionScroll = null;
    if (useProtection && enhanceLevel >= 10) {
      // Find appropriate protection scroll
      let scrollType;
      if (enhanceLevel < 31) scrollType = 'minor';
      else if (enhanceLevel < 51) scrollType = 'standard';
      else if (enhanceLevel < 71) scrollType = 'superior';
      else scrollType = 'ultimate';
      
      const scrollIndex = items.findIndex(item => 
        item.type === 'scroll' && item.scrollType === scrollType
      );
      
      if (scrollIndex === -1) {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          message: `No ${scrollType} protection scroll found in inventory.` 
        });
      }
      
      protectionScroll = items[scrollIndex];
    }
    
    // Perform enhancement attempt
    const roll = Math.random() * 100;
    const isSuccess = roll < successRate;
    
    // Handle guaranteed enhancement at milestone levels
    const isMilestone = [30, 50, 70, 90].includes(enhanceLevel);
    const forcedSuccess = isMilestone;
    
    // Apply enhancement result
    if (isSuccess || forcedSuccess) {
      // Success - increase enhancement level
      items[itemIndex].enhanceLevel = (enhanceLevel + 1);
      
      // Apply stat bonuses based on GDD
      if (!items[itemIndex].stats) {
        items[itemIndex].stats = {};
      }
      
      // Apply damage/defense boost
      const boostPercent = 1.5 * (enhanceLevel + 1);
      if (item.type === 'weapon') {
        items[itemIndex].enhancedAttack = Math.floor(item.attack * (1 + boostPercent / 100));
      } else {
        items[itemIndex].enhancedDefense = Math.floor(item.defense * (1 + boostPercent / 100));
      }
      
      // Apply milestone bonuses
      if ([10, 20, 30, 50, 70, 90, 99].includes(enhanceLevel + 1)) {
        applyMilestoneBonus(items[itemIndex], enhanceLevel + 1);
      }
    } else {
      // Failure - handle based on protection
      if (protectionScroll || enhanceLevel < 10) {
        // No level loss if protected or below +10
      } else {
        // Reset to +9 on failure (as per GDD)
        items[itemIndex].enhanceLevel = 9;
        
        // Reset enhanced stats
        const baseBoostPercent = 1.5 * 9; // For +9
        if (item.type === 'weapon') {
          items[itemIndex].enhancedAttack = Math.floor(item.attack * (1 + baseBoostPercent / 100));
        } else {
          items[itemIndex].enhancedDefense = Math.floor(item.defense * (1 + baseBoostPercent / 100));
        }
        
        // Remove milestone bonuses above +9
        if (items[itemIndex].milestoneStats) {
          const preservedMilestones = {};
          for (const level in items[itemIndex].milestoneStats) {
            if (parseInt(level) <= 9) {
              preservedMilestones[level] = items[itemIndex].milestoneStats[level];
            }
          }
          items[itemIndex].milestoneStats = preservedMilestones;
        }
      }
    }
    
    // Remove protection scroll if used
    if (protectionScroll && enhanceLevel >= 10) {
      const scrollIndex = items.findIndex(item => item.id === protectionScroll.id);
      if (items[scrollIndex].quantity > 1) {
        items[scrollIndex].quantity -= 1;
      } else {
        items.splice(scrollIndex, 1);
      }
    }
    
    // Deduct gold
    characterGold -= goldCost;
    
    // Update inventory
    await client.query(
      `UPDATE ${db.TABLES.INVENTORY} 
       SET items = $1, last_updated = NOW()
       WHERE id = $2`,
      [JSON.stringify(items), inventoryId]
    );
    
    // Update character gold
    await client.query(
      `UPDATE ${db.TABLES.CHARACTERS}
       SET gold = $1
       WHERE id = $2`,
      [characterGold, characterId]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      message: isSuccess ? 'Enhancement successful!' : 'Enhancement failed!',
      success: isSuccess,
      newLevel: items[itemIndex].enhanceLevel,
      item: items[itemIndex],
      remainingGold: characterGold,
      items
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Enhance item error:', error);
    res.status(500).json({ message: 'Failed to enhance item' });
  } finally {
    client.release();
  }
}

/**
 * Fuse multiple items into a new one
 */
async function fuseItems(req, res) {
  const { characterId } = req.params;
  const { itemIds } = req.body;
  
  if (!itemIds || !Array.isArray(itemIds) || itemIds.length !== 5) {
    return res.status(400).json({ message: 'Exactly 5 item IDs are required for fusion' });
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
    
    // Get inventory
    const inventoryResult = await client.query(
      `SELECT id, items FROM ${db.TABLES.INVENTORY} WHERE character_id = $1`,
      [characterId]
    );
    
    if (inventoryResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Inventory not found' });
    }
    
    const inventoryId = inventoryResult.rows[0].id;
    const items = inventoryResult.rows[0].items;
    
    // Find all items
    const fusionItems = [];
    const itemIndices = [];
    
    for (const itemId of itemIds) {
      const index = items.findIndex(item => item.id === itemId);
      if (index === -1) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Item with ID ${itemId} not found` });
      }
      
      fusionItems.push(items[index]);
      itemIndices.push(index);
    }
    
    // Check if all items are the same rarity and type
    const firstItem = fusionItems[0];
    const allSameRarity = fusionItems.every(item => item.rarity === firstItem.rarity);
    const allSameType = fusionItems.every(item => item.type === firstItem.type);
    
    if (!allSameRarity || !allSameType) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: 'All items must be the same rarity and type for fusion' 
      });
    }
    
    // Check if any items are +10 or above for bonus
    const anyEnhanced = fusionItems.some(item => (item.enhanceLevel || 0) >= 10);
    
    // Create seed for random generation
    const seed = Date.now() + Math.floor(Math.random() * 1000000);
    const rng = createSeededRNG(seed);
    
    // Generate new item of same type but rerolled stats
    const newItem = {
      id: uuidv4(),
      name: firstItem.name,
      type: firstItem.type,
      subType: firstItem.subType,
      rarity: firstItem.rarity,
      level: Math.max(...fusionItems.map(item => item.level || characterLevel)),
      enhanceLevel: 0, // Reset enhancement level
      seed
    };
    
    // Add type-specific properties
    if (firstItem.type === 'weapon') {
      // Recalculate weapon damage based on GDD formula
      const rarityIndex = getRarityIndex(firstItem.rarity);
      const rarityMultiplier = 0.8 + (rarityIndex * 0.1);
      const baseDamage = Math.floor((5 + (2 * newItem.level)) * rarityMultiplier);
      
      newItem.attack = baseDamage;
      newItem.stats = generateWeaponStats(rng, rarityIndex, newItem.level);
    } else if (firstItem.type === 'armor') {
      // Recalculate armor defense based on GDD formula
      const rarityIndex = getRarityIndex(firstItem.rarity);
      const rarityMultiplier = 0.8 + (rarityIndex * 0.1);
      const baseDefense = Math.floor((2 + newItem.level) * rarityMultiplier);
      
      newItem.defense = baseDefense;
      newItem.stats = generateArmorStats(rng, rarityIndex, newItem.level);
    }
    
    // Apply bonus for +10 items (10% chance to get one rarity higher)
    if (anyEnhanced && rng.nextFloat() < 0.1) {
      const rarities = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
      const currentIndex = rarities.indexOf(newItem.rarity);
      
      if (currentIndex < rarities.length - 1) {
        newItem.rarity = rarities[currentIndex + 1];
        
        // Recalculate stats for higher rarity
        if (firstItem.type === 'weapon' || firstItem.type === 'armor') {
          const newRarityIndex = getRarityIndex(newItem.rarity);
          
          if (firstItem.type === 'weapon') {
            const rarityMultiplier = 0.8 + (newRarityIndex * 0.1);
            newItem.attack = Math.floor((5 + (2 * newItem.level)) * rarityMultiplier);
            newItem.stats = generateWeaponStats(rng, newRarityIndex, newItem.level);
          } else {
            const rarityMultiplier = 0.8 + (newRarityIndex * 0.1);
            newItem.defense = Math.floor((2 + newItem.level) * rarityMultiplier);
            newItem.stats = generateArmorStats(rng, newRarityIndex, newItem.level);
          }
        }
      }
    }
    
    // Remove fusion items from inventory
    const updatedItems = items.filter((_, i) => !itemIndices.includes(i));
    
    // Add new item to inventory
    updatedItems.push(newItem);
    
    // Update inventory
    await client.query(
      `UPDATE ${db.TABLES.INVENTORY} 
       SET items = $1, last_updated = NOW()
       WHERE id = $2`,
      [JSON.stringify(updatedItems), inventoryId]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Fusion successful!',
      newItem,
      items: updatedItems
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fusion error:', error);
    res.status(500).json({ message: 'Failed to fuse items' });
  } finally {
    client.release();
  }
}

// Helper function to apply milestone bonuses
function applyMilestoneBonus(item, level) {
  if (!item.milestoneStats) {
    item.milestoneStats = {};
  }
  
  // Initialize the milestone stats for this level
  item.milestoneStats[level] = {};
  
  // Different bonuses based on milestone level
  switch (level) {
    case 10:
      // No additional stats at +10
      break;
    case 20:
      // +1 Random Stat
      addRandomStat(item, level, 1);
      break;
    case 30:
      // +2 Random Stats
      addRandomStat(item, level, 2);
      break;
    case 50:
      // +3 Random Stats
      addRandomStat(item, level, 3);
      break;
    case 70:
      // +4 Random Stats
      addRandomStat(item, level, 4);
      break;
    case 90:
      // +5 Random Stats
      addRandomStat(item, level, 5);
      break;
    case 99:
      // +6 Random Stats + Special Effect
      addRandomStat(item, level, 6);
      addSpecialEffect(item, level);
      break;
  }
}

// Helper function to add random stats to an item
function addRandomStat(item, level, count) {
  const seed = Date.now() + level + item.id;
  const rng = createSeededRNG(seed);
  
  const possibleStats = ['str', 'int', 'agi', 'dex', 'luk', 'hp', 'mp', 'critRate', 'critDamage'];
  
  for (let i = 0; i < count; i++) {
    const stat = rng.choose(possibleStats);
    let value;
    
    switch (stat) {
      case 'str':
      case 'int':
      case 'agi':
      case 'dex':
      case 'luk':
        value = 1 + Math.floor(level / 20);
        break;
      case 'hp':
        value = 20 + (level * 2);
        break;
      case 'mp':
        value = 10 + level;
        break;
      case 'critRate':
        value = 1 + Math.floor(level / 30);
        break;
      case 'critDamage':
        value = 5 + Math.floor(level / 15);
        break;
    }
    
    item.milestoneStats[level][stat] = value;
  }
}

// Helper function to add special effect at +99
function addSpecialEffect(item, level) {
  const seed = Date.now() + level + item.id;
  const rng = createSeededRNG(seed);
  
  const possibleEffects = [
    { lifesteal: 5 },
    { damageReduction: 10 },
    { cooldownReduction: 8 },
    { elementalDamage: { type: rng.choose(['fire', 'ice', 'lightning', 'poison']), value: 15 } },
    { expBonus: 10 },
    { goldBonus: 20 }
  ];
  
  item.milestoneStats[level].specialEffect = rng.choose(possibleEffects);
}

// Helper function to get rarity index
function getRarityIndex(rarity) {
  const rarities = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
  return rarities.indexOf(rarity) + 1;
}

// Helper function to generate weapon stats similar to crafting controller
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

// Helper function to generate armor stats
function generateArmorStats(rng, rarityIndex, level) {
  // Similar to weapon stats but with defensive focus
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
  
  return stats;
}

module.exports = {
  getInventory,
  equipItem,
  unequipItem,
  useItem,
  enhanceItem,
  fuseItems
}; 