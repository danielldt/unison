/**
 * Procedural Item Name Generator
 * Generates unique item names based on item properties and seed values
 */

const { createSeededRNG } = require('./seedGenerator');

// Prefix sets by item type and quality
const PREFIXES = {
  weapon: {
    normal: ['Basic', 'Simple', 'Plain', 'Common', 'Standard', 'Typical'],
    magic: ['Sharp', 'Sturdy', 'Strong', 'Balanced', 'Precise', 'Keen', 'Hardened'],
    rare: ['Fierce', 'Valiant', 'Savage', 'Vicious', 'Brutal', 'Relentless', 'Merciless'],
    epic: ['Magnificent', 'Formidable', 'Ferocious', 'Devastating', 'Monstrous', 'Terrifying'],
    legendary: ['Mythical', 'Godly', 'Divine', 'Infernal', 'Celestial', 'Transcendent']
  },
  armor: {
    normal: ['Basic', 'Simple', 'Plain', 'Common', 'Standard', 'Regular'],
    magic: ['Sturdy', 'Rigid', 'Tough', 'Solid', 'Reliable', 'Reinforced'],
    rare: ['Resilient', 'Stalwart', 'Imposing', 'Adamant', 'Unyielding', 'Impenetrable'],
    epic: ['Magnificent', 'Formidable', 'Indomitable', 'Titanic', 'Colossal', 'Towering'],
    legendary: ['Mythical', 'Godly', 'Divine', 'Infernal', 'Celestial', 'Transcendent']
  },
  material: {
    normal: ['Basic', 'Common', 'Simple', 'Crude', 'Rough', 'Ordinary'],
    magic: ['Quality', 'Fine', 'Refined', 'Pure', 'Select', 'Choice'],
    rare: ['Exceptional', 'Premium', 'Superior', 'Exquisite', 'Precious', 'Pristine'],
    epic: ['Ancient', 'Primordial', 'Arcane', 'Mystical', 'Ethereal', 'Enchanted'],
    legendary: ['Mythical', 'Godly', 'Divine', 'Celestial', 'Transcendent', 'Ultimate']
  },
  consumable: {
    normal: ['Basic', 'Simple', 'Common', 'Standard', 'Regular', 'Ordinary'],
    magic: ['Potent', 'Effective', 'Enhanced', 'Improved', 'Enriched', 'Concentrated'],
    rare: ['Superior', 'Powerful', 'Exceptional', 'Refined', 'Premium', 'Distilled'],
    epic: ['Magnificent', 'Extraordinary', 'Sovereign', 'Supreme', 'Majestic', 'Paramount'],
    legendary: ['Mythical', 'Divine', 'Celestial', 'Transcendent', 'Ultimate', 'Perfect']
  }
};

// Suffixes by attribute or effect
const SUFFIXES = {
  str: ['of Strength', 'of Might', 'of Power', 'of the Giant', 'of the Titan', 'of Brawn'],
  dex: ['of Agility', 'of Quickness', 'of Precision', 'of the Fox', 'of the Wind', 'of Finesse'],
  int: ['of Intelligence', 'of Wisdom', 'of the Mind', 'of the Sage', 'of the Scholar', 'of Insight'],
  vit: ['of Vitality', 'of Health', 'of Constitution', 'of the Bear', 'of Endurance', 'of Wellness'],
  lck: ['of Fortune', 'of Luck', 'of Chance', 'of the Gambler', 'of Opportunity', 'of Serendipity'],
  atk: ['of Violence', 'of Assault', 'of Offense', 'of the Warrior', 'of Battle', 'of Confrontation'],
  def: ['of Defense', 'of Protection', 'of Shielding', 'of the Guardian', 'of the Bastion', 'of Ward'],
  fire: ['of Flames', 'of Fire', 'of the Inferno', 'of the Volcano', 'of Burning', 'of Heat'],
  ice: ['of Frost', 'of Ice', 'of the Glacier', 'of Freezing', 'of Chill', 'of Winter'],
  lightning: ['of Thunder', 'of Lightning', 'of the Storm', 'of Shock', 'of the Tempest', 'of Voltage'],
  poison: ['of Venom', 'of Poison', 'of Toxin', 'of the Serpent', 'of Sickness', 'of Disease'],
  holy: ['of Light', 'of Holiness', 'of the Divine', 'of Blessing', 'of the Sacred', 'of Radiance'],
  void: ['of Darkness', 'of the Void', 'of the Abyss', 'of Shadow', 'of the Eclipse', 'of Emptiness'],
  corrupted: ['of Corruption', 'of Decay', 'of Rot', 'of the Damned', 'of the Fallen', 'of Ruin'],
  healing: ['of Recovery', 'of Healing', 'of Mending', 'of Restoration', 'of Life', 'of Rejuvenation'],
  speed: ['of Haste', 'of Speed', 'of Swiftness', 'of the Quickfoot', 'of the Cheetah', 'of Acceleration'],
  evasion: ['of Evasion', 'of Dodging', 'of Avoidance', 'of the Ghost', 'of the Shadow', 'of Elusiveness'],
  critical: ['of Precision', 'of Striking', 'of Accuracy', 'of the Sniper', 'of the Hawk', 'of Targeting']
};

