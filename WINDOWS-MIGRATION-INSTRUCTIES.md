# 🪟 Windows Server - Password Migration Instructies

## Probleem
Na de laatste update kan niemand meer inloggen. De error is: "Invalid stored password format - must be hashed with scrypt"

## Oplossing
Run het standalone migration script dat alle wachtwoorden veilig converteert.

---

## 📥 Stap 1: Download het script

Download `migrate-passwords-standalone.js` van GitHub of kopieer het handmatig naar je server.

**Zet het bestand in:** `C:\ambulance-planning\`

---

## ⚙️ Stap 2: Configureer database connectie

Open het bestand in een text editor (Notepad, VS Code, etc.):

```
notepad migrate-passwords-standalone.js
```

### Optie A: Environment Variable (aanbevolen)

Als je al een `.env` file hebt met `DATABASE_URL`, hoef je niets te doen!

### Optie B: Handmatig invullen

Zoek regel 25-30 en vul je database gegevens in:

```javascript
// Verwijder de // voor deze regel en vul in:
databaseUrl = "postgresql://gebruiker:wachtwoord@host:poort/database";

// Bijvoorbeeld:
databaseUrl = "postgresql://postgres:MijnWachtwoord123@localhost:5432/ambulance_db";
```

**Let op:** Vervang `gebruiker`, `wachtwoord`, `host`, `poort`, en `database` met jouw database gegevens.

**Waar vind ik deze gegevens?**
- In pgAdmin4: klik op je database → Properties → Connection tab
- In je `.env` file: zoek naar `DATABASE_URL`

Sla het bestand op.

---

## ▶️ Stap 3: Run het script

Open PowerShell in `C:\ambulance-planning` en run:

```powershell
node migrate-passwords-standalone.js
```

**Verwachte output:**

```
=== Password Migration Script ===

Verbinden met database...
Fetching all users from database...
Found 119 users

⚠ User "tvdd19" (ID: 17) - plaintext password detected, migrating...
✓ User "tvdd19" (ID: 17) - successfully migrated
⚠ User "rove319" (ID: 16) - plaintext password detected, migrating...
✓ User "rove319" (ID: 16) - successfully migrated
...

=== Migration Summary ===
Total users processed: 119
Already hashed: 88
Successfully migrated: 31
Failed: 0

✓ All plaintext passwords successfully migrated to scrypt hashes!
Users can now login with their existing credentials.

✓ Migration completed successfully!
```

---

## 🔄 Stap 4: Herstart de applicatie

```powershell
# Als je PM2 gebruikt:
pm2 restart ambulance-planning

# Als je een Windows Service gebruikt:
net stop AmbulancePlanning
net start AmbulancePlanning

# Als je het handmatig draait:
# Stop de Node.js process (Ctrl+C in de terminal)
# Start opnieuw:
npm start
```

---

## ✅ Stap 5: Test inloggen

1. Open de applicatie in je browser
2. Selecteer een station
3. Log in met je gebruikersnaam en wachtwoord
4. **Succes!** Je bent ingelogd

---

## ❌ Troubleshooting

### "ERROR: Database URL niet ingesteld!"

**Probleem:** Het script kan de database niet vinden.

**Oplossing:**
1. Open het script in notepad
2. Scroll naar regel 25-30
3. Vul je database URL handmatig in (zie Stap 2, Optie B)

### "connection refused" of "ECONNREFUSED"

**Probleem:** Database is niet bereikbaar.

**Oplossing:**
1. Check of PostgreSQL draait (open Services → zoek PostgreSQL)
2. Verify dat de database credentials correct zijn
3. Check firewall settings
4. Test database verbinding in pgAdmin4

### "password authentication failed"

**Probleem:** Database wachtwoord is incorrect.

**Oplossing:**
1. Check het wachtwoord in pgAdmin4
2. Update het wachtwoord in het script (regel 25-30)

### "Some migrations failed"

**Probleem:** Sommige wachtwoorden konden niet worden geconverteerd.

**Oplossing:**
1. Bekijk de output om te zien welke users failed
2. Neem contact op met support

---

## 🔐 Wat doet dit script?

Het script:
1. ✅ Verbindt met je PostgreSQL database
2. ✅ Haalt alle 119 users op
3. ✅ Controleert elk wachtwoord:
   - Als het format `hash.salt` heeft → skip (al veilig)
   - Als het plaintext is → hash met scrypt
4. ✅ Update database met gehashte wachtwoorden
5. ✅ Gebruikers kunnen inloggen met hun **bestaande wachtwoorden**

**Belangrijk:** De migration verandert NIET de wachtwoorden zelf, alleen hoe ze opgeslagen zijn. Gebruikers typen nog steeds hetzelfde wachtwoord!

---

## 📞 Hulp nodig?

Als het niet lukt:
1. Check de error message in PowerShell
2. Verify database credentials
3. Test database verbinding in pgAdmin4
4. Neem screenshot van de error en vraag hulp

---

## ✅ Verificatie Checklist

- [ ] Script succesvol uitgevoerd zonder errors
- [ ] "Successfully migrated: 31" (of meer) in de output
- [ ] "Failed: 0" in de output
- [ ] Applicatie herstart
- [ ] Test inloggen werkt voor jou
- [ ] Test inloggen werkt voor een andere gebruiker

Als alle stappen ✅ zijn, is de migration succesvol! 🎉
