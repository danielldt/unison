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
 * @param {number|Object} seed - Seed for RNG (can be number or seed object)
 * @returns {function} - Random number generator function
 */
function createSeededRNG(seed) {
  // If seed is an object, extract the baseSeed
  let _seed;
  if (typeof seed === 'object' && seed !== null) {
    _seed = seed.baseSeed || Date.now();
  } else {
    _seed = seed || Date.now();
  }
  
  _seed = _seed % 2147483647;
  if (_seed <= 0) _seed += 2147483646;
  
  return {
    _seed,
    
    // Get next float in range [0, 1)
    nextFloat() {
      this._seed = (this._seed * 16807) % 2147483647;
      return (this._seed - 1) / 2147483646;
    },
    
    // Get next integer in range [min, max] (inclusive)
    nextInt(min, max) {
      return Math.floor(this.nextFloat() * (max - min + 1)) + min;
    },
    
    // Choose random item from array
    choose(array) {
      if (!array || array.length === 0) return null;
      return array[this.nextInt(0, array.length - 1)];
    },
    
    // Weighted random selection
    weightedChoice(options, weights) {
      if (!options || !weights || options.length !== weights.length) {
        throw new Error('Options and weights must be arrays of the same length');
      }
      
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let choice = this.nextFloat() * totalWeight;
      
      for (let i = 0; i < options.length; i++) {
        choice -= weights[i];
        if (choice <= 0) {
          return options[i];
        }
      }
      
      // Fallback
      return options[0];
    }
  };
}

/**
 * Get a random integer between min and max (inclusive) using seeded RNG
 * @param {Object} rng - Seeded random function object
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} - Random integer
 */
function getRandomInt(rng, min, max) {
  if (!rng || typeof rng.nextInt !== 'function') {
    // Fallback to non-seeded random if no proper RNG provided
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  return rng.nextInt(min, max);
}

/**
 * Get a weighted random item from an array
 * @param {Object} rng - Seeded random function object
 * @param {Array} items - Array of items to choose from
 * @param {Array} weights - Array of weights (same length as items)
 * @returns {*} - Randomly selected item
 */
function getWeightedRandom(rng, items, weights) {
  if (!items || !weights || items.length === 0 || items.length !== weights.length) {
    if (items && items.length > 0) return items[0]; // Fallback to first item
    return null;
  }
  
  if (!rng || typeof rng.weightedChoice !== 'function') {
    // Fallback to non-seeded weighted random
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const randomValue = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    for (let i = 0; i < items.length; i++) {
      cumulativeWeight += weights[i];
      if (randomValue <= cumulativeWeight) {
        return items[i];
      }
    }
    
    return items[items.length - 1]; // Fallback
  }
  
  return rng.weightedChoice(items, weights);
}

/**
 * Generate a unique seed string for a specific game element
 * @param {string} baseString - Base string to build seed from
 * @param {string} elementType - Type of element (dungeon, item, enemy, etc.)
 * @returns {Object} - Seed object with seed string and numeric seed
 */
function generateUniqueSeed(baseString, elementType = 'generic') {
  const timestamp = Date.now();
  const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  const seedString = `${elementType}-${baseString}-${timestamp}-${randomPart}`;
  const numericSeed = generateSeedFromString(seedString);
  
  return {
    seedString,
    numericSeed,
    timestamp,
    elementType
  };
}

module.exports = {
  generateSeedFromString,
  generateDungeonSeed,
  createSeededRNG,
  getRandomInt,
  getWeightedRandom,
  generateUniqueSeed
}; 