#!/bin/bash

# Quick Fix Script for Failed Deployment
# This script cleans up partial installation and restarts the deployment

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

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
    print_error "Please run this script as root (sudo ./fix-deployment.sh)"
    exit 1
fi

print_status "🔧 Cleaning up partial deployment and restarting..."

# Stop any running services that might have been started
print_status "Stopping services that might be running..."
systemctl stop httpd 2>/dev/null || true
systemctl stop snapd 2>/dev/null || true

# Remove any snap packages if they were partially installed
print_status "Cleaning up snap packages..."
snap remove certbot 2>/dev/null || true
snap remove core 2>/dev/null || true

# Remove snapd completely (not needed for AlmaLinux)
print_status "Removing snapd (not needed for AlmaLinux)..."
dnf remove -y snapd 2>/dev/null || true

# Clean up any partial configurations
print_status "Cleaning up partial configurations..."
rm -f /etc/httpd/conf.d/server.localpasswordvault.com.conf 2>/dev/null || true

# Remove application directory if it was created
if [[ -d "/var/www/server.localpasswordvault.com" ]]; then
    print_warning "Removing partial application directory..."
    rm -rf /var/www/server.localpasswordvault.com
fi

# Remove application user if it was created
if id "passwordvault" &>/dev/null; then
    print_warning "Removing application user..."
    userdel -r passwordvault 2>/dev/null || true
fi

# Clean DNF cache
print_status "Cleaning package cache..."
dnf clean all

print_success "Cleanup completed successfully!"

print_status "Now you can run the updated deployment script:"
echo "  ./deploy.sh"

print_warning "The updated deployment script now:"
echo "  ✅ Uses EPEL repository for Certbot (no snap needed)"
echo "  ✅ Installs Node.js 16.x compatible with system npm"
echo "  ✅ Properly handles AlmaLinux package management"
echo "  ✅ Has better error handling and rollback"
