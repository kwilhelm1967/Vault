#!/bin/bash

# Unified Deployment Script (Local + Remote) for Local Password Vault License Server
# - One file to upload app files, provision server (AlmaLinux 9.x), configure Apache+SSL,
#   install Node/PM2, and start the service.
# - Run on your Mac: it will upload itself and the app to the server, then run remotely.
# - Run on the server as root: it will perform provisioning/startup directly.

set -euo pipefail
[[ "${DEBUG:-0}" == "1" ]] && set -x

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly NC='\033[0m'

print() { echo -e "$1"; }
info() { print "${BLUE}[INFO]${NC} $1"; }
ok() { print "${GREEN}[SUCCESS]${NC} $1"; }
warn() { print "${YELLOW}[WARNING]${NC} $1"; }
err() { print "${RED}[ERROR]${NC} $1"; }

# Defaults (overridable via flags)
APP_USER="passwordvault"
DOMAIN="server.localpasswordvault.com"
NODE_PORT="3001"
EMAIL=""
APP_NAME="license-server"
APP_ROOT="/var/www" # final path becomes /var/www/${DOMAIN}
REMOTE_SCRIPT_PATH="/root/deploy.sh"
REMOTE_APP_TAR="/tmp/${APP_NAME}-$(date +%Y%m%d_%H%M%S).tar.gz"
LOG_FILE="/var/log/passwordvault-deployment.log"
# Clean previous deployment by default unless --no-clean is passed
CLEAN=1

# State flags
APACHE_CONFIGURED=false
PM2_INSTALLED=false

usage() {
    cat <<USAGE
Usage:
    Local (on macOS):
        ./deploy.sh --local --server root@IP --domain ${DOMAIN} [--email you@example.com]

    Remote (on server as root):
        ./deploy.sh --remote --domain ${DOMAIN} --app-user ${APP_USER} --app-tar /tmp/app.tar.gz [--email you@example.com]

Options:
    --server <user@host>   SSH target, e.g. root@96.126.126.18
    --domain <fqdn>        FQDN to configure (default: ${DOMAIN})
    --app-user <name>      System user to run app (default: ${APP_USER})
    --email <email>        Email for Let's Encrypt (optional, recommended)
    --no-ssl               Skip SSL certificate issuance
    --no-clean             Do not remove previous app/PM2/Apache/logrotate before provisioning
    --debug                Verbose debug output
    -h, --help             Show help
USAGE
}

command_exists() { command -v "$1" >/dev/null 2>&1; }

make_tarball() {
    local src_dir="$1"
    local dest_tar="$2"
    info "Creating app archive from: $src_dir"
    tar -czf "$dest_tar" \
        --exclude node_modules \
        --exclude .git \
        -C "$src_dir" .
    ok "Created: $dest_tar"
}

push_files_remote() {
    local server="$1"; local local_tar="$2"; local remote_tar="$3"; local script_path="$4"
    info "Uploading app archive to $server:$remote_tar"
    scp "$local_tar" "$server:$remote_tar"
    ok "Archive uploaded"
    info "Uploading deploy script to $server:$script_path"
    scp "$0" "$server:$script_path"
    ok "Script uploaded"
}

run_remote() {
    local server="$1"; shift
    local remote_cmd=("bash" "$REMOTE_SCRIPT_PATH" "--remote" "$@")
    info "Starting remote deployment on $server"
    ssh "$server" "${remote_cmd[*]}"
}

# ===================== Remote functions (server) =====================

log_remote() {
    # Ensure log exists
    touch "$LOG_FILE"; chmod 644 "$LOG_FILE"
    echo -e "[$(date '+%F %T')] $*" | tee -a "$LOG_FILE"
}

install_dnf_pkgs() {
    local pkgs=("$@")
    dnf install -y "${pkgs[@]}" 2>&1 | tee -a "$LOG_FILE"
}

check_system() {
    [[ $EUID -eq 0 ]] || { err "Run as root on the server"; exit 1; }
    source /etc/os-release || { err "Cannot read /etc/os-release"; exit 1; }
    if [[ "$ID" != "almalinux" || ! "$VERSION_ID" =~ ^9\. ]]; then
        warn "Optimized for AlmaLinux 9.x. Detected: $PRETTY_NAME"
    else
        ok "Detected AlmaLinux 9.x"
    fi
}

setup_node() {
    info "Installing Node.js (16.x preferred for compatibility)"
    dnf remove -y nodejs npm nodejs-npm nsolid >/dev/null 2>&1 || true
    dnf clean all
    dnf module reset -y nodejs >/dev/null 2>&1 || true
    if dnf module install -y nodejs:16/common; then
        ok "Installed Node.js $(node -v)"
    else
        warn "Fallback to dnf install nodejs npm"
        install_dnf_pkgs nodejs npm
    fi
    node -v && npm -v || { err "Node/npm not available"; exit 1; }
}

