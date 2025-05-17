import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../stores/characterStore';
import '../styles/dashboard.scss';

function DashboardPage() {
  const { currentCharacter } = useCharacterStore();
  const navigate = useNavigate();

  if (!currentCharacter) {
    return (
      <div className="dashboard-container">
        <div className="error-message">Please select a character first</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Adventure Hub</h1>
      </div>

      <div className="dashboard-content">
        <div className="character-panel">
          <div className="character-card">
            <div className="character-info">
              <h2>{currentCharacter.name}</h2>
              <div className="character-level">Level {currentCharacter.level}</div>
            </div>
          </div>
        </div>

        <div className="game-modules">
          <div className="module-row">
            <div className="game-module" onClick={() => navigate('/dungeons')}>
              <div className="module-icon">🏰</div>
              <h3>Dungeons</h3>
              <p>Challenge dungeons and defeat monsters</p>
            </div>
            
            <div className="game-module" onClick={() => navigate('/inventory')}>
              <div className="module-icon">🎒</div>
              <h3>Inventory</h3>
              <p>Manage your equipment and items</p>
            </div>
          </div>
          
          <div className="module-row">
            <div className="game-module" onClick={() => navigate('/enhancement')}>
              <div className="module-icon">⚒️</div>
              <h3>Enhancement</h3>
              <p>Upgrade your weapons and armor</p>
            </div>
            
            <div className="game-module" onClick={() => navigate('/crafting')}>
              <div className="module-icon">🔨</div>
              <h3>Crafting</h3>
              <p>Create new items from materials</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage; 