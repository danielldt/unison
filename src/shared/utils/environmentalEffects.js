/**
 * Environmental Effects System
 * Adds dungeon-specific effects that affect gameplay
 */

const { createSeededRNG } = require('./seedGenerator');

// Types of environments
const ENVIRONMENT_TYPES = {
  NORMAL: 'normal',
  FIRE: 'fire',
  ICE: 'ice',
  POISON: 'poison',
  LIGHTNING: 'lightning',
  VOID: 'void',
  HOLY: 'holy',
  CORRUPTED: 'corrupted'
};

// Effect types
const EFFECT_TYPES = {
  DOT: 'damage_over_time',     // Damage over time
  STAT_MOD: 'stat_modifier',   // Modify a stat
  HEALING: 'healing',          // Healing over time
  HAZARD: 'hazard',            // Environmental hazard
  BUFF: 'buff',                // Positive effect
  DEBUFF: 'debuff'             // Negative effect
};

/**
 * Generate environmental effects for a dungeon
 * @param {number} seed - Seed for RNG
 * @param {string} dungeonType - Type of dungeon
 * @param {number} dungeonLevel - Level of dungeon
 * @returns {Array} - List of environmental effects
 */
function generateEnvironmentalEffects(seed, dungeonType, dungeonLevel) {
  const rng = createSeededRNG(seed);
  
  // Determine environment type
  const environmentType = determineEnvironmentType(rng, dungeonType);
  
  // Number of effects based on dungeon level and type
  const effectCount = Math.min(3, Math.max(1, Math.floor(dungeonLevel / 20)));
  const effects = [];
  
  // Generate base environment effect
  effects.push(generateBaseEffect(rng, environmentType, dungeonLevel));
  
  // Generate additional effects
  for (let i = 1; i < effectCount; i++) {
    effects.push(generateRandomEffect(rng, environmentType, dungeonLevel));
  }
  
  return {
    type: environmentType,
    effects,
    description: generateEnvironmentDescription(environmentType, effects)
  };
}

/**
 * Determine environment type based on seed and dungeon type
 */
function determineEnvironmentType(rng, dungeonType) {
  // Weight different environment types based on dungeon type
  let weights = {
    [ENVIRONMENT_TYPES.NORMAL]: 0.3,
    [ENVIRONMENT_TYPES.FIRE]: 0.1,
    [ENVIRONMENT_TYPES.ICE]: 0.1,
    [ENVIRONMENT_TYPES.POISON]: 0.1,
    [ENVIRONMENT_TYPES.LIGHTNING]: 0.1,
    [ENVIRONMENT_TYPES.VOID]: 0.1,
    [ENVIRONMENT_TYPES.HOLY]: 0.1,
    [ENVIRONMENT_TYPES.CORRUPTED]: 0.1
  };
  
  // Adjust weights based on dungeon type
  if (dungeonType === 'elite') {
    weights[ENVIRONMENT_TYPES.NORMAL] = 0.1;
    weights[ENVIRONMENT_TYPES.FIRE] = 0.15;
    weights[ENVIRONMENT_TYPES.ICE] = 0.15;
    weights[ENVIRONMENT_TYPES.POISON] = 0.15;
    weights[ENVIRONMENT_TYPES.LIGHTNING] = 0.15;
    weights[ENVIRONMENT_TYPES.VOID] = 0.1;
    weights[ENVIRONMENT_TYPES.HOLY] = 0.1;
    weights[ENVIRONMENT_TYPES.CORRUPTED] = 0.1;
  } else if (dungeonType === 'raid') {
    weights[ENVIRONMENT_TYPES.NORMAL] = 0.05;
    weights[ENVIRONMENT_TYPES.FIRE] = 0.1;
    weights[ENVIRONMENT_TYPES.ICE] = 0.1;
    weights[ENVIRONMENT_TYPES.POISON] = 0.1;
    weights[ENVIRONMENT_TYPES.LIGHTNING] = 0.1;
    weights[ENVIRONMENT_TYPES.VOID] = 0.2;
    weights[ENVIRONMENT_TYPES.HOLY] = 0.15;
    weights[ENVIRONMENT_TYPES.CORRUPTED] = 0.2;
  }
  
  return rng.weightedChoice(weights);
}

/**
 * Generate base effect specific to environment type
 */
