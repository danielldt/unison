import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CharacterSelectPage from './pages/CharacterSelectPage';
import CharacterCreatePage from './pages/CharacterCreatePage';
import GamePage from './pages/GamePage';
import InventoryPage from './pages/InventoryPage';
import DungeonPage from './pages/DungeonPage';
import CraftingPage from './pages/CraftingPage';
import EnhancementPage from './pages/EnhancementPage';
import Layout from './components/Layout';

// Protected route component
function ProtectedRoute({ children }) {
  const { isAuthenticated, checkAuth } = useAuthStore();
  
  useEffect(() => {
    if (!isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated, checkAuth]);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<CharacterSelectPage />} />
          <Route path="create-character" element={<CharacterCreatePage />} />
          <Route path="game" element={<GamePage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="dungeon" element={<DungeonPage />} />
          <Route path="crafting" element={<CraftingPage />} />
          <Route path="enhancement" element={<EnhancementPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App; 