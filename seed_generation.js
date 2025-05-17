/**
 * Seed Generation
 * Utility module for generating procedural content using seeded RNG
 */

const { createSeededRNG } = require('./src/shared/utils/seedGenerator');
const { generateItemName, generateItemDescription } = require('./src/shared/utils/itemNameGenerator');

// Item rarity weights (based on game design)
const RARITY_WEIGHTS = {
  normal: { 'F': 50, 'E': 30, 'D': 15, 'C': 5, 'B': 0, 'A': 0, 'S': 0, 'SS': 0, 'SSS': 0 },
  elite: { 'F': 20, 'E': 40, 'D': 25, 'C': 10, 'B': 5, 'A': 0, 'S': 0, 'SS': 0, 'SSS': 0 },
  raid: { 'F': 0, 'E': 10, 'D': 30, 'C': 30, 'B': 20, 'A': 8, 'S': 2, 'SS': 0, 'SSS': 0 }
};

// Item type weights
const ITEM_TYPE_WEIGHTS = {
  'weapon': 0.3,
  'armor': 0.3,
  'material': 0.3,
  'consumable': 0.1
};

// Weapon subtype weights
const WEAPON_SUBTYPE_WEIGHTS = {
  'sword': 0.2,
  'axe': 0.1,
  'staff': 0.15,
  'bow': 0.15,
  'dagger': 0.1,
  'shield': 0.1,
  'orb': 0.1,
  'wand': 0.1
};

// Armor subtype weights
const ARMOR_SUBTYPE_WEIGHTS = {
  'helmet': 0.2,
  'chest': 0.2,
  'legs': 0.2,
  'boots': 0.2,
  'gloves': 0.2
};

/**
 * Generate item drops based on seed, mob level, and difficulty
 * @param {number} seed - Seed for random generation
 * @param {number} mobLevel - Level of the defeated mob
 * @param {string} dungeonType - Type of dungeon (normal, elite, raid)
 * @param {boolean} isBoss - Whether the mob is a boss
 * @param {object} balanceParams - Game balance parameters
 * @returns {Array} - Generated items
 */
function generateItemDrops(seed, mobLevel, dungeonType = 'normal', isBoss = false, balanceParams = {}) {
  const rng = createSeededRNG(seed);
  const dropRateMultiplier = balanceParams.dropRateMultiplier || 1.0;
  const rarityThresholdAdjustment = balanceParams.rarityThresholdAdjustment || 0.0;
  
  // Determine number of drops
  const baseDropCount = isBoss ? 3 : 1;
  const dropCount = Math.max(1, Math.floor(baseDropCount * dropRateMultiplier));
  
  const drops = [];
  
  for (let i = 0; i < dropCount; i++) {
    // Use a different seed for each drop to avoid identical items
    const dropSeed = seed + i * 1000;
    const dropRng = createSeededRNG(dropSeed);
    
    // Determine if drop happens (higher chance for bosses)
    const dropChance = isBoss ? 1.0 : 0.5 + (rarityThresholdAdjustment / 2);
    if (dropRng() > dropChance) continue;
    
    // Determine item type
    const itemType = weightedChoice(dropRng, ITEM_TYPE_WEIGHTS);
    
    // Determine item rarity
    const rarityWeights = RARITY_WEIGHTS[dungeonType] || RARITY_WEIGHTS.normal;
    
    // Apply boss bonus to rarity weights for boss drops
    let adjustedRarityWeights = {...rarityWeights};
    if (isBoss) {
      Object.keys(adjustedRarityWeights).forEach(rarity => {
        if (rarity === 'F') {
          adjustedRarityWeights[rarity] = Math.max(0, adjustedRarityWeights[rarity] - 20);
        } else if (rarity === 'E') {
          adjustedRarityWeights[rarity] = Math.max(0, adjustedRarityWeights[rarity] - 10);
        } else if (rarity === 'A' || rarity === 'S' || rarity === 'SS') {
          adjustedRarityWeights[rarity] = adjustedRarityWeights[rarity] + 5;
        }
      });
    }
    
    const rarity = weightedChoice(dropRng, adjustedRarityWeights);
    
    // Generate item based on type
    const item = generateItem(dropSeed, itemType, rarity, mobLevel);
    
    drops.push(item);
  }
  
  return drops;
}

/**
 * Helper function for weighted random choice
 */
function weightedChoice(rng, weights) {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let choice = rng() * total;
  
  for (const [option, weight] of Object.entries(weights)) {
    choice -= weight;
    if (choice <= 0) {
      return option;
    }
  }
  
  // Fallback (shouldn't happen)
  return Object.keys(weights)[0];
}

