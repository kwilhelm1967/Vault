#!/bin/bash

# File Upload Helper Script
# This script helps upload your local server-api-examples to the server

set -euo pipefail

# Colors
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_PATH="$(dirname "$SCRIPT_DIR")"
REMOTE_PATH="/var/www/server.localpasswordvault.com/license-server"

echo "📁 File Upload Helper for License Server"

# Get server IP
read -p "Enter your server IP address: " SERVER_IP

if [[ -z "$SERVER_IP" ]]; then
    print_error "Server IP is required"
    exit 1
fi

# Check if local files exist
if [[ ! -d "$LOCAL_PATH" ]]; then
    print_error "Local path not found: $LOCAL_PATH"
    exit 1
fi

print_status "Found local files at: $LOCAL_PATH"

# Method 1: Direct SCP
upload_direct() {
    print_status "Uploading files directly via SCP..."
    
    if scp -r "$LOCAL_PATH"/* root@$SERVER_IP:$REMOTE_PATH/; then
        print_success "Files uploaded successfully via SCP"
        return 0
    else
        print_error "Direct SCP upload failed"
        return 1
    fi
}

# Method 2: Tar and upload
upload_tar() {
    print_status "Creating tar archive and uploading..."
    
    local tar_file="/tmp/license-server-$(date +%Y%m%d_%H%M%S).tar.gz"
    
    # Create tar archive
    if tar -czf "$tar_file" -C "$LOCAL_PATH" .; then
        print_success "Archive created: $tar_file"
    else
        print_error "Failed to create archive"
        return 1
    fi
    
    # Upload tar file
    if scp "$tar_file" root@$SERVER_IP:/tmp/; then
        print_success "Archive uploaded to server"
    else
        print_error "Failed to upload archive"
        rm -f "$tar_file"
        return 1
    fi
    
    # Extract on server
    local remote_tar="/tmp/$(basename $tar_file)"
    if ssh root@$SERVER_IP "cd $REMOTE_PATH && tar -xzf $remote_tar && rm -f $remote_tar"; then
        print_success "Files extracted on server"
        rm -f "$tar_file"
        return 0
    else
        print_error "Failed to extract files on server"
        rm -f "$tar_file"
        return 1
    fi
}

# Method 3: Rsync
upload_rsync() {
    print_status "Uploading files via rsync..."
    
    if command -v rsync >/dev/null 2>&1; then
        if rsync -avz --exclude='node_modules' --exclude='.git' "$LOCAL_PATH"/ root@$SERVER_IP:$REMOTE_PATH/; then
            print_success "Files uploaded successfully via rsync"
            return 0
        else
            print_error "Rsync upload failed"
            return 1
        fi
    else
        print_warning "Rsync not available"
        return 1
    fi
}

# Test connection first
print_status "Testing connection to server..."
if ssh -o ConnectTimeout=10 root@$SERVER_IP "echo 'Connection successful'"; then
    print_success "Connection to server successful"
else
    print_error "Cannot connect to server. Please check:"
    echo "  • Server IP address is correct"
    echo "  • SSH service is running on the server"
    echo "  • Your SSH key is configured"
    echo "  • Firewall allows SSH connections"
    exit 1
fi

# Ensure remote directory exists
print_status "Ensuring remote directory exists..."
ssh root@$SERVER_IP "mkdir -p $REMOTE_PATH"

# Try different upload methods
print_status "Attempting file upload..."

if upload_rsync; then
    print_success "Upload completed via rsync"
elif upload_direct; then
    print_success "Upload completed via SCP"
elif upload_tar; then
    print_success "Upload completed via tar"
else
    print_error "All upload methods failed"
    exit 1
fi

# Verify upload
print_status "Verifying upload..."
if ssh root@$SERVER_IP "test -f $REMOTE_PATH/package.json"; then
    print_success "✅ Upload verification successful"
    
    # Show uploaded files
    print_status "Files on server:"
    ssh root@$SERVER_IP "ls -la $REMOTE_PATH/"
    
    echo
    print_success "🎉 Files uploaded successfully!"
    print_warning "Next step: Run the complete setup script on your server:"
    echo "  ./complete-setup.sh"
    
else
    print_error "❌ Upload verification failed"
    exit 1
fi
