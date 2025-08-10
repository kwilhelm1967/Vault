// API endpoint to serve the generated ZIP file
const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  const { file } = req.query;
  
  if (!file) {
    return res.status(400).json({ error: 'File parameter is required' });
  }
  
  // Validate filename to prevent directory traversal
  const filename = path.basename(file);
  const filePath = path.join('/tmp', filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Set headers
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'application/zip');
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  // Clean up the file after sending
  fileStream.on('end', () => {
    // Delete the temporary file
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting temporary file:', err);
      }
    });
  });
  
  fileStream.on('error', (err) => {
    console.error('Error streaming file:', err);
    res.status(500).end();
  });
}