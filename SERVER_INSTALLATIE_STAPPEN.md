# Server Installatie - Ambulance Planning Systeem

## Stap 1: Server Verkrijgen

### Aanbevolen Providers:
- **DigitalOcean**: €10/maand voor 2GB RAM Ubuntu server
- **Hetzner**: €4/maand voor 2GB RAM Ubuntu server  
- **TransIP**: Nederlandse provider, ongeveer €8/maand

### Minimale Specificaties:
- Ubuntu 22.04 LTS
- 2GB RAM
- 20GB SSD storage
- 1 CPU core

## Stap 2: Toegang tot Server

### Via SSH (Windows: gebruik PuTTY of Windows Terminal)
```bash
ssh root@jouw-server-ip
# Of met gebruiker:
ssh ubuntu@jouw-server-ip
```

### Eerste keer inloggen:
- Je krijgt IP-adres en root wachtwoord van je hosting provider
- Log in als root of ubuntu gebruiker

## Stap 3: Projectbestanden Uploaden

### Optie A: Direct downloaden (eenvoudigst)
```bash
# Maak directory aan
mkdir /home/ubuntu/ambulance-planning
cd /home/ubuntu/ambulance-planning

# Download alle bestanden (je moet deze apart uploaden)
```

### Optie B: Via SCP/SFTP
```bash
# Vanaf je lokale computer (Windows: gebruik WinSCP of FileZilla)
scp -r ambulance-planning/* ubuntu@jouw-server-ip:/home/ubuntu/ambulance-planning/
```

### Optie C: Via Git (als je repository hebt)
```bash
git clone https://github.com/jouw-repo/ambulance-planning.git
cd ambulance-planning
```

## Stap 4: Automatische Installatie Uitvoeren

```bash
# Ga naar project directory
cd /home/ubuntu/ambulance-planning

# Maak installatiescript uitvoerbaar
chmod +x install.sh

# Voer installatie uit
./install.sh
```

### Tijdens installatie wordt gevraagd:
1. **Database naam**: `ambulance_planning` (gewoon Enter drukken)
2. **Database gebruiker**: `ambulance_user` (gewoon Enter drukken)  
3. **Database wachtwoord**: Kies een sterk wachtwoord
4. **Domein naam**: bijv. `planning.brandweer.be`

## Stap 5: Project Dependencies Installeren

```bash
# In project directory
npm install

# Database schema aanmaken
npm run db:push

# Applicatie builden voor productie
npm run build
```

## Stap 6: Initiële Data Setup

### Database vullen met brandweerposten:
```bash
# Login in PostgreSQL
sudo -u postgres psql ambulance_planning

# Voer uit in PostgreSQL:
INSERT INTO stations (name, code, display_name) VALUES 
('westerlo', 'westerlo', 'ZW Westerlo'),
('mol', 'mol', 'ZW Mol');

# Admin gebruikers aanmaken (verander wachtwoorden!)
INSERT INTO users (station_id, role, username, password, first_name, last_name, is_admin, hours) VALUES 
(1, 'admin', 'admin_westerlo', 'VeiligWachtwoord123!', 'Admin', 'Westerlo', true, 0),
(2, 'admin', 'admin_mol', 'VeiligWachtwoord123!', 'Admin', 'Mol', true, 0);

# Exit PostgreSQL
\q
```

## Stap 7: Applicatie Starten

```bash
# Start met PM2 (process manager)
pm2 start ecosystem.config.js

# Configureer autostart bij server herstart
pm2 startup
pm2 save

# Controleer status
pm2 status
```

## Stap 8: Domein & SSL Setup

### DNS Configuratie:
1. Ga naar je domein provider (bijv. Combell, TransIP)
2. Maak een A-record aan:
   - Naam: `planning` (of wat je wilt)
   - Type: A
   - Waarde: `jouw-server-ip`
   - TTL: 3600

### SSL Certificaat (Let's Encrypt - GRATIS):
```bash
# Installeer Certbot
sudo apt install certbot python3-certbot-nginx

# Verkrijg SSL certificaat
sudo certbot --nginx -d planning.brandweer.be

# Test automatische vernieuwing
sudo certbot renew --dry-run
```

## Stap 9: Firewall Configuratie

```bash
# Firewall activeren
sudo ufw enable

# Poorten openen
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Status controleren
sudo ufw status
```

## Stap 10: Eerste Test

1. Ga naar `https://planning.brandweer.be`
2. Je zou de station selectie pagina moeten zien
3. Selecteer "ZW Westerlo" of "ZW Mol"
4. Log in met admin account

## Stap 11: Backup Configuratie

```bash
# Test backup script
./backup.sh

# Controleer dat backup werkt
ls -la /var/backups/ambulance-planning/
```

## Veelvoorkomende Problemen & Oplossingen

### "502 Bad Gateway" fout:
```bash
# Controleer PM2 status
pm2 status

# Als app niet draait:
pm2 start ecosystem.config.js

# Controleer logs
pm2 logs ambulance-planning
```

### Database connectie fout:
```bash
# Test database connectie
sudo -u postgres psql -l

# Controleer .env bestand
cat .env
```

### Nginx fout:
```bash
# Test Nginx configuratie
sudo nginx -t

# Herstart Nginx
sudo systemctl restart nginx

# Controleer status
sudo systemctl status nginx
```

## Monitoring & Onderhoud

### Dagelijks controleren:
```bash
# PM2 status
pm2 status

# Disk space
df -h

# Memory gebruik
free -h
```

### Logs bekijken:
```bash
# Applicatie logs
pm2 logs ambulance-planning

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# Database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## Backup & Restore

### Handmatige backup:
```bash
./backup.sh
```

### Database restore (als nodig):
```bash
# Stop applicatie
pm2 stop ambulance-planning

# Restore database
pg_restore -U ambulance_user -d ambulance_planning backup_file.sql

# Start applicatie
pm2 start ambulance-planning
```

---

## Hulp Nodig?

Als je problemen ondervindt:
1. Controleer de logs (hierboven beschreven)
2. Controleer firewall instellingen
3. Verificeer DNS propagatie
4. Test database connectie

Het systeem zou binnen 30-60 minuten volledig operationeel moeten zijn na het volgen van deze stappen.