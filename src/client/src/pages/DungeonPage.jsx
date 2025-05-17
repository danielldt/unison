import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../stores/characterStore';
import { useGameStore } from '../stores/gameStore';
import '../styles/dungeon.scss';

function DungeonPage() {
  const { currentCharacter } = useCharacterStore();
  const {
    availableDungeons,
    fetchAvailableDungeons,
    generateDungeon,
    currentDungeon,
    clearCurrentDungeon,
    isLoading,
    error
  } = useGameStore();
  
  const [selectedType, setSelectedType] = useState('normal');
  const [selectedDungeon, setSelectedDungeon] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (currentCharacter) {
      fetchAvailableDungeons(currentCharacter.id);
    }
  }, [currentCharacter, fetchAvailableDungeons]);
  
  // Filter dungeons by type
  const filteredDungeons = availableDungeons.filter(dungeon => dungeon.type === selectedType);
  
  const handleTypeChange = (type) => {
    setSelectedType(type);
    setSelectedDungeon(null);
  };
  
  const handleSelectDungeon = (dungeon) => {
    setSelectedDungeon(dungeon);
  };
  
  const handleGenerateDungeon = async () => {
    if (!currentCharacter) return;
    
    await generateDungeon(currentCharacter.id, selectedType);
  };
  
  const handleEnterDungeon = async () => {
    if (!selectedDungeon || !currentCharacter) return;
    
    // Save dungeon ID in local storage for the game page
    localStorage.setItem('currentDungeonId', selectedDungeon.id);
    
    // Redirect to game page
    navigate('/game');
  };
  
  // Helper function to get rarity color class
  const getRarityColorClass = (rarity) => {
    switch (rarity) {
      case 'normal': return 'rarity-normal';
      case 'elite': return 'rarity-elite';
      case 'raid': return 'rarity-raid';
      default: return '';
    }
  };
  
  // Helper function to format dungeon type
  const formatDungeonType = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };
  
  if (!currentCharacter) {
    return (
      <div className="dungeon-container">
        <div className="error-message">Please select a character first</div>
      </div>
    );
  }
  
  return (
    <div className="dungeon-container">
      <h1>Dungeons</h1>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="dungeon-type-selector">
        <button 
          className={`dungeon-type-btn ${selectedType === 'normal' ? 'active' : ''}`}
          onClick={() => handleTypeChange('normal')}
        >
          Normal
        </button>
        {currentCharacter.level >= 50 && (
          <button 
            className={`dungeon-type-btn ${selectedType === 'elite' ? 'active' : ''}`}
            onClick={() => handleTypeChange('elite')}
          >
            Elite
          </button>
        )}
        {currentCharacter.level >= 70 && (
          <button 
            className={`dungeon-type-btn ${selectedType === 'raid' ? 'active' : ''}`}
            onClick={() => handleTypeChange('raid')}
          >
            Raid
          </button>
        )}
      </div>
      
      <div className="dungeon-list-container">
        <h2>{formatDungeonType(selectedType)} Dungeons</h2>
        
        {isLoading ? (
          <div className="loading">Loading dungeons...</div>
        ) : (
          <>
            {filteredDungeons.length === 0 ? (
              <div className="no-dungeons">
                <p>No {selectedType} dungeons available.</p>
                <button 
                  className="primary-button" 
                  onClick={handleGenerateDungeon}
                  disabled={isLoading}
                >
                  Generate New Dungeon
                </button>
              </div>
            ) : (
              <div className="dungeon-list">
                {filteredDungeons.map(dungeon => (
                  <div 
                    key={dungeon.id} 
                    className={`dungeon-card ${selectedDungeon?.id === dungeon.id ? 'selected' : ''}`}
                    onClick={() => handleSelectDungeon(dungeon)}
                  >
                    <div className="dungeon-card-header">
                      <h3>{dungeon.name}</h3>
                      <span className={`dungeon-level ${getRarityColorClass(dungeon.type)}`}>
                        Lv. {dungeon.level}
                      </span>
                    </div>
                    
                    <div className="dungeon-card-body">
                      <div className="dungeon-waves">
                        <span className="label">Waves:</span>
                        <span className="value">{dungeon.waves.length}</span>
                      </div>
                      
                      <div className="dungeon-recommended">
                        <span className="label">Recommended Level:</span>
                        <span className="value">{dungeon.recommendedLevel}+</span>
                      </div>
                      
                      {dungeon.type === 'elite' && (
                        <div className="dungeon-reward">
                          <span className="label">Enhanced Rewards</span>
                        </div>
                      )}
                      
                      {dungeon.type === 'raid' && (
                        <div className="dungeon-reward">
                          <span className="label">Legendary Loot Chance</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="dungeon-card generate-card" onClick={handleGenerateDungeon}>
                  <div className="plus-icon">+</div>
                  <p>Generate New Dungeon</p>
                </div>
              </div>
            )}
            
            {selectedDungeon && (
              <div className="dungeon-actions">
                <button 
                  className="primary-button" 
                  onClick={handleEnterDungeon}
                  disabled={isLoading}
                >
                  Enter Dungeon
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {currentDungeon && (
        <div className="dungeon-details">
          <h2>Dungeon Details</h2>
          <div className="dungeon-details-card">
            <h3>{currentDungeon.name}</h3>
            <div className="dungeon-details-info">
              <div className="info-item">
                <span className="label">Type:</span>
                <span className="value">{formatDungeonType(currentDungeon.type)}</span>
              </div>
              <div className="info-item">
                <span className="label">Level:</span>
                <span className="value">{currentDungeon.level}</span>
              </div>
              <div className="info-item">
                <span className="label">Waves:</span>
                <span className="value">{currentDungeon.waves.length}</span>
              </div>
              <div className="info-item">
                <span className="label">Boss:</span>
                <span className="value">
                  {currentDungeon.waves[currentDungeon.waves.length - 1].isBossWave ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            
            <button 
              className="text-button" 
              onClick={() => clearCurrentDungeon()}
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DungeonPage; 