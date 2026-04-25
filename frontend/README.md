# Hotel Management — Frontend

React 18 + Vite SPA pour le système de gestion hôtelière.

## Stack
- React 18 + Vite
- React Router v6
- Zustand (auth + UI)
- Axios (intercepteurs JWT/Sanctum)
- Tailwind CSS v3
- React Hook Form + Zod
- react-hot-toast
- Recharts
- date-fns
- Lucide React

## Installation

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Le frontend tourne sur `http://localhost:5173` et consomme l'API Laravel sur `http://localhost:8000/api` (configurable via `VITE_API_URL`).

## Variables d'environnement

```
VITE_API_URL=http://localhost:8000/api
VITE_GOOGLE_REDIRECT_URL=http://localhost:8000/api/auth/google/redirect
VITE_APP_NAME=Hotel Management
```

## Espaces

| Espace | URL | Accès |
|---|---|---|
| Public | `/`, `/rooms`, `/rooms/:id`, `/login`, `/register` | Tous |
| Client | `/mon-espace/*` | Client connecté |
| Admin  | `/admin/*` | Admin connecté |
| Patron | `/owner/*` | Owner connecté |

## Structure
```
src/
  api/         couche HTTP (axios + endpoints par domaine)
  components/  common / rooms / reservations / payments / admin / owner
  guards/      ClientGuard / AdminGuard / OwnerGuard
  hooks/       useAuth, useRooms, useReservations, useOwnerStats
  layouts/     PublicLayout / AdminLayout / OwnerLayout
  pages/       public / client / admin / owner
  store/       authStore (Zustand persisté), uiStore
  utils/       formatCurrency (XOF), formatDate (fr), getStatusColor, cn
  App.jsx      routing complet
```
