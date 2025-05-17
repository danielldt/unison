/**
 * Advanced Combat Calculator
 * Implements the combat formulas from the GDD for accurate damage calculations
 */

/**
 * Calculate attack damage with all modifiers
 * @param {Object} attacker - The attacking entity with stats
 * @param {Object} defender - The defending entity with stats
 * @param {Object} skill - The skill being used
 * @param {Object} options - Additional calculation options
 * @returns {Object} - Calculated damage and effects
 */
function calculateDamage(attacker, defender, skill, options = {}) {
  // Extract relevant stats with fallbacks
  const attackerStats = attacker.stats || {};
  const defenderStats = defender.stats || {};
  
  // Base stats
  const atkStat = attackerStats.atk || 10;
  const defStat = defenderStats.def || 5;
  const str = attackerStats.str || 1;
  const agi = attackerStats.agi || 1;
  const dex = attackerStats.dex || 1;
  const luk = attackerStats.luk || 1;
  const level = attackerStats.level || 1;
  
  // Get skill modifiers
  const skillPower = skill?.power || 1;
  const skillMultiplier = skill?.damageMultiplier || 1;
  
  // Apply weapon type bonus
  const weaponTypeBonus = getWeaponTypeBonus(attacker, skill);
  
  // Calculate base damage
  // Formula: (ATK * STR / 100) * Skill Power * Weapon Type Bonus
  let baseDamage = (atkStat * (1 + (str / 100))) * skillPower * skillMultiplier * weaponTypeBonus;
  
  // Calculate hit chance
  // Formula: 85 + (DEX - defender AGI) / 2, capped between 30% and 95%
  const hitChance = Math.min(95, Math.max(30, 85 + ((dex - defenderStats.agi) / 2)));
  
  // Check if attack hits
  const hitRoll = Math.random() * 100;
  const isHit = hitRoll <= hitChance;
  
  if (!isHit) {
    return {
      damage: 0,
      isCrit: false,
      isHit: false,
      effects: []
    };
  }
  
  // Calculate crit chance
  // Formula: (LUK / 400) + skill crit modifier, capped at 30%
  const critModifier = skill?.critModifier || 0;
  const critChance = Math.min(30, (luk / 400) + (critModifier * 100));
  
  // Check for critical hit
  const critRoll = Math.random() * 100;
  const isCrit = critRoll <= critChance;
  
  // Apply crit damage multiplier
  // Formula: 1.5 base + (LUK / 1000) + equipment bonuses
  const critDmgBase = 1.5;
  const critDmgLuk = luk / 1000;
  const critDmgEquipBonus = attackerStats.critDamage ? (attackerStats.critDamage / 100) : 0;
  const critMultiplier = isCrit ? (critDmgBase + critDmgLuk + critDmgEquipBonus) : 1;
  
  // Apply critical damage
  baseDamage *= critMultiplier;
  
  // Calculate defense reduction
  // Formula: DEF / (DEF + 100 + (10 * attacker level))
  const defReduction = defStat / (defStat + 100 + (10 * level));
  
  // Apply defense reduction (damage is reduced by this percentage)
  const damageAfterDef = baseDamage * (1 - defReduction);
  
  // Apply elemental modifiers if applicable
  const elementalMultiplier = calculateElementalMultiplier(skill?.element, defenderStats.resistances);
  const damageAfterElements = damageAfterDef * elementalMultiplier;
  
  // Apply random variation (±5%)
  const randomVariation = 0.95 + (Math.random() * 0.1);
  const finalDamage = Math.floor(damageAfterElements * randomVariation);
  
  // Calculate effects (status effects, etc.)
  const effects = calculateStatusEffects(skill, isCrit, attacker, defender);
  
  return {
    damage: finalDamage,
    isCrit,
    isHit: true,
    elementalMultiplier,
    defenseReduction: defReduction,
    effects
  };
}

/**
 * Calculate healing amount with all modifiers
 * @param {Object} healer - The healing entity with stats
 * @param {Object} target - The target entity to be healed
 * @param {Object} skill - The healing skill being used
 * @param {Object} options - Additional calculation options
 * @returns {Object} - Calculated healing and effects
 */
function calculateHealing(healer, target, skill, options = {}) {
  // Extract relevant stats with fallbacks
  const healerStats = healer.stats || {};
  const targetStats = target.stats || {};
  
  // Base stats
  const int = healerStats.int || 1;
  const level = healerStats.level || 1;
  
  // Get skill modifiers
  const healPower = skill?.healPower || 1;
  const healMultiplier = skill?.healMultiplier || 1;
  
  // Calculate base healing
  // Formula: (10 + Level + (INT * 2)) * Heal Power * Multiplier
  let baseHealing = (10 + level + (int * 2)) * healPower * healMultiplier;
  
  // Check for critical healing (half the chance of a critical hit)
  const critChance = Math.min(15, (healerStats.luk / 800));
  const critRoll = Math.random() * 100;
  const isCrit = critRoll <= critChance;
  
  // Critical healing bonus is 1.3x
  const critMultiplier = isCrit ? 1.3 : 1;
  baseHealing *= critMultiplier;
  
  // Apply healing effectiveness modifier from target
  const healingEffectivenessModifier = targetStats.healingReceived || 1;
  baseHealing *= healingEffectivenessModifier;
  
  // Apply random variation (±5%)
  const randomVariation = 0.95 + (Math.random() * 0.1);
  const finalHealing = Math.floor(baseHealing * randomVariation);
  
  // Calculate additional healing effects
  const effects = [];
  
  // Hot (Healing over time) effects
  if (skill?.hot) {
    effects.push({
      type: 'HOT',
      value: Math.floor(finalHealing * (skill.hot.power || 0.3)),
      duration: skill.hot.duration || 3,
      interval: skill.hot.interval || 1
    });
  }
  
  return {
    healing: finalHealing,
    isCrit,
    effects
  };
}

