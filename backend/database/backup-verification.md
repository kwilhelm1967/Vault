# Database Backup Verification Guide

## Supabase Automatic Backups

Supabase provides automatic point-in-time recovery (PITR) backups for all projects.

### Verify Automatic Backups

1. **Go to Supabase Dashboard:**
   - Visit: https://app.supabase.com
   - Select your project: `local-password-vault`

2. **Check Backup Status:**
   - Navigate to: **Database → Backups**
   - Verify:
     - ✅ Point-in-time Recovery is enabled
     - ✅ Backup retention period (typically 7 days on free tier, 30+ days on paid)
     - ✅ Last successful backup timestamp

3. **Test Backup Restoration:**
   - In Supabase Dashboard → Database → Backups
   - Click "Restore" on a recent backup
   - Verify data is restored correctly

### Backup Retention

| Plan | Retention Period |
|------|------------------|
| Free | 7 days |
| Pro | 30 days |
| Team | 30 days |
| Enterprise | Custom |

---

## Manual Backup Script

### Run Backup Verification

```bash
cd backend
node scripts/verify-backup.js
```

### Create Manual Backup

```bash
cd backend
node scripts/verify-backup.js --create-manual
```

### Automated Daily Backups

Set up cron job for daily backups:

```bash
cd backend
chmod +x scripts/setup-backup-cron.sh
./scripts/setup-backup-cron.sh
```

This will:
- Create daily backup at 2 AM
- Store backups in `backend/backups/`
- Keep last 10 backups
- Log to `/var/log/lpv-backup.log`

---

## Backup File Format

Manual backups are stored as JSON:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "tables": {
    "licenses": [...],
    "customers": [...],
    "trials": [...],
    "webhook_events": [...]
  },
  "counts": {
    "licenses": 150,
    "customers": 120,
    "trials": 45,
    "webhook_events": 500
  }
}
```

---

## Restore from Backup

### From Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard → Database → Backups
2. Select backup point
3. Click "Restore"
4. Confirm restoration

### From Manual Backup File

```bash
# Restore using Supabase SQL Editor
# 1. Open backup JSON file
# 2. Extract data for each table
# 3. Use Supabase SQL Editor to insert data
```

**Note:** Manual restoration requires SQL knowledge. Use Supabase Dashboard restore when possible.

---

## Backup Verification Checklist

- [ ] Supabase automatic backups enabled
- [ ] Backup retention period verified
- [ ] Manual backup script tested
- [ ] Automated cron job configured (optional)
- [ ] Backup restoration tested
- [ ] Backup files stored securely
- [ ] Backup location documented

---

## Troubleshooting

### Issue: Backup script fails

**Check:**
1. Supabase credentials in `.env`
2. Database connection
3. File permissions for backup directory

### Issue: Cron job not running

**Check:**
1. Cron service running: `systemctl status cron`
2. Cron job exists: `crontab -l`
3. Log file permissions: `ls -la /var/log/lpv-backup.log`

### Issue: Backup file corrupted

**Solution:**
1. Verify backup file: `node scripts/verify-backup.js --verify <backup-file>`
2. Use Supabase Dashboard restore instead
3. Check disk space: `df -h`

---

## Security Notes

- Backup files contain sensitive data (license keys, customer emails)
- Store backups securely (encrypted storage)
- Limit access to backup files (chmod 600)
- Don't commit backups to version control
- Rotate backups regularly







