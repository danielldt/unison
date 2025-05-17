import { create } from 'zustand';
import axios from 'axios';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
  
  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { user, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      set({ 
        user, 
        token: accessToken, 
        refreshToken, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      return true;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Login failed', 
        isLoading: false 
      });
      return false;
    }
  },
  
  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/auth/register', { username, email, password });
      const { user, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      set({ 
        user, 
        token: accessToken, 
        refreshToken, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      return true;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Registration failed', 
        isLoading: false 
      });
      return false;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    set({ 
      user: null, 
      token: null, 
      refreshToken: null, 
      isAuthenticated: false 
    });
  },
  
  checkAuth: async () => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!token || !refreshToken) {
      set({ isAuthenticated: false });
      return false;
    }
    
    try {
      // Setup axios interceptor for token refresh
      axios.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config;
          
          if (error.response.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
              const response = await axios.post('/api/auth/refresh', { 
                refreshToken: get().refreshToken 
              });
              
              const { accessToken } = response.data;
              localStorage.setItem('token', accessToken);
              set({ token: accessToken });
              
              // Update the token in the current request
              originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
              return axios(originalRequest);
            } catch (refreshError) {
              // If refresh fails, logout
              get().logout();
              return Promise.reject(refreshError);
            }
          }
          
          return Promise.reject(error);
        }
      );
      
      // Set default auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user profile to validate token
      const response = await axios.get('/api/characters');
      set({ isAuthenticated: true });
      return true;
    } catch (error) {
      if (error.response?.status === 403) {
        // Try to refresh token
        try {
          const response = await axios.post('/api/auth/refresh', { refreshToken });
          const { accessToken } = response.data;
          
          localStorage.setItem('token', accessToken);
          set({ token: accessToken, isAuthenticated: true });
          return true;
        } catch (refreshError) {
          get().logout();
          return false;
        }
      } else {
        get().logout();
        return false;
      }
    }
  }
})); 