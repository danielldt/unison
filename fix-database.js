/**
 * Database Repair Script
 * Run this script to fix database structure issues.
 * 
 * Usage: node fix-database.js
 */

const { initDatabase } = require('./src/server/db/database');
const setupDatabase = require('./src/server/db/setupDatabase');
const runMigrations = require('./src/server/db/migrate');

console.log('=== Database Repair Tool ===');
console.log('This will attempt to repair the database schema');
console.log('Make sure the database is accessible\n');

// Run all database initialization and migration steps
async function repairDatabase() {
  try {
    console.log('1. Initializing database connection...');
    await initDatabase();
    console.log('✓ Database connection established\n');
    
    console.log('2. Running database setup...');
    await setupDatabase();
    console.log('✓ Database setup completed\n');
    
    console.log('3. Running migrations...');
    await runMigrations();
    console.log('✓ Migrations completed\n');
    
    console.log('Database repair completed successfully!');
    console.log('You can now restart your application.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database repair failed:');
    console.error(error);
    process.exit(1);
  }
}

// Start the repair process
repairDatabase(); 