import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCharacterStore } from '../stores/characterStore';
import { useGameStore } from '../stores/gameStore';
import axios from 'axios';
import '../styles/lobby.scss';

function LobbyPage() {
  const { dungeonId } = useParams();
  const { currentCharacter } = useCharacterStore();
  const { 
    currentDungeon, 
    getDungeon, 
    joinDungeonRoom,
    leaveDungeonRoom,
    isLoading, 
    error 
  } = useGameStore();
  
  const [players, setPlayers] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isHost, setIsHost] = useState(true);
  const [allReady, setAllReady] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState(null);
  const navigate = useNavigate();
  
  // Load inventory data
  useEffect(() => {
    if (currentCharacter && currentCharacter.id) {
      const fetchInventory = async () => {
        setInventoryLoading(true);
        setInventoryError(null);
        
        // First check if we have inventory in localStorage
        try {
          const cachedInventory = localStorage.getItem('characterInventory');
          if (cachedInventory) {
            const parsedInventory = JSON.parse(cachedInventory);
            if (Array.isArray(parsedInventory) && parsedInventory.length > 0) {
              console.log('LobbyPage: Using cached inventory with', parsedInventory.length, 'items');
              setInventory(parsedInventory);
              setInventoryLoading(false);
              return; // Skip API call if we have cached data
            }
          }
        } catch (e) {
          console.error('Failed to parse cached inventory:', e);
          // Continue with API call if cache fails
        }
        
        // If no cache or cache failed, try API call
        try {
          console.log(`Fetching inventory for character: ${currentCharacter.id}`);
          
          // Add authentication header and timeout
          const token = localStorage.getItem('token');
          const response = await axios.get(`/api/inventory/${currentCharacter.id}`, {
            headers: { 
              Authorization: token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
          });
          
          console.log('Inventory loaded successfully:', response.data);
          const items = Array.isArray(response.data.items) ? response.data.items : [];
          setInventory(items);
          
          // Save to localStorage
          try {
            localStorage.setItem('characterInventory', JSON.stringify(items));
            console.log('Saved inventory to localStorage:', items.length, 'items');
          } catch (storageErr) {
            console.warn('Could not save inventory to localStorage', storageErr);
          }
        } catch (err) {
          console.error('Failed to load inventory:', err);
          
          // More detailed error handling
          let errorMessage = 'Failed to load character inventory';
          
          if (err.response) {
            // The request was made and the server responded with a status code outside of 2xx
            if (err.response.status === 401 || err.response.status === 403) {
              errorMessage = 'Authentication error - please log in again';
              // Redirect to login here if needed
            } else if (err.response.status === 404) {
              errorMessage = 'Character inventory not found';
            } else {
              errorMessage = `Server error (${err.response.status}): ${err.response.data?.message || 'Unknown error'}`;
            }
          } else if (err.request) {
            // The request was made but no response was received
            errorMessage = 'No response from server - please try again';
            
            // Try to initialize an empty inventory array to avoid crashes
            console.log('Setting fallback empty inventory');
            setInventory([]);
          }
          
          setInventoryError(errorMessage);
        } finally {
          setInventoryLoading(false);
        }
      };
      
      fetchInventory();
    }
  }, [currentCharacter]);
  
  // Debug logs to track state
  useEffect(() => {
    console.log("Player ready state:", isReady);
    console.log("All players ready state:", allReady);
    console.log("Players array:", players);
  }, [isReady, allReady, players]);
  
  useEffect(() => {
    // Load dungeon data if not already loaded
    if (dungeonId && (!currentDungeon || currentDungeon.progressId !== dungeonId)) {
      console.log(`Loading dungeon with ID: ${dungeonId}`);
      getDungeon(dungeonId);
    }
    
    // Generate a unique invite code for this lobby
    if (isHost) {
      setInviteCode(`${dungeonId.substring(0, 8)}-${Date.now().toString(36)}`);
    }
    
    // Add current player to the players list (only if not already there)
    if (currentCharacter && players.length === 0) {
      const initialPlayer = {
        id: currentCharacter.id,
        name: currentCharacter.name,
        level: currentCharacter.level,
        isReady: false,
        isHost: isHost
      };
      setPlayers([initialPlayer]);
    }
    
    // Clean up when leaving
    return () => {
      // If we're connecting to a game room, don't leave it
      if (!allReady) {
        leaveDungeonRoom();
      }
    };
  }, [dungeonId, currentDungeon, getDungeon, currentCharacter, isHost, allReady, leaveDungeonRoom, players.length]);
  
  // Check if all players are ready - updated to be more reliable
  useEffect(() => {
    // This useEffect only runs when the players array changes
    if (players.length > 0) {
      const everyPlayerReady = players.every(player => player.isReady);
      console.log(`Checking if all players ready: ${everyPlayerReady}`);
      setAllReady(everyPlayerReady);
    } else {
      setAllReady(false);
    }
  }, [players]);
  
  const handleReady = () => {
    // Toggle ready state
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    
    // Update player's ready status in the players array
    const updatedPlayers = players.map(player => 
      player.id === currentCharacter.id 
        ? { ...player, isReady: newReadyState } 
        : player
    );
    
    setPlayers(updatedPlayers);
    
    // For single player mode, directly update allReady state
    if (players.length === 1) {
      setAllReady(newReadyState);
    }
  };
  
  const handleInvitePlayer = () => {
    // In a real app, this would send an invite or copy to clipboard
    navigator.clipboard.writeText(inviteCode)
      .then(() => alert('Invite code copied to clipboard'))
      .catch(err => console.error('Failed to copy invite code:', err));
  };
  
  const handleStartDungeon = async () => {
    if (!currentCharacter || !currentDungeon) {
      console.error("Missing character or dungeon");
      return;
    }
    
    if (inventoryLoading) {
      console.error("Inventory still loading, please wait");
      return;
    }
    
    // If there's an inventory error, try to use cached inventory from localStorage
    if (inventoryError) {
      console.log("Inventory error detected, trying to use cached inventory");
      try {
        const cachedInventory = localStorage.getItem('characterInventory');
        if (cachedInventory) {
          const parsedInventory = JSON.parse(cachedInventory);
          if (Array.isArray(parsedInventory) && parsedInventory.length > 0) {
            console.log('Using cached inventory with', parsedInventory.length, 'items');
            setInventory(parsedInventory);
            setInventoryError(null); // Clear error since we have a fallback
          }
        }
      } catch (e) {
        console.error('Failed to parse cached inventory:', e);
      }
    }
    
    // Force start for single player if they're ready
    const canStart = players.length === 1 ? isReady : allReady;
    
    if (!canStart) {
      console.error('All players must be ready to start the dungeon');
      return;
    }
    
    // Ensure we have inventory data - use empty array as last resort
    const inventoryToUse = inventory || [];
    
    // Save inventory to localStorage before starting
    try {
      localStorage.setItem('characterInventory', JSON.stringify(inventoryToUse));
      console.log('Saved inventory to localStorage:', inventoryToUse.length, 'items');
    } catch (e) {
      console.warn('Could not save inventory to localStorage', e);
    }
    
    // Get character with inventory
    const characterWithInventory = {
      ...currentCharacter,
      inventory: inventoryToUse
    };
    
    console.log("Starting dungeon with character:", characterWithInventory);
    console.log("Dungeon details:", currentDungeon);
    
    // Save dungeon ID for potential reconnection
    localStorage.setItem('currentDungeonId', currentDungeon.progressId || dungeonId);
    
    // Join the dungeon room - use the dungeon's progressId (database ID)
    try {
      const dungeonProgressId = currentDungeon.progressId || dungeonId;
      console.log(`Starting dungeon with ID: ${dungeonProgressId}`);
      await joinDungeonRoom(dungeonProgressId, characterWithInventory);
      navigate(`/game/${dungeonProgressId}`);
    } catch (error) {
      console.error('Error joining dungeon:', error);
    }
  };
  
  // Mock function to add a fake player (for testing)
  const addTestPlayer = () => {
    if (players.length >= 3) return;
    
    const testPlayer = {
      id: `test-${players.length + 1}`,
      name: `TestPlayer${players.length + 1}`,
      level: Math.floor(Math.random() * 50) + 1,
      isReady: false,
      isHost: false
    };
    
    setPlayers([...players, testPlayer]);
  };
  
  // Mock function to toggle ready status of test players
  const toggleTestPlayerReady = (playerId) => {
    setPlayers(players.map(player => 
      player.id === playerId 
        ? { ...player, isReady: !player.isReady } 
        : player
    ));
  };
  
  if (!currentCharacter) {
    return (
      <div className="lobby-container">
        <div className="error-message">Please select a character first</div>
      </div>
    );
  }
  
  return (
    <div className="lobby-container">
      <h1>Dungeon Lobby</h1>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="dungeon-info">
        <h2>{currentDungeon?.name || 'Loading dungeon...'}</h2>
        {currentDungeon && (
          <div className="dungeon-details">
            <div className="detail-item">
              <span className="label">Type:</span>
              <span className="value">{currentDungeon.type}</span>
            </div>
            <div className="detail-item">
              <span className="label">Level:</span>
              <span className="value">{currentDungeon.level}</span>
            </div>
            <div className="detail-item">
              <span className="label">Waves:</span>
              <span className="value">{currentDungeon.waves.length}</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="lobby-main">
        <div className="players-list">
          <h3>Players ({players.length}/3)</h3>
          
          {players.map(player => (
            <div key={player.id} className="player-card">
              <div className="player-info">
                <span className="player-name">{player.name}</span>
                <span className="player-level">Lv. {player.level}</span>
                {player.isHost && <span className="host-badge">Host</span>}
              </div>
              <div className="player-status">
                {player.id === currentCharacter.id ? (
                  <button 
                    className={`ready-btn ${isReady ? 'ready' : ''}`}
                    onClick={handleReady}
                  >
                    {isReady ? 'Ready' : 'Not Ready'}
                  </button>
                ) : (
                  <div 
                    className={`ready-indicator ${player.isReady ? 'ready' : ''}`}
                    onClick={() => toggleTestPlayerReady(player.id)}
                  >
                    {player.isReady ? 'Ready' : 'Not Ready'}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {players.length < 3 && (
            <div className="invite-section">
              <div className="invite-code">
                Invite Code: <span>{inviteCode}</span>
              </div>
              <button 
                className="invite-btn"
                onClick={handleInvitePlayer}
              >
                Copy Invite Link
              </button>
              
              {/* Testing button - would be removed in production */}
              <button 
                className="test-btn"
                onClick={addTestPlayer}
              >
                Add Test Player
              </button>
            </div>
          )}
        </div>
        
        <div className="lobby-actions">
          <button 
            className="back-btn"
            onClick={() => navigate('/dungeons')}
          >
            Back to Dungeon Selection
          </button>
          
          <button 
            className="start-btn"
            disabled={
              !(players.length === 1 ? isReady : allReady) || 
              isLoading || 
              !currentDungeon || 
              inventoryLoading || 
              (inventoryError && !inventory) // Only disable if there's an error AND no inventory
            }
            onClick={handleStartDungeon}
          >
            {isLoading ? 'Loading...' : 
             inventoryLoading ? 'Loading inventory...' : 
             inventoryError && inventory ? 'Start with Cached Inventory' : 
             inventoryError ? 'Inventory Error' : 
             'Start Dungeon'}
          </button>
          
          {inventoryError && (
            <div className="error-message">
              {inventoryError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LobbyPage; 