import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../stores/characterStore';
import '../styles/character-select.scss';

function CharacterSelectPage() {
  const { 
    characters, 
    fetchCharacters, 
    isLoading, 
    error, 
    setCurrentCharacter 
  } = useCharacterStore();
  
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);
  
  const handleSelectCharacter = (character) => {
    setCurrentCharacter(character);
    navigate('/dashboard');
  };
  
  return (
    <div className="character-select-page">
      <div className="page-header">
        <h1>Select Your Character</h1>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="characters-container">
        <div className="character-list">
          {isLoading ? (
            <div className="loading">Loading characters...</div>
          ) : (
            <>
              {characters.length === 0 ? (
                <div className="no-characters">
                  <div className="icon">👤</div>
                  <div className="message">You don't have any characters yet.</div>
                  <Link to="/create-character" className="create-button primary-button">
                    Create a Character
                  </Link>
                </div>
              ) : (
                <div className="characters">
                  {characters.map(character => (
                    <div 
                      key={character.id} 
                      className="character-card"
                      onClick={() => handleSelectCharacter(character)}
                    >
                      <div className="character-header">
                        <div className="character-avatar">
                          {character.name.charAt(0)}
                        </div>
                        
                        <div className="character-info">
                          <div className="character-name">{character.name}</div>
                          <div className="character-level">Level {character.level}</div>
                        </div>
                      </div>
                      
                      <div className="character-stats">
                        {character.stats && (
                          <>
                            <div className="stat">
                              <span className="stat-name">STR:</span>
                              <span className="stat-value">{character.stats.str}</span>
                            </div>
                            <div className="stat">
                              <span className="stat-name">INT:</span>
                              <span className="stat-value">{character.stats.int}</span>
                            </div>
                            <div className="stat">
                              <span className="stat-name">AGI:</span>
                              <span className="stat-value">{character.stats.agi}</span>
                            </div>
                            <div className="stat">
                              <span className="stat-name">DEX:</span>
                              <span className="stat-value">{character.stats.dex}</span>
                            </div>
                            <div className="stat">
                              <span className="stat-name">LUK:</span>
                              <span className="stat-value">{character.stats.luk}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="character-actions">
          <h2>Actions</h2>
          <div className="action-buttons">
            <Link to="/create-character" className="create-button">
              <span className="icon">+</span> Create New Character
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CharacterSelectPage; 