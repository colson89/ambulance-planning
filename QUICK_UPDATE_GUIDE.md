# Snelle Update Handleiding

## Voor Dagelijkse Updates (Veilig)

### Linux/Ubuntu:
```bash
# Een-commando update (behoudt database)
chmod +x update.sh && ./update.sh
```

### Windows:
```powershell
# PowerShell als Administrator
.\update.ps1
```

## Wat Gebeurt Er Automatisch:

1. **Backup** - Database en code worden automatisch opgeslagen
2. **Data Controle** - Voor/na vergelijking van gebruikers en shifts
3. **Veilige Stop** - Applicatie wordt correct gestopt
4. **Code Update** - Laatste versie vanaf Git
5. **Dependencies** - NPM packages bijgewerkt
6. **Database** - Alleen nieuwe schema wijzigingen (data blijft)
7. **Rebuild** - Nieuwe versie gebouwd
8. **Restart** - Applicatie herstart
9. **Test** - Functionaliteit gecontroleerd

## Database Wordt NOOIT Verloren:

- Automatische backup voor elke update
- Data integriteit controle
- Alleen schema wijzigingen, geen data verlies
- Rollback optie bij problemen

## Bij Problemen:

### Rollback (Linux):
```bash
# Naar vorige versie
git checkout HEAD~1
npm install && npm run build
pm2 restart ambulance-planning
```

### Rollback (Windows):
```powershell
# Naar vorige versie
git checkout HEAD~1
npm install; npm run build
Restart-Service "Ambulance Planning System"
```

### Database Herstellen:
```bash
# Laatste backup vinden
ls /var/backups/ambulance-planning/

# Database herstellen
pg_restore -U ambulance_user -d ambulance_planning backup_file.sql
```

## Update Schema - Wat Wordt Bijgewerkt:

✅ **Veilig (data behouden):**
- Nieuwe kolommen toegevoegd
- Nieuwe tabellen aangemaakt  
- Nieuwe indexen
- Code wijzigingen
- Nieuwe functionaliteiten

❌ **Destructief (vermeden):**
- Kolommen verwijderd
- Tabellen verwijderd
- Data wijzigingen

## Monitoring Na Update:

```bash
# Status controleren
pm2 status
pm2 logs ambulance-planning

# Database controleren  
psql -c "SELECT COUNT(*) FROM users;"

# Website testen
curl http://localhost:5000
```

---

**Regel: Updates zijn veilig en automatisch - database blijft intact!**