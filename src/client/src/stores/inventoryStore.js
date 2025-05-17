import { create } from 'zustand';
import axios from 'axios';

export const useInventoryStore = create((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  
  // Fetch inventory for a character
  fetchInventory: async (characterId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`/api/inventory/${characterId}`);
      set({ items: response.data.items || [], isLoading: false });
      return response.data.items || [];
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch inventory', 
        isLoading: false 
      });
      return [];
    }
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