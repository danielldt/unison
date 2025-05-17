const jwt = require('jsonwebtoken');
const db = require('../../db/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

/**
 * Middleware to authenticate JWT token
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided' });
  }

  try {
    // Verify token
    const user = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists in database
    const userResult = await db.query(
      `SELECT id, username FROM ${db.TABLES.USERS} WHERE id = $1`,
      [user.id]
    );
    
    if (userResult.rowCount === 0) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
    
    // User is valid
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Generate access and refresh tokens
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { id: user.id, username: user.username },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

/**
 * Verify refresh token and generate new access token
 */
async function refreshAccessToken(refreshToken) {
  try {
    // Verify the refresh token
    const user = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    // Check if user still exists in database
    const userResult = await db.query(
      `SELECT id, username FROM ${db.TABLES.USERS} WHERE id = $1`,
      [user.id]
    );
    
    if (userResult.rowCount === 0) {
      throw new Error('User no longer exists');
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      { id: user.id, username: user.username || userResult.rows[0].username },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    return accessToken;
  } catch (err) {
    throw new Error('Invalid refresh token');
  }
}

module.exports = {
  authenticateToken,
  generateTokens,
  refreshAccessToken
}; 