function generateBaseEffect(rng, environmentType, dungeonLevel) {
  const basePower = Math.ceil(dungeonLevel * 0.3);
  
  switch (environmentType) {
    case ENVIRONMENT_TYPES.FIRE:
      return {
        type: EFFECT_TYPES.DOT,
        element: 'fire',
        value: basePower,
        interval: 5, // seconds
        chance: 0.1,
        description: 'Periodic fire damage to all entities'
      };
      
    case ENVIRONMENT_TYPES.ICE:
      return {
        type: EFFECT_TYPES.STAT_MOD,
        stat: 'agi',
        value: -0.1, // -10% agility
        description: 'Reduced movement and attack speed'
      };
      
    case ENVIRONMENT_TYPES.POISON:
      return {
        type: EFFECT_TYPES.DOT,
        element: 'poison',
        value: Math.ceil(basePower * 0.7),
        interval: 3, // seconds
        chance: 0.15,
        description: 'Periodic poison damage with chance to apply poison status'
      };
      
    case ENVIRONMENT_TYPES.LIGHTNING:
      return {
        type: EFFECT_TYPES.HAZARD,
        element: 'lightning',
        value: basePower * 2,
        interval: 8, // seconds
        description: 'Periodic lightning strikes in random locations'
      };
      
    case ENVIRONMENT_TYPES.VOID:
      return {
        type: EFFECT_TYPES.STAT_MOD,
        stat: 'all',
        value: -0.05, // -5% all stats
        description: 'Weakening void energy reduces all attributes'
      };
      
    case ENVIRONMENT_TYPES.HOLY:
      return {
        type: EFFECT_TYPES.HEALING,
        value: Math.ceil(basePower * 0.5),
        interval: 10, // seconds
        description: 'Periodic minor healing to all players'
      };
      
    case ENVIRONMENT_TYPES.CORRUPTED:
      return {
        type: EFFECT_TYPES.DEBUFF,
        stat: 'resistance',
        value: -0.15, // -15% resistance
        description: 'Corrupted energy increases damage taken'
      };
      
    default: // NORMAL
      return {
        type: EFFECT_TYPES.STAT_MOD,
        stat: 'none',
        value: 0,
        description: 'Standard environment with no effects'
      };
  }
}

/**
 * Generate a random effect
 */
function generateRandomEffect(rng, environmentType, dungeonLevel) {
  const effectType = rng.weightedChoice({
    [EFFECT_TYPES.DOT]: 0.2,
    [EFFECT_TYPES.STAT_MOD]: 0.3,
    [EFFECT_TYPES.HAZARD]: 0.2,
    [EFFECT_TYPES.BUFF]: 0.15,
    [EFFECT_TYPES.DEBUFF]: 0.15
  });
  
  const basePower = Math.ceil(dungeonLevel * 0.2);
  
  switch (effectType) {
    case EFFECT_TYPES.DOT:
      return {
        type: EFFECT_TYPES.DOT,
        element: getElementForEnvironment(environmentType),
        value: basePower,
        interval: 5 + rng.nextInt(0, 6),
        chance: 0.05 + (rng.nextFloat() * 0.1),
        description: `Periodic ${getElementForEnvironment(environmentType)} damage`
      };
      
    case EFFECT_TYPES.STAT_MOD:
      const stats = ['str', 'int', 'agi', 'dex', 'luk'];
      const stat = rng.choose(stats);
      const isPositive = rng.nextFloat() < 0.3; // 30% chance for positive mod
      return {
        type: EFFECT_TYPES.STAT_MOD,
        stat,
        value: isPositive ? 0.05 + (rng.nextFloat() * 0.1) : -(0.05 + (rng.nextFloat() * 0.1)),
        description: `${isPositive ? 'Increased' : 'Decreased'} ${stat} for all entities`
      };
      
    case EFFECT_TYPES.HAZARD:
      return {
        type: EFFECT_TYPES.HAZARD,
        element: getElementForEnvironment(environmentType),
        value: basePower * (1.5 + rng.nextFloat()),
        interval: 7 + rng.nextInt(0, 8),
        radius: 1 + rng.nextInt(1, 3),
        description: `Random ${getElementForEnvironment(environmentType)} hazards appear periodically`
      };
      
    case EFFECT_TYPES.BUFF:
      const buffStat = rng.choose(['str', 'int', 'agi', 'dex', 'luk', 'critRate', 'defense']);
      return {
        type: EFFECT_TYPES.BUFF,
        stat: buffStat,
        value: 0.05 + (rng.nextFloat() * 0.1),
        duration: 60, // 1 minute buff
        description: `Increased ${buffStat} for players who perform well`
      };
      
    case EFFECT_TYPES.DEBUFF:
      const debuffStat = rng.choose(['str', 'int', 'agi', 'dex', 'resistance']);
      return {
        type: EFFECT_TYPES.DEBUFF,
        stat: debuffStat,
        value: -(0.05 + (rng.nextFloat() * 0.1)),
        chance: 0.05 + (rng.nextFloat() * 0.1),
        duration: 15 + rng.nextInt(0, 16), // 15-30 seconds debuff
        description: `Chance to apply ${debuffStat} reduction when taking damage`
      };
  }
}

