#!/bin/bash

# Node.js Conflict Resolution Script for AlmaLinux 9.6
# This script resolves Node.js version conflicts and installs a compatible version

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Function to print colored output
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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "Please run this script as root (sudo ./fix-nodejs.sh)"
    exit 1
fi

print_status "🔧 Starting Node.js conflict resolution for AlmaLinux 9.6..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Display current state
print_status "Checking current Node.js installation..."
if command_exists node; then
    echo "Current Node.js version: $(node --version)"
else
    echo "Node.js is not currently installed"
fi

if command_exists npm; then
    echo "Current npm version: $(npm --version)"
else
    echo "npm is not currently installed"
fi

# Show conflicting packages
print_status "Checking for conflicting packages..."
dnf list installed | grep -E "(nodejs|npm)" || echo "No Node.js packages found"

# Step 2: Clean up conflicting packages
print_status "Removing conflicting Node.js packages..."

# Remove all Node.js related packages
dnf remove -y nodejs npm nodejs-npm nsolid 2>/dev/null || true

# Remove NodeSource repository if it exists
rm -f /etc/yum.repos.d/nodesource-*.repo 2>/dev/null || true

# Clean DNF cache
dnf clean all

print_success "Conflicting packages removed"

# Step 3: Reset NodeJS module
print_status "Resetting Node.js module..."
dnf module reset nodejs -y 2>/dev/null || true

# Step 4: Install Node.js 16.x to match system npm requirements
print_status "Installing Node.js 16.x to match system npm requirements..."

# Method 1: Try system repository first (most compatible)
if dnf module install nodejs:16/common -y; then
    print_success "Node.js 16 installed from system repository"
    
    # Verify installation
    if command_exists node && command_exists npm; then
        print_success "Installation verified:"
        echo "  Node.js version: $(node --version)"
        echo "  npm version: $(npm --version)"
        
        # Test npm functionality
        if npm --version >/dev/null 2>&1; then
            print_success "npm is working correctly"
            exit 0
        fi
    fi
fi

# Method 2: Try direct package installation
print_warning "Trying direct package installation..."
if dnf install -y nodejs npm; then
    if command_exists node && command_exists npm && npm --version >/dev/null 2>&1; then
        print_success "Node.js and npm installed successfully"
        echo "  Node.js version: $(node --version)"
        echo "  npm version: $(npm --version)"
        exit 0
    fi
fi

# Method 3: Manual installation of Node.js 16.x (if really needed)
print_warning "Trying manual installation of Node.js 16.x..."

NODE_VERSION="16.20.2"
NODE_DIR="/opt/nodejs"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"

# Create directory
mkdir -p "$NODE_DIR"

# Download and extract
if curl -fsSL "$NODE_URL" | tar -xJ -C "$NODE_DIR" --strip-components=1; then
    # Create symlinks
    ln -sf "$NODE_DIR/bin/node" /usr/local/bin/node
    ln -sf "$NODE_DIR/bin/npm" /usr/local/bin/npm
    ln -sf "$NODE_DIR/bin/npx" /usr/local/bin/npx
    
    # Add to system PATH
    echo 'export PATH="/usr/local/bin:$PATH"' > /etc/profile.d/nodejs.sh
    chmod +x /etc/profile.d/nodejs.sh
    
    # Update current PATH
    export PATH="/usr/local/bin:$PATH"
    
    # Verify installation
    if command_exists node && command_exists npm; then
        print_success "Node.js installed manually"
        echo "  Node.js version: $(node --version)"
        echo "  npm version: $(npm --version)"
        print_warning "Please restart your shell or run 'source /etc/profile.d/nodejs.sh' to update PATH"
        exit 0
    fi
fi

print_error "All installation methods failed. Please check your internet connection and try again."
exit 1