setup_certbot() {
    install_dnf_pkgs epel-release
    if ! command_exists certbot; then
        info "Installing Certbot"
        install_dnf_pkgs certbot python3-certbot-apache || true
        if ! command_exists certbot; then
            err "Certbot not installed. You can install later: dnf install certbot python3-certbot-apache"; return 1
        fi
    fi
    ok "Certbot ready"
}

configure_services() {
    systemctl enable httpd
    systemctl start httpd
    systemctl enable firewalld || true
    systemctl start firewalld || true
}

configure_firewall() {
    firewall-cmd --permanent --add-service=http || true
    firewall-cmd --permanent --add-service=https || true
    firewall-cmd --permanent --add-service=ssh || true
    firewall-cmd --permanent --add-port="${NODE_PORT}/tcp" --zone=internal || true
    firewall-cmd --reload || true
}

configure_selinux() {
    if command_exists getenforce && [[ "$(getenforce)" != "Disabled" ]]; then
        setsebool -P httpd_can_network_connect 1 || true
        if command_exists semanage; then
            semanage port -a -t http_port_t -p tcp "$NODE_PORT" 2>/dev/null || \
            semanage port -m -t http_port_t -p tcp "$NODE_PORT" 2>/dev/null || true
        else
            install_dnf_pkgs policycoreutils-python-utils
            semanage port -a -t http_port_t -p tcp "$NODE_PORT" 2>/dev/null || \
            semanage port -m -t http_port_t -p tcp "$NODE_PORT" 2>/dev/null || true
        fi
    fi
}

create_app_user_and_dirs() {
    id "$APP_USER" &>/dev/null || adduser "$APP_USER"
    APP_DIR="${APP_ROOT}/${DOMAIN}"
    mkdir -p "$APP_DIR/license-server" "$APP_DIR/logs"
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
}

write_apache_vhost() {
    local conf="/etc/httpd/conf.d/${DOMAIN}.conf"
    info "Writing Apache vhost: $conf"
    cat > "$conf" <<EOF
# Auto-generated by deploy.sh
<VirtualHost *:80>
    ServerName ${DOMAIN}
    Redirect permanent / https://${DOMAIN}/
    ErrorLog /var/log/httpd/${DOMAIN}_error.log
    CustomLog /var/log/httpd/${DOMAIN}_access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName ${DOMAIN}
    # SSL managed by Certbot

    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass / http://127.0.0.1:${NODE_PORT}/
    ProxyPassReverse / http://127.0.0.1:${NODE_PORT}/

    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) ws://127.0.0.1:${NODE_PORT}/$1 [P,L]

    RequestHeader set "X-Forwarded-Proto" "https"
    RequestHeader set "X-Forwarded-Port" "443"

    ErrorLog /var/log/httpd/${DOMAIN}_ssl_error.log
    CustomLog /var/log/httpd/${DOMAIN}_ssl_access.log combined
</VirtualHost>
EOF
    apachectl configtest
    systemctl restart httpd
    APACHE_CONFIGURED=true
}

write_logrotate() {
    cat > /etc/logrotate.d/${APP_NAME} <<EOF
${APP_ROOT}/${DOMAIN}/${APP_NAME}/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ${APP_USER} ${APP_USER}
}
EOF
}

extract_app_and_install() {
    APP_DIR="${APP_ROOT}/${DOMAIN}"
    info "Extracting app to ${APP_DIR}/${APP_NAME}"
    mkdir -p "${APP_DIR}/${APP_NAME}"
    tar -xzf "$APP_TAR" -C "${APP_DIR}/${APP_NAME}"
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    info "Installing npm dependencies"
    sudo -u "$APP_USER" bash -lc "cd '${APP_DIR}/${APP_NAME}' && npm ci || npm install"
}

preclean_remote() {
    if [[ "${CLEAN:-1}" -eq 1 ]]; then
        info "Cleaning previous deployment artifacts (PM2/app/Apache/logrotate)"
        APP_DIR="${APP_ROOT}/${DOMAIN}"
        if command_exists pm2 >/dev/null 2>&1; then
            sudo -u "$APP_USER" pm2 delete "${APP_NAME}" 2>/dev/null || true
        fi
        rm -rf "${APP_DIR}/${APP_NAME}" 2>/dev/null || true
        if [[ -f "/etc/httpd/conf.d/${DOMAIN}.conf" ]]; then
            rm -f "/etc/httpd/conf.d/${DOMAIN}.conf" 2>/dev/null || true
            systemctl reload httpd || true
        fi
        rm -f "/etc/logrotate.d/${APP_NAME}" 2>/dev/null || true
    else
        warn "Skipping cleanup (--no-clean)"
    fi
}

