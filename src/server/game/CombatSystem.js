/**
 * Combat System
 * Implementation based on sections 1.3-1.6 of the game design
 */
const { getRandomInt } = require('../../shared/utils/seedGenerator');

class CombatSystem {
  constructor(seed) {
    this.seed = seed;
    this.globalCooldown = 1000; // 1 second global cooldown per section 1.3
  }
  
  /**
   * Calculate base damage following section 1.4
   * @param {Object} attacker - Attacking character or mob
   * @param {Object} weapon - Weapon being used
   * @returns {number} - Base damage value
   */
  calculateBaseDamage(attacker, weapon) {
    // Base Damage Formula from section 1.4
    // BaseDamage = (WeaponDMG + PrimaryStat) * (1 + EnhancementBonus)
    const primaryStat = this.getPrimaryStat(attacker, weapon);
    const enhancementBonus = (weapon.enhanceLevel || 0) * 0.015; // 1.5% per level from section 7
    
    return (weapon.attack + primaryStat) * (1 + enhancementBonus);
  }
  
  /**
   * Get the primary stat value based on weapon type from section 1.2
   * @param {Object} character - Character or mob
   * @param {Object} weapon - Weapon being used
   * @returns {number} - Primary stat value
   */
  getPrimaryStat(character, weapon) {
    const stats = character.stats || {};
    
    // Determine primary stat based on weapon type per section 2.1
    switch (weapon.subType) {
      case 'sword':
      case 'shield':
        return stats.str || 1;
      case 'orb':
      case 'staff':
        return stats.int || 1;
      case 'bow':
      case 'dagger':
        return stats.agi || 1;
      default:
        return 1; // Fallback
    }
  }
  
  /**
   * Calculate final damage with critical hits from section 1.4
   * @param {Object} attacker - Attacking character or mob
   * @param {Object} defender - Defending character or mob  
   * @param {Object} weapon - Weapon being used
   * @returns {Object} - Damage information
   */
  calculateDamage(attacker, defender, weapon) {
    // First check hit chance from section 1.4
    const hitChance = this.calculateHitChance(attacker, defender);
    const roll = Math.random();
    
    if (roll > hitChance) {
      return { damage: 0, hit: false, critical: false, message: 'Attack missed!' };
    }
    
    // Calculate base damage
    const baseDamage = this.calculateBaseDamage(attacker, weapon);
    
    // Calculate critical hit chance from section 1.4
    // CriticalChance = BaseCritRate + LUK/400 + ItemCritRate
    const baseCritRate = 0.05; // 5% base crit rate
    const luckBonus = (attacker.stats?.luk || 0) / 400;
    const itemCritBonus = (weapon.stats?.critRate || 0) / 100;
    const critChance = baseCritRate + luckBonus + itemCritBonus;
    
    // Determine if critical hit
    const critRoll = Math.random();
    const isCritical = critRoll < critChance;
    
    // Critical multiplier from section 1.4
    // CritMultiplier = 1.5 + (CritDamage/100)
    const baseCritMultiplier = 1.5;
    const critDamageBonus = (weapon.stats?.critDamage || 0) / 100;
    const critMultiplier = isCritical ? (baseCritMultiplier + critDamageBonus) : 1;
    
    // Calculate defense reduction from section 1.5
    // DamageReduction = DEF / (DEF + 100 + 10*AttackerLevel)
    const defenderDefense = this.calculateDefense(defender);
    const defenseReduction = defenderDefense / (defenderDefense + 100 + (10 * attacker.level));
    
    // Cap damage reduction at 75% per section 1.5
    const cappedReduction = Math.min(defenseReduction, 0.75);
    
    // Calculate flat damage bonus from weapon stats
    const flatDamageBonus = (weapon.stats?.flatDMGBonus || 0) / 100;
    
    // Final damage calculation from section 1.4
    // FinalDMG = BaseDamage * (1 + CritMultiplier) * (1 - TargetDefenseReduction) * (1 + FlatDMGBonus)
    let finalDamage = baseDamage * critMultiplier * (1 - cappedReduction) * (1 + flatDamageBonus);
    
    // Ensure minimum damage of 1% of base per section 1.5
    finalDamage = Math.max(finalDamage, baseDamage * 0.01);
    
    return {
      damage: Math.round(finalDamage),
      hit: true,
      critical: isCritical,
      message: isCritical ? 'Critical hit!' : 'Hit!',
      defenseReduction: cappedReduction,
      baseDamage: Math.round(baseDamage)
    };
  }
  
  /**
   * Calculate hit chance based on section 1.4
   * @param {Object} attacker - Attacking character
   * @param {Object} defender - Defending character
   * @returns {number} - Hit chance between 0-1
   */
  calculateHitChance(attacker, defender) {
    // HitChance = 0.95 + (DEX - TargetLevel)/200
    const baseHitChance = 0.95;
    const dexBonus = ((attacker.stats?.dex || 0) - defender.level) / 200;
    
    // Minimum hit chance of 0.7 (70%) per section 1.4
    return Math.max(0.7, baseHitChance + dexBonus);
  }
  
