// Script voor het specifiek genereren van voorkeuren voor Rob Verstrepen
// Met exact 25% beschikbaarheid voor mei 2025
import fetch from 'node-fetch';

async function login() {
  const loginResponse = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ROVE319', password: 'admin123' }),
    credentials: 'include'
  });

  if (!loginResponse.ok) {
    throw new Error('Login failed');
  }

  return loginResponse.headers.get('set-cookie');
}

async function findRobVerstrepen(cookie) {
  const usersResponse = await fetch('http://localhost:5000/api/users', {
    headers: { Cookie: cookie }
  });

  if (!usersResponse.ok) {
    throw new Error('Failed to get users');
  }

  const users = await usersResponse.json();
  const robVerstrepen = users.find(user => 
    user.username === 'rvancampenhout' || 
    (user.firstName && user.firstName.toLowerCase().includes('rob') && 
     user.lastName && user.lastName.toLowerCase().includes('verstrepen'))
  );
  
  if (!robVerstrepen) {
    throw new Error('Rob Verstrepen not found');
  }
  
  return robVerstrepen;
}

async function clearPreferences(userId, cookie) {
  console.log(`Verwijderen van voorkeuren voor gebruiker ${userId} (Rob Verstrepen) voor mei 2025...`);
  
  const deleteResponse = await fetch(`http://localhost:5000/api/preferences/clearMonth/${userId}/5/2025`, {
    method: 'DELETE',
    headers: { Cookie: cookie }
  });
  
  if (!deleteResponse.ok) {
    throw new Error(`Failed to delete preferences for user ${userId}`);
  }
  
  const result = await deleteResponse.json();
  console.log(result.message);
}

async function generatePreferencesForRob(userId, cookie) {
  console.log(`Genereren van nieuwe voorkeuren voor Rob Verstrepen (ID: ${userId}) met exact 25% beschikbaarheid...`);
  
  const daysInMay = 31;
  const year = 2025;
  const month = 5;
  
  // Exact 8 dagen (ongeveer 25%) beschikbaar maken, volledig willekeurig verdeeld
  const availableDays = [];
  while (availableDays.length < 8) {
    const randomDay = Math.floor(Math.random() * daysInMay) + 1;
    if (!availableDays.includes(randomDay)) {
      availableDays.push(randomDay);
    }
  }
  
  console.log(`Geselecteerde beschikbare dagen voor Rob: ${availableDays.join(', ')}`);
  
  let createdPreferences = 0;
  
  // Voor elke dag in mei
  for (let day = 1; day <= daysInMay; day++) {
    const date = new Date(year, month - 1, day);
    
    // Als de dag in de lijst van beschikbare dagen staat
    if (availableDays.includes(day)) {
      // Willekeurig dag of nacht shift
      const shiftType = Math.random() < 0.5 ? 'day' : 'night';
      
      // 75% kans op volledige shift, 25% op halve shift
      const preferenceType = Math.random() < 0.75 ? 'full' : (Math.random() < 0.5 ? 'first' : 'second');
      
      // Bepaal start- en eindtijden
      const startTime = new Date(date);
      const endTime = new Date(date);
      
      if (shiftType === 'day') {
        if (preferenceType === 'full') {
          startTime.setHours(7, 0, 0, 0);
          endTime.setHours(19, 0, 0, 0);
        } else if (preferenceType === 'first') {
          startTime.setHours(7, 0, 0, 0);
          endTime.setHours(13, 0, 0, 0);
        } else { // second
          startTime.setHours(13, 0, 0, 0);
          endTime.setHours(19, 0, 0, 0);
        }
      } else { // night
        if (preferenceType === 'full') {
          startTime.setHours(19, 0, 0, 0);
          endTime.setDate(endTime.getDate() + 1);
          endTime.setHours(7, 0, 0, 0);
        } else if (preferenceType === 'first') {
          startTime.setHours(19, 0, 0, 0);
          endTime.setHours(23, 0, 0, 0);
        } else { // second
          startTime.setHours(23, 0, 0, 0);
          endTime.setDate(endTime.getDate() + 1);
          endTime.setHours(7, 0, 0, 0);
        }
      }
      
      // Creëer de voorkeur
      const preferenceData = {
        userId,
        date: date.toISOString(),
        type: shiftType,
        preferenceType,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        month,
        year,
        canSplit: preferenceType === 'full' && Math.random() < 0.2,
        notes: `Handmatig gegenereerd voor test (${preferenceType} ${shiftType} shift)`
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
          const errorText = await response.text();
          console.error(`Failed to create preference for day ${day}:`, errorText);
        } else {
          console.log(`Created preference for day ${day}: ${shiftType} - ${preferenceType}`);
          createdPreferences++;
        }
      } catch (error) {
        console.error(`Error creating preference for day ${day}:`, error.message);
      }
    } else {
      // 25% kans expliciet onbeschikbaar, anders neutraal
      if (Math.random() < 0.25) {
        const preferenceData = {
          userId,
          date: date.toISOString(),
          type: 'unavailable',
          month,
          year,
          notes: 'Handmatig gegenereerd voor test (niet beschikbaar)'
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
            const errorText = await response.text();
            console.error(`Failed to create unavailable preference for day ${day}:`, errorText);
          } else {
            console.log(`Created unavailable preference for day ${day}`);
            createdPreferences++;
          }
        } catch (error) {
          console.error(`Error creating unavailable preference for day ${day}:`, error.message);
        }
      }
      // Anders doen we niets (neutraal)
    }
  }
  
  console.log(`Completed preference generation for Rob Verstrepen. Created ${createdPreferences} preferences, with 8 available days (25.8% availability).`);
}

async function main() {
  try {
    const cookie = await login();
    console.log('Logged in successfully');
    
    const robVerstrepen = await findRobVerstrepen(cookie);
    console.log(`Found Rob Verstrepen: ID ${robVerstrepen.id}, ${robVerstrepen.firstName} ${robVerstrepen.lastName} (${robVerstrepen.username})`);
    
    await clearPreferences(robVerstrepen.id, cookie);
    await generatePreferencesForRob(robVerstrepen.id, cookie);
    
    console.log('Simulation complete for Rob Verstrepen');
  } catch (error) {
    console.error(`Simulation failed: ${error.message}`);
  }
}

// Start het script
main();