write_pm2_config_and_start() {
    APP_DIR="${APP_ROOT}/${DOMAIN}"
    local eco="${APP_DIR}/${APP_NAME}/ecosystem.config.cjs"
    info "Writing PM2 ecosystem: $eco"
    cat > "$eco" <<EOF
module.exports = {
    apps: [
        {
            name: "${APP_NAME}",
            script: "license-server.js",
            cwd: "${APP_DIR}/${APP_NAME}",
            instances: 2,
            exec_mode: "cluster",
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: { NODE_ENV: "production", PORT: ${NODE_PORT}, HOST: "0.0.0.0" },
            error_file: "${APP_ROOT}/${DOMAIN}/logs/error.log",
            out_file: "${APP_ROOT}/${DOMAIN}/logs/out.log",
            merge_logs: true,
            time: true
        }
    ]
}
EOF
    if ! command_exists pm2; then npm i -g pm2 && PM2_INSTALLED=true; else PM2_INSTALLED=true; fi
    sudo -u "$APP_USER" pm2 delete "${APP_NAME}" 2>/dev/null || true
    sudo -u "$APP_USER" pm2 start "$eco"
    sudo -u "$APP_USER" pm2 save
    pm2 startup systemd -u "$APP_USER" --hp "/home/${APP_USER}" | bash || true
}

obtain_ssl() {
    [[ "${NO_SSL:-0}" == "1" ]] && { warn "Skipping SSL issuance"; return 0; }
    [[ -z "${EMAIL}" ]] && { warn "No email provided. Skipping automatic SSL."; return 0; }
    certbot --apache -d "$DOMAIN" -n --agree-tos -m "$EMAIL" || warn "Certbot run failed; you can retry later"
}

remote_main() {
    log_remote "Starting remote deployment for ${DOMAIN}"
    check_system
    preclean_remote
    install_dnf_pkgs httpd firewalld
    setup_node
    setup_certbot || true
    configure_services
    configure_firewall || true
    configure_selinux || true
    create_app_user_and_dirs
    write_apache_vhost
    write_logrotate || true
    extract_app_and_install
    write_pm2_config_and_start
    obtain_ssl || true
    ok "Deployment finished for https://${DOMAIN}"
}

# ===================== Argument parsing =====================

MODE=""
SERVER=""
NO_SSL=0
APP_TAR=""
 CLEAN=1

while [[ $# -gt 0 ]]; do
    case "$1" in
        --local) MODE="local" ; shift ;;
        --remote) MODE="remote" ; shift ;;
        --server) SERVER="$2" ; shift 2 ;;
        --domain) DOMAIN="$2" ; shift 2 ;;
        --app-user) APP_USER="$2" ; shift 2 ;;
        --email) EMAIL="$2" ; shift 2 ;;
        --app-tar) APP_TAR="$2" ; shift 2 ;;
        --no-ssl) NO_SSL=1 ; shift ;;
    --no-clean) CLEAN=0 ; shift ;;
        --debug) DEBUG=1 ; set -x ; shift ;;
        -h|--help) usage ; exit 0 ;;
        *) warn "Unknown option: $1" ; shift ;;
    esac
done

# Auto-detect mode if not provided
if [[ -z "$MODE" ]]; then
    if [[ "${OSTYPE:-}" == darwin* ]]; then MODE="local"; else MODE="remote"; fi
fi

if [[ "$MODE" == "local" ]]; then
    # Local workflow: tar app, upload tar + script, ssh run remote
    [[ -n "$SERVER" ]] || { err "--server user@host required in local mode"; usage; exit 1; }
    # Determine app root (this script is in server-api-examples/deployment)
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    LOCAL_APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
    [[ -d "$LOCAL_APP_DIR" ]] || { err "App directory not found: $LOCAL_APP_DIR"; exit 1; }

    LOCAL_TAR="/tmp/${APP_NAME}-$(date +%Y%m%d_%H%M%S).tar.gz"
    make_tarball "$LOCAL_APP_DIR" "$LOCAL_TAR"
    push_files_remote "$SERVER" "$LOCAL_TAR" "$REMOTE_APP_TAR" "$REMOTE_SCRIPT_PATH"
    rm -f "$LOCAL_TAR"

    # Run remote
    run_remote "$SERVER" --domain "$DOMAIN" --app-user "$APP_USER" --app-tar "$REMOTE_APP_TAR" ${EMAIL:+--email "$EMAIL"} $([[ $NO_SSL -eq 1 ]] && echo --no-ssl || true) $([[ $CLEAN -eq 0 ]] && echo --no-clean || true)
    exit 0
fi

if [[ "$MODE" == "remote" ]]; then
    [[ $EUID -eq 0 ]] || { err "Run remote mode as root"; exit 1; }
    [[ -n "$DOMAIN" ]] || { err "--domain required"; exit 1; }
    [[ -n "$APP_USER" ]] || { err "--app-user required"; exit 1; }
    [[ -n "$APP_TAR" ]] || { err "--app-tar required"; exit 1; }
    remote_main
    exit 0
fi

usage
exit 1
