# ThinkTank — New Mansoura University Field Training Platform

[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%207-646CFF?logo=vite)](https://vitejs.dev/)
[![PHP](https://img.shields.io/badge/Backend-PHP%208-777BB4?logo=php)](https://www.php.net/)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208.0-4479A1?logo=mysql)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Deployment-Docker%20Compose-2496ED?logo=docker)](https://www.docker.com/)

A modern, full-stack field training and smart team formation platform designed for **New Mansoura University**. ThinkTank enables students, trainers, and administrators to collaborate seamlessly on field training courses, project proposals, team matching, AI-assisted project generation, and document management.

---

## 🌟 Key Features

- **🎓 Field Training & Course Management**: Explore active training courses, enroll trainees, view course details, topics, and training materials.
- **💡 Smart Idea & Project Management**: Submit, evaluate, filter, and track project proposals with status workflows (Pending, Approved, Needs Revision).
- **🤖 Groq AI Assistance**: Automatically extract skills and expand raw project ideas into structured project descriptions using Groq Cloud API (`llama-3.1-8b-instant`).
- **👥 Role-Based Portals**: Tailored interfaces for Trainees, Trainers (Coaches/Instructors), and System Administrators.
- **🏆 Idea Leaderboard & Analytics**: Showcase top-rated project ideas and track overall platform statistics.
- **📁 Document Archive & Materials**: Upload and manage project documentation, PDFs, links, and topic materials.
- **🌐 Full Bilingual Support**: Seamless live toggle between English (LTR) and Arabic (RTL) interfaces with Cairo & Inter typography.
- **🎨 FlowMind Visual Design System**: Modern dark-mode aesthetic with glassmorphism, responsive CSS tokens, and high-performance micro-animations.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 SPA
- **Build Tool**: Vite 7
- **Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid, Glassmorphism, Theme Tokens)
- **Icons**: Lucide React
- **Charts**: Chart.js & React-ChartJS-2
- **PDF Viewing**: PDF.js (`pdfjs-dist`)
- **Crop**: React Easy Crop

### Backend & Infrastructure
- **API Engine**: PHP 8 (RESTful JSON Endpoints)
- **Database**: MySQL 8.0 / MariaDB
- **Containerization**: Docker & Docker Compose
- **Database GUI**: phpMyAdmin (via Docker)
- **Security**: Session-based auth, CSRF tokens, strict CORS, input validation, rate limiting, and password hashing (`PASSWORD_ARGON2ID`).

---

## 🚀 Quick Start & Installation

### Option 1: Using Docker Compose (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/nmu-thinktank-training.git
   cd nmu-thinktank-training
   ```

2. **Set up Environment Variables**:
   ```bash
   cp .env.example .env
   ```

3. **Launch Containers**:
   ```bash
   docker-compose up -d --build
   ```
   - App: [http://localhost](http://localhost)
   - phpMyAdmin: [http://localhost:8080](http://localhost:8080)

---

### Option 2: Local Development Setup (Manual)

#### 1. Backend (PHP + MySQL)
1. Ensure PHP 8.0+ and MySQL are installed.
2. Create a MySQL database (e.g. `nmu_thinktank`).
3. Import schema files from `db_dump/`:
   ```bash
   mysql -u root -p nmu_thinktank < db_dump/001_initial_schema.sql
   mysql -u root -p nmu_thinktank < db_dump/002_training_schema.sql
   ```
4. Copy `.env.example` to `.env` and fill in your DB credentials:
   ```env
   DB_HOST=localhost
   DB_NAME=nmu_thinktank
   DB_USER=root
   DB_PASS=your_password
   GROQ_API_KEY=your_groq_api_key_here
   ```
5. Start PHP server from the project root:
   ```bash
   php -S localhost:8000 router.php
   ```

#### 2. Frontend (React + Vite)
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Environment Variables

| Variable | Description | Default / Example |
|---|---|---|
| `DB_HOST` | Database host | `db` (Docker) or `localhost` |
| `DB_NAME` | Database name | `nmu_thinktank` |
| `DB_USER` | Database username | `erth_user` |
| `DB_PASS` | Database password | `your_secure_password` |
| `ALLOWED_ORIGINS` | Permitted CORS origins | `http://localhost,http://localhost:5173` |
| `GROQ_API_KEY` | Groq Cloud AI API key | `gsk_...` |
| `SMTP_HOST` | Email server host | `smtp.hostinger.com` |
| `SMTP_USER` | Email sender account | `info@erth.dev` |

---

## 📁 Repository Structure

```
.
├── api/                  # PHP REST API Endpoints & Logic
│   ├── admin/            # Administrative endpoints
│   ├── ai/               # Groq AI proxy & generation logic
│   ├── auth/             # Login, register, session management
│   ├── training/         # Courses, topics, content, ideas, approvals
│   └── config.php        # Central DB & security configuration
├── db_dump/              # SQL schema migration dumps
├── frontend/             # React 19 + Vite Frontend SPA
│   ├── src/
│   │   ├── components/   # UI components (Header, Sidebar, Cards, Modals)
│   │   ├── contexts/     # Auth & I18n Contexts
│   │   ├── pages/        # Page views (Dashboard, Courses, Admin, Leaderboard)
│   │   └── services/     # API fetch wrapper
│   └── package.json
├── docker-compose.yml    # Multi-container Docker orchestration
├── Dockerfile            # PHP + Apache application container definition
├── router.php            # Router for PHP built-in web server
├── README.md             # Project documentation
└── .env.example          # Environment template
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
