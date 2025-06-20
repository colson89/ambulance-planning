# Deployment Checklist - Ambulance Planning Systeem

## Pre-Deployment Checklist

### Server Voorbereiding
- [ ] Ubuntu/Debian server met minimaal 2GB RAM
- [ ] Root of sudo toegang
- [ ] Domein naam geconfigureerd (DNS A-record)
- [ ] Firewall regels overwogen

### Vereiste Software
- [ ] Node.js 18+ geïnstalleerd
- [ ] PostgreSQL 12+ geïnstalleerd
- [ ] Nginx geïnstalleerd
- [ ] PM2 process manager geïnstalleerd
- [ ] Git geïnstalleerd

## Installatie Stappen

### 1. Automatische Installatie (Aanbevolen)
```bash
# Download installatie script
wget https://jouw-repo.com/install.sh
chmod +x install.sh
./install.sh
```

### 2. Handmatige Installatie
- [ ] Systeem packages bijgewerkt
- [ ] Node.js en PM2 geïnstalleerd
- [ ] PostgreSQL database aangemaakt
- [ ] Database gebruiker aangemaakt met juiste rechten
- [ ] Project bestanden gekopieerd naar server
- [ ] .env bestand geconfigureerd
- [ ] Dependencies geïnstalleerd (`npm install`)
- [ ] Database schema aangemaakt (`npm run db:push`)
- [ ] Applicatie gebuild (`npm run build`)

## Configuratie Verificatie

### Database Connectie
```bash
# Test database connectie
psql -h localhost -U ambulance_user -d ambulance_planning -c "\dt"
```

### Environment Variables
- [ ] DATABASE_URL correct geconfigureerd
- [ ] SESSION_SECRET gegenereerd (minimaal 32 karakters)
- [ ] PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD ingesteld
- [ ] NODE_ENV op 'production' gezet
- [ ] PORT geconfigureerd (standaard 5000)

### Nginx Configuratie
- [ ] Virtual host aangemaakt
- [ ] Proxy configuratie naar Node.js app
- [ ] Site geactiveerd in sites-enabled
- [ ] Nginx configuratie getest (`nginx -t`)
- [ ] Nginx herstart (`systemctl reload nginx`)

## Initiële Data Setup

### Brandweerposten Aanmaken
```sql
INSERT INTO stations (name, code, display_name) VALUES 
('westerlo', 'westerlo', 'ZW Westerlo'),
('mol', 'mol', 'ZW Mol');
```

### Admin Accounts Aanmaken
```sql
-- Westerlo admin
INSERT INTO users (station_id, role, username, password, first_name, last_name, is_admin, hours) 
VALUES (1, 'admin', 'admin_westerlo', 'VERANDER_DIT_WACHTWOORD', 'Admin', 'Westerlo', true, 0);

-- Mol admin
INSERT INTO users (station_id, role, username, password, first_name, last_name, is_admin, hours)
VALUES (2, 'admin', 'admin_mol', 'VERANDER_DIT_WACHTWOORD', 'Admin', 'Mol', true, 0);
```

### Weekdag Configuraties Initialiseren
```sql
-- Wordt automatisch aangemaakt bij eerste gebruik
-- Controleer met: SELECT * FROM weekday_configs;
```

## Applicatie Deployment

### PM2 Setup
```bash
# Start applicatie
pm2 start ecosystem.config.js

# Configureer autostart
pm2 startup
pm2 save

# Controleer status
pm2 status
pm2 logs ambulance-planning
```

### SSL Certificaat (Let's Encrypt)
```bash
# Installeer Certbot
sudo apt install certbot python3-certbot-nginx

# Verkrijg certificaat
sudo certbot --nginx -d jouw-domein.be

# Test autorenewal
sudo certbot renew --dry-run
```

## Security Configuratie

### Firewall (UFW)
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

### Database Security
- [ ] PostgreSQL alleen lokaal toegankelijk
- [ ] Sterke database wachtwoorden gebruikt
- [ ] Database gebruiker heeft minimale rechten

### Application Security
- [ ] SESSION_SECRET is sterk en uniek
- [ ] .env bestand niet publiek toegankelijk
- [ ] Nginx security headers geconfigureerd

## Backup & Monitoring

### Backup Configuratie
```bash
# Maak backup script uitvoerbaar
chmod +x backup.sh

# Test backup script
./backup.sh

# Controleer cron job
crontab -l
```

### Log Monitoring
```bash
# PM2 logs
pm2 logs ambulance-planning

# Nginx logs
tail -f /var/log/nginx/ambulance-planning.access.log
tail -f /var/log/nginx/ambulance-planning.error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## Testing & Verificatie

### Functionaliteit Tests
- [ ] Website bereikbaar via domein
- [ ] HTTPS redirect werkt
- [ ] Login functionaliteit voor beide stations
- [ ] Database operaties werken (shifts, gebruikers)
- [ ] Session management werkt
- [ ] Backup script werkt

### Performance Tests
- [ ] Pagina laadtijden acceptabel (<3 seconden)
- [ ] Database queries geoptimaliseerd
- [ ] Memory usage binnen limiet
- [ ] CPU usage acceptabel

### Security Tests
- [ ] SSL certificaat geldig
- [ ] Security headers aanwezig
- [ ] Database niet extern toegankelijk
- [ ] Geen gevoelige informatie in logs

## Go-Live Checklist

### Pre-Launch
- [ ] Alle tests geslaagd
- [ ] Backup systeem werkend
- [ ] Monitoring opgezet
- [ ] DNS propagatie voltooid
- [ ] SSL certificaat actief

### Launch
- [ ] PM2 applicatie gestart
- [ ] Nginx actief en werkend
- [ ] Database verbinding stabiel
- [ ] Logs worden correct geschreven

### Post-Launch
- [ ] Gebruikers kunnen inloggen
- [ ] Alle functionaliteiten werken
- [ ] Performance monitoring actief
- [ ] Error monitoring opgezet

## Onderhoud Planning

### Dagelijks
- [ ] Backup verificatie
- [ ] Log monitoring
- [ ] Performance check

### Wekelijks  
- [ ] Security updates
- [ ] Disk space controle
- [ ] Database performance

### Maandelijks
- [ ] SSL certificaat geldigheid
- [ ] Backup restore test
- [ ] Security audit

## Troubleshooting

### Veelvoorkomende Problemen
1. **502 Bad Gateway**: Node.js app niet bereikbaar
   - Controleer PM2 status
   - Controleer poort configuratie

2. **Database connectie fout**: 
   - Controleer DATABASE_URL
   - Controleer PostgreSQL service
   - Controleer gebruiker rechten

3. **SSL problemen**:
   - Controleer certificaat geldigheid
   - Hernieuw Let's Encrypt certificaat

### Emergency Contacten
- Server beheerder: [contact info]
- Database beheerder: [contact info]
- Applicatie ontwikkelaar: [contact info]

## Rollback Plan

### Database Rollback
```bash
# Stop applicatie
pm2 stop ambulance-planning

# Restore database backup
pg_restore -U ambulance_user -d ambulance_planning backup_file.sql

# Start applicatie
pm2 start ambulance-planning
```

### Code Rollback
```bash
# Stop applicatie
pm2 stop ambulance-planning

# Rollback code
git checkout previous-stable-version
npm install
npm run build

# Start applicatie
pm2 start ambulance-planning
```

---

**Datum deployment**: ___________
**Uitgevoerd door**: ___________
**Gecontroleerd door**: ___________