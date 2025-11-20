/**
 * ✨ GEBRUIKSKLAAR Password Migration Script voor Windows
 * 
 * DIRECT UITVOEREN - GEEN CONFIGURATIE NODIG!
 * Het script vraagt zelf om database gegevens.
 * 
 * GEBRUIK:
 *   node migrate-passwords-standalone.js
 * 
 * VEREISTEN:
 *   - Node.js geïnstalleerd (al aanwezig als je npm hebt)
 */

import pg from 'pg';
import crypto from 'crypto';
import { promisify } from 'util';
import readline from 'readline';

const { Pool } = pg;
const scryptAsync = promisify(crypto.scrypt);

// ===== INTERACTIEVE DATABASE CONFIGURATIE =====
async function getDatabaseConfig() {
  // Check eerst of DATABASE_URL al bestaat
  if (process.env.DATABASE_URL) {
    console.log('✓ DATABASE_URL gevonden in environment variables\n');
    return process.env.DATABASE_URL;
  }

  // Zo niet, vraag de gebruiker om database gegevens
  console.log('📝 Database configuratie nodig\n');
  console.log('Je kunt deze gegevens vinden in pgAdmin4:');
  console.log('   Rechtsklik op database → Properties → Connection tab\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

  try {
    const host = await question('Database Host (bijv. localhost): ') || 'localhost';
    const port = await question('Database Port (bijv. 5432): ') || '5432';
    const database = await question('Database Naam (bijv. ambulance_db): ');
    const user = await question('Database Gebruiker (bijv. postgres): ') || 'postgres';
    const password = await question('Database Wachtwoord: ');

    rl.close();

    if (!database) {
      throw new Error('Database naam is verplicht!');
    }

    const databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;
    console.log('\n✓ Database configuratie ontvangen\n');
    return databaseUrl;

  } catch (error) {
    rl.close();
    throw error;
  }
}

// ==================================

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function migratePasswords() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   🚑 Password Migration Script - Ambulance Planning');
  console.log('═══════════════════════════════════════════════════\n');
  
  // Haal database configuratie op (van environment of vraag gebruiker)
  const databaseUrl = await getDatabaseConfig();

  console.log('🔌 Verbinden met database...');
  const pool = new Pool({ connectionString: databaseUrl });

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
      console.error('   - Check of PostgreSQL draait');
      console.error('   - Controleer host en port gegevens');
    } else if (error.message.includes('password authentication failed')) {
      console.error('\n💡 TIP: Wachtwoord is incorrect.');
      console.error('   - Controleer database wachtwoord in pgAdmin4');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('\n💡 TIP: Database bestaat niet.');
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
