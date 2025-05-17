/**
 * Enhancement Controller
 * Implementation of section 7 of the Game Design Document
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/database');

/**
 * Enhance an item following section 7
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function enhanceItem(req, res) {
  const { characterId } = req.params;
  const { itemId, useProtection = false } = req.body;
  
  if (!itemId) {
    return res.status(400).json({ message: 'Item ID is required' });
  }
  
  // Start database transaction
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Verify the character belongs to the user
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
    
    // Get inventory record
    const inventoryResult = await client.query(
      `SELECT id, items FROM ${db.TABLES.INVENTORY}
       WHERE character_id = $1`,
      [characterId]
    );
    
    if (inventoryResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Inventory not found' });
    }
    
    const inventoryId = inventoryResult.rows[0].id;
    const items = inventoryResult.rows[0].items || [];
    
    // Find the item to enhance
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
    
    // Calculate success rate and gold cost per section 7.1
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
        message: `Not enough gold. Enhancement costs ${goldCost} gold.`,
        required: goldCost, 
        available: characterGold
      });
    }
    
    // Look for protection scroll if requested
    let protectionScroll = null;
    if (useProtection && enhanceLevel >= 10) {
      // Determine appropriate scroll type per section 7.2
      let scrollType;
      if (enhanceLevel < 31) scrollType = 'minor';
      else if (enhanceLevel < 51) scrollType = 'standard';
      else if (enhanceLevel < 71) scrollType = 'superior';
      else scrollType = 'ultimate';
      
      // Find scroll in inventory
      const scrollIndex = items.findIndex(item => 
        item.type === 'scroll' && 
        item.scrollType === scrollType
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
    // Determine if milestone level for guaranteed success (section 7.2)
    const isMilestone = [30, 50, 70, 90].includes(enhanceLevel);
    
    // Success calculation
    const roll = Math.random() * 100;
    const isSuccess = roll < successRate || isMilestone;
    
    // Apply enhancement result
    if (isSuccess) {
      // Success - increase enhancement level
      items[itemIndex].enhanceLevel = enhanceLevel + 1;
      
      // Apply damage/defense boost per section 7.3
      const boostPercent = 1.5 * (enhanceLevel + 1);
      
      if (item.type === 'weapon' && item.attack) {
        const baseAttack = item.baseAttack || item.attack;
        items[itemIndex].baseAttack = baseAttack; // Store original attack
        items[itemIndex].attack = Math.floor(baseAttack * (1 + boostPercent / 100));
      } else if (item.type === 'armor' && item.defense) {
        const baseDefense = item.baseDefense || item.defense;
        items[itemIndex].baseDefense = baseDefense; // Store original defense
        items[itemIndex].defense = Math.floor(baseDefense * (1 + boostPercent / 100));
      }
      
      // Apply milestone bonuses per section 7.3
      if ([10, 20, 30, 50, 70, 90, 99].includes(enhanceLevel + 1)) {
        applyEnhancementMilestoneBonus(items[itemIndex], enhanceLevel + 1);
      }
    } else {
      // Failed enhancement
      // Check for protection or low level (under +10 doesn't fail per section 7.1)
      if (protectionScroll || enhanceLevel < 10) {
        // No level loss
      } else {
        // Reset to +9 if failed above +10 per section 7.1
        items[itemIndex].enhanceLevel = 9;
        
        // Recalculate stats
        const baseBoostPercent = 1.5 * 9; // For +9
        
        if (item.type === 'weapon' && item.attack) {
          const baseAttack = item.baseAttack || item.attack;
          items[itemIndex].attack = Math.floor(baseAttack * (1 + baseBoostPercent / 100));
        } else if (item.type === 'armor' && item.defense) {
          const baseDefense = item.baseDefense || item.defense;
          items[itemIndex].defense = Math.floor(baseDefense * (1 + baseBoostPercent / 100));
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
      // Reduce quantity or remove
      if (items[scrollIndex].quantity > 1) {
        items[scrollIndex].quantity -= 1;
      } else {
        items.splice(scrollIndex, 1);
      }
    }
    
    // Deduct gold
    characterGold -= goldCost;
    
    // Update inventory with modified items
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
    
    // Return result
    res.json({
      message: isSuccess ? 'Enhancement successful!' : 'Enhancement failed!',
      success: isSuccess,
      newLevel: items[itemIndex].enhanceLevel,
      item: items[itemIndex],
      remainingGold: characterGold
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Enhancement error:', error);
    res.status(500).json({ message: 'Failed to enhance item' });
  } finally {
    client.release();
  }
}

/**
 * Apply milestone bonus based on enhancement level
 * As specified in section 7.3
 * @param {Object} item - Item to apply bonus to
 * @param {number} level - Milestone level
 */
