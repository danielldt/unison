import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';

// Import all styles into a single entry point
import './styles/index.scss';

// Comment out individual imports as they're now handled by index.scss
// import './styles/auth.scss';
// import './styles/layout.scss';
// import './styles/character-select.scss';
// import './styles/character-create.scss';
// import './styles/game.scss';
// import './styles/inventory.scss';
// import './styles/dungeon.scss';
// import './styles/crafting.scss';
// import './styles/enhancement.scss';

// Set up axios to include the authorization token in every request
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 