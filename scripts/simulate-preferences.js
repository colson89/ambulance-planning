// Script voor het genereren van beschikbaarheidssimulaties voor alle gebruikers voor mei 2025
// Gebruik node-fetch v3 met ES modules
import fetch from 'node-fetch';

async function login() {
  const loginResponse = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ROVE319', password: 'admin123' }), // Admin account
    credentials: 'include'
  });

  if (!loginResponse.ok) {
    throw new Error('Login failed');
  }

  return loginResponse.headers.get('set-cookie');
}

async function getUsers(cookie) {
  const usersResponse = await fetch('http://localhost:5000/api/users', {
    headers: { Cookie: cookie }
  });

  if (!usersResponse.ok) {
    throw new Error('Failed to get users');
  }

  return usersResponse.json();
}

// Function to generate random preferences for a user
async function generatePreferencesForUser(userId, cookie) {
  console.log(`Generating preferences for user ${userId}`);
  
  // Mei 2025 heeft 31 dagen
  const daysInMay = 31;
  const year = 2025;
  const month = 5;
  
  // Voor elke dag in mei
  for (let day = 1; day <= daysInMay; day++) {
    // Verschillende patronen voor verschillende gebruikers
    // Voor even gebruiker IDs, meer nachtshifts
    // Voor oneven gebruiker IDs, meer dagshifts
    const isEvenUserId = userId % 2 === 0;
    
    // Weekend dagen (vrijdag, zaterdag, zondag) hebben andere patronen
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 is zondag, 6 is zaterdag
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    
    // Random beschikbaarheid
    // 70% kans op beschikbaarheid
    const isAvailable = Math.random() < 0.7;
    
    if (isAvailable) {
      // Bepalen of het een dag of nachtshift is
      // Even IDs hebben meer voorkeur voor nachtshifts
      const preferNight = isEvenUserId ? Math.random() < 0.7 : Math.random() < 0.3;
      
      // Type shift
      const shiftType = preferNight ? "night" : "day";
      
      // Bepalen van het voorkeurtype (full, first, second)
      const preferenceTypes = ["full", "first", "second"];
      const preferenceType = preferenceTypes[Math.floor(Math.random() * preferenceTypes.length)];
      
      // Simuleer 80% volledige shift, 10% eerste helft, 10% tweede helft
      //const preferenceType = Math.random() < 0.8 ? "full" : (Math.random() < 0.5 ? "first" : "second");
      
      // Weekenddagen voor sommige gebruikers markeren als niet beschikbaar
      if (isWeekend && Math.random() < 0.4) {
        await createPreference(userId, day, month, year, shiftType, "unavailable", cookie);
      } else {
        await createPreference(userId, day, month, year, shiftType, preferenceType, cookie);
      }
    } else {
      // Als niet beschikbaar, markeer als onbeschikbaar
      // 50/50 kans voor dag of nacht onbeschikbaarheid
      const shiftType = Math.random() < 0.5 ? "day" : "night";
      await createPreference(userId, day, month, year, shiftType, "unavailable", cookie);
    }
  }
}

// Functie om een voorkeur aan te maken
async function createPreference(userId, day, month, year, shiftType, preferenceType, cookie) {
  const date = new Date(year, month - 1, day);
  const preferenceData = {
    userId,
    date: date.toISOString(),
    shiftType,
    preferenceType,
    month,
    year,
    notes: `Automatisch gegenereerd voor simulatie`
  };
  
  try {
    const response = await fetch('http://localhost:5000/api/preferences', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Cookie: cookie
      },
      body: JSON.stringify(preferenceData)
    });
    
    if (!response.ok) {
      console.error(`Failed to create preference for user ${userId} on ${day}/${month}/${year}`);
      const errorText = await response.text();
      console.error(errorText);
    } else {
      console.log(`Created preference for user ${userId} on ${day}/${month}/${year}: ${shiftType} - ${preferenceType}`);
    }
  } catch (error) {
    console.error(`Error creating preference: ${error.message}`);
  }
}

// Hoofdfunctie
async function main() {
  try {
    const cookie = await login();
    console.log('Logged in successfully');
    
    const users = await getUsers(cookie);
    console.log(`Found ${users.length} users`);
    
    // Genereer voorkeuren voor alle gebruikers (behalve de admin)
    for (const user of users) {
      // Skip admin rol
      if (user.role !== 'admin') {
        await generatePreferencesForUser(user.id, cookie);
      }
    }
    
    console.log('Simulation complete');
  } catch (error) {
    console.error(`Simulation failed: ${error.message}`);
  }
}

// Voer de simulatie uit
main();