# TalentHub — Job Application Platform

A full-stack job application platform with an **Angular** frontend, **Node.js/Express** backend, and **PostgreSQL** database.

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | Angular 17, Bootstrap 5             |
| Backend  | Node.js, Express, TypeScript        |
| Database | PostgreSQL 15+                      |
| ORM/Migrations | Knex.js                       |
| File Storage | Cloudinary                      |
| Auth     | JWT (access + refresh tokens)       |

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

This creates all tables in the database:

```bash
npm run migrate
```

### 3.4 Run database seeds

This inserts the default roles and the default admin user:

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
├── backend/
│   ├── migrations/          # Knex database migrations
│   ├── seeds/               # Seed data (roles + default admin)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── candidates/  # Candidate CRUD
│   │   │   ├── recruiters/  # Recruiter management
│   │   │   ├── edit-requests/
│   │   │   ├── stats/
│   │   │   └── uploads/
│   │   ├── middleware/      # Auth middleware
│   │   ├── services/        # Email service
│   │   └── app.ts
│   ├── .env.example
│   └── knexfile.ts
│
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── core/
│   │       │   ├── models/       # TypeScript interfaces
│   │       │   └── services/     # API services
│   │       ├── features/
│   │       │   ├── admin/        # Admin pages
│   │       │   ├── candidate/    # Candidate pages
│   │       │   └── recruiter/    # Recruiter pages
│   │       └── shared/           # Reusable components
│   └── proxy.conf.json
│
└── docker-compose.yml
```

---

## 7. Useful Commands

### Backend

| Command               | Description                        |
|-----------------------|------------------------------------|
| `npm run dev`         | Start dev server with hot reload   |
| `npm run build`       | Compile TypeScript to JS           |
| `npm run migrate`     | Run pending migrations             |
| `npm run migrate:rollback` | Rollback last migration batch |
| `npm run seed`        | Run seed files                     |

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
