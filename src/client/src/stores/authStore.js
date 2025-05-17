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
      
      // Set the auth header immediately
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
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
      
      // Set the auth header immediately
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
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
    
    // Clear the auth header
    delete axios.defaults.headers.common['Authorization'];
    
    set({ 
      user: null, 
      token: null, 
      refreshToken: null, 
      isAuthenticated: false 
    });
  },
  
  checkAuth: async () => {
    set({ isLoading: true });
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!token || !refreshToken) {
      set({ isAuthenticated: false, isLoading: false });
      return false;
    }
    
    // Always set the Authorization header when checking auth
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    try {
      // Verify token is valid by calling the auth/verify endpoint
      await axios.get('/api/auth/verify');
      set({ isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) {
      console.log('Auth check error:', error);
      
      // Token is invalid or expired, try to refresh
      if (error.response?.status === 401 || error.response?.status === 403) {
        try {
          const response = await axios.post('/api/auth/refresh', { refreshToken });
          const { accessToken } = response.data;
          
          localStorage.setItem('token', accessToken);
          
          // Update the auth header with the new token
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          
          // Verify the new token works
          try {
            await axios.get('/api/auth/verify');
            set({ token: accessToken, isAuthenticated: true, isLoading: false });
            return true;
          } catch (verifyError) {
            console.log('New token verification error:', verifyError);
            get().logout();
            set({ isLoading: false });
            return false;
          }
        } catch (refreshError) {
          console.log('Token refresh error:', refreshError);
          get().logout();
          set({ isLoading: false });
          return false;
        }
      } else {
        get().logout();
        set({ isLoading: false });
        return false;
      }
    }
  }
})); 