  /**
   * Calculate defense value based on equipment from section 1.5
   * @param {Object} character - Character or mob
   * @returns {number} - Total defense value
   */
  calculateDefense(character) {
    // Get base defense from section 1.1.1
    const baseDefense = 10 + (character.level * 2);
    
    // Add armor defense from equipment
    let armorDefense = 0;
    const inventory = character.inventory || [];
    
    // Add all equipped armor defense values
    for (const item of inventory) {
      if (item.type === 'armor' && item.equipped && item.defense) {
        // Apply enhancement bonus if any (1.5% per level from section 7)
        const enhancementBonus = (item.enhanceLevel || 0) * 0.015;
        armorDefense += item.defense * (1 + enhancementBonus);
      }
    }
    
    return baseDefense + armorDefense;
  }
  
  /**
   * Process a dodge attempt from section 1.5
   * @param {Object} defender - Defending character
   * @returns {boolean} - True if dodge successful
   */
  processDodge(defender) {
    // Dodge chance calculation from section 1.5
    // DodgeChance = BaseAGI/400 + ItemDodgeRate
    const baseAgiDodge = (defender.stats?.agi || 0) / 400;
    
    // Get dodge rate from items
    let itemDodgeRate = 0;
    const inventory = defender.inventory || [];
    for (const item of inventory) {
      if (item.equipped && item.stats?.dodgeRate) {
        itemDodgeRate += item.stats.dodgeRate / 100;
      }
    }
    
    // Total dodge chance capped at 30% per section 1.5
    const totalDodgeChance = Math.min(0.3, baseAgiDodge + itemDodgeRate);
    
    return Math.random() < totalDodgeChance;
  }
  
  /**
   * Apply a status effect from section 1.6
   * @param {Object} target - Target character or mob
   * @param {string} effectType - Status effect type
   * @param {number} duration - Effect duration in seconds
   * @param {number} potency - Effect potency value
   * @returns {Object} - Updated target with status effect
   */
  applyStatusEffect(target, effectType, duration, potency) {
    const now = Date.now();
    
    // Initialize status effects array if not present
    if (!target.statusEffects) {
      target.statusEffects = [];
    }
    
    // Status effect implementation based on section 1.6
    const existingEffect = target.statusEffects.find(effect => effect.type === effectType);
    
    // Handle stacking per the status effect table in section 1.6
    if (existingEffect) {
      switch (effectType) {
        case 'burn':
        case 'chill':
        case 'shock':
        case 'weaken':
        case 'berserk':
        case 'haste':
        case 'regen':
          // These effects are refreshed
          existingEffect.endsAt = now + (duration * 1000);
          existingEffect.potency = potency;
          break;
          
        case 'poison':
          // Poison stacks up to 3 times
          if (existingEffect.stacks < 3) {
            existingEffect.stacks += 1;
          }
          existingEffect.endsAt = now + (duration * 1000);
          break;
          
        case 'stun':
          // Stun cannot stack, but can be refreshed
          existingEffect.endsAt = now + (duration * 1000);
          break;
          
        case 'shield':
          // Shield stacks strength
          existingEffect.potency += potency;
          existingEffect.endsAt = now + (duration * 1000);
          break;
      }
    } else {
      // Add new effect
      target.statusEffects.push({
        type: effectType,
        potency: potency,
        stacks: effectType === 'poison' ? 1 : null,
        appliedAt: now,
        endsAt: now + (duration * 1000)
      });
    }
    
    return target;
  }
  
  /**
   * Process combat action with cooldowns per section 1.3
   * @param {Object} action - Combat action data
   * @param {Object} actionState - Current combat state
   * @returns {Object} - Action result and new state
   */
  processCombatAction(action, actionState) {
    const now = Date.now();
    
    // Check if still on global cooldown
    if (actionState.lastActionTime && (now - actionState.lastActionTime) < this.globalCooldown) {
      return {
        success: false,
        message: 'Action denied: Global cooldown active',
        remainingCooldown: this.globalCooldown - (now - actionState.lastActionTime)
      };
    }
    
    // Check for skill/weapon cooldown
    if (action.type === 'skill') {
      const skillCooldown = actionState.skillCooldowns?.[action.skillId] || 0;
      if (skillCooldown > now) {
        return {
          success: false,
          message: 'Skill still on cooldown',
          remainingCooldown: skillCooldown - now
        };
      }
    } else if (action.type === 'weapon') {
      const weaponCooldown = actionState.weaponCooldown || 0;
      if (weaponCooldown > now) {
        return {
          success: false,
          message: 'Weapon still on cooldown',
          remainingCooldown: weaponCooldown - now
        };
      }
    }
    
    // Process the action
    // (simplified - actual implementation would process damage and effects)
    
    // Update cooldowns
    const newState = { ...actionState, lastActionTime: now };
    
    if (action.type === 'skill') {
      if (!newState.skillCooldowns) newState.skillCooldowns = {};
      newState.skillCooldowns[action.skillId] = now + (action.cooldown * 1000);
    } else if (action.type === 'weapon') {
      newState.weaponCooldown = now + (action.cooldown * 1000);
    }
    
    return {
      success: true,
      message: 'Action processed successfully',
      newState
    };
  }
}

module.exports = CombatSystem; 