/**
 * Map environment type to element
 */
function getElementForEnvironment(environmentType) {
  switch (environmentType) {
    case ENVIRONMENT_TYPES.FIRE: return 'fire';
    case ENVIRONMENT_TYPES.ICE: return 'ice';
    case ENVIRONMENT_TYPES.POISON: return 'poison';
    case ENVIRONMENT_TYPES.LIGHTNING: return 'lightning';
    case ENVIRONMENT_TYPES.VOID: return 'void';
    case ENVIRONMENT_TYPES.HOLY: return 'holy';
    case ENVIRONMENT_TYPES.CORRUPTED: return 'corrupted';
    default: return 'physical';
  }
}

/**
 * Generate environment description
 */
function generateEnvironmentDescription(environmentType, effects) {
  const typeDescriptions = {
    [ENVIRONMENT_TYPES.NORMAL]: 'A standard dungeon environment.',
    [ENVIRONMENT_TYPES.FIRE]: 'Flames lick at the walls and floor, making the air hot and dry.',
    [ENVIRONMENT_TYPES.ICE]: 'Freezing temperatures cause frost to form on surfaces.',
    [ENVIRONMENT_TYPES.POISON]: 'Toxic fumes fill the air, and pools of poison dot the ground.',
    [ENVIRONMENT_TYPES.LIGHTNING]: 'The air crackles with electricity, and lightning strikes randomly.',
    [ENVIRONMENT_TYPES.VOID]: 'Reality seems thin here, with shadows moving of their own accord.',
    [ENVIRONMENT_TYPES.HOLY]: 'Divine light shines down, purifying the surroundings.',
    [ENVIRONMENT_TYPES.CORRUPTED]: 'Corruption has warped this place, tainting everything it touches.'
  };
  
  return typeDescriptions[environmentType] || 'A mysterious dungeon environment.';
}

/**
 * Apply environmental effects to an entity
 * @param {Object} entity - Player or mob
 * @param {Object} environment - Environmental effects
 * @param {Object} rng - Random number generator
 */
function applyEnvironmentalEffects(entity, environment, rng) {
  if (!environment || !environment.effects || !entity) return entity;
  
  // Make a copy of the entity to apply changes
  const updatedEntity = { ...entity };
  
  // Apply each effect
  environment.effects.forEach(effect => {
    // Check chance to apply
    if (effect.chance && rng.nextFloat() > effect.chance) return;
    
    switch (effect.type) {
      case EFFECT_TYPES.DOT:
        // Apply damage over time
        if (!updatedEntity.environmentalEffects) {
          updatedEntity.environmentalEffects = [];
        }
        
        // Add the effect if not already present
        if (!updatedEntity.environmentalEffects.some(e => e.type === effect.type && e.element === effect.element)) {
          updatedEntity.environmentalEffects.push({
            type: effect.type,
            element: effect.element,
            value: effect.value,
            interval: effect.interval,
            nextTick: Date.now() + (effect.interval * 1000)
          });
        }
        break;
        
      case EFFECT_TYPES.STAT_MOD:
        // Apply stat modification
        if (!updatedEntity.stats) {
          updatedEntity.stats = {};
        }
        
        // Apply to specific stat or all stats
        if (effect.stat === 'all') {
          ['str', 'int', 'agi', 'dex', 'luk'].forEach(stat => {
            if (updatedEntity.stats[stat]) {
              const modValue = updatedEntity.stats[stat] * effect.value;
              updatedEntity.stats[`${stat}Mod`] = (updatedEntity.stats[`${stat}Mod`] || 0) + modValue;
            }
          });
        } else if (effect.stat !== 'none' && updatedEntity.stats[effect.stat]) {
          const modValue = updatedEntity.stats[effect.stat] * effect.value;
          updatedEntity.stats[`${effect.stat}Mod`] = (updatedEntity.stats[`${effect.stat}Mod`] || 0) + modValue;
        }
        break;
        
      case EFFECT_TYPES.HEALING:
        // Apply healing over time
        if (!updatedEntity.environmentalEffects) {
          updatedEntity.environmentalEffects = [];
        }
        
        // Add the effect if not already present
        if (!updatedEntity.environmentalEffects.some(e => e.type === effect.type)) {
          updatedEntity.environmentalEffects.push({
            type: effect.type,
            value: effect.value,
            interval: effect.interval,
            nextTick: Date.now() + (effect.interval * 1000)
          });
        }
        break;
    }
  });
  
  return updatedEntity;
}

module.exports = {
  generateEnvironmentalEffects,
  applyEnvironmentalEffects,
  ENVIRONMENT_TYPES,
  EFFECT_TYPES
}; 