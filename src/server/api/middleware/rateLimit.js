const redis = require('redis');
require('dotenv').config();

// Simple in-memory store for rate limiting when Redis is unavailable
const inMemoryStore = {
  data: {},
  get: async (key) => inMemoryStore.data[key],
  incr: async (key) => {
    inMemoryStore.data[key] = (inMemoryStore.data[key] || 0) + 1;
    return inMemoryStore.data[key];
  },
  expire: async (key, seconds) => {
    setTimeout(() => {
      delete inMemoryStore.data[key];
    }, seconds * 1000);
  },
  ttl: async (key) => 60 // Default TTL
};

// Create Redis client or use in-memory fallback
let redisClient = inMemoryStore;
let useRedis = false;

if (process.env.USE_REDIS === 'true' && process.env.REDIS_URL) {
  try {
    console.log('Attempting to connect to Redis at:', process.env.REDIS_URL);
    useRedis = true;
    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });

    // Handle Redis connection errors
    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
      if (useRedis) {
        console.log('Falling back to in-memory rate limiting');
        useRedis = false;
        redisClient = inMemoryStore;
      }
    });

    // Connect to Redis
    (async () => {
      try {
        await redisClient.connect();
        console.log('Connected to Redis successfully');
      } catch (err) {
        console.error('Failed to connect to Redis:', err);
        console.log('Falling back to in-memory rate limiting');
        useRedis = false;
        redisClient = inMemoryStore;
      }
    })();
  } catch (err) {
    console.error('Error initializing Redis client:', err);
    console.log('Using in-memory rate limiting');
  }
} else {
  console.log('Using in-memory rate limiting (Redis not configured)');
}

// Rate limit configurations based on endpoint types as specified in GDD
const RATE_LIMITS = {
  auth: { limit: 10, window: 60 }, // 10 requests per minute
  read: { limit: 120, window: 60 }, // 120 requests per minute
  write: { limit: 60, window: 60 }, // 60 requests per minute
  admin: { limit: 30, window: 60 }, // 30 requests per minute
  social: { limit: 60, window: 60 } // 60 requests per minute
};

/**
 * Rate limiting middleware
 * @param {string} type - Type of endpoint (auth, read, write, admin, social)
 */
function rateLimit(type) {
  const { limit, window } = RATE_LIMITS[type] || RATE_LIMITS.read;
  
  return async (req, res, next) => {
    try {
      // Skip rate limiting in development mode if needed
      if (process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true') {
        return next();
      }
      
      // Get client identifier (IP or user ID if authenticated)
      const identifier = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
      const key = `ratelimit:${type}:${identifier}`;
      
      // Get current count
      const current = await redisClient.get(key);
      const count = current ? parseInt(current, 10) : 0;
      
      // Set headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
      
      // Check if over limit
      if (count >= limit) {
        return res.status(429).json({
          message: 'Too many requests, please try again later',
          retryAfter: window
        });
      }
      
      // Increment counter
      await redisClient.incr(key);
      
      // Set expiry on first request
      if (count === 0) {
        await redisClient.expire(key, window);
      }
      
      // Calculate and set reset time header
      const ttl = await redisClient.ttl(key);
      const resetTime = Math.floor(Date.now() / 1000) + ttl;
      res.setHeader('X-RateLimit-Reset', resetTime);
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request through if Redis is down
      next();
    }
  };
}

module.exports = {
  rateLimit
}; 