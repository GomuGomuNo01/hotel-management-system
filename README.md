# Hotel Management System

Monorepo containing a Laravel 11 REST API backend and a React 18 + Vite SPA frontend.

```
.
├── backend/   ← Laravel 11 API (Sanctum, Socialite, DomPDF)
├── frontend/  ← React 18 + Vite SPA (Tailwind v3, Zustand, React Router v6)
└── README.md
```

## Quick start

### 1. Backend (Laravel)

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve            # → http://localhost:8000
```

The API is mounted under `http://localhost:8000/api`.

### 2. Frontend (React + Vite)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                  # → http://localhost:5173
```

The SPA reads `VITE_API_URL` (defaults to `http://localhost:8000/api`).

## How the two halves talk

| Concern | Backend | Frontend |
|---|---|---|
| Base URL | `routes/api.php` mounted at `/api` | `VITE_API_URL` (`src/api/axios.js`) |
| Auth | Sanctum personal access tokens (multi-model: Owner/Admin/Client) | Bearer token injected via Axios request interceptor, persisted in Zustand |
| CORS | `backend/config/cors.php` — origins from `FRONTEND_URLS` env var | n/a |
| Errors | JSON envelopes for 401/403/404/422 (see `bootstrap/app.php`) | Axios response interceptor maps statuses to toasts and triggers logout on 401 |
| Webhooks | `/api/webhooks/orange` & `/api/webhooks/wave` (HMAC-verified) | Polling `/api/payments/{id}/status` every 5s |
| Files | `storage/app/private` (PDF invoices via DomPDF) | Blob download via `paymentsApi.invoiceBlob` |

## Three roles, three spaces

- **Client** (`/mon-espace/*`) — public registration, Google OAuth, room browsing, reservations, mobile-money payments
- **Admin** (`/admin/*`) — back-office CRUD, check-in/out, audit-logged actions
- **Owner** (`/owner/*`) — strategic dashboard with KPI/Recharts, admin management, full audit trail

Backend auth and frontend guards rely on the same `role` value (`client | admin | owner`) returned by `POST /api/auth/login`.

## Environment variables

### Backend (`backend/.env`)
- Database (`DB_*`)
- Mail (`MAIL_*`) — required for admin credentials email & payment receipts
- Google OAuth (`GOOGLE_*`)
- Orange CI / Wave CI (`ORANGE_CI_*`, `WAVE_CI_*`)
- **`FRONTEND_URLS`** — comma-separated list of allowed CORS origins

### Frontend (`frontend/.env`)
- `VITE_API_URL` — backend base URL with trailing `/api`
- `VITE_GOOGLE_REDIRECT_URL` — full URL of the backend Google redirect endpoint
- `VITE_APP_NAME`

## Branches

- `Dev` — reference branch, all work lands here first
- `main` — kept in sync with `Dev`
- feature branches under `claude/*`
