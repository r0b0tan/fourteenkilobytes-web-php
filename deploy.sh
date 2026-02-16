#!/bin/bash
#
# fourteenkilobytes deployment script
# Supports multiple deployment targets
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function show_usage() {
    cat << EOF
Usage: ./deploy.sh [target] [options]

Targets:
    ssh         Deploy via SSH/rsync to VPS/root server
    ftp         Deploy via FTP to shared hosting
    local       Copy to local directory (e.g., XAMPP, MAMP)
    docker      Build and run Docker container
    
Options (SSH):
    -h HOST     SSH host (user@server)
    -p PATH     Remote path (e.g., /var/www/fourteenkilobytes)
    -s          Setup nginx config and permissions (requires sudo)
    -v VERSION  Deploy as versioned release (creates releases/VERSION + current symlink)
    -k COUNT    Keep COUNT latest releases in release mode (default: 5)
    -U URL      Health check URL after switch (optional, release mode)
    
Options (FTP):
    -H HOST     FTP host
    -u USER     FTP username
    -P PASS     FTP password (or use .netrc)
    -p PATH     Remote path
    
Options (Local):
    -p PATH     Local destination path
    -v VERSION  Deploy as versioned release (creates releases/VERSION + current symlink)
    -k COUNT    Keep COUNT latest releases in release mode (default: 5)
    
Examples:
    ./deploy.sh ssh -h user@example.com -p /var/www/site -s
    ./deploy.sh ftp -H ftp.example.com -u myuser -p /public_html
    ./deploy.sh local -p /Applications/XAMPP/htdocs/fourteenkilobytes
    ./deploy.sh docker

EOF
}

function check_build() {
    if [ ! -d "$DIST_DIR" ]; then
        echo -e "${YELLOW}No build found. Running build.sh...${NC}"
        "$SCRIPT_DIR/build.sh"
    fi
}

function deploy_ssh() {
    local HOST=""
    local PATH=""
    local SETUP=false
    local VERSION=""
    local KEEP_RELEASES=5
    local HEALTH_URL=""
    
    while getopts "h:p:sv:k:U:" opt; do
        case $opt in
            h) HOST="$OPTARG" ;;
            p) PATH="$OPTARG" ;;
            s) SETUP=true ;;
            v) VERSION="$OPTARG" ;;
            k) KEEP_RELEASES="$OPTARG" ;;
            U) HEALTH_URL="$OPTARG" ;;
            *) show_usage; exit 1 ;;
        esac
    done
    
    if [ -z "$HOST" ] || [ -z "$PATH" ]; then
        echo -e "${RED}Error: -h HOST and -p PATH required for SSH deployment${NC}"
        show_usage
        exit 1
    fi
    
    echo -e "${GREEN}Deploying to $HOST:$PATH via SSH...${NC}"

    if [ -n "$VERSION" ]; then
        local RELEASE_PATH="$PATH/releases/$VERSION"

        ssh "$HOST" "mkdir -p '$PATH' '$PATH/releases' '$PATH/data/posts' '$PATH/data/sources' '$RELEASE_PATH'"

        rsync -avz --delete \
            --exclude='data/**' \
            "$DIST_DIR/" "$HOST:$RELEASE_PATH/"

        ssh "$HOST" "BASE_PATH='$PATH' RELEASE_PATH='$RELEASE_PATH' KEEP_RELEASES='$KEEP_RELEASES' HEALTH_URL='$HEALTH_URL' bash -s" << 'REMOTE_RELEASE'
set -e

if [ ! -d "$RELEASE_PATH" ]; then
    echo "Release path does not exist: $RELEASE_PATH"
    exit 1
fi

PREVIOUS_TARGET=""
if [ -L "$BASE_PATH/current" ]; then
    PREVIOUS_TARGET="$(readlink -f "$BASE_PATH/current" || true)"
fi

ln -sfn "$BASE_PATH/data" "$RELEASE_PATH/data"
ln -sfn "$RELEASE_PATH" "$BASE_PATH/current"

