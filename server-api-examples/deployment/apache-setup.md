# Apache Setup for Local Password Vault License Server

This guide will help you set up Apache as a reverse proxy for the Node.js license server on your Linode server with the domain `server.localpasswordvault.com`.

## Prerequisites

- Ubuntu/Debian Linode server
- Apache2 installed
- Node.js installed in backend folder
- Domain `server.localpasswordvault.com` pointing to your server IP
- SSL certificate (Let's Encrypt recommended)

## 1. Server Setup

### 1.1 Install Required Packages

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Apache and required modules
sudo apt install apache2 -y

# Enable required Apache modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod ssl
sudo a2enmod rewrite
sudo a2enmod headers

# Install Certbot for SSL certificates
sudo apt install certbot python3-certbot-apache -y

# Install PM2 globally for Node.js process management
sudo npm install -g pm2
```

### 1.2 Create Application User and Directory

```bash
# Create a dedicated user for the application
sudo adduser --system --group passwordvault
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
sudo nano /etc/apache2/sites-available/server.localpasswordvault.com.conf
```

Add this configuration:

```apache
<VirtualHost *:80>
    ServerName server.localpasswordvault.com
    ServerAlias www.server.localpasswordvault.com
    
    # Redirect all HTTP traffic to HTTPS
    Redirect permanent / https://server.localpasswordvault.com/
    
    # Log files
    ErrorLog ${APACHE_LOG_DIR}/server.localpasswordvault.com_error.log
    CustomLog ${APACHE_LOG_DIR}/server.localpasswordvault.com_access.log combined
</VirtualHost>

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
    ProxyPassReverse / http://127.0.0.1:3001/
    ProxyPreserveHost On
    ProxyAddHeaders On
    
    # Set headers for the backend
    ProxyPassReverse / http://127.0.0.1:3001/
    ProxySet "X-Forwarded-Proto" "https"
    ProxySet "X-Forwarded-For" "%h"
    ProxySet "X-Real-IP" "%h"
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/server.localpasswordvault.com_ssl_error.log
    CustomLog ${APACHE_LOG_DIR}/server.localpasswordvault.com_ssl_access.log combined
    
    # Optional: Rate limiting (if mod_security is installed)
    # SecRuleEngine On
    
    # Optional: Compress responses
    LoadModule deflate_module modules/mod_deflate.so
    <Location />
        SetOutputFilter DEFLATE
        SetEnvIfNoCase Request_URI \
            \.(?:gif|jpe?g|png)$ no-gzip dont-vary
        SetEnvIfNoCase Request_URI \
            \.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
    </Location>
</VirtualHost>
```

### 4.2 Enable Site and Modules

```bash
# Enable the site
sudo a2ensite server.localpasswordvault.com.conf

# Disable default Apache site (optional)
sudo a2dissite 000-default.conf

# Test Apache configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2

# Enable Apache to start on boot
sudo systemctl enable apache2
```

## 5. SSL Certificate Setup

### 5.1 Obtain SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --apache -d server.localpasswordvault.com

# Follow the prompts and choose to redirect HTTP to HTTPS
```

### 5.2 Test SSL Configuration

```bash
# Test SSL certificate
curl -I https://server.localpasswordvault.com/

# Check SSL grade (optional)
# Visit: https://www.ssllabs.com/ssltest/
```

## 6. Firewall Configuration

### 6.1 Configure UFW (Ubuntu Firewall)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Apache Full'

# Check status
sudo ufw status
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
sudo tail -f /var/log/apache2/server.localpasswordvault.com_ssl_access.log
sudo tail -f /var/log/apache2/server.localpasswordvault.com_ssl_error.log

# Check system logs
sudo journalctl -u apache2 -f
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
sudo apt install htop -y

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
sudo systemctl restart apache2

# Reload Apache configuration
sudo systemctl reload apache2

# Check Apache status
sudo systemctl status apache2

# Test Apache configuration
sudo apache2ctl configtest
```

## 11. Troubleshooting

### 11.1 Common Issues

**Issue: 502 Bad Gateway**
- Check if Node.js app is running: `pm2 status`
- Check if port 3001 is accessible: `netstat -tlnp | grep 3001`
- Check PM2 logs: `pm2 logs license-server`

**Issue: SSL Certificate Problems**
- Renew certificate: `sudo certbot renew`
- Check certificate status: `sudo certbot certificates`

**Issue: Application Won't Start**
- Check Node.js version: `node --version`
- Check for missing dependencies: `npm install`
- Check environment variables in `.env`
- Check file permissions: `ls -la`

### 11.2 Useful Debugging Commands

```bash
# Check what's running on port 3001
sudo netstat -tlnp | grep 3001

# Check Apache configuration syntax
sudo apache2ctl configtest

# Check Apache modules
sudo apache2ctl -M | grep proxy

# Test proxy connection manually
curl -H "Host: server.localpasswordvault.com" http://127.0.0.1:3001/
```

## 12. Security Recommendations

1. **Keep system updated**: `sudo apt update && sudo apt upgrade`
2. **Use strong passwords** for all accounts
3. **Enable automatic security updates**
4. **Monitor logs regularly** for suspicious activity
5. **Backup your data** regularly
6. **Use fail2ban** for intrusion detection
7. **Keep SSL certificates** up to date

## 13. Performance Optimization

1. **Enable Apache caching** modules
2. **Use compression** (already configured above)
3. **Monitor memory usage** with PM2
4. **Consider using multiple PM2 instances** for high traffic
5. **Optimize database queries** if using PostgreSQL
6. **Use Redis for caching** if needed

This setup provides a production-ready environment for your Local Password Vault License Server running on `server.localpasswordvault.com` with Apache as a reverse proxy.
