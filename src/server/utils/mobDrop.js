/**
 * Mob Drop Generator
 * Handles loot generation for mobs in the game
 */

const { createSeededRNG, getWeightedRandom } = require('../../shared/utils/seedGenerator');

/**
 * Generate loot drops for a mob
 * @param {Object} mob - The defeated mob
 * @param {Object} options - Options for loot generation
 * @returns {Array} - Array of item drops
 */
function generateMobLoot(mob, options = {}) {
  const {
    seed = Date.now(),
    playerLevel = 1,
    difficulty = 1,
    luckModifier = 1.0
  } = options;
  
  const rng = createSeededRNG(seed);
  
  // Base drop chance based on mob level and type
  const baseDropChance = mob.isBoss ? 1.0 : 0.3 + (mob.level * 0.02);
  
  // Apply modifiers
  const modifiedChance = Math.min(1.0, baseDropChance * luckModifier);
  
  // Determine if item drops
  if (rng.nextFloat() > modifiedChance) {
    return []; // No drops
  }
  
  // Determine number of drops
  const dropCount = mob.isBoss 
    ? 1 + Math.floor(rng.nextFloat() * 3) 
    : (rng.nextFloat() < 0.3 ? 1 : 0);
  
  const drops = [];
  
  // Generate drops
  for (let i = 0; i < dropCount; i++) {
    // Simple placeholder item generation
    const item = {
      id: `item_${Date.now()}_${i}`,
      name: generateItemName(rng, mob),
      level: Math.max(1, Math.floor(mob.level * (0.8 + rng.nextFloat() * 0.4))),
      rarity: determineRarity(rng, mob)
    };
    
    drops.push(item);
  }
  
  return drops;
}

/**
 * Generate a name for a dropped item
 * @param {Object} rng - Seeded RNG
 * @param {Object} mob - The mob that dropped the item
 * @returns {string} - Generated item name
 */
function generateItemName(rng, mob) {
  const prefixes = ['Tarnished', 'Crude', 'Basic', 'Sturdy', 'Fine', 'Superior', 'Exceptional'];
  const itemTypes = ['Weapon', 'Armor', 'Trinket', 'Material', 'Potion'];
  
  const prefix = prefixes[Math.floor(rng.nextFloat() * prefixes.length)];
  const type = itemTypes[Math.floor(rng.nextFloat() * itemTypes.length)];
  
  return `${prefix} ${type}`;
}

/**
 * Determine the rarity of a dropped item
 * @param {Object} rng - Seeded RNG
 * @param {Object} mob - The mob that dropped the item
 * @returns {string} - Rarity level
 */
function determineRarity(rng, mob) {
  const rarities = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
  
  // Set weights based on mob type and level
  const weights = mob.isBoss 
    ? [0, 0, 0.1, 0.3, 0.3, 0.2, 0.08, 0.02, 0.001] // Boss weights favor higher rarity
    : [0.3, 0.25, 0.2, 0.15, 0.07, 0.02, 0.008, 0.002, 0.0001]; // Normal mob weights
  
  return getWeightedRandom(rng, rarities, weights);
}

/**
 * Calculate experience gained from defeating a mob
 * @param {Object} mob - The defeated mob
 * @param {Object} options - Experience calculation options
 * @returns {number} - Experience points
 */
function calculateMobExperience(mob, options = {}) {
  const { 
    playerLevel = 1,
    expModifier = 1.0
  } = options;
  
  // Base experience calculation
  let baseExp = mob.level * 10;
  
  // Apply modifiers for mob type
  if (mob.isBoss) {
    baseExp *= 5; // Bosses give 5x experience
  } else if (mob.isElite) {
    baseExp *= 2; // Elite mobs give 2x experience
  }
  
  // Apply level difference scaling
  const levelDiff = mob.level - playerLevel;
  let levelModifier = 1.0;
  
  if (levelDiff > 0) {
    // Higher level mobs give bonus exp (capped at 50%)
    levelModifier = Math.min(1.5, 1 + (levelDiff * 0.05));
  } else if (levelDiff < -5) {
    // Much lower level mobs give reduced exp
    levelModifier = Math.max(0.1, 1 - (Math.abs(levelDiff) * 0.1));
  }
  
  // Final calculation with custom modifier
  return Math.floor(baseExp * levelModifier * expModifier);
}

/**
 * Calculate gold dropped by a mob
 * @param {Object} mob - The defeated mob
 * @param {Object} options - Gold calculation options
 * @returns {number} - Gold amount
 */
function calculateMobGold(mob, options = {}) {
  const {
    seed = Date.now(),
    goldModifier = 1.0
  } = options;
  
  const rng = createSeededRNG(seed);
  
  // Base gold calculation
  const baseGold = mob.level * 5;
  
  // Apply range variability (80% to 120% of base)
  const variability = 0.8 + (rng.nextFloat() * 0.4);
  
  // Apply mob type modifier
  let typeModifier = 1.0;
  if (mob.isBoss) {
    typeModifier = 5.0; // Bosses drop 5x gold
  } else if (mob.isElite) {
    typeModifier = 2.0; // Elite mobs drop 2x gold
  }
  
  // Final calculation with custom modifier
  return Math.floor(baseGold * variability * typeModifier * goldModifier);
}

module.exports = {
  generateMobLoot,
  calculateMobExperience,
  calculateMobGold
}; 