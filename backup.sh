#!/bin/bash

# SQLite backup script for Termux
# Usage: bash backup.sh
# Can be scheduled via cron: 0 3 * * * /path/to/backup.sh

cd "$(dirname "$0")"

BACKUP_DIR="./backups"
DB_FILE="./food_delivery.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/food_delivery_${DATE}.db"

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup using SQLite .backup command (safe for concurrent access)
if command -v sqlite3 &> /dev/null; then
    sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
else
    # Fallback: copy the file directly
    cp "$DB_FILE" "$BACKUP_FILE"
fi

# Keep only last 7 backups
cd "$BACKUP_DIR"
ls -t food_delivery_*.db 2>/dev/null | tail -n +8 | xargs -r rm

echo "Backup created: $BACKUP_FILE"
echo "Backups in directory: $(ls -1 food_delivery_*.db 2>/dev/null | wc -l)"
