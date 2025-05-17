const { Room } = require('colyseus');
const { calculateDamage } = require('../../shared/utils/combatCalculator');
const db = require('../db/database');

// PvPRoom schema class for Colyseus
class PvPRoomState {
  constructor() {
    this.players = new Map();
    this.matchStarted = false;
    this.matchComplete = false;
    this.winner = null;
    this.matchStartTime = null;
    this.matchEndTime = null;
    this.turnTime = 10000; // 10 seconds per turn
    this.currentTurn = null;
    this.turnStartTime = null;
    this.roundNumber = 0;
    this.maxRounds = 15;
  }
}

class PvPRoom extends Room {
  constructor() {
    super();
    this.maxClients = 2;
    this.autoDispose = true;
  }

  // Initialize the room
  async onCreate(options) {
    console.log('PvPRoom created!', options);
    
    this.setState(new PvPRoomState());
    
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
    
    this.onMessage('forfeit', (client) => {
      this.handleForfeit(client);
    });
  }

  // When a client connects to the room
  async onJoin(client, options) {
    console.log('Client joined PvP room!', client.sessionId);
    
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
        effects: []
      });
      
      console.log(`Player ${name} (${characterId}) joined the PvP room`);
      
      // If we've reached max players, start the match soon
      if (this.state.players.size === this.maxClients) {
        console.log('Room is full, waiting for players to be ready');
      }
    } catch (error) {
      console.error('Error adding player to PvP room:', error);
    }
  }

  // When a client leaves the room
  async onLeave(client, consented) {
    console.log('Client left PvP room!', client.sessionId);
    
    // If the match hasn't ended, treat this as a forfeit
    if (!this.state.matchComplete && this.state.matchStarted) {
      this.handleForfeit(client);
    }
    
    // Remove player from the room state
    this.state.players.delete(client.sessionId);
    
    // If everyone left, end the match
    if (this.state.players.size === 0) {
      this.disconnect();
    }
  }

  // When the room is disposed
  onDispose() {
    console.log('PvP Room disposed!', this.roomId);
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }
  }

  // Check if all players are ready
  checkAllPlayersReady() {
    if (this.state.players.size !== this.maxClients) return false;
    
    let allReady = true;
    this.state.players.forEach(player => {
      if (!player.ready) {
        allReady = false;
      }
    });
    
    if (allReady && !this.state.matchStarted) {
      this.startMatch();
    }
    
    return allReady;
  }

  // Start the PvP match
  startMatch() {
    console.log('Starting PvP match!');
    
    this.state.matchStarted = true;
    this.state.matchStartTime = Date.now();
    this.state.roundNumber = 1;
    
    // Determine starting player
    const playerIds = Array.from(this.state.players.keys());
    const startingIndex = Math.floor(Math.random() * playerIds.length);
    this.state.currentTurn = playerIds[startingIndex];
    this.state.turnStartTime = Date.now();
    
    // Notify players
    this.broadcast('matchStart', {
      players: Array.from(this.state.players.entries()).map(([id, player]) => ({
        id,
        name: player.name,
        stats: {
          hp: player.stats.hp,
          maxHp: player.stats.maxHp,
          mp: player.stats.mp,
          maxMp: player.stats.maxMp
        }
      })),
      startingPlayer: this.state.currentTurn,
      turnTime: this.state.turnTime
    });
    
    // Start turn timer
    this.setTurnTimer();
  }

  // Set the turn timer
  setTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }
    
    this.turnTimer = setTimeout(() => {
      this.handleTurnTimeout();
    }, this.state.turnTime);
  }

  // Handle turn timeout
  handleTurnTimeout() {
    console.log(`Turn timeout for player ${this.state.currentTurn}`);
    
    // Auto-forfeit if player doesn't take action
    const player = this.state.players.get(this.state.currentTurn);
    if (player) {
      this.handleForfeit({ sessionId: this.state.currentTurn });
    }
  }

  // Switch turns
  switchTurn() {
    if (this.state.matchComplete) return;
    
    const playerIds = Array.from(this.state.players.keys());
    const currentIndex = playerIds.indexOf(this.state.currentTurn);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    this.state.currentTurn = playerIds[nextIndex];
    this.state.turnStartTime = Date.now();
    
    // Increment round if we've gone through all players
    if (nextIndex === 0) {
      this.state.roundNumber++;
      
      // Check if max rounds reached
      if (this.state.roundNumber > this.state.maxRounds) {
        this.endMatch('draw');
        return;
      }
    }
    
    // Notify players of turn switch
    this.broadcast('turnSwitch', {
      currentTurn: this.state.currentTurn,
      roundNumber: this.state.roundNumber,
      turnTime: this.state.turnTime
    });
    
    // Reset turn timer
    this.setTurnTimer();
  }

  // Handle player action
  handlePlayerAction(client, message) {
    if (!this.state.matchStarted || this.state.matchComplete) return;
    
    // Check if it's this player's turn
    if (client.sessionId !== this.state.currentTurn) {
      console.log(`Not ${client.sessionId}'s turn!`);
      return;
    }
    
    const { skillId, targetId } = message;
    const player = this.state.players.get(client.sessionId);
    
    if (!player) return;
    
    // Find the skill
    const skill = player.skills.find(s => s.id === skillId);
    if (!skill) {
      console.log(`Skill ${skillId} not found!`);
      return;
    }
    
    // Find the target (opponent)
    const target = this.state.players.get(targetId);
    if (!target) {
      console.log(`Target ${targetId} not found!`);
      return;
    }
    
    // Process the action
    const result = this.processAction(player, skill, target);
    
    // Broadcast the result
    this.broadcast('actionResult', result);
    
    // Check if target is defeated
    if (target.stats.hp <= 0) {
      this.endMatch('defeat', client.sessionId, targetId);
      return;
    }
    
    // Switch turns
    this.switchTurn();
  }

  // Process an action
  processAction(player, skill, target) {
    const result = {
      actorId: player.id,
      skillId: skill.id,
      skillName: skill.name,
      targetId: target.id,
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
      result.effects.push({
        type: 'DEFEAT',
        targetId: target.id
      });
    }
    
    return result;
  }

  // Handle player forfeit
  handleForfeit(client) {
    if (!this.state.matchStarted || this.state.matchComplete) return;
    
    console.log(`Player ${client.sessionId} forfeited`);
    
    // Find the opponent
    let opponentId = null;
    this.state.players.forEach((player, id) => {
      if (id !== client.sessionId) {
        opponentId = id;
      }
    });
    
    if (opponentId) {
      this.endMatch('forfeit', opponentId, client.sessionId);
    }
  }

  // End the match
  endMatch(reason, winnerId = null, loserId = null) {
    console.log(`Match ended with reason: ${reason}, winner: ${winnerId}`);
    
    this.state.matchComplete = true;
    this.state.matchEndTime = Date.now();
    this.state.winner = winnerId;
    
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }
    
    // Prepare match result data
    const matchDuration = this.state.matchEndTime - this.state.matchStartTime;
    const matchData = {
      reason,
      winner: winnerId ? {
        id: winnerId,
        name: this.state.players.get(winnerId)?.name
      } : null,
      loser: loserId ? {
        id: loserId,
        name: this.state.players.get(loserId)?.name
      } : null,
      rounds: this.state.roundNumber,
      duration: matchDuration
    };
    
    // Broadcast match result to all players
    this.broadcast('matchComplete', matchData);
    
    // In a full implementation, this would update player stats and rankings in the database
    console.log('Match results:', matchData);
  }
}

module.exports = {
  PvPRoom
}; 