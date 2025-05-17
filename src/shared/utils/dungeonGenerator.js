/**
 * Dungeon Generator
 * Implementation of section 4 of the Game Design Document
 */

const { createSeededRNG, generateSeedFromString } = require('./seedGenerator');

// Name component libraries per section 4.2
const OBJECTS = [
  'Crystal', 'Throne', 'Crown', 'Sword', 'Shield', 'Chalice', 'Tome', 'Altar',
  'Statue', 'Relic', 'Orb', 'Pendant', 'Staff', 'Skull', 'Axe', 'Hammer',
  'Dagger', 'Bow', 'Arrow', 'Quiver', 'Wand', 'Scroll', 'Potion', 'Elixir'
];

const PLACES = [
  'Cave', 'Dungeon', 'Temple', 'Castle', 'Tower', 'Fortress', 'Citadel', 'Keep',
  'Crypt', 'Tomb', 'Catacomb', 'Ruin', 'Palace', 'Sanctuary', 'Shrine', 'Vault'
];

const ADJECTIVES = [
  'Ancient', 'Forgotten', 'Lost', 'Hidden', 'Secret', 'Cursed', 'Haunted', 'Grim',
  'Dark', 'Shadowy', 'Misty', 'Foggy', 'Frozen', 'Burning', 'Molten', 'Spectral'
];

/**
 * Generate a dungeon name from seed as per section 4.2
 * @param {string|number} seed - Dungeon seed
 * @returns {string} - Generated dungeon name
 */
function generateDungeonName(seed) {
  // Check if the seed is already in the Adjective_Place_Object format
  if (typeof seed === 'string') {
    const parts = seed.split('_');
    if (parts.length >= 3) {
      // If seed is already in the expected format, extract components directly
      const adjective = parts[0];
      const place = parts[1];
      const object = parts[2];
      
      // Verify each part exists in our word lists (case-insensitive)
      const validAdjective = ADJECTIVES.find(a => a.toLowerCase() === adjective.toLowerCase()) || adjective;
      const validPlace = PLACES.find(p => p.toLowerCase() === place.toLowerCase()) || place;
      const validObject = OBJECTS.find(o => o.toLowerCase() === object.toLowerCase()) || object;
      
      return `${validAdjective} ${validPlace} of the ${validObject}`;
    }
  }

  // If seed is not in expected format, generate name using RNG
  const numericSeed = typeof seed === 'number' ? seed : generateSeedFromString(seed);
  const rng = createSeededRNG(numericSeed);
  
  const object = OBJECTS[rng.nextInt(0, OBJECTS.length - 1)];
  const place = PLACES[rng.nextInt(0, PLACES.length - 1)];
  const adjective = ADJECTIVES[rng.nextInt(0, ADJECTIVES.length - 1)];
  
  return `${adjective} ${place} of the ${object}`;
}

/**
 * Generate a dungeon based on section 4
 * @param {string|number} seed - Seed for generation
 * @param {number} playerLevel - Player's level
 * @param {string} dungeonType - Type of dungeon (normal, elite, raid, event)
 * @param {Object} balanceParams - Optional balance parameters
 * @returns {Object} - Generated dungeon data
 */
