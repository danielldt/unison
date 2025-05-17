const db = require('../../db/database');

/**
 * Get all active events
 */
const getActiveEvents = async (req, res) => {
  try {
    const now = new Date();
    
    const result = await db.query(
      `SELECT * FROM ${db.TABLES.EVENT}
       WHERE start_time <= $1 AND end_time >= $1
       ORDER BY end_time ASC`,
      [now]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching active events:', error);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
};

/**
 * Get a specific event by ID
 */
const getEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const result = await db.query(
      `SELECT * FROM ${db.TABLES.EVENT}
       WHERE id = $1`,
      [eventId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Failed to fetch event' });
  }
};

/**
 * Join an event
 */
const joinEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const characterId = req.body.characterId;
    
    if (!characterId) {
      return res.status(400).json({ message: 'Character ID is required' });
    }
    
    // Check if event exists and is active
    const eventResult = await db.query(
      `SELECT * FROM ${db.TABLES.EVENT}
       WHERE id = $1 AND start_time <= NOW() AND end_time >= NOW()`,
      [eventId]
    );
    
    if (eventResult.rowCount === 0) {
      return res.status(404).json({ message: 'Active event not found' });
    }
    
    // Check if already joined
    const existingResult = await db.query(
      `SELECT * FROM ${db.TABLES.EVENT_PARTICIPATION}
       WHERE event_id = $1 AND character_id = $2`,
      [eventId, characterId]
    );
    
    if (existingResult.rowCount > 0) {
      return res.status(400).json({ message: 'Already joined this event' });
    }
    
    // Join event
    const joinResult = await db.query(
      `INSERT INTO ${db.TABLES.EVENT_PARTICIPATION}
       (event_id, character_id)
       VALUES ($1, $2)
       RETURNING *`,
      [eventId, characterId]
    );
    
    res.status(201).json(joinResult.rows[0]);
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ message: 'Failed to join event' });
  }
};

/**
 * Leave an event
 */
const leaveEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const characterId = req.body.characterId;
    
    if (!characterId) {
      return res.status(400).json({ message: 'Character ID is required' });
    }
    
    // Check if already joined
    const existingResult = await db.query(
      `SELECT * FROM ${db.TABLES.EVENT_PARTICIPATION}
       WHERE event_id = $1 AND character_id = $2`,
      [eventId, characterId]
    );
    
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ message: 'Not participating in this event' });
    }
    
    // Leave event
    await db.query(
      `DELETE FROM ${db.TABLES.EVENT_PARTICIPATION}
       WHERE event_id = $1 AND character_id = $2`,
      [eventId, characterId]
    );
    
    res.status(200).json({ message: 'Successfully left event' });
  } catch (error) {
    console.error('Error leaving event:', error);
    res.status(500).json({ message: 'Failed to leave event' });
  }
};

/**
 * Get event leaderboard
 */
const getLeaderboard = async (req, res) => {
  try {
    const eventId = req.params.id;
    
    // Check if event exists
    const eventResult = await db.query(
      `SELECT * FROM ${db.TABLES.EVENT}
       WHERE id = $1`,
      [eventId]
    );
    
    if (eventResult.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Get leaderboard
    const leaderboardResult = await db.query(
      `SELECT ep.*, c.name as character_name, c.level
       FROM ${db.TABLES.EVENT_PARTICIPATION} ep
       JOIN ${db.TABLES.CHARACTERS} c ON ep.character_id = c.id
       WHERE ep.event_id = $1
       ORDER BY ep.score DESC
       LIMIT 100`,
      [eventId]
    );
    
    res.json(leaderboardResult.rows);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
};

/**
 * Create a new event (admin only)
 */
const createEvent = async (req, res) => {
  try {
    const { eventType, name, description, startTime, endTime, parameters, rewards } = req.body;
    
    // Basic validation
    if (!eventType || !name || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create event
    const result = await db.query(
      `INSERT INTO ${db.TABLES.EVENT}
       (event_type, name, description, start_time, end_time, parameters, rewards)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [eventType, name, description, startTime, endTime, parameters || {}, rewards || []]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Failed to create event' });
  }
};

/**
 * Update an existing event (admin only)
 */
const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { name, description, startTime, endTime, parameters, rewards } = req.body;
    
    // Get existing event
    const existingResult = await db.query(
      `SELECT * FROM ${db.TABLES.EVENT}
       WHERE id = $1`,
      [eventId]
    );
    
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const existingEvent = existingResult.rows[0];
    
    // Update event
    const result = await db.query(
      `UPDATE ${db.TABLES.EVENT}
       SET name = $1, description = $2, start_time = $3, end_time = $4,
           parameters = $5, rewards = $6
       WHERE id = $7
       RETURNING *`,
      [
        name || existingEvent.name,
        description !== undefined ? description : existingEvent.description,
        startTime || existingEvent.start_time,
        endTime || existingEvent.end_time,
        parameters || existingEvent.parameters,
        rewards || existingEvent.rewards,
        eventId
      ]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Failed to update event' });
  }
};

/**
 * Update balance parameters (admin only)
 */
const updateBalanceParameters = async (req, res) => {
  try {
    const { parameters } = req.body;
    
    if (!parameters || !Array.isArray(parameters)) {
      return res.status(400).json({ message: 'Invalid parameters format' });
    }
    
    // Start transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      
      for (const param of parameters) {
        if (!param.key || param.value === undefined) continue;
        
        const result = await client.query(
          `UPDATE ${db.TABLES.BALANCE_PARAMETERS}
           SET value = $1, last_updated = NOW()
           WHERE parameter_key = $2 AND value <> $1
           RETURNING *`,
          [param.value, param.key]
        );
        
        if (result.rowCount > 0) {
          results.push(result.rows[0]);
        }
      }
      
      await client.query('COMMIT');
      
      res.json({ 
        message: `Updated ${results.length} parameters`,
        updated: results
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating balance parameters:', error);
    res.status(500).json({ message: 'Failed to update balance parameters' });
  }
};

module.exports = {
  getActiveEvents,
  getEvent,
  joinEvent,
  leaveEvent,
  getLeaderboard,
  createEvent,
  updateEvent,
  updateBalanceParameters
}; 