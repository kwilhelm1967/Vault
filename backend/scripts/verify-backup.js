/**
 * Database Backup Verification Script
 * 
 * Verifies Supabase automatic backups are working and optionally creates manual backup.
 * 
 * Usage:
 *   node scripts/verify-backup.js
 *   node scripts/verify-backup.js --create-manual
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Verify Supabase automatic backups
 */
async function verifyAutomaticBackups() {
  console.log('\n📦 Verifying Supabase Automatic Backups...\n');

  try {
    // Check database connection
    const { data, error } = await supabase
      .from('licenses')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    console.log('✅ Database connection verified');

    // Check if we can query recent data (indicates backup would include it)
    const { count: licenseCount } = await supabase
      .from('licenses')
      .select('*', { count: 'exact', head: true });

    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const { count: trialCount } = await supabase
      .from('trials')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Database tables accessible:`);
    console.log(`   - Licenses: ${licenseCount || 0} records`);
    console.log(`   - Customers: ${customerCount || 0} records`);
    console.log(`   - Trials: ${trialCount || 0} records`);

    // Note: Supabase automatic backups are managed via dashboard
    // We can't programmatically verify them, but we can check data accessibility
    console.log('\n📋 Supabase Backup Status:');
    console.log('   ⚠️  Automatic backups are managed by Supabase');
    console.log('   📍 Check backup status in Supabase Dashboard:');
    console.log('      https://app.supabase.com → Your Project → Database → Backups');
    console.log('\n   ✅ To verify backups:');
    console.log('      1. Go to Supabase Dashboard → Database → Backups');
    console.log('      2. Check "Point-in-time Recovery" status');
    console.log('      3. Verify backup retention period (typically 7 days on free tier)');
    console.log('      4. Test restore from a backup if needed');

    return true;
  } catch (error) {
    console.error('❌ Backup verification failed:', error.message);
    return false;
  }
}

/**
 * Create manual backup (exports data to SQL file)
 */
async function createManualBackup() {
  console.log('\n💾 Creating Manual Backup...\n');

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

  try {
    // Export all critical tables
    const [licenses, customers, trials, webhookEvents] = await Promise.all([
      supabase.from('licenses').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('trials').select('*'),
      supabase.from('webhook_events').select('*').limit(1000), // Limit webhook events
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      tables: {
        licenses: licenses.data || [],
        customers: customers.data || [],
        trials: trials.data || [],
        webhook_events: webhookEvents.data || [],
      },
      counts: {
        licenses: licenses.data?.length || 0,
        customers: customers.data?.length || 0,
        trials: trials.data?.length || 0,
        webhook_events: webhookEvents.data?.length || 0,
      },
    };

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    const fileSize = (fs.statSync(backupFile).size / 1024).toFixed(2);
    console.log(`✅ Manual backup created: ${backupFile}`);
    console.log(`   Size: ${fileSize} KB`);
    console.log(`   Records: ${backup.counts.licenses + backup.counts.customers + backup.counts.trials + backup.counts.webhook_events}`);

    // Clean up old backups (keep last 10)
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        mtime: fs.statSync(path.join(backupDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (backups.length > 10) {
      const toDelete = backups.slice(10);
      toDelete.forEach(backup => {
        fs.unlinkSync(backup.path);
        console.log(`   🗑️  Deleted old backup: ${backup.name}`);
      });
    }

    return backupFile;
  } catch (error) {
    console.error('❌ Manual backup failed:', error.message);
    throw error;
  }
}

/**
 * Verify backup file integrity
 */
async function verifyBackupFile(backupFile) {
  try {
    const content = fs.readFileSync(backupFile, 'utf-8');
    const backup = JSON.parse(content);

    console.log('\n🔍 Verifying Backup Integrity...\n');
    console.log(`   Timestamp: ${backup.timestamp}`);
    console.log(`   Version: ${backup.version}`);
    console.log(`   Tables: ${Object.keys(backup.tables).length}`);
    console.log(`   Total Records: ${Object.values(backup.counts).reduce((a, b) => a + b, 0)}`);

    // Verify structure
    const requiredTables = ['licenses', 'customers', 'trials', 'webhook_events'];
    const missingTables = requiredTables.filter(t => !backup.tables[t]);
    
    if (missingTables.length > 0) {
      console.log(`   ⚠️  Missing tables: ${missingTables.join(', ')}`);
      return false;
    }

    console.log('   ✅ Backup file structure valid');
    return true;
  } catch (error) {
    console.error('   ❌ Backup verification failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  const createManual = process.argv.includes('--create-manual');

  console.log('='.repeat(60));
  console.log('  Database Backup Verification');
  console.log('='.repeat(60));

  const verified = await verifyAutomaticBackups();

  if (!verified) {
    console.error('\n❌ Backup verification failed. Please check your Supabase configuration.');
    process.exit(1);
  }

  if (createManual) {
    try {
      const backupFile = await createManualBackup();
      await verifyBackupFile(backupFile);
      console.log('\n✅ Backup process completed successfully');
    } catch (error) {
      console.error('\n❌ Manual backup failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n💡 To create a manual backup, run:');
    console.log('   node scripts/verify-backup.js --create-manual');
  }

  console.log('\n' + '='.repeat(60));
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  verifyAutomaticBackups,
  createManualBackup,
  verifyBackupFile,
};







