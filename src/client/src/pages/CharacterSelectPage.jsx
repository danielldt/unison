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
    navigate('/game');
  };
  
  return (
    <div className="character-select-container">
      <h1>Select Your Character</h1>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="loading">Loading characters...</div>
      ) : (
        <>
          {characters.length === 0 ? (
            <div className="no-characters">
              <p>You don't have any characters yet.</p>
              <Link to="/create-character" className="primary-button">
                Create a Character
              </Link>
            </div>
          ) : (
            <div className="characters-grid">
              {characters.map(character => (
                <div 
                  key={character.id} 
                  className="character-card"
                  onClick={() => handleSelectCharacter(character)}
                >
                  <div className="character-icon">
                    {/* This would be a character avatar */}
                    <div className="avatar-placeholder">
                      {character.name.charAt(0)}
                    </div>
                  </div>
                  
                  <div className="character-info">
                    <h3>{character.name}</h3>
                    <p>Level {character.level}</p>
                    <div className="character-stats">
                      <span>STR: {character.stats.str}</span>
                      <span>INT: {character.stats.int}</span>
                      <span>AGI: {character.stats.agi}</span>
                      <span>DEX: {character.stats.dex}</span>
                      <span>LUK: {character.stats.luk}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              <Link to="/create-character" className="create-character-card">
                <div className="plus-icon">+</div>
                <p>Create New Character</p>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CharacterSelectPage; 