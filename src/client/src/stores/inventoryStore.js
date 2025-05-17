import { create } from 'zustand';
import axios from 'axios';

// Track ongoing inventory fetches to prevent duplicate requests
const ongoingFetches = new Map();

export const useInventoryStore = create((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  
  // Fetch inventory for a character
  fetchInventory: async (characterId) => {
    // Check if we're already fetching this inventory to prevent duplicates
    if (ongoingFetches.has(characterId)) {
      console.log(`Already fetching inventory for ${characterId}, skipping duplicate request`);
      return get().items; // Return current items
    }
    
    // If we already have items and they're not being refreshed forcefully, use them
    if (get().items.length > 0 && !get().isLoading) {
      console.log(`Using ${get().items.length} items from store for ${characterId}`);
      return get().items;
    }
    
    // Mark this character as being fetched
    ongoingFetches.set(characterId, Date.now());
    
    set({ isLoading: true, error: null });
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`/api/inventory/${characterId}`, {
        headers: { 
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('Inventory API response:', response.data);
      
      // Ensure items is always an array
      const items = Array.isArray(response.data.items) ? response.data.items : [];
      set({ items, isLoading: false });
      
      // Save to localStorage as backup
      try {
        localStorage.setItem('characterInventory', JSON.stringify(items));
      } catch (e) {
        console.warn('Could not save inventory to localStorage', e);
      }
      
      // Remove from ongoing fetches map
      ongoingFetches.delete(characterId);
      
      return items;
    } catch (error) {
      console.error('Inventory fetch error:', error);
      
      // Try to recover cached inventory if the API call fails
      const cachedItems = get().recoverCachedInventory();
      if (cachedItems.length > 0) {
        console.log('Using cached inventory items:', cachedItems.length);
        set({ items: cachedItems, isLoading: false, error: 'Using cached inventory (offline mode)' });
        
        // Remove from ongoing fetches map
        ongoingFetches.delete(characterId);
        
        return cachedItems;
      }
      
      // Handle different error scenarios
      let errorMessage = 'Failed to fetch inventory';
      
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        console.error('Server response error:', error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'Server did not respond. Please try again.';
        console.error('No response received from server');
      } else {
        // Something happened in setting up the request
        errorMessage = error.message || 'Unknown error occurred';
        console.error('Request setup error:', error.message);
      }
      
      set({ error: errorMessage, isLoading: false });
      
      // Remove from ongoing fetches map
      ongoingFetches.delete(characterId);
      
      // Return empty array to prevent null reference errors
      return [];
    }
  },
  
  // Recover inventory from localStorage if API calls fail
  recoverCachedInventory: () => {
    try {
      const cachedInventory = localStorage.getItem('characterInventory');
      if (cachedInventory) {
        const items = JSON.parse(cachedInventory);
        if (Array.isArray(items) && items.length > 0) {
          console.log('Recovered inventory from localStorage:', items.length, 'items');
          return items;
        }
      }
    } catch (e) {
      console.error('Failed to parse cached inventory:', e);
    }
    return [];
  },
  
  // Equip an item
  equipItem: async (characterId, itemId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`/api/inventory/${characterId}/equip`, { itemId });
      set({ items: response.data.items || [], isLoading: false });
      return response.data.items;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to equip item', 
        isLoading: false 
      });
      return null;
    }
  },
  
  // Unequip an item
  unequipItem: async (characterId, itemId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`/api/inventory/${characterId}/unequip`, { itemId });
      set({ items: response.data.items || [], isLoading: false });
      return response.data.items;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to unequip item', 
        isLoading: false 
      });
      return null;
    }
  },
  
  // Use a consumable
  useItem: async (characterId, itemId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`/api/inventory/${characterId}/use`, { itemId });
      set({ items: response.data.items || [], isLoading: false });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to use item', 
        isLoading: false 
      });
      return null;
    }
  },
  
  // Enhance an item
  enhanceItem: async (characterId, itemId, useProtection = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`/api/inventory/${characterId}/enhance`, { 
        itemId, 
        useProtection 
      });
      
      set({ items: response.data.items || [], isLoading: false });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to enhance item', 
        isLoading: false 
      });
      return null;
    }
  },
  
  // Fuse items
  fuseItems: async (characterId, itemIds) => {
    if (!itemIds || itemIds.length !== 5) {
      set({ error: 'Fusion requires exactly 5 items' });
      return null;
    }
    
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`/api/inventory/${characterId}/fusion`, { itemIds });
      set({ items: response.data.items || [], isLoading: false });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fuse items', 
        isLoading: false 
      });
      return null;
    }
  },
  
  // Clear inventory state
  clearInventory: () => {
    set({ items: [] });
  }
})); 