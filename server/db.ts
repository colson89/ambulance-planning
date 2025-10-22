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

// Use Client for Drizzle ORM
export const client = new Client({ connectionString: DATABASE_URL });
client.connect();
export const db = drizzle(client, { schema });
