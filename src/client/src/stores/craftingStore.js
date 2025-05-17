import { create } from 'zustand';
import axios from 'axios';

export const useCraftingStore = create((set, get) => ({
  materials: [],
  recipes: [],
  craftingGrid: Array(9).fill(null), // 3x3 grid
  craftingResult: null,
  isLoading: false,
  error: null,
  
  // Fetch available materials
  fetchMaterials: async (characterId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`/api/crafting/materials/${characterId}`);
      set({ materials: response.data.materials || [], isLoading: false });
      return response.data.materials;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch materials', 
        isLoading: false 
      });
      return [];
    }
  },
  
  // Fetch discovered recipes
  fetchRecipes: async (characterId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`/api/crafting/recipes/${characterId}`);
      set({ recipes: response.data.recipes || [], isLoading: false });
      return response.data.recipes;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch recipes', 
        isLoading: false 
      });
      return [];
    }
  },
  
  // Place material in grid
  placeMaterial: (index, material) => {
    if (index < 0 || index >= 9) {
      set({ error: 'Invalid grid position' });
      return;
    }
    
    const grid = [...get().craftingGrid];
    grid[index] = material;
    
    set({ craftingGrid: grid });
    get().checkRecipe();
  },
  
  // Remove material from grid
  removeMaterial: (index) => {
    if (index < 0 || index >= 9) {
      set({ error: 'Invalid grid position' });
      return;
    }
    
    const grid = [...get().craftingGrid];
    grid[index] = null;
    
    set({ craftingGrid: grid });
    get().checkRecipe();
  },
  
  // Clear the crafting grid
  clearGrid: () => {
    set({ 
      craftingGrid: Array(9).fill(null),
      craftingResult: null
    });
  },
  
  // Check if current grid matches a recipe
  checkRecipe: () => {
    const { craftingGrid, recipes } = get();
    
    // Convert grid to material IDs or empty strings
    const gridPattern = craftingGrid.map(item => item ? item.id : '');
    
    // Check against known recipes
    for (const recipe of recipes) {
      const recipePattern = recipe.pattern.split('');
      
      // Compare patterns
      let match = true;
      for (let i = 0; i < 9; i++) {
        // If recipe has a material at this position and grid doesn't match, it's not a match
        if (recipePattern[i] && recipePattern[i] !== gridPattern[i]) {
          match = false;
          break;
        }
        
        // If recipe doesn't have a material but grid does, it's not a match
        if (!recipePattern[i] && gridPattern[i]) {
          match = false;
          break;
        }
      }
      
      if (match) {
        set({ craftingResult: recipe.result });
        return;
      }
    }
    
    // No match found
    set({ craftingResult: null });
  },
  
  // Craft the current recipe
  craftItem: async (characterId) => {
    const { craftingGrid, craftingResult } = get();
    
    if (!craftingResult) {
      set({ error: 'No valid recipe found' });
      return null;
    }
    
    // Get the material IDs that are being used
    const usedMaterials = craftingGrid
      .filter(item => item !== null)
      .map(item => item.id);
    
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`/api/crafting/craft/${characterId}`, {
        materials: usedMaterials,
        recipeId: craftingResult.id
      });
      
      // Clear the grid after crafting
      get().clearGrid();
      
      // Update materials list
      await get().fetchMaterials(characterId);
      
      set({ isLoading: false });
      return response.data.result;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to craft item', 
        isLoading: false 
      });
      return null;
    }
  }
})); 