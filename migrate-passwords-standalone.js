/**
 * Standalone Password Migration Script for Windows
 * 
 * Dit script werkt ZONDER npm run - gewoon direct uitvoeren!
 * Het converteert alle plaintext wachtwoorden naar scrypt hashes.
 * 
 * GEBRUIK:
 *   node migrate-passwords-standalone.js
 * 
 * VEREISTEN:
 *   - Node.js geïnstalleerd
 *   - DATABASE_URL environment variable ingesteld
 *     OF handmatig invullen hieronder (regel 25-30)
 */

import pg from 'pg';
import crypto from 'crypto';
import { promisify } from 'util';

const { Pool } = pg;
const scryptAsync = promisify(crypto.scrypt);

// ===== DATABASE CONFIGURATIE =====
// Optie 1: Gebruik DATABASE_URL environment variable
let databaseUrl = process.env.DATABASE_URL;

// Optie 2: OF vul handmatig in (verwijder // voor de regels hieronder)
// databaseUrl = "postgresql://user:password@host:port/database";
// Bijvoorbeeld:
// databaseUrl = "postgresql://postgres:mijnwachtwoord@localhost:5432/ambulance_db";

// ==================================

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function migratePasswords() {
  console.log('=== Password Migration Script ===\n');
  
  if (!databaseUrl) {
    console.error('ERROR: Database URL niet ingesteld!');
    console.error('\nOplossingen:');
    console.error('1. Stel DATABASE_URL environment variable in');
    console.error('2. OF bewerk dit bestand en vul de databaseUrl handmatig in (regel 25-30)\n');
    process.exit(1);
  }

  console.log('Verbinden met database...');
  const pool = new Pool({ connectionString: databaseUrl });

  const stats = {
    total: 0,
    alreadyHashed: 0,
    migrated: 0,
    failed: 0
  };

  try {
    // Haal alle users op
    console.log('Fetching all users from database...');
    const result = await pool.query('SELECT id, username, password FROM users ORDER BY id');
    const allUsers = result.rows;
    stats.total = allUsers.length;
    
    console.log(`Found ${stats.total} users\n`);

    for (const user of allUsers) {
      // Check if password is already hashed (format: hash.salt)
      const isHashed = user.password && user.password.includes('.');
      
      if (isHashed) {
        console.log(`✓ User "${user.username}" (ID: ${user.id}) - already hashed, skipping`);
        stats.alreadyHashed++;
        continue;
      }

      // Password is plaintext - needs migration
      console.log(`⚠ User "${user.username}" (ID: ${user.id}) - plaintext password detected, migrating...`);
      
      try {
        // Hash the plaintext password
        const hashedPassword = await hashPassword(user.password);
        
        // Update the database
        await pool.query(
          'UPDATE users SET password = $1 WHERE id = $2',
          [hashedPassword, user.id]
        );
        
        console.log(`✓ User "${user.username}" (ID: ${user.id}) - successfully migrated`);
        stats.migrated++;
      } catch (error) {
        console.error(`✗ User "${user.username}" (ID: ${user.id}) - migration failed:`, error.message);
        stats.failed++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total users processed: ${stats.total}`);
    console.log(`Already hashed: ${stats.alreadyHashed}`);
    console.log(`Successfully migrated: ${stats.migrated}`);
    console.log(`Failed: ${stats.failed}`);
    
    if (stats.failed > 0) {
      console.log('\n⚠ WARNING: Some migrations failed. Please review the errors above.');
      process.exit(1);
    } else if (stats.migrated > 0) {
      console.log('\n✓ All plaintext passwords successfully migrated to scrypt hashes!');
      console.log('Users can now login with their existing credentials.');
    } else {
      console.log('\n✓ No migration needed - all passwords already use scrypt hashing.');
    }

  } catch (error) {
    console.error('\n✗ FATAL ERROR during migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run migration
migratePasswords()
  .then(() => {
    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  });