/**
 * Calculate the weapon type bonus based on stats and skill
 */
function getWeaponTypeBonus(attacker, skill) {
  if (!attacker.equipment || !skill) return 1;
  
  // Find equipped weapon
  const weapon = attacker.equipment.find(item => item.type === 'weapon' && item.equipped);
  if (!weapon) return 1;
  
  // Get attacker stats
  const stats = attacker.stats || {};
  
  // Calculate bonus based on weapon type
  switch (weapon.subType) {
    case 'sword':
      // Swords are balanced (STR + AGI)
      return 1 + ((stats.str + stats.agi) / 200);
    case 'axe':
      // Axes favor STR
      return 1 + (stats.str / 100);
    case 'dagger':
      // Daggers favor AGI and DEX
      return 1 + ((stats.agi + stats.dex) / 200);
    case 'staff':
      // Staves favor INT
      return 1 + (stats.int / 100);
    case 'bow':
      // Bows favor DEX
      return 1 + (stats.dex / 100);
    case 'orb':
      // Orbs favor INT and LUK
      return 1 + ((stats.int + stats.luk) / 200);
    default:
      return 1;
  }
}

/**
 * Calculate elemental damage multiplier
 */
function calculateElementalMultiplier(skillElement, resistances = {}) {
  if (!skillElement) return 1;
  
  // Base multipliers (neutral is 1.0)
  const elementalMatchups = {
    fire: {
      ice: 1.5,    // Fire is strong against ice
      nature: 1.3, // Fire is strong against nature
      fire: 0.5,   // Fire is weak against fire
      water: 0.7   // Fire is weak against water
    },
    ice: {
      water: 1.3,  // Ice is strong against water
      nature: 1.5, // Ice is strong against nature
      fire: 0.7,   // Ice is weak against fire
      ice: 0.5     // Ice is weak against ice
    },
    lightning: {
      water: 1.5,     // Lightning is strong against water
      metal: 1.3,     // Lightning is strong against metal
      earth: 0.7,     // Lightning is weak against earth
      lightning: 0.5  // Lightning is weak against lightning
    },
    poison: {
      nature: 1.5,  // Poison is strong against nature
      flesh: 1.3,   // Poison is strong against flesh
      metal: 0.7,   // Poison is weak against metal
      poison: 0.5   // Poison is weak against poison
    },
    holy: {
      undead: 2.0,    // Holy is very strong against undead
      corrupted: 1.5, // Holy is strong against corrupted
      holy: 0.5,      // Holy is weak against holy
      void: 0.7       // Holy is weak against void
    },
    void: {
      holy: 1.5,      // Void is strong against holy
      light: 1.3,     // Void is strong against light
      corrupted: 0.7, // Void is weak against corrupted
      void: 0.5       // Void is weak against void
    },
    physical: {
      ethereal: 0.7,  // Physical is weak against ethereal
      armored: 0.8    // Physical is slightly weak against armored
    }
  };
  
  // Get target resistance to this element (-100 to 100, with 0 being neutral)
  const resistance = resistances[skillElement] || 0;
  
  // Calculate resistance modifier (-100 = take 50% more damage, +100 = take 50% less damage)
  const resistanceModifier = 1 - (resistance / 200);
  
  // Get target type for elemental matchup
  const targetType = resistances.type || 'normal';
  
  // Get the elemental matchup modifier
  const matchupModifier = elementalMatchups[skillElement]?.[targetType] || 1;
  
  // Combine modifiers
  return resistanceModifier * matchupModifier;
}

/**
 * Calculate potential status effects from an attack
 */
function calculateStatusEffects(skill, isCrit, attacker, defender) {
  if (!skill || !skill.effects) return [];
  
  const appliedEffects = [];
  
  // Process each potential effect from the skill
  skill.effects.forEach(effect => {
    // Calculate chance to apply effect
    let applyChance = effect.chance || 0.1;
    
    // Critical hits have a higher chance to apply effects
    if (isCrit) {
      applyChance *= 1.5;
    }
    
    // Status effect resistance
    const resistanceKey = `${effect.type}Resist`;
    const resistance = defender.stats?.[resistanceKey] || 0;
    
    // Adjust chance based on resistance
    applyChance *= (1 - (resistance / 100));
    
    // Check if effect is applied
    if (Math.random() < applyChance) {
      // Calculate effect power and duration
      const power = effect.power || 1;
      const duration = effect.duration || 3;
      
      // Add effect to result
      appliedEffects.push({
        type: effect.type,
        power,
        duration,
        source: skill.id
      });
    }
  });
  
  return appliedEffects;
}

module.exports = {
  calculateDamage,
  calculateHealing,
  calculateElementalMultiplier,
  calculateStatusEffects
}; 