if [ -n "$HEALTH_URL" ]; then
    HEALTH_OK=false
    for _ in 1 2 3 4 5; do
        if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
            HEALTH_OK=true
            break
        fi
        sleep 1
    done

    if [ "$HEALTH_OK" != "true" ]; then
        if [ -n "$PREVIOUS_TARGET" ] && [ -d "$PREVIOUS_TARGET" ]; then
            ln -sfn "$PREVIOUS_TARGET" "$BASE_PATH/current"
        fi
        echo "Health check failed after switch: $HEALTH_URL"
        exit 1
    fi
fi

if [ "$KEEP_RELEASES" -gt 0 ] 2>/dev/null; then
    mapfile -t ALL_RELEASES < <(find "$BASE_PATH/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | awk '{print $2}')
    INDEX=0
    for REL in "${ALL_RELEASES[@]}"; do
        INDEX=$((INDEX + 1))
        if [ "$INDEX" -le "$KEEP_RELEASES" ]; then
            continue
        fi
        if [ "$REL" != "$(readlink -f "$BASE_PATH/current" || true)" ]; then
            rm -rf "$REL"
        fi
    done
fi
REMOTE_RELEASE
    else
        # Create remote directory
        ssh "$HOST" "mkdir -p $PATH"

        # Sync files
        rsync -avz --delete \
            --exclude='data/instance.json' \
            --exclude='data/settings.json' \
            --exclude='data/manifest.json' \
            --exclude='data/sessions.json' \
            --exclude='data/rate-limits.json' \
            --exclude='data/posts/*.html' \
            --exclude='data/sources/*.json' \
            "$DIST_DIR/" "$HOST:$PATH/"
    fi
    
    # Setup permissions and config
    if [ "$SETUP" = true ]; then
        echo -e "${YELLOW}Setting up permissions and configuration...${NC}"
        
        ssh "$HOST" bash << 'REMOTE_SETUP'
            set -e
            
            # Detect web server
            if command -v nginx >/dev/null 2>&1; then
                WEB_SERVER="nginx"
                WEB_USER="www-data"
            elif command -v apache2 >/dev/null 2>&1 || command -v httpd >/dev/null 2>&1; then
                WEB_SERVER="apache"
                WEB_USER="www-data"
            else
                echo "Warning: Could not detect web server"
                WEB_USER="www-data"
            fi
            
            echo "Detected: $WEB_SERVER (user: $WEB_USER)"
            
            # Set permissions
            sudo chown -R "$WEB_USER:$WEB_USER" '"$PATH"'/data/
            
            # Install nginx config if needed
            if [ "$WEB_SERVER" = "nginx" ]; then
                if [ -f '"$PATH"'/nginx.conf.example ] && [ ! -f /etc/nginx/sites-available/fourteenkilobytes ]; then
                    echo "Installing nginx config..."
                    sudo cp '"$PATH"'/nginx.conf.example /etc/nginx/sites-available/fourteenkilobytes
                    sudo ln -sf /etc/nginx/sites-available/fourteenkilobytes /etc/nginx/sites-enabled/
                    echo "Please edit /etc/nginx/sites-available/fourteenkilobytes with your domain and SSL settings"
                    echo "Then run: sudo nginx -t && sudo systemctl reload nginx"
                fi
            fi
            
            echo "Setup complete!"
REMOTE_SETUP
    fi
    
    echo -e "${GREEN}✓ Deployment complete!${NC}"
}

function deploy_ftp() {
    local HOST=""
    local USER=""
    local PASS=""
    local PATH="/"
    
    while getopts "H:u:P:p:" opt; do
        case $opt in
            H) HOST="$OPTARG" ;;
            u) USER="$OPTARG" ;;
            P) PASS="$OPTARG" ;;
            p) PATH="$OPTARG" ;;
            *) show_usage; exit 1 ;;
        esac
    done
    
    if [ -z "$HOST" ] || [ -z "$USER" ]; then
        echo -e "${RED}Error: -H HOST and -u USER required for FTP deployment${NC}"
        show_usage
        exit 1
    fi
    
    # Check if lftp is installed
    if ! command -v lftp >/dev/null 2>&1; then
        echo -e "${RED}Error: lftp not found. Install with: sudo apt install lftp${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Deploying to $HOST via FTP...${NC}"
    
    if [ -z "$PASS" ]; then
        # Use .netrc or prompt
        lftp -u "$USER" "$HOST" << EOF
