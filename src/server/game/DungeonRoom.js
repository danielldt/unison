const { Room } = require('colyseus');
const { generateDungeonSeed, createSeededRNG, getRandomInt, getWeightedRandom } = require('../../shared/utils/seedGenerator');
const { generateDungeon } = require('../../shared/utils/dungeonGenerator');
const { generateEnvironmentalEffects, applyEnvironmentalEffects } = require('../../shared/utils/environmentalEffects');
const { calculateDamage, calculateHealing } = require('../../shared/utils/combatCalculator');
const { generateMobLoot, calculateMobExperience, calculateMobGold } = require('../utils/mobDrop');
const db = require('../db/database');

// Define game state schema
class DungeonState {
  constructor() {
    this.players = new Map();
    this.currentWave = 0;
    this.waveInProgress = false;
    this.mobs = [];
    this.dungeon = null;
    this.combatLog = [];
    this.loot = [];
    this.environment = null;
    this.environmentalHazards = [];
    this.lastEnvironmentTick = Date.now();
  }
}

// DungeonRoom schema class for Colyseus
class DungeonRoomState {
  constructor() {
    this.players = new Map();
    this.mobs = [];
    this.loot = [];
    this.currentWave = 0;
    this.totalWaves = 5;
    this.waveInProgress = false;
    this.seed = '';
    this.dungeonType = 'normal';
    this.difficulty = 1;
  }
}

class DungeonRoom extends Room {
  constructor() {
    super();
    this.maxClients = 4;
    this.autoDispose = true;
  }

  // Initialize the room with dungeon data
  async onCreate(options) {
    console.log('DungeonRoom created!', options);
    
    this.setState(new DungeonRoomState());
    
    // If roomId is provided in options, use that as the dungeon ID
    this.roomId = options.roomId || this.roomId;
    
    // Get dungeon data from database or generate if not found
    try {
      // In a full implementation, we would load the dungeon data from the database
      // For this prototype, we'll just use the seed from options or generate one
      const dungeonSeed = options.seed || `dungeon_${Date.now()}`;
      const dungeonType = options.dungeonType || 'normal';
      const difficulty = options.difficulty || 1;
      
      this.state.seed = dungeonSeed;
      this.state.dungeonType = dungeonType;
      this.state.difficulty = difficulty;
      this.state.totalWaves = this.calculateTotalWaves(dungeonType, difficulty);
      
      // Setup RNG for the dungeon
      this.dungeonRNG = createSeededRNG(generateDungeonSeed({
        baseSeed: dungeonSeed,
        dungeonType,
        difficulty
      }));
      
      console.log(`Dungeon initialized with seed: ${dungeonSeed}, type: ${dungeonType}, difficulty: ${difficulty}`);
    } catch (error) {
      console.error('Error initializing dungeon:', error);
    }
    
    // Register message handlers
    this.onMessage('ready', (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.ready = message.ready || false;
        this.checkAllPlayersReady();
      }
    });
    
    this.onMessage('action', (client, message) => {
      this.handlePlayerAction(client, message);
    });
    
