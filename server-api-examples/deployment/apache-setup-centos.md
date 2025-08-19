# Apache Setup for Local Password Vault License Server (CentOS/RHEL)

This guide will help you set up Apache as a reverse proxy for the Node.js license server on your CentOS/RHEL Linode server with the domain `server.localpasswordvault.com`.

## Prerequisites

- CentOS/RHEL Linode server
- Apache (httpd) installed
- Node.js installed in backend folder
- Domain `server.localpasswordvault.com` pointing to your server IP
- SSL certificate (Let's Encrypt recommended)

## 1. Server Setup

### 1.1 Install Required Packages

```bash
# Update system packages
sudo dnf update -y
# Or for older CentOS versions: sudo yum update -y

# Install Apache and required modules
sudo dnf install httpd -y
# Or: sudo yum install httpd -y

# Install EPEL repository for additional packages
sudo dnf install epel-release -y
# Or: sudo yum install epel-release -y

# Install Node.js (if not already installed)
sudo dnf install nodejs npm -y
# Or: sudo yum install nodejs npm -y

# Install snapd for Certbot (Let's Encrypt)
sudo dnf install snapd -y
sudo systemctl enable --now snapd.socket
sudo ln -s /var/lib/snapd/snap /snap

# Install Certbot via snap
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Install PM2 globally for Node.js process management
sudo npm install -g pm2
```

### 1.2 Enable and Start Services

```bash
# Enable and start Apache
sudo systemctl enable httpd
sudo systemctl start httpd

# Check Apache status
sudo systemctl status httpd
```

### 1.3 Configure Firewall

```bash
# Allow HTTP and HTTPS through firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Check firewall status
sudo firewall-cmd --list-all
```

### 1.4 Create Application User and Directory

```bash
# Create a dedicated user for the application
sudo adduser passwordvault
sudo mkdir -p /var/www/server.localpasswordvault.com
sudo chown passwordvault:passwordvault /var/www/server.localpasswordvault.com
```

## 2. Deploy Application Files

### 2.1 Copy Files to Server

```bash
# Switch to application user
sudo su - passwordvault

# Create application directory
cd /var/www/server.localpasswordvault.com
mkdir license-server
cd license-server

# Copy your server-api-examples files here
# You can use scp, rsync, or git clone
```

### 2.2 Upload Files via SCP (from your local machine)

```bash
# From your local machine, run this command:
scp -r /Users/alokkaushik/Downloads/project\ 2/server-api-examples/* root@your-server-ip:/var/www/server.localpasswordvault.com/license-server/

# Then on the server, fix permissions:
sudo chown -R passwordvault:passwordvault /var/www/server.localpasswordvault.com/
```

### 2.3 Install Dependencies and Setup

```bash
# Switch to application user
sudo su - passwordvault
cd /var/www/server.localpasswordvault.com/license-server

# Install Node.js dependencies
npm install

# Create necessary directories
mkdir -p logs uploads downloads

# Test if the application starts
node license-server.js
# Press Ctrl+C to stop after confirming it starts without errors
```

## 3. Configure PM2 for Process Management

### 3.1 Create PM2 Configuration

```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

Add this configuration:

```javascript
module.exports = {
  apps: [{
    name: 'license-server',
    script: 'license-server.js',
    instances: 1, // Start with 1 instance
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 3.2 Start Application with PM2

```bash
# Start the application
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# Generate startup script (run as root)
sudo pm2 startup systemd -u passwordvault --hp /home/passwordvault
pm2 save
```

## 4. Apache Virtual Host Configuration

### 4.1 Create Virtual Host File

```bash
sudo nano /etc/httpd/conf.d/server.localpasswordvault.com.conf
```

Add this configuration:

```apache
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
    # SSLEngine on
    # SSLCertificateFile /path/to/cert
    # SSLCertificateKeyFile /path/to/key
    
    # Security Headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    # Enable proxy modules
    LoadModule proxy_module modules/mod_proxy.so
    LoadModule proxy_http_module modules/mod_proxy_http.so
    LoadModule headers_module modules/mod_headers.so
    LoadModule rewrite_module modules/mod_rewrite.so
    LoadModule ssl_module modules/mod_ssl.so
    
    # Proxy configuration
    ProxyPreserveHost On
    ProxyRequests Off
    
    # Main proxy to Node.js application
    ProxyPass / http://127.0.0.1:3001/
    ProxyPassReverse / http://127.0.0.1:3001/
    
    # Handle WebSocket connections (if needed)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:3001/$1" [P,L]
    
    # Pass real IP to Node.js application
    ProxyPreserveHost On
    ProxyAddHeaders On
    
    # Set headers for the backend
    ProxyPassReverse / http://127.0.0.1:3001/
    RequestHeader set "X-Forwarded-Proto" "https"
    RequestHeader set "X-Forwarded-Port" "443"
    
    # Logging
    ErrorLog /var/log/httpd/server.localpasswordvault.com_ssl_error.log
    CustomLog /var/log/httpd/server.localpasswordvault.com_ssl_access.log combined
    
    # Compression (if mod_deflate is available)
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
```

### 4.2 Test and Restart Apache

```bash
# Test Apache configuration
sudo httpd -t

# Restart Apache
sudo systemctl restart httpd

# Enable Apache to start on boot
sudo systemctl enable httpd

# Check Apache status
sudo systemctl status httpd
```

## 5. Configure SELinux (if enabled)

```bash
# Check if SELinux is enabled
sestatus

# If SELinux is enabled, allow Apache to make network connections
sudo setsebool -P httpd_can_network_connect 1

# Allow Apache to connect to port 3001
sudo semanage port -a -t http_port_t -p tcp 3001
# If semanage is not found, install it:
# sudo dnf install policycoreutils-python-utils -y
```

## 6. SSL Certificate Setup

### 6.1 Obtain SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --apache -d server.localpasswordvault.com

# Follow the prompts and choose to redirect HTTP to HTTPS
```

### 6.2 Test SSL Configuration

```bash
# Test SSL certificate
curl -I https://server.localpasswordvault.com/

# Check certificate auto-renewal
sudo certbot renew --dry-run
```

### 6.3 Setup Auto-renewal

```bash
# Add cron job for certificate renewal
sudo crontab -e

# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 7. Testing the Setup

### 7.1 Test Application

```bash
# Test if Node.js app is running
curl http://localhost:3001/

# Test through Apache proxy
curl https://server.localpasswordvault.com/

# Test API endpoint
curl -X POST https://server.localpasswordvault.com/api/validate-license \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"DEMO-1234-5678-9ABC","hardwareId":"test-hardware"}'
```

### 7.2 Check Logs

```bash
# Check PM2 logs
pm2 logs

# Check Apache logs
sudo tail -f /var/log/httpd/server.localpasswordvault.com_ssl_access.log
sudo tail -f /var/log/httpd/server.localpasswordvault.com_ssl_error.log

# Check system logs
sudo journalctl -u httpd -f
```

## 8. Environment Configuration

### 8.1 Update .env File

Make sure your `.env` file has the correct settings:

```env
# Update these values in your .env file
NODE_ENV=production
PORT=3001
SERVER_URL=https://server.localpasswordvault.com
ALLOWED_ORIGINS=https://localpasswordvault.com,https://www.localpasswordvault.com

# Add your actual Supabase, Stripe, and other API credentials
```

## 9. Monitoring and Maintenance

### 9.1 Setup Log Rotation

```bash
sudo nano /etc/logrotate.d/license-server
```

Add:

```
/var/www/server.localpasswordvault.com/license-server/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 passwordvault passwordvault
    postrotate
        pm2 reload license-server
    endscript
}
```

### 9.2 Setup Monitoring

```bash
# Install htop for system monitoring
sudo dnf install htop -y

# Check system resources
htop

# Monitor PM2 processes
pm2 monit
```

## 10. Common Commands

### 10.1 Application Management

```bash
# Restart the Node.js application
pm2 restart license-server

# Stop the application
pm2 stop license-server

# Start the application
pm2 start license-server

# View application logs
pm2 logs license-server --lines 100

# Check application status
pm2 status
```

### 10.2 Apache Management

```bash
# Restart Apache
sudo systemctl restart httpd

# Reload Apache configuration
sudo systemctl reload httpd

# Check Apache status
sudo systemctl status httpd

# Test Apache configuration
sudo httpd -t
```

## 11. Troubleshooting

### 11.1 Common Issues

**Issue: 502 Bad Gateway**
- Check if Node.js app is running: `pm2 status`
- Check if port 3001 is accessible: `netstat -tlnp | grep 3001`
- Check PM2 logs: `pm2 logs license-server`
- Check SELinux: `sudo ausearch -m avc -ts recent`

**Issue: SSL Certificate Problems**
- Renew certificate: `sudo certbot renew`
- Check certificate status: `sudo certbot certificates`

**Issue: Application Won't Start**
- Check Node.js version: `node --version`
- Check for missing dependencies: `npm install`
- Check environment variables in `.env`
- Check file permissions: `ls -la`

**Issue: Permission Denied**
- Check SELinux context: `ls -Z /var/www/server.localpasswordvault.com/`
- Set proper SELinux context: `sudo restorecon -R /var/www/server.localpasswordvault.com/`

### 11.2 Useful Debugging Commands

```bash
# Check what's running on port 3001
sudo netstat -tlnp | grep 3001

# Check Apache configuration syntax
sudo httpd -t

# Check loaded Apache modules
sudo httpd -M | grep proxy

# Test proxy connection manually
curl -H "Host: server.localpasswordvault.com" http://127.0.0.1:3001/

# Check SELinux denials
sudo ausearch -m avc -ts recent

# Check firewall rules
sudo firewall-cmd --list-all
```

## 12. Security Recommendations

1. **Keep system updated**: `sudo dnf update` (or `sudo yum update`)
2. **Use strong passwords** for all accounts
3. **Enable automatic security updates**
4. **Monitor logs regularly** for suspicious activity
5. **Backup your data** regularly
6. **Configure fail2ban** for intrusion detection
7. **Keep SSL certificates** up to date
8. **Review SELinux policies** regularly

## 13. Performance Optimization

1. **Enable Apache caching** modules
2. **Use compression** (already configured above)
3. **Monitor memory usage** with PM2
4. **Consider using multiple PM2 instances** for high traffic
5. **Optimize database queries** if using PostgreSQL
6. **Use Redis for caching** if needed
7. **Tune Apache MPM settings** for your server

## 14. CentOS/RHEL Specific Notes

1. **Package Manager**: Use `dnf` (CentOS 8+) or `yum` (CentOS 7)
2. **Apache Service**: Called `httpd` instead of `apache2`
3. **Configuration Location**: `/etc/httpd/conf.d/` instead of `/etc/apache2/sites-available/`
4. **Log Location**: `/var/log/httpd/` instead of `/var/log/apache2/`
5. **SELinux**: May need additional configuration for proxy connections
6. **Firewall**: Uses `firewalld` instead of `ufw`

This setup provides a production-ready environment for your Local Password Vault License Server running on `server.localpasswordvault.com` with Apache as a reverse proxy on CentOS/RHEL systems.
