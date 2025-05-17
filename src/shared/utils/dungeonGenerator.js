/**
 * Dungeon Generator Module
 * Procedurally generates dungeon layouts and maps based on a seed
 */

// Import the seed generator utilities
const { createSeededRNG, getRandomInt, getWeightedRandom } = require('./seedGenerator');

/**
 * Generate a dungeon based on the provided seed and parameters
 * @param {Object} options - Dungeon generation options
 * @param {string} options.seed - The seed to use for generation
 * @param {string} options.dungeonType - Type of dungeon (normal, elite, raid)
 * @param {number} options.difficulty - Difficulty level
 * @param {number} options.size - Size of the dungeon (small, medium, large)
 * @returns {Object} The generated dungeon layout and metadata
 */
const generateDungeon = (options) => {
  const { seed, dungeonType = 'normal', difficulty = 1, size = 'medium' } = options;
  
  // Create a seeded RNG for consistent generation
  const rng = createSeededRNG(seed);
  
  // Configure dungeon parameters based on type and difficulty
  const config = getDungeonConfig(dungeonType, difficulty, size);
  
  // Generate the rooms
  const rooms = generateRooms(rng, config);
  
  // Generate the connections between rooms
  const connections = generateConnections(rng, rooms, config);
  
  // Generate the encounters for each room
  const encounters = generateEncounters(rng, rooms, config);
  
  // Generate the environment theme and hazards
  const environment = generateEnvironment(rng, dungeonType);
  
  // Return the complete dungeon
  return {
    seed,
    dungeonType,
    difficulty,
    size,
    environment,
    rooms,
    connections,
    encounters,
  };
};

/**
 * Get dungeon configuration based on type and difficulty
 * @param {string} dungeonType - Type of dungeon
 * @param {number} difficulty - Difficulty level
 * @param {string} size - Size of the dungeon
 * @returns {Object} Dungeon configuration
 */
const getDungeonConfig = (dungeonType, difficulty, size) => {
  // Base room counts by size
  const baseRoomCounts = {
    small: 5,
    medium: 8,
    large: 12
  };
  
  // Modify based on dungeon type
  const typeModifiers = {
    normal: 1,
    elite: 1.2,
    raid: 1.5
  };
  
  const roomCount = Math.floor(baseRoomCounts[size] * typeModifiers[dungeonType]);
  
  return {
    roomCount,
    minRoomSize: 4,
    maxRoomSize: 8 + Math.floor(difficulty),
    enemyDensity: 0.5 + (difficulty * 0.1),
    treasureRarity: difficulty * 0.2,
    hasSecretRooms: dungeonType !== 'normal',
    secretRoomChance: dungeonType === 'raid' ? 0.3 : 0.15,
    bossRoomSize: 10 + Math.floor(difficulty * 1.5)
  };
};

/**
 * Generate dungeon rooms
 * @param {Object} rng - Seeded RNG
 * @param {Object} config - Dungeon configuration
 * @returns {Array} Array of room objects
 */
const generateRooms = (rng, config) => {
  const rooms = [];
  
  // Always generate an entrance room
  rooms.push({
    id: 'entrance',
    type: 'entrance',
    size: getRandomInt(rng, config.minRoomSize, config.maxRoomSize),
    position: { x: 0, y: 0 },
    cleared: false
  });
  
  // Generate regular rooms
  for (let i = 0; i < config.roomCount - 2; i++) {
    const isSecretRoom = config.hasSecretRooms && rng.nextFloat() < config.secretRoomChance;
    
    rooms.push({
      id: `room_${i}`,
      type: isSecretRoom ? 'secret' : 'normal',
      size: getRandomInt(rng, config.minRoomSize, config.maxRoomSize),
      position: generateRoomPosition(rng, rooms),
      cleared: false
    });
  }
  
  // Always generate a boss room
  rooms.push({
    id: 'boss',
    type: 'boss',
    size: config.bossRoomSize,
    position: generateRoomPosition(rng, rooms, true),
    cleared: false
  });
  
  return rooms;
};

/**
 * Generate a position for a new room
 * @param {Object} rng - Seeded RNG
 * @param {Array} existingRooms - Existing rooms
 * @param {boolean} isBossRoom - Whether this is a boss room
 * @returns {Object} Position { x, y }
 */
