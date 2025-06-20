# Windows Server Installatie - Ambulance Planning Systeem

## Systeemvereisten
- Windows Server 2019 of 2022
- Minimaal 4GB RAM
- 50GB vrije schijfruimte
- Administrator toegang

## Stap 1: Benodigde Software Installeren

### Node.js Installeren
1. Download Node.js LTS van: https://nodejs.org/
2. Kies "Windows Installer (.msi)" - 64-bit
3. Installeer met standaard instellingen
4. Open Command Prompt als Administrator
5. Test: `node --version` en `npm --version`

### PostgreSQL Installeren
1. Download PostgreSQL van: https://www.postgresql.org/download/windows/
2. Installeer PostgreSQL 15 of nieuwer
3. Tijdens installatie:
   - Stel een sterk wachtwoord in voor postgres gebruiker
   - Standaard poort 5432 behouden
   - Alle componenten installeren
4. Test connectie via pgAdmin

### IIS of HTTP.sys (optioneel - voor reverse proxy)
```powershell
# PowerShell als Administrator
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpRedirect
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpCompressionStatic
```

## Stap 2: Database Setup

### PostgreSQL Database Aanmaken
1. Open pgAdmin of psql command line
2. Verbind als postgres gebruiker
3. Voer uit:

```sql
-- Database aanmaken
CREATE DATABASE ambulance_planning;

-- Gebruiker aanmaken
CREATE USER ambulance_user WITH PASSWORD 'JouwSterkWachtwoord123!';

-- Rechten toewijzen
GRANT ALL PRIVILEGES ON DATABASE ambulance_planning TO ambulance_user;
GRANT ALL ON SCHEMA public TO ambulance_user;
```

## Stap 3: Project Setup

### Project Directory
```cmd
# Maak directory aan
mkdir C:\inetpub\ambulance-planning
cd C:\inetpub\ambulance-planning
```

### Projectbestanden
Kopieer alle projectbestanden naar `C:\inetpub\ambulance-planning\`

### Environment Variabelen (.env bestand)
Maak `.env` bestand aan:
```env
# Database configuratie
DATABASE_URL=postgresql://ambulance_user:JouwSterkWachtwoord123!@localhost:5432/ambulance_planning

# PostgreSQL details
PGHOST=localhost
PGPORT=5432
PGDATABASE=ambulance_planning
PGUSER=ambulance_user
PGPASSWORD=JouwSterkWachtwoord123!

# Session secret (32+ karakters)
SESSION_SECRET=GenereerHierEenSterkSessionSecretVanMinimaal32Karakters

# Server configuratie
PORT=5000
NODE_ENV=production
```

## Stap 4: Dependencies & Build

```cmd
# In project directory
cd C:\inetpub\ambulance-planning

# Dependencies installeren
npm install

# Database schema aanmaken
npm run db:push

# Applicatie builden
npm run build
```

## Stap 5: Windows Service Setup

### PM2 Alternatief: node-windows
```cmd
# Installeer node-windows globaal
npm install -g node-windows

# Installeer in project
npm install node-windows --save
```

### Service Script (service-install.js)
```javascript
var Service = require('node-windows').Service;

// Service object aanmaken
var svc = new Service({
  name: 'Ambulance Planning System',
  description: 'Ambulance Planning Web Application',
  script: 'C:\\inetpub\\ambulance-planning\\dist\\index.js',
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: {
    name: "NODE_ENV",
    value: "production"
  }
});

// Event listeners
svc.on('install', function(){
  console.log('Service geïnstalleerd');
  svc.start();
});

svc.on('start', function(){
  console.log('Service gestart');
});

// Service installeren
svc.install();
```

### Service Installeren
```cmd
# Service script uitvoeren
node service-install.js

# Service status controleren
sc query "Ambulance Planning System"
```

## Stap 6: IIS Reverse Proxy (Optioneel)

### URL Rewrite Module
1. Download IIS URL Rewrite Module van Microsoft
2. Installeer op de server

### IIS Site Configuratie
1. Open IIS Manager
2. Maak nieuwe website aan:
   - Site naam: "Ambulance Planning"
   - Physical path: `C:\inetpub\ambulance-planning\public`
   - Port: 80 (en 443 voor HTTPS)

### web.config voor Reverse Proxy
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyInboundRule1" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:5000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

## Stap 7: Firewall Configuratie

### Windows Firewall
```powershell
# PowerShell als Administrator
# HTTP poort openen
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# HTTPS poort openen  
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow

# Node.js applicatie poort
New-NetFirewallRule -DisplayName "Node.js App" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

## Stap 8: SSL Certificaat

### Self-Signed Certificaat (Development)
```powershell
# PowerShell als Administrator
$cert = New-SelfSignedCertificate -DnsName "planning.brandweer.be" -CertStoreLocation "cert:\LocalMachine\My"
```

### Let's Encrypt met win-acme
1. Download win-acme van: https://www.win-acme.com/
2. Configureer voor je domein
3. Automatische certificaat vernieuwing

## Stap 9: Initiële Data

### Database Vullen
```cmd
# Open psql
psql -h localhost -U ambulance_user -d ambulance_planning
```

```sql
-- Brandweerposten
INSERT INTO stations (name, code, display_name) VALUES 
('westerlo', 'westerlo', 'ZW Westerlo'),
('mol', 'mol', 'ZW Mol');

-- Admin gebruikers
INSERT INTO users (station_id, role, username, password, first_name, last_name, is_admin, hours) VALUES 
(1, 'admin', 'admin_westerlo', 'Admin123!', 'Admin', 'Westerlo', true, 0),
(2, 'admin', 'admin_mol', 'Admin123!', 'Admin', 'Mol', true, 0);
```

## Stap 10: Backup Script (PowerShell)

### backup.ps1
```powershell
# Backup configuratie
$BackupDir = "C:\Backups\ambulance-planning"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$DBName = "ambulance_planning"
$DBUser = "ambulance_user"

# Maak backup directory
New-Item -ItemType Directory -Force -Path $BackupDir

# Database backup
$BackupFile = "$BackupDir\db_backup_$Date.sql"
& "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -h localhost -U $DBUser $DBName > $BackupFile

# Comprimeer backup
Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip"
Remove-Item $BackupFile

# Oude backups opruimen (7 dagen)
Get-ChildItem $BackupDir -Filter "*.zip" | Where-Object {$_.CreationTime -lt (Get-Date).AddDays(-7)} | Remove-Item

Write-Host "Backup voltooid: $BackupFile.zip"
```

### Geplande Taak voor Backup
```powershell
# PowerShell als Administrator
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\inetpub\ambulance-planning\backup.ps1"
$Trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
$Settings = New-ScheduledTaskSettingsSet -WakeToRun
Register-ScheduledTask -TaskName "Ambulance Planning Backup" -Action $Action -Trigger $Trigger -Settings $Settings -User "SYSTEM"
```

## Stap 11: Monitoring & Logs

### Event Viewer
- Applicatie logs: Windows Logs > Application
- System logs: Windows Logs > System

### Performance Monitor
Monitor CPU, Memory, Disk usage van Node.js proces

### Log Rotatie
```javascript
// In je Node.js app - winston logger configuratie
const winston = require('winston');
require('winston-daily-rotate-file');

const transport = new winston.transports.DailyRotateFile({
  filename: 'C:/inetpub/ambulance-planning/logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d'
});
```

## Troubleshooting

### Service start niet
```cmd
# Controleer service logs
Get-EventLog -LogName Application -Source "Ambulance Planning System"

# Service handmatig starten
sc start "Ambulance Planning System"
```

### Database connectie problemen
```cmd
# Test PostgreSQL connectie
psql -h localhost -U ambulance_user -d ambulance_planning -c "SELECT 1;"
```

### Port conflicten
```powershell
# Controleer welke processen poorten gebruiken
netstat -ano | findstr :5000
```

## Updates & Onderhoud

### Applicatie Update
1. Stop service: `sc stop "Ambulance Planning System"`
2. Backup database en code
3. Kopieer nieuwe bestanden
4. Run `npm install` en `npm run build`
5. Start service: `sc start "Ambulance Planning System"`

### Windows Updates
Plan reguliere Windows Server updates tijdens onderhoudsmomenten.

---

**Voordelen Windows Server:**
- Bekende Windows omgeving
- Grafische interface voor beheer
- Integratie met Active Directory mogelijk
- Enterprise support beschikbaar

**Nadelen:**
- Hogere licentiekosten
- Meer resource intensief dan Linux
- Complexere configuratie voor web applicaties