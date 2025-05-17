/**
 * Seed Generator
 * Implements the seed generation logic described in the GDD
 */

/**
 * Generate a numeric seed from a string input
 * @param {string} input - Input string for seed generation
 * @returns {number} - Numeric seed
 */
function generateSeed(input) {
  let hash = 0;
  if (!input) {
    return Math.floor(Math.random() * 2147483647);
  }

  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  
  return Math.abs(hash);
}

/**
 * Generate a unique seed with namespace
 * @param {string} input - Input string for seed generation
 * @param {string} namespace - Namespace for seed segmentation
 * @returns {object} - Seed object with namespace and identifiers
 */
function generateUniqueSeed(input, namespace = 'default') {
  const seed = generateSeed(input);
  
  // In real implementation, this would check for collisions in the database
  // For this prototype, we're just ensuring uniqueness via timestamp
  const timestamp = Date.now();
  
  return {
    primarySeed: seed,
    modifiedSeed: seed + (timestamp % 1000),
    namespace,
    originalInput: input,
    seedString: `${namespace}:${seed}:1`,
    timestamp
  };
}

/**
 * Create a seeded random number generator
 * @param {number} seed - Seed value
 * @returns {object} - RNG with seeded methods
 */
function createSeededRNG(seed) {
  return {
    _seed: seed,
    
    /**
     * Get next integer in range [min, max)
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (exclusive)
     * @returns {number} - Random integer
     */
    nextInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      this._seed = (this._seed * 1664525 + 1013904223) % 4294967296;
      return min + Math.floor((this._seed / 4294967296) * (max - min));
    },
    
    /**
     * Get next float in range [0, 1)
     * @returns {number} - Random float
     */
    nextFloat() {
      this._seed = (this._seed * 1664525 + 1013904223) % 4294967296;
      return this._seed / 4294967296;
    },
    
    /**
     * Choose random item from array
     * @param {Array} array - Array to pick from
     * @returns {*} - Random item
     */
    choose(array) {
      return array[this.nextInt(0, array.length)];
    },
    
    /**
     * Weighted random selection
     * @param {Object.<string, number>} weights - Object with keys as options and values as weights
     * @returns {string} - Selected key
     */
    weightedChoice(weights) {
      const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
      let choice = this.nextFloat() * totalWeight;
      
      for (const [item, weight] of Object.entries(weights)) {
        choice -= weight;
        if (choice <= 0) {
          return item;
        }
      }
      
      // Fallback
      return Object.keys(weights)[0];
    }
  };
}

/**
 * Apply balance modifiers to seed generation
 * @param {number} baseSeed - Original seed
 * @param {object} balanceParams - Balance parameters
 * @returns {object} - Modified seed with balance parameters
 */
function applySeedModifiers(baseSeed, balanceParams) {
  // Default parameters if none provided
  const params = balanceParams || {
    dropRateMultiplier: 1.0,
    rarityThresholdAdjustment: 0.0,
    difficultyModifier: 1.0
  };
  
  // Create a modified seed that encodes the parameters
  const modifierString = `${params.dropRateMultiplier.toFixed(2)}_${params.rarityThresholdAdjustment.toFixed(2)}_${params.difficultyModifier.toFixed(2)}`;
  const modifierSeed = generateSeed(modifierString);
  
  return {
    primarySeed: baseSeed,
    modifierSeed,
    appliedModifiers: params
  };
}

module.exports = {
  generateSeed,
  generateUniqueSeed,
  createSeededRNG,
  applySeedModifiers
}; 