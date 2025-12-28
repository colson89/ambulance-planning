import { Client, Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// For development, use the uploaded server configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ambulance_user:DGHKempen005@localhost:5432/ambulance_planning';

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Using database URL:", DATABASE_URL.replace(/:[^:@]*@/, ':***@'));

// Use Pool for session store (connect-pg-simple requires it)
export const pool = new Pool({ connectionString: DATABASE_URL });

// Error handling for pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit - just log the error and let the pool handle reconnection
});

// Use Client for Drizzle ORM
export const client = new Client({ connectionString: DATABASE_URL });

// Error handling for client
client.on('error', (err) => {
  console.error('Database client error:', err);
  // Don't exit - log and continue
});

// Connect with error handling
client.connect().catch((err) => {
  console.error('Failed to connect to database:', err);
  // Application will continue but database operations will fail
});

export const db = drizzle(client, { schema });
