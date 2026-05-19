# TalentHub — Job Application Platform

A full-stack job application platform with an **Angular** frontend, **Node.js/Express** backend, and **PostgreSQL** database.

---

## Tech Stack

| Layer            | Technology                                      |
|------------------|-------------------------------------------------|
| Frontend         | Angular 17, Bootstrap 5, ng-bootstrap           |
| Backend          | Node.js, Express 5, TypeScript                  |
| Database         | PostgreSQL 15+                                  |
| Query Builder / Migrations | Knex.js 3                             |
| File Storage     | Local (`uploads/`) + Cloudinary                 |
| Auth             | JWT (access + refresh tokens), bcryptjs         |
| Email            | Nodemailer (Ethereal in dev, SMTP in prod)       |
| WhatsApp / SMS   | Twilio                                          |
| Containerization | Docker, Docker Compose                          |

---

## Prerequisites

Make sure the following are installed on your machine before starting:

- **Node.js** v18 or higher — https://nodejs.org
- **npm** v9 or higher (comes with Node)
- **PostgreSQL** v15 or higher — https://www.postgresql.org/download
- **Git** — https://git-scm.com

> Optionally, install **pgAdmin** or **DBeaver** for a GUI to manage the database.

---

## 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Job_Application
```

---

## 2. Database Setup

### 2.1 Create the database

Open **psql** or pgAdmin and run:

```sql
CREATE DATABASE talentdb;
```

> If you want a different database name, update `DB_NAME` in the `.env` file (step 3.2).

---

## 3. Backend Setup

### 3.1 Install dependencies

```bash
cd backend
npm install
```

### 3.2 Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Open `backend/.env` and update the following:

```env
NODE_ENV=development
PORT=3000

# PostgreSQL — match your local PostgreSQL setup
DB_HOST=localhost
DB_PORT=5432
DB_NAME=talentdb
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT — use any long random strings (minimum 64 characters each)
JWT_SECRET=your_very_long_random_jwt_secret_at_least_64_characters_long
JWT_REFRESH_SECRET=another_very_long_random_refresh_secret_at_least_64_characters
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS — Angular dev server
CORS_ORIGIN=http://localhost:4200

# SMTP — leave blank to use Ethereal (fake inbox for dev), or fill in real SMTP
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your@gmail.com
# SMTP_PASS=your-16-char-app-password
# EMAIL_FROM=TalentHub <your@gmail.com>

# App URLs
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:4200

# Cloudinary — get from https://console.cloudinary.com/settings/api-keys
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3.3 Run database migrations

Knex applies all pending migration files from `backend/migrations/` in order, creating every table and schema change:

```bash
npm run migrate
```

To undo the last batch:

```bash
npm run migrate:rollback
```

### 3.4 Run database seeds

Seeds insert the default roles and the default admin user (`01_roles_and_admin.ts`) and all lookup/master data (`02_master_data.ts`):

```bash
npm run seed
```

Default admin credentials after seeding:

| Field    | Value                  |
|----------|------------------------|
| Email    | admin@talenthub.com    |
| Password | Admin@1234             |

### 3.5 Start the backend server

```bash
npm run dev
```

The backend will start at **http://localhost:3000**

---

## 4. Frontend Setup

Open a **new terminal** (keep the backend running).

### 4.1 Install dependencies

```bash
cd frontend
npm install
```

### 4.2 Start the frontend dev server

```bash
npm start
```

This runs Angular with the proxy config (`proxy.conf.json`) which forwards all `/api` requests to `http://localhost:3000`.

The frontend will open at **http://localhost:4200**

---

## 5. Verify Everything Works

1. Open **http://localhost:4200** in your browser
2. Log in with the default admin credentials:
   - Email: `admin@talenthub.com`
   - Password: `Admin@1234`
3. You should land on the admin dashboard

---

## 6. Project Structure

