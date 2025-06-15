const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addMolUsers() {
  const client = await pool.connect();
  
  try {
    // Haal eerst station ID voor Mol op
    const stationResult = await client.query(
      "SELECT id FROM stations WHERE code = 'mol'"
    );
    
    if (stationResult.rows.length === 0) {
      console.log('Station Mol niet gevonden');
      return;
    }
    
    const molStationId = stationResult.rows[0].id;
    console.log(`Station Mol ID: ${molStationId}`);
    
    // Fictieve gebruikers voor post Mol
    const molUsers = [
      // Ambulanciers
      { username: 'LVER001', firstName: 'Luc', lastName: 'Verheyen', role: 'ambulancier', hours: 48 },
      { username: 'MJAN002', firstName: 'Marie', lastName: 'Janssens', role: 'ambulancier', hours: 36 },
      { username: 'PDIE003', firstName: 'Peter', lastName: 'Dierickx', role: 'ambulancier', hours: 40 },
      { username: 'SLEE004', firstName: 'Sarah', lastName: 'Leeflang', role: 'ambulancier', hours: 44 },
      { username: 'TPET005', firstName: 'Tom', lastName: 'Peters', role: 'ambulancier', hours: 52 },
      { username: 'AVAN006', firstName: 'Ann', lastName: 'Van Mol', role: 'ambulancier', hours: 36 },
      { username: 'BWIL007', firstName: 'Bart', lastName: 'Willems', role: 'ambulancier', hours: 48 },
      { username: 'EJAN008', firstName: 'Els', lastName: 'Janssen', role: 'ambulancier', hours: 40 },
      { username: 'FVDB009', firstName: 'Frank', lastName: 'Van den Berg', role: 'ambulancier', hours: 44 },
      { username: 'GROE010', firstName: 'Griet', lastName: 'Roels', role: 'ambulancier', hours: 36 },
      { username: 'HVDK011', firstName: 'Hans', lastName: 'Van de Kerk', role: 'ambulancier', hours: 48 },
      { username: 'ILEA012', firstName: 'Ingrid', lastName: 'Leys', role: 'ambulancier', hours: 52 },
      { username: 'JBRU013', firstName: 'Johan', lastName: 'Bruggeman', role: 'ambulancier', hours: 40 },
      { username: 'KVER014', firstName: 'Katrien', lastName: 'Vermeulen', role: 'ambulancier', hours: 44 },
      { username: 'LMAE015', firstName: 'Lieve', lastName: 'Maes', role: 'ambulancier', hours: 36 },
      { username: 'MVDS016', firstName: 'Marc', lastName: 'Van de Steen', role: 'ambulancier', hours: 48 },
      { username: 'NJAC017', firstName: 'Nancy', lastName: 'Jacobs', role: 'ambulancier', hours: 40 },
      { username: 'OHOE018', firstName: 'Oscar', lastName: 'Hoebeke', role: 'ambulancier', hours: 44 },
      { username: 'PVDK019', firstName: 'Patrick', lastName: 'Van de Kerckhove', role: 'ambulancier', hours: 52 },
      { username: 'QUIN020', firstName: 'Quinten', lastName: 'Quintens', role: 'ambulancier', hours: 36 },
      { username: 'RVER021', firstName: 'Rita', lastName: 'Verstraeten', role: 'ambulancier', hours: 48 },
      { username: 'SSEN022', firstName: 'Steven', lastName: 'Sengers', role: 'ambulancier', hours: 40 },
      { username: 'TVAN023', firstName: 'Tina', lastName: 'Van Looy', role: 'ambulancier', hours: 44 },
      { username: 'UBOE024', firstName: 'Urs', lastName: 'Boeckx', role: 'ambulancier', hours: 36 },
      { username: 'VWEY025', firstName: 'Vera', lastName: 'Weyns', role: 'ambulancier', hours: 48 },
      { username: 'WVDH026', firstName: 'Walter', lastName: 'Van den Heuvel', role: 'ambulancier', hours: 52 },
      { username: 'XAVI027', firstName: 'Xavier', lastName: 'Avilés', role: 'ambulancier', hours: 40 },
      { username: 'YELL028', firstName: 'Yves', lastName: 'Elleboudt', role: 'ambulancier', hours: 44 },
      { username: 'ZBRI029', firstName: 'Zara', lastName: 'Briers', role: 'ambulancier', hours: 36 },
      { username: 'AWOU030', firstName: 'Alex', lastName: 'Wouters', role: 'ambulancier', hours: 48 },
      { username: 'BKUI031', firstName: 'Brigitte', lastName: 'Kuijpers', role: 'ambulancier', hours: 40 },
      { username: 'CVDR032', firstName: 'Carl', lastName: 'Van der Roost', role: 'ambulancier', hours: 44 },
      { username: 'DSIM033', firstName: 'Diane', lastName: 'Simons', role: 'ambulancier', hours: 52 },
      { username: 'ENIJ034', firstName: 'Erik', lastName: 'Nijssen', role: 'ambulancier', hours: 36 },
      { username: 'FVAN035', firstName: 'Fabienne', lastName: 'Van Camp', role: 'ambulancier', hours: 48 },
      { username: 'GVDB036', firstName: 'Geert', lastName: 'Van den Broeck', role: 'ambulancier', hours: 40 },
      { username: 'HCAM037', firstName: 'Helena', lastName: 'Campenaerts', role: 'ambulancier', hours: 44 },
      { username: 'IVER038', firstName: 'Ivan', lastName: 'Verhulst', role: 'ambulancier', hours: 36 },
      { username: 'JVER039', firstName: 'Julie', lastName: 'Vermeulen', role: 'ambulancier', hours: 48 },
      
      // Admins
      { username: 'ADMIN_MOL_001', firstName: 'Admin', lastName: 'Mol Hoofd', role: 'admin', hours: 0 },
      { username: 'ADMIN_MOL_002', firstName: 'Admin', lastName: 'Mol Backup', role: 'admin', hours: 0 }
    ];
    
    console.log(`Toevoegen van ${molUsers.length} gebruikers voor post Mol...`);
    
    let addedCount = 0;
    
    for (const user of molUsers) {
      try {
        // Controleer of gebruiker al bestaat
        const existingUser = await client.query(
          "SELECT id FROM users WHERE username = $1 AND station_id = $2",
          [user.username, molStationId]
        );
        
        if (existingUser.rows.length === 0) {
          // Hash het default wachtwoord
          const defaultPassword = 'Mol2024!';
          
          await client.query(
            `INSERT INTO users (username, password, first_name, last_name, role, hours, station_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              user.username, 
              defaultPassword, // In productie zou dit gehashed moeten worden
              user.firstName, 
              user.lastName, 
              user.role, 
              user.hours, 
              molStationId
            ]
          );
          addedCount++;
          console.log(`✓ ${user.username} (${user.firstName} ${user.lastName})`);
        } else {
          console.log(`- ${user.username} bestaat al`);
        }
      } catch (error) {
        console.error(`Fout bij toevoegen ${user.username}:`, error.message);
      }
    }
    
    console.log(`\n${addedCount} nieuwe gebruikers toegevoegd voor post Mol`);
    console.log('Default wachtwoord voor alle nieuwe gebruikers: Mol2024!');
    
  } catch (error) {
    console.error('Fout bij toevoegen Mol gebruikers:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addMolUsers();