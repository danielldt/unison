import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCharacterStore } from '../stores/characterStore';
import { useState, useEffect } from 'react';
import '../styles/layout.scss';

function Layout() {
  const { logout } = useAuthStore();
  const { currentCharacter, clearCurrentCharacter } = useCharacterStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // If no character is selected, redirect to character select
  // BUT allow the create-character route to be accessed directly
  useEffect(() => {
    if (!currentCharacter && 
        window.location.pathname !== '/' && 
        window.location.pathname !== '/create-character') {
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
    <div className="app-layout">
      <header className="app-header">
        <div className="logo">
          <h1>Unison Legends</h1>
        </div>
        
        {currentCharacter && (
          <div className="user-section">
            <span className="username">{currentCharacter.name}</span>
            <span className="character-level">Level {currentCharacter.level}</span>
          </div>
        )}
        
        <button className="mobile-menu-button" onClick={toggleMenu}>
          Menu
        </button>
      </header>
      
      <div className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
        <nav className="nav-links">
          <ul>
            <li>
              <Link to="/" onClick={() => setMenuOpen(false)}>Character Select</Link>
            </li>
            {(currentCharacter || location.pathname === '/create-character') && (
              <>
                {location.pathname !== '/create-character' && (
                  <>
                    <li>
                      <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                    </li>
                    <li>
                      <Link to="/game" onClick={() => setMenuOpen(false)}>Game</Link>
                    </li>
                    <li>
                      <Link to="/inventory" onClick={() => setMenuOpen(false)}>Inventory</Link>
                    </li>
                    <li>
                      <Link to="/dungeons" onClick={() => setMenuOpen(false)}>Dungeons</Link>
                    </li>
                    <li>
                      <Link to="/crafting" onClick={() => setMenuOpen(false)}>Crafting</Link>
                    </li>
                    <li>
                      <Link to="/enhancement" onClick={() => setMenuOpen(false)}>Enhancement</Link>
                    </li>
                  </>
                )}
              </>
            )}
            <li>
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>
      
      <main className="app-content">
        <Outlet />
      </main>
      
      <footer className="app-footer">
        <p>&copy; 2023 Unison Legends</p>
      </footer>
    </div>
  );
}

export default Layout; 