```
Job_Application/
├── docker-compose.yml
│
├── backend/
│   ├── knexfile.ts              # Knex configuration (development + production)
│   ├── migrations/              # 59 Knex migration files (all DB schema changes)
│   ├── seeds/
│   │   ├── 01_roles_and_admin.ts  # Default roles and admin user
│   │   └── 02_master_data.ts      # Lookup / master data
│   ├── uploads/                 # Local file upload storage
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── server.ts            # Entry point — starts Express and verifies DB
│       ├── app.ts               # Express app setup, routes, global middleware
│       ├── config/
│       │   ├── db.ts            # Knex DB instance (shared across app)
│       │   ├── env.ts           # Validated environment variables
│       │   └── multer.ts        # File upload configuration
│       ├── middleware/
│       │   ├── authenticate.ts  # JWT authentication
│       │   ├── authorize.ts     # Role-based authorization
│       │   ├── errorHandler.ts  # Global Express error handler
│       │   └── rateLimiter.ts   # express-rate-limit config
│       ├── services/
│       │   ├── audit.service.ts     # Audit log writes
│       │   ├── email.service.ts     # Nodemailer / Ethereal email
│       │   ├── otp.service.ts       # OTP generation & verification
│       │   ├── token.service.ts     # JWT access & refresh token management
│       │   └── whatsapp.service.ts  # Twilio WhatsApp integration
│       ├── types/               # Shared TypeScript type definitions
│       └── modules/             # Feature modules (router + controller + service)
│           ├── auth/
│           ├── users/
│           ├── candidates/
│           ├── recruiters/
│           ├── shortlists/
│           ├── edit-requests/
│           ├── master/
│           ├── stats/
│           ├── uploads/
│           ├── audit-logs/
│           ├── contact-requests/
│           ├── contact-submissions/
│           ├── volunteers/
│           ├── volunteer-support-requests/
│           ├── agency-referrals/
│           ├── agency-interest-requests/
│           └── recruiter-access-requests/
│
└── frontend/
    ├── proxy.conf.json          # Proxies /api → http://localhost:3000
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── main.ts              # Angular bootstrap entry
        ├── index.html
        ├── styles.scss
        └── app/
            ├── app.config.ts   # Angular providers & app config
            ├── app.routes.ts   # Top-level route definitions
            ├── core/
            │   ├── constants/  # App-wide constants
            │   ├── guards/     # Route guards (auth, role)
            │   ├── interceptors/ # HTTP interceptors (JWT, error)
            │   ├── models/     # TypeScript interfaces & DTOs
            │   └── services/   # API service classes
            ├── features/
            │   ├── admin/      # Admin dashboard & management pages
            │   ├── auth/       # Login, register, password reset
            │   ├── candidate/  # Candidate profile & job pages
            │   ├── landing/    # Public landing page
            │   └── recruiter/  # Recruiter dashboard & search
            └── shared/
                ├── components/ # Reusable UI components
                └── pipes/      # Custom Angular pipes
```

---

## 7. Useful Commands

### Backend

| Command                    | Description                                      |
|----------------------------|--------------------------------------------------|
| `npm run dev`              | Start dev server with hot reload (nodemon)       |
| `npm run build`            | Compile TypeScript → `dist/`                     |
| `npm start`                | Run compiled JS from `dist/src/server.js`        |
| `npm run migrate`          | Run all pending Knex migrations                  |
| `npm run migrate:rollback` | Rollback the last migration batch                |
| `npm run seed`             | Run all Knex seed files                          |

### Frontend

| Command       | Description                                 |
|---------------|---------------------------------------------|
| `npm start`   | Start dev server (with API proxy)           |
| `npm run build` | Build for production (output: `dist/`)    |

---

## 8. Docker (Optional)

If you prefer Docker instead of manual setup:

```bash
# 1. Copy and fill in the env file
cp backend/.env.example backend/.env
# Edit backend/.env with your secrets

# 2. Start everything (DB + backend + frontend)
docker compose up --build
```

Migrations and seeds run automatically on backend startup.

- Frontend: http://localhost:4200
- Backend API: http://localhost:3000

---

## 9. Common Issues

**`ECONNREFUSED` on backend start**
- Make sure PostgreSQL is running and `DB_HOST`, `DB_USER`, `DB_PASSWORD` in `.env` are correct.

**`The migration directory is corrupt` error**
- This means migration files were renamed. Run: `npm run migrate` — it should resolve automatically.

**Port already in use**
- Change `PORT` in `backend/.env` and update `proxy.conf.json` in the frontend to match.

**Cloudinary uploads not working**
- Fill in `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env`.

**Emails not sending**
- In development, leave SMTP fields blank — the app uses Ethereal (a fake inbox). Check the backend console log for a preview URL after an email is triggered.
