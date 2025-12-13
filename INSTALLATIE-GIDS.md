# Ambulance Planning Systeem - Installatie Gids

Deze gids beschrijft de volledige installatie van het Ambulance Planning Systeem op een Windows Server omgeving.

---

## Deel 1: Vereisten - Wat de Klant Moet Voorzien

### 1.1 Hardware & Infrastructuur

| Component | Minimum Vereiste | Aanbevolen |
|-----------|------------------|------------|
| **Server** | Windows Server 2019+ | Windows Server 2022 |
| **RAM** | 4 GB | 8 GB |
| **CPU** | 2 cores | 4 cores |
| **Opslag** | 50 GB SSD | 100 GB SSD |
| **Netwerk** | Stabiele internetverbinding | Glasvezel |

### 1.2 Netwerk & Domein

- [ ] **Statisch IP-adres** voor de server
- [ ] **DNS A-record** wijzend naar het server IP (bijv. `planning.uwzone.be`)
- [ ] **Publiek bereikbaar domein** met SSL mogelijkheid
- [ ] **Firewall poorten open:**
  - Poort 80 (HTTP)
  - Poort 443 (HTTPS)
  - Poort 3389 (RDP - voor remote beheer, beperkt tot specifieke IP's)

### 1.3 Toegang voor Installateur

| Type | Details |
|------|---------|
| **RDP Toegang** | Administrator account met volledige rechten |
| **Optioneel: VPN** | Als RDP niet direct beschikbaar is, VPN-toegang voorzien |
| **Git Repository Toegang** | Toegang tot de ambulance-planning Git repository |

### 1.4 Externe Diensten (Optioneel maar Aanbevolen)

#### SMTP Email Server (voor wachtwoord reset en notificaties)
- [ ] SMTP Host (bijv. `smtp.office365.com`)
- [ ] SMTP Poort (bijv. `587`)
- [ ] SMTP Gebruikersnaam
- [ ] SMTP Wachtwoord
- [ ] Afzender e-mailadres (bijv. `planning@uwzone.be`)

#### Verdi Integratie (indien van toepassing)
- [ ] Verdi API URL (bijv. `https://uwzone.verdi.cloud`)
- [ ] Verdi Auth ID
- [ ] Verdi Auth Secret
- [ ] Verdi Excel export met alle personeelsleden en hun GUIDs

### 1.5 Initiële Data

- [ ] **Lijst van stations** met namen en codes
- [ ] **Administrator account** gegevens (naam, email, wachtwoord)
- [ ] **Lijst van gebruikers** met:
  - Voornaam, achternaam
  - Email
  - Telefoonnummer
  - Station toewijzing
  - Rol (admin/supervisor/ambulancier)
  - Rijbewijs C (ja/nee)
  - Uren per maand

---

## Deel 2: Software Installatie

### 2.1 Node.js Installeren

1. Download Node.js LTS (v20.x) van https://nodejs.org/
2. Voer de installer uit met standaard opties
3. Herstart PowerShell en verifieer:
   ```powershell
   node --version   # Moet v20.x.x tonen
   npm --version    # Moet 10.x.x tonen
   ```

### 2.2 Git Installeren

1. Download Git van https://git-scm.com/download/win
2. Installeer met standaard opties
3. Verifieer:
   ```powershell
   git --version
   ```

### 2.3 PostgreSQL Installeren

1. Download PostgreSQL 15+ van https://www.postgresql.org/download/windows/
2. Tijdens installatie:
   - Noteer het wachtwoord voor de `postgres` gebruiker
   - Laat standaard poort 5432
   - Installeer pgAdmin 4 mee

3. Open pgAdmin 4 en maak een nieuwe database:
   ```sql
   CREATE DATABASE ambulance_planning;
   ```

4. Maak een dedicated gebruiker (optioneel maar aanbevolen):
   ```sql
   CREATE USER app_user WITH PASSWORD 'sterk_wachtwoord_hier';
   GRANT ALL PRIVILEGES ON DATABASE ambulance_planning TO app_user;
   ```

### 2.4 PM2 Installeren (Process Manager)

```powershell
npm install -g pm2
pm2 --version
```

### 2.5 Nginx Installeren (Reverse Proxy)

1. Download Nginx van https://nginx.org/en/download.html (Windows versie)
2. Pak uit naar `C:\nginx`
3. Test de installatie:
   ```powershell
   cd C:\nginx
   .\nginx.exe
   ```
4. Open browser naar http://localhost - je zou de Nginx welkom pagina moeten zien

---

## Deel 3: Applicatie Installatie

### 3.1 Repository Klonen

```powershell
cd C:\
git clone https://github.com/[repository-url] ambulance-planning
cd C:\ambulance-planning
```

### 3.2 Environment Variabelen Configureren

**Belangrijk:** De meeste instellingen (SMTP, Verdi, Push Notificaties) worden geconfigureerd via de web-interface nadat de applicatie draait. Het PM2 configuratiebestand bevat alleen de essentiële server-instellingen.

#### Overzicht Environment Variabelen

**Verplichte variabelen (ecosystem.config.cjs):**

| Variabele | Beschrijving | Voorbeeld |
|-----------|--------------|-----------|
| `DATABASE_URL` | PostgreSQL connectie string | `postgresql://app_user:wachtwoord@localhost:5432/ambulance_planning` |
| `SESSION_SECRET` | Sessie encryptie (min. 32 karakters, random hex) | Genereer met commando hieronder |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server poort | `5000` |
| `HOST` | Bind adres | `0.0.0.0` |

**Optionele variabelen (ecosystem.config.cjs):**

| Variabele | Beschrijving | Standaard |
|-----------|--------------|-----------|
| `PUBLIC_URL` | Publieke URL voor kalender feed links | Afgeleid van request URL |

**Instellingen via Web Interface:**

De volgende instellingen worden geconfigureerd via de admin interface na eerste login:

| Instelling | Menu Locatie | Beschrijving |
|------------|--------------|--------------|
| SMTP Email | Instellingen > Reportage | Host, poort, gebruiker, wachtwoord, afzender |
| VAPID Keys | Instellingen > Push Notificaties | Public/Private key, contact email |
| Verdi API | Verdi Integratie | URL, Auth ID, Secret, station mappings |

**Waarom via Web Interface?**
- SMTP wachtwoorden worden versleuteld opgeslagen in de database
- VAPID keys kunnen gegenereerd worden zonder command line toegang
- Instellingen kunnen worden aangepast zonder server herstart

#### Configuratie Aanmaken

Kopieer het voorbeeld bestand:

```powershell
copy ecosystem.config.example.cjs ecosystem.config.cjs
```

**BEVEILIGINGSWAARSCHUWING:** Het `ecosystem.config.cjs` bestand bevat gevoelige gegevens (database wachtwoord, session secret). Zorg dat dit bestand:
- Niet in versiebeheer wordt opgenomen (staat al in `.gitignore`)
- Alleen leesbaar is voor de applicatie-gebruiker
- Regelmatig wordt gebackupt op een veilige locatie

Bewerk `ecosystem.config.cjs` en pas de volgende waarden aan:

```javascript
module.exports = {
  apps: [{
    name: 'ambulance-planning',
    script: 'node',
    args: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      HOST: '0.0.0.0',
      // DATABASE: Pas aan met uw database gegevens
      DATABASE_URL: 'postgresql://app_user:WIJZIG_DIT_WACHTWOORD@localhost:5432/ambulance_planning',
      // SESSIE: Genereer een unieke string - zie commando hieronder
      SESSION_SECRET: 'GENEREER_NIEUWE_SECRET_ZIE_INSTRUCTIES',
      // OPTIONEEL: Publieke URL voor kalender feeds
      // PUBLIC_URL: 'https://planning.uwzone.be'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_restarts: 5,
    min_uptime: '30s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    restart_delay: 5000
  }]
};
```

#### Session Secret Genereren

**Belangrijk:** Gebruik altijd een unieke, willekeurig gegenereerde secret voor elke installatie!

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Kopieer de output en vervang `GENEREER_NIEUWE_SECRET_ZIE_INSTRUCTIES` in het configuratiebestand.

#### Logs Map Aanmaken

```powershell
mkdir C:\ambulance-planning\logs
```

### 3.3 Dependencies Installeren en Bouwen

```powershell
cd C:\ambulance-planning
npm ci
npm run build
```

### 3.4 Database Migraties Uitvoeren

```powershell
npm run db:push
```

### 3.5 PM2 Configureren

De applicatie gebruikt het `ecosystem.config.cjs` bestand dat u in stap 3.2 heeft geconfigureerd.

Start de applicatie:

```powershell
cd C:\ambulance-planning
pm2 start ecosystem.config.cjs
pm2 save
```

**Automatisch starten bij Windows opstart:**

Voer dit commando uit en volg de instructies:
```powershell
pm2 startup
```

PM2 toont een commando dat u moet uitvoeren in een Administrator PowerShell venster.

### 3.6 Verifieer dat de Applicatie Draait

```powershell
pm2 status
pm2 logs
```

Test lokaal: Open browser naar http://localhost:5000

---

## Deel 4: Nginx Configuratie (Reverse Proxy + SSL)

### 4.1 Nginx Configureren

Bewerk `C:\nginx\conf\nginx.conf`:

```nginx
worker_processes 1;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;

    # Gzip compressie
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # HTTP naar HTTPS redirect
    server {
        listen 80;
        server_name planning.uwzone.be;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl;
        server_name planning.uwzone.be;

        # SSL certificaten (zie sectie 4.2)
        ssl_certificate     C:/nginx/ssl/certificate.crt;
        ssl_certificate_key C:/nginx/ssl/private.key;

        # SSL instellingen
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Proxy naar Node.js applicatie
        location / {
            proxy_pass http://127.0.0.1:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            proxy_pass http://127.0.0.1:5000;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 4.2 SSL Certificaat Installeren

#### Optie A: Let's Encrypt met win-acme (Gratis)

1. Download win-acme van https://www.win-acme.com/
2. Pak uit naar `C:\win-acme`
3. Voer uit:
   ```powershell
   cd C:\win-acme
   .\wacs.exe
   ```
4. Volg de wizard:
   - Kies "Create new certificate"
   - Voer uw domein in
   - Kies validatie methode (HTTP of DNS)
   - Sla certificaten op in `C:\nginx\ssl`

#### Optie B: Gekocht SSL Certificaat

1. Maak een CSR (Certificate Signing Request)
2. Koop certificaat bij een provider
3. Plaats de bestanden in `C:\nginx\ssl`:
   - `certificate.crt` - Het SSL certificaat
   - `private.key` - De private key

### 4.3 Nginx als Windows Service

1. Download NSSM van https://nssm.cc/
2. Installeer Nginx als service:
   ```powershell
   nssm install nginx C:\nginx\nginx.exe
   nssm set nginx AppDirectory C:\nginx
   nssm start nginx
   ```

---

## Deel 5: Initiële Setup

### 5.1 Stations Aanmaken

Stations kunnen op twee manieren worden aangemaakt:

#### Optie A: Via de Web Interface (Aanbevolen)

Supervisors kunnen stations volledig beheren via de web interface:

1. Login als supervisor
2. Ga naar **Integraties** (via het dashboard menu)
3. Scroll naar de **Stationbeheer** sectie
4. Klik op **Nieuw Station** om een station toe te voegen
5. Vul de gegevens in:
   - **Weergavenaam**: De volledige naam (bijv. "ZW Westerlo")
   - **Code**: Korte code voor weergave (bijv. "WL") - wordt automatisch hoofdletters
   - **Interne naam**: Technische identifier (bijv. "westerlo") - kleine letters, geen spaties

Bestaande stations kunnen ook bewerkt of verwijderd worden via het Stations Overzicht.

**Let op bij verwijderen:** Als een station gekoppelde data heeft (gebruikers, shifts, voorkeuren), wordt een waarschuwing getoond. Verwijdering is mogelijk maar alle gekoppelde data wordt ook verwijderd.

#### Optie B: Via de Database (Alleen voor initiële setup)

Als er nog geen supervisor account bestaat, kunnen de eerste stations via SQL worden aangemaakt:

1. Open pgAdmin en verbind met de database
2. Voer SQL uit om stations aan te maken:

```sql
INSERT INTO stations (name, code, display_name) VALUES
('station1', 'ST1', 'Station Naam 1'),
('station2', 'ST2', 'Station Naam 2');
```

**Veldnamen:** 
- `name` = interne identifier (kleine letters, geen spaties)
- `code` = korte code voor weergave
- `display_name` = volledige naam voor gebruikers

### 5.2 Station Uurlimieten Configureren (Optioneel)

Na het aanmaken van stations kunt u per station de uurlimieten per maand configureren via de web interface:
1. Login als admin of supervisor
2. Ga naar **Instellingen > Stations**
3. Klik op een station om de uurlimieten in te stellen
4. Configureer de standaard uren per maand per gebruiker

### 5.3 Admin Gebruiker Aanmaken

**Belangrijk:** Wachtwoorden moeten gehashed worden met bcrypt. Dit kan niet via een simpele SQL query.

De installateur maakt de eerste admin aan met een script:

```powershell
cd C:\ambulance-planning
node -e "
const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('TIJDELIJK_WACHTWOORD', 10);
console.log('Gebruik deze hash in de SQL query:', hash);
"
```

Voer vervolgens in pgAdmin uit:

```sql
INSERT INTO users (
  username, password, email, first_name, last_name, 
  role, station_id, is_active, hours_per_month
) VALUES (
  'admin',
  'PLAK_BCRYPT_HASH_HIER',
  'admin@uwzone.be',
  'Admin',
  'Beheerder',
  'admin',
  (SELECT id FROM stations LIMIT 1),
  true,
  0
);
```

**Na eerste login:**
1. Wijzig onmiddellijk het tijdelijke wachtwoord via **Profiel > Wachtwoord wijzigen**
2. Maak extra gebruikers aan via **Beheer > Gebruikers**

### 5.4 Configuratie via Web Interface

Na de eerste login als admin, configureer de volgende instellingen via het menu:

#### Push Notificaties (Instellingen > Push Notificaties)
1. Genereer VAPID keys in PowerShell:
   ```powershell
   npx web-push generate-vapid-keys
   ```
2. Kopieer de Public en Private key
3. Voer deze in op de Push Notificaties pagina
4. Sla op en test met een testbericht

#### SMTP Email (Instellingen > Reportage)
Configureer voor wachtwoord reset functionaliteit:
- SMTP Host (bijv. `smtp.office365.com`)
- SMTP Poort (bijv. `587`)
- Gebruikersnaam en wachtwoord
- Afzender e-mailadres

#### Verdi Integratie (als van toepassing)
Via **Verdi Integratie** pagina:
1. Voer de Verdi URL, Auth ID en Secret in
2. Configureer per station de Verdi koppeling
3. Importeer de Verdi Excel met gebruiker mappings
4. Configureer positie mappings (Chauffeur/Ambulancier)

---

## Deel 6: Updates en Onderhoud

### 6.1 Updates Installeren

Bij elke update, voer deze stappen uit:

```powershell
cd C:\ambulance-planning
git pull origin main
npm ci
npm run build
npm run db:push
pm2 restart all
```

### 6.2 Logs Bekijken

```powershell
pm2 logs                          # Live logs
pm2 logs --lines 100              # Laatste 100 regels
pm2 logs ambulance-planning       # Specifieke app
```

### 6.3 Backup Procedure

#### Database Backup

```powershell
# Handmatige backup
pg_dump -U postgres -d ambulance_planning > C:\backups\backup_$(Get-Date -Format "yyyyMMdd").sql
```

#### Automatische Backup (Task Scheduler)

1. Open Task Scheduler
2. Maak nieuwe taak "Daily Database Backup"
3. Trigger: Dagelijks om 02:00
4. Actie: Start programma
   - Program: `pg_dump`
   - Arguments: `-U postgres -d ambulance_planning -f C:\backups\backup_%date%.sql`

### 6.4 Monitoring

Controleer regelmatig:
- `pm2 status` - Status van de applicatie
- `pm2 monit` - Live monitoring
- Windows Event Viewer - Systeemfouten
- Nginx logs in `C:\nginx\logs`

---

## Deel 7: Remote Beheer Setup

### 7.1 RDP Toegang Beveiligen

1. **Wijzig standaard RDP poort** (optioneel):
   - Registry: `HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp`
   - Wijzig `PortNumber` naar bijv. 3390

2. **Beperk RDP toegang tot specifieke IP's**:
   - Windows Firewall > Inbound Rules > Remote Desktop
   - Scope > Remote IP address > Voeg alleen toegestane IP's toe

3. **Sterke wachtwoorden** voor alle accounts

### 7.2 VPN Setup (Aanbevolen)

Voor extra beveiliging, overweeg WireGuard VPN:

1. Installeer WireGuard op de server
2. Configureer een peer voor de beheerder
3. RDP alleen toestaan via VPN

### 7.3 Update Procedure voor Beheerder

1. Verbind via RDP of VPN
2. Open PowerShell als Administrator
3. Voer update commando's uit (zie sectie 6.1)
4. Controleer logs en status

---

## Deel 8: Troubleshooting

### Applicatie Start Niet

```powershell
pm2 logs --err              # Bekijk error logs
pm2 restart all             # Herstart applicatie
pm2 delete all && pm2 start ecosystem.config.cjs  # Volledig herstarten
```

### Database Verbinding Mislukt

1. Controleer of PostgreSQL draait: `Get-Service postgresql*`
2. Verifieer DATABASE_URL in `ecosystem.config.cjs`
3. Test verbinding: `psql -U postgres -d ambulance_planning`

### Nginx Werkt Niet

```powershell
cd C:\nginx
.\nginx.exe -t              # Test configuratie
.\nginx.exe -s reload       # Herlaad configuratie
```

### SSL Certificaat Verlopen

```powershell
cd C:\win-acme
.\wacs.exe --renew --force
```

---

## Deel 9: Beveiliging

### 9.1 Firewall Configuratie

Configureer Windows Firewall met de volgende regels:

| Poort | Protocol | Richting | Toegang |
|-------|----------|----------|---------|
| 80 | TCP | Inbound | Publiek (alleen voor HTTP→HTTPS redirect) |
| 443 | TCP | Inbound | Publiek |
| 5432 | TCP | Inbound | **Alleen localhost** (PostgreSQL) |
| 5000 | TCP | Inbound | **Alleen localhost** (Node.js app) |
| 3389 | TCP | Inbound | Specifieke IP's (RDP beheer) |

**PostgreSQL beveiligen:**
```powershell
# Blokkeer externe toegang tot PostgreSQL
netsh advfirewall firewall add rule name="Block PostgreSQL External" dir=in action=block protocol=TCP localport=5432 remoteip=any
netsh advfirewall firewall add rule name="Allow PostgreSQL Localhost" dir=in action=allow protocol=TCP localport=5432 remoteip=127.0.0.1
```

### 9.2 Wachtwoordbeleid

| Account Type | Minimum Lengte | Complexiteit | Rotatie |
|--------------|----------------|--------------|---------|
| Windows Admin | 16 karakters | Uppercase, lowercase, cijfers, speciale tekens | 90 dagen |
| Database User | 16 karakters | Random gegenereerd | 180 dagen |
| Session Secret | 64 karakters | Random (hex) | Bij elke herinstallatie |
| App Admin | 12 karakters | Uppercase, lowercase, cijfers | 90 dagen |

**Database wachtwoord wijzigen:**
```sql
-- In pgAdmin:
ALTER USER app_user WITH PASSWORD 'nieuw_sterk_wachtwoord';
```
Update daarna `ecosystem.config.cjs` en herstart de applicatie.

### 9.3 Credential Rotatie Procedure

**Jaarlijkse rotatie aanbevolen voor:**
1. **Session Secret:**
   - Genereer nieuwe secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Update `ecosystem.config.cjs`
   - Herstart applicatie (alle gebruikers worden uitgelogd)

2. **Database wachtwoord:**
   - Wijzig in PostgreSQL
   - Update `DATABASE_URL` in `ecosystem.config.cjs`
   - Herstart applicatie

3. **VAPID keys** (indien push notificaties actief):
   - Genereer nieuwe keys
   - Update via web interface
   - Gebruikers moeten zich opnieuw aanmelden voor notificaties

### 9.4 Bestandsbeveiliging

Zorg dat gevoelige bestanden correct beveiligd zijn:

```powershell
# Beperk toegang tot config bestand
icacls "C:\ambulance-planning\ecosystem.config.cjs" /inheritance:r
icacls "C:\ambulance-planning\ecosystem.config.cjs" /grant:r "BUILTIN\Administrators:(R)"
icacls "C:\ambulance-planning\ecosystem.config.cjs" /grant:r "NT AUTHORITY\SYSTEM:(R)"
```

### 9.5 Logging en Audit

De applicatie logt naar:
- `C:\ambulance-planning\logs\out.log` - Standaard output
- `C:\ambulance-planning\logs\err.log` - Foutmeldingen
- `C:\nginx\logs\access.log` - HTTP verzoeken
- `C:\nginx\logs\error.log` - Nginx fouten

**Bewaar logs minimaal 90 dagen** voor audit doeleinden.

### 9.6 Updates en Patches

Controleer regelmatig op beveiligingsupdates:
- **Windows Server**: Windows Update (maandelijks)
- **Node.js**: Controleer nodejs.org voor security releases
- **Applicatie**: `git pull` en herbouwen (zie sectie 6.1)
- **npm dependencies**: `npm audit` voor bekende kwetsbaarheden

---

## Contactgegevens Installateur

| Rol | Contact |
|-----|---------|
| **Primair Contact** | [Naam installateur] |
| **Email** | [email@domein.be] |
| **Telefoon** | [Telefoonnummer] |

---

## Versiegeschiedenis

| Datum | Versie | Wijzigingen |
|-------|--------|-------------|
| 13-12-2025 | 1.0 | Initiële versie |
| 13-12-2025 | 1.1 | Toegevoegd: Beveiligingssectie, environment variabelen overzicht, verbeterde database setup |
