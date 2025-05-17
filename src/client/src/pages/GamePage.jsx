import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../stores/characterStore';
import { useGameStore } from '../stores/gameStore';
import { useInventoryStore } from '../stores/inventoryStore';
import CombatEffects from '../components/CombatEffects';
import EnvironmentEffect from '../components/EnvironmentEffect';
import '../styles/game.scss';

function GamePage() {
  const { currentCharacter } = useCharacterStore();
  const { items, fetchInventory } = useInventoryStore();
  const {
    gameState,
    gameRoom,
    connectionStatus,
    joinDungeonRoom,
    performAction,
    setReady,
    startWave,
    collectLoot,
    leaveDungeonRoom,
    resetConnection,
    isLoading,
    error
  } = useGameStore();
  
  const [targetedMob, setTargetedMob] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const [combatEffects, setCombatEffects] = useState([]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    // Don't load inventory if the server is likely down
    // Instead, rely on cached data when available
    if (!currentCharacter) return;
    
    // Step 1: First check if we can use existing inventory data
    if (items.length > 0) {
      console.log('GamePage: Using existing inventory data, items count:', items.length);
      return; // Use the inventory data we already have
    }
    
    // Step 2: Try to recover from localStorage before making an API call
    const cachedItems = localStorage.getItem('characterInventory');
    if (cachedItems) {
      try {
        const parsedItems = JSON.parse(cachedItems);
        if (Array.isArray(parsedItems) && parsedItems.length > 0) {
          console.log('GamePage: Using cached inventory from localStorage, items count:', parsedItems.length);
          // Directly update the inventory store with cached data
          useInventoryStore.setState({ 
            items: parsedItems,
            isLoading: false,
            error: 'Using cached inventory data' 
          });
          return;
        }
      } catch (err) {
        console.error('GamePage: Error parsing cached inventory:', err);
      }
    }
    
    // Step 3: Only make API call as a last resort
    console.log('GamePage: No cached inventory available, fetching from API');
    try {
      fetchInventory(currentCharacter.id)
        .catch(err => {
          console.error('GamePage: Failed to load inventory, using empty inventory', err);
          // Game will continue with empty inventory
        });
    } catch (err) {
      console.error('GamePage: Error in inventory fetch', err);
    }
  }, [currentCharacter, items.length]);
  
  useEffect(() => {
    // Join dungeon room on component mount or when reconnection is triggered
    const dungeonId = localStorage.getItem('currentDungeonId');
    if (dungeonId && currentCharacter && (!gameRoom || connectionStatus === 'disconnected')) {
      joinDungeonRoom(dungeonId, currentCharacter);
    }
    
    // Leave dungeon room on component unmount
    return () => {
      if (gameRoom) {
        leaveDungeonRoom();
      }
    };
  }, [currentCharacter, gameRoom, connectionStatus, reconnectAttempt, joinDungeonRoom, leaveDungeonRoom]);
  
  // Update combat log when gameState changes
  useEffect(() => {
    if (gameState.combatLog) {
      setCombatLog(gameState.combatLog);
    }
  }, [gameState]);
  
  // Get equipped weapons which provide skills
  const equippedWeapons = items.filter(item => 
    item.type === 'weapon' && item.equipped
  );
  
  // Get skills from equipped weapons
  const skills = equippedWeapons.flatMap(weapon => weapon.skills || []);
  
  const handleTargetMob = (mob) => {
    setTargetedMob(mob);
  };
  
  const handleSelectSkill = (skill) => {
    setSelectedSkill(skill);
  };
  
  const handleAction = () => {
    if (!targetedMob || !selectedSkill) return;
    
    performAction({
      skillId: selectedSkill.id,
      targetId: targetedMob.id,
      targetType: 'MOB'
    });
  };
  
  const handleSetReady = () => {
    setReady(true);
  };
  
  const handleStartWave = () => {
    startWave();
  };
  
  const handleCollectLoot = () => {
    collectLoot();
  };
  
  const handleLeaveDungeon = () => {
    leaveDungeonRoom();
    navigate('/dungeon');
  };
  
  // New handler for reconnection
  const handleReconnect = () => {
    resetConnection();
    setReconnectAttempt(prev => prev + 1);
  };
  
  // Helper function to calculate health percentage
  const getHealthPercentage = (current, max) => {
    return Math.max(0, Math.min(100, (current / max) * 100));
  };
  
  // Add this new function in the GamePage component
  const processGameEvent = (event) => {
    // Process game events and create visual effects
    if (event.type === 'attack') {
      const position = {
        x: event.target === 'player' ? 30 : 70,
        y: 50 + (Math.random() * 30 - 15)
      };

      setCombatEffects(prev => [...prev, {
        type: 'DAMAGE',
        value: event.damage,
        isCrit: event.isCritical,
        element: event.element,
        position
      }]);
    } 
    else if (event.type === 'heal') {
      const position = {
        x: event.target === 'player' ? 30 : 70,
        y: 50 + (Math.random() * 30 - 15)
      };

      setCombatEffects(prev => [...prev, {
        type: 'HEAL',
        value: event.amount,
        isCrit: event.isCritical,
        position
      }]);
    }
    else if (event.type === 'miss') {
      const position = {
        x: event.target === 'player' ? 30 : 70,
        y: 50 + (Math.random() * 30 - 15)
      };

      setCombatEffects(prev => [...prev, {
        type: 'MISS',
        position
      }]);
    }
    else if (event.type === 'defeat') {
      const position = {
        x: event.target === 'player' ? 30 : 70,
        y: 50
      };

      setCombatEffects(prev => [...prev, {
        type: 'DEFEAT',
        position
      }]);
    }
    else if (event.type === 'buff' || event.type === 'debuff') {
      const position = {
        x: event.target === 'player' ? 30 : 70,
        y: 40
      };

      setCombatEffects(prev => [...prev, {
        type: event.type === 'buff' ? 'BUFF' : 'DEBUFF',
        stat: event.stat,
        position
      }]);
    }
    else if (event.type === 'environment') {
      // Process environment effects on all entities
      const positions = event.targets.map(target => ({
        x: target === 'player' ? 30 : 70,
        y: 50 + (Math.random() * 30 - 15)
      }));

      positions.forEach(position => {
        setCombatEffects(prev => [...prev, {
          type: 'ELEMENTAL',
          element: event.element,
          position
        }]);
      });
    }
  };

  // Update useEffect to process events for visual feedback
  useEffect(() => {
    if (gameState.events && gameState.events.length > 0) {
      // Process the latest event for visual feedback
      const latestEvent = gameState.events[gameState.events.length - 1];
      processGameEvent(latestEvent);
      
      // Add event to combat log
      setCombatLog(prev => [...prev, latestEvent]);
      
      // Limit combat log size
      if (combatLog.length > 50) {
        setCombatLog(prev => prev.slice(prev.length - 50));
      }
    }
  }, [gameState.events]);
  
  if (!currentCharacter) {
    return (
      <div className="game-container">
        <div className="error-message">Please select a character first</div>
      </div>
    );
  }
  
  // Connection status message component
  const renderConnectionStatus = () => {
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      return (
        <div className="connection-error">
          <p>Connection error: {error || 'WebSocket disconnected'}</p>
          <button className="reconnect-button" onClick={handleReconnect}>
            Reconnect
          </button>
        </div>
      );
    }
    return null;
  };
  
  // Get current player from game state
  const currentPlayer = gameState.players.find(p => p.characterId === currentCharacter.id);
  
  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Unison Legends</h1>
        
        <div className="game-actions">
          <button 
            className="secondary-button leave-button" 
            onClick={handleLeaveDungeon}
          >
            Leave Dungeon
          </button>
        </div>
      </div>
      
      {error && !['disconnected', 'error'].includes(connectionStatus) && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {renderConnectionStatus()}
      
      {isLoading ? (
        <div className="loading">Loading game...</div>
      ) : (
        <div className="game-layout">
          <div className="combat-area">
            {gameState.environment && (
              <EnvironmentEffect environment={gameState.environment} />
            )}
            
            {combatEffects.map((effect, index) => (
              <CombatEffects 
                key={`effect-${index}`}
                effect={effect}
                targetPosition={effect.position}
                onComplete={() => {
                  setCombatEffects(prev => prev.filter((_, i) => i !== index));
                }}
              />
            ))}
            
            <div className="wave-info">
              {gameState.waveInProgress ? (
                <h2>Wave {gameState.currentWave + 1}</h2>
              ) : (
                <h2>Prepare for Wave {gameState.currentWave + 1}</h2>
              )}
            </div>
            
            <div className="enemies-container">
              {gameState.mobs.map(mob => (
                <div 
                  key={mob.id} 
                  className={`enemy-card ${targetedMob?.id === mob.id ? 'targeted' : ''}`}
                  onClick={() => handleTargetMob(mob)}
                >
                  <div className="enemy-info">
                    <h3>{mob.name}</h3>
                    <div className="enemy-level">Lv. {mob.level}</div>
                    {mob.isBoss && <div className="boss-tag">BOSS</div>}
                  </div>
                  
                  <div className="health-bar-container">
                    <div 
                      className="health-bar" 
                      style={{ width: `${getHealthPercentage(mob.stats.hp, mob.stats.maxHp)}%` }}
                    ></div>
                    <div className="health-text">
                      {mob.stats.hp} / {mob.stats.maxHp}
                    </div>
                  </div>
                  
                  {mob.effects && mob.effects.length > 0 && (
                    <div className="enemy-effects">
                      {mob.effects.map((effect, index) => (
                        <div key={index} className={`effect ${effect.type.toLowerCase()}`}>
                          {effect.type}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {gameState.mobs.length === 0 && !gameState.waveInProgress && gameState.loot.length > 0 && (
                <div className="loot-container">
                  <h3>Loot Available!</h3>
                  <button 
                    className="primary-button collect-button"
                    onClick={handleCollectLoot}
                  >
                    Collect Loot
                  </button>
                </div>
              )}
            </div>
            
            {currentPlayer && (
              <div className="player-status">
                <div className="player-info">
                  <h3>{currentCharacter.name}</h3>
                  <div className="player-level">Lv. {currentCharacter.level}</div>
                </div>
                
                <div className="resource-bars">
                  <div className="resource-bar health">
                    <div 
                      className="bar" 
                      style={{ width: `${getHealthPercentage(currentPlayer.stats.hp, currentPlayer.stats.maxHp)}%` }}
                    ></div>
                    <div className="text">
                      HP: {currentPlayer.stats.hp} / {currentPlayer.stats.maxHp}
                    </div>
                  </div>
                  
                  <div className="resource-bar mana">
                    <div 
                      className="bar" 
                      style={{ width: `${getHealthPercentage(currentPlayer.stats.mp, currentPlayer.stats.maxMp)}%` }}
                    ></div>
                    <div className="text">
                      MP: {currentPlayer.stats.mp} / {currentPlayer.stats.maxMp}
                    </div>
                  </div>
                </div>
                
                <div className="skill-bar">
                  {skills.map(skill => (
                    <div 
                      key={skill.id} 
                      className={`skill ${selectedSkill?.id === skill.id ? 'selected' : ''} ${currentPlayer.cooldowns?.[skill.id] ? 'cooldown' : ''}`}
                      onClick={() => handleSelectSkill(skill)}
                    >
                      <div className="skill-icon">{skill.name.charAt(0)}</div>
                      <div className="skill-name">{skill.name}</div>
                      {currentPlayer.cooldowns?.[skill.id] && (
                        <div className="cooldown-overlay">
                          {currentPlayer.cooldowns[skill.id]}s
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <button 
                    className="action-button"
                    disabled={!targetedMob || !selectedSkill || gameState.waveInProgress === false}
                    onClick={handleAction}
                  >
                    Attack
                  </button>
                </div>
              </div>
            )}
            
            {!gameState.waveInProgress && (
              <div className="wave-controls">
                {currentPlayer?.isLeader ? (
                  <button 
                    className="primary-button start-button"
                    onClick={handleStartWave}
                  >
                    Start Wave
                  </button>
                ) : (
                  <button 
                    className="primary-button ready-button"
                    onClick={handleSetReady}
                    disabled={currentPlayer?.ready}
                  >
                    {currentPlayer?.ready ? 'Ready!' : 'Ready Up'}
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="combat-log">
            <h3>Combat Log</h3>
            <div className="log-entries">
              {combatLog.map((entry, index) => (
                <div key={index} className="log-entry">
                  <span className="actor">{entry.actorName || entry.skillName}</span>
                  {entry.effects.map((effect, i) => (
                    <span key={i} className={`effect ${effect.type.toLowerCase()}`}>
                      {effect.type === 'DAMAGE' && 
                        `dealt ${effect.value} ${effect.isCrit ? 'CRITICAL ' : ''}damage`}
                      {effect.type === 'HEAL' && 
                        `healed for ${effect.value}`}
                      {(effect.type === 'BUFF' || effect.type === 'DEBUFF') && 
                        `applied ${effect.type.toLowerCase()}`}
                      {effect.type === 'DEFEAT' && 
                        `defeated enemy!`}
                    </span>
                  ))}
                </div>
              ))}
              
              {combatLog.length === 0 && (
                <div className="empty-log">Combat will be logged here...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GamePage; 