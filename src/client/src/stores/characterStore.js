import { create } from 'zustand';
import axios from 'axios';

export const useCharacterStore = create((set, get) => ({
  characters: [],
  currentCharacter: null,
  isLoading: false,
  error: null,
  
  // Fetch all characters for the user
  fetchCharacters: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/characters');
      set({ characters: response.data.characters, isLoading: false });
      return response.data.characters;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch characters', 
        isLoading: false 
      });
      return [];
    }
  },
  
  // Create a new character
  createCharacter: async (name) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/characters', { name });
      const newCharacter = response.data.character;
      
      set(state => ({ 
        characters: [...state.characters, newCharacter], 
        isLoading: false 
      }));
      
      return newCharacter;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to create character', 
        isLoading: false 
      });
      return null;
    }
  },
  
  // Fetch full character details
  fetchCharacterDetails: async (characterId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`/api/characters/${characterId}`);
      const character = response.data;
      
      set({ currentCharacter: character, isLoading: false });
      return character;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch character details', 
        isLoading: false 
      });
      return null;
    }
  },
  
  // Allocate stat points
  allocateStats: async (characterId, stats) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(`/api/characters/${characterId}/stats`, { stats });
      
      // Update current character with new stats
      set(state => {
        if (state.currentCharacter && state.currentCharacter.id === characterId) {
          return {
            currentCharacter: {
              ...state.currentCharacter,
              stats: response.data.newStats,
              remainingPoints: response.data.remainingPoints
            },
            isLoading: false
          };
        }
        return { isLoading: false };
      });
      
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to allocate stats', 
        isLoading: false 
      });
      return null;
    }
  },
  
  // Set current character
  setCurrentCharacter: (character) => {
    set({ currentCharacter: character });
  },
  
  // Clear current character
  clearCurrentCharacter: () => {
    set({ currentCharacter: null });
  }
})); 