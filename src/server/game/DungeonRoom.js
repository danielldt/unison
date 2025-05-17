const { Room } = require('colyseus');const { generateDungeon } = require('../../shared/utils/dungeonGenerator');const { generateEnvironmentalEffects, applyEnvironmentalEffects } = require('../../shared/utils/environmentalEffects');const { calculateDamage, calculateHealing } = require('../../shared/utils/combatCalculator');const { generateMobLoot, calculateMobExperience, calculateMobGold } = require('../utils/mobDrop');const db = require('../db/database');

// Define game state schema
class DungeonState {  constructor() {    this.players = new Map();    this.currentWave = 0;    this.waveInProgress = false;    this.mobs = [];    this.dungeon = null;    this.combatLog = [];    this.loot = [];    this.environment = null;    this.environmentalHazards = [];    this.lastEnvironmentTick = Date.now();  }}

class DungeonRoom extends Room {
  constructor() {
    super();
    this.maxClients = 4; // Max 4 players per dungeon
    this.autoDispose = true;
  }

  async onCreate(options) {
    console.log('DungeonRoom created!', options);
    this.setState(new DungeonState());
    
    // Set metadata from options
    this.setMetadata({
      dungeonId: options.dungeonId,
      dungeonName: options.dungeonName,
      dungeonType: options.dungeonType || 'normal',
      level: options.level || 1,
      private: options.private || false
    });
    
    if (options.dungeonId) {
      // Load existing dungeon
      try {
        const result = await db.query(
          `SELECT dp.seed, dp.completed_waves, c.level, dp.status
           FROM ${db.TABLES.DUNGEON_PROGRESS} dp
           JOIN ${db.TABLES.CHARACTERS} c ON dp.character_id = c.id
           WHERE dp.id = $1`,
          [options.dungeonId]
        );
        
        if (result.rowCount > 0) {
          const dungeonData = result.rows[0];
          
          // Get balance parameters
          const balanceResult = await db.query(
            `SELECT parameter_key, value FROM ${db.TABLES.BALANCE_PARAMETERS}
             WHERE parameter_key IN ('drop_rate_multiplier', 'rarity_threshold_adjustment', 'global_difficulty_modifier')`
          );
          
          const balanceParams = {};
          balanceResult.rows.forEach(row => {
            balanceParams[row.parameter_key] = parseFloat(row.value);
          });
          
                    // Regenerate dungeon          this.state.dungeon = generateDungeon(            dungeonData.seed,            dungeonData.level,            options.dungeonType || 'normal',            balanceParams          );                    // Generate environmental effects          this.state.environment = generateEnvironmentalEffects(            dungeonData.seed + 12345, // Use different seed            options.dungeonType || 'normal',            dungeonData.level          );                    // Set current wave to completed waves          this.state.currentWave = parseInt(dungeonData.completed_waves);
          
          // Load current wave mobs
          if (this.state.currentWave < this.state.dungeon.waves.length) {
            this.state.mobs = [...this.state.dungeon.waves[this.state.currentWave].mobs];
          }
        }
      } catch (error) {
        console.error('Error loading dungeon:', error);
      }
    }
    
    // Register message handlers
    this.onMessage('action', this.handleAction.bind(this));
    this.onMessage('ready', this.handleReady.bind(this));
    this.onMessage('startWave', this.startWave.bind(this));
    this.onMessage('collectLoot', this.collectLoot.bind(this));
  }
  
  async onJoin(client, options) {
    console.log('Client joined:', client.sessionId);
    
    // Add player to state
    this.state.players.set(client.sessionId, {
      id: client.sessionId,
      characterId: options.characterId,
      name: options.name || 'Player',
      ready: false,
      stats: options.stats || {
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        atk: 10,
        def: 5,
        str: 1,
        int: 1,
        agi: 1,
        dex: 1,
        luk: 1
      },
      skills: options.skills || [],
      cooldowns: {},
      effects: [],
      equipment: options.equipment || []
    });
    
    // If this is the first player, make them leader
    if (this.state.players.size === 1) {
      this.state.players.get(client.sessionId).isLeader = true;
    }
    
    // Broadcast player joined message
    this.broadcast('playerJoined', {
      playerId: client.sessionId,
      playerName: options.name || 'Player'
    });
  }
  
