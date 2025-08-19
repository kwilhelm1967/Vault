#!/bin/bash

# AlmaLinux 9.6 Deployment Script for Local Password Vault License Server
# Comprehensive deployment with error handling and rollback capabilities
# Compatible with AlmaLinux 9.6 (Sage Margay)

# Exit on error, undefined variables, and pipe failures
set -euo pipefail

# Enable debug mode if DEBUG=1
[[ "${DEBUG:-0}" == "1" ]] && set -x

echo "🚀 Starting Local Password Vault License Server Deployment for AlmaLinux 9.6..."

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Configuration
readonly APP_USER="passwordvault"
readonly APP_DIR="/var/www/server.localpasswordvault.com"
readonly DOMAIN="server.localpasswordvault.com"
readonly NODE_PORT="3001"
readonly BACKUP_DIR="/root/deployment-backup-$(date +%Y%m%d_%H%M%S)"
readonly LOG_FILE="/var/log/passwordvault-deployment.log"
readonly REQUIRED_MEMORY_MB=1024
readonly REQUIRED_DISK_GB=5

# Global variables for rollback
APACHE_INSTALLED=false
PM2_INSTALLED=false
USER_CREATED=false
DIRECTORIES_CREATED=false
FIREWALL_CONFIGURED=false
APACHE_CONFIGURED=false

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log "INFO" "$1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log "SUCCESS" "$1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log "WARNING" "$1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "ERROR" "$1"
}

print_debug() {
    if [[ "${DEBUG:-0}" == "1" ]]; then
        echo -e "${PURPLE}[DEBUG]${NC} $1"
        log "DEBUG" "$1"
    fi
}

# Error handler function
error_handler() {
    local line_no=$1
    local error_code=$2
    print_error "Script failed at line $line_no with exit code $error_code"
    print_error "Starting rollback process..."
    rollback_deployment
    exit $error_code
}

# Set error trap
trap 'error_handler ${LINENO} $?' ERR

# Rollback function
rollback_deployment() {
    print_warning "Performing rollback of deployment changes..."
    
    # Stop and remove PM2 processes
    if [[ "$PM2_INSTALLED" == "true" ]]; then
        print_status "Rolling back PM2 installation..."
        sudo -u "$APP_USER" pm2 delete all 2>/dev/null || true
        sudo -u "$APP_USER" pm2 kill 2>/dev/null || true
        npm uninstall -g pm2 2>/dev/null || true
    fi
    
    # Remove Apache configuration
    if [[ "$APACHE_CONFIGURED" == "true" ]]; then
        print_status "Rolling back Apache configuration..."
        sudo systemctl stop httpd 2>/dev/null || true
        sudo rm -f "/etc/httpd/conf.d/$DOMAIN.conf" 2>/dev/null || true
    fi
    
    # Remove application directories
    if [[ "$DIRECTORIES_CREATED" == "true" ]]; then
        print_status "Rolling back directory creation..."
        sudo rm -rf "$APP_DIR" 2>/dev/null || true
    fi
    
    # Remove user (optional, commented out for safety)
    # if [[ "$USER_CREATED" == "true" ]]; then
    #     sudo userdel -r "$APP_USER" 2>/dev/null || true
    # fi
    
    # Restore backup if exists
    if [[ -d "$BACKUP_DIR" ]]; then
        print_status "Backup available at: $BACKUP_DIR"
    fi
    
    print_warning "Rollback completed. Please review the system state."
}

