#!/bin/bash
#
# fix-permissions.sh - Security Hardening Script
# Sets proper file permissions for fourteenkilobytes CMS
#
# Usage: sudo ./fix-permissions.sh [web-user] [web-group]
# Example: sudo ./fix-permissions.sh www-data www-data
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default web server user/group (can be overridden)
if [ "$EUID" -eq 0 ]; then
    DEFAULT_USER="www-data"
    DEFAULT_GROUP="www-data"
else
    DEFAULT_USER="$(id -un)"
    DEFAULT_GROUP="$(id -gn)"
fi

WEB_USER="${1:-$DEFAULT_USER}"
WEB_GROUP="${2:-$DEFAULT_GROUP}"

echo -e "${GREEN}=== fourteenkilobytes Security Hardening ===${NC}"
echo "Web user: ${WEB_USER}"
echo "Web group: ${WEB_GROUP}"
echo "Directory: ${SCRIPT_DIR}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    if [ "$WEB_USER" != "$(id -un)" ]; then
        echo -e "${RED}ERROR: This script must be run as root to change ownership to another user${NC}"
        echo "Usage: sudo $0 [web-user] [web-group]"
        exit 1
    else
         echo -e "${YELLOW}Running in Development Mode (current user)...${NC}"
    fi
fi

# Check if web user exists
if ! id "$WEB_USER" &>/dev/null; then
    echo -e "${RED}ERROR: User '$WEB_USER' does not exist${NC}"
    exit 1
fi

# Check if web group exists
if ! getent group "$WEB_GROUP" &>/dev/null; then
    echo -e "${RED}ERROR: Group '$WEB_GROUP' does not exist${NC}"
    exit 1
fi

echo -e "${YELLOW}Setting base permissions...${NC}"

# Base directory permissions
# Owner: current user (for git, editing), Group: web server (for PHP)
chown -R "$USER:$WEB_GROUP" "$SCRIPT_DIR"

# Directories: 750 (owner rwx, group r-x, others none)
find "$SCRIPT_DIR" -type d -exec chmod 750 {} \;

# Files: 640 (owner rw, group r, others none)
find "$SCRIPT_DIR" -type f -exec chmod 640 {} \;

# Make scripts executable
echo -e "${YELLOW}Making scripts executable...${NC}"
chmod 750 "$SCRIPT_DIR"/*.sh 2>/dev/null || true
chmod 750 "$SCRIPT_DIR"/deploy.sh 2>/dev/null || true
chmod 750 "$SCRIPT_DIR"/build.sh 2>/dev/null || true

# Data directory - needs write access for web server
if [ -d "$SCRIPT_DIR/data" ]; then
    echo -e "${YELLOW}Setting data directory permissions...${NC}"
    
    # Data dir itself: 750
    chmod 750 "$SCRIPT_DIR/data"
    
    # Subdirectories: 750
    find "$SCRIPT_DIR/data" -type d -exec chmod 750 {} \;
    
    # Regular JSON files: 640
    find "$SCRIPT_DIR/data" -name "*.json" -exec chmod 640 {} \;
    
    # Sensitive files: 600 (owner only)
    echo -e "${YELLOW}Securing sensitive files...${NC}"
    [ -f "$SCRIPT_DIR/data/instance.json" ] && chmod 600 "$SCRIPT_DIR/data/instance.json"
    [ -f "$SCRIPT_DIR/data/sessions.json" ] && chmod 600 "$SCRIPT_DIR/data/sessions.json"
    [ -f "$SCRIPT_DIR/data/rate-limits.json" ] && chmod 600 "$SCRIPT_DIR/data/rate-limits.json"
    [ -f "$SCRIPT_DIR/data/global-rate-limits.json" ] && chmod 600 "$SCRIPT_DIR/data/global-rate-limits.json"
    [ -f "$SCRIPT_DIR/data/audit.log" ] && chmod 600 "$SCRIPT_DIR/data/audit.log"
    
    # Lock file: 644 (needs to be readable by web server for routing)
    [ -f "$SCRIPT_DIR/data/.setup-complete" ] && chmod 644 "$SCRIPT_DIR/data/.setup-complete"
    
    # HTML files: 644 (publicly readable)
    find "$SCRIPT_DIR/data/posts" -name "*.html" -exec chmod 644 {} \; 2>/dev/null || true
    
    # Source files: 640
    find "$SCRIPT_DIR/data/sources" -name "*.json" -exec chmod 640 {} \; 2>/dev/null || true
    
    # Seeds: 644 (templates, can be public)
    find "$SCRIPT_DIR/data/seeds" -name "*.json" -exec chmod 644 {} \; 2>/dev/null || true
fi

# Public directory - readable by web server
if [ -d "$SCRIPT_DIR/public" ]; then
    echo -e "${YELLOW}Setting public directory permissions...${NC}"
    find "$SCRIPT_DIR/public" -type d -exec chmod 755 {} \;
    find "$SCRIPT_DIR/public" -type f -exec chmod 644 {} \;
fi

# PHP files: 640 (not directly executable, served through PHP-FPM)
echo -e "${YELLOW}Setting PHP file permissions...${NC}"
find "$SCRIPT_DIR" -name "*.php" -exec chmod 640 {} \;

# Protect sensitive files
echo -e "${YELLOW}Protecting configuration files...${NC}"
[ -f "$SCRIPT_DIR/.htaccess" ] && chmod 644 "$SCRIPT_DIR/.htaccess"
[ -f "$SCRIPT_DIR/nginx.conf.example" ] && chmod 644 "$SCRIPT_DIR/nginx.conf.example"
[ -f "$SCRIPT_DIR/docker-compose.yml" ] && chmod 640 "$SCRIPT_DIR/docker-compose.yml"
[ -f "$SCRIPT_DIR/Dockerfile" ] && chmod 640 "$SCRIPT_DIR/Dockerfile"

# .gitignore and documentation: 644
find "$SCRIPT_DIR" -maxdepth 1 -name "*.md" -exec chmod 644 {} \;
[ -f "$SCRIPT_DIR/.gitignore" ] && chmod 644 "$SCRIPT_DIR/.gitignore"

# Version file: 644 (publicly readable)
[ -f "$SCRIPT_DIR/version.json" ] && chmod 644 "$SCRIPT_DIR/version.json"

echo ""
echo -e "${GREEN}✓ Permissions fixed successfully!${NC}"
echo ""
echo -e "${YELLOW}Security Checklist:${NC}"
echo "  [√] Base permissions: 750/640"
echo "  [√] Sensitive files: 600"
echo "  [√] Public files: 644/755"
echo "  [√] Data directory: secured"
echo ""
echo -e "${YELLOW}Additional Security Recommendations:${NC}"
echo "  1. Ensure PHP open_basedir includes only necessary paths"
echo "  2. Enable HTTPS with valid SSL certificate"
echo "  3. Configure firewall (UFW/iptables)"
echo "  4. Enable fail2ban for brute-force protection"
echo "  5. Regular backups of data/ directory"
echo "  6. Keep PHP and system packages updated"
echo ""
echo -e "${GREEN}Done!${NC}"
