# Update Strategie - Database Behoud

## Veilige Update Procedure

### Pre-Update Checklist
- [ ] Backup maken van database en code
- [ ] Update plannen tijdens rustige periode
- [ ] Rollback plan voorbereiden
- [ ] Applicatie status controleren

## Stap 1: Automatische Backup Maken

### Linux/Ubuntu:
```bash
# Backup script uitvoeren
./backup.sh

# Controleer backup
ls -la /var/backups/ambulance-planning/
```

### Windows:
```powershell
# PowerShell backup
.\windows-backup.ps1

# Controleer backup
Get-ChildItem C:\Backups\ambulance-planning\
```

## Stap 2: Applicatie Stoppen

### Linux (PM2):
```bash
# Status controleren
pm2 status

# Applicatie stoppen
pm2 stop ambulance-planning

# Controleren dat gestopt is
pm2 status
```

### Windows Service:
```cmd
# Service stoppen
sc stop "Ambulance Planning System"

# Status controleren
sc query "Ambulance Planning System"
```

## Stap 3: Code Updates

### Optie A: Git Pull (Aanbevolen)
```bash
# Huidige branch controleren
git status

# Laatste versie ophalen
git pull origin main

# Dependencies updaten (indien nodig)
npm install

# Database migraties (alleen nieuwe wijzigingen)
npm run db:push
```

### Optie B: Handmatige Update
```bash
# Backup huidige code
cp -r /home/ubuntu/ambulance-planning /home/ubuntu/ambulance-planning-backup

# Nieuwe bestanden kopiëren (overschrijf alleen gewijzigde bestanden)
# Bewaar .env bestand!
```

## Stap 4: Database Migraties

### Veilige Database Updates:
```bash
# Test database connectie
psql -h localhost -U ambulance_user -d ambulance_planning -c "SELECT 1;"

# Drizzle schema push (alleen nieuwe wijzigingen)
npm run db:push

# Controleer dat tabellen intact zijn
psql -h localhost -U ambulance_user -d ambulance_planning -c "\dt"
```

### Database Schema Verificatie:
```sql
-- Controleer belangrijke tabellen
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM shifts;
SELECT COUNT(*) FROM shift_preferences;
SELECT COUNT(*) FROM stations;
```

## Stap 5: Applicatie Rebuilden

```bash
# Nieuwe dependencies installeren
npm install

# Applicatie rebuilden voor productie
npm run build

# Controleer build status
ls -la dist/
```

## Stap 6: Applicatie Herstarten

### Linux:
```bash
# Start applicatie
pm2 start ambulance-planning

# Controleer status
pm2 status

# Logs controleren
pm2 logs ambulance-planning --lines 20
```

### Windows:
```cmd
# Service starten
sc start "Ambulance Planning System"

# Status controleren
sc query "Ambulance Planning System"
```

## Stap 7: Functionaliteit Testen

### Test Checklist:
- [ ] Website bereikbaar op https://jouw-domein.be
- [ ] Login werkt voor beide stations
- [ ] Database queries werken (shifts, gebruikers)
- [ ] Nieuwe functionaliteit werkt
- [ ] Bestaande data intact

### Quick Test Commands:
```bash
# Test HTTP response
curl -I https://jouw-domein.be

# Test database
psql -h localhost -U ambulance_user -d ambulance_planning -c "SELECT username FROM users LIMIT 5;"

# Test applicatie logs
pm2 logs ambulance-planning --lines 10
```

## Rollback Procedure (Bij Problemen)

### Stap 1: Stop Applicatie
```bash
pm2 stop ambulance-planning
# of Windows: sc stop "Ambulance Planning System"
```

### Stap 2: Database Rollback
```bash
# Laatste backup vinden
ls -la /var/backups/ambulance-planning/

# Database herstellen
pg_restore -U ambulance_user -d ambulance_planning --clean backup_file.sql
```

### Stap 3: Code Rollback
```bash
# Git rollback naar vorige versie
git checkout HEAD~1

# Of handmatige rollback
rm -rf /home/ubuntu/ambulance-planning
mv /home/ubuntu/ambulance-planning-backup /home/ubuntu/ambulance-planning
```

### Stap 4: Rebuild & Restart
```bash
npm install
npm run build
pm2 start ambulance-planning
```

## Zero-Downtime Updates (Geavanceerd)

### Blue-Green Deployment Setup:
```bash
# Tweede instantie voorbereiden
cp -r /home/ubuntu/ambulance-planning /home/ubuntu/ambulance-planning-new
cd /home/ubuntu/ambulance-planning-new

# Update nieuwe versie
git pull origin main
npm install
npm run build

# Test nieuwe versie op andere poort
PORT=5001 npm start &

# Test functionaliteit op poort 5001
curl http://localhost:5001

# Switch nginx naar nieuwe versie
# Update nginx config naar poort 5001
sudo systemctl reload nginx

# Stop oude versie
pm2 stop ambulance-planning

# Start nieuwe versie op productie poort
cd /home/ubuntu/ambulance-planning-new
pm2 start ecosystem.config.js
```

## Monitoring Na Update

### Logs Controleren:
```bash
# Applicatie logs
pm2 logs ambulance-planning

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# Database logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# System logs
journalctl -u nginx -f
```

### Performance Monitoring:
```bash
# Memory usage
free -h

# Disk space
df -h

# CPU usage
top

# Database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"
```

## Update Automation Script

### update.sh (Linux):
```bash
#!/bin/bash
set -e

echo "Starting update process..."

# Backup
./backup.sh

# Stop applicatie
pm2 stop ambulance-planning

# Update code
git pull origin main
npm install

# Database migraties
npm run db:push

# Rebuild
npm run build

# Start applicatie
pm2 start ambulance-planning

# Test
sleep 5
curl -f http://localhost:5000 || exit 1

echo "Update completed successfully!"
```

### update.ps1 (Windows):
```powershell
Write-Host "Starting update process..."

# Backup
.\windows-backup.ps1

# Stop service
sc stop "Ambulance Planning System"

# Update code
git pull origin main
npm install

# Database migraties
npm run db:push

# Rebuild
npm run build

# Start service
sc start "Ambulance Planning System"

# Test
Start-Sleep 5
Invoke-WebRequest http://localhost:5000

Write-Host "Update completed successfully!"
```

## Best Practices

### Timing:
- Plan updates tijdens rustige periodes
- Vermijd updates tijdens piekuren
- Test eerst op development omgeving

### Communication:
- Informeer gebruikers van geplande updates
- Houd downtime zo kort mogelijk
- Communiceer bij problemen

### Backup Strategy:
- Automatische dagelijkse backups
- Test backup restore regelmatig
- Bewaar backups minimaal 30 dagen

### Database Wijzigingen:
- Alleen additive changes (nieuwe kolommen/tabellen)
- Geen destructive changes zonder approval
- Test migraties eerst lokaal

---

**Belangrijkste regel: ALTIJD BACKUP MAKEN VOOR UPDATES!**