const generateRoomPosition = (rng, existingRooms, isBossRoom = false) => {
  // For boss rooms, place them far from the entrance
  if (isBossRoom && existingRooms.length > 0) {
    const entrance = existingRooms.find(room => room.type === 'entrance');
    if (entrance) {
      const direction = rng.nextFloat() > 0.5 ? 1 : -1;
      return {
        x: entrance.position.x + (direction * (10 + Math.floor(rng.nextFloat() * 5))),
        y: entrance.position.y + (direction * (10 + Math.floor(rng.nextFloat() * 5)))
      };
    }
  }
  
  // For regular rooms, place them adjacent to existing rooms
  if (existingRooms.length > 0) {
    const baseRoom = existingRooms[Math.floor(rng.nextFloat() * existingRooms.length)];
    const direction = Math.floor(rng.nextFloat() * 4); // 0: north, 1: east, 2: south, 3: west
    
    const offset = 2 + Math.floor(rng.nextFloat() * 3);
    
    switch (direction) {
      case 0: return { x: baseRoom.position.x, y: baseRoom.position.y - offset };
      case 1: return { x: baseRoom.position.x + offset, y: baseRoom.position.y };
      case 2: return { x: baseRoom.position.x, y: baseRoom.position.y + offset };
      case 3: return { x: baseRoom.position.x - offset, y: baseRoom.position.y };
    }
  }
  
  // Fallback for the first room
  return { x: 0, y: 0 };
};

/**
 * Generate connections between rooms
 * @param {Object} rng - Seeded RNG
 * @param {Array} rooms - Dungeon rooms
 * @param {Object} config - Dungeon configuration
 * @returns {Array} Array of connections
 */
const generateConnections = (rng, rooms, config) => {
  const connections = [];
  
  // Make sure all rooms are connected in a minimal spanning tree
  const connected = new Set(['entrance']);
  const unconnected = new Set(rooms.filter(room => room.id !== 'entrance').map(room => room.id));
  
  // Connect all rooms
  while (unconnected.size > 0) {
    let bestDistance = Infinity;
    let bestConnection = null;
    
    // Find the closest connection between a connected and unconnected room
    for (const connectedId of connected) {
      const connectedRoom = rooms.find(room => room.id === connectedId);
      
      for (const unconnectedId of unconnected) {
        const unconnectedRoom = rooms.find(room => room.id === unconnectedId);
        
        const distance = calculateDistance(connectedRoom.position, unconnectedRoom.position);
        
        if (distance < bestDistance) {
          bestDistance = distance;
          bestConnection = {
            from: connectedId,
            to: unconnectedId,
            type: 'corridor'
          };
        }
      }
    }
    
    if (bestConnection) {
      connections.push(bestConnection);
      connected.add(bestConnection.to);
      unconnected.delete(bestConnection.to);
    } else {
      break; // Safety check
    }
  }
  
  // Add some additional connections for loops (based on dungeon type)
  const extraConnectionCount = Math.floor(config.roomCount * (config.hasSecretRooms ? 0.3 : 0.1));
  
  for (let i = 0; i < extraConnectionCount; i++) {
    const roomA = rooms[Math.floor(rng.nextFloat() * rooms.length)];
    const roomB = rooms[Math.floor(rng.nextFloat() * rooms.length)];
    
    // Don't connect a room to itself or if already connected
    if (roomA.id === roomB.id || connections.some(c => 
      (c.from === roomA.id && c.to === roomB.id) || 
      (c.from === roomB.id && c.to === roomA.id)
    )) {
      continue;
    }
    
    connections.push({
      from: roomA.id,
      to: roomB.id,
      type: 'corridor'
    });
  }
  
  return connections;
};

/**
 * Calculate distance between two positions
 * @param {Object} posA - Position A { x, y }
 * @param {Object} posB - Position B { x, y }
 * @returns {number} Distance
 */
const calculateDistance = (posA, posB) => {
  return Math.sqrt(Math.pow(posA.x - posB.x, 2) + Math.pow(posA.y - posB.y, 2));
};

/**
 * Generate encounters for each room
 * @param {Object} rng - Seeded RNG
 * @param {Array} rooms - Dungeon rooms
 * @param {Object} config - Dungeon configuration
 * @returns {Object} Encounters by room ID
 */
