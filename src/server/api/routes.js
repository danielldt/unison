const express = require('express');
const authController = require('./controllers/authController');
const characterController = require('./controllers/characterController');
const dungeonController = require('./controllers/dungeonController');
const inventoryController = require('./controllers/inventoryController');
const craftingController = require('./controllers/craftingController');
const eventController = require('./controllers/eventController');
const { authenticateToken } = require('./middleware/auth');
const { rateLimit } = require('./middleware/rateLimit');

const router = express.Router();

// Auth routes - public
router.post('/auth/register', rateLimit('auth'), authController.register);
router.post('/auth/login', rateLimit('auth'), authController.login);
router.post('/auth/refresh', rateLimit('auth'), authController.refreshToken);
router.post('/auth/forgot-password', rateLimit('auth'), authController.forgotPassword);
router.post('/auth/reset-password', rateLimit('auth'), authController.resetPassword);

// Character routes - authenticated
router.get('/characters', authenticateToken, rateLimit('read'), characterController.getCharacters);
router.post('/characters', authenticateToken, rateLimit('write'), characterController.createCharacter);
router.get('/characters/:id', authenticateToken, rateLimit('read'), characterController.getCharacter);
router.put('/characters/:id', authenticateToken, rateLimit('write'), characterController.updateCharacter);
router.put('/characters/:id/stats', authenticateToken, rateLimit('write'), characterController.allocateStats);

// Inventory routes
router.get('/inventory/:characterId', authenticateToken, rateLimit('read'), inventoryController.getInventory);
router.post('/inventory/:characterId/equip', authenticateToken, rateLimit('write'), inventoryController.equipItem);
router.post('/inventory/:characterId/unequip', authenticateToken, rateLimit('write'), inventoryController.unequipItem);
router.post('/inventory/:characterId/use', authenticateToken, rateLimit('write'), inventoryController.useItem);
router.post('/inventory/:characterId/enhance', authenticateToken, rateLimit('write'), inventoryController.enhanceItem);
router.post('/inventory/:characterId/fusion', authenticateToken, rateLimit('write'), inventoryController.fuseItems);

// Crafting routes
router.get('/crafting/materials/:characterId', authenticateToken, rateLimit('read'), craftingController.getMaterials);
router.get('/crafting/recipes/:characterId', authenticateToken, rateLimit('read'), craftingController.getRecipes);
router.post('/crafting/craft/:characterId', authenticateToken, rateLimit('write'), craftingController.craftItem);

// Dungeon routes
router.get('/dungeons/available', authenticateToken, rateLimit('read'), dungeonController.getAvailableDungeons);
router.post('/dungeons/generate', authenticateToken, rateLimit('write'), dungeonController.generateDungeon);
router.get('/dungeons/:id', authenticateToken, rateLimit('read'), dungeonController.getDungeon);

// Event routes
router.get('/events', rateLimit('read'), eventController.getActiveEvents);
router.get('/events/:id', rateLimit('read'), eventController.getEvent);
router.post('/events/:id/join', authenticateToken, rateLimit('write'), eventController.joinEvent);
router.post('/events/:id/leave', authenticateToken, rateLimit('write'), eventController.leaveEvent);
router.get('/events/:id/leaderboard', rateLimit('read'), eventController.getLeaderboard);

// Admin routes (would normally have additional authorization)
router.post('/admin/events', authenticateToken, rateLimit('admin'), eventController.createEvent);
router.put('/admin/events/:id', authenticateToken, rateLimit('admin'), eventController.updateEvent);
router.put('/admin/balance', authenticateToken, rateLimit('admin'), eventController.updateBalanceParameters);

module.exports = router; 