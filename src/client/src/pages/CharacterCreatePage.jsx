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
      navigate('/');
    }
  };
  
  return (
    <div className="character-create-container">
      <div className="character-create-card">
        <h1>Create a New Character</h1>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="character-form">
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
          
          <div className="character-info-box">
            <h3>Starting Stats</h3>
            <div className="stat-list">
              <div className="stat-item">
                <span className="stat-name">STR:</span>
                <span className="stat-value">1</span>
              </div>
              <div className="stat-item">
                <span className="stat-name">INT:</span>
                <span className="stat-value">1</span>
              </div>
              <div className="stat-item">
                <span className="stat-name">AGI:</span>
                <span className="stat-value">1</span>
              </div>
              <div className="stat-item">
                <span className="stat-name">DEX:</span>
                <span className="stat-value">1</span>
              </div>
              <div className="stat-item">
                <span className="stat-name">LUK:</span>
                <span className="stat-value">1</span>
              </div>
            </div>
            
            <h3 className="mt-3">Starting Equipment</h3>
            <div className="equipment-list">
              <div className="equipment-item">
                <span className="equipment-name">F-rank Short Sword</span>
                <span className="equipment-stat">(+3 ATK)</span>
              </div>
              <div className="equipment-item">
                <span className="equipment-name">F-rank Cloth Helmet</span>
                <span className="equipment-stat">(+1 DEF)</span>
              </div>
              <div className="equipment-item">
                <span className="equipment-name">F-rank Cloth Tunic</span>
                <span className="equipment-stat">(+2 DEF)</span>
              </div>
              <div className="equipment-item">
                <span className="equipment-name">F-rank Cloth Leggings</span>
                <span className="equipment-stat">(+1 DEF)</span>
              </div>
              <div className="equipment-item">
                <span className="equipment-name">Minor Health Potion</span>
                <span className="equipment-stat">(x3)</span>
              </div>
            </div>
            
            <div className="character-note">
              <p>You will be able to allocate stat points as you level up</p>
            </div>
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="secondary-button"
              onClick={() => navigate('/')}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="primary-button"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CharacterCreatePage; 