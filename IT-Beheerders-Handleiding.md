# IT Beheerders Handleiding - Ambulance Planning Systeem
**Versie 2025.6**  
**Laatst bijgewerkt: November 2025**

## Inhoudsopgave

1. [Overzicht](#overzicht)
2. [Systeemvereisten](#systeemvereisten)
3. [Benodigde Software](#benodigde-software)
4. [Database Setup](#database-setup)
5. [Applicatie Installatie](#applicatie-installatie)
6. [Push Notifications Setup](#push-notifications-setup)
7. [Deployment Configuratie](#deployment-configuratie)
8. [SSL Certificaat Installatie](#ssl-certificaat-installatie)
9. [Onderhoud & Beheer](#onderhoud--beheer)
10. [Troubleshooting](#troubleshooting)

---

## Overzicht

Het Ambulance Planning Systeem is een web-gebaseerde applicatie voor shift scheduling en operationeel beheer van 8 ambulancestations met 119 gebruikers. Deze handleiding beschrijft de volledige installatie en configuratie op Windows Server.

**Applicatie Architectuur:**
- **Frontend**: React 18 + TypeScript (Single Page Application)
- **Backend**: Node.js + Express (REST API)
- **Database**: PostgreSQL 12+
- **Runtime**: Node.js 18 LTS of hoger
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx (aanbevolen) of IIS

---

## Systeemvereisten

### Windows Server

**Minimale Vereisten:**
- **OS**: Windows Server 2016 of hoger (2019/2022 aanbevolen)
- **CPU**: 2 cores (4 cores aanbevolen voor 119+ gebruikers)
- **RAM**: 4 GB (8 GB aanbevolen)
- **Opslag**: 20 GB vrije schijfruimte (SSD aanbevolen)
- **Netwerk**: Statisch IP-adres of DHCP reservering

**Poorten (Windows Firewall):**
- **5000**: Applicatie (intern, alleen via reverse proxy)
- **80**: HTTP (redirect naar HTTPS)
- **443**: HTTPS (publiek toegankelijk)
- **5432**: PostgreSQL (alleen localhost, NIET publiek)

### Ondersteunde Browsers (Gebruikers)

- **Chrome**: 90+
- **Firefox**: 88+
- **Edge**: 90+
- **Safari**: 14+ (iOS 14.5+)

---

## Benodigde Software

### 1. Node.js 18 LTS

**Download & Installatie:**

1. Ga naar https://nodejs.org/
2. Download **Node.js 18.x LTS** (Windows Installer `.msi`)
3. Voer installer uit:
   - Accepteer licentie
   - Installatie pad: `C:\Program Files\nodejs\`
   - **Belangrijk**: Selecteer "Automatically install necessary tools" (Python, Visual Studio Build Tools)
4. Herstart server na installatie

**Verificatie:**
```cmd
node --version
npm --version
```
Output moet zijn: `v18.x.x` en `npm 9.x.x` of hoger.

---

### 2. PostgreSQL Database Server

**Download & Installatie:**

1. Ga naar https://www.postgresql.org/download/windows/
2. Download **PostgreSQL 12** of hoger (installer via EnterpriseDB)
3. Voer installer uit:
   - **Installation Directory**: `C:\Program Files\PostgreSQL\{versie}\`
   - **Data Directory**: `C:\Program Files\PostgreSQL\{versie}\data\`
   - **Wachtwoord**: Kies een sterk wachtwoord voor de `postgres` superuser (bewaar dit veilig!)
   - **Port**: `5432` (standaard)
   - **Locale**: `Dutch, Netherlands` of `English, United States`
4. Installeer pgAdmin 4 (meegeleverd met installer) voor GUI management

**Verificatie:**
```cmd
psql --version
```

**Firewall Configuratie:**
PostgreSQL moet ALLEEN toegankelijk zijn vanaf localhost. Blokkeer poort 5432 voor externe verbindingen:
```cmd
netsh advfirewall firewall add rule name="PostgreSQL Block External" dir=in action=block protocol=TCP localport=5432 remoteip=any
```

---

### 3. Git voor Windows

**Download & Installatie:**

1. Ga naar https://git-scm.com/download/win
2. Download en installeer Git
3. Tijdens installatie:
   - Selecteer "Git from the command line and also from 3rd-party software"
   - Selecteer "Use Windows' default console window"

**Verificatie:**
```cmd
git --version
```

---

### 4. PM2 Process Manager

PM2 zorgt ervoor dat de applicatie automatisch herstart na crashes en server reboots.

**Installatie (na Node.js installatie):**

⚠️ **Belangrijk**: Open PowerShell **als Administrator** voor deze stappen!

```cmd
npm install -g pm2
npm install -g pm2-windows-startup
```

**Windows Startup configuratie:**
```cmd
pm2-startup install
```

Dit maakt een Windows Task aan die PM2 automatisch start bij server reboot.

**Verificatie:**
```cmd
pm2 --version
```

---

### 5. Nginx Web Server (Aanbevolen)

Nginx fungeert als reverse proxy voor SSL terminatie en load balancing.

**Download & Installatie:**

1. Ga naar http://nginx.org/en/download.html
2. Download **nginx/Windows** (bijv. `nginx-1.24.0.zip`)
3. Unzip naar `C:\nginx`

**Verificatie:**
```cmd
cd C:\nginx
nginx -v
```

**Windows Service configuratie:**

Download **NSSM** (Non-Sucking Service Manager): https://nssm.cc/download

```cmd
nssm install nginx "C:\nginx\nginx.exe"
nssm set nginx AppDirectory "C:\nginx"
nssm start nginx
```

---

### 6. IIS Web Server (Alternatief voor Nginx)

Als je organisatie IIS (Internet Information Services) verplicht stelt, kan IIS gebruikt worden als reverse proxy.

**Vereisten:**
- Windows Server met IIS geïnstalleerd
- Application Request Routing (ARR) module
- URL Rewrite module

#### Stap 1: IIS Modules Installeren

**Download en installeer:**

1. **URL Rewrite Module**: https://www.iis.net/downloads/microsoft/url-rewrite
2. **Application Request Routing**: https://www.iis.net/downloads/microsoft/application-request-routing

Installeer beide MSI bestanden.

#### Stap 2: ARR Proxy Enablen

Open IIS Manager:

1. Selecteer server node (root level)
2. Dubbelklik **Application Request Routing Cache**
3. Klik rechts op **Server Proxy Settings**
4. Vink **Enable proxy** aan
5. Klik **Apply**

#### Stap 3: Website Aanmaken

1. Open IIS Manager
2. Rechtermuisklik op **Sites** → **Add Website**
3. Configuratie:
   - **Site name**: Ambulance Planning
   - **Physical path**: `C:\inetpub\wwwroot\ambulance-planning` (lege folder, alleen voor bindings)
   - **Binding Type**: https
   - **Port**: 443
   - **Host name**: jouw-domein.nl
   - **SSL Certificate**: Selecteer geïnstalleerd certificaat (zie SSL sectie)

#### Stap 4: URL Rewrite Rules

Selecteer de website in IIS Manager en dubbelklik **URL Rewrite**.

**Regel 1: HTTP naar HTTPS Redirect**

1. Klik **Add Rule(s)** → **Blank rule**
2. Configuratie:
   - **Name**: HTTP to HTTPS Redirect
   - **Match URL**:
     - Requested URL: `Matches the Pattern`
     - Using: `Regular Expressions`
     - Pattern: `(.*)`
   - **Conditions**:
     - Klik **Add** → **{HTTPS}** → **Matches the Pattern** → **^OFF$**
   - **Action**:
     - Action type: `Redirect`
     - Redirect URL: `https://{HTTP_HOST}/{R:1}`
     - Redirect type: `Permanent (301)`

**Regel 2: Reverse Proxy naar Node.js**

1. Klik **Add Rule(s)** → **Blank rule**
2. Configuratie:
   - **Name**: Reverse Proxy to Node.js
   - **Match URL**:
     - Requested URL: `Matches the Pattern`
     - Using: `Regular Expressions`
     - Pattern: `(.*)`
   - **Conditions**: (geen)
   - **Server Variables**:
     - Klik **Manage Server Variables** → **Add**:
       - `HTTP_X_FORWARDED_PROTO` → Value: `https`
   - **Action**:
     - Action type: `Rewrite`
     - Rewrite URL: `http://localhost:5000/{R:1}`
     - Append query string: Aanvinken
     - Stop processing: Aanvinken

#### Stap 5: WebSocket Support Enablen

Voor push notifications is WebSocket support vereist:

1. Selecteer server node in IIS Manager
2. Dubbelklik **Configuration Editor**
3. Section: `system.webServer/webSocket`
4. Stel in:
   - **enabled**: `True`
5. Klik **Apply**

#### Stap 6: Application Pool Configuratie

1. Ga naar **Application Pools**
2. Selecteer de pool voor Ambulance Planning website
3. **Basic Settings**:
   - .NET CLR Version: `No Managed Code` (Node.js heeft geen .NET nodig)
   - Managed Pipeline Mode: `Integrated`

#### Stap 7: Firewall & Permissions

Zelfde als Nginx configuratie:

```cmd
netsh advfirewall firewall add rule name="HTTP Port 80" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="HTTPS Port 443" dir=in action=allow protocol=TCP localport=443
netsh advfirewall firewall add rule name="Block Node.js Direct Access" dir=in action=block protocol=TCP localport=5000 remoteip=any
```

**Testen:**

1. Start PM2 applicatie (zie Deployment sectie)
2. Ga naar https://jouw-domein.nl in browser
3. Je moet de applicatie zien (via IIS → Node.js proxy)

---

### 7. Windows Defender Exclusions (Belangrijk!)

Windows Defender kan Node.js performance significant vertragen. Voeg exclusions toe:

1. Open **Windows Security** → **Virus & threat protection**
2. **Manage settings** → **Exclusions** → **Add or remove exclusions**
3. Voeg toe:
   - **Folder**: `C:\inetpub\ambulance-planning`
   - **Folder**: `C:\Users\Administrator\.pm2`
   - **Folder**: `C:\Program Files\nodejs`
   - **Folder**: `C:\nginx` (indien Nginx gebruikt)
   - **Process**: `node.exe`
   - **Process**: `nginx.exe` (indien Nginx gebruikt)

⚠️ **Let op**: Doe dit ALLEEN op een dedicated applicatie server achter een firewall!

---

## Database Setup

### 1. Database en User Aanmaken

Open **pgAdmin 4** of gebruik **psql** via command line:

```cmd
psql -U postgres
```

Voer volgende SQL commando's uit:

```sql
-- Maak database aan
CREATE DATABASE ambulance_planning
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'Dutch_Netherlands.1252'
    LC_CTYPE = 'Dutch_Netherlands.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Maak dedicated user aan (veiliger dan postgres superuser)
CREATE USER ambulance_app WITH PASSWORD 'jouw_sterke_wachtwoord_hier';

-- Geef rechten aan user
GRANT ALL PRIVILEGES ON DATABASE ambulance_planning TO ambulance_app;

-- Connecteer met database
\c ambulance_planning

-- Geef schema rechten
GRANT ALL ON SCHEMA public TO ambulance_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ambulance_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ambulance_app;

-- Zorg dat toekomstige tabellen ook rechten krijgen
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ambulance_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ambulance_app;
```

**Exit psql:**
```sql
\q
```

### 2. Connection String Samenstellen

De database connection string heeft dit formaat:
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=disable
```

**Voorbeeld:**
```
postgresql://ambulance_app:jouw_sterke_wachtwoord_hier@localhost:5432/ambulance_planning?sslmode=disable
```

**Let op**: Gebruik `sslmode=disable` voor localhost connecties. Voor remote database connecties gebruik `sslmode=require`.

### 3. Database Connectie Testen

Test de connectie voordat je verder gaat:

```cmd
psql -U ambulance_app -d ambulance_planning -h localhost -p 5432
```

Als de connectie lukt, zie je de PostgreSQL prompt.

---

## Applicatie Installatie

### 1. Source Code Ophalen

**Optie A: Via Git (aanbevolen voor updates)**
```cmd
cd C:\inetpub
git clone <repository-url> ambulance-planning
cd ambulance-planning
```

**Optie B: Via ZIP bestand**
1. Download source code ZIP
2. Unzip naar `C:\inetpub\ambulance-planning`

### 2. Dependencies Installeren

```cmd
cd C:\inetpub\ambulance-planning
npm install
```

Dit installeert alle benodigde Node.js packages (kan 5-10 minuten duren).

### 3. Environment Variabelen Configureren

Maak een `.env` bestand in de root van de applicatie:

```cmd
notepad .env
```

Voeg volgende configuratie toe (pas waarden aan voor jouw omgeving):

```env
# Database Configuratie
DATABASE_URL=postgresql://ambulance_app:jouw_wachtwoord@localhost:5432/ambulance_planning?sslmode=disable

# PostgreSQL Direct Connection (gebruikt door Drizzle ORM)
PGHOST=localhost
PGPORT=5432
PGUSER=ambulance_app
PGPASSWORD=jouw_wachtwoord
PGDATABASE=ambulance_planning

# Applicatie Configuratie
NODE_ENV=production
PORT=5000

# Public URL (gebruikt voor iCal feeds en externe links)
PUBLIC_URL=https://jouw-domein.nl

# Session Secret (genereer een random string van 32+ karakters)
SESSION_SECRET=genereer_hier_een_random_string_van_minimaal_32_karakters

# VAPID Keys voor Push Notifications (zie volgende sectie)
VAPID_PUBLIC_KEY=<wordt later gegenereerd>
VAPID_PRIVATE_KEY=<wordt later gegenereerd>
VAPID_CONTACT_EMAIL=admin@jouw-domein.nl
```

**SESSION_SECRET genereren:**

Open Node.js REPL:
```cmd
node
```

Voer uit:
```javascript
require('crypto').randomBytes(32).toString('hex')
```

Kopieer de output naar `SESSION_SECRET` in `.env` bestand.

### 4. Applicatie Builden

Build de frontend en backend:

```cmd
npm run build
```

Dit commando:
- Compileert TypeScript naar JavaScript
- Bundelt React frontend met Vite
- Genereert service worker voor PWA
- Plaatst output in `dist/` folder

**Output:**
- `dist/index.js` - Backend server
- `dist/public/` - Frontend static assets

### 5. Database Schema Migratie

De database schema moet worden geïnitialiseerd met alle tabellen:

```cmd
npm run db:push
```

Als er een waarschuwing komt over data verlies, gebruik dan:
```cmd
npm run db:push -- --force
```

**Verificatie:**

Controleer of tabellen zijn aangemaakt:
```cmd
psql -U ambulance_app -d ambulance_planning -c "\dt"
```

Je moet minimaal deze tabellen zien:
- `users`
- `stations`
- `shifts`
- `schedules`
- `user_preferences`
- `push_subscriptions`
- `verdi_station_config`
- En nog ~15 andere tabellen

---

## Push Notifications Setup

Push notificaties vereisen VAPID (Voluntary Application Server Identification) keys voor veilige communicatie met browsers.

### 1. VAPID Keys Genereren

De applicatie bevat een helper script:

```cmd
node -e "const webpush = require('web-push'); const vapidKeys = webpush.generateVAPIDKeys(); console.log('Public Key:', vapidKeys.publicKey); console.log('Private Key:', vapidKeys.privateKey);"
```

**Output voorbeeld:**
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
Private Key: UUxI4O8-FYa-qaBLPRCVp-oPj-8DJgWE3uqZ3D6F3nQ
```

### 2. Environment Variabelen Updaten

Open `.env` bestand en voeg de gegenereerde keys toe:

```env
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=UUxI4O8-FYa-qaBLPRCVp-oPj-8DJgWE3uqZ3D6F3nQ
VAPID_CONTACT_EMAIL=admin@jouw-domein.nl
```

**Belangrijk:**
- **Bewaar de private key veilig!** Verlies hiervan betekent dat alle bestaande push subscriptions ongeldig worden.
- Gebruik een geldig email adres voor `VAPID_CONTACT_EMAIL` (vereist door Web Push specificatie)

### 3. Push Notifications Testen

Start de applicatie (zie Deployment Configuratie) en:

1. Login als gebruiker
2. Ga naar **Profiel** pagina
3. Klik op **"Sta Push Notificaties Toe"**
4. Geef browser toestemming
5. Klik op **"Stuur Test Notificatie"**

Je moet een notificatie ontvangen met tekst "Test Notificatie".

---

## Deployment Configuratie

### 1. PM2 Applicatie Setup

PM2 zorgt ervoor dat de applicatie continu draait en automatisch herstart bij crashes.

**Start applicatie met PM2:**

```cmd
cd C:\inetpub\ambulance-planning
pm2 start dist/index.js --name ambulance-planning --node-args="--max-old-space-size=2048"
```

**PM2 Configuratie opslaan (voor auto-start):**

```cmd
pm2 save
```

**PM2 Status bekijken:**

```cmd
pm2 status
pm2 logs ambulance-planning
pm2 monit
```

**PM2 Logs:**
- Standaard locatie: `C:\Users\Administrator\.pm2\logs\`
- `ambulance-planning-out.log` - Applicatie output
- `ambulance-planning-error.log` - Errors

**Handige PM2 Commando's:**

```cmd
pm2 restart ambulance-planning   # Herstart applicatie
pm2 stop ambulance-planning      # Stop applicatie
pm2 delete ambulance-planning    # Verwijder uit PM2
pm2 reload ambulance-planning    # Zero-downtime reload
```

### 2. Nginx Reverse Proxy Configuratie

Nginx fungeert als reverse proxy voor:
- SSL terminatie (HTTPS)
- HTTP naar HTTPS redirect
- Compressie (gzip)
- Caching van static assets

**Nginx configuratie:**

Open `C:\nginx\conf\nginx.conf` en vervang de inhoud met:

```nginx
worker_processes 2;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    # Gzip Compressie
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name jouw-domein.nl www.jouw-domein.nl;
        
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name jouw-domein.nl www.jouw-domein.nl;

        # SSL Certificaten (zie volgende sectie)
        ssl_certificate      C:/nginx/ssl/certificate.crt;
        ssl_certificate_key  C:/nginx/ssl/private.key;

        # SSL Security
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Client Max Body Size (voor file uploads)
        client_max_body_size 50M;

        # Proxy naar Node.js applicatie
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
            proxy_read_timeout 300;
            proxy_connect_timeout 300;
        }

        # Cache static assets (PWA)
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://localhost:5000;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Service Worker (mag NIET gecached worden)
        location = /sw.js {
            proxy_pass http://localhost:5000;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
}
```

**Configuratie testen:**

```cmd
cd C:\nginx
nginx -t
```

Output moet zijn: `syntax is ok` en `test is successful`.

**Nginx herstarten:**

```cmd
nssm restart nginx
```

**Of zonder NSSM:**
```cmd
cd C:\nginx
nginx -s reload
```

### 3. Windows Firewall Configuratie

Open poorten voor HTTP en HTTPS:

```cmd
netsh advfirewall firewall add rule name="HTTP Port 80" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="HTTPS Port 443" dir=in action=allow protocol=TCP localport=443
```

**Blokkeer directe toegang tot Node.js (poort 5000):**

```cmd
netsh advfirewall firewall add rule name="Block Node.js Direct Access" dir=in action=block protocol=TCP localport=5000 remoteip=any
```

Dit zorgt ervoor dat gebruikers ALLEEN via Nginx (HTTPS) kunnen verbinden, niet direct naar Node.js.

---

## SSL Certificaat Installatie

Voor productie gebruik is een geldig SSL certificaat vereist voor HTTPS.

### Optie A: Let's Encrypt (Gratis, Aanbevolen)

**Windows + Let's Encrypt:**

1. Download **win-acme** (Let's Encrypt client voor Windows): https://www.win-acme.com/
2. Unzip naar `C:\win-acme`
3. Voer uit als Administrator:

```cmd
cd C:\win-acme
wacs.exe
```

4. Volg wizard:
   - Kies **"Create certificate (full options)"**
   - Target: **"Manual input"**
   - Domain: `jouw-domein.nl,www.jouw-domein.nl`
   - Validation: **"HTTP validation"** (zorg dat poort 80 bereikbaar is)
   - **Voor Nginx**:
     - Store: **"PEM encoded files"**
     - Path: `C:\nginx\ssl\`
   - **Voor IIS**:
     - Store: **"Certificate Store"**
     - Store location: **"Web Hosting"**

5. **Nginx**: Certificaten worden opgeslagen in:
   - `C:\nginx\ssl\certificate.crt`
   - `C:\nginx\ssl\private.key`

6. **IIS**: Certificaat wordt automatisch geïmporteerd in Windows Certificate Store:
   - Open IIS Manager
   - Selecteer server node
   - Dubbelklik **Server Certificates**
   - Certificaat is zichtbaar en klaar voor gebruik in site bindings

7. Automatische renewal: win-acme maakt een Windows Scheduled Task aan voor automatische vernieuwing (elke 60 dagen).

### Optie B: Commercieel Certificaat

Als je een certificaat koopt (bijv. van Sectigo, DigiCert):

1. Genereer CSR (Certificate Signing Request):
```cmd
openssl req -new -newkey rsa:2048 -nodes -keyout C:\nginx\ssl\private.key -out C:\nginx\ssl\certificate.csr
```

2. Upload CSR naar certificaat provider en download certificaat (`.crt` of `.cer` bestand)

3. Plaats certificaat bestanden in `C:\nginx\ssl\`:
   - `certificate.crt` - Uw certificaat + intermediate chain
   - `private.key` - Private key

### Certificaat Verificatie

Test SSL configuratie:

```cmd
cd C:\nginx
nginx -t
nssm restart nginx
```

Ga naar https://www.ssllabs.com/ssltest/ en voer uw domein in voor een security scan (moet minimaal A rating krijgen).

---

## Onderhoud & Beheer

### 1. Database Backups

**Automatische Backup Script (PowerShell):**

Maak `C:\Scripts\backup-database.ps1`:

```powershell
# Database Backup Script
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "C:\Backups\AmbulancePlanning"
$backupFile = "$backupDir\ambulance_planning_$timestamp.sql"

# Maak backup directory indien niet bestaat
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

# Detecteer PostgreSQL installatie directory (ondersteunt versie 12+)
$pgPath = $null
$possibleVersions = @("16", "15", "14", "13", "12")
foreach ($version in $possibleVersions) {
    $testPath = "C:\Program Files\PostgreSQL\$version\bin\pg_dump.exe"
    if (Test-Path $testPath) {
        $pgPath = $testPath
        break
    }
}

if (-not $pgPath) {
    Write-Error "PostgreSQL pg_dump.exe not found. Pas het pad aan in het script."
    exit 1
}

# Voer pg_dump uit
$env:PGPASSWORD = "jouw_database_wachtwoord"
& $pgPath -U ambulance_app -h localhost -d ambulance_planning -F c -f $backupFile

# Verwijder backups ouder dan 30 dagen
Get-ChildItem -Path $backupDir -Filter "*.sql" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item

Write-Host "Backup completed: $backupFile"
```

**Windows Scheduled Task aanmaken:**

1. Open **Task Scheduler**
2. Create Task:
   - **Name**: Ambulance Planning Database Backup
   - **Trigger**: Daily, 02:00 AM
   - **Action**: 
     - Program: `powershell.exe`
     - Arguments: `-ExecutionPolicy Bypass -File "C:\Scripts\backup-database.ps1"`
   - **Run with highest privileges**: Aanvinken

**Database Restore:**

⚠️ **Let op**: Pas het PostgreSQL versie nummer aan naar jouw geïnstalleerde versie (12, 13, 14, 15, of 16).

```cmd
set PGPASSWORD=jouw_database_wachtwoord
"C:\Program Files\PostgreSQL\14\bin\pg_restore.exe" -U ambulance_app -h localhost -d ambulance_planning -c "C:\Backups\AmbulancePlanning\ambulance_planning_2025-11-23_02-00-00.sql"
```

**Best Practice**: Test regelmatig (bijv. maandelijks) een restore op een test database om te verifiëren dat backups correct werken:

```cmd
# Maak test database
psql -U postgres -c "CREATE DATABASE ambulance_planning_test;"

# Restore backup naar test database
set PGPASSWORD=jouw_database_wachtwoord
"C:\Program Files\PostgreSQL\14\bin\pg_restore.exe" -U ambulance_app -h localhost -d ambulance_planning_test -c "C:\Backups\AmbulancePlanning\ambulance_planning_2025-11-23_02-00-00.sql"

# Verifieer data
psql -U ambulance_app -d ambulance_planning_test -c "SELECT COUNT(*) FROM users;"

# Verwijder test database
psql -U postgres -c "DROP DATABASE ambulance_planning_test;"
```

### 2. Applicatie Updates

**Update Process:**

```cmd
cd C:\inetpub\ambulance-planning

# Stop applicatie
pm2 stop ambulance-planning

# Backup huidige versie
xcopy /E /I /Y . ..\ambulance-planning-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%

# Pull nieuwe code (als je Git gebruikt)
git pull origin main

# Of: unzip nieuwe versie over bestaande bestanden

# Installeer eventuele nieuwe dependencies
npm install

# Build nieuwe versie
npm run build

# Database migraties (indien aanwezig)
npm run db:push

# Herstart applicatie
pm2 restart ambulance-planning

# Controleer logs
pm2 logs ambulance-planning --lines 100
```

**Rollback bij problemen:**

```cmd
pm2 stop ambulance-planning
rd /S /Q C:\inetpub\ambulance-planning
move C:\inetpub\ambulance-planning-backup-20251123 C:\inetpub\ambulance-planning
pm2 restart ambulance-planning
```

### 3. Log Monitoring

**PM2 Logs:**

```cmd
# Real-time logs
pm2 logs ambulance-planning

# Laatste 200 regels
pm2 logs ambulance-planning --lines 200

# Alleen errors
pm2 logs ambulance-planning --err
```

**Nginx Access Logs:**
- Locatie: `C:\nginx\logs\access.log`
- Rotatie: Configureer log rotation voor grote bestanden

**Database Logs:**
- Locatie: `C:\Program Files\PostgreSQL\14\data\log\`
- Configuratie: `postgresql.conf`

### 4. Performance Monitoring

**PM2 Monitoring:**

```cmd
pm2 monit
```

Toont real-time:
- CPU gebruik
- Memory gebruik
- Active requests

**Database Performance:**

Langzame queries identificeren:

```sql
-- Enable slow query logging in postgresql.conf:
-- log_min_duration_statement = 1000  # Log queries > 1 seconde

-- Bekijk actieve queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

**Disk Space Monitoring:**

Zorg dat minimaal 20% vrije ruimte beschikbaar blijft.

```cmd
wmic logicaldisk get caption,freespace,size
```

---

## Troubleshooting

### 1. Applicatie Start Niet

**Symptomen:** PM2 toont status `errored` of `stopped`

**Diagnose:**

```cmd
pm2 logs ambulance-planning --err --lines 50
```

**Veelvoorkomende Oorzaken:**

**A. Database Connectie Fout**

Error: `error: password authentication failed` of `ECONNREFUSED`

**Oplossing:**
- Controleer `DATABASE_URL` in `.env` bestand
- Verificeer PostgreSQL service draait:
  ```cmd
  sc query postgresql-x64-14
  ```
- Test database connectie:
  ```cmd
  psql -U ambulance_app -d ambulance_planning -h localhost
  ```

**B. Poort 5000 Al In Gebruik**

Error: `EADDRINUSE: address already in use :::5000`

**Oplossing:**
```cmd
# Vind proces op poort 5000
netstat -ano | findstr :5000

# Kill proces (gebruik PID uit netstat output)
taskkill /PID <PID> /F

# Of wijzig poort in .env bestand
```

**C. Missing Environment Variabelen**

Error: `SESSION_SECRET is not defined`

**Oplossing:**
- Controleer of `.env` bestand aanwezig is in applicatie root
- Verifieer alle vereiste variabelen:
  ```cmd
  type .env
  ```

### 2. Push Notifications Werken Niet

**Symptomen:** Gebruikers kunnen niet subscriben of ontvangen geen notificaties

**Diagnose:**

**A. VAPID Keys Ontbreken**

Check `.env` bestand voor:
```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_CONTACT_EMAIL=...
```

**B. HTTPS Vereist**

Push notifications werken ALLEEN over HTTPS (behalve `localhost`). Controleer:
- Geldig SSL certificaat geïnstalleerd
- Nginx HTTPS configuratie correct
- Browser toont groene slotje in adresbalk

**C. Browser Blokkering**

Sommige browsers blokkeren notificaties standaard:
- Gebruiker moet expliciet toestemming geven
- Check browser instellingen: `chrome://settings/content/notifications`
- Controleer of domein niet geblokkeerd is

**D. Service Worker Registratie**

Open browser Developer Tools (F12) → Console:
- Check voor errors bij service worker registratie
- Ga naar Application tab → Service Workers
- Moet `sw.js` actief tonen

**Logs checken:**
```cmd
pm2 logs ambulance-planning | findstr "push"
```

### 3. Database Performance Problemen

**Symptomen:** Trage queries, timeouts, hoog CPU gebruik

**Diagnose:**

**A. Vacuuming & Analyze**

PostgreSQL heeft regelmatig onderhoud nodig:

```sql
-- Manual vacuum (kan lang duren)
VACUUM ANALYZE;

-- Autovacuum status checken
SELECT schemaname, tablename, last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY last_autovacuum;
```

**B. Index Optimalisatie**

Vind missing indexes:

```sql
-- Toon tabellen zonder indexes
SELECT tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
ORDER BY n_distinct DESC;
```

**C. Connection Pool Size**

Verhoog max connections in `postgresql.conf`:
```
max_connections = 100  # Default is vaak 100
```

Herstart PostgreSQL service na wijziging.

### 4. Nginx / SSL Issues

**Symptomen:** 502 Bad Gateway, SSL errors, connection refused

**A. 502 Bad Gateway**

Nginx kan Node.js applicatie niet bereiken.

**Oplossing:**
- Controleer of PM2 applicatie draait:
  ```cmd
  pm2 status
  ```
- Test directe connectie naar Node.js:
  ```cmd
  curl http://localhost:5000
  ```
- Check Nginx error logs:
  ```cmd
  type C:\nginx\logs\error.log
  ```

**B. SSL Certificate Expired**

Let's Encrypt certificaten verlopen na 90 dagen.

**Oplossing:**
- Check expiry datum:
  ```cmd
  openssl x509 -in C:\nginx\ssl\certificate.crt -noout -dates
  ```
- Vernieuw met win-acme:
  ```cmd
  cd C:\win-acme
  wacs.exe --renew
  ```

**C. Mixed Content Warnings**

Browser console toont: `Mixed Content: The page was loaded over HTTPS, but requested an insecure resource`

**Oplossing:**
- Zorg dat `PUBLIC_URL` in `.env` begint met `https://`
- Check dat alle interne links relatief zijn of HTTPS gebruiken

### 5. Session / Login Problemen

**Symptomen:** Gebruikers worden automatisch uitgelogd, sessies verdwijnen

**A. Session Store Database**

Applicatie gebruikt PostgreSQL voor session opslag. Check:

```sql
SELECT * FROM session LIMIT 10;
```

Als tabel niet bestaat, voer uit:
```cmd
npm run db:push
```

**B. SESSION_SECRET Gewijzigd**

Als `SESSION_SECRET` wijzigt, worden alle bestaande sessies ongeldig.

**Oplossing:**
- Gebruik altijd dezelfde `SESSION_SECRET`
- Backup `.env` bestand bij updates

### 6. File Upload Problemen

**Symptomen:** Excel import / profielfoto upload faalt

**A. File Size Limit**

Check Nginx configuratie:
```nginx
client_max_body_size 50M;
```

**B. Disk Permissions**

Applicatie moet schrijfrechten hebben op upload directory:

```cmd
icacls "C:\inetpub\ambulance-planning\uploads" /grant "Users:(OI)(CI)F"
```

### 7. Windows Server Specifieke Issues

**A. Node.js Performance op Windows**

Windows heeft vaak lagere I/O performance dan Linux. Optimalisaties:

```cmd
# Verhoog Node.js memory limit
pm2 start dist/index.js --name ambulance-planning --node-args="--max-old-space-size=4096"

# Disable Windows Defender real-time scanning voor Node.js folders
# (Voeg exclusions toe via Windows Security instellingen)
```

**B. Path Length Limitations**

Windows heeft een 260 karakter path limiet. Bij `npm install` errors:

```cmd
# Enable long path support (Windows 10 1607+, Windows Server 2016+)
reg add HKLM\SYSTEM\CurrentControlSet\Control\FileSystem /v LongPathsEnabled /t REG_DWORD /d 1 /f
```

Herstart server na deze wijziging.

---

## Contact & Support

**Applicatie Issues:**
- Check eerst deze troubleshooting guide
- Verzamel relevante logs (PM2, Nginx, PostgreSQL)
- Documenteer reproductiestappen

**Database Backup Strategie:**
- **Daily**: Automatische backup (zie Onderhoud sectie)
- **Voor updates**: Manual backup
- **Bewaarperiode**: Minimum 30 dagen

**Aanbevolen Update Schedule:**
- **Security patches**: Binnen 7 dagen
- **Feature updates**: Maandelijks (na testing)
- **PostgreSQL/Node.js updates**: Elk kwartaal

---

## Appendix: Configuratie Checklist

Gebruik deze checklist bij nieuwe installatie:

### Pre-installatie
- [ ] Windows Server 2016+ geïnstalleerd
- [ ] Statisch IP-adres of DHCP reservering
- [ ] DNS records geconfigureerd (A record voor domein)
- [ ] Remote Desktop toegang geconfigureerd

### Software Installatie
- [ ] Node.js 18 LTS geïnstalleerd en geverifieerd (`node --version`)
- [ ] PostgreSQL 12+ geïnstalleerd en service draait
- [ ] Git voor Windows geïnstalleerd (`git --version`)
- [ ] PM2 globally geïnstalleerd **als Administrator** (`pm2 --version`)
- [ ] PM2 startup geïnstalleerd (`pm2-startup install`)
- [ ] **Keuze gemaakt**: Nginx OF IIS als reverse proxy
- [ ] **Indien Nginx**: Nginx gedownload en geconfigureerd als service (NSSM)
- [ ] **Indien IIS**: URL Rewrite & ARR modules geïnstalleerd
- [ ] Windows Defender exclusions toegevoegd voor performance
- [ ] (Optioneel) win-acme voor Let's Encrypt

### Database Setup
- [ ] Database `ambulance_planning` aangemaakt
- [ ] Database user `ambulance_app` aangemaakt met rechten
- [ ] Connection string getest met psql
- [ ] PostgreSQL poort 5432 geblokkeerd voor externe toegang

### Applicatie Setup
- [ ] Source code geplaatst in `C:\inetpub\ambulance-planning`
- [ ] `.env` bestand aangemaakt met alle variabelen
- [ ] `npm install` succesvol uitgevoerd
- [ ] `npm run build` succesvol uitgevoerd
- [ ] `npm run db:push` succesvol uitgevoerd (schema migratie)
- [ ] VAPID keys gegenereerd en toegevoegd aan `.env`

### Deployment
- [ ] PM2 applicatie gestart met `pm2 start dist/index.js`
- [ ] PM2 configuratie opgeslagen met `pm2 save`
- [ ] PM2 logs gecontroleerd op errors (`pm2 logs ambulance-planning`)
- [ ] **Indien Nginx**: Configuratie aangepast voor domein en getest (`nginx -t`)
- [ ] **Indien IIS**: Website en URL Rewrite rules geconfigureerd
- [ ] **Indien IIS**: WebSocket support enabled in Configuration Editor
- [ ] SSL certificaat geïnstalleerd (win-acme of commercieel)
- [ ] **Indien Nginx**: Nginx service herstart (`nssm restart nginx`)
- [ ] **Indien IIS**: IIS website gestart in IIS Manager
- [ ] Windows Firewall regels toegevoegd (poort 80, 443 open)
- [ ] Node.js poort 5000 geblokkeerd voor externe toegang

### Verificatie
- [ ] HTTP automatisch redirect naar HTTPS
- [ ] Applicatie bereikbaar via HTTPS (https://jouw-domein.nl)
- [ ] Browser toont geldig SSL certificaat (groen slotje)
- [ ] Login werkt met test gebruiker account
- [ ] Dashboard laadt zonder JavaScript errors (check browser console F12)
- [ ] Service Worker geregistreerd (F12 → Application → Service Workers)
- [ ] Push notifications test succesvol vanuit Profiel pagina
- [ ] iCal feed werkt (kopieer personal token URL uit Profiel)
- [ ] Database backup script handmatig getest
- [ ] Scheduled task voor backups aangemaakt (Task Scheduler)
- [ ] SSL Labs scan toont minimaal A rating (https://www.ssllabs.com/ssltest/)
- [ ] PM2 herstart automatisch na server reboot (test met `shutdown /r /t 0`)

### Productie Gereed
- [ ] Alle test gebruikers verwijderd
- [ ] Administrator wachtwoorden gewijzigd
- [ ] Database wachtwoorden veilig opgeslagen
- [ ] `.env` bestand beveiligd (read-only voor admin only)
- [ ] Monitoring ingesteld (PM2, disk space)
- [ ] Update procedure gedocumenteerd
- [ ] Rollback procedure getest

---

**Einde IT Beheerders Handleiding v2025.6**
