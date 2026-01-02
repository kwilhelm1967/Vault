# Database Backup Strategy

## Overview

This document outlines the backup and recovery strategy for the Local Password Vault and Local Legacy Vault applications using Supabase (PostgreSQL).

## Supabase Built-in Backups

Supabase provides automatic daily backups for all projects. These backups are retained for:
- **Free tier**: 7 days
- **Pro tier**: 7 days (configurable up to 30 days)
- **Team tier**: 30 days (configurable)

### Automatic Backup Schedule

- Backups run automatically every 24 hours
- Backups are point-in-time snapshots
- Backups include all tables, indexes, and data

## Manual Backup Procedures

### 1. Supabase Dashboard Backup

**Steps:**
1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project
3. Go to **Settings** → **Database**
4. Click **Backups** tab
5. Click **Create backup** (manual backup)
6. Wait for backup to complete
7. Download backup file if needed

**When to use:**
- Before major schema changes
- Before deploying significant updates
- Weekly manual backups (in addition to automatic)

### 2. SQL Dump via Supabase CLI

**Prerequisites:**
- Install [Supabase CLI](https://supabase.com/docs/guides/cli)
- Authenticate: `supabase login`

**Command:**
```bash
# Get project reference
supabase projects list

# Create database dump
pg_dump -h db.[project-ref].supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup_$(date +%Y%m%d_%H%M%S).dump \
  --no-password
```

**Note:** You'll need to set `PGPASSWORD` environment variable or use `.pgpass` file.

### 3. pg_dump Direct Connection

**Command:**
```bash
pg_dump -h [your-db-host].supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup_$(date +%Y%m%d_%H%M%S).dump \
  --no-password
```

**Connection details:**
- Host: Found in Supabase Dashboard → Settings → Database → Connection string
- Database: `postgres`
- User: `postgres`
- Password: Found in Supabase Dashboard → Settings → Database → Database password

## Backup Verification

### Verify Backup File

```bash
# List contents of backup
pg_restore --list backup_file.dump

# Verify backup integrity
pg_restore --dry-run backup_file.dump
```

### Test Restore (on test database)

```bash
# Create test database
createdb test_restore

# Restore backup to test database
pg_restore -d test_restore backup_file.dump

# Verify data
psql -d test_restore -c "SELECT COUNT(*) FROM licenses;"
psql -d test_restore -c "SELECT COUNT(*) FROM customers;"
```

## Recovery Procedures

### 1. Point-in-Time Recovery (Supabase Dashboard)

**Steps:**
1. Log in to Supabase Dashboard
2. Navigate to **Settings** → **Database** → **Backups**
3. Select the backup point you want to restore
4. Click **Restore** (creates new database)
5. Update connection strings in application

**Note:** This creates a new database. You'll need to update your application's connection string.

### 2. Manual Restore from Backup File

**Steps:**
1. Ensure you have a backup file (`.dump` or `.sql`)
2. Connect to Supabase database
3. Drop existing tables (if needed):
   ```sql
   DROP TABLE IF EXISTS device_activations CASCADE;
   DROP TABLE IF EXISTS licenses CASCADE;
   DROP TABLE IF EXISTS customers CASCADE;
   DROP TABLE IF EXISTS trials CASCADE;
   DROP TABLE IF EXISTS webhook_events CASCADE;
   DROP TABLE IF EXISTS support_tickets CASCADE;
   DROP TABLE IF EXISTS ticket_messages CASCADE;
   ```
4. Restore from backup:
   ```bash
   pg_restore -h [your-db-host].supabase.co \
     -U postgres \
     -d postgres \
     --clean \
     --if-exists \
     backup_file.dump
   ```

### 3. Selective Table Restore

If you only need to restore specific tables:

```bash
pg_restore -h [your-db-host].supabase.co \
  -U postgres \
  -d postgres \
  -t licenses \
  -t customers \
  backup_file.dump
```

## Backup Retention Policy

### Recommended Schedule

- **Daily**: Automatic Supabase backups (already configured)
- **Weekly**: Manual backup download
- **Monthly**: Archive backups to external storage (AWS S3, Google Cloud Storage, etc.)
- **Before major changes**: Always create manual backup

### Retention Periods

- **Active backups**: 30 days (Supabase Pro/Team tier)
- **Archived backups**: 1 year (external storage)
- **Critical backups**: Indefinite (before major releases)

## Critical Data Tables

These tables contain critical business data and should be prioritized:

1. **licenses** - All license keys (irreplaceable)
2. **customers** - Customer information
3. **device_activations** - Device binding information
4. **trials** - Trial key information
5. **webhook_events** - Payment processing logs
6. **support_tickets** - Customer support history

## Disaster Recovery Plan

### Scenario 1: Database Corruption

1. **Immediate**: Stop application to prevent further corruption
2. **Identify**: Determine last known good backup
3. **Restore**: Restore from most recent backup
4. **Verify**: Test application functionality
5. **Resume**: Restart application

### Scenario 2: Accidental Data Deletion

1. **Stop**: Stop application immediately
2. **Identify**: Determine when deletion occurred
3. **Restore**: Restore from backup before deletion
4. **Merge**: If needed, merge any data created after backup
5. **Resume**: Restart application

### Scenario 3: Complete Database Loss

1. **Assess**: Determine if Supabase project is recoverable
2. **Contact**: Contact Supabase support immediately
3. **Restore**: Use point-in-time recovery if available
4. **Alternative**: Restore from most recent manual backup
5. **Rebuild**: If necessary, rebuild from schema.sql

## Monitoring and Alerts

### Backup Monitoring

- **Check daily**: Verify automatic backups are running
- **Weekly review**: Review backup logs
- **Monthly test**: Test restore procedure on test database

### Alert Setup

Set up alerts for:
- Backup failures (if Supabase provides this)
- Database connection issues
- Unusual data loss patterns

## Best Practices

1. **Never delete backups manually** unless you have multiple copies
2. **Test restore procedures** quarterly
3. **Document all manual backups** with date and reason
4. **Keep backups in multiple locations** (Supabase + external storage)
5. **Encrypt sensitive backups** before storing externally
6. **Regularly verify backup integrity**
7. **Keep schema.sql up to date** as a fallback

## External Backup Storage (Optional)

For additional redundancy, consider storing backups in:

- **AWS S3**: Encrypted, versioned storage
- **Google Cloud Storage**: Similar to S3
- **Azure Blob Storage**: Microsoft alternative
- **Local storage**: Encrypted external drives

### Automated External Backup Script

```bash
#!/bin/bash
# backup-to-s3.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.dump"

# Create backup
pg_dump -h [your-db-host].supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f "$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE" s3://your-backup-bucket/database-backups/

# Clean up local file
rm "$BACKUP_FILE"

echo "Backup completed: $BACKUP_FILE"
```

## Contact and Support

- **Supabase Support**: [support@supabase.com](mailto:support@supabase.com)
- **Supabase Documentation**: [https://supabase.com/docs](https://supabase.com/docs)
- **Emergency Contact**: [Your emergency contact information]

## Revision History

- **2025-01-XX**: Initial backup strategy document created