// Names by item type
const BASE_NAMES = {
  weapon: {
    sword: ['Sword', 'Blade', 'Claymore', 'Saber', 'Longsword', 'Rapier', 'Greatsword', 'Broadsword', 'Shortsword', 'Falchion'],
    axe: ['Axe', 'Hatchet', 'Cleaver', 'Greataxe', 'Battleaxe', 'War Axe', 'Tomahawk', 'Chopper', 'Broadaxe', 'Maul'],
    staff: ['Staff', 'Rod', 'Wand', 'Scepter', 'Cane', 'Stave', 'Baton', 'Branch', 'Crook', 'Spellstaff'],
    bow: ['Bow', 'Longbow', 'Shortbow', 'Recurve Bow', 'Compound Bow', 'Greatbow', 'Reflex Bow', 'Hunting Bow', 'War Bow', 'Composite Bow'],
    dagger: ['Dagger', 'Knife', 'Dirk', 'Shiv', 'Stiletto', 'Kris', 'Blade', 'Sai', 'Tanto', 'Kunai'],
    shield: ['Shield', 'Buckler', 'Bulwark', 'Aegis', 'Barricade', 'Tower Shield', 'Kite Shield', 'Heater Shield', 'Pavise', 'Round Shield'],
    orb: ['Orb', 'Sphere', 'Globe', 'Crystal', 'Essence', 'Focus', 'Eye', 'Heart', 'Soul', 'Star']
  },
  armor: {
    helmet: ['Helmet', 'Crown', 'Cap', 'Coif', 'Circlet', 'Helm', 'Headguard', 'Casque', 'Headdress', 'Hood'],
    chest: ['Armor', 'Cuirass', 'Breastplate', 'Chestplate', 'Vest', 'Mail', 'Suit', 'Robe', 'Tunic', 'Hauberk'],
    gloves: ['Gloves', 'Gauntlets', 'Grips', 'Handguards', 'Bracers', 'Handwraps', 'Fists', 'Mittens', 'Sleeves', 'Cuffs'],
    boots: ['Boots', 'Sabatons', 'Greaves', 'Shoes', 'Stompers', 'Treads', 'Footguards', 'Sandals', 'Footwraps', 'Soles'],
    legs: ['Leggings', 'Greaves', 'Chausses', 'Pants', 'Leg Guards', 'Cuisses', 'Gaiters', 'Kilt', 'Skirt', 'Tassets'],
    belt: ['Belt', 'Girdle', 'Sash', 'Waistguard', 'Waistband', 'Cincture', 'Cord', 'Strap', 'Band', 'Zone']
  },
  material: {
    ore: ['Ore', 'Chunk', 'Nugget', 'Fragment', 'Shard', 'Piece', 'Bar', 'Ingot', 'Lump', 'Rock'],
    gem: ['Gem', 'Jewel', 'Crystal', 'Stone', 'Prism', 'Bauble', 'Bead', 'Gemstone', 'Precious Stone', 'Facet'],
    cloth: ['Cloth', 'Fabric', 'Linen', 'Silk', 'Textile', 'Weave', 'Thread', 'Material', 'Bolt', 'Canvas'],
    leather: ['Leather', 'Hide', 'Skin', 'Pelt', 'Fur', 'Carapace', 'Husk', 'Scale', 'Membrane', 'Wrapping'],
    wood: ['Wood', 'Timber', 'Log', 'Lumber', 'Branch', 'Plank', 'Stave', 'Splinter', 'Bark', 'Hardwood'],
    herb: ['Herb', 'Plant', 'Leaf', 'Root', 'Flower', 'Weed', 'Grass', 'Sprig', 'Shoot', 'Vegetation']
  },
  consumable: {
    potion: ['Potion', 'Elixir', 'Tonic', 'Brew', 'Concoction', 'Serum', 'Vial', 'Philter', 'Infusion', 'Mixture'],
    food: ['Bread', 'Meat', 'Fruit', 'Cheese', 'Stew', 'Cake', 'Pie', 'Ration', 'Meal', 'Snack'],
    scroll: ['Scroll', 'Parchment', 'Script', 'Tome', 'Tablet', 'Rune', 'Page', 'Record', 'Codex', 'Book']
  }
};

