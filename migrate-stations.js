import { db } from './server/db.js';
import { stations, users, shifts, shiftPreferences, weekdayConfigs, userComments } from './shared/schema.js';
import { sql } from 'drizzle-orm';

async function migrateToMultiStation() {
  console.log('Starting multi-station migration...');
  
  try {
    // 1. Create stations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // 2. Insert default stations
    const [westerloStation] = await db.insert(stations).values([
      { name: 'westerlo', code: 'westerlo', displayName: 'ZW Westerlo' },
      { name: 'mol', code: 'mol', displayName: 'ZW Mol' }
    ]).returning();
    
    console.log('Created stations:', westerloStation);
    
    // 3. Add stationId column to existing tables
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS station_id INTEGER REFERENCES stations(id) DEFAULT 1
    `);
    
    await db.execute(sql`
      ALTER TABLE shifts ADD COLUMN IF NOT EXISTS station_id INTEGER REFERENCES stations(id) DEFAULT 1
    `);
    
    await db.execute(sql`
      ALTER TABLE shift_preferences ADD COLUMN IF NOT EXISTS station_id INTEGER REFERENCES stations(id) DEFAULT 1
    `);
    
    await db.execute(sql`
      ALTER TABLE weekday_configs ADD COLUMN IF NOT EXISTS station_id INTEGER REFERENCES stations(id) DEFAULT 1
    `);
    
    await db.execute(sql`
      ALTER TABLE user_comments ADD COLUMN IF NOT EXISTS station_id INTEGER REFERENCES stations(id) DEFAULT 1
    `);
    
    // 4. Update existing data to use Westerlo station (id=1)
    await db.execute(sql`UPDATE users SET station_id = 1 WHERE station_id IS NULL`);
    await db.execute(sql`UPDATE shifts SET station_id = 1 WHERE station_id IS NULL`);
    await db.execute(sql`UPDATE shift_preferences SET station_id = 1 WHERE station_id IS NULL`);
    await db.execute(sql`UPDATE weekday_configs SET station_id = 1 WHERE station_id IS NULL`);
    await db.execute(sql`UPDATE user_comments SET station_id = 1 WHERE station_id IS NULL`);
    
    // 5. Make station_id NOT NULL
    await db.execute(sql`ALTER TABLE users ALTER COLUMN station_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE shifts ALTER COLUMN station_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE shift_preferences ALTER COLUMN station_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE weekday_configs ALTER COLUMN station_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE user_comments ALTER COLUMN station_id SET NOT NULL`);
    
    // 6. Create weekday configs for Mol station (copy from Westerlo)
    const westerloConfigs = await db.select().from(weekdayConfigs).where(sql`station_id = 1`);
    if (westerloConfigs.length > 0) {
      const molConfigs = westerloConfigs.map(config => ({
        stationId: 2, // Mol station
        dayOfWeek: config.dayOfWeek,
        enableDayShifts: config.enableDayShifts,
        enableNightShifts: config.enableNightShifts,
        dayShiftCount: config.dayShiftCount,
        nightShiftCount: config.nightShiftCount
      }));
      await db.insert(weekdayConfigs).values(molConfigs);
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrateToMultiStation().catch(console.error);