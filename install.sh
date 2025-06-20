#!/bin/bash

# Ambulance Planning System - Automatisch Installatie Script
# Voor Ubuntu/Debian servers

set -e

echo "======================================"
echo "Ambulance Planning System Installer"
echo "======================================"

# Kleurcodes voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functies
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Controleer of script als root wordt uitgevoerd
if [[ $EUID -eq 0 ]]; then
    print_error "Dit script mag niet als root worden uitgevoerd"
    exit 1
fi

# Installatie directory
INSTALL_DIR="/home/$(whoami)/ambulance-planning"
LOG_DIR="$INSTALL_DIR/logs"

echo "Installatie directory: $INSTALL_DIR"
echo ""

# Stap 1: Systeem updates
echo "Stap 1: Systeem bijwerken..."
sudo apt update && sudo apt upgrade -y
print_success "Systeem bijgewerkt"

# Stap 2: Benodigde packages installeren
echo "Stap 2: Benodigde packages installeren..."
sudo apt install -y curl wget git nginx postgresql postgresql-contrib ufw

print_success "Packages geïnstalleerd"

# Stap 3: Node.js installeren
echo "Stap 3: Node.js installeren..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js geïnstalleerd"
else
    print_warning "Node.js is al geïnstalleerd"
fi

# Controleer Node.js versie
NODE_VERSION=$(node --version)
echo "Node.js versie: $NODE_VERSION"

# Stap 4: PM2 installeren
echo "Stap 4: PM2 installeren..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    print_success "PM2 geïnstalleerd"
else
    print_warning "PM2 is al geïnstalleerd"
fi

# Stap 5: Database configureren
echo "Stap 5: PostgreSQL configureren..."
read -p "Voer database naam in (ambulance_planning): " DB_NAME
DB_NAME=${DB_NAME:-ambulance_planning}

read -p "Voer database gebruiker in (ambulance_user): " DB_USER
DB_USER=${DB_USER:-ambulance_user}

read -s -p "Voer database wachtwoord in: " DB_PASSWORD
echo ""

# Database en gebruiker aanmaken
sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF

print_success "Database configuratie voltooid"

# Stap 6: Project directory maken
echo "Stap 6: Project directory voorbereiden..."
mkdir -p $INSTALL_DIR
mkdir -p $LOG_DIR
mkdir -p /var/backups/ambulance-planning

# Stap 7: Environment variabelen configureren
echo "Stap 7: Environment configuratie..."
read -p "Voer je domein naam in (bijv. planning.brandweer.be): " DOMAIN_NAME

# Genereer session secret
SESSION_SECRET=$(openssl rand -base64 32)

# Maak .env bestand
cat > $INSTALL_DIR/.env << EOF
# Database configuratie
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# PostgreSQL details
PGHOST=localhost
PGPORT=5432
PGDATABASE=$DB_NAME
PGUSER=$DB_USER
PGPASSWORD=$DB_PASSWORD

# Session secret
SESSION_SECRET=$SESSION_SECRET

# Server configuratie
PORT=5000
NODE_ENV=production
TRUST_PROXY=1
EOF

print_success "Environment configuratie aangemaakt"

# Stap 8: Nginx configureren
echo "Stap 8: Nginx configureren..."
sudo tee /etc/nginx/sites-available/ambulance-planning > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    access_log /var/log/nginx/ambulance-planning.access.log;
    error_log /var/log/nginx/ambulance-planning.error.log;
}
EOF

# Activeer site
sudo ln -sf /etc/nginx/sites-available/ambulance-planning /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

print_success "Nginx geconfigureerd"

# Stap 9: Firewall configureren
echo "Stap 9: Firewall configureren..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status

print_success "Firewall geconfigureerd"

# Stap 10: Backup script configureren
echo "Stap 10: Backup script configureren..."
chmod +x $INSTALL_DIR/backup.sh

# Voeg cron job toe voor dagelijkse backup om 2:00
(crontab -l 2>/dev/null; echo "0 2 * * * $INSTALL_DIR/backup.sh") | crontab -

print_success "Backup script geconfigureerd"

echo ""
echo "======================================"
echo "Installatie Voltooid!"
echo "======================================"
echo ""
echo "Volgende stappen:"
echo "1. Kopieer je projectbestanden naar: $INSTALL_DIR"
echo "2. Ga naar de project directory: cd $INSTALL_DIR"
echo "3. Installeer dependencies: npm install"
echo "4. Maak database schema aan: npm run db:push"
echo "5. Build de applicatie: npm run build"
echo "6. Start met PM2: pm2 start ecosystem.config.js"
echo "7. Configureer PM2 autostart: pm2 startup && pm2 save"
echo ""
echo "SSL Certificaat installeren:"
echo "sudo apt install certbot python3-certbot-nginx"
echo "sudo certbot --nginx -d $DOMAIN_NAME"
echo ""
echo "Database details:"
echo "- Database: $DB_NAME"
echo "- Gebruiker: $DB_USER"
echo "- Host: localhost:5432"
echo ""
echo "Toegang: http://$DOMAIN_NAME"
echo ""
print_success "Installatie script voltooid!"