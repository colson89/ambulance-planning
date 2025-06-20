# Installatie Handleiding - Ambulance Planning Systeem

## Systeemvereisten

- Node.js 18 of hoger
- PostgreSQL 12 of hoger
- Linux/Ubuntu server (aanbevolen) of Windows Server
- Minimaal 2GB RAM, 10GB schijfruimte

## Stap 1: Project Downloaden

Download alle projectbestanden naar je server:

```bash
# Clone of download het project
git clone [repository-url] ambulance-planning
cd ambulance-planning
```

## Stap 2: Dependencies Installeren

```bash
# Installeer Node.js dependencies
npm install
```

## Stap 3: Database Opzetten

### PostgreSQL Database Maken

```sql
-- Maak database aan
CREATE DATABASE ambulance_planning;

-- Maak gebruiker aan
CREATE USER ambulance_user WITH PASSWORD 'jouw_sterke_wachtwoord_hier';

-- Geef rechten
GRANT ALL PRIVILEGES ON DATABASE ambulance_planning TO ambulance_user;
```

### Environment Variables

Maak een `.env` bestand in de hoofdmap:

```env
# Database configuratie
DATABASE_URL=postgresql://ambulance_user:jouw_sterke_wachtwoord_hier@localhost:5432/ambulance_planning

# PostgreSQL details (voor session store)
PGHOST=localhost
PGPORT=5432
PGDATABASE=ambulance_planning
PGUSER=ambulance_user
PGPASSWORD=jouw_sterke_wachtwoord_hier

# Session secret (genereer een sterke random string)
SESSION_SECRET=jouw_session_secret_hier_minimaal_32_karakters

# Server configuratie
PORT=5000
NODE_ENV=production
```

### Database Schema Aanmaken

```bash
# Push database schema
npm run db:push
```

## Stap 4: Initiële Data

### Brandweerposten Aanmaken

```sql
-- Voeg brandweerposten toe
INSERT INTO stations (name, code, display_name) VALUES 
('westerlo', 'westerlo', 'ZW Westerlo'),
('mol', 'mol', 'ZW Mol');
```

### Admin Gebruikers Aanmaken

```sql
-- Westerlo admin
INSERT INTO users (station_id, role, username, password, first_name, last_name, is_admin, hours) 
VALUES (1, 'admin', 'admin_westerlo', 'Admin123!', 'Admin', 'Westerlo', true, 0);

-- Mol admin  
INSERT INTO users (station_id, role, username, password, first_name, last_name, is_admin, hours)
VALUES (2, 'admin', 'admin_mol', 'Admin123!', 'Admin', 'Mol', true, 0);
```

## Stap 5: Applicatie Builden

```bash
# Build de frontend
npm run build

# Start de productie server
npm run start
```

## Stap 6: Proces Manager (PM2)

Voor productie gebruik PM2:

```bash
# Installeer PM2 globaal
npm install -g pm2

# Start applicatie met PM2
pm2 start ecosystem.config.js

# PM2 opstarten bij server boot
pm2 startup
pm2 save
```

### PM2 Configuratie (ecosystem.config.js)

```javascript
module.exports = {
  apps: [{
    name: 'ambulance-planning',
    script: 'server/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

## Stap 7: Nginx Reverse Proxy

### Nginx Configuratie

```nginx
server {
    listen 80;
    server_name jouw-domein.be;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Certificaat (Let's Encrypt)

```bash
# Installeer Certbot
sudo apt install certbot python3-certbot-nginx

# Verkrijg SSL certificaat
sudo certbot --nginx -d jouw-domein.be
```

## Stap 8: Firewall & Security

```bash
# UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# PostgreSQL beveiliging
sudo ufw allow from localhost to any port 5432
```

## Stap 9: Backup Script

Maak een backup script:

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/ambulance-planning"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
pg_dump ambulance_planning > $BACKUP_DIR/db_backup_$DATE.sql

# Code backup (optioneel)
tar -czf $BACKUP_DIR/code_backup_$DATE.tar.gz /path/to/ambulance-planning

# Oude backups opruimen (behoud 7 dagen)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### Cron Job voor Automatische Backup

```bash
# Bewerk crontab
crontab -e

# Voeg toe (dagelijkse backup om 2:00)
0 2 * * * /path/to/backup.sh
```

## Stap 10: Monitoring & Logs

### Log Rotatie

```bash
# /etc/logrotate.d/ambulance-planning
/path/to/ambulance-planning/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
```

## Onderhoud

### Updates Installeren

```bash
# Stop de applicatie
pm2 stop ambulance-planning

# Pull updates
git pull origin main

# Installeer dependencies
npm install

# Database migraties (indien nodig)
npm run db:push

# Rebuild applicatie
npm run build

# Restart applicatie
pm2 restart ambulance-planning
```

### Performance Monitoring

```bash
# PM2 monitoring
pm2 monit

# Database performance
sudo -u postgres psql ambulance_planning -c "SELECT * FROM pg_stat_activity;"
```

## Troubleshooting

### Veelvoorkomende Problemen

1. **Database connectie fout**: Controleer DATABASE_URL in .env
2. **Port al in gebruik**: Wijzig PORT in .env
3. **Permission errors**: Controleer file permissions
4. **Session errors**: Controleer SESSION_SECRET in .env

### Logs Bekijken

```bash
# PM2 logs
pm2 logs ambulance-planning

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## Beveiliging Checklist

- [ ] Sterke wachtwoorden gebruikt
- [ ] Firewall geconfigureerd
- [ ] SSL certificaat geïnstalleerd
- [ ] Database toegang beperkt
- [ ] Backup systeem werkend
- [ ] Updates gepland
- [ ] Monitoring actief

## Support

Voor technische ondersteuning, controleer:
1. Server logs
2. Database status
3. Network connectiviteit
4. Disk space
5. Memory usage

---

**Laatste update**: December 2024