import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuratie voor neon database
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

// Environment variables laden als dat nodig is
config();

// Controleren of DATABASE_URL bestaat
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable niet gevonden');
}

const ambulanciers = [
  { username: "pverhulst", password: "Ambulance123", firstName: "Peter", lastName: "Verhulst", hours: 24, role: "ambulancier" },
  { username: "jvermeulen", password: "Ambulance123", firstName: "Jonas", lastName: "Vermeulen", hours: 24, role: "ambulancier" },
  { username: "mmaes", password: "Ambulance123", firstName: "Mieke", lastName: "Maes", hours: 24, role: "ambulancier" },
  { username: "tvandenberg", password: "Ambulance123", firstName: "Tom", lastName: "Van den Berg", hours: 12, role: "ambulancier" },
  { username: "svandamme", password: "Ambulance123", firstName: "Sofia", lastName: "Van Damme", hours: 36, role: "ambulancier" },
  { username: "kvandenheuvel", password: "Ambulance123", firstName: "Koen", lastName: "Van den Heuvel", hours: 24, role: "ambulancier" },
  { username: "rvancampenhout", password: "Ambulance123", firstName: "Rik", lastName: "Van Campenhout", hours: 24, role: "ambulancier" },
  { username: "jdekoning", password: "Ambulance123", firstName: "Jasper", lastName: "De Koning", hours: 12, role: "ambulancier" },
  { username: "ewillems", password: "Ambulance123", firstName: "Emma", lastName: "Willems", hours: 24, role: "ambulancier" },
  { username: "bvdaele", password: "Ambulance123", firstName: "Bram", lastName: "Van Daele", hours: 36, role: "ambulancier" },
  { username: "smartens", password: "Ambulance123", firstName: "Sophie", lastName: "Martens", hours: 24, role: "ambulancier" },
  { username: "adebruyn", password: "Ambulance123", firstName: "An", lastName: "De Bruyn", hours: 24, role: "ambulancier" },
  { username: "msegers", password: "Ambulance123", firstName: "Marc", lastName: "Segers", hours: 12, role: "ambulancier" },
  { username: "ndevos", password: "Ambulance123", firstName: "Niels", lastName: "De Vos", hours: 36, role: "ambulancier" }
];

// Dit script voegt direct ambulanciers toe aan de database
async function addAmbulanciers() {
  try {
    // Database verbinding
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    console.log("Ambulanciers toevoegen aan de database...");
    
    for (const user of ambulanciers) {
      try {
        // Controleer of gebruiker al bestaat
        const existingUser = await pool.query(
          'SELECT * FROM users WHERE username = $1',
          [user.username]
        );
        
        if (existingUser.rows.length === 0) {
          // Hash het wachtwoord
          const password = user.password;
          
          // Voeg gebruiker toe
          await pool.query(
            'INSERT INTO users (username, password, "firstName", "lastName", role, "isAdmin", hours) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [user.username, password, user.firstName, user.lastName, user.role, false, user.hours]
          );
          
          console.log(`Ambulancier ${user.firstName} ${user.lastName} toegevoegd.`);
        } else {
          console.log(`Gebruiker ${user.username} bestaat al.`);
        }
      } catch (userError) {
        console.error(`Fout bij toevoegen van gebruiker ${user.username}:`, userError);
      }
    }
    
    console.log("Klaar met toevoegen van ambulanciers.");
    
    // Sluit de pool
    await pool.end();
  } catch (error) {
    console.error("Fout bij script uitvoering:", error);
  }
}

// Voer functie uit
addAmbulanciers();