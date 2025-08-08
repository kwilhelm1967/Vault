// Simple API endpoint to handle download requests
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create a unique filename
    const timestamp = Date.now();
    const filename = `local-password-vault-${timestamp}.zip`;
    const outputPath = path.join('/tmp', filename);
    
    // Create a file to stream archive data to
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level
    });
    
    // Listen for all archive data to be written
    output.on('close', function() {
      console.log(`Archive created: ${outputPath}, size: ${archive.pointer()} bytes`);
      
      // Return the download URL
      res.status(200).json({
        success: true,
        downloadUrl: `/api/download-file?file=${filename}`,
        size: archive.pointer()
      });
    });
    
    // Handle warnings
    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        console.warn('Archive warning:', err);
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
    const projectRoot = path.resolve('.');
    
    // Add all files except node_modules, .git, etc.
    archive.glob('**/*', {
      cwd: projectRoot,
      ignore: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'release/**',
        '.cache/**',
        'tmp/**',
        '*.zip'
      ]
    });
    
    // Finalize the archive
    archive.finalize();
    
  } catch (error) {
    console.error('Download creation failed:', error);
    res.status(500).json({ error: 'Failed to create download package' });
  }
}