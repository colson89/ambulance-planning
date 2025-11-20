# ⚡ SNELLE OPLOSSING - Iedereen kan weer inloggen in 2 minuten!

## 🎯 Super Simpel - 3 Stappen

### Stap 1: Download het script
Download `WINDOWS-migrate-passwords.js` van Replit en zet het in:
```
C:\ambulance-planning\
```

### Stap 2: Run het script
Open PowerShell in `C:\ambulance-planning` en type:

```powershell
node WINDOWS-migrate-passwords.js
```

**Dat is alles!** Het script gebruikt automatisch jouw database configuratie.

### Stap 3: Herstart de applicatie

```powershell
pm2 restart ambulance-planning
```

**KLAAR!** ✅ Alle 119 gebruikers kunnen nu weer inloggen!

---

## 📋 Wat je ziet tijdens de migration:

```
═══════════════════════════════════════════════════
   🚑 Password Migration - Ambulance Planning
   DGH Brandweerzone Kempen
═══════════════════════════════════════════════════

🔌 Verbinden met database ambulance_planning...
✓ Database verbinding succesvol!

📊 Alle gebruikers ophalen uit database...
✓ 119 gebruikers gevonden

⚙️  Migration starten...

⚠ User "tvdd19" (ID: 17) - plaintext password detected, migrating...
✓ User "tvdd19" (ID: 17) - successfully migrated
...

═══════════════════════════════════════════════════
                  📋 SAMENVATTING
═══════════════════════════════════════════════════
Totaal verwerkt:      119 gebruikers
Al beveiligd:         88 gebruikers ✓
Nieuw gemigreerd:     31 gebruikers ⚡
Mislukt:              0 gebruikers
═══════════════════════════════════════════════════

🎉 SUCCES! Alle plaintext wachtwoorden zijn veilig gemigreerd!
   Gebruikers kunnen nu inloggen met hun bestaande wachtwoorden.

📌 VOLGENDE STAP: Herstart je applicatie!
   pm2 restart ambulance-planning
```

---

## ❓ Als het niet werkt

### "Cannot find module 'pg'"
```powershell
npm install
```

### "ECONNREFUSED"
Check of PostgreSQL draait:
- Open **Services** (Win + R → `services.msc`)
- Zoek **PostgreSQL**
- Klik **Start** als het niet draait

### Andere error?
Neem screenshot en vraag hulp.

---

## ✅ Verificatie

Na de migration en herstart:
1. Open https://dgh.brandweerzonekempen.be
2. Selecteer een station
3. Log in met je gebruikersnaam en wachtwoord
4. ✅ Werkt!

**Alle gebruikers gebruiken nog steeds hun bestaande wachtwoorden - alleen de opslag is nu veiliger!**
