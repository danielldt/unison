/**
 * Advanced Seed Generation System
 * Implements the core seed-based procedural generation algorithm for Unison Legends
 */

/**
 * Generate a numeric seed from a string input
 * @param {string} input - String to generate seed from
 * @returns {number} - Generated numeric seed
 */
function generateSeedFromString(input) {
  let hash = 0;
  if (!input || input.length === 0) return hash;
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash);
}

/**
 * Generate a complete dungeon seed with properties
 * @param {Object} options - Options for seed generation
 * @returns {Object} - Complete dungeon seed object
 */
function generateDungeonSeed(options = {}) {
  const {
    baseSeed = generateSeedFromString(Date.now().toString()),
    difficulty = 1,
    dungeonType = 'normal',
    playerLevel = 1,
    playerCount = 1,
    modifiers = {}
  } = options;
  
  // Apply scaling factors
  const difficultyFactor = 1 + (difficulty * 0.1);
  const playerLevelFactor = 1 + (playerLevel * 0.01);
  const playerCountFactor = 1 + (playerCount * 0.05);
  
  // Generate sub-seeds for different aspects
  const roomSeed = (baseSeed * 13) % 2147483647;
  const mobSeed = (baseSeed * 29) % 2147483647;
  const lootSeed = (baseSeed * 47) % 2147483647;
  const eventSeed = (baseSeed * 61) % 2147483647;
  
  // Apply type-specific modifiers
  let dropRateModifier = 1.0;
  let enemyCountModifier = 1.0;
  let eliteChanceModifier = 0.05;
  let bossModifier = 1.0;
  
  switch (dungeonType) {
    case 'elite':
      dropRateModifier = 1.2;
      enemyCountModifier = 0.8;
      eliteChanceModifier = 0.15;
      bossModifier = 1.2;
      break;
    case 'raid':
      dropRateModifier = 1.5;
      enemyCountModifier = 0.7;
      eliteChanceModifier = 0.25;
      bossModifier = 1.5;
      break;
    case 'event':
      dropRateModifier = 1.8;
      enemyCountModifier = 1.2;
      eliteChanceModifier = 0.2;
      bossModifier = 1.3;
      break;
    default: // normal
      break;
  }
  
  // Apply custom modifiers
  if (modifiers.dropRate) dropRateModifier *= modifiers.dropRate;
  if (modifiers.enemyCount) enemyCountModifier *= modifiers.enemyCount;
  if (modifiers.eliteChance) eliteChanceModifier *= modifiers.eliteChance;
  if (modifiers.boss) bossModifier *= modifiers.boss;
  
  // Create complete seed object
  return {
    baseSeed,
    roomSeed,
    mobSeed,
    lootSeed,
    eventSeed,
    difficulty,
    dungeonType,
    playerLevel,
    playerCount,
    modifiers: {
      dropRate: dropRateModifier,
      enemyCount: enemyCountModifier * difficultyFactor * playerCountFactor,
      eliteChance: eliteChanceModifier * difficultyFactor,
      bossMultiplier: bossModifier * difficultyFactor * playerLevelFactor,
      generatedAt: Date.now()
    }
  };
}

/**
 * A seedable random number generator
 * @param {number} seed - Seed for RNG
 * @returns {function} - Random number generator function
 */
function seededRandom(seed) {
  let _seed = seed % 2147483647;
  if (_seed <= 0) _seed += 2147483646;
  
  return function() {
    _seed = _seed * 16807 % 2147483647;
    return (_seed - 1) / 2147483646;
  };
}

/**
 * Get a random integer between min and max (inclusive) using seeded RNG
 * @param {function} randomFunc - Seeded random function
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} - Random integer
 */
function getRandomInt(randomFunc, min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(randomFunc() * (max - min + 1)) + min;
}

/**
 * Get a weighted random item from an array
 * @param {function} randomFunc - Seeded random function
 * @param {Array} items - Array of items to choose from
 * @param {Array} weights - Array of weights (same length as items)
 * @returns {*} - Randomly selected item
 */
function getWeightedRandom(randomFunc, items, weights) {
  if (items.length === 0) return null;
  if (items.length !== weights.length) {
    throw new Error('Items and weights must have the same length');
  }
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const randomValue = randomFunc() * totalWeight;
  
  let cumulativeWeight = 0;
  for (let i = 0; i < items.length; i++) {
    cumulativeWeight += weights[i];
    if (randomValue <= cumulativeWeight) {
      return items[i];
    }
  }
  
  return items[items.length - 1]; // Fallback
}

module.exports = {
  generateSeedFromString,
  generateDungeonSeed,
  seededRandom,
  getRandomInt,
  getWeightedRandom
}; 