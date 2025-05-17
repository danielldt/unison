const { Room } = require('colyseus');
const { calculateDamage } = require('../../shared/utils/combatCalculator');
const db = require('../db/database');

class PvPState {
  constructor() {
    this.players = new Map();
    this.matchInProgress = false;
    this.matchTimeRemaining = 180; // 3 minutes per match
    this.rounds = [];
    this.currentRound = 0;
    this.winner = null;
    this.loser = null;
  }
}

class PvPRoom extends Room {
  constructor() {
    super();
    this.maxClients = 2;
    this.autoDispose = true;
  }

  onCreate(options) {
    this.setState(new PvPState());
    this.setMetadata({
      matchType: options.matchType || 'duel',
      minLevel: options.minLevel || 1,
      maxLevel: options.maxLevel || 100
    });

    // Set up match timer
    this.clock.setInterval(() => {
      if (this.state.matchInProgress) {
        this.state.matchTimeRemaining--;
        
        if (this.state.matchTimeRemaining <= 0) {
          this.endMatch('draw');
        }
      }
    }, 1000);

    // Handle player actions
    this.onMessage('action', (client, message) => {
      if (!this.state.matchInProgress) return;
      
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      
      this.handlePlayerAction(client, player, message);
    });
  }

  async onJoin(client, options) {
    try {
      // Get character info
      const characterResult = await db.query(
        `SELECT c.id, c.name, c.level, c.stats 
         FROM ${db.TABLES.CHARACTERS} c
         WHERE c.id = $1`,
        [options.characterId]
      );
      
      if (characterResult.rowCount === 0) {
        client.send('error', { message: 'Character not found' });
        return;
      }
      
      const character = characterResult.rows[0];
      
      // Get equipped items for skills
      const itemsResult = await db.query(
        `SELECT i.id, i.type, i.name, i.level, i.rarity, i.stats, i.skill
         FROM ${db.TABLES.INVENTORY} i
         WHERE i.character_id = $1 AND i.equipped = true`,
        [options.characterId]
      );
      
      const equippedItems = itemsResult.rows;
      
      // Extract skills from equipped weapons
      const skills = equippedItems
        .filter(item => item.type === 'weapon' && item.skill)
        .map(item => item.skill);
      
      // Calculate total stats from character base stats and equipment
      const totalStats = this.calculateTotalStats(character.stats, equippedItems);
      
      // Add player to room state
      this.state.players.set(client.sessionId, {
        id: client.sessionId,
        characterId: character.id,
        name: character.name,
        level: character.level,
        stats: totalStats,
        skills,
        cooldowns: {},
        effects: [],
        isReady: false
      });
      
      // Check if match can start (2 players joined)
      if (this.state.players.size === 2) {
        this.broadcast('playersJoined', {
          message: 'Both players have joined. Prepare for combat!'
        });
      }
      
    } catch (error) {
      console.error('Error joining PvP room:', error);
      client.send('error', { message: 'Failed to join PvP match' });
    }
  }

  onLeave(client) {
    if (this.state.matchInProgress) {
      // If a player leaves during the match, they forfeit
      this.endMatch('forfeit', client.sessionId);
    }
    
    this.state.players.delete(client.sessionId);
  }

  calculateTotalStats(baseStats, equippedItems) {
    const totalStats = {
      ...baseStats,
      hp: baseStats.maxHp || 100,
      mp: baseStats.maxMp || 50,
      maxHp: baseStats.maxHp || 100,
      maxMp: baseStats.maxMp || 50
    };
    
    // Add stats from equipment
    equippedItems.forEach(item => {
      if (item.stats) {
        Object.entries(item.stats).forEach(([stat, value]) => {
          if (stat === 'hp' || stat === 'maxHp') {
            totalStats.hp += value;
            totalStats.maxHp += value;
          } else if (stat === 'mp' || stat === 'maxMp') {
            totalStats.mp += value;
            totalStats.maxMp += value;
          } else {
            totalStats[stat] = (totalStats[stat] || 0) + value;
          }
        });
      }
    });
    
    return totalStats;
  }

  handlePlayerReady(client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    
    player.isReady = true;
    
    // Check if all players are ready
    const allReady = Array.from(this.state.players.values()).every(p => p.isReady);
    
    if (allReady && this.state.players.size === 2) {
      this.startMatch();
    }
  }

  startMatch() {
    this.state.matchInProgress = true;
    this.state.currentRound = 1;
    
    // Reset players for the match
    this.state.players.forEach(player => {
      player.hp = player.maxHp;
      player.mp = player.maxMp;
      player.cooldowns = {};
      player.effects = [];
    });
    
    this.broadcast('matchStart', {
      players: Array.from(this.state.players.values()),
      matchTimeRemaining: this.state.matchTimeRemaining
    });
  }