mirror -R --delete --verbose --exclude 'data/instance.json' --exclude 'data/settings.json' "$DIST_DIR" "$PATH"
bye
EOF
    else
        lftp -u "$USER,$PASS" "$HOST" << EOF
mirror -R --delete --verbose --exclude 'data/instance.json' --exclude 'data/settings.json' "$DIST_DIR" "$PATH"
bye
EOF
    fi
    
    echo -e "${GREEN}✓ FTP deployment complete!${NC}"
    echo -e "${YELLOW}Note: Ensure data/ directory is writable (chmod 755 or 775)${NC}"
}

function deploy_local() {
    local PATH=""
    local VERSION=""
    local KEEP_RELEASES=5
    
    while getopts "p:v:k:" opt; do
        case $opt in
            p) PATH="$OPTARG" ;;
            v) VERSION="$OPTARG" ;;
            k) KEEP_RELEASES="$OPTARG" ;;
            *) show_usage; exit 1 ;;
        esac
    done
    
    if [ -z "$PATH" ]; then
        echo -e "${RED}Error: -p PATH required for local deployment${NC}"
        show_usage
        exit 1
    fi
    
    echo -e "${GREEN}Copying to $PATH...${NC}"

    if [ -n "$VERSION" ]; then
        local RELEASE_PATH="$PATH/releases/$VERSION"
        mkdir -p "$PATH/releases" "$PATH/data/posts" "$PATH/data/sources" "$RELEASE_PATH"

        rsync -av --delete \
            --exclude='data/**' \
            "$DIST_DIR/" "$RELEASE_PATH/"

        if [ -d "$DIST_DIR/data/seeds" ] && [ ! -d "$PATH/data/seeds" ]; then
            mkdir -p "$PATH/data"
            cp -r "$DIST_DIR/data/seeds" "$PATH/data/"
        fi

        ln -sfn "$PATH/data" "$RELEASE_PATH/data"
        ln -sfn "$RELEASE_PATH" "$PATH/current"

        if [ "$KEEP_RELEASES" -gt 0 ] 2>/dev/null; then
            mapfile -t ALL_RELEASES < <(find "$PATH/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | awk '{print $2}')
            INDEX=0
            for REL in "${ALL_RELEASES[@]}"; do
                INDEX=$((INDEX + 1))
                if [ "$INDEX" -le "$KEEP_RELEASES" ]; then
                    continue
                fi
                if [ "$REL" != "$(readlink -f "$PATH/current" || true)" ]; then
                    rm -rf "$REL"
                fi
            done
        fi
    else
        mkdir -p "$PATH"
        rsync -av --delete \
            --exclude='data/instance.json' \
            --exclude='data/settings.json' \
            "$DIST_DIR/" "$PATH/"
    fi
    
    echo -e "${GREEN}✓ Local deployment complete!${NC}"
    echo -e "${YELLOW}Visit http://localhost/ to begin setup${NC}"
}

function deploy_docker() {
    echo -e "${GREEN}Building Docker image...${NC}"
    
    docker build -t fourteenkilobytes:latest "$SCRIPT_DIR"
    
    echo -e "${GREEN}Starting container...${NC}"
    
    docker run -d \
        -p 8080:80 \
        -v "$SCRIPT_DIR/data:/var/www/html/data" \
        --name fourteenkilobytes \
        fourteenkilobytes:latest
    
    echo -e "${GREEN}✓ Docker deployment complete!${NC}"
    echo -e "${YELLOW}Access at: http://localhost:8080${NC}"
    echo -e "${YELLOW}Stop with: docker stop fourteenkilobytes${NC}"
}

# Main
if [ $# -eq 0 ]; then
    show_usage
    exit 0
fi

check_build

TARGET="$1"
shift

case "$TARGET" in
    ssh)
        deploy_ssh "$@"
        ;;
    ftp)
        deploy_ftp "$@"
        ;;
    local)
        deploy_local "$@"
        ;;
    docker)
        deploy_docker
        ;;
    *)
        echo -e "${RED}Unknown target: $TARGET${NC}"
        show_usage
        exit 1
        ;;
esac
