# Hotel Management System

Monorepo containing a Laravel 13 REST API backend and a React 18 + Vite SPA frontend.

```
.
├── backend/   ← Laravel 13 API (Sanctum, Socialite, DomPDF)
├── frontend/  ← React 18 + Vite SPA (Tailwind v3, Zustand, React Router v6)
└── README.md
```

## Prerequisites

- PHP **8.3+** and Composer
- Node **18+** and npm
- MySQL 8 (or MariaDB) — database `hotel_management`
- Redis _optional_ (used for `throttle` middleware; replace `throttleWithRedis()` with `throttleApi()` in `backend/bootstrap/app.php` if Redis is not available)

## Quick start

### 1. Backend (Laravel — port 8000)

```bash
cd backend

# PHP dependencies
composer install

# Config
cp .env.example .env
php artisan key:generate
```

Edit `backend/.env` (the important bits):

```dotenv
APP_ENV=local
APP_DEBUG=true

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=hotel_management
DB_USERNAME=root
DB_PASSWORD=

FRONTEND_URLS=http://localhost:5173,http://127.0.0.1:5173
```

Create the MySQL database (one-time):

```sql
CREATE DATABASE hotel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then migrate + seed and serve (in **two terminals**):

```bash
php artisan migrate --seed       # idempotent: re-running is safe
php artisan serve                # → http://localhost:8000

# 2nd terminal — required for emails (reservation, payment receipt, admin credentials)
php artisan queue:work
```

### 2. Frontend (React + Vite — port 5173)

In a **3rd terminal**:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                      # → http://localhost:5173
```

The SPA reads `VITE_API_URL` (defaults to `http://localhost:8000/api`).

## Test accounts (created by the seeder)

| Role   | Email                  | Password   |
|--------|------------------------|------------|
| Owner  | `patron@hotel.local`   | `password` |
| Admin  | `admin@hotel.local`    | `password` |
| Client | `client@hotel.local`   | `password` |

## How the two halves talk

| Concern   | Backend                                                            | Frontend                                                                          |
|-----------|--------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| Base URL  | `routes/api.php` mounted at `/api`                                 | `VITE_API_URL` (`src/api/axios.js`)                                               |
| Auth      | Sanctum personal access tokens (multi-model: Owner/Admin/Client)   | Bearer token injected via Axios request interceptor, persisted in Zustand         |
| CORS      | `backend/config/cors.php` — origins from `FRONTEND_URLS` env var   | n/a                                                                               |
| Errors    | JSON envelopes for 401/403/404/422 (see `bootstrap/app.php`)       | Axios response interceptor maps statuses to toasts and triggers logout on 401     |
| Webhooks  | `/api/webhooks/orange` & `/api/webhooks/wave` (HMAC-verified)      | Polling `/api/payments/{id}/status` every 5 s                                     |
| Files     | `storage/app/private` (PDF invoices via DomPDF)                    | Blob download via `paymentsApi.invoiceBlob`                                       |

## Three roles, three spaces

- **Client** (`/mon-espace/*`) — public registration, Google OAuth, room browsing, reservations, mobile-money payments
- **Admin** (`/admin/*`) — back-office CRUD, check-in/out, audit-logged actions
- **Owner** (`/owner/*`) — strategic dashboard with KPI/Recharts, admin management, full audit trail

Backend auth and frontend guards rely on the same `role` value (`client | admin | owner`) returned by `POST /api/auth/login`.

## Branches

- `Dev` — reference branch, all work lands here first
- `main` — kept in sync with `Dev`
- feature branches under `claude/*`

## Troubleshooting

### Laravel ignores my `.env` and uses SQLite (or any other unexpected value)

Laravel reads OS / shell environment variables **before** the `.env` file. If a variable like `DB_CONNECTION=sqlite` is defined at the user or system level, it silently overrides `.env`.

Diagnose (PowerShell):

```powershell
echo $env:DB_CONNECTION
[System.Environment]::GetEnvironmentVariable('DB_CONNECTION','User')
[System.Environment]::GetEnvironmentVariable('DB_CONNECTION','Machine')
```

If any of these returns a non-empty value, remove it:

```powershell
Remove-Item Env:DB_CONNECTION
[System.Environment]::SetEnvironmentVariable('DB_CONNECTION', $null, 'User')
# Open PowerShell as admin if it is at Machine level:
[System.Environment]::SetEnvironmentVariable('DB_CONNECTION', $null, 'Machine')
```

Close and reopen the terminal, then verify:

```bash
cd backend
php artisan config:clear
php artisan tinker --execute="echo config('database.default').PHP_EOL;"   # must print: mysql
```

### "APPLICATION IN PRODUCTION" warning on every artisan command

Set `APP_ENV=local` and `APP_DEBUG=true` in `backend/.env`, then `php artisan config:clear`.

### CORS errors in the browser console

Confirm `FRONTEND_URLS` in `backend/.env` matches the URL you load the SPA from (default: `http://localhost:5173`), then `php artisan config:clear`.

### Emails are not sent

Make sure `php artisan queue:work` is running and `MAIL_*` is configured (Mailtrap recommended for local dev).

### `Class "Redis" not found` at boot

Replace `$middleware->throttleWithRedis()` with `$middleware->throttleApi()` in `backend/bootstrap/app.php`.

### `npm install` fails with peer dependency conflicts

```bash
npm install --legacy-peer-deps
```

### Reset the database from scratch

```bash
cd backend
php artisan migrate:fresh --seed
```