  handlePlayerAction(client, player, message) {
    const { skillId, targetId } = message;
    
    // Validate action
    if (!skillId || !targetId) return;
    
    // Get skill from player
    const skill = player.skills.find(s => s.id === skillId);
    if (!skill) return;
    
    // Check cooldown
    if (player.cooldowns[skillId] > 0) {
      client.send('error', { message: 'Skill on cooldown' });
      return;
    }
    
    // Get target player
    const target = this.state.players.get(targetId);
    if (!target) return;
    
    // Process skill effect
    const result = this.processSkill(player, target, skill);
    
    // Update cooldowns
    player.cooldowns[skillId] = skill.cooldown;
    
    // Broadcast action result
    this.broadcast('actionResult', {
      actor: client.sessionId,
      target: targetId,
      skill: skillId,
      result
    });
    
    // Check if target is defeated
    if (target.stats.hp <= 0) {
      this.endMatch('victory', client.sessionId);
    }
  }

  processSkill(attacker, defender, skill) {
    const result = {
      type: skill.type,
      effects: []
    };
    
    switch (skill.type) {
      case 'ATTACK':
        // Calculate damage using combat calculator
        const damageResult = calculateDamage(attacker, defender, skill);
        
        // Apply damage to defender
        defender.stats.hp = Math.max(0, defender.stats.hp - damageResult.damage);
        
        result.effects.push({
          type: 'DAMAGE',
          value: damageResult.damage,
          isCritical: damageResult.isCritical
        });
        
        // Apply any status effects
        if (damageResult.statusEffects && damageResult.statusEffects.length > 0) {
          damageResult.statusEffects.forEach(effect => {
            defender.effects.push(effect);
            result.effects.push({
              type: effect.type === 'BUFF' ? 'DEBUFF' : 'STATUS',
              name: effect.name,
              duration: effect.duration
            });
          });
        }
        break;
        
      case 'HEAL':
        // Calculate healing
        const healAmount = skill.power * (1 + (attacker.stats.int || 0) / 100);
        const isCritical = Math.random() < (attacker.stats.critRate || 0.05);
        const finalHeal = Math.round(isCritical ? healAmount * 1.5 : healAmount);
        
        // Apply healing to target
        attacker.stats.hp = Math.min(attacker.stats.maxHp, attacker.stats.hp + finalHeal);
        
        result.effects.push({
          type: 'HEAL',
          value: finalHeal,
          isCritical
        });
        break;
        
      case 'BUFF':
        // Apply buff effect
        const buffEffect = {
          id: `buff-${Date.now()}`,
          type: 'BUFF',
          name: skill.name,
          stat: skill.stat || 'all',
          value: skill.power,
          duration: skill.duration || 3
        };
        
        attacker.effects.push(buffEffect);
        
        result.effects.push({
          type: 'BUFF',
          name: buffEffect.name,
          stat: buffEffect.stat,
          value: buffEffect.value,
          duration: buffEffect.duration
        });
        break;
    }
    
    return result;
  }

  endMatch(reason, winnerId = null) {
    this.state.matchInProgress = false;
    
    let winner = null;
    let loser = null;
    
    if (reason === 'victory' && winnerId) {
      winner = this.state.players.get(winnerId);
      
      // Find the other player (loser)
      for (const [id, player] of this.state.players.entries()) {
        if (id !== winnerId) {
          loser = player;
          break;
        }
      }
      
      this.state.winner = winner;
      this.state.loser = loser;
      
    } else if (reason === 'forfeit' && winnerId) {
      // The player who left is the loser, other is winner
      loser = { id: winnerId };
      
      for (const [id, player] of this.state.players.entries()) {
        if (id !== winnerId) {
          winner = player;
          break;
        }
      }
      
      this.state.winner = winner;
      this.state.loser = loser;
    }
    
    this.broadcast('matchEnd', {
      reason,
      winner: winner ? { id: winner.id, name: winner.name } : null,
      loser: loser ? { id: loser.id, name: loser.name } : null
    });
    
    // Record match result in database if needed
    if (winner && loser) {
      this.recordMatchResult(winner, loser, reason);
    }
    
    // Dispose room after delay
    this.clock.setTimeout(() => {
      this.disconnect();
    }, 5000);
  }

  async recordMatchResult(winner, loser, reason) {
    try {
      // Save PvP match result to database
      await db.query(
        `INSERT INTO ${db.TABLES.PVP_MATCHES} 
         (winner_id, loser_id, match_type, result_reason, match_date)
         VALUES ($1, $2, $3, $4, NOW())`,
        [winner.characterId, loser.characterId, this.metadata.matchType, reason]
      );
      
      // Update player stats/rankings if needed
    } catch (error) {
      console.error('Error recording PvP match result:', error);
    }
  }
}

module.exports = {
  PvPRoom,
  PvPState
}; 