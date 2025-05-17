const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('colyseus');
const { LocalPresence } = require('@colyseus/core');
const { DungeonRoom } = require('./game/DungeonRoom');
const { PvPRoom } = require('./game/PvPRoom');
const { initDatabase } = require('./db/database');
const apiRoutes = require('./api/routes');
const path = require('path');
const fs = require('fs');
const runMigrations = require('./db/migrate');
const setupDatabase = require('./db/setupDatabase');
require('dotenv').config();

const PORT = process.env.PORT || 8080;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Static assets - serve in any environment
const clientPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../../src/client/dist')  // Docker path
  : path.join(__dirname, '../../client/dist');     // Local development path

// Ensure CSS directory and file exist
const assetsDir = path.join(clientPath, 'assets');
const cssFile = path.join(assetsDir, 'index.css');

if (!fs.existsSync(assetsDir)) {
  console.log(`Creating assets directory: ${assetsDir}`);
  fs.mkdirSync(assetsDir, { recursive: true });
}

if (!fs.existsSync(cssFile)) {
  console.log(`CSS file not found: ${cssFile}`);
  console.log('Creating fallback CSS file');
  
  const fallbackCss = `
  :root { --primary-color: #3498db; --primary-dark: #2980b9; }
  body { font-family: sans-serif; margin: 0; padding: 0; }
  .auth-page, .character-select-page, .character-create-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #2c3e50 0%, #1a2a38 100%);
  }
  `;
  
  fs.writeFileSync(cssFile, fallbackCss);
  console.log(`Created fallback CSS: ${cssFile}`);
}

// Log available static files
try {
  console.log('Available static files in assets directory:');
  if (fs.existsSync(assetsDir)) {
    fs.readdirSync(assetsDir).forEach(file => {
      console.log(`- ${file}`);
    });
  } else {
    console.log('Assets directory not found');
  }
} catch (err) {
  console.error('Error reading static files:', err);
}

// Explicitly set MIME types for CSS files
app.use(express.static(clientPath, {
  setHeaders: (res, path) => {
    console.log(`Serving: ${path}`);
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      console.log('Setting CSS headers for:', path);
    }
  }
}));

// Add specific handler for CSS files
app.get('*.css', (req, res, next) => {
  console.log('CSS file requested:', req.path);
  const cssPath = path.join(clientPath, req.path);
  if (fs.existsSync(cssPath)) {
    res.set('Content-Type', 'text/css');
    res.sendFile(cssPath);
  } else {
    console.log('CSS file not found:', cssPath);
    next();
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

const server = http.createServer(app);

// Configure Colyseus with presence based on environment
const gameServer = new Server({
  server,
  presence: new LocalPresence()
});

// Register game rooms
gameServer.define('dungeon', DungeonRoom);
gameServer.define('pvp', PvPRoom);

// Initialize database before starting server
initDatabase().then(async () => {
  try {
    console.log('Running database setup and migrations...');
    await setupDatabase();
    await runMigrations();
    console.log('Database setup and migrations completed');
  } catch (err) {
    console.error('Database setup/migrations error:', err);
    // Continue starting the server even if migrations fail
  }

  const startServer = (port) => {
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
      console.log(`Colyseus server started on ws://localhost:${port}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Serving static files from: ${clientPath}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is already in use, trying port ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('Failed to start server:', err);
      }
    });
  };
  
  startServer(PORT);
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}); 