function generateDungeon(seed, playerLevel = 1, dungeonType = 'normal', balanceParams = {}) {
  // Convert string seed to numeric seed for the RNG
  const numericSeed = typeof seed === 'number' ? seed : generateSeedFromString(seed);
  const rng = createSeededRNG(numericSeed);
  
  // Determine wave count based on dungeon type per section 4.1
  let minWaves, maxWaves;
  switch (dungeonType) {
    case 'elite':
      minWaves = 5;
      maxWaves = 6;
      break;
    case 'raid':
      minWaves = 6; 
      maxWaves = 6;
      break;
    case 'event':
      minWaves = 4;
      maxWaves = 7;
      break;
    case 'normal':
    default:
      minWaves = 4;
      maxWaves = 5;
      break;
  }
  
  // Generate wave count using RNG and section 4.2 formula
  const baseWaveCount = minWaves;
  const extraWaves = maxWaves - minWaves;
  const waveCount = baseWaveCount + (rng.nextInt(0, 100) % (extraWaves + 1));
  
  // Determine dungeon level range based on player level and type
  let minLevel = Math.max(1, playerLevel - 5);
  let maxLevel = playerLevel + 5;
  
  // Apply level restrictions from section 4.1
  if (dungeonType === 'elite' && minLevel < 50) {
    minLevel = 50;
  } else if (dungeonType === 'raid' && minLevel < 70) {
    minLevel = 70;
  }
  
  // Generate waves
  const waves = [];
  for (let i = 0; i < waveCount; i++) {
    // Last wave is always a boss wave
    const isBossWave = i === waveCount - 1;
    
    // For intermediate waves, elite enemies become more common in later waves
    const eliteChance = 0.05 + (i / waveCount) * 0.15;
    
    // Generate mobs for this wave
    const mobCount = isBossWave ? 1 : rng.nextInt(2, 4 + Math.floor(playerLevel / 20));
    const mobs = [];
    
    for (let j = 0; j < mobCount; j++) {
      // For the boss wave, generate a boss
      if (isBossWave && j === 0) {
        mobs.push(generateBossMob(rng, playerLevel, dungeonType));
      } else {
        // Regular mobs with a chance for elites
        const isElite = rng.nextFloat() < eliteChance;
        mobs.push(generateMob(rng, playerLevel, isElite));
      }
    }
    
    waves.push({
      waveNumber: i + 1,
      mobs,
      isBossWave
    });
  }
  
  // Generate dungeon loot based on section 4.3
  const loot = generateDungeonLoot(rng, playerLevel, dungeonType);
  
  // Generate dungeon name from components per section 4.2
  const dungeonName = generateDungeonName(seed);
  
  return {
    id: `dungeon-${seed}`,
    name: dungeonName,
    type: dungeonType,
    playerLevel,
    waves,
    loot,
    seed
  };
}

/**
 * Generate a mob for dungeons
 * @param {Object} rng - Seeded RNG instance
 * @param {number} playerLevel - Player level
 * @param {boolean} isElite - Whether this is an elite mob
 * @returns {Object} - Generated mob data
 */
function generateMob(rng, playerLevel, isElite = false) {
  const mobLevel = Math.max(1, playerLevel - 2 + rng.nextInt(0, 4));
  
  // Mob types with their base stats
  const mobTypes = [
    { type: 'goblin', hp: 50, attack: 8, defense: 5 },
    { type: 'skeleton', hp: 40, attack: 10, defense: 3 },
    { type: 'zombie', hp: 60, attack: 7, defense: 6 },
    { type: 'orc', hp: 70, attack: 12, defense: 8 }
  ];
  
  const selectedType = mobTypes[rng.nextInt(0, mobTypes.length - 1)];
  
  // Elite mobs have better stats per section 4.1
  const eliteMultiplier = isElite ? 2.5 : 1.0;
  
  // Scale stats by level
  const levelScaling = 1.0 + (mobLevel - 1) * 0.1;
  
  return {
    id: `mob-${rng.nextInt(10000, 99999)}`,
    name: `${isElite ? 'Elite ' : ''}${selectedType.type.charAt(0).toUpperCase() + selectedType.type.slice(1)}`,
    type: selectedType.type,
    level: mobLevel,
    isElite,
    hp: Math.round(selectedType.hp * levelScaling * eliteMultiplier),
    attack: Math.round(selectedType.attack * levelScaling * eliteMultiplier),
    defense: Math.round(selectedType.defense * levelScaling * eliteMultiplier),
    xpReward: isElite ? 25 * mobLevel : 10 * mobLevel // Based on section 11.1.2
  };
}

/**
 * Generate a boss mob
 * @param {Object} rng - Seeded RNG instance
 * @param {number} playerLevel - Player level
 * @param {string} dungeonType - Dungeon type
 * @returns {Object} - Generated boss data
 */