const generateEncounters = (rng, rooms, config) => {
  const encounters = {};
  
  rooms.forEach(room => {
    if (room.type === 'entrance') {
      encounters[room.id] = { type: 'safe' };
    } else if (room.type === 'boss') {
      encounters[room.id] = { 
        type: 'boss',
        mobLevel: Math.floor(config.difficulty * 1.5) + rooms.length / 2
      };
    } else if (room.type === 'secret') {
      // Secret rooms have either treasure or a mini-boss
      const isTreasure = rng.nextFloat() < 0.7;
      
      if (isTreasure) {
        encounters[room.id] = { 
          type: 'treasure',
          rarity: Math.min(1.0, 0.5 + config.treasureRarity)
        };
      } else {
        encounters[room.id] = { 
          type: 'elite',
          mobLevel: Math.floor(config.difficulty * 1.2) + rooms.length / 3
        };
      }
    } else {
      // Normal rooms have regular encounters
      const hasEnemies = rng.nextFloat() < config.enemyDensity;
      
      if (hasEnemies) {
        encounters[room.id] = { 
          type: 'combat',
          mobCount: 1 + Math.floor(rng.nextFloat() * 3),
          mobLevel: Math.floor(config.difficulty) + Math.floor(rng.nextFloat() * 2)
        };
      } else {
        encounters[room.id] = { 
          type: 'empty',
          hasLoot: rng.nextFloat() < 0.3
        };
      }
    }
  });
  
  return encounters;
};

/**
 * Generate environment theme and hazards
 * @param {Object} rng - Seeded RNG
 * @param {string} dungeonType - Type of dungeon
 * @returns {Object} Environment information
 */
const generateEnvironment = (rng, dungeonType) => {
  // Possible environment themes
  const themes = {
    normal: ['cave', 'forest', 'ruins', 'crypt'],
    elite: ['dungeon', 'temple', 'volcano', 'frozen'],
    raid: ['castle', 'necropolis', 'abyss', 'void']
  };
  
  const themePool = themes[dungeonType] || themes.normal;
  const theme = themePool[Math.floor(rng.nextFloat() * themePool.length)];
  
  // Generate hazards based on theme
  const hazards = generateHazards(rng, theme);
  
  return {
    theme,
    hazards,
    lighting: rng.nextFloat() < 0.3 ? 'dark' : 'lit',
    weather: theme === 'forest' ? (rng.nextFloat() < 0.5 ? 'rain' : 'clear') : null
  };
};

/**
 * Generate hazards based on environment theme
 * @param {Object} rng - Seeded RNG
 * @param {string} theme - Environment theme
 * @returns {Array} Array of hazard objects
 */
const generateHazards = (rng, theme) => {
  const hazardsByTheme = {
    cave: ['falling_rocks', 'pitfall', 'poison_gas'],
    forest: ['quicksand', 'thorns', 'wild_animals'],
    ruins: ['collapsing_walls', 'spike_traps', 'cursed_artifacts'],
    crypt: ['haunting_spirits', 'poison_darts', 'animated_statues'],
    dungeon: ['blade_traps', 'fire_pits', 'crushing_walls'],
    temple: ['guardian_statues', 'lightning_rods', 'holy_flames'],
    volcano: ['lava_flows', 'steam_vents', 'ash_clouds'],
    frozen: ['thin_ice', 'freezing_air', 'avalanche'],
    castle: ['arrow_slits', 'boiling_oil', 'animated_armor'],
    necropolis: ['death_fog', 'soul_drain', 'reanimating_corpses'],
    abyss: ['void_rifts', 'tentacle_pits', 'insanity_whispers'],
    void: ['reality_tears', 'time_distortion', 'gravity_wells']
  };
  
  const possibleHazards = hazardsByTheme[theme] || [];
  const hazardCount = Math.floor(rng.nextFloat() * 3); // 0 to 2 hazards
  
  const hazards = [];
  for (let i = 0; i < hazardCount; i++) {
    if (possibleHazards.length > 0) {
      const hazardIndex = Math.floor(rng.nextFloat() * possibleHazards.length);
      const hazardType = possibleHazards[hazardIndex];
      
      hazards.push({
        type: hazardType,
        severity: 0.3 + (rng.nextFloat() * 0.7), // 0.3 to 1.0 severity
        frequency: 0.1 + (rng.nextFloat() * 0.4)  // 0.1 to 0.5 frequency
      });
      
      // Remove to avoid duplicates
      possibleHazards.splice(hazardIndex, 1);
    }
  }
  
  return hazards;
};

module.exports = {
  generateDungeon
}; 