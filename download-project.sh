#!/bin/bash

# Create a directory for the project
mkdir -p local-password-vault-download

# Copy all relevant files, excluding large directories
echo "Copying project files..."
rsync -av --progress . local-password-vault-download \
  --exclude node_modules \
  --exclude .git \
  --exclude dist \
  --exclude release \
  --exclude .cache

# Create a zip file
echo "Creating zip file..."
cd local-password-vault-download
zip -r ../local-password-vault.zip .
cd ..

# Cleanup
echo "Cleaning up..."
rm -rf local-password-vault-download

echo "Download package created: local-password-vault.zip"
echo "You can now download this file to your computer."