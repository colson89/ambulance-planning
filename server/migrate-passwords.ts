import { Pool } from 'pg';
import { hashPassword } from './auth';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Password Migration Script
 * 
 * This script migrates plaintext passwords to scrypt hashes.
 * It safely converts passwords while preserving the original values
 * so users can still login with their existing credentials.
 * 
 * Usage: npm run migrate:passwords
 */

interface MigrationStats {
  total: number;
  alreadyHashed: number;
  migrated: number;
  failed: number;
}

async function migratePasswords() {
  console.log('=== Password Migration Script ===\n');
  
  // Get database connection from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  const stats: MigrationStats = {
    total: 0,
    alreadyHashed: 0,
    migrated: 0,
    failed: 0
  };

  try {
    console.log('Fetching all users from database...');
    const allUsers = await db.select().from(users);
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
        await db
          .update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, user.id));
        
        console.log(`✓ User "${user.username}" (ID: ${user.id}) - successfully migrated`);
        stats.migrated++;
      } catch (error) {
        console.error(`✗ User "${user.username}" (ID: ${user.id}) - migration failed:`, error);
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

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migratePasswords()
    .then(() => {
      console.log('\n✓ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Migration failed:', error);
      process.exit(1);
    });
}

export { migratePasswords };
