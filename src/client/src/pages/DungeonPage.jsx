import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../stores/characterStore';
import { useGameStore } from '../stores/gameStore';
import '../styles/dungeon.scss';

// Keyword sets from dungeonGenerator.js
const KEYWORD_SETS = {
  OBJECTS: [
    'Crystal', 'Throne', 'Crown', 'Sword', 'Shield', 'Chalice', 'Tome', 'Altar',
    'Statue', 'Relic', 'Orb', 'Pendant', 'Staff', 'Skull', 'Axe', 'Hammer',
    'Dagger', 'Bow', 'Arrow', 'Quiver', 'Wand', 'Scroll', 'Potion', 'Elixir'
  ],
  PLACES: [
    'Cave', 'Dungeon', 'Temple', 'Castle', 'Tower', 'Fortress', 'Citadel', 'Keep',
    'Crypt', 'Tomb', 'Catacomb', 'Ruin', 'Palace', 'Sanctuary', 'Shrine', 'Vault'
  ],
  ADJECTIVES: [
    'Ancient', 'Forgotten', 'Lost', 'Hidden', 'Secret', 'Cursed', 'Haunted', 'Grim',
    'Dark', 'Shadowy', 'Misty', 'Foggy', 'Frozen', 'Burning', 'Molten', 'Spectral'
  ]
};

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
  const [selectedKeywords, setSelectedKeywords] = useState({
    object: '',
    place: '',
    adjective: ''
  });
  const [generationError, setGenerationError] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    if (currentCharacter) {
      fetchAvailableDungeons(currentCharacter.id);
    }
  }, [currentCharacter, fetchAvailableDungeons]);
  
  // When dungeon type changes, reset the selected keywords
  useEffect(() => {
    setSelectedKeywords({
      object: '',
      place: '',
      adjective: ''
    });
  }, [selectedType]);
  
  // Filter dungeons by type and remove any with undefined names
  const filteredDungeons = availableDungeons
    .filter(dungeon => dungeon.type === selectedType)
    .filter(dungeon => dungeon.name && !dungeon.name.includes('undefined'));
  
  const handleTypeChange = (type) => {
    setSelectedType(type);
    setSelectedDungeon(null);
  };
  
  const handleSelectDungeon = (dungeon) => {
    setSelectedDungeon(dungeon);
  };
  
  const handleKeywordChange = (category, value) => {
    setSelectedKeywords(prev => ({
      ...prev,
      [category]: value
    }));
    setGenerationError('');
  };
  
  const areAllKeywordsSelected = () => {
    return selectedKeywords.object && selectedKeywords.place && selectedKeywords.adjective;
  };
  
  const handleGenerateDungeon = async () => {
    if (!currentCharacter || !areAllKeywordsSelected()) return;
    
    setGenerationError('');
    
    try {
      // Format as "adjective place of the object" to match the generator's expected format
      // But send the parts as individual values for the backend to handle properly
      const dungeonData = await generateDungeon(
        currentCharacter.id, 
        selectedType, 
        {
          object: selectedKeywords.object,
          place: selectedKeywords.place,
          adjective: selectedKeywords.adjective
        }
      );
      
      if (dungeonData) {
        setSelectedDungeon(dungeonData);
      }
    } catch (err) {
      setGenerationError('Failed to generate dungeon. Please try again with different keywords.');
      console.error('Dungeon generation error:', err);
    }
  };
  
  const handleCreateLobby = async () => {
    if (!selectedDungeon || !currentCharacter) return;
    
    // Navigate to lobby page with the selected dungeon ID
    // Use progressId (database ID) instead of the dungeon.id (seed-based ID)
    if (!selectedDungeon.progressId) {
      console.error('Selected dungeon has no progressId', selectedDungeon);
      setGenerationError('Unable to create lobby: missing dungeon database ID');
      return;
    }
    
    navigate(`/lobby/${selectedDungeon.progressId}`);
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
  
  // Helper function to safely get dungeon name
  const getDungeonName = (dungeon) => {
    return dungeon?.name || 'Unnamed Dungeon';
  };
  
  // Helper to safely get wave count
  const getWaveCount = (dungeon) => {
    return dungeon?.waves?.length || 0;
  };
  
  // Helper to safely get recommended level
  const getRecommendedLevel = (dungeon) => {
    return dungeon?.recommendedLevel || dungeon?.level || '?';
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
      
      {generationError && (
        <div className="error-message">
          {generationError}
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
      
      <div className="dungeon-generator">
        <h2>Generate Dungeon</h2>
        <div className="generator-control-group">
          <div className="keyword-selector">
            <label htmlFor="adjective-select">Select Adjective:</label>
            <select
              id="adjective-select"
              value={selectedKeywords.adjective}
              onChange={(e) => handleKeywordChange('adjective', e.target.value)}
              className="keyword-dropdown"
            >
              <option value="">-- Select Adjective --</option>
              {KEYWORD_SETS.ADJECTIVES.map(keyword => (
                <option key={keyword} value={keyword}>{keyword}</option>
              ))}
            </select>
          </div>
          
          <div className="keyword-selector">
            <label htmlFor="place-select">Select Place:</label>
            <select
              id="place-select"
              value={selectedKeywords.place}
              onChange={(e) => handleKeywordChange('place', e.target.value)}
              className="keyword-dropdown"
            >
              <option value="">-- Select Place --</option>
              {KEYWORD_SETS.PLACES.map(keyword => (
                <option key={keyword} value={keyword}>{keyword}</option>
              ))}
            </select>
          </div>
          
          <div className="keyword-selector">
            <label htmlFor="object-select">Select Object:</label>
            <select
              id="object-select"
              value={selectedKeywords.object}
              onChange={(e) => handleKeywordChange('object', e.target.value)}
              className="keyword-dropdown"
            >
              <option value="">-- Select Object --</option>
              {KEYWORD_SETS.OBJECTS.map(keyword => (
                <option key={keyword} value={keyword}>{keyword}</option>
              ))}
            </select>
          </div>
          
          <div className="preview-name">
            {areAllKeywordsSelected() && (
              <div className="dungeon-name-preview">
                <span className="label">Preview:</span>
                <span className="value">{`${selectedKeywords.adjective} ${selectedKeywords.place} of the ${selectedKeywords.object}`}</span>
              </div>
            )}
          </div>
          
          <button 
            className="generate-btn" 
            onClick={handleGenerateDungeon}
            disabled={isLoading || !areAllKeywordsSelected()}
          >
            {isLoading ? 'Generating...' : 'Generate Dungeon'}
          </button>
        </div>
      </div>
      
      <div className="dungeon-list-container">
        <h2>{formatDungeonType(selectedType)} Dungeons</h2>
        
        {isLoading ? (
          <div className="loading">Loading dungeons...</div>
        ) : (
          <>
            {filteredDungeons.length === 0 ? (
              <div className="no-dungeons">
                <p>No {selectedType} dungeons available. Generate one using the controls above.</p>
              </div>
            ) : (
              <div className="dungeon-list">
                {filteredDungeons.map(dungeon => (
                  <div 
                    key={dungeon.id || Math.random().toString()} 
                    className={`dungeon-card ${selectedDungeon?.id === dungeon.id ? 'selected' : ''}`}
                    onClick={() => handleSelectDungeon(dungeon)}
                  >
                    <div className="dungeon-card-header">
                      <h3>{getDungeonName(dungeon)}</h3>
                      <span className={`dungeon-level ${getRarityColorClass(dungeon.type)}`}>
                        Lv. {dungeon.level || '?'}
                      </span>
                    </div>
                    
                    <div className="dungeon-card-body">
                      <div className="dungeon-waves">
                        <span className="label">Waves:</span>
                        <span className="value">{getWaveCount(dungeon)}</span>
                      </div>
                      
                      <div className="dungeon-recommended">
                        <span className="label">Recommended Level:</span>
                        <span className="value">{getRecommendedLevel(dungeon)}+</span>
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
              </div>
            )}
            
            {selectedDungeon && (
              <div className="dungeon-actions">
                <button 
                  className="primary-button" 
                  onClick={handleCreateLobby}
                  disabled={isLoading}
                >
                  Create Lobby
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {currentDungeon && selectedDungeon && (
        <div className="dungeon-details">
          <h2>Dungeon Details</h2>
          <div className="dungeon-details-card">
            <h3>{getDungeonName(selectedDungeon)}</h3>
            <div className="dungeon-details-info">
              <div className="info-item">
                <span className="label">Type:</span>
                <span className="value">{formatDungeonType(selectedDungeon.type)}</span>
              </div>
              <div className="info-item">
                <span className="label">Level:</span>
                <span className="value">{selectedDungeon.level || '?'}</span>
              </div>
              <div className="info-item">
                <span className="label">Waves:</span>
                <span className="value">{getWaveCount(selectedDungeon)}</span>
              </div>
              <div className="info-item">
                <span className="label">Boss:</span>
                <span className="value">
                  {selectedDungeon.waves && selectedDungeon.waves.length > 0 && 
                   selectedDungeon.waves[selectedDungeon.waves.length - 1].isBossWave ? 'Yes' : 'No'}
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