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
  
  // Verwijder eerste alle bestaande voorkeuren voor deze gebruiker
  try {
    const deleteResponse = await fetch(`http://localhost:5000/api/preferences/clearMonth/${userId}/5/2025`, {
      method: 'DELETE',
      headers: { Cookie: cookie }
    });
    
    if (deleteResponse.ok) {
      console.log(`Deleted existing preferences for user ${userId} for May 2025`);
    } else {
      console.error(`Failed to delete preferences for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error deleting preferences: ${error.message}`);
  }
  
  // Mei 2025 heeft 31 dagen
  const daysInMay = 31;
  const year = 2025;
  const month = 5;
  
  let createdPreferences = 0;
  
  // Voor elke dag in mei
  for (let day = 1; day <= daysInMay; day++) {
    // Verschillende patronen voor verschillende gebruikers
    // Voor even gebruiker IDs, meer nachtshifts
    // Voor oneven gebruiker IDs, meer dagshifts
    const isEvenUserId = userId % 2 === 0;
    
    // Weekend dagen (vrijdag, zaterdag, zondag) hebben andere patronen
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 is zondag, 6 is zaterdag
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // alleen zaterdag en zondag
    
    // Random beschikbaarheid - slechts 25% kans op beschikbaarheid
    const isAvailable = Math.random() < 0.25;
    
    if (isAvailable) {
      // Bepalen of het een dag of nachtshift is
      // Even IDs hebben meer voorkeur voor nachtshifts
      const preferNight = isEvenUserId ? Math.random() < 0.7 : Math.random() < 0.3;
      
      // Type shift
      const shiftType = preferNight ? "night" : "day";
      
      // Bepalen van het voorkeurtype (full, first, second)
      // 75% kans op volledige shift, 25% kans op halve shift
      const isFullShift = Math.random() < 0.75;
      const preferenceType = isFullShift ? "full" : (Math.random() < 0.5 ? "first" : "second");
      
      await createPreference(userId, day, month, year, shiftType, preferenceType, cookie);
      createdPreferences++;
    } else {
      // 25% kans dat we expliciet onbeschikbaarheid markeren, anders laten we het neutraal
      const markAsUnavailable = Math.random() < 0.25;
      
      if (markAsUnavailable) {
        // 50/50 kans voor dag of nacht onbeschikbaarheid
        const shiftType = Math.random() < 0.5 ? "day" : "night";
        await createPreference(userId, day, month, year, shiftType, "unavailable", cookie);
      }
      // anders doen we niets, wat als neutrale voorkeur wordt beschouwd
    }
  }
  
  console.log(`Completed preference generation for user ${userId}. Created ${createdPreferences} available shifts (~${Math.round(createdPreferences/daysInMay*100)}% availability).`);
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