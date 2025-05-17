/**
 * Main Server Entry Point
 */
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { Server } = require('colyseus');
const { WebSocketTransport } = require('@colyseus/ws-transport');
const db = require('./db/database');
const setupDatabase = require('./db/setupDatabase');
const apiRoutes = require('./api/routes');
const DungeonRoom = require('./game/DungeonRoom');

// Create Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API routes
app.use('/api', apiRoutes);

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Setup Colyseus game server
const gameServer = new Server({
  transport: new WebSocketTransport({
    server // Use the same http server
  })
});

// Register game rooms
gameServer.define('dungeon', DungeonRoom);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Initialize database and start server
db.initDatabase()
  .then(() => setupDatabase())
  .then(() => {
    console.log('Database initialized and set up successfully');
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server and game server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }); 