    this.onMessage('startWave', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.isLeader) {
        this.startWave();
      }
    });
    
    this.onMessage('collectLoot', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.collectLoot(client);
      }
    });
  }

  // When a client connects to the room
  async onJoin(client, options) {
    console.log('Client joined!', client.sessionId);
    
    try {
      const { characterId, name, stats, skills, equipment } = options;
      
      // Add player to the room state
      this.state.players.set(client.sessionId, {
        id: client.sessionId,
        characterId,
        name: name || 'Player',
        stats: stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50 },
        skills: skills || [],
        equipment: equipment || [],
        ready: false,
        isLeader: this.state.players.size === 0, // First player is the leader
        effects: []
      });
      
      console.log(`Player ${name} (${characterId}) joined the dungeon room`);
    } catch (error) {
      console.error('Error adding player to room:', error);
    }
  }

  // When a client leaves the room
  async onLeave(client, consented) {
    console.log('Client left!', client.sessionId);
    
    // Check if this client was the leader
    const player = this.state.players.get(client.sessionId);
    const wasLeader = player && player.isLeader;
    
    // Remove player from the room state
    this.state.players.delete(client.sessionId);
    
    // If the leader left and there are other players, assign a new leader
    if (wasLeader && this.state.players.size > 0) {
      const newLeaderId = this.state.players.keys().next().value;
      const newLeader = this.state.players.get(newLeaderId);
      if (newLeader) {
        newLeader.isLeader = true;
      }
    }
    
    // If everyone left, end the dungeon
    if (this.state.players.size === 0) {
      this.disconnect();
    }
  }

  // When the room is disposed
  onDispose() {
    console.log('Room disposed!', this.roomId);
  }

  // Check if all players are ready
  checkAllPlayersReady() {
    if (this.state.players.size === 0) return false;
    
    let allReady = true;
    this.state.players.forEach(player => {
      if (!player.ready) {
        allReady = false;
      }
    });
    
    return allReady;
  }

  // Start a new wave of enemies
  startWave() {
    if (this.state.waveInProgress) {
      console.log('Wave already in progress!');
      return;
    }
    
    if (this.state.currentWave >= this.state.totalWaves) {
      console.log('All waves completed!');
      this.broadcast('dungeonComplete', { loot: this.generateLoot('boss') });
      return;
    }
    
    // Generate mobs for the wave
    this.state.currentWave++;
    this.state.waveInProgress = true;
    
    const waveConfig = this.getWaveConfig(this.state.currentWave);
    const mobs = this.generateMobs(waveConfig);
    this.state.mobs = mobs;
    
    console.log(`Wave ${this.state.currentWave} started with ${mobs.length} mobs`);
    
    // Notify clients
    this.broadcast('waveStart', { 
      waveNumber: this.state.currentWave,
      mobs: this.state.mobs 
    });
    
    // Start mob AI
    this.startMobAI();
  }

  // Handle player actions
  handlePlayerAction(client, message) {
    if (!this.state.waveInProgress) return;
    
    const { skillId, targetId, targetType } = message;
    const player = this.state.players.get(client.sessionId);
    
    if (!player) return;
    
    // Find the skill
    const skill = player.skills.find(s => s.id === skillId);
    if (!skill) {
      console.log(`Skill ${skillId} not found!`);
      return;
    }
    
    // Find the target
    let target;
    if (targetType === 'MOB') {
      target = this.state.mobs.find(m => m.id === targetId);
    } else if (targetType === 'PLAYER') {
      target = this.state.players.get(targetId);
    }
    
    if (!target) {
      console.log(`Target ${targetId} not found!`);
      return;
    }
    
    // Process the action
    const result = this.processAction(player, skill, target, targetType);
    
    // Broadcast the result
    this.broadcast('actionResult', result);
    
    // Check if all mobs are defeated
    if (targetType === 'MOB' && this.state.mobs.length === 0) {
      this.waveComplete();
    }
    
    // Check if all players are defeated
    let allDefeated = true;
    this.state.players.forEach(p => {
      if (p.stats.hp > 0) {
        allDefeated = false;
      }
    });
    
    if (allDefeated) {
      this.waveFailed();
    }
  }

  // Process an action
  processAction(player, skill, target, targetType) {
    const result = {
      actorId: player.id,
      skillId: skill.id,
      skillName: skill.name,
      targetId: target.id,
      targetType,
      effects: []
    };
    
    // Simple damage calculation for prototype
    let damage = 10 + (player.stats.str || 1) * 2;
    const isCrit = Math.random() < 0.1; // 10% crit chance
    
    if (isCrit) {
      damage *= 1.5;
    }
    
    // Apply damage
    target.stats.hp = Math.max(0, target.stats.hp - damage);
    
    // Add effect
    result.effects.push({
      type: 'DAMAGE',
      value: damage,
      isCrit
    });
    
    // Check if target defeated
    if (target.stats.hp <= 0) {
      if (targetType === 'MOB') {
        // Remove mob from state
        this.state.mobs = this.state.mobs.filter(m => m.id !== target.id);
        
        // Add defeat effect
        result.effects.push({
          type: 'DEFEAT',
          targetId: target.id
        });
      }
    }
    
    return result;
  }

  // Start mob AI (simple implementation for prototype)
  startMobAI() {
    if (this.mobInterval) {
      clearInterval(this.mobInterval);
    }
    
    this.mobInterval = setInterval(() => {
      if (!this.state.waveInProgress || this.state.mobs.length === 0) {
        clearInterval(this.mobInterval);
        return;
      }
      
      // Each mob takes an action
      this.state.mobs.forEach(mob => {
        if (mob.stats.hp <= 0) return;
        
        // Find a random target player
        const alivePlayers = [];
        this.state.players.forEach(player => {
          if (player.stats.hp > 0) {
            alivePlayers.push(player);
          }
        });
        
        if (alivePlayers.length === 0) return;
        
        const targetIndex = Math.floor(Math.random() * alivePlayers.length);
        const target = alivePlayers[targetIndex];
        
        // Simple attack action
        const damage = 5 + (mob.level || 1);
        target.stats.hp = Math.max(0, target.stats.hp - damage);
        
        // Broadcast mob action
        this.broadcast('mobActionResult', {
          actorId: mob.id,
          skillName: 'Attack',
          targetId: target.id,
          targetType: 'PLAYER',
          effects: [
            {
              type: 'DAMAGE',
              value: damage,
              isCrit: false
            }
          ]
        });
        
        // Check if player defeated
        if (target.stats.hp <= 0) {
          this.broadcast('mobActionResult', {
            actorId: mob.id,
            skillName: 'Attack',
            targetId: target.id,
            targetType: 'PLAYER',
            effects: [
              {
                type: 'DEFEAT',
                targetId: target.id
              }
            ]
          });
          
          // Check if all players defeated
          let allDefeated = true;
          this.state.players.forEach(p => {
            if (p.stats.hp > 0) {
              allDefeated = false;
            }
          });
          
          if (allDefeated) {
            this.waveFailed();
          }
        }
      });
    }, 3000); // Every 3 seconds
  }

  // Wave completed successfully
  waveComplete() {
    this.state.waveInProgress = false;
    clearInterval(this.mobInterval);
    
    // Generate loot for this wave
    const loot = this.generateLoot();
    this.state.loot = loot;
    
    console.log(`Wave ${this.state.currentWave} completed!`);
    
    // Notify clients
    this.broadcast('waveComplete', { loot });
    
    // If this was the final wave
    if (this.state.currentWave >= this.state.totalWaves) {
      console.log('All waves completed!');
      this.broadcast('dungeonComplete', { loot: this.generateLoot('boss') });
    }
  }

  // Wave failed
  waveFailed() {
    this.state.waveInProgress = false;
    clearInterval(this.mobInterval);
    
    console.log(`Wave ${this.state.currentWave} failed!`);
    
    // Notify clients
    this.broadcast('waveFailed');
    
    // Reset players
    this.state.players.forEach(player => {
      player.stats.hp = player.stats.maxHp;
      player.stats.mp = player.stats.maxMp;
      player.ready = false;
    });
  }

  // Collect loot
  collectLoot(client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    // In a full implementation, this would update the player's inventory in the database
    console.log(`Player ${player.name} collected loot:`, this.state.loot);
    
    // Clear loot
    this.state.loot = [];
    
    // Notify all clients that loot was collected
    this.broadcast('lootCollected', { playerId: client.sessionId });
  }

  // Generate loot for the current wave
  generateLoot(type = 'normal') {
    const itemCount = type === 'boss' ? 
      getRandomInt(this.dungeonRNG, 3, 6) : 
      getRandomInt(this.dungeonRNG, 1, 3);
    
    const items = [];
    
    for (let i = 0; i < itemCount; i++) {
      // Define rarity weights based on dungeon type and current wave
      const rarityWeights = this.getRarityWeights(type);
      
      // Weighted selection of rarity
      const rarity = getWeightedRandom(
        this.dungeonRNG,
        ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'],
        [rarityWeights.F, rarityWeights.E, rarityWeights.D, rarityWeights.C, rarityWeights.B, rarityWeights.A, rarityWeights.S, rarityWeights.SS, rarityWeights.SSS]
      );
      
      // Define item types
      const itemTypes = ['weapon', 'armor', 'accessory', 'material', 'consumable'];
      const itemType = getWeightedRandom(
        this.dungeonRNG,
        itemTypes,
        [0.3, 0.3, 0.2, 0.1, 0.1]
      );
      
      // Simple item generation
      const item = {
        id: `item_${Date.now()}_${i}`,
        name: this.generateItemName(itemType, rarity),
        type: itemType,
        rarity,
        stats: this.generateItemStats(itemType, rarity),
        description: `A ${rarity}-rank ${itemType} found in the dungeon.`,
        // For weapons, also generate skills
        skills: itemType === 'weapon' ? [this.generateSkill(rarity)] : []
      };
      
      items.push(item);
    }
    
    return items;
  }

  // Generate a random item name
  generateItemName(type, rarity) {
    const prefixes = {
      'F': ['Broken', 'Rusty', 'Damaged', 'Worn'],
      'E': ['Simple', 'Basic', 'Common', 'Standard'],
      'D': ['Sturdy', 'Quality', 'Reliable', 'Solid'],
      'C': ['Fine', 'Superior', 'Enhanced', 'Polished'],
      'B': ['Exceptional', 'Impressive', 'Formidable', 'Magnificent'],
      'A': ['Heroic', 'Mythic', 'Legendary', 'Ancient'],
      'S': ['Divine', 'Celestial', 'Transcendent', 'Immortal'],
      'SS': ['Astral', 'Cosmic', 'Ethereal', 'Ultimate'],
      'SSS': ['Godly', 'Omnipotent', 'Supreme', 'Absolute']
    };
    
    const typeNames = {
      'weapon': ['Sword', 'Axe', 'Dagger', 'Staff', 'Bow', 'Wand'],
      'armor': ['Helmet', 'Chestplate', 'Leggings', 'Boots', 'Gauntlets'],
      'accessory': ['Ring', 'Necklace', 'Earring', 'Bracelet', 'Talisman'],
      'material': ['Crystal', 'Ore', 'Essence', 'Fragment', 'Rune'],
      'consumable': ['Potion', 'Elixir', 'Scroll', 'Food', 'Tonic']
    };
    
    const prefix = prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];
    const typeName = typeNames[type][Math.floor(Math.random() * typeNames[type].length)];
    
    return `${prefix} ${typeName}`;
  }

  // Generate stats for an item based on type and rarity
  generateItemStats(type, rarity) {
    const rarityMultiplier = {
      'F': 0.5,
      'E': 0.8,
      'D': 1.0,
      'C': 1.2,
      'B': 1.5,
      'A': 2.0,
      'S': 2.5,
      'SS': 3.0,
      'SSS': 4.0
    };
    
    const baseStats = {
      'weapon': { atk: 10, str: 2 },
      'armor': { def: 8, hp: 15 },
      'accessory': { agi: 5, luk: 3 }
    };
    
    // Return empty stats for materials and consumables
    if (type === 'material' || type === 'consumable') {
      return {};
    }
    
    const stats = { ...baseStats[type] };
    
    // Apply rarity multiplier
    for (const stat in stats) {
      stats[stat] = Math.floor(stats[stat] * rarityMultiplier[rarity]);
    }
    
    return stats;
  }

  // Generate a skill for a weapon
  generateSkill(rarity) {
    const rarityMultiplier = {
      'F': 0.8,
      'E': 1.0,
      'D': 1.2,
      'C': 1.5,
      'B': 1.8,
      'A': 2.2,
      'S': 2.6,
      'SS': 3.0,
      'SSS': 4.0
    };
    
    const baseSkill = {
      id: `skill_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: 'Basic Attack',
      type: 'ATTACK',
      damageMultiplier: 1.0 * rarityMultiplier[rarity],
      cooldown: 2000, // 2 seconds
      description: 'A basic attack that deals damage to one target.'
    };
    
    return baseSkill;
  }

  // Calculate total waves based on dungeon type and difficulty
  calculateTotalWaves(dungeonType, difficulty) {
    const baseWaves = {
      'normal': 5,
      'elite': 7,
      'raid': 10
    };
    
    const difficultyModifier = Math.ceil(difficulty / 2);
    
    return baseWaves[dungeonType] + difficultyModifier;
  }

  // Get wave configuration
  getWaveConfig(waveNumber) {
    const isBossWave = waveNumber === this.state.totalWaves;
    
    if (isBossWave) {
      return {
        mobCount: 1,
        mobLevel: Math.floor(this.state.difficulty * 1.5) + waveNumber,
        bossWave: true
      };
    }
    
    return {
      mobCount: 2 + Math.floor(waveNumber / 2),
      mobLevel: Math.floor(this.state.difficulty) + waveNumber - 1,
      bossWave: false
    };
  }

  // Generate mobs for a wave
  generateMobs(waveConfig) {
    const mobs = [];
    
    for (let i = 0; i < waveConfig.mobCount; i++) {
      const isBoss = waveConfig.bossWave && i === 0;
      
      const mobLevel = isBoss ? waveConfig.mobLevel + 2 : waveConfig.mobLevel;
      const health = isBoss ? 100 + (mobLevel * 20) : 50 + (mobLevel * 10);
      
      const mob = {
        id: `mob_${Date.now()}_${i}`,
        name: isBoss ? this.generateBossName() : this.generateMobName(),
        level: mobLevel,
        stats: {
          hp: health,
          maxHp: health,
          atk: 5 + (mobLevel * 2),
          def: 3 + mobLevel
        },
        isBoss,
        effects: []
      };
      
      mobs.push(mob);
    }
    
    return mobs;
  }

  // Generate a random mob name
  generateMobName() {
    const prefixes = ['Feral', 'Corrupted', 'Savage', 'Vicious', 'Wild', 'Dark', 'Ancient'];
    const types = ['Wolf', 'Goblin', 'Skeleton', 'Troll', 'Orc', 'Zombie', 'Bandit', 'Spider'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    
    return `${prefix} ${type}`;
  }

  // Generate a random boss name
  generateBossName() {
    const titles = ['Overlord', 'Devourer', 'Destroyer', 'Guardian', 'Warlord', 'Emperor', 'Tyrant'];
    const names = ['Goroth', 'Azrahel', 'Kraghorn', 'Malgrath', 'Veximus', 'Mordath', 'Zephyr'];
    
    const title = titles[Math.floor(Math.random() * titles.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    
    return `${name}, ${title} of the Depths`;
  }

  // Get rarity weights based on dungeon type and drop type
  getRarityWeights(dropType) {
    const baseWeights = {
      'normal': {
        'F': 30, 'E': 25, 'D': 20, 'C': 15, 'B': 7, 'A': 2, 'S': 0.8, 'SS': 0.15, 'SSS': 0.05
      },
      'boss': {
        'F': 0, 'E': 5, 'D': 25, 'C': 30, 'B': 25, 'A': 10, 'S': 3, 'SS': 1.5, 'SSS': 0.5
      }
    };
    
    // Get the appropriate weights
    let weights = { ...baseWeights[dropType === 'boss' ? 'boss' : 'normal'] };
    
    // Apply dungeon type modifier
    const typeMods = {
      'normal': 1.0,
      'elite': 1.2,
      'raid': 1.5
    };
    
    const mod = typeMods[this.state.dungeonType];
    
    // Apply modifiers to each weight
    weights.F = Math.max(0, weights.F * (2 - mod)); // Reduce common items
    weights.E = Math.max(0, weights.E * (1.5 - (mod - 1)));
    weights.D = weights.D;
    weights.C = weights.C * mod;
    weights.B = weights.B * mod;
    weights.A = weights.A * mod;
    weights.S = weights.S * mod;
    weights.SS = weights.SS * mod;
    weights.SSS = weights.SSS * mod;
    
    return weights;
  }
}

module.exports = {
  DungeonRoom
}; 