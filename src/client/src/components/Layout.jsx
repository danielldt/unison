import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCharacterStore } from '../stores/characterStore';
import { useState, useEffect } from 'react';
import '../styles/layout.scss';

function Layout() {
  const { logout } = useAuthStore();
  const { currentCharacter, clearCurrentCharacter } = useCharacterStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  // If no character is selected, redirect to character select
  useEffect(() => {
    if (!currentCharacter && window.location.pathname !== '/') {
      navigate('/');
    }
  }, [currentCharacter, navigate]);
  
  const handleLogout = () => {
    clearCurrentCharacter();
    logout();
    navigate('/login');
  };
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  return (
    <div className="game-layout">
      <header className="game-header">
        <div className="logo">
          <h1>Unison Legends</h1>
        </div>
        
        {currentCharacter && (
          <div className="character-info">
            <span className="character-name">{currentCharacter.name}</span>
            <span className="character-level">Level {currentCharacter.level}</span>
          </div>
        )}
        
        <button className="menu-toggle" onClick={toggleMenu}>
          Menu
        </button>
      </header>
      
      <aside className={`game-sidebar ${menuOpen ? 'open' : ''}`}>
        <nav className="game-nav">
          <ul>
            <li>
              <Link to="/" onClick={() => setMenuOpen(false)}>Character Select</Link>
            </li>
            {currentCharacter && (
              <>
                <li>
                  <Link to="/game" onClick={() => setMenuOpen(false)}>Game</Link>
                </li>
                <li>
                  <Link to="/inventory" onClick={() => setMenuOpen(false)}>Inventory</Link>
                </li>
                <li>
                  <Link to="/dungeon" onClick={() => setMenuOpen(false)}>Dungeons</Link>
                </li>
                <li>
                  <Link to="/crafting" onClick={() => setMenuOpen(false)}>Crafting</Link>
                </li>
                <li>
                  <Link to="/enhancement" onClick={() => setMenuOpen(false)}>Enhancement</Link>
                </li>
              </>
            )}
            <li>
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      
      <main className="game-content">
        <Outlet />
      </main>
      
      <footer className="game-footer">
        <p>&copy; 2023 Unison Legends</p>
      </footer>
    </div>
  );
}

export default Layout; 