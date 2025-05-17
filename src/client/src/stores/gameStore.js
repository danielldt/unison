import { create } from 'zustand';
import axios from 'axios';
import * as Colyseus from 'colyseus.js';

// Create Colyseus client
const colyseusClient = new Colyseus.Client('ws://localhost:8080');

export const useGameStore = create((set, get) => ({
  // Available dungeons
  availableDungeons: [],
  // Current dungeon
  currentDungeon: null,
  // Colyseus room
  gameRoom: null,
  // Game state
  gameState: {
    players: [],
    mobs: [],
    currentWave: 0,
    waveInProgress: false,
    combatLog: [],
    loot: []
  },
  // Loading state
  isLoading: false,
  // Error state
  error: null,
  
  // Fetch available dungeons for character
  fetchAvailableDungeons: async (characterId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`/api/dungeons/available?characterId=${characterId}`);
      set({ availableDungeons: response.data.dungeons, isLoading: false });
      return response.data.dungeons;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch dungeons', 
        isLoading: false 
      });
      return [];
    }
  },
  
  // Generate a new dungeon
  generateDungeon: async (characterId, dungeonType = 'normal', seed = null) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/dungeons/generate', {
        characterId,
        dungeonType,
        seed
      });
      
      set({ currentDungeon: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to generate dungeon', 
        isLoading: false 
      });
      return null;
    }
  },
  
  // Get dungeon details
  getDungeon: async (dungeonId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`/api/dungeons/${dungeonId}`);
      set({ currentDungeon: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to get dungeon', 
        isLoading: false 
      });
      return null;
    }
  },
  
  // Join dungeon room
  joinDungeonRoom: async (dungeonId, character) => {
    set({ isLoading: true, error: null });
    try {
      // Get dungeon first if not already loaded
      let dungeon = get().currentDungeon;
      if (!dungeon || dungeon.progressId !== dungeonId) {
        dungeon = await get().getDungeon(dungeonId);
        if (!dungeon) throw new Error('Failed to load dungeon');
      }
      
      // Prepare character stats for the room
      const { stats } = character;
      
      // Calculate derived stats based on GDD formulas
      const calculatedStats = {
        ...stats,
        hp: 100 + (character.level * 20) + (stats.str * 5),
        maxHp: 100 + (character.level * 20) + (stats.str * 5),
        mp: 50 + (character.level * 10) + (stats.int * 3),
        maxMp: 50 + (character.level * 10) + (stats.int * 3),
        def: 10 + (character.level * 2) + calculateArmorDef(character.inventory || [])
      };
      
      // Get skills from equipped weapons
      const skills = extractSkillsFromEquipment(character.inventory || []);
      
      // Join the room
      const room = await colyseusClient.joinById('dungeon', dungeonId, {
        characterId: character.id,
        name: character.name || 'Player',
        stats: calculatedStats,
        skills,
        equipment: character.inventory?.filter(item => item.equipped) || []
      });
      
      // Setup room event listeners
      setupRoomListeners(room);
      
      set({ gameRoom: room, isLoading: false });
      return room;
    } catch (error) {
      console.error('Join dungeon room error:', error);
      set({ 
        error: error.message || 'Failed to join dungeon room', 
        isLoading: false 
      });
      return null;
    }
  },
  
  // Perform action in dungeon
  performAction: (actionData) => {
    const { gameRoom } = get();
    if (!gameRoom) {
      set({ error: 'Not connected to game room' });
      return;
    }
    
    gameRoom.send('action', actionData);
  },
  
  // Set ready status in dungeon
  setReady: (ready = true) => {
    const { gameRoom } = get();
    if (!gameRoom) {
      set({ error: 'Not connected to game room' });
      return;
    }
    
    gameRoom.send('ready', { ready });
  },
  
  // Start wave in dungeon
  startWave: () => {
    const { gameRoom } = get();
    if (!gameRoom) {
      set({ error: 'Not connected to game room' });
      return;
    }
    
    gameRoom.send('startWave');
  },
  
  // Collect loot in dungeon
  collectLoot: () => {
    const { gameRoom } = get();
    if (!gameRoom) {
      set({ error: 'Not connected to game room' });
      return;
    }
    
    gameRoom.send('collectLoot');
  },
  
  // Leave dungeon room
  leaveDungeonRoom: () => {
    const { gameRoom } = get();
    if (gameRoom) {
      gameRoom.leave();
    }
    
    set({ 
      gameRoom: null,
      gameState: {
        players: [],
        mobs: [],
        currentWave: 0,
        waveInProgress: false,
        combatLog: [],
        loot: []
      }
    });
  },
  
  // Update game state (used internally by room listeners)
  updateGameState: (newState) => {
    set({ gameState: { ...get().gameState, ...newState } });
  },
  
  // Clear current dungeon
  clearCurrentDungeon: () => {
    set({ currentDungeon: null });
  }
}));

// Helper function to setup room event listeners
function setupRoomListeners(room) {
  const { updateGameState } = useGameStore.getState();
  
  // Listen for state changes
  room.onStateChange((state) => {
    updateGameState({
      players: Array.from(state.players.values()),
      mobs: state.mobs,
      currentWave: state.currentWave,
      waveInProgress: state.waveInProgress,
      loot: state.loot
    });
  });
  
  // Listen for specific events
  room.onMessage('waveStart', (message) => {
    updateGameState({
      currentWave: message.waveNumber - 1,
      mobs: message.mobs,
      waveInProgress: true
    });
  });
  
  room.onMessage('waveComplete', (message) => {
    updateGameState({
      waveInProgress: false,
      loot: message.loot
    });
  });
  
  room.onMessage('waveFailed', () => {
    updateGameState({
      waveInProgress: false
    });
  });
  
  room.onMessage('dungeonComplete', (message) => {
    updateGameState({
      waveInProgress: false,
      loot: message.loot
    });
  });
  
  room.onMessage('actionResult', (result) => {
    // This would update the game state and add to combat log
    const { gameState } = useGameStore.getState();
    updateGameState({
      combatLog: [...gameState.combatLog, result]
    });
  });
  
  room.onMessage('mobActionResult', (result) => {
    // This would update the game state and add to combat log
    const { gameState } = useGameStore.getState();
    updateGameState({
      combatLog: [...gameState.combatLog, result]
    });
  });
  
  room.onMessage('error', (message) => {
    console.error('Game room error:', message);
  });
}

// Calculate total defense from equipped armor
function calculateArmorDef(inventory) {
  return inventory
    .filter(item => item.type === 'armor' && item.equipped)
    .reduce((total, item) => total + (item.defense || 0), 0);
}

// Extract skills from equipped weapons
function extractSkillsFromEquipment(inventory) {
  return inventory
    .filter(item => item.type === 'weapon' && item.equipped && item.skill)
    .map(item => item.skill);
} 