/**
 * Generate a single item
 * @param {number} seed - Seed for random generation
 * @param {string} type - Type of item
 * @param {string} rarity - Rarity level
 * @param {number} level - Item level
 * @returns {object} - Generated item
 */
function generateItem(seed, type, rarity, level) {
  const rng = createSeededRNG(seed);
  
  // Base item object
  const item = {
    id: `item-${seed}`,
    type,
    rarity,
    level: Math.max(1, level),
    seed
  };
  
  // Add type-specific properties
  switch (type) {
    case 'weapon':
      const subType = weightedChoice(rng, WEAPON_SUBTYPE_WEIGHTS);
      item.subType = subType;
      item.attack = calculateWeaponAttack(level, rarity);
      item.durability = 100;
      item.attributes = generateItemStats(seed, rarity, level);
      
      // Add skill for weapons
      item.skill = generateWeaponSkill(seed, subType, rarity, level);
      break;
      
    case 'armor':
      const armorSubType = weightedChoice(rng, ARMOR_SUBTYPE_WEIGHTS);
      item.subType = armorSubType;
      item.defense = calculateArmorDefense(level, rarity, armorSubType);
      item.durability = 100;
      item.attributes = generateItemStats(seed, rarity, level);
      break;
      
    case 'material':
      item.subType = choose(rng, ['metal', 'leather', 'wood', 'cloth', 'gem', 'crystal', 'herb', 'essence']);
      item.quantity = 1;
      break;
      
    case 'consumable':
      item.subType = choose(rng, ['potion', 'scroll', 'food', 'elixir']);
      item.effect = generateConsumableEffect(seed, item.subType, rarity, level);
      item.quantity = 1;
      break;
  }
  
  // Add procedurally generated name and description
  item.name = generateItemName(item, seed);
  item.description = generateItemDescription(item, seed);
  
  return item;
}

/**
 * Helper function for random choice
 */
function choose(rng, options) {
  return options[Math.floor(rng() * options.length)];
}

/**
 * Calculate weapon attack based on level and rarity
 */
function calculateWeaponAttack(level, rarity) {
  const rarityMultiplier = getRarityMultiplier(rarity);
  return Math.floor((5 + (level * 2)) * rarityMultiplier);
}

/**
 * Calculate armor defense based on level, rarity and subtype
 */
function calculateArmorDefense(level, rarity, subType) {
  const rarityMultiplier = getRarityMultiplier(rarity);
  let baseDefense = 2 + level;
  
  // Adjust based on armor type
  switch (subType) {
    case 'helmet': baseDefense *= 0.8; break;
    case 'chest': baseDefense *= 1.2; break;
    case 'legs': baseDefense *= 1.0; break;
    case 'boots': baseDefense *= 0.7; break;
    case 'gloves': baseDefense *= 0.6; break;
  }
  
  return Math.floor(baseDefense * rarityMultiplier);
}

/**
 * Get multiplier based on rarity
 */
function getRarityMultiplier(rarity) {
  switch (rarity) {
    case 'F': return 0.8;
    case 'E': return 0.9;
    case 'D': return 1.0;
    case 'C': return 1.1;
    case 'B': return 1.2;
    case 'A': return 1.4;
    case 'S': return 1.7;
    case 'SS': return 2.0;
    case 'SSS': return 2.5;
    default: return 1.0;
  }
}

/**
 * Generate item stats based on rarity and level
 */
function generateItemStats(seed, rarity, level) {
  const rng = createSeededRNG(seed + 123);
  const rarityIndex = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].indexOf(rarity) + 1;
  const stats = {};
  
  // Number of stats based on rarity
  const statCount = Math.min(5, Math.max(2, Math.floor(rarityIndex / 2) + 1));
  
  // Potential stats
  const potentialStats = ['str', 'int', 'agi', 'dex', 'lck', 'hp', 'mp', 'critRate', 'critDamage'];
  
  for (let i = 0; i < statCount; i++) {
    // Choose a random stat that hasn't been chosen yet
    const availableStats = potentialStats.filter(stat => !stats[stat]);
    const stat = choose(rng, availableStats);
    
    // Calculate value based on rarity and level
    let value;
    switch (stat) {
      case 'str':
      case 'int':
      case 'agi':
      case 'dex':
      case 'lck':
        value = 1 + Math.floor(rarityIndex / 3) + Math.floor(level / 20);
        break;
      case 'hp':
        value = 20 + (rarityIndex * 10) + Math.floor(level * 0.5);
        break;
      case 'mp':
        value = 10 + (rarityIndex * 5) + Math.floor(level * 0.3);
        break;
      case 'critRate':
        value = 1 + Math.floor(rarityIndex / 3);
        break;
      case 'critDamage':
        value = 5 + (rarityIndex * 3);
        break;
    }
    
    stats[stat] = value;
  }
  
  return stats;
}

