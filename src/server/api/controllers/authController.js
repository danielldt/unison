const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/database');
const { generateTokens, refreshAccessToken } = require('../middleware/auth');

/**
 * User registration
 */
async function register(req, res) {
  const { username, email, password } = req.body;
  
  // Validate inputs
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required' });
  }
  
  try {
    // Check if username already exists
    const userExists = await db.query(
      `SELECT id FROM ${db.TABLES.USERS} WHERE username = $1 OR email = $2`,
      [username, email]
    );
    
    if (userExists.rowCount > 0) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const result = await db.query(
      `INSERT INTO ${db.TABLES.USERS} (id, username, email, password_hash, created_at, last_login) 
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, username, email, created_at`,
      [uuidv4(), username, email, passwordHash]
    );
    
    const user = result.rows[0];
    
    // Generate tokens
    const tokens = generateTokens(user);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      },
      ...tokens
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
}

/**
 * User login
 */
async function login(req, res) {
  const { username, password } = req.body;
  
  // Validate inputs
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  try {
    // Find user
    const result = await db.query(
      `SELECT id, username, email, password_hash FROM ${db.TABLES.USERS} 
       WHERE username = $1`,
      [username]
    );
    
    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Update last login
    await db.query(
      `UPDATE ${db.TABLES.USERS} SET last_login = NOW() WHERE id = $1`,
      [user.id]
    );
    
    // Generate tokens
    const tokens = generateTokens(user);
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
}

/**
 * Refresh access token
 */
async function refreshToken(req, res) {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }
  
  try {
    const accessToken = await refreshAccessToken(refreshToken);
    res.json({
      accessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(403).json({ message: 'Invalid refresh token' });
  }
}

/**
 * Forgot password
 * Note: In a real application, this would send an email with a reset link
 */
async function forgotPassword(req, res) {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  
  try {
    // Check if user exists
    const userResult = await db.query(
      `SELECT id FROM ${db.TABLES.USERS} WHERE email = $1`,
      [email]
    );
    
    if (userResult.rowCount === 0) {
      // Don't reveal if the email exists for security reasons
      return res.json({ message: 'If your email is registered, you will receive a password reset link' });
    }
    
    // In a real application, generate a token and send an email
    // For this implementation, we'll just return a success message
    
    res.json({ message: 'If your email is registered, you will receive a password reset link' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Reset password
 * Note: In a real application, this would verify a token sent via email
 */
async function resetPassword(req, res) {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }
  
  try {
    // In a real application, verify the token and get the user ID
    // For this implementation, we'll just return a success message
    
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Verify token
 * Simple endpoint to verify if a token is valid
 */
async function verifyToken(req, res) {
  // If the request gets here, it means authenticateToken middleware succeeded
  res.json({ valid: true });
}

module.exports = {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyToken
}; 