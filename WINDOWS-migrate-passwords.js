/**
 * ✨ DIRECT WERKEND Password Migration Script
 * 
 * Voor: DGH Brandweerzone Kempen - Ambulance Planning
 * Database: ambulance_planning op localhost
 * 
 * GEWOON UITVOEREN - GEEN CONFIGURATIE NODIG!
 *   node WINDOWS-migrate-passwords.js
 */

import pg from 'pg';
import crypto from 'crypto';
import { promisify } from 'util';

const { Pool } = pg;
const scryptAsync = promisify(crypto.scrypt);

// Database configuratie voor jouw Windows server
const DATABASE_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'ambulance_planning',
  user: 'ambulance_user',
  password: 'DGHKempen005'
};

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function migratePasswords() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   🚑 Password Migration - Ambulance Planning');
  console.log('   DGH Brandweerzone Kempen');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('🔌 Verbinden met database ambulance_planning...');
  const pool = new Pool(DATABASE_CONFIG);

  const stats = {
    total: 0,
    alreadyHashed: 0,
    migrated: 0,
    failed: 0
  };

  try {
    // Test database verbinding
    await pool.query('SELECT 1');
    console.log('✓ Database verbinding succesvol!\n');

    // Haal alle users op
    console.log('📊 Alle gebruikers ophalen uit database...');
    const result = await pool.query('SELECT id, username, password FROM users ORDER BY id');
    const allUsers = result.rows;
    stats.total = allUsers.length;
    
    console.log(`✓ ${stats.total} gebruikers gevonden\n`);
    console.log('⚙️  Migration starten...\n');

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

    console.log('\n═══════════════════════════════════════════════════');
    console.log('                  📋 SAMENVATTING');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Totaal verwerkt:      ${stats.total} gebruikers`);
    console.log(`Al beveiligd:         ${stats.alreadyHashed} gebruikers ✓`);
    console.log(`Nieuw gemigreerd:     ${stats.migrated} gebruikers ⚡`);
    console.log(`Mislukt:              ${stats.failed} gebruikers`);
    console.log('═══════════════════════════════════════════════════\n');
    
    if (stats.failed > 0) {
      console.log('⚠️  WAARSCHUWING: Sommige migraties zijn mislukt!');
      console.log('   Bekijk de errors hierboven voor details.\n');
      process.exit(1);
    } else if (stats.migrated > 0) {
      console.log('🎉 SUCCES! Alle plaintext wachtwoorden zijn veilig gemigreerd!');
      console.log('   Gebruikers kunnen nu inloggen met hun bestaande wachtwoorden.\n');
      console.log('📌 VOLGENDE STAP: Herstart je applicatie!');
      console.log('   pm2 restart ambulance-planning\n');
    } else {
      console.log('✅ Geen migratie nodig - alle wachtwoorden zijn al beveiligd!');
      console.log('   Het systeem gebruikt al scrypt hashing.\n');
    }

  } catch (error) {
    console.error('\n❌ FOUT tijdens migration:', error.message);
    
    // Geef specifieke hulp op basis van de error
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 TIP: Database is niet bereikbaar.');
      console.error('   - Check of PostgreSQL draait (Services → PostgreSQL)');
      console.error('   - Controleer of poort 5432 open is');
    } else if (error.message.includes('password authentication failed')) {
      console.error('\n💡 TIP: Wachtwoord is incorrect.');
      console.error('   - Controleer PGPASSWORD in .env file');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('\n💡 TIP: Database ambulance_planning bestaat niet.');
      console.error('   - Controleer database naam in pgAdmin4');
    }
    
    console.error('');
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database verbinding gesloten.\n');
  }
}

// Run migration
console.log('\n🚀 Starting migration...\n');
migratePasswords()
  .then(() => {
    console.log('═══════════════════════════════════════════════════');
    console.log('          ✅ MIGRATION VOLTOOID!');
    console.log('═══════════════════════════════════════════════════\n');
    process.exit(0);
  })
  .catch((error) => {
    console.log('═══════════════════════════════════════════════════');
    console.log('          ❌ MIGRATION MISLUKT');
    console.log('═══════════════════════════════════════════════════\n');
    console.error('Fout:', error.message, '\n');
    process.exit(1);
  });
