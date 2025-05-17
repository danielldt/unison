# Unison Legends

A classless RPG with seed-based procedural generation.

## Docker Setup

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Running with Docker

1. Clone the repository:
   ```
   git clone <repository-url>
   cd unison
   ```

2. Build and start the Docker containers:
   ```
   docker-compose up -d
   ```

   This will start:
   - The Unison Legends application on port 8080
   - PostgreSQL database on port 5432
   - Redis on port 6379

3. View logs:
   ```
   docker-compose logs -f
   ```

4. Access the application:
   - API: http://localhost:8080/api
   - Frontend (if built): http://localhost:8080

### Stopping Docker Containers

```
docker-compose down
```

To remove volumes (database data):
```
docker-compose down -v
```

## Development Setup (Without Docker)

1. Install dependencies:
   ```
   npm run install-all
   ```

2. Start development servers:
   ```
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with:

```
NODE_ENV=development
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/unison
USE_REDIS=false
```

For production, use:
```
NODE_ENV=production
PORT=8080
DATABASE_URL=postgres://postgres:postgres@postgres:5432/unison
REDIS_URL=redis://redis:6379
USE_REDIS=true
JWT_SECRET=your_secret_key
```

## Project Structure

- `src/server` - Backend server code
- `src/client` - Frontend client code
- `src/server/game` - Game logic
- `src/server/api` - API endpoints
- `src/server/db` - Database access

## Seed-Based Procedural Generation

The game uses deterministic seed-based procedural generation to create consistent content:

### Key Components

1. **Seed Generation**
   - Uses numeric seeds derived from string input or timestamps
   - Provides consistent RNG for all procedural elements
   - Supports balance modifiers to adjust drop rates and difficulty

2. **Procedural Content**
   - **Dungeons**: Generated with consistent layouts, mobs, and difficulty based on seed
   - **Items**: Stats, properties, and rarities determined by seed values
   - **Mobs**: Abilities, stats, and behaviors derived from seeds

3. **Loot System**
   - Drop rates and rarities affected by dungeon type and difficulty
   - Boss drops have enhanced rarity chances
   - Item stats scale with player level and rarity

### Enhancement System

The enhancement system follows a tiered approach:
- +0 to +9: 100% success rate
- +10 to +20: 80% success rate
- +21 to +30: 70% success rate
- +31 to +40: 60% success rate
- +41 to +50: 50% success rate
- +51 to +60: 40% success rate
- +61 to +70: 30% success rate
- +71 to +80: 20% success rate
- +81 to +90: 10% success rate
- +91 to +99: 5% success rate

Failure resets enhancement level to +9. Special bonuses are awarded at milestone enhancement levels.

### Fusion System

The fusion system allows rerolling items:
- Requires 5 items of the same rarity and type
- Creates a new item with the same rarity but different stats
- Enhanced items provide a 10% chance for one rarity higher result

## Getting Started

### Prerequisites

- Node.js (v14+)
- PostgreSQL

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/unison-legends.git
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create database and configure connection in `.env`

4. Run migrations
   ```
   npm run migrate
   ```

5. Start development server
   ```
   npm run dev
   ```

## Architecture

- **Backend**: Node.js, Express, PostgreSQL, Colyseus
- **Frontend**: React, Zustand, SCSS
- **Database**: Entity relationship model for users, characters, inventory
- **Real-time**: WebSocket-based communication for dungeon gameplay 