function generateBossMob(rng, playerLevel, dungeonType) {
  const bossLevel = playerLevel + rng.nextInt(1, 3);
  
  // Boss types with their base stats
  const bossTypes = [
    { type: 'dragon', hp: 200, attack: 25, defense: 20 },
    { type: 'giant', hp: 250, attack: 22, defense: 18 },
    { type: 'demon', hp: 180, attack: 28, defense: 15 }
  ];
  
  const selectedType = bossTypes[rng.nextInt(0, bossTypes.length - 1)];
  
  // Additional multiplier based on dungeon type
  let typeMultiplier = 1.0;
  switch (dungeonType) {
    case 'elite': typeMultiplier = 1.5; break;
    case 'raid': typeMultiplier = 2.0; break;
    case 'event': typeMultiplier = 1.8; break;
    default: break;
  }
  
  // Scale stats by level
  const levelScaling = 1.0 + (bossLevel - 1) * 0.1;
  
  return {
    id: `boss-${rng.nextInt(10000, 99999)}`,
    name: `${selectedType.type.charAt(0).toUpperCase() + selectedType.type.slice(1)} Lord`,
    type: selectedType.type,
    level: bossLevel,
    isBoss: true,
    hp: Math.round(selectedType.hp * levelScaling * typeMultiplier),
    attack: Math.round(selectedType.attack * levelScaling * typeMultiplier),
    defense: Math.round(selectedType.defense * levelScaling * typeMultiplier),
    xpReward: 100 * bossLevel, // Based on section 11.1.2
    specialAbilities: generateBossAbilities(rng, selectedType.type)
  };
}

/**
 * Generate special abilities for a boss
 * @param {Object} rng - Seeded RNG instance
 * @param {string} bossType - Type of boss
 * @returns {Array} - List of special abilities
 */
function generateBossAbilities(rng, bossType) {
  const commonAbilities = [
    { name: 'Healing Surge', type: 'heal', cooldown: 20 },
    { name: 'Rage', type: 'buff', cooldown: 30 },
    { name: 'Ground Slam', type: 'aoe', cooldown: 15 }
  ];
  
  // Type-specific abilities
  const typeAbilities = {
    dragon: [
      { name: 'Fire Breath', type: 'aoe', cooldown: 12, effect: 'burn' },
      { name: 'Wing Gust', type: 'knockback', cooldown: 18 }
    ],
    giant: [
      { name: 'Boulder Throw', type: 'ranged', cooldown: 10 },
      { name: 'Earthquake', type: 'stun', cooldown: 25 }
    ],
    demon: [
      { name: 'Soul Drain', type: 'leech', cooldown: 15 },
      { name: 'Hellfire', type: 'dot', cooldown: 20, effect: 'burn' }
    ]
  };
  
  // Select 1-2 common abilities
  const abilities = [];
  const commonCount = rng.nextInt(1, 2);
  
  for (let i = 0; i < commonCount; i++) {
    const ability = rng.choose(commonAbilities);
    abilities.push(ability);
    // Remove to avoid duplicates
    commonAbilities.splice(commonAbilities.indexOf(ability), 1);
  }
  
  // Add 1-2 type-specific abilities if available
  if (typeAbilities[bossType]) {
    const typeCount = rng.nextInt(1, 2);
    const typeOptions = [...typeAbilities[bossType]];
    
    for (let i = 0; i < typeCount && typeOptions.length > 0; i++) {
      const ability = rng.choose(typeOptions);
      abilities.push(ability);
      // Remove to avoid duplicates
      typeOptions.splice(typeOptions.indexOf(ability), 1);
    }
  }
  
  return abilities;
}

/**
 * Generate loot for a dungeon per section 4.3
 * @param {Object} rng - Seeded RNG instance
 * @param {number} playerLevel - Player level
 * @param {string} dungeonType - Type of dungeon
 * @returns {Object} - Generated loot
 */
