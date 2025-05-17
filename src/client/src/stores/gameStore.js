import { create } from 'zustand';
import axios from 'axios';
import * as Colyseus from 'colyseus.js';

// Create Colyseus client with hostname-aware WebSocket URL
const getWebSocketUrl = () => {
  // Get the current hostname and protocol, use same hostname with ws/wss protocol 
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
};

// Create client with reconnection options
const colyseusClient = new Colyseus.Client(getWebSocketUrl());

export const useGameStore = create((set, get) => ({
  // Connection state
  connectionStatus: 'disconnected', // 'disconnected', 'connecting', 'connected', 'error' 

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
    set({ isLoading: true, error: null, connectionStatus: 'connecting' });
    
    if (!character) {
      set({ 
        error: 'No character selected', 
        isLoading: false,
        connectionStatus: 'error' 
      });
      return null;
    }
    
    // Save current dungeon ID to localStorage for reconnection
    localStorage.setItem('currentDungeonId', dungeonId);
    
    // Calculate the player's stats
    const calculatedStats = {
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      str: character.strength || 10,
      dex: character.dexterity || 10,
      int: character.intelligence || 10,
      vit: character.vitality || 10
    };
    
    // Get skills from equipped weapons
    const skills = (character.inventory || [])
      .filter(item => item.type === 'weapon' && item.equipped)
      .flatMap(weapon => weapon.skills || []);
    
    // Set up retry logic
    const maxRetries = 3;
    let retries = 0;
    let room = null;
    
    // Create room options
    const roomOptions = {
      roomId: dungeonId,
      seed: `dungeon_${Date.now()}`,
      dungeonType: 'normal',
      difficulty: 1
    };
    
    // Get dungeonProgressId from dungeonId or use dungeonId directly
    const dungeonProgressId = dungeonId;
    
    console.log('Using provided inventory with', character.inventory?.length || 0, 'items');
    
    // Try to join room with retry logic
    while (retries < maxRetries) {
      try {
        console.log(`Starting dungeon with ID: ${dungeonProgressId}`);
        
        // First try to join an existing room
        try {
          console.log(`Attempt ${retries + 1}: Trying to join existing dungeon room with ID: ${dungeonProgressId}`);
          room = await colyseusClient.joinById('dungeon', dungeonProgressId, {
            characterId: character.id,
            name: character.name || 'Player',
            stats: calculatedStats,
            skills,
            equipment: character.inventory?.filter(item => item.equipped) || []
          });
          console.log('Successfully joined existing room:', room.id);
        } catch (joinError) {
          console.log(`No existing room found, creating new room: ${joinError.message}`);
          
          // If joining fails, create a new room
          console.log(`Attempt ${retries + 1}: Creating new dungeon room with options:`, roomOptions);
          try {
            room = await colyseusClient.create('dungeon', {
              ...roomOptions,
              characterId: character.id,
              name: character.name || 'Player',
              stats: calculatedStats,
              skills,
              equipment: character.inventory?.filter(item => item.equipped) || []
            });
            console.log('Successfully created new room:', room.id);
          } catch (createError) {
            console.error('Failed to create room:', createError);
            throw new Error(`Failed to create room: ${createError.message}`);
          }
        }
        
        console.log(`Successfully connected to dungeon room: ${room.id}`);
        
        // Setup room event listeners
        setupRoomListeners(room);
        
        set({ 
          gameRoom: room, 
          isLoading: false,
          connectionStatus: 'connected' 
        });
        return room;
      } catch (error) {
        console.error(`Attempt ${retries + 1} failed:`, error);
        retries++;
        
        if (retries >= maxRetries) {
          console.error(`All ${maxRetries} attempts to join dungeon room failed`);
          set({ 
            error: error.message || 'Failed to join dungeon room after multiple attempts', 
            isLoading: false,
            connectionStatus: 'error'
          });
          return null;
        }
        
        // Wait before retrying
        console.log(`Retrying in 1 second... (attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
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
  },

  // Helper to update connection status
  setConnectionStatus: (status) => {
    set({ connectionStatus: status });
  },

  // Reset connection on error
  resetConnection: async () => {
    const { gameRoom } = get();
    
    // If we have an existing room, try to leave gracefully
    if (gameRoom) {
      try {
        gameRoom.leave();
      } catch (err) {
        console.error('Error leaving game room:', err);
      }
    }
    
    set({ 
      gameRoom: null,
      connectionStatus: 'disconnected',
      error: 'Connection lost. Please try again.'
    });
  }
}));

// Helper function to setup room event listeners
function setupRoomListeners(room) {
  const { updateGameState, setConnectionStatus, resetConnection } = useGameStore.getState();
  
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
  
  // Setup error handling and reconnection
  room.onError((error) => {
    console.error('Game room error:', error);
    setConnectionStatus('error');
  });
  
  room.onLeave((code) => {
    console.log(`Room left with code: ${code}`);
    if (code >= 1000) {
      // Codes >= 1000 are WebSocket close event codes
      // Handle unexpected disconnection
      resetConnection();
    }
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