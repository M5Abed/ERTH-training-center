# 🚀 Hostinger FTP Deployment Guide
## NMU ERTH Training Center Platform

This project is 100% prepared and optimized for deployment on Hostinger Shared / Cloud / VPS Web Hosting.

---

## 📁 Files & Folders to Upload to Hostinger `public_html/`

When you connect to Hostinger via FTP (using FileZilla, Cyberduck, or Hostinger File Manager), upload the following files and folders into your `public_html/` directory:

```text
public_html/
│
├── api/                    <-- Backend PHP API (Keep intact)
├── dist/                   <-- Compiled Frontend React/Vite App (Contains index.html & assets/)
├── uploads/                <-- Storage directory for student deliverables, documents & avatars
├── .htaccess               <-- Production Apache/LiteSpeed routing & security configuration
├── .env                    <-- Your Hostinger database & SMTP credentials (created from .env.hostinger.example)
├── favicon.ico             <-- Website favicon
├── NMU_AI_Robotics_Field_Training_Project_Template.docx <-- Proposal Word Template
└── vendor/                 <-- (Optional) Composer dependencies if present
```

> [!TIP]
> **DO NOT upload** `node_modules/`, `frontend/`, `frontend-new/`, `.git/`, or `scratch/` to Hostinger. The production frontend is already pre-compiled inside `dist/`.

---

## 🛠️ Step-by-Step Deployment Walkthrough

### Step 1: Create Database & Import Schema in Hostinger
1. Log into your **Hostinger hPanel** (`https://hpanel.hostinger.com`).
2. Go to **Databases** -> **Management** (or **MySQL Databases**).
3. Create a new MySQL Database:
   - **Database Name**: e.g., `u123456789_erth_training`
   - **Username**: e.g., `u123456789_admin`
   - **Password**: *[Create a strong password]*
4. Click **Enter phpMyAdmin** next to your newly created database.
5. In phpMyAdmin, click the **Import** tab at the top.
6. Click **Choose File** and select:
   `db_dump/hostinger_database_ready.sql` (located in the project folder).
7. Click **Go** / **Import**. All tables and seed courses/topics will be created immediately.

---

### Step 2: Configure Environment Credentials (`.env`)
1. In the project root, make a copy of `.env.hostinger.example` and name it `.env`.
2. Open `.env` and fill in your Hostinger MySQL credentials:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_NAME=u123456789_erth_training
   DB_USER=u123456789_admin
   DB_PASS=Your_Actual_Hostinger_Database_Password
   DB_CHARSET=utf8mb4

   # Allowed Live Domain
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

   # Email (SMTP) - Hostinger Webmail
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=465
   SMTP_USER=noreply@yourdomain.com
   SMTP_PASS=Your_Hostinger_Email_Password
   SMTP_FROM_EMAIL=noreply@yourdomain.com
   SMTP_FROM_NAME="NMU ERTH Training Center"

   # AI Acceleration (Optional - Groq Cloud API)
   GROQ_API_KEY=gsk_your_groq_api_key
   ```

---

### Step 3: Upload Files via FTP / FileZilla
1. Open **FileZilla** and enter your Hostinger FTP credentials:
   - **Host**: `ftp.yourdomain.com` (or the IP listed in Hostinger hPanel -> FTP Accounts)
   - **Username**: Your FTP Username
   - **Password**: Your FTP Password
   - **Port**: `21`
2. In the remote pane on the right, open the **`public_html`** directory.
3. Select and upload:
   - `api/`
   - `dist/`
   - `uploads/`
   - `.htaccess`
   - `.env`
   - `favicon.ico`
   - `NMU_AI_Robotics_Field_Training_Project_Template.docx`
4. Make sure folder permissions for `uploads/` are set to `755` or `775` so uploaded student files and documents can be written.

---

### Step 4: Verify Your Deployment
1. Visit your domain: `https://yourdomain.com`.
2. The landing page and sign-in page will load instantly.
3. Log in with your administrator / trainer account.
4. Test importing your student roster Excel file and creating course materials!

---

## 🔒 Security & Performance Features Active on Hostinger

- **Protected `.env` and Database Dumps**: `.htaccess` automatically denies direct browser access to `.env`, `.sql`, `composer.json`, and backup files.
- **Zero-Dependency DOCX Engine**: Native `ZipArchive` OpenXML generation for proposals—no external server packages required.
- **Auto SPA Routing**: Direct links (like `https://yourdomain.com/courses` or `https://yourdomain.com/trainees`) route cleanly to `dist/index.html` without 404 errors.
- **Gzip & Browser Caching**: High speed asset caching for JS/CSS and auto-revalidation for `index.html`.