function applyEnhancementMilestoneBonus(item, level) {
  // Initialize milestone stats if needed
  if (!item.milestoneStats) {
    item.milestoneStats = {};
  }
  
  // Initialize the milestone stats for this level
  item.milestoneStats[level] = {};
  
  // Apply different bonuses based on milestone level per section 7.3
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

/**
 * Add random stats to an item as part of milestone bonus
 * @param {Object} item - Item to add stats to
 * @param {number} level - Enhancement level
 * @param {number} count - Number of stats to add
 */
function addRandomStat(item, level, count) {
  const seed = Date.now() + level + item.id;
  const possibleStats = ['str', 'int', 'agi', 'dex', 'luk', 'hp', 'mp', 'critRate', 'critDamage'];
  
  // Simple RNG for demonstration
  function seededRandom() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }
  
  // Add random stats
  for (let i = 0; i < count; i++) {
    // Select a stat
    const statIndex = Math.floor(seededRandom() * possibleStats.length);
    const stat = possibleStats[statIndex];
    
    // Calculate value based on stat type and level
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
    
    // Add to milestone stats
    item.milestoneStats[level][stat] = value;
    
    // Remove from possible stats for next iterations
    possibleStats.splice(statIndex, 1);
    if (possibleStats.length === 0) break;
  }
}

/**
 * Add special effect at +99 enhancement level
 * @param {Object} item - Item to add effect to
 * @param {number} level - Enhancement level (should be 99)
 */
function addSpecialEffect(item, level) {
  const seed = Date.now() + level + item.id;
  
  // Simple RNG for demonstration
  function seededRandom() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }
  
  // Possible special effects per section 7.3
  const possibleEffects = [
    { lifesteal: 5 },
    { damageReduction: 10 },
    { cooldownReduction: 8 },
    { elementalDamage: { 
      type: ['fire', 'ice', 'lightning', 'poison'][Math.floor(seededRandom() * 4)], 
      value: 15 
    }},
    { expBonus: 10 },
    { goldBonus: 20 }
  ];
  
  // Select an effect
  const effectIndex = Math.floor(seededRandom() * possibleEffects.length);
  item.milestoneStats[level].specialEffect = possibleEffects[effectIndex];
}

/**
 * Purchase a protection scroll from blacksmith
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function purchaseProtectionScroll(req, res) {
  const { characterId } = req.params;
  const { scrollType } = req.body;
  
  if (!scrollType || !['minor', 'standard', 'superior', 'ultimate'].includes(scrollType)) {
    return res.status(400).json({ message: 'Valid scroll type is required' });
  }
  
  // Start transaction
  const client = await db.getClient();
  
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
    
    // Check if character has enough gold (10,000 per section 7.2)
    const scrollCost = 10000;
    
    if (characterGold < scrollCost) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        message: `Not enough gold. Scroll costs ${scrollCost} gold.`,
        required: scrollCost,
        available: characterGold
      });
    }
    
    // Get inventory
    const inventoryResult = await client.query(
      `SELECT id, items FROM ${db.TABLES.INVENTORY}
       WHERE character_id = $1`,
      [characterId]
    );
    
    if (inventoryResult.rowCount === 0) {
      // Create inventory if it doesn't exist
      const newInventoryId = uuidv4();
      await client.query(
        `INSERT INTO ${db.TABLES.INVENTORY} (id, character_id, items)
         VALUES ($1, $2, $3)`,
        [newInventoryId, characterId, '[]']
      );
      
      // Fetch the new inventory
      const newInventoryResult = await client.query(
        `SELECT id, items FROM ${db.TABLES.INVENTORY}
         WHERE id = $1`,
        [newInventoryId]
      );
      
      if (newInventoryResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(500).json({ message: 'Failed to create inventory' });
      }
      
      inventoryId = newInventoryResult.rows[0].id;
      items = [];
    } else {
      inventoryId = inventoryResult.rows[0].id;
      items = inventoryResult.rows[0].items || [];
    }
    
    // Create scroll item
    const newScroll = {
      id: uuidv4(),
      name: `${scrollType.charAt(0).toUpperCase() + scrollType.slice(1)} Protection Scroll`,
      type: 'scroll',
      scrollType: scrollType,
      description: `Prevents item enhancement level loss up to +${
        scrollType === 'minor' ? '30' : 
        scrollType === 'standard' ? '50' : 
        scrollType === 'superior' ? '70' : '99'
      }`,
      quantity: 1
    };
    
    // Check if player already has this type of scroll
    const existingScrollIndex = items.findIndex(item => 
      item.type === 'scroll' && item.scrollType === scrollType
    );
    
    if (existingScrollIndex >= 0) {
      // Increase quantity
      items[existingScrollIndex].quantity += 1;
    } else {
      // Add new scroll
      items.push(newScroll);
    }
    
    // Deduct gold
    characterGold -= scrollCost;
    
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
      message: 'Protection scroll purchased successfully',
      scroll: newScroll,
      remainingGold: characterGold
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Purchase scroll error:', error);
    res.status(500).json({ message: 'Failed to purchase protection scroll' });
  } finally {
    client.release();
  }
}

module.exports = {
  enhanceItem,
  purchaseProtectionScroll
}; 