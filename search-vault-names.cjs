const fs = require('fs');
const path = require('path');

// File extensions to search
const searchExtensions = ['.tsx', '.ts', '.js', '.json', '.md', '.html'];

// Directories to exclude
const excludeDirs = ['node_modules', '.git', 'dist', 'release', '.cache'];

function searchInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const matches = [];
    
    lines.forEach((line, index) => {
      if (line.includes('Secure Password Vault')) {
        matches.push({
          line: index + 1,
          content: line.trim(),
          context: line
        });
      }
    });
    
    return matches;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

function searchDirectory(dir, results = []) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip excluded directories
        if (!excludeDirs.includes(item)) {
          searchDirectory(fullPath, results);
        }
      } else if (stat.isFile()) {
        // Check if file has searchable extension
        const ext = path.extname(item);
        if (searchExtensions.includes(ext)) {
          const matches = searchInFile(fullPath);
          if (matches.length > 0) {
            results.push({
              file: fullPath,
              matches: matches
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return results;
}

function main() {
  console.log('🔍 Searching for "Secure Password Vault" references...\n');
  
  const results = searchDirectory('.');
  
  if (results.length === 0) {
    console.log('✅ No instances of "Secure Password Vault" found!');
    console.log('All references have been successfully updated to "Local Password Vault".');
  } else {
    console.log(`❌ Found ${results.length} file(s) with "Secure Password Vault" references:\n`);
    
    results.forEach(result => {
      console.log(`📄 File: ${result.file}`);
      result.matches.forEach(match => {
        console.log(`   Line ${match.line}: ${match.content}`);
      });
      console.log('');
    });
    
    console.log('These files need to be updated to use "Local Password Vault" instead.');
  }
  
  // Also search for any other variations
  console.log('\n🔍 Checking for other variations...');
  
  const variations = [
    'SecurePasswordVault',
    'secure-password-vault',
    'SECURE_PASSWORD_VAULT'
  ];
  
  let foundVariations = false;
  
  variations.forEach(variation => {
    const variationResults = searchDirectoryForText('.', variation);
    if (variationResults.length > 0) {
      foundVariations = true;
      console.log(`\n📝 Found "${variation}" in:`);
      variationResults.forEach(result => {
        console.log(`   ${result.file}`);
        result.matches.forEach(match => {
          console.log(`     Line ${match.line}: ${match.content}`);
        });
      });
    }
  });
  
  if (!foundVariations) {
    console.log('✅ No variations found.');
  }
}

function searchDirectoryForText(dir, searchText, results = []) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          searchDirectoryForText(fullPath, searchText, results);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (searchExtensions.includes(ext)) {
          const matches = searchInFileForText(fullPath, searchText);
          if (matches.length > 0) {
            results.push({
              file: fullPath,
              matches: matches
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return results;
}

function searchInFileForText(filePath, searchText) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const matches = [];
    
    lines.forEach((line, index) => {
      if (line.includes(searchText)) {
        matches.push({
          line: index + 1,
          content: line.trim()
        });
      }
    });
    
    return matches;
  } catch (error) {
    return [];
  }
}

main();