import { useState, useEffect } from 'react';
import { useCharacterStore } from '../stores/characterStore';
import { useInventoryStore } from '../stores/inventoryStore';
import '../styles/enhancement.scss';

function EnhancementPage() {
  const { currentCharacter } = useCharacterStore();
  const { items, fetchInventory, enhanceItem } = useInventoryStore();
  const [selectedItem, setSelectedItem] = useState(null);
  const [enhancing, setEnhancing] = useState(false);
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState('weapon');
  
  useEffect(() => {
    if (currentCharacter) {
      fetchInventory(currentCharacter.id);
    }
  }, [currentCharacter, fetchInventory]);

  // Filter items by type (exclude materials)
  const enhanceableItems = items.filter(item => 
    item.type === filter && 
    item.type !== 'material' && 
    item.type !== 'consumable'
  );

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setResult(null);
  };

  const handleEnhance = async () => {
    if (!selectedItem) return;
    
    setEnhancing(true);
    try {
      const enhanceResult = await enhanceItem(selectedItem.id);
      setResult(enhanceResult);
      
      // Update the selected item with new enhancement level
      if (enhanceResult.success) {
        setSelectedItem({
          ...selectedItem,
          enhancement: enhanceResult.newLevel
        });
      }
    } catch (error) {
      console.error('Enhancement failed:', error);
      setResult({
        success: false,
        message: 'An error occurred during enhancement'
      });
    } finally {
      setEnhancing(false);
    }
  };

  const getRarityClass = (rarity) => {
    return `rarity-${rarity.toLowerCase()}`;
  };

  const getEnhancementSuccess = (level) => {
    if (level < 10) return '100%';
    if (level < 20) return '80%';
    if (level < 30) return '70%';
    if (level < 40) return '60%';
    if (level < 50) return '50%';
    if (level < 60) return '40%';
    if (level < 70) return '30%';
    if (level < 80) return '20%';
    if (level < 90) return '10%';
    return '5%';
  };

  const getEnhancementClass = (level) => {
    if (level < 10) return '';
    if (level < 20) return 'medium';
    if (level < 30) return 'medium';
    if (level < 40) return 'high';
    if (level < 50) return 'high';
    if (level < 60) return 'very-high';
    if (level < 70) return 'very-high';
    if (level < 80) return 'extreme';
    if (level < 90) return 'extreme';
    return 'godly';
  };

  return (
    <div className="enhancement-page">
      <div className="enhancement-header">
        <h1>Enhancement</h1>
        <div className="filter-options">
          <button 
            className={filter === 'weapon' ? 'active' : ''} 
            onClick={() => setFilter('weapon')}
          >
            Weapons
          </button>
          <button 
            className={filter === 'armor' ? 'active' : ''} 
            onClick={() => setFilter('armor')}
          >
            Armor
          </button>
          <button 
            className={filter === 'accessory' ? 'active' : ''} 
            onClick={() => setFilter('accessory')}
          >
            Accessories
          </button>
        </div>
      </div>

      <div className="enhancement-content">
        <div className="items-grid">
          {enhanceableItems.map(item => (
            <div 
              key={item.id} 
              className={`item-card ${selectedItem?.id === item.id ? 'selected' : ''} ${item.enhancement > 0 ? `enhanced ${getEnhancementClass(item.enhancement)}` : ''}`}
              onClick={() => handleItemSelect(item)}
            >
              <div className={`item-rarity ${getRarityClass(item.rarity)}`}></div>
              <div className="item-image">{item.icon || '🗡️'}</div>
              <div className="item-name">{item.name}</div>
              {item.enhancement > 0 && (
                <div className="enhancement-level">+{item.enhancement}</div>
              )}
            </div>
          ))}
        </div>

        <div className="enhancement-station">
          {selectedItem ? (
            <>
              <div className="selected-item">
                <h2 className={`item-name ${getRarityClass(selectedItem.rarity)}`}>
                  {selectedItem.name}
                  {selectedItem.enhancement > 0 && (
                    <span className="enhancement">+{selectedItem.enhancement}</span>
                  )}
                </h2>
                <div className="item-type">{selectedItem.type} - {selectedItem.subType}</div>
                
                <div className="item-stats">
                  {Object.entries(selectedItem.stats || {}).map(([stat, value]) => (
                    <div key={stat} className="stat-row">
                      <span className="stat-name">{stat.toUpperCase()}</span>
                      <span className="stat-value">{value > 0 ? `+${value}` : value}</span>
                    </div>
                  ))}
                </div>

                <div className="enhancement-info">
                  <div className="current-level">
                    <span>Current Level:</span>
                    <span className="level-value">+{selectedItem.enhancement || 0}</span>
                  </div>
                  <div className="target-level">
                    <span>Target Level:</span>
                    <span className="level-value">+{(selectedItem.enhancement || 0) + 1}</span>
                  </div>
                  <div className="success-rate">
                    <span>Success Rate:</span>
                    <span className="rate-value">{getEnhancementSuccess(selectedItem.enhancement || 0)}</span>
                  </div>
                  <div className="failure-warning">
                    Failure will reset enhancement to +9
                  </div>
                </div>

                <button 
                  className="enhance-button"
                  disabled={enhancing}
                  onClick={handleEnhance}
                >
                  {enhancing ? 'Enhancing...' : 'Enhance Item'}
                </button>
                
                {result && (
                  <div className={`enhancement-result ${result.success ? 'success' : 'failure'}`}>
                    {result.success ? (
                      <>
                        <div className="result-icon">✨</div>
                        <div className="result-text">
                          Enhancement succeeded! The item is now +{result.newLevel}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="result-icon">💔</div>
                        <div className="result-text">
                          Enhancement failed! The item was reset to +9
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              Select an item to enhance
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EnhancementPage; 