# System requirements check
check_system_requirements() {
    print_status "Checking system requirements..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (sudo ./deploy.sh)"
        exit 1
    fi
    
    # Check OS compatibility
    if [[ ! -f /etc/os-release ]]; then
        print_error "Cannot determine OS version"
        exit 1
    fi
    
    source /etc/os-release
    if [[ "$ID" != "almalinux" ]] || [[ ! "$VERSION_ID" =~ ^9\. ]]; then
        print_warning "This script is optimized for AlmaLinux 9.x. Current OS: $PRETTY_NAME"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Detected compatible OS: $PRETTY_NAME"
    fi
    
    # Check available memory
    local available_memory_mb=$(free -m | awk 'NR==2{print $7}')
    if [[ $available_memory_mb -lt $REQUIRED_MEMORY_MB ]]; then
        print_warning "Available memory (${available_memory_mb}MB) is below recommended (${REQUIRED_MEMORY_MB}MB)"
    fi
    
    # Check available disk space
    local available_disk_gb=$(df / | awk 'NR==2{print int($4/1024/1024)}')
    if [[ $available_disk_gb -lt $REQUIRED_DISK_GB ]]; then
        print_error "Insufficient disk space. Available: ${available_disk_gb}GB, Required: ${REQUIRED_DISK_GB}GB"
        exit 1
    fi
    
    print_success "System requirements check passed"
}

# Create backup
create_backup() {
    print_status "Creating backup directory..."
    mkdir -p "$BACKUP_DIR"
    
    # Backup existing configurations
    if [[ -f "/etc/httpd/conf.d/$DOMAIN.conf" ]]; then
        cp "/etc/httpd/conf.d/$DOMAIN.conf" "$BACKUP_DIR/" 2>/dev/null || true
    fi
    
    if [[ -d "$APP_DIR" ]]; then
        cp -r "$APP_DIR" "$BACKUP_DIR/" 2>/dev/null || true
    fi
    
    print_success "Backup created at: $BACKUP_DIR"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name="$1"
    local max_attempts=30
    local attempt=0
    
    print_status "Waiting for $service_name to be ready..."
    
    while [[ $attempt -lt $max_attempts ]]; do
        if sudo systemctl is-active --quiet "$service_name"; then
            print_success "$service_name is ready"
            return 0
        fi
        
        ((attempt++))
        print_debug "Attempt $attempt/$max_attempts for $service_name"
        sleep 2
    done
    
    print_error "$service_name failed to start within expected time"
    return 1
}

# Function to verify port availability
check_port_availability() {
    local port="$1"
    if ss -tuln | grep -q ":$port "; then
        print_error "Port $port is already in use"
        ss -tuln | grep ":$port "
        return 1
    fi
    print_success "Port $port is available"
    return 0
}

# Package installation with retry logic
install_packages() {
    local packages=("$@")
    local max_retries=3
    local retry=0
    
    print_status "Installing packages: ${packages[*]}"
    
    while [[ $retry -lt $max_retries ]]; do
        if sudo dnf install -y "${packages[@]}" 2>&1 | tee -a "$LOG_FILE"; then
            print_success "Packages installed successfully"
            return 0
        fi
        
        ((retry++))
        print_warning "Package installation attempt $retry failed. Retrying..."
        sleep 5
        
        # Clean cache and try again
        sudo dnf clean all
    done
    
    print_error "Failed to install packages after $max_retries attempts"
    return 1
}

# Main deployment function
main_deployment() {
    print_status "Starting main deployment process..."
    
    # System checks
    check_system_requirements
    create_backup
    
    # Check port availability
    check_port_availability "$NODE_PORT"
    
    print_status "Updating system packages..."
    sudo dnf update -y | tee -a "$LOG_FILE"
    
    print_status "Installing EPEL repository..."
    install_packages epel-release
    
    print_status "Installing base packages..."
    install_packages httpd snapd firewalld
    
    # Handle Node.js installation separately to avoid conflicts
    setup_nodejs
    
    print_status "Installing PM2 globally..."
    if npm install -g pm2 2>&1 | tee -a "$LOG_FILE"; then
        PM2_INSTALLED=true
        print_success "PM2 installed successfully"
    else
        print_error "Failed to install PM2"
        return 1
    fi
    
    print_status "Setting up Certbot..."
    setup_certbot
    
    print_status "Configuring services..."
    configure_services
    
    print_status "Creating application user and directories..."
    setup_application_user
    
    print_status "Configuring firewall..."
    configure_firewall
    
    print_status "Configuring SELinux..."
    configure_selinux
    
    print_status "Setting up Apache virtual host..."
    setup_apache_virtualhost
    
    print_status "Setting up log rotation..."
    setup_log_rotation
    
    print_success "Deployment completed successfully!"
    display_next_steps
}