  onLeave(client, consented) {
    console.log('Client left:', client.sessionId);
    
    // Remove player from state
    this.state.players.delete(client.sessionId);
    
    // Reassign leader if needed
    if (this.state.players.size > 0 && this.state.players.get(client.sessionId)?.isLeader) {
      const newLeader = this.state.players.entries().next().value[0];
      this.state.players.get(newLeader).isLeader = true;
    }
    
    // Broadcast player left message
    this.broadcast('playerLeft', {
      playerId: client.sessionId
    });
  }
  
  onDispose() {
    console.log('DungeonRoom disposed');
  }
  
  handleReady(client, message) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.ready = message.ready;
      
      // Check if all players are ready
      let allReady = true;
      this.state.players.forEach(p => {
        if (!p.ready) allReady = false;
      });
      
      // Auto-start if all players ready
      if (allReady && !this.state.waveInProgress) {
        this.startWave();
      }
    }
  }
  
    startWave() {    if (this.state.waveInProgress) return;        // Get current wave    if (this.state.currentWave >= this.state.dungeon.waves.length) {      this.broadcast('dungeonComplete', { dungeon: this.state.dungeon });      return;    }        const wave = this.state.dungeon.waves[this.state.currentWave];    this.state.mobs = [...wave.mobs];    this.state.waveInProgress = true;        // Reset cooldowns for players    this.state.players.forEach(player => {      player.cooldowns = {};      player.effects = player.effects.filter(e => e.permanent);    });        // Reset environmental state    this.state.environmentalHazards = [];    this.state.lastEnvironmentTick = Date.now();        // Send environment description to clients    if (this.state.environment) {      this.broadcast('environmentDescription', {        type: this.state.environment.type,        description: this.state.environment.description,        effects: this.state.environment.effects.map(e => e.description)      });    }        // Broadcast wave start    this.broadcast('waveStart', {      waveNumber: this.state.currentWave + 1,      mobs: this.state.mobs,      isBossWave: wave.isBossWave    });        // Set timeout for first mob action (3 seconds)    this.mobActionTimeout = this.clock.setTimeout(() => {      this.performMobActions();    }, 3000);        // Start environmental effect processing    this.environmentalEffectInterval = this.clock.setInterval(() => {      this.environmentalEffectTick();    }, 1000);
  }
  
  async handleAction(client, action) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !this.state.waveInProgress) return;
    
    // Check cooldowns
    if (player.cooldowns[action.skillId]) {
      client.send('error', { message: 'Skill is on cooldown' });
      return;
    }
    
    // Find skill
    const skill = player.skills.find(s => s.id === action.skillId);
    if (!skill) {
      client.send('error', { message: 'Skill not found' });
      return;
    }
    
    // Check target validity
    let target;
    if (action.targetType === 'MOB') {
      target = this.state.mobs.find(m => m.id === action.targetId);
    } else if (action.targetType === 'PLAYER') {
      target = this.state.players.get(action.targetId);
    } else if (action.targetType === 'SELF') {
      target = player;
    }
    
    if (!target) {
      client.send('error', { message: 'Invalid target' });
      return;
    }
    
    // Process action
    const result = this.processAction(player, skill, target, action.targetType);
    
    // Apply cooldown
    player.cooldowns[action.skillId] = skill.cooldown;
    
    // Broadcast action result
    this.broadcast('actionResult', result);
    
    // Add to combat log
    this.state.combatLog.push(result);
    
    // Check if all mobs defeated
    if (this.state.mobs.length === 0) {
      await this.endWave();
    }
  }
  
  processAction(player, skill, target, targetType) {
    const result = {
      actorId: player.id,
      skillId: skill.id,
      skillName: skill.name,
      targetId: target.id,
      targetType,
      effects: []
    };
    
    // Different logic depending on skill type
    switch (skill.type) {
      case 'ATTACK':
        // Use advanced combat calculator for damage
        const damageResult = calculateDamage(player, target, skill);
        
        // Apply damage
        target.stats.hp = Math.max(0, target.stats.hp - damageResult.damage);
        
        // Add damage effect
        result.effects.push({
          type: 'DAMAGE',
          value: damageResult.damage,
          isCrit: damageResult.isCrit,
          isHit: damageResult.isHit,
          element: skill.element
        });
        
        // Add any additional effects from the damage calculation
        if (damageResult.effects && damageResult.effects.length > 0) {
          // Apply status effects to target
          if (!target.effects) target.effects = [];
          target.effects.push(...damageResult.effects);
          
          // Add effects to result
          damageResult.effects.forEach(effect => {
            result.effects.push({
              type: effect.type,
              duration: effect.duration
            });
          });
        }
        
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
            
            // Generate loot
            const loot = this.generateLoot(target);
            if (loot) {
              this.state.loot.push(loot);
            }
          }
        }
        break;
        
      case 'HEAL':
        // Use advanced healing calculator
        const healResult = calculateHealing(player, target, skill);
        
        // Apply healing
        const oldHp = target.stats.hp;
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + healResult.healing);
        
        // Add healing effect
        result.effects.push({
          type: 'HEAL',
          value: target.stats.hp - oldHp,
          isCrit: healResult.isCrit
        });
        
        // Add additional healing effects
        if (healResult.effects && healResult.effects.length > 0) {
          // Apply effects to target
          if (!target.effects) target.effects = [];
          target.effects.push(...healResult.effects);
          
          // Add to result
          healResult.effects.forEach(effect => {
            result.effects.push({
              type: effect.type,
              duration: effect.duration
            });
          });
        }
        break;
        
      case 'BUFF':
        // Apply buff effect
        const buff = {
          type: 'BUFF',
          stat: skill.targetStat,
          multiplier: skill.statMultiplier || 1.2,
          duration: skill.duration || 3
        };
        
        if (!target.effects) target.effects = [];
        target.effects.push(buff);
        
        // Add buff effect to result
        result.effects.push(buff);
        break;
        
      case 'DEBUFF':
        // Only apply debuffs to mobs for simplicity
        if (targetType === 'MOB') {
          const debuff = {
            type: 'DEBUFF',
            stat: skill.targetStat,
            multiplier: skill.statMultiplier || 0.8,
            duration: skill.duration || 3
          };
          
          if (!target.effects) target.effects = [];
          target.effects.push(debuff);
          
          // Add debuff effect to result
          result.effects.push(debuff);
        }
        break;
    }
    
    return result;
  }
  
  performMobActions() {
    if (!this.state.waveInProgress || this.state.mobs.length === 0) return;
    
    // Each mob performs an action
    for (const mob of this.state.mobs) {
      // Skip if mob has no skills
      if (!mob.skills || mob.skills.length === 0) continue;
      
      // Find available skills (not on cooldown)
      const availableSkills = mob.skills.filter(s => !mob.cooldowns?.[s.id]);
      
      if (availableSkills.length === 0) continue;
      
      // Choose a random skill
      const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      
      // Choose a target based on skill type
      let target, targetType;
      
      switch (skill.type) {
        case 'ATTACK':
        case 'DEBUFF':
          // Target random player
          const playerKeys = Array.from(this.state.players.keys());
          const randomPlayerKey = playerKeys[Math.floor(Math.random() * playerKeys.length)];
          target = this.state.players.get(randomPlayerKey);
          targetType = 'PLAYER';
          break;
          
        case 'HEAL':
        case 'BUFF':
          // Target self or another mob with lowest HP
          if (mob.stats.hp < mob.stats.maxHp * 0.5 && skill.type === 'HEAL') {
            target = mob;
            targetType = 'MOB';
          } else {
            const needyMob = this.state.mobs
              .filter(m => m.id !== mob.id)
              .sort((a, b) => (a.stats.hp / a.stats.maxHp) - (b.stats.hp / b.stats.maxHp))[0];
              
            if (needyMob) {
              target = needyMob;
              targetType = 'MOB';
            } else {
              target = mob;
              targetType = 'MOB';
            }
          }
          break;
      }
      
      if (!target) continue;
      
      // Process action
      const result = this.processMobAction(mob, skill, target, targetType);
      
      // Apply cooldown
      if (!mob.cooldowns) mob.cooldowns = {};
      mob.cooldowns[skill.id] = skill.cooldown;
      
      // Broadcast action result
      this.broadcast('mobActionResult', result);
      
      // Add to combat log
      this.state.combatLog.push(result);
      
      // Check if all players defeated
      let allPlayersDefeated = true;
      this.state.players.forEach(p => {
        if (p.stats.hp > 0) allPlayersDefeated = false;
      });
      
      if (allPlayersDefeated) {
        this.endWave(true);
        return;
      }
    }
    
    // Schedule next mob action (every 3 seconds)
    this.mobActionTimeout = this.clock.setTimeout(() => {
      this.performMobActions();
    }, 3000);
  }
  
  processMobAction(mob, skill, target, targetType) {
    // Similar to player action processing, but for mobs
    const result = {
      actorId: mob.id,
      skillId: skill.id,
      skillName: skill.name,
      targetId: target.id,
      targetType,
      effects: []
    };
    
    // Process based on skill type
    switch (skill.type) {
      case 'ATTACK':
        // Simplified damage calculation for mobs
        const damage = Math.floor(skill.damage || mob.stats.atk);
        
        // Apply damage
        target.stats.hp = Math.max(0, target.stats.hp - damage);
        
        // Add damage effect
        result.effects.push({
          type: 'DAMAGE',
          value: damage,
          isCrit: false
        });
        
        // Check if target defeated
        if (target.stats.hp <= 0 && targetType === 'PLAYER') {
          result.effects.push({
            type: 'DEFEAT',
            targetId: target.id
          });
        }
        break;
        
      case 'HEAL':
        // Calculate healing
        const healing = Math.floor(skill.healAmount || mob.stats.int);
        
        // Apply healing
        const oldHp = target.stats.hp;
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + healing);
        
        // Add healing effect
        result.effects.push({
          type: 'HEAL',
          value: target.stats.hp - oldHp
        });
        break;
        
      case 'BUFF':
      case 'DEBUFF':
        // Apply effect
        const effect = {
          type: skill.type,
          stat: skill.statBoost?.stat || skill.statReduction?.stat || 'atk',
          multiplier: skill.statBoost?.amount || skill.statReduction?.amount || 1.2,
          duration: skill.duration || 3
        };
        
        if (!target.effects) target.effects = [];
        target.effects.push(effect);
        
        // Add effect to result
        result.effects.push(effect);
        break;
    }
    
    return result;
  }
  
  generateLoot(mob) {
    if (!mob) return null;
    
    // Generate items based on mob properties
    const items = generateMobLoot(mob, this.state.dungeon);
    
    // Calculate experience and gold
    const playerLevel = Array.from(this.state.players.values())[0]?.stats?.level || 1;
    const experience = calculateMobExperience(mob, playerLevel);
    const gold = calculateMobGold(mob);
    
    return {
      id: `loot-${Date.now()}-${mob.id}`,
      items,
      experience,
      gold,
      sourceId: mob.id,
      sourceName: mob.name,
      isBossLoot: mob.isBoss
    };
  }
  
    async endWave(failed = false) {    this.state.waveInProgress = false;        // Clear mob action timeout    if (this.mobActionTimeout) {      this.clock.clearTimeout(this.mobActionTimeout);    }        // Clear environmental effect interval    if (this.environmentalEffectInterval) {      this.clock.clearInterval(this.environmentalEffectInterval);    }
    
    if (failed) {
      // Dungeon run failed
      this.broadcast('waveFailed', {
        waveNumber: this.state.currentWave + 1
      });
      
      // Update database
      try {
        await db.query(
          `UPDATE ${db.TABLES.DUNGEON_PROGRESS} 
           SET status = 'FAILED', last_updated = NOW()
           WHERE id = $1`,
          [this.metadata.dungeonId]
        );
      } catch (error) {
        console.error('Error updating dungeon progress:', error);
      }
      
      return;
    }
    
    // Reset player ready status
    this.state.players.forEach(player => {
      player.ready = false;
    });
    
    // Increment wave counter
    this.state.currentWave++;
    
    // Update database with completed wave
    try {
      await db.query(
        `UPDATE ${db.TABLES.DUNGEON_PROGRESS} 
         SET completed_waves = $1, last_updated = NOW()
         WHERE id = $2`,
        [this.state.currentWave, this.metadata.dungeonId]
      );
    } catch (error) {
      console.error('Error updating dungeon progress:', error);
    }
    
    // Check if dungeon complete
    if (this.state.currentWave >= this.state.dungeon.waves.length) {
      // Dungeon complete
      this.broadcast('dungeonComplete', {
        dungeon: this.state.dungeon,
        loot: this.state.loot
      });
      
      // Update database
      try {
        await db.query(
          `UPDATE ${db.TABLES.DUNGEON_PROGRESS} 
           SET status = 'COMPLETED', last_updated = NOW()
           WHERE id = $1`,
          [this.metadata.dungeonId]
        );
      } catch (error) {
        console.error('Error updating dungeon progress:', error);
      }
    } else {
      // Wave complete
      this.broadcast('waveComplete', {
        waveNumber: this.state.currentWave,
        nextWave: this.state.dungeon.waves[this.state.currentWave],
        loot: this.state.loot
      });
    }
  }
  
  async collectLoot(client, message) {
    const player = this.state.players.get(client.sessionId);
    if (!player || this.state.waveInProgress || this.state.loot.length === 0) return;
    
    try {
      // Get character info
      const characterResult = await db.query(
        `SELECT c.id, c.level, c.experience, c.next_level_exp, c.gold
         FROM ${db.TABLES.CHARACTERS} c
         WHERE c.id = $1`,
        [player.characterId]
      );
      
      if (characterResult.rowCount === 0) {
        client.send('error', { message: 'Character not found' });
        return;
      }
      
      const character = characterResult.rows[0];
      
      // Get inventory
      const inventoryResult = await db.query(
        `SELECT id, items FROM ${db.TABLES.INVENTORY} WHERE character_id = $1`,
        [player.characterId]
      );
      
      if (inventoryResult.rowCount === 0) {
        client.send('error', { message: 'Inventory not found' });
        return;
      }
      
      const inventoryId = inventoryResult.rows[0].id;
      const currentItems = inventoryResult.rows[0].items || [];
      
      // Collect all items from all loot
      const allNewItems = this.state.loot.flatMap(loot => loot.items || []);
      
      // Add all new items to inventory
      const updatedItems = [...currentItems, ...allNewItems];
      
      // Calculate total experience and gold
      const totalExperience = this.state.loot.reduce((sum, loot) => sum + (loot.experience || 0), 0);
      const totalGold = this.state.loot.reduce((sum, loot) => sum + (loot.gold || 0), 0);
      
      // Add experience to character
      let newLevel = character.level;
      let newExp = character.experience + totalExperience;
      let newNextLevelExp = character.next_level_exp;
      
      // Check for level up
      while (newExp >= newNextLevelExp) {
        newLevel++;
        newExp -= newNextLevelExp;
        // Next level exp formula: current * 1.1 + 100
        newNextLevelExp = Math.floor(newNextLevelExp * 1.1 + 100);
      }
      
      // Update character in database
      await db.query(
        `UPDATE ${db.TABLES.CHARACTERS}
         SET level = $1, experience = $2, next_level_exp = $3, gold = gold + $4, stat_points = stat_points + $5
         WHERE id = $6`,
        [
          newLevel, 
          newExp, 
          newNextLevelExp, 
          totalGold,
          newLevel - character.level, // Add stat points for level ups
          player.characterId
        ]
      );
      
      // Update inventory
      await db.query(
        `UPDATE ${db.TABLES.INVENTORY}
         SET items = $1, last_updated = NOW()
         WHERE id = $2`,
        [JSON.stringify(updatedItems), inventoryId]
      );
      
      // Update dungeon progress to mark current wave as completed
      await db.query(
        `UPDATE ${db.TABLES.DUNGEON_PROGRESS}
         SET completed_waves = $1, last_updated = NOW()
         WHERE id = $2`,
        [this.state.currentWave + 1, this.metadata.dungeonId]
      );
      
      // Prepare loot summary for the client
      const lootSummary = {
        items: allNewItems,
        experience: totalExperience,
        gold: totalGold,
        levelUp: newLevel > character.level,
        newLevel: newLevel
      };
      
      // Send loot summary to the client
      client.send('lootCollected', lootSummary);
      
      // Clear loot in the room
      this.state.loot = [];
      
      // Broadcast loot collected message
      this.broadcast('lootCollectedBy', {
        playerId: client.sessionId,
        playerName: player.name
      });
      
      // Move to next wave if all players are ready
      let allReady = true;
      this.state.players.forEach(p => {
        if (!p.ready) allReady = false;
      });
      
      if (allReady) {
        // Increment wave counter
        this.state.currentWave++;
        
        // Start next wave
        this.startWave();
      }
    } catch (error) {
      console.error('Collect loot error:', error);
      client.send('error', { message: 'Failed to collect loot' });
    }
  }

  /**
   * Process environmental effects
   * Applied at regular intervals during waves
   */
  environmentalEffectTick() {
    if (!this.state.environment || !this.state.waveInProgress) return;
    
    const now = Date.now();
    const elapsed = now - this.state.lastEnvironmentTick;
    
    // Check if enough time has passed (1 second)
    if (elapsed < 1000) return;
    
    this.state.lastEnvironmentTick = now;
    
    // Get environment effects
    const environment = this.state.environment;
    
    // Process active environment effects
    environment.effects.forEach(effect => {
      // Skip effects without an interval or chance-based effects
      if (!effect.interval || (effect.chance && Math.random() > effect.chance)) return;
      
      // Check if it's time to apply the effect
      const timeSinceLastEffect = now - (effect.lastApplied || 0);
      if (timeSinceLastEffect < effect.interval * 1000) return;
      
      // Update last applied time
      effect.lastApplied = now;
      
      // Apply effect based on type
      switch (effect.type) {
        case 'damage_over_time':
          // Apply damage to all entities in the dungeon
          this.applyEnvironmentalDamage(effect);
          break;
          
        case 'healing':
          // Apply healing to all players
          this.applyEnvironmentalHealing(effect);
          break;
          
        case 'hazard':
          // Create a hazard in the environment
          this.createEnvironmentalHazard(effect);
          break;
      }
    });
    
    // Process active environmental hazards
    this.processActiveHazards();
  }
  
  /**
   * Apply environmental damage to entities
   */
  applyEnvironmentalDamage(effect) {
    // Get all players and mobs
    const players = Array.from(this.state.players.values());
    
    // Apply damage to players
    players.forEach(player => {
      // Skip defeated players
      if (player.stats.hp <= 0) return;
      
      // Calculate damage (reduced for players)
      const damage = Math.floor(effect.value * 0.5);
      
      // Apply damage
      player.stats.hp = Math.max(0, player.stats.hp - damage);
      
      // Notify player of environmental damage
      const clientId = player.id;
      const client = this.clients.find(c => c.sessionId === clientId);
      
      if (client) {
        client.send('environmentalDamage', {
          type: effect.element,
          damage,
          description: `You took ${damage} ${effect.element} damage from the environment`
        });
      }
      
      // Check if player is defeated
      if (player.stats.hp <= 0) {
        this.handlePlayerDefeat(player);
      }
    });
    
    // Apply damage to mobs (if applicable)
    if (effect.affectsMobs) {
      this.state.mobs.forEach(mob => {
        // Skip defeated mobs
        if (mob.stats.hp <= 0) return;
        
        // Calculate damage
        const damage = Math.floor(effect.value * 0.7);
        
        // Apply damage
        mob.stats.hp = Math.max(0, mob.stats.hp - damage);
        
        // Add to combat log
        this.state.combatLog.push({
          targetId: mob.id,
          targetType: 'MOB',
          effects: [
            {
              type: 'DAMAGE',
              value: damage,
              element: effect.element,
              source: 'environment'
            }
          ]
        });
        
        // Check if mob is defeated
        if (mob.stats.hp <= 0) {
          // Remove mob from state
          this.state.mobs = this.state.mobs.filter(m => m.id !== mob.id);
          
          // Add defeat message to combat log
          this.state.combatLog.push({
            targetId: mob.id,
            targetType: 'MOB',
            effects: [
              {
                type: 'DEFEAT',
                targetId: mob.id
              }
            ]
          });
          
          // No loot for environmental kills
        }
      });
    }
    
    // Broadcast updated state
    this.broadcast('stateUpdate', {
      players: Array.from(this.state.players.values()),
      mobs: this.state.mobs
    });
  }
  
  /**
   * Apply environmental healing
   */
  applyEnvironmentalHealing(effect) {
    // Only heal players
    const players = Array.from(this.state.players.values());
    
    // Apply healing to players
    players.forEach(player => {
      // Skip defeated players
      if (player.stats.hp <= 0) return;
      
      // Calculate healing
      const healing = Math.floor(effect.value);
      
      // Apply healing
      const oldHp = player.stats.hp;
      player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + healing);
      
      // Only notify if healing was applied
      if (player.stats.hp > oldHp) {
        // Notify player of environmental healing
        const clientId = player.id;
        const client = this.clients.find(c => c.sessionId === clientId);
        
        if (client) {
          client.send('environmentalHealing', {
            healing: player.stats.hp - oldHp,
            description: `You were healed for ${player.stats.hp - oldHp} by the environment`
          });
        }
      }
    });
    
    // Broadcast updated state
    this.broadcast('stateUpdate', {
      players: Array.from(this.state.players.values())
    });
  }
  
  /**
   * Create environmental hazard
   */
  createEnvironmentalHazard(effect) {
    // Create hazard instance
    const hazard = {
      id: `hazard-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: effect.element,
      damage: effect.value,
      radius: effect.radius || 1,
      duration: effect.duration || 5,
      createdAt: Date.now()
    };
    
    // Add to hazards list
    this.state.environmentalHazards.push(hazard);
    
    // Broadcast hazard creation
    this.broadcast('environmentalHazard', {
      hazard,
      description: `A ${effect.element} hazard has appeared!`
    });
  }
  
  /**
   * Process active hazards
   */
  processActiveHazards() {
    const now = Date.now();
    
    // Process each hazard
    for (let i = this.state.environmentalHazards.length - 1; i >= 0; i--) {
      const hazard = this.state.environmentalHazards[i];
      
      // Check if hazard has expired
      if (now - hazard.createdAt >= hazard.duration * 1000) {
        // Remove hazard
        this.state.environmentalHazards.splice(i, 1);
        
        // Broadcast hazard removal
        this.broadcast('environmentalHazardRemoved', {
          hazardId: hazard.id
        });
        
        continue;
      }
      
      // Apply hazard damage to entities in range
      // For simplicity, we'll just apply to random entities
      
      // 50% chance to hit a random player
      if (Math.random() < 0.5) {
        const players = Array.from(this.state.players.values());
        if (players.length > 0) {
          const randomPlayer = players[Math.floor(Math.random() * players.length)];
          
          // Skip defeated players
          if (randomPlayer.stats.hp > 0) {
            // Calculate damage
            const damage = Math.floor(hazard.damage * 0.7);
            
            // Apply damage
            randomPlayer.stats.hp = Math.max(0, randomPlayer.stats.hp - damage);
            
            // Notify player
            const clientId = randomPlayer.id;
            const client = this.clients.find(c => c.sessionId === clientId);
            
            if (client) {
              client.send('hazardDamage', {
                hazardId: hazard.id,
                type: hazard.type,
                damage
              });
            }
            
            // Check if player is defeated
            if (randomPlayer.stats.hp <= 0) {
              this.handlePlayerDefeat(randomPlayer);
            }
          }
        }
      }
      
      // 50% chance to hit a random mob
      if (Math.random() < 0.5 && this.state.mobs.length > 0) {
        const randomMob = this.state.mobs[Math.floor(Math.random() * this.state.mobs.length)];
        
        // Skip defeated mobs
        if (randomMob.stats.hp > 0) {
          // Calculate damage
          const damage = Math.floor(hazard.damage);
          
          // Apply damage
          randomMob.stats.hp = Math.max(0, randomMob.stats.hp - damage);
          
          // Add to combat log
          this.state.combatLog.push({
            targetId: randomMob.id,
            targetType: 'MOB',
            effects: [
              {
                type: 'DAMAGE',
                value: damage,
                element: hazard.type,
                source: 'hazard'
              }
            ]
          });
          
          // Check if mob is defeated
          if (randomMob.stats.hp <= 0) {
            // Remove mob from state
            this.state.mobs = this.state.mobs.filter(m => m.id !== randomMob.id);
            
            // Add defeat message to combat log
            this.state.combatLog.push({
              targetId: randomMob.id,
              targetType: 'MOB',
              effects: [
                {
                  type: 'DEFEAT',
                  targetId: randomMob.id
                }
              ]
            });
            
            // No loot for hazard kills
          }
        }
      }
    }
    
    // Broadcast updated state if any damage was applied
    this.broadcast('stateUpdate', {
      players: Array.from(this.state.players.values()),
      mobs: this.state.mobs,
      environmentalHazards: this.state.environmentalHazards
    });
  }
  
  /**
   * Handle player defeat from environmental effects
   */
  handlePlayerDefeat(player) {
    // Send defeat message to player
    const clientId = player.id;
    const client = this.clients.find(c => c.sessionId === clientId);
    
    if (client) {
      client.send('playerDefeated', {
        cause: 'environment'
      });
    }
    
    // Broadcast player defeat
    this.broadcast('playerDefeated', {
      playerId: player.id,
      playerName: player.name
    });
    
    // Check if all players are defeated
    let allDefeated = true;
    this.state.players.forEach(p => {
      if (p.stats.hp > 0) allDefeated = false;
    });
    
    // End wave if all players are defeated
    if (allDefeated) {
      this.endWave(true);
    }
  }
}

module.exports = {
  DungeonRoom
}; 