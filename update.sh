#!/bin/bash

# Ambulance Planning System - Veilige Update Script
# Behoudt database en gebruikersdata tijdens updates

set -e

# Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "======================================"
echo "Ambulance Planning System - Update"
echo "======================================"

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

# Controleer of we in de juiste directory zijn
if [ ! -f "package.json" ]; then
    print_error "Niet in project directory. Ga naar ambulance-planning directory"
    exit 1
fi

# Stap 1: Pre-update backup
echo "Stap 1: Backup maken..."
if [ -f "./backup.sh" ]; then
    ./backup.sh
    print_success "Backup voltooid"
else
    print_warning "Backup script niet gevonden - handmatige backup aanbevolen"
fi

# Stap 2: Applicatie status controleren
echo "Stap 2: Applicatie status controleren..."
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 list | grep "ambulance-planning" || echo "not found")
    if [[ $PM2_STATUS == *"online"* ]]; then
        print_success "Applicatie draait normaal"
        APP_RUNNING=true
    else
        print_warning "Applicatie niet actief in PM2"
        APP_RUNNING=false
    fi
else
    print_warning "PM2 niet geïnstalleerd"
    APP_RUNNING=false
fi

# Stap 3: Database status controleren
echo "Stap 3: Database connectie testen..."
if psql -h localhost -U ${PGUSER:-ambulance_user} -d ${PGDATABASE:-ambulance_planning} -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database connectie OK"
else
    print_error "Database connectie fout - update gestopt"
    exit 1
fi

# Stap 4: Applicatie stoppen
if [ "$APP_RUNNING" = true ]; then
    echo "Stap 4: Applicatie stoppen..."
    pm2 stop ambulance-planning
    print_success "Applicatie gestopt"
fi

# Stap 5: Code updates
echo "Stap 5: Code bijwerken..."
if [ -d ".git" ]; then
    # Git repository - pull laatste wijzigingen
    git fetch origin
    CURRENT_COMMIT=$(git rev-parse HEAD)
    print_warning "Huidige commit: $CURRENT_COMMIT"
    
    git pull origin main
    NEW_COMMIT=$(git rev-parse HEAD)
    
    if [ "$CURRENT_COMMIT" != "$NEW_COMMIT" ]; then
        print_success "Code bijgewerkt naar: $NEW_COMMIT"
    else
        print_warning "Geen nieuwe code wijzigingen"
    fi
else
    print_warning "Geen Git repository - handmatige code update vereist"
fi

# Stap 6: Dependencies bijwerken
echo "Stap 6: Dependencies bijwerken..."
npm install
print_success "Dependencies bijgewerkt"

# Stap 7: Database schema bijwerken (veilig)
echo "Stap 7: Database schema controleren..."
# Aantal records voor update
USER_COUNT_BEFORE=$(psql -h localhost -U ${PGUSER:-ambulance_user} -d ${PGDATABASE:-ambulance_planning} -t -c "SELECT COUNT(*) FROM users;" | xargs)
SHIFT_COUNT_BEFORE=$(psql -h localhost -U ${PGUSER:-ambulance_user} -d ${PGDATABASE:-ambulance_planning} -t -c "SELECT COUNT(*) FROM shifts;" | xargs)

print_warning "Database voor update: $USER_COUNT_BEFORE gebruikers, $SHIFT_COUNT_BEFORE shifts"

# Schema update (alleen nieuwe wijzigingen)
npm run db:push

# Controleer data integriteit na update
USER_COUNT_AFTER=$(psql -h localhost -U ${PGUSER:-ambulance_user} -d ${PGDATABASE:-ambulance_planning} -t -c "SELECT COUNT(*) FROM users;" | xargs)
SHIFT_COUNT_AFTER=$(psql -h localhost -U ${PGUSER:-ambulance_user} -d ${PGDATABASE:-ambulance_planning} -t -c "SELECT COUNT(*) FROM shifts;" | xargs)

if [ "$USER_COUNT_BEFORE" -eq "$USER_COUNT_AFTER" ] && [ "$SHIFT_COUNT_BEFORE" -eq "$SHIFT_COUNT_AFTER" ]; then
    print_success "Database integriteit gecontroleerd - data behouden"
else
    print_error "Database data inconsistentie gedetecteerd!"
    print_error "Voor: $USER_COUNT_BEFORE gebruikers, $SHIFT_COUNT_BEFORE shifts"
    print_error "Na: $USER_COUNT_AFTER gebruikers, $SHIFT_COUNT_AFTER shifts"
    echo "Wilt u doorgaan? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_error "Update geannuleerd"
        exit 1
    fi
fi

# Stap 8: Applicatie rebuilden
echo "Stap 8: Applicatie rebuilden..."
npm run build
print_success "Build voltooid"

# Stap 9: Applicatie herstarten
echo "Stap 9: Applicatie herstarten..."
if command -v pm2 &> /dev/null; then
    pm2 start ecosystem.config.js
    print_success "Applicatie herstart met PM2"
    
    # Wacht op startup
    sleep 5
    
    # Controleer status
    if pm2 list | grep "ambulance-planning" | grep -q "online"; then
        print_success "Applicatie draait normaal"
    else
        print_error "Applicatie start problemen"
        pm2 logs ambulance-planning --lines 10
        exit 1
    fi
else
    print_warning "Start applicatie handmatig: npm start"
fi

# Stap 10: Functionaliteit testen
echo "Stap 10: Functionaliteit testen..."

# Test HTTP response
if curl -f -s http://localhost:5000 > /dev/null; then
    print_success "HTTP server reageert"
else
    print_error "HTTP server niet bereikbaar"
    exit 1
fi

# Test database queries
if psql -h localhost -U ${PGUSER:-ambulance_user} -d ${PGDATABASE:-ambulance_planning} -c "SELECT username FROM users LIMIT 1;" > /dev/null 2>&1; then
    print_success "Database queries werken"
else
    print_error "Database query problemen"
    exit 1
fi

echo ""
echo "======================================"
print_success "Update succesvol voltooid!"
echo "======================================"
echo ""
echo "Post-update verificatie:"
echo "- Website: http://localhost:5000"
echo "- Database: $USER_COUNT_AFTER gebruikers, $SHIFT_COUNT_AFTER shifts"
echo "- Logs: pm2 logs ambulance-planning"
echo ""
echo "Bij problemen:"
echo "- Rollback: git checkout $CURRENT_COMMIT"
echo "- Restore DB: Gebruik laatste backup"
echo "- Support: Controleer logs"