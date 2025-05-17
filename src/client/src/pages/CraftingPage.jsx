import { useState, useEffect } from 'react';
import { useCharacterStore } from '../stores/characterStore';
import { useInventoryStore } from '../stores/inventoryStore';
import '../styles/crafting.scss';

function CraftingPage() {
  const { currentCharacter } = useCharacterStore();
  const { items, fetchInventory, craftItem } = useInventoryStore();
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [recipeType, setRecipeType] = useState('weapon');
  const [isCrafting, setIsCrafting] = useState(false);
  const [craftResult, setCraftResult] = useState(null);
  
  useEffect(() => {
    if (currentCharacter) {
      fetchInventory(currentCharacter.id);
    }
  }, [currentCharacter, fetchInventory]);

  // Filter only materials
  const materials = items.filter(item => item.type === 'material' && !item.equipped);

  const handleMaterialSelect = (material) => {
    if (selectedMaterials.find(m => m.id === material.id)) {
      setSelectedMaterials(selectedMaterials.filter(m => m.id !== material.id));
    } else if (selectedMaterials.length < 5) {
      setSelectedMaterials([...selectedMaterials, material]);
    }
  };

  const handleCraft = async () => {
    if (selectedMaterials.length !== 5) return;
    
    setIsCrafting(true);
    try {
      const result = await craftItem({
        materialIds: selectedMaterials.map(m => m.id),
        type: recipeType
      });
      
      setCraftResult(result);
      // Clear selected materials after successful craft
      setSelectedMaterials([]);
    } catch (error) {
      console.error('Crafting failed:', error);
    } finally {
      setIsCrafting(false);
    }
  };

  const getRarityClass = (rarity) => {
    return `rarity-${rarity.toLowerCase()}`;
  };

  return (
    <div className="crafting-page">
      <div className="crafting-header">
        <h1>Crafting</h1>
        <div className="crafting-tabs">
          <button 
            className={recipeType === 'weapon' ? 'active' : ''} 
            onClick={() => setRecipeType('weapon')}
          >
            Weapons
          </button>
          <button 
            className={recipeType === 'armor' ? 'active' : ''} 
            onClick={() => setRecipeType('armor')}
          >
            Armor
          </button>
          <button 
            className={recipeType === 'accessory' ? 'active' : ''} 
            onClick={() => setRecipeType('accessory')}
          >
            Accessories
          </button>
        </div>
      </div>

      <div className="crafting-content">
        <div className="materials-section">
          <h2>Materials</h2>
          <div className="materials-grid">
            {materials.map(material => (
              <div 
                key={material.id} 
                className={`material-card ${selectedMaterials.find(m => m.id === material.id) ? 'selected' : ''}`}
                onClick={() => handleMaterialSelect(material)}
              >
                <div className={`material-rarity ${getRarityClass(material.rarity)}`}></div>
                <div className="material-image">{material.icon || '🧪'}</div>
                <div className="material-name">{material.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="crafting-station">
          <h2>Combine Materials</h2>
          <p className="instruction">Select 5 materials to craft a {recipeType}</p>
          
          <div className="crafting-slots">
            {Array(5).fill(0).map((_, index) => (
              <div key={index} className="crafting-slot">
                {selectedMaterials[index] ? (
                  <div className={`material-preview ${getRarityClass(selectedMaterials[index].rarity)}`}>
                    <div className="material-image">{selectedMaterials[index].icon || '🧪'}</div>
                    <div className="material-name">{selectedMaterials[index].name}</div>
                  </div>
                ) : (
                  <div className="empty-slot">+</div>
                )}
              </div>
            ))}
          </div>
          
          <button 
            className="craft-button"
            disabled={selectedMaterials.length !== 5 || isCrafting}
            onClick={handleCraft}
          >
            {isCrafting ? 'Crafting...' : 'Craft Item'}
          </button>
        </div>

        {craftResult && (
          <div className="craft-result">
            <h2>Result</h2>
            <div className={`result-item ${getRarityClass(craftResult.rarity)}`}>
              <div className="item-image">{craftResult.icon || '🗡️'}</div>
              <div className="item-name">{craftResult.name}</div>
              <div className="item-type">{craftResult.type} - {craftResult.subType}</div>
              <div className="item-stats">
                {Object.entries(craftResult.stats || {}).map(([stat, value]) => (
                  <div key={stat} className="stat-row">
                    <span className="stat-name">{stat.toUpperCase()}</span>
                    <span className="stat-value">{value > 0 ? `+${value}` : value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CraftingPage; 