/**
 * Generate a weapon skill
 */
function generateWeaponSkill(seed, subType, rarity, level) {
  const rng = createSeededRNG(seed + 456);
  
  const skillTypes = {
    'sword': ['slash', 'pierce', 'whirlwind'],
    'axe': ['cleave', 'crush', 'execute'],
    'staff': ['fireball', 'iceblast', 'lightning'],
    'bow': ['powershot', 'multishot', 'snipe'],
    'dagger': ['backstab', 'poison', 'swiftcut'],
    'shield': ['bash', 'block', 'reflect'],
    'orb': ['arcane', 'drain', 'chaos'],
    'wand': ['heal', 'restore', 'buff']
  };
  
  const skillNames = {
    'slash': ['Slash', 'Blade Dance', 'Crescent Cut'],
    'pierce': ['Pierce', 'Impale', 'Skewer'],
    'whirlwind': ['Whirlwind', 'Cyclone', 'Tempest'],
    'cleave': ['Cleave', 'Rend', 'Sunder'],
    'crush': ['Crush', 'Smash', 'Demolish'],
    'execute': ['Execute', 'Decapitate', 'Slay'],
    'fireball': ['Fireball', 'Inferno', 'Blaze'],
    'iceblast': ['Ice Blast', 'Frost Nova', 'Blizzard'],
    'lightning': ['Lightning', 'Thunderbolt', 'Storm'],
    'powershot': ['Power Shot', 'Heavy Arrow', 'Piercing Shot'],
    'multishot': ['Multishot', 'Arrow Barrage', 'Volley'],
    'snipe': ['Snipe', 'Headshot', 'Deadly Aim'],
    'backstab': ['Backstab', 'Assassinate', 'Shadow Strike'],
    'poison': ['Poison', 'Venom', 'Toxin'],
    'swiftcut': ['Swift Cut', 'Quick Slash', 'Flurry'],
    'bash': ['Shield Bash', 'Pummel', 'Concussion'],
    'block': ['Block', 'Bulwark', 'Fortify'],
    'reflect': ['Reflect', 'Rebound', 'Deflect'],
    'arcane': ['Arcane Blast', 'Mystic Orb', 'Astral Power'],
    'drain': ['Drain', 'Siphon', 'Leech'],
    'chaos': ['Chaos Bolt', 'Void Strike', 'Dimensional Rift'],
    'heal': ['Heal', 'Mend', 'Restore'],
    'restore': ['Restore', 'Rejuvenate', 'Revitalize'],
    'buff': ['Empower', 'Strengthen', 'Fortify']
  };

  // Choose a skill type based on weapon
  const skillType = choose(rng, skillTypes[subType] || skillTypes.sword);

  // Choose a name based on skill type
  const skillName = choose(rng, skillNames[skillType] || ['Basic Attack']);

  // Calculate skill power based on rarity and level
  const rarityIndex = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].indexOf(rarity) + 1;
  const basePower = 10 + (level * 2) + (rarityIndex * 5);
  const cooldown = Math.max(2, 8 - Math.floor(rarityIndex / 2));

  return {
    id: `skill-${seed}-${subType}`,
    name: skillName,
    type: skillType.includes('heal') || skillType.includes('restore') ? 'HEAL' : 
          skillType.includes('buff') ? 'BUFF' : 'ATTACK',
    power: basePower,
    cooldown: cooldown,
    description: `Performs a ${skillName} attack.`
  };
}

/**
 * Generate consumable effect based on subtype, rarity and level
 */
function generateConsumableEffect(seed, subType, rarity, level) {
  const rng = createSeededRNG(seed + 789);
  const rarityIndex = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].indexOf(rarity) + 1;
  
  switch (subType) {
    case 'potion':
      return {
        type: 'heal',
        value: 20 + (level * 5) + (rarityIndex * 10)
      };
    case 'scroll':
      return {
        type: choose(rng, ['protection', 'teleport', 'identify']),
        duration: 5 + rarityIndex
      };
    case 'food':
      return {
        type: 'buff',
        stat: choose(rng, ['str', 'int', 'agi', 'dex', 'lck']),
        value: 1 + Math.floor(rarityIndex / 3),
        duration: 300 + (rarityIndex * 60)
      };
    case 'elixir':
      return {
        type: 'regen',
        value: 2 + Math.floor(rarityIndex / 2),
        duration: 60 + (rarityIndex * 30)
      };
    default:
      return {
        type: 'generic',
        value: 1 + rarityIndex
      };
  }
}

module.exports = {
  generateItemDrops,
  generateItem,
  generateWeaponSkill
}; 