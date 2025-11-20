# Password Migration Guide - Windows Server Deployment

## Problem
Na de laatste security update kan niemand meer inloggen omdat de applicatie nu **alleen scrypt-gehashte wachtwoorden** accepteert. De oude plaintext wachtwoorden in de database werken niet meer.

## Oplossing
Deze migration converteert alle plaintext wachtwoorden naar veilige scrypt-hashes, zodat gebruikers kunnen inloggen met hun bestaande credentials.

---

## 🚀 Snelle Fix voor Windows Server

### Stap 1: Pull laatste code (als nog niet gedaan)
```bash
cd C:\pad\naar\je\project
git pull origin main
```

### Stap 2: Installeer dependencies
```bash
npm install
```

### Stap 3: Run de migration
```bash
npm run migrate:passwords
```

Je krijgt output zoals:
```
=== Password Migration Script ===

Fetching all users from database...
Found 119 users

⚠ User "tvdd19" (ID: 17) - plaintext password detected, migrating...
✓ User "tvdd19" (ID: 17) - successfully migrated
...

=== Migration Summary ===
Total users processed: 119
Already hashed: 88
Successfully migrated: 31
Failed: 0

✓ All plaintext passwords successfully migrated!
```

### Stap 4: Herstart de applicatie
```bash
# Als je PM2 gebruikt:
pm2 restart ambulance-planning

# Als je een Windows Service gebruikt:
net stop AmbulancePlanning
net start AmbulancePlanning

# Als je het handmatig draait:
# Stop de huidige Node.js process (Ctrl+C)
# Start opnieuw:
npm start
```

### Stap 5: Test inloggen
1. Open de applicatie in je browser
2. Selecteer een station
3. Log in met je gebruikersnaam en wachtwoord
4. ✅ Inloggen zou nu moeten werken!

---

## ⚠️ Troubleshooting

### "ERROR: DATABASE_URL environment variable not set"
**Probleem:** De migration kan de database niet vinden.

**Oplossing:** Zorg dat je `.env` file correct is ingesteld:
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

### "Migration failed: Connection refused"
**Probleem:** Database is niet bereikbaar.

**Oplossing:**
1. Check of PostgreSQL draait
2. Verify database credentials in `.env`
3. Check firewall settings

### "Some migrations failed"
**Probleem:** Sommige wachtwoorden konden niet worden geconverteerd.

**Oplossing:**
1. Bekijk de output om te zien welke users failed
2. Reset deze wachtwoorden handmatig via SQL:
   ```sql
   UPDATE users 
   SET password = 'temp.hash'
   WHERE username = 'problematic_user';
   ```
3. Laat de gebruiker inloggen en wachtwoord wijzigen via UI

---

## 🔄 Rollback Procedure

Als er iets misgaat en je wilt teruggaan naar de vorige versie:

### Optie 1: Git Reset (aanbevolen)
```bash
# Ga terug naar de vorige commit
git reset --hard HEAD~1

# Of naar een specifieke commit
git log --oneline -5  # Bekijk laatste commits
git reset --hard abc1234  # Gebruik de hash van de werkende versie

# Herstart applicatie
pm2 restart ambulance-planning
```

### Optie 2: Database Backup Restore
Als je een database backup hebt van voor de migration:
```bash
# Restore backup (voorbeeld voor PostgreSQL)
psql -h localhost -U postgres -d ambulance_db < backup_before_migration.sql

# Herstart applicatie
pm2 restart ambulance-planning
```

---

## 📋 Wat doet de migration?

Het script (`server/migrate-passwords.ts`):
1. ✅ Haalt alle users uit de database
2. ✅ Controleert elk wachtwoord:
   - Als het format `hash.salt` heeft → skip (al veilig)
   - Als het plaintext is → hash met scrypt
3. ✅ Update database met gehashte wachtwoorden
4. ✅ Gebruikers kunnen inloggen met hun **bestaande wachtwoorden**

**Belangrijk:** De migration verandert NIET de wachtwoorden zelf, alleen hoe ze opgeslagen zijn. Gebruikers typen nog steeds hetzelfde wachtwoord.

---

## 🔐 Veiligheid

### Waarom deze migration?
De oude versie sloeg wachtwoorden op als plaintext (onveilig). De nieuwe versie gebruikt **scrypt hashing**:
- ✅ Wachtwoorden zijn niet leesbaar in de database
- ✅ Beschermt tegen timing attacks
- ✅ Voldoet aan moderne security standards

### Wat verandert er voor gebruikers?
**Niets!** Gebruikers kunnen gewoon inloggen met hun bestaande wachtwoorden.

---

## 📞 Support

Als je problemen ondervindt:
1. Check de migration output voor error messages
2. Verify dat alle 119 users succesvol zijn gemigreerd
3. Test inloggen met meerdere accounts
4. Bij blijvende problemen: neem contact op met support

---

## ✅ Verificatie Checklist

- [ ] Git pull succesvol
- [ ] `npm install` zonder errors
- [ ] Migration gerund: `npm run migrate:passwords`
- [ ] Migration summary toont 0 failures
- [ ] Applicatie herstart
- [ ] Test inloggen met admin account
- [ ] Test inloggen met reguliere gebruiker
- [ ] Alle 119 users kunnen inloggen

Als alle stappen ✅ zijn, is de migration succesvol!
