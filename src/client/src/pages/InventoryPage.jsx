import { useState, useEffect } from 'react';
import { useCharacterStore } from '../stores/characterStore';
import { useInventoryStore } from '../stores/inventoryStore';
import '../styles/inventory.scss';

function InventoryPage() {
  const { currentCharacter } = useCharacterStore();
  const { items, fetchInventory, equipItem, unequipItem } = useInventoryStore();
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (currentCharacter) {
      fetchInventory(currentCharacter.id);
    }
  }, [currentCharacter, fetchInventory]);

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'equipped') return item.equipped;
    return item.type === filter;
  });

  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  const handleEquip = () => {
    if (selectedItem && !selectedItem.equipped) {
      equipItem(selectedItem.id);
    } else if (selectedItem && selectedItem.equipped) {
      unequipItem(selectedItem.id);
    }
  };

  const getRarityClass = (rarity) => {
    return `rarity-${rarity.toLowerCase()}`;
  };

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <h1>Inventory</h1>
        <div className="filter-options">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'equipped' ? 'active' : ''} 
            onClick={() => setFilter('equipped')}
          >
            Equipped
          </button>
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
          <button 
            className={filter === 'consumable' ? 'active' : ''} 
            onClick={() => setFilter('consumable')}
          >
            Consumables
          </button>
        </div>
      </div>

      <div className="inventory-content">
        <div className="items-grid">
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              className={`item-card ${item.equipped ? 'equipped' : ''} ${selectedItem?.id === item.id ? 'selected' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              <div className={`item-rarity ${getRarityClass(item.rarity)}`}></div>
              <div className="item-image">{item.icon || '🗡️'}</div>
              <div className="item-name">{item.name}</div>
              {item.equipped && <div className="equipped-indicator">E</div>}
            </div>
          ))}
        </div>

        <div className="item-details">
          {selectedItem ? (
            <>
              <h2 className={`item-name ${getRarityClass(selectedItem.rarity)}`}>
                {selectedItem.name}
                {selectedItem.enhancement > 0 && <span className="enhancement">+{selectedItem.enhancement}</span>}
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
              <div className="item-description">{selectedItem.description}</div>
              <div className="item-actions">
                <button onClick={handleEquip}>
                  {selectedItem.equipped ? 'Unequip' : 'Equip'}
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              Select an item to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InventoryPage; 