function generateDungeonLoot(rng, playerLevel, dungeonType) {
  // Ensure RNG is valid - if not, create a new one
  if (!rng || typeof rng.nextFloat !== 'function' || typeof rng.nextInt !== 'function') {
    console.error('Invalid RNG passed to generateDungeonLoot, creating fallback');
    rng = createSeededRNG(Date.now());
  }

  // Base gold reward scaled by level and dungeon type
  let goldBase;
  switch (dungeonType) {
    case 'normal': goldBase = 100; break;  // 100-500 gold per section 14.4
    case 'elite': goldBase = 500; break;   // 500-2000 gold per section 14.4
    case 'raid': goldBase = 5000; break;   // 5000-10000 gold per section 14.4
    case 'event': goldBase = 1000; break;
    default: goldBase = 100;
  }
  
  // Gold reward with level scaling and random variation
  const goldVariation = rng.nextFloat() * 0.5 + 0.75; // 75%-125% variation
  const goldReward = Math.round(goldBase * (1 + playerLevel / 50) * goldVariation);
  
  // Materials chance based on section 4.3 (80%)
  const materialChance = 0.8;
  const materials = rng.nextFloat() < materialChance ? generateMaterials(rng, playerLevel, dungeonType) : [];
  
  // Enhancement gems chance based on section 4.3 (50%)
  const gemsChance = 0.5;
  const gems = rng.nextFloat() < gemsChance ? generateEnhancementGems(rng, playerLevel) : [];
  
  // Protection scrolls chance based on section 4.3 (10%)
  const scrollChance = 0.1;
  const scrolls = rng.nextFloat() < scrollChance ? generateProtectionScrolls(rng, dungeonType) : [];
  
  // Potions chance based on section 4.3 (10%)
  const potionChance = 0.1;
  const potions = rng.nextFloat() < potionChance ? generatePotions(rng, playerLevel) : [];
  
  // Ensure all arrays exist even if empty
  return {
    gold: goldReward || 0, // Fallback to 0 if null
    materials: materials || [],
    gems: gems || [],
    scrolls: scrolls || [],
    potions: potions || []
  };
}

/**
 * Generate materials as part of dungeon loot
 * @param {Object} rng - Seeded RNG instance
 * @param {number} playerLevel - Player level
 * @param {string} dungeonType - Type of dungeon
 * @returns {Array} - Generated materials
 */
function generateMaterials(rng, playerLevel, dungeonType) {
  const materials = [];
  const materialCount = rng.nextInt(1, 3 + Math.floor(playerLevel / 20));
  
  // Material types per section 6.2
  const materialTypes = ['metal', 'wood', 'leather', 'cloth', 'crystal', 'stone', 'essence'];
  
  // Material rarity chances based on dungeon type and player level
  let rarityChances;
  switch (dungeonType) {
    case 'normal':
      rarityChances = [
        { rarity: 'common', chance: 0.7 - (playerLevel / 200) },
        { rarity: 'uncommon', chance: 0.25 },
        { rarity: 'rare', chance: 0.05 + (playerLevel / 200) }
      ];
      break;
    case 'elite':
      rarityChances = [
        { rarity: 'uncommon', chance: 0.6 - (playerLevel / 200) },
        { rarity: 'rare', chance: 0.3 },
        { rarity: 'epic', chance: 0.1 + (playerLevel / 200) }
      ];
      break;
    case 'raid':
      rarityChances = [
        { rarity: 'rare', chance: 0.5 - (playerLevel / 200) },
        { rarity: 'epic', chance: 0.4 },
        { rarity: 'legendary', chance: 0.1 + (playerLevel / 200) }
      ];
      break;
    default:
      rarityChances = [
        { rarity: 'common', chance: 0.7 },
        { rarity: 'uncommon', chance: 0.25 },
        { rarity: 'rare', chance: 0.05 }
      ];
  }
  
  // Generate materials
  for (let i = 0; i < materialCount; i++) {
    const materialType = rng.choose(materialTypes);
    
    // Determine rarity using weighted chance
    let rarity;
    const roll = rng.nextFloat();
    let cumulativeChance = 0;
    
    for (const rarityOption of rarityChances) {
      cumulativeChance += rarityOption.chance;
      if (roll <= cumulativeChance) {
        rarity = rarityOption.rarity;
        break;
      }
    }
    
    // If somehow no rarity was selected, default to common
    if (!rarity) rarity = 'common';
    
    materials.push({
      id: `material-${rng.nextInt(1000, 9999)}`,
      type: materialType,
      rarity,
      quantity: rng.nextInt(1, 3)
    });
  }
  
  return materials;
}

