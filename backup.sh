#!/bin/bash

# Ambulance Planning System Backup Script
# Voer uit met: ./backup.sh

# Configuratie
BACKUP_DIR="/var/backups/ambulance-planning"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="ambulance_planning"
DB_USER="ambulance_user"
PROJECT_DIR="/home/www/ambulance-planning"

# Maak backup directory aan
mkdir -p $BACKUP_DIR

echo "Starting backup process at $(date)"

# Database backup
echo "Creating database backup..."
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

if [ $? -eq 0 ]; then
    echo "Database backup successful: db_backup_$DATE.sql"
    
    # Comprimeer database backup
    gzip $BACKUP_DIR/db_backup_$DATE.sql
    echo "Database backup compressed"
else
    echo "Database backup failed!"
    exit 1
fi

# Code backup (optioneel)
echo "Creating code backup..."
tar -czf $BACKUP_DIR/code_backup_$DATE.tar.gz -C $(dirname $PROJECT_DIR) $(basename $PROJECT_DIR) \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    --exclude='dist' \
    --exclude='.env'

if [ $? -eq 0 ]; then
    echo "Code backup successful: code_backup_$DATE.tar.gz"
else
    echo "Code backup failed!"
fi

# Oude backups opruimen (behoud 7 dagen)
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "code_backup_*.tar.gz" -mtime +7 -delete

echo "Backup process completed at $(date)"

# Backup grootte tonen
echo "Current backup directory size:"
du -sh $BACKUP_DIR

# Lijst van backups tonen
echo "Available backups:"
ls -lah $BACKUP_DIR