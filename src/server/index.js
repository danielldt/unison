const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('colyseus');
const { DungeonRoom } = require('./game/DungeonRoom');
const { PvPRoom } = require('./game/PvPRoom');
const { initializeDatabase } = require('./db/database');
const apiRoutes = require('./api/routes');
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 8080;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Static assets
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

const server = http.createServer(app);

// Configure Colyseus with presence based on environment
const gameServer = new Server({
  server,
  // Always use local presence to avoid Redis issues
  presence: 'local'
});

// Register game rooms
gameServer.define('dungeon', DungeonRoom);
gameServer.define('pvp', PvPRoom);

// Initialize database before starting server
initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Colyseus server started on ws://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}); 