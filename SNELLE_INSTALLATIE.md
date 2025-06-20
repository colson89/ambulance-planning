# Snelle Server Installatie - Ambulance Planning

## Wat je nodig hebt:
- Een Ubuntu server (DigitalOcean, Hetzner, TransIP)
- Je domein naam (bijv. planning.brandweer.be)
- 30 minuten tijd

## Stap 1: Server Bestellen
Bestel een Ubuntu 22.04 server met minimaal 2GB RAM bij een provider zoals:
- **DigitalOcean** (€10/maand)
- **Hetzner** (€4/maand) 
- **TransIP** (€8/maand)

Je krijgt een IP-adres en SSH toegang.

## Stap 2: Inloggen op Server
```bash
# Windows: gebruik PuTTY of Windows Terminal
ssh root@JE-SERVER-IP
```

## Stap 3: Project Klaar Maken
```bash
# Maak directory aan
mkdir /home/ubuntu/ambulance-planning
cd /home/ubuntu/ambulance-planning

# Download de projectbestanden hier (kopieer alle bestanden van Replit)
```

## Stap 4: Automatische Installatie
```bash
# Maak installatiescript uitvoerbaar
chmod +x install.sh

# Start installatie
./install.sh
```

**Tijdens installatie invullen:**
- Database naam: ambulance_planning (gewoon Enter)
- Database gebruiker: ambulance_user (gewoon Enter)
- Database wachtwoord: KiesEenSterkWachtwoord123!
- Domein: planning.brandweer.be

## Stap 5: Project Setup
```bash
# Dependencies installeren
npm install

# Database opzetten
npm run db:push

# Applicatie builden
npm run build
```

## Stap 6: Data Toevoegen
```bash
# Open database
sudo -u postgres psql ambulance_planning
```

```sql
-- Brandweerposten aanmaken
INSERT INTO stations (name, code, display_name) VALUES 
('westerlo', 'westerlo', 'ZW Westerlo'),
('mol', 'mol', 'ZW Mol');

-- Admin accounts aanmaken
INSERT INTO users (station_id, role, username, password, first_name, last_name, is_admin, hours) VALUES 
(1, 'admin', 'admin_westerlo', 'Admin123!', 'Admin', 'Westerlo', true, 0),
(2, 'admin', 'admin_mol', 'Admin123!', 'Admin', 'Mol', true, 0);
```

Type `\q` om database te verlaten.

## Stap 7: Applicatie Starten
```bash
# Start applicatie
pm2 start ecosystem.config.js

# Autostart configureren
pm2 startup
pm2 save

# Status controleren
pm2 status
```

## Stap 8: Domein Instellen
1. Ga naar je domein provider
2. Maak A-record: `planning` → `JE-SERVER-IP`
3. Wacht 10-30 minuten voor DNS propagatie

## Stap 9: SSL Certificaat
```bash
# SSL certificaat verkrijgen (gratis)
sudo certbot --nginx -d planning.brandweer.be
```

## Stap 10: Testen
Ga naar `https://planning.brandweer.be`
- Selecteer station
- Log in met admin_westerlo / Admin123!

## Klaar!
Je ambulance planning systeem draait nu op je eigen server.

## Als er problemen zijn:

**502 Error:**
```bash
pm2 restart ambulance-planning
```

**Database fout:**
```bash
sudo systemctl restart postgresql
```

**Website niet bereikbaar:**
```bash
sudo systemctl restart nginx
```

**Logs bekijken:**
```bash
pm2 logs ambulance-planning
```