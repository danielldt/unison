import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../stores/characterStore';
import '../styles/character-create.scss';

function CharacterCreatePage() {
  const [name, setName] = useState('');
  const { createCharacter, isLoading, error } = useCharacterStore();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }
    
    const character = await createCharacter(name);
    if (character) {
      navigate('/dashboard');
    }
  };
  
  return (
    <div className="character-create-page">
      <div className="page-header">
        <h1>Create a New Character</h1>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="character-form-container">
        <div className="form-section">
          <h2>Character Information</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="character-name">Character Name</label>
                <input
                  type="text"
                  id="character-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  required
                  maxLength={20}
                  placeholder="Enter character name"
                />
              </div>
            </div>
            
            <div className="character-info-box">
              <h3>Starting Stats</h3>
              <div className="stat-allocation">
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-header">
                      <span className="stat-name">Strength (STR)</span>
                      <span className="stat-value">1</span>
                    </div>
                    <div className="stat-description">
                      Increases physical damage and carrying capacity
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-header">
                      <span className="stat-name">Intelligence (INT)</span>
                      <span className="stat-value">1</span>
                    </div>
                    <div className="stat-description">
                      Increases magical damage and mana pool
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-header">
                      <span className="stat-name">Agility (AGI)</span>
                      <span className="stat-value">1</span>
                    </div>
                    <div className="stat-description">
                      Increases movement speed and evasion
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-header">
                      <span className="stat-name">Dexterity (DEX)</span>
                      <span className="stat-value">1</span>
                    </div>
                    <div className="stat-description">
                      Increases attack speed and accuracy
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-header">
                      <span className="stat-name">Luck (LUK)</span>
                      <span className="stat-value">1</span>
                    </div>
                    <div className="stat-description">
                      Increases critical hit chance and item drop rates
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="action-buttons">
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => navigate('/')}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="create-button"
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? 'Creating...' : 'Create Character'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CharacterCreatePage; 