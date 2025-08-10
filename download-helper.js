// Simple download helper for Local Password Vault
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

console.log('Creating Local Password Vault download package...');

// Create a file to stream archive data to
const output = fs.createWriteStream(path.join(__dirname, 'local-password-vault.zip'));
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level
});

// Listen for all archive data to be written
output.on('close', function() {
  console.log(`
✅ Download package created successfully!
📦 File size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB

Your download package is ready: local-password-vault.zip
  `);
});

// Good practice to catch warnings
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn(err);
  } else {
    throw err;
  }
});

// Handle errors
archive.on('error', function(err) {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add files and directories
archive.glob('**/*', {
  ignore: [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'release/**',
    'local-password-vault.zip',
    'download-helper.js'
  ]
});

// Finalize the archive
archive.finalize();