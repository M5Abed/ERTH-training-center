# NMU THINKTANK — Docker Deployment Guide

Deploy the NMU THINKTANK platform on an Ubuntu VM using Docker.

---

## Prerequisites

- Ubuntu 20.04+ VM with root/sudo access
- Internet access (for Docker images and Hostinger SMTP)

---

## Step 1: Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add your user to docker group (avoids needing sudo)
sudo usermod -aG docker $USER

# Log out and back in, then verify:
docker --version
docker compose version
```

---

## Step 2: Upload the Project

Upload the project directory to the VM (exclude `frontend/` and `node_modules/`):

```bash
# Option A: SCP from your local machine
scp -r ./matching/ user@VM_IP:/home/user/matching

# Option B: rsync (faster for subsequent uploads)
rsync -avz --exclude='frontend' --exclude='node_modules' ./ user@VM_IP:/home/user/matching
```

---

## Step 3: Configure Environment

```bash
cd /home/user/matching

# Use the Docker-ready environment file
cp .env.docker .env
```

The `.env` file is pre-configured with:
- **DB_HOST=db** (points to the MySQL Docker container)
- **Hostinger SMTP** credentials (works out of the box)
- **CORS** set to `localhost`

To change settings later, just edit `.env`:
```bash
nano .env
```

---

## Step 4: Import Database (Optional)

If you exported your database from Hostinger:

```bash
# Place your .sql dump in the db_dump/ folder
cp your_database_export.sql db_dump/
```

MySQL will auto-import it on first startup. If you skip this step, the included `001_schema.sql` creates all tables automatically (you'll start with an empty database).

---

## Step 5: Launch

```bash
# Build and start everything
docker compose up -d --build

# Watch the logs to make sure it's working
docker compose logs -f 
```

You should see:
- `erth-matching-db` — MySQL starting and accepting connections
- `erth-matching` — Apache starting on port 80

---

## Step 6: Verify

```bash
# Check containers are running
docker compose ps

# Test the app
curl http://localhost/api/public/stats.php
# Should return JSON with user/project counts

# Open in browser
# http://VM_IP_ADDRESS
```

---

## Updating the Domain

When the university points their domain to the VM:

1. Edit `.env` and update the CORS origins:
   ```
   ALLOWED_ORIGINS=https://yourdomain.university.edu,http://localhost
   ```

2. Restart the app:
   ```bash
   docker compose restart app
   ```

---

## Adding SSL (HTTPS) Later

If the university wants HTTPS, add an Nginx reverse proxy with Certbot:

```bash
sudo apt install certbot python3-certbot-nginx nginx -y
```

Then configure Nginx to proxy port 80 to Docker, and run:
```bash
sudo certbot --nginx -d yourdomain.university.edu
```

---

## Common Commands

```bash
# Stop everything
docker compose down

# Restart after .env changes
docker compose restart

# Rebuild after code changes
docker compose up -d --build

# View logs
docker compose logs -f app
docker compose logs -f db

# Access MySQL directly
docker compose exec db mysql -u erth_user -p erth_matching

# Access the PHP container shell
docker compose exec app bash
```

---

## Architecture

```
┌─────────────────────────────────┐
│         Ubuntu VM (Port 80)     │
│                                 │
│  ┌───────────┐  ┌────────────┐  │
│  │  Apache +  │  │  MySQL 8   │  │
│  │  PHP 8.2   │──│            │  │
│  │  (app)     │  │  (db)      │  │
│  │            │  │            │  │
│  │ • Frontend │  │ • All data │  │
│  │   (dist/)  │  │ • Persists │  │
│  │ • PHP API  │  │   in volume│  │
│  │ • PHPMailer│  │            │  │
│  └───────────┘  └────────────┘  │
│                                 │
│  SMTP ──→ smtp.hostinger.com    │
└─────────────────────────────────┘
```

---

## File Structure

```
matching/
├── Dockerfile           # Builds the PHP+Apache image
├── docker-compose.yml   # Orchestrates app + MySQL
├── .env.docker          # Docker-ready environment template
├── .env                 # Active environment (copy from .env.docker)
├── .dockerignore        # Excludes dev files from Docker build
├── .htaccess            # Apache routing rules
├── composer.json        # PHP dependencies (PHPMailer)
├── db_dump/             # Place .sql exports here for auto-import
│   └── 001_schema.sql   # Full database schema
├── dist/                # Pre-built React frontend
├── api/                 # PHP backend
└── DEPLOY.md            # This file
```

---

## Developed by [ERTH](https://erth.dev)