/**
 * Generate enhancement gems
 * @param {Object} rng - Seeded RNG instance
 * @param {number} playerLevel - Player level
 * @returns {Array} - Generated gems
 */
function generateEnhancementGems(rng, playerLevel) {
  const gemCount = rng.nextInt(1, 2);
  const gems = [];
  
  for (let i = 0; i < gemCount; i++) {
    gems.push({
      id: `gem-${rng.nextInt(1000, 9999)}`,
      name: 'Enhancement Gem',
      value: rng.nextInt(1, 3)
    });
  }
  
  return gems;
}

/**
 * Generate protection scrolls per section 7.2
 * @param {Object} rng - Seeded RNG instance
 * @param {string} dungeonType - Type of dungeon
 * @returns {Array} - Generated scrolls
 */
function generateProtectionScrolls(rng, dungeonType) {
  // Determine scroll types based on section 7.2
  let scrollDistribution;
  switch (dungeonType) {
    case 'normal':
      scrollDistribution = [
        { type: 'minor', chance: 0.8 },
        { type: 'standard', chance: 0.2 }
      ];
      break;
    case 'elite':
      scrollDistribution = [
        { type: 'minor', chance: 0.5 },
        { type: 'standard', chance: 0.4 },
        { type: 'superior', chance: 0.1 }
      ];
      break;
    case 'raid':
      scrollDistribution = [
        { type: 'standard', chance: 0.3 },
        { type: 'superior', chance: 0.5 },
        { type: 'ultimate', chance: 0.2 }
      ];
      break;
    default:
      scrollDistribution = [
        { type: 'minor', chance: 0.6 },
        { type: 'standard', chance: 0.3 },
        { type: 'superior', chance: 0.1 }
      ];
  }
  
  // Determine scroll type using weighted chance
  let scrollType;
  const roll = rng.nextFloat();
  let cumulativeChance = 0;
  
  for (const option of scrollDistribution) {
    cumulativeChance += option.chance;
    if (roll <= cumulativeChance) {
      scrollType = option.type;
      break;
    }
  }
  
  // If somehow no type was selected, default to minor
  if (!scrollType) scrollType = 'minor';
  
  // Return the scroll
  return [{
    id: `scroll-${rng.nextInt(1000, 9999)}`,
    name: `${scrollType.charAt(0).toUpperCase() + scrollType.slice(1)} Protection Scroll`,
    type: 'scroll',
    scrollType: scrollType,
    description: `Prevents item enhancement level loss up to +${scrollType === 'minor' ? '30' : 
      scrollType === 'standard' ? '50' : 
      scrollType === 'superior' ? '70' : '99'}`
  }];
}

/**
 * Generate potions and stat potions
 * @param {Object} rng - Seeded RNG instance
 * @param {number} playerLevel - Player level
 * @returns {Array} - Generated potions
 */
function generatePotions(rng, playerLevel) {
  const potionCount = rng.nextInt(1, 3);
  const potions = [];
  
  const potionTypes = [
    { type: 'health', effect: { type: 'heal', value: 50 + (playerLevel * 5) } },
    { type: 'mana', effect: { type: 'mana', value: 25 + (playerLevel * 3) } },
    { type: 'strength', effect: { type: 'buff', stat: 'str', value: 2, duration: 300 } },
    { type: 'intelligence', effect: { type: 'buff', stat: 'int', value: 2, duration: 300 } },
    { type: 'agility', effect: { type: 'buff', stat: 'agi', value: 2, duration: 300 } }
  ];
  
  for (let i = 0; i < potionCount; i++) {
    const potionType = rng.choose(potionTypes);
    
    potions.push({
      id: `potion-${rng.nextInt(1000, 9999)}`,
      name: `${potionType.type.charAt(0).toUpperCase() + potionType.type.slice(1)} Potion`,
      type: 'consumable',
      subType: 'potion',
      effect: potionType.effect,
      quantity: rng.nextInt(1, 3)
    });
  }
  
  return potions;
}

module.exports = {
  generateDungeon,
  generateDungeonName
}; 