#!/bin/bash

# Backup SQLite to Telegram (optional)
# Requires: BOT_TOKEN and ADMIN_CHAT_ID in .env
# Usage: bash backup_telegram.sh

cd "$(dirname "$0")"

# Load environment variables
source .env 2>/dev/null

if [ -z "$VK_BOT_TOKEN" ] || [ -z "$ADMIN_CHAT_ID" ]; then
    echo "Error: VK_BOT_TOKEN and ADMIN_CHAT_ID must be set in .env"
    exit 1
fi

# Create backup
BACKUP_DIR="./backups"
DB_FILE="./food_delivery.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/food_delivery_${DATE}.db"

mkdir -p "$BACKUP_DIR"

if command -v sqlite3 &> /dev/null; then
    sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
else
    cp "$DB_FILE" "$BACKUP_FILE"
fi

# Send to Telegram
FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)

if [ "$FILE_SIZE" -gt 0 ]; then
    curl -s -X POST "https://api.telegram.org/bot${VK_BOT_TOKEN}/sendDocument" \
        -F "chat_id=${ADMIN_CHAT_ID}" \
        -F "document=@${BACKUP_FILE}" \
        -F "caption=Backup food_delivery_${DATE}.db ($(du -h "$BACKUP_FILE" | cut -f1))"
    
    echo "Backup sent to Telegram: $BACKUP_FILE"
else
    echo "Error: Backup file is empty"
    exit 1
fi

# Cleanup old local backups (keep 3)
cd "$BACKUP_DIR"
ls -t food_delivery_*.db 2>/dev/null | tail -n +4 | xargs -r rm