// Unique/special item names by rarity
const UNIQUE_NAMES = {
  epic: {
    weapon: [
      'Worldripper', 'Soulrender', 'Doomcaller', 'Starshard', 'Skullcrusher', 'Dawnbreaker',
      'Nightfall', 'Bloodthirster', 'Fateweaver', 'Lifetaker', 'Oathkeeper', 'Peacemaker'
    ],
    armor: [
      'Ironclad', 'Soulguard', 'Voidshell', 'Stormveil', 'Doomplate', 'Skyward Shell',
      'Earths Embrace', 'Vanguard', 'Siegebreaker', 'Wardens Watch', 'Dragonscale', 'Tempest'
    ]
  },
  legendary: {
    weapon: [
      'Apocalypse', 'Godslayer', 'Eternity', 'Oblivion', 'Cataclysm', 'Ragnarok',
      'Armageddon', 'Nemesis', 'Eschaton', 'Genesis', 'Singularity', 'Absolution'
    ],
    armor: [
      'Dreadnaught', 'Salvation', 'Eternity', 'Oblivion', 'Pantheon', 'Genesis',
      'Valhalla', 'Celestial Aegis', 'Immortal Bastion', 'Soul Fortress', 'Worldshell', 'Divine Ward'
    ]
  }
};

/**
 * Generate a name for an item based on its properties
 * @param {Object} item - The item object
 * @param {number} seed - Random seed value
 * @returns {string} Generated name
 */
function generateItemName(item, seed) {
  const rng = createSeededRNG(seed);
  
  // Determine item quality for name generation
  let quality = 'normal';
  switch (item.rarity) {
    case 'F':
    case 'E':
      quality = 'normal';
      break;
    case 'D':
    case 'C':
      quality = 'magic';
      break;
    case 'B':
    case 'A':
      quality = 'rare';
      break;
    case 'S':
      quality = 'epic';
      break;
    case 'SS':
    case 'SSS':
      quality = 'legendary';
      break;
  }
  
  // Epic and Legendary items have a chance for unique names
  if ((quality === 'epic' || quality === 'legendary') && item.type !== 'material' && item.type !== 'consumable') {
    const uniqueChance = quality === 'legendary' ? 0.7 : 0.3;
    if (rng() < uniqueChance) {
      const uniqueNames = UNIQUE_NAMES[quality][item.type];
      return uniqueNames[Math.floor(rng() * uniqueNames.length)];
    }
  }
  
  // Generate name components
  let prefix = '';
  let baseName = '';
  let suffix = '';
  
  // Get prefix based on type and quality
  if (PREFIXES[item.type] && PREFIXES[item.type][quality]) {
    const prefixOptions = PREFIXES[item.type][quality];
    prefix = prefixOptions[Math.floor(rng() * prefixOptions.length)];
  }
  
  // Get base name
  if (BASE_NAMES[item.type] && BASE_NAMES[item.type][item.subType]) {
    const baseOptions = BASE_NAMES[item.type][item.subType];
    baseName = baseOptions[Math.floor(rng() * baseOptions.length)];
  } else {
    // Fallback for unknown subtypes
    baseName = item.subType.charAt(0).toUpperCase() + item.subType.slice(1);
  }
  
  // Get suffix based on primary attribute(s)
  if (item.attributes && quality !== 'normal') {
    // Find highest attribute
    let primaryAttribute = null;
    let highestValue = 0;
    
    for (const [attr, value] of Object.entries(item.attributes)) {
      if (SUFFIXES[attr] && value > highestValue) {
        primaryAttribute = attr;
        highestValue = value;
      }
    }
    
    if (primaryAttribute && SUFFIXES[primaryAttribute]) {
      const suffixOptions = SUFFIXES[primaryAttribute];
      suffix = suffixOptions[Math.floor(rng() * suffixOptions.length)];
    }
  }
  
  // Add enhancement level to name if enhanced
  let enhancementText = '';
  if (item.enhancement && item.enhancement > 0) {
    enhancementText = ` +${item.enhancement}`;
  }
  
  // Assemble name based on quality
  switch (quality) {
    case 'normal':
      return `${prefix} ${baseName}${enhancementText}`;
    case 'magic':
      return `${prefix} ${baseName}${enhancementText} ${suffix}`;
    case 'rare':
    case 'epic':
    case 'legendary':
      return `${prefix} ${baseName}${enhancementText} ${suffix}`;
  }
}

/**
 * Generate a description for an item based on its properties
 * @param {Object} item - The item object
 * @param {number} seed - Random seed value
 * @returns {string} Generated description
 */
function generateItemDescription(item, seed) {
  const rng = createSeededRNG(seed + 12345); // Different seed for description
  
  const descriptions = {
    weapon: [
      'A weapon forged for battle.',
      'Designed to strike down enemies with precision.',
      'Crafted by skilled artisans for combat.',
      'A deadly instrument of war.',
      'Balanced perfectly for battle.',
      'Made to withstand the rigors of combat.'
    ],
    armor: [
      'Armor designed to protect in battle.',
      'Crafted to shield the wearer from harm.',
      'Protection against the dangers of combat.',
      'Defensive gear for dangerous situations.',
      'Provides security in the heat of battle.',
      'Shields the wearer from enemy attacks.'
    ],
    material: [
      'A valuable material used in crafting.',
      'A component needed for various recipes.',
      'A resource sought by crafters everywhere.',
      'An essential ingredient for crafting.',
      'A material with various crafting applications.',
      'Used in the creation of powerful items.'
    ],
    consumable: [
      'Can be consumed for beneficial effects.',
      'Provides temporary aid when used.',
      'A one-time use item with powerful effects.',
      'Offers assistance in times of need.',
      'Grants a temporary advantage when consumed.',
      'Useful in various situations.'
    ]
  };
  
  let description = descriptions[item.type][Math.floor(rng() * descriptions[item.type].length)];
  
  // Add rarity-specific text
  switch (item.rarity) {
    case 'F':
    case 'E':
      description += ' Common and widely available.';
      break;
    case 'D':
    case 'C':
      description += ' Uncommon and of good quality.';
      break;
    case 'B':
    case 'A':
      description += ' Rare and highly valued.';
      break;
    case 'S':
      description += ' Extremely rare and powerful.';
      break;
    case 'SS':
    case 'SSS':
      description += ' Legendary and sought after by heroes.';
      break;
  }
  
  return description;
}

module.exports = {
  generateItemName,
  generateItemDescription
};