/**
 * Mob Drop Utility
 * Handles loot generation from defeated mobs
 */

const { generateItemDrops } = require('../../../seed_generation');

/**
 * Generate loot from a defeated mob
 * @param {Object} mob - The defeated mob
 * @param {Object} dungeon - The current dungeon
 * @param {Object} balanceParams - Game balance parameters
 * @returns {Array} - Generated loot items
 */
function generateMobLoot(mob, dungeon, balanceParams = {}) {
  if (!mob) return [];
  
  // Use mob seed for consistent drops based on mob identity
  const seed = mob.seedValue || Date.now();
  
  // Generate items based on mob properties
  return generateItemDrops(
    seed,
    mob.level,
    dungeon?.type || 'normal',
    mob.isBoss,
    balanceParams
  );
}

/**
 * Calculate experience gained from defeating a mob
 * @param {Object} mob - The defeated mob
 * @param {number} playerLevel - The player's level
 * @returns {number} - Experience points gained
 */
function calculateMobExperience(mob, playerLevel) {
  if (!mob) return 0;
  
  const mobLevel = mob.level || 1;
  const levelDiff = mobLevel - playerLevel;
  
  // Base XP calculation
  let baseXP = 10 + (mobLevel * 5);
  
  // Adjust for level difference
  if (levelDiff > 0) {
    // Bonus XP for defeating higher level mobs
    baseXP *= (1 + (levelDiff * 0.1));
  } else if (levelDiff < -5) {
    // Reduced XP for much lower level mobs
    baseXP *= Math.max(0.1, 0.8 + (levelDiff * 0.05));
  }
  
  // Boss bonus
  if (mob.isBoss) {
    baseXP *= 3;
  }
  
  return Math.floor(baseXP);
}

/**
 * Calculate gold dropped from a mob
 * @param {Object} mob - The defeated mob
 * @returns {number} - Gold amount
 */
function calculateMobGold(mob) {
  if (!mob) return 0;
  
  const mobLevel = mob.level || 1;
  
  // Base gold calculation
  let gold = 5 + (mobLevel * 3);
  
  // Boss bonus
  if (mob.isBoss) {
    gold *= 2.5;
  }
  
  // Random variation (±20%)
  const variation = 0.8 + (Math.random() * 0.4);
  
  return Math.floor(gold * variation);
}

module.exports = {
  generateMobLoot,
  calculateMobExperience,
  calculateMobGold
}; 