# Setup Node.js with system compatibility
setup_nodejs() {
    print_status "Setting up Node.js compatible with system requirements..."
    
    # Check if Node.js is already installed and compatible
    if command_exists node; then
        local current_version=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0")
        print_status "Current Node.js version: v$(node --version 2>/dev/null || echo 'none')"
        
        # Check if npm works with current Node.js
        if command_exists npm && npm --version >/dev/null 2>&1; then
            print_success "Node.js and npm are already installed and working"
            return 0
        fi
    fi
    
    # Clean up any conflicting packages
    print_status "Cleaning up conflicting Node.js packages..."
    sudo dnf remove -y nodejs npm nodejs-npm nsolid 2>/dev/null || true
    sudo dnf clean all
    
    # Install Node.js 16.x to match system npm requirements
    print_status "Installing Node.js 16.x to match system requirements..."
    
    # Reset nodejs module
    sudo dnf module reset nodejs -y 2>/dev/null || true
    
    # Install Node.js 16 from system repository (matches npm requirement)
    if sudo dnf module install nodejs:16/common -y; then
        # Verify installation
        if command_exists node && command_exists npm; then
            local version=$(node --version)
            print_success "Node.js $version installed from system repository"
            
            # Verify npm works
            if npm --version >/dev/null 2>&1; then
                print_success "npm is working correctly with Node.js $version"
                return 0
            fi
        fi
    fi
    
    # Fallback: Try installing just the base packages
    print_warning "Trying alternative installation method..."
    if sudo dnf install -y nodejs npm; then
        if command_exists node && command_exists npm && npm --version >/dev/null 2>&1; then
            local version=$(node --version)
            print_success "Node.js $version and npm installed successfully"
            return 0
        fi
    fi
    
    print_error "Failed to install compatible Node.js version"
    return 1
}
    if ! command_exists certbot; then
        print_status "Installing Certbot via snap..."
        
        # Enable snapd
        sudo systemctl enable --now snapd.socket
        sudo ln -sf /var/lib/snapd/snap /snap 2>/dev/null || true
        
        # Wait for snapd to be ready
        local attempts=0
        while [[ $attempts -lt 30 ]]; do
            if sudo snap install core 2>/dev/null; then
                break
            fi
            ((attempts++))
            sleep 2
        done
        
        sudo snap refresh core
        sudo snap install --classic certbot
        sudo ln -sf /snap/bin/certbot /usr/bin/certbot
        
        print_success "Certbot installed successfully"
    else
        print_success "Certbot already installed"
    fi
}

# Configure services
configure_services() {
    print_status "Enabling and starting services..."
    
    # Apache
    sudo systemctl enable httpd
    if sudo systemctl start httpd; then
        APACHE_INSTALLED=true
        wait_for_service httpd
    else
        print_error "Failed to start Apache"
        return 1
    fi
    
    # Firewall
    sudo systemctl enable firewalld
    sudo systemctl start firewalld || print_warning "Firewalld may already be running"
    
    # Snapd
    sudo systemctl enable snapd
    sudo systemctl start snapd || print_warning "Snapd may already be running"
    
    print_success "Services configured successfully"
}

# Setup application user
setup_application_user() {
    # Create user if doesn't exist
    if ! id "$APP_USER" &>/dev/null; then
        print_status "Creating application user: $APP_USER"
        sudo adduser "$APP_USER"
        USER_CREATED=true
        print_success "User $APP_USER created"
    else
        print_success "User $APP_USER already exists"
    fi
    
    # Create directories
    print_status "Creating application directories..."
    sudo mkdir -p "$APP_DIR/license-server"
    sudo mkdir -p "$APP_DIR/logs"
    sudo mkdir -p "/home/$APP_USER"
    
    # Set permissions
    sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    sudo chown -R "$APP_USER:$APP_USER" "/home/$APP_USER"
    DIRECTORIES_CREATED=true
    
    print_success "Application directories created"
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall rules..."
    
    # Allow HTTP and HTTPS
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    
    # Allow SSH (important!)
    sudo firewall-cmd --permanent --add-service=ssh
    
    # Allow Node.js port (internal only)
    sudo firewall-cmd --permanent --add-port="$NODE_PORT/tcp" --zone=internal
    
    # Reload firewall
    sudo firewall-cmd --reload
    FIREWALL_CONFIGURED=true
    
    # Display current rules
    print_status "Current firewall rules:"
    sudo firewall-cmd --list-all | tee -a "$LOG_FILE"
    
    print_success "Firewall configured successfully"
}

# Configure SELinux
configure_selinux() {
    if command_exists getenforce && [[ "$(getenforce)" != "Disabled" ]]; then
        print_status "Configuring SELinux for Apache proxy..."
        
        # Allow Apache to make network connections
        sudo setsebool -P httpd_can_network_connect 1
        
        # Allow Apache to connect to Node.js port
        if command_exists semanage; then
            sudo semanage port -a -t http_port_t -p tcp "$NODE_PORT" 2>/dev/null || \
            sudo semanage port -m -t http_port_t -p tcp "$NODE_PORT" 2>/dev/null || true
        else
            print_warning "semanage not found. Installing policycoreutils-python-utils..."
            install_packages policycoreutils-python-utils
            sudo semanage port -a -t http_port_t -p tcp "$NODE_PORT" 2>/dev/null || \
            sudo semanage port -m -t http_port_t -p tcp "$NODE_PORT" 2>/dev/null || true
        fi
        
        # Set proper SELinux context for application directory
        sudo restorecon -R "$APP_DIR" 2>/dev/null || true
        
        print_success "SELinux configured for Apache proxy"
    else
        print_warning "SELinux is disabled or not available"
    fi
}

# Setup Apache virtual host
setup_apache_virtualhost() {
    local config_file="/etc/httpd/conf.d/$DOMAIN.conf"
    
    print_status "Creating Apache virtual host configuration..."
    
    sudo tee "$config_file" > /dev/null << 'EOF'
# HTTP Virtual Host (redirects to HTTPS)
<VirtualHost *:80>
    ServerName server.localpasswordvault.com
    ServerAlias www.server.localpasswordvault.com
    
    # Redirect all HTTP traffic to HTTPS
    Redirect permanent / https://server.localpasswordvault.com/
    
    # Log files
    ErrorLog /var/log/httpd/server.localpasswordvault.com_error.log
    CustomLog /var/log/httpd/server.localpasswordvault.com_access.log combined
</VirtualHost>

# HTTPS Virtual Host
<VirtualHost *:443>
    ServerName server.localpasswordvault.com
    ServerAlias www.server.localpasswordvault.com
    
    # SSL Configuration (will be added by Certbot)
    
    # Security Headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    # Proxy configuration
    ProxyPreserveHost On
    ProxyRequests Off
    
    # Main proxy to Node.js application
    ProxyPass / http://127.0.0.1:3001/
    ProxyPassReverse / http://127.0.0.1:3001/
    
    # Handle WebSocket connections
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:3001/$1" [P,L]
    
    # Pass real IP to Node.js application
    ProxyPreserveHost On
    ProxyAddHeaders On
    RequestHeader set "X-Forwarded-Proto" "https"
    RequestHeader set "X-Forwarded-Port" "443"
    
    # Logging
    ErrorLog /var/log/httpd/server.localpasswordvault.com_ssl_error.log
    CustomLog /var/log/httpd/server.localpasswordvault.com_ssl_access.log combined
    
    # Compression
    <IfModule mod_deflate.c>
        <Location />
            SetOutputFilter DEFLATE
            SetEnvIfNoCase Request_URI \
                \.(?:gif|jpe?g|png)$ no-gzip dont-vary
            SetEnvIfNoCase Request_URI \
                \.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
        </Location>
    </IfModule>
</VirtualHost>
EOF
    
    APACHE_CONFIGURED=true
    
    # Test Apache configuration
    if sudo httpd -t; then
        print_success "Apache configuration is valid"
        
        # Restart Apache
        sudo systemctl restart httpd
        wait_for_service httpd
        print_success "Apache restarted successfully"
    else
        print_error "Apache configuration test failed"
        return 1
    fi
}

# Setup log rotation
setup_log_rotation() {
    print_status "Setting up log rotation..."
    
    sudo tee /etc/logrotate.d/license-server > /dev/null << 'EOF'
/var/www/server.localpasswordvault.com/license-server/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 passwordvault passwordvault
    postrotate
        sudo -u passwordvault pm2 reload license-server 2>/dev/null || true
    endscript
}

/var/log/passwordvault-deployment.log {
    weekly
    missingok
    rotate 12
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
    
    print_success "Log rotation configured"
}

# Display next steps
display_next_steps() {
    print_success "🎉 Deployment completed successfully!"
    echo
    print_status "Next steps to complete the setup:"
    echo
    echo "1. Upload your application files:"
    echo "   scp -r /path/to/server-api-examples/* root@your-server:/var/www/server.localpasswordvault.com/license-server/"
    echo
    echo "2. Set proper ownership:"
    echo "   sudo chown -R passwordvault:passwordvault /var/www/server.localpasswordvault.com/"
    echo
    echo "3. Install Node.js dependencies:"
    echo "   cd /var/www/server.localpasswordvault.com/license-server"
    echo "   sudo -u passwordvault npm install"
    echo
    echo "4. Create and configure .env file:"
    echo "   sudo -u passwordvault nano /var/www/server.localpasswordvault.com/license-server/.env"
    echo
    echo "5. Create PM2 ecosystem file:"
    echo "   sudo -u passwordvault nano /var/www/server.localpasswordvault.com/license-server/ecosystem.config.js"
    echo
    echo "6. Start the application:"
    echo "   sudo -u passwordvault pm2 start ecosystem.config.js"
    echo "   sudo -u passwordvault pm2 save"
    echo "   sudo pm2 startup systemd -u passwordvault --hp /home/passwordvault"
    echo
    echo "7. Get SSL certificate:"
    echo "   sudo certbot --apache -d server.localpasswordvault.com"
    echo
    print_status "Useful commands:"
    echo "- Check system status: systemctl status httpd"
    echo "- Check application logs: sudo -u passwordvault pm2 logs"
    echo "- Check Apache logs: sudo tail -f /var/log/httpd/server.localpasswordvault.com_*"
    echo "- Check deployment logs: sudo tail -f $LOG_FILE"
    echo
    print_warning "Backup created at: $BACKUP_DIR"
    echo
}

# Cleanup function for normal exit
cleanup() {
    print_status "Cleaning up temporary files..."
    # Add any cleanup tasks here
    print_success "Cleanup completed"
}

# Set cleanup trap for normal exit
trap cleanup EXIT

# Main execution
main() {
    # Create log file
    sudo touch "$LOG_FILE"
    sudo chmod 644 "$LOG_FILE"
    
    log "INFO" "Starting deployment script for AlmaLinux 9.6"
    log "INFO" "Script executed by: $(whoami)"
    log "INFO" "Script arguments: $*"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --debug)
                DEBUG=1
                print_status "Debug mode enabled"
                ;;
            --help|-h)
                echo "Usage: $0 [--debug] [--help]"
                echo "  --debug    Enable debug output"
                echo "  --help     Show this help message"
                exit 0
                ;;
            *)
                print_warning "Unknown option: $1"
                ;;
        esac
        shift
    done
    
    # Run main deployment
    main_deployment
}

# Run main function with all arguments
main "$@"
