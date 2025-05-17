import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CharacterSelectPage from './pages/CharacterSelectPage';
import CharacterCreatePage from './pages/CharacterCreatePage';
import DashboardPage from './pages/DashboardPage';
import GamePage from './pages/GamePage';
import InventoryPage from './pages/InventoryPage';
import DungeonPage from './pages/DungeonPage';
import LobbyPage from './pages/LobbyPage';
import CraftingPage from './pages/CraftingPage';
import EnhancementPage from './pages/EnhancementPage';
import Layout from './components/Layout';

// Protected route component
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function App() {
  const { isAuthenticated, token, checkAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  
  // Check if user is logged in on initial load
  useEffect(() => {
    const verifyAuthentication = async () => {
      await checkAuth();
      setLoading(false);
    };
    
    verifyAuthentication();
  }, [checkAuth]);
  
  // Configure Axios
  useEffect(() => {
    // Request interceptor for API calls
    axios.interceptors.request.use(
      config => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for API calls
    axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        
        // If error is 401 Unauthorized and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Let the auth store handle refreshing the token
          const authenticated = await checkAuth();
          
          if (authenticated) {
            // If authentication was successful, retry the original request
            const token = localStorage.getItem('token');
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axios(originalRequest);
          } else {
            // If authentication failed, redirect to login
            window.location.href = '/login';
            return Promise.reject(error);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }, [checkAuth]);
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          {/* Default route */}
          <Route index element={<CharacterSelectPage />} />
          
          {/* Character routes */}
          <Route path="create-character" element={<CharacterCreatePage />} />
          
          {/* Main routes (require character selection) */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="game/:dungeonId" element={<GamePage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="dungeons" element={<DungeonPage />} />
          <Route path="lobby/:dungeonId" element={<LobbyPage />} />
          <Route path="crafting" element={<CraftingPage />} />
          <Route path="enhancement" element={<EnhancementPage />} />
        </Route>
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; 