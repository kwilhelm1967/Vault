#!/bin/bash

# Setup Automated Database Backup Cron Job
# 
# This script sets up a daily backup cron job that:
# 1. Verifies Supabase backups are accessible
# 2. Creates manual backup if needed
# 3. Cleans up old backups
#
# Usage:
#   chmod +x scripts/setup-backup-cron.sh
#   ./scripts/setup-backup-cron.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/verify-backup.js"
LOG_FILE="/var/log/lpv-backup.log"

echo "Setting up automated database backup cron job..."
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ Backup script not found: $BACKUP_SCRIPT"
    exit 1
fi

# Create backup directory
BACKUP_DIR="$BACKEND_DIR/backups"
mkdir -p "$BACKUP_DIR"
echo "✅ Backup directory: $BACKUP_DIR"

# Create cron job (runs daily at 2 AM)
CRON_JOB="0 2 * * * cd $BACKEND_DIR && /usr/bin/node $BACKUP_SCRIPT --create-manual >> $LOG_FILE 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "⚠️  Cron job already exists. Skipping..."
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Cron job added: Daily backup at 2 AM"
fi

# Set up log rotation
if [ -f "/etc/logrotate.d/lpv-backup" ]; then
    echo "⚠️  Log rotation already configured"
else
    sudo tee /etc/logrotate.d/lpv-backup > /dev/null <<EOF
$LOG_FILE {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
EOF
    echo "✅ Log rotation configured (keeps 7 days)"
fi

echo ""
echo "✅ Backup automation setup complete!"
echo ""
echo "To test backup manually:"
echo "  cd $BACKEND_DIR"
echo "  node scripts/verify-backup.js --create-manual"
echo ""
echo "To view cron jobs:"
echo "  crontab -l"
echo ""
echo "To view backup logs:"
echo "  tail -f $LOG_FILE"







