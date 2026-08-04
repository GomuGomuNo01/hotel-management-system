# La baie des lacs — Système de gestion hôtelière

Application full-stack de gestion hôtelière (PMS) — monorepo composé d'une **API REST Laravel 13** et d'une **SPA React 18 + Vite**. Elle couvre l'intégralité du cycle : catalogue de chambres, réservations sans conflit, paiements mobiles (Orange Money CI / Wave CI), arrivées/départs, ménage, réclamations, remboursements, avis, journal d'audit, export RGPD, et **synchronisation temps réel** via WebSocket.

```
hotel-management-system/
├── backend/    ← API Laravel 13 (PHP 8.3+) — MySQL (MyISAM), Sanctum, Reverb
└── frontend/   ← SPA React 18 + Vite 5 — Tailwind, Zustand, Laravel Echo
```

> Le nom d'établissement (« La baie des lacs ») est centralisé : `APP_NAME` / `APP_TAGLINE` côté backend, `frontend/src/config/brand.js` côté frontend. Aucun libellé n'est codé en dur.

---

## Sommaire

1. [Stack technique](#stack-technique)
2. [Architecture & rôles](#architecture--rôles)
3. [Prérequis](#prérequis)
4. [Installation](#installation)
5. [Variables d'environnement](#variables-denvironnement)
6. [Données de test (seeder)](#données-de-test-seeder)
7. [Fonctionnalités](#fonctionnalités)
8. [Système de paiement](#système-de-paiement)
9. [Temps réel](#temps-réel)
10. [Sécurité](#sécurité)
11. [Génération de PDF](#génération-de-pdf)
12. [API — aperçu](#api--aperçu)
13. [Tests & qualité](#tests--qualité)
14. [Structure du projet](#structure-du-projet)
15. [Branches Git & CI](#branches-git--ci)
16. [Dépannage](#dépannage)

---

## Stack technique

### Backend

| Composant | Version | Usage |
|---|---|---|
| PHP | 8.3+ | Runtime |
| Laravel | 13 | Framework API |
| Laravel Sanctum | 4 | Tokens d'accès personnels (multi-modèle) |
| Laravel Reverb | 1 | Serveur WebSocket (temps réel) |
| Laravel Socialite | 5 | OAuth Google |
| barryvdh/laravel-dompdf | 3.1 | Factures, reçus et export RGPD en PDF |
| sentry/sentry-laravel | 4 | Monitoring d'erreurs (optionnel) |
| MySQL | 8+ | Base de données (moteur **MyISAM**, intégrité applicative) |

### Frontend

| Composant | Version | Usage |
|---|---|---|
| React | 18 | UI |
| Vite | 5 | Build & dev server |
| React Router | 6 | Routing SPA |
| Tailwind CSS | 3 | Styles utilitaires |
| Zustand | 4 | État global (auth, UI) |
| Axios | 1.7 | Client HTTP + intercepteurs |
| Laravel Echo + pusher-js | 2 / 8 | Abonnement WebSocket (temps réel) |
| Recharts | 2 | Graphiques (dashboards) |
| React Hook Form + Zod | 7 / 3 | Formulaires & validation |
| React Hot Toast | 2 | Notifications |
| Lucide React | 0.45 | Icônes |
| date-fns | 3 | Manipulation de dates |

---

## Architecture & rôles

Quatre niveaux d'accès, chacun avec son espace :

```
Visiteur (non connecté)
  └── Catalogue de chambres, détail, avis publics (sans auth)

Client  →  /mon-espace/*
  └── Inscription e-mail (vérification requise) ou Google OAuth
  └── Réservation, paiement (100 % ou acompte 50 % + solde)
  └── Réservations, factures/reçus PDF, réclamations, remboursements, avis
  └── Profil, pièces d'identité, export RGPD / suppression de compte

Admin  →  /admin/*  (permissions granulaires)
  └── Dashboard par rôle (manager / réceptionniste / comptable)
  └── Chambres, réservations, planning d'occupation
  └── Arrivées / départs, ménage & recouches, paiements espèces
  └── Réclamations, remboursements, avis, journal d'audit

Propriétaire  →  /owner/*  (accès complet)
  └── Dashboard stratégique (revenus, occupation)
  └── Gestion des comptes admin et de leurs permissions
  └── Journal d'audit complet et filtrable
```

**Authentification :** Sanctum personal access tokens (bearer, pas de cookie de session). Chaque type d'utilisateur (`Client`, `Admin`, `Owner`) a sa table et son guard. Le rôle est détecté automatiquement à la connexion.

---

## Prérequis

| Outil | Version minimale |
|---|---|
| PHP | 8.3 |
| Composer | 2.x |
| Node.js | 18 |
| npm | 9 |
| MySQL | 8.0 (ou MariaDB 10.6+) |

---

## Installation

### 1. Cloner & base de données

```bash
git clone https://github.com/GomuGomuNo01/hotel-management-system.git
cd hotel-management-system
```

```sql
CREATE DATABASE hotel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# configurer .env (DB, mail, PAYMENT_SIMULATION=true, REVERB_*)
php artisan migrate --seed        # migrations + comptes de démo
php artisan serve                 # http://localhost:8000
```

### 3. Processus annexes (temps réel + e-mails)

```bash
php artisan reverb:start          # WebSocket, port 8080
php artisan queue:work            # e-mails asynchrones + jobs
```

> Le scheduler (`php artisan schedule:run` via cron) pilote l'auto-annulation des réservations impayées et la planification quotidienne des recouches.

### 4. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                       # http://localhost:5173
```

---

## Variables d'environnement

### `backend/.env` (extrait)

```dotenv
APP_NAME="La baie des lacs"
APP_TAGLINE="L'hospitalité ivoirienne, sublimée."
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

# SPA autorisée (CORS) — origines séparées par des virgules
FRONTEND_URLS=http://localhost:5173,http://127.0.0.1:5173
FRONTEND_URL=http://localhost:5173

# Base de données (MyISAM — pas de clés étrangères physiques)
DB_CONNECTION=mysql
DB_DATABASE=hotel_management
DB_USERNAME=root
DB_PASSWORD=

# Queue & cache
QUEUE_CONNECTION=database
CACHE_STORE=database

# Mail (Mailtrap recommandé en local)
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525

# Temps réel (Laravel Reverb)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME=http

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/api/auth/google/callback"

# Paiement — mode simulation. DOIT rester false en production ;
# à mettre true en dev tant que les API agrégateurs ne sont pas branchées.
PAYMENT_SIMULATION=false
PAYMENT_EXPIRY_MINUTES=30

# Agrégateurs (renseigner en production)
ORANGE_CI_MERCHANT_KEY=
ORANGE_CI_WEBHOOK_SECRET=
WAVE_CI_API_KEY=
WAVE_CI_WEBHOOK_SECRET=

# Monitoring (optionnel)
SENTRY_LARAVEL_DSN=
```

### `frontend/.env`

```dotenv
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=La baie des lacs
VITE_GOOGLE_REDIRECT_URL=http://localhost:8000/api/auth/google/redirect
# Reverb — doivent correspondre au backend
VITE_REVERB_APP_KEY=
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
```

---

## Données de test (seeder)

`php artisan migrate --seed` (seeder par défaut) crée trois comptes et six chambres :

| Rôle | E-mail | Mot de passe | Accès |
|---|---|---|---|
| Propriétaire | `patron@hotel.local` | `password` | `/owner/*` |
| Admin (toutes permissions) | `admin@hotel.local` | `password` | `/admin/*` |
| Client | `client@hotel.local` | `password` | `/mon-espace/*` |

> **Jeu de démo enrichi** (optionnel) : `php artisan db:seed --class=DemoSeeder` crée un propriétaire, trois admins aux rôles distincts (Manager / Réceptionniste / Comptable), 20 clients et une trentaine de réservations couvrant tout le cycle de vie (impayée, confirmée, acompte, en séjour, terminée + avis, annulée + remboursement) — sans jamais générer de conflit d'occupation.

### Permissions admin (11)

`manage_rooms`, `manage_reservations`, `manage_clients`, `manage_checkin_checkout`,
`manage_payments`, `manage_complaints`, `view_reports`, `view_audit_summary`,
`checkin_with_deposit`, `view_reviews`, `manage_housekeeping`.

---

## Fonctionnalités

### Public & client
- **Catalogue** paginé et filtrable (type, prix, capacité) ; chambres en maintenance masquées ; avis publics.
- **Auth** : inscription + vérification e-mail (URL signée), OAuth Google, connexion multi-rôle.
- **Réservation** en 2 étapes (dates/chambre → paiement) ; **conflit d'occupation impossible** (verrou + contrôle de chevauchement en transaction).
- **Paiement** intégral ou acompte 50 % + solde ; factures/reçus PDF.
- **Réclamations** (service client), suivi des **remboursements**, dépôt d'**avis** après séjour.
- **Profil**, pièces d'identité (stockage privé), **export RGPD en PDF** + suppression/anonymisation du compte.
- **Notifications & badges** temps réel (nouvelles factures, remboursements, réponses…).

### Back-office (admin)
- **Réservations** : liste filtrable, planning d'occupation, annulation.
- **Arrivées / départs** avec règles métier : check-in verrouillé avant la date d'arrivée et si la chambre n'est pas propre ; solde d'acompte à régler à partir de l'arrivée ; départ anticipé autorisé.
- **Ménage** : états (propre / à nettoyer / en cours / hors service) synchronisés avec le statut commercial (maintenance ⇄ hors service), + **recouches** (ménage en cours de séjour) planifiées quotidiennement.
- **Chambres** (CRUD + images), **clients**, **paiements espèces**, **réclamations**, **remboursements**, **avis**.
- **Journal d'audit** : toute action sensible tracée (acteur, entité, avant/après, IP) — libellés 100 % français.

### Propriétaire
- Dashboard stratégique (revenus par fournisseur, taux d'occupation, top chambres), gestion des admins et de leurs permissions, audit global.

---

## Système de paiement

| Plan (`payment_plan`) | Premier versement | Solde |
|---|---|---|
| `full` | 100 % à la réservation | — |
| `partial` | 50 % d'acompte | 50 % en ligne ou en espèces (à partir de la date d'arrivée) |

**Fournisseurs** : `orange_ci` (Orange Money CI), `wave_ci` (Wave CI), `cash` (espèces, admin). Le **montant est calculé côté serveur** (jamais fourni par le client) : `full` → 100 %, `partial` → 50 %, puis `balance` → solde restant.

**Cycle de vie :**
```
initiate() → pending (expiration 30 min)
   ├── webhook « success »  → success → réservation confirmée
   ├── webhook « failed »   → failed
   ├── DELETE /payments/{id} → cancelled (manuel)
   └── expiré               → cancelled (auto)
```

**Mode simulation (dev).** Piloté par `PAYMENT_SIMULATION` (**défaut `false`**). Quand il est actif (dev, sans clés agrégateur), l'endpoint `POST /payments/{id}/simulate` confirme un paiement sans réseau. Cette route **n'est enregistrée qu'en `local`/`testing`** et refusée en production. En production, la confirmation passe **exclusivement** par le webhook signé de l'agrégateur.

---

## Temps réel

Le backend diffuse des événements sur le canal public `hotel-events` via **Laravel Reverb** (WebSocket). Le frontend (Laravel Echo) s'y abonne et rafraîchit les vues **sans rechargement** : réservations, paiements, arrivées/départs, ménage, réclamations, remboursements, avis, mises en maintenance des chambres (disparition immédiate du catalogue client). En cas d'indisponibilité de Reverb, l'application reste utilisable (dégradation gracieuse).

---

## Sécurité

- **Auth** : tokens Sanctum (bearer, pas de cookie → pas de surface CSRF sur l'API) ; e-mail vérifié requis ; mots de passe forts (8+, casse mixte, chiffres, symboles).
- **Anti-brute-force** : verrouillage par compte (5 échecs / 60 s par e-mail + IP) en plus du throttle d'IP.
- **Anti-énumération** : login à temps constant (hachage factice si compte absent), messages neutres (`forgot`, `resend`).
- **OAuth** : le token ne transite **jamais dans l'URL** — le callback émet un code à usage unique (60 s) échangé en POST ; nonce `state` anti-forge.
- **Paiement** : montant/plan calculés serveur ; simulation désactivée par défaut et route gardée hors prod ; webhooks **HMAC-SHA256** + vérification montant/devise + garde anti-rejeu (expiration) + idempotence.
- **Documents** : pièces d'identité sur disque **privé**, servies en **téléchargement** (jamais exécutées), accès contrôlé par appartenance (anti-IDOR / anti-traversal).
- **En-têtes** : `Content-Security-Policy` (`default-src 'none'`), `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **RGPD** : export des données personnelles en PDF + droit à l'oubli (anonymisation, conservation comptable).

---

## Génération de PDF

Via `barryvdh/laravel-dompdf`, à la charte de l'établissement :

| Document | Route | Condition |
|---|---|---|
| Facture de paiement | `GET /payments/{id}/invoice` | paiement `success` du client |
| Facture de séjour | `GET /reservations/{id}/invoice` | après check-out |
| Reçu de réservation | `GET /reservations/{id}/receipt` (+ vue admin) | ≥ 1 paiement réussi |
| Reçu de remboursement | `GET /refunds/{id}/receipt` | — |
| Export RGPD | `GET /profile/data-export` | client authentifié |

---

## API — aperçu

**Base URL :** `http://localhost:8000/api`. Enveloppe JSON : `{ success, message, data, meta? }`.

| Domaine | Exemples de routes |
|---|---|
| **Public** | `GET /rooms`, `GET /rooms/{id}`, `GET /rooms/{id}/reviews`, `GET /rooms/{id}/unavailable-dates`, `GET /reviews/public` |
| **Auth** | `POST /auth/register`, `POST /auth/login`, `GET /auth/google/redirect` · `callback`, `POST /auth/google/exchange`, `POST /auth/email/resend`, `POST /auth/password/forgot` · `reset` |
| **Client** | `apiResource /reservations`, `POST /payments/initiate`, `GET /payments/{id}/status`, réclamations, `GET /refunds`, avis, `GET /profile/data-export`, notifications, `GET /badges` |
| **Admin** | `/admin/reservations`, `/admin/rooms`, `POST /admin/checkin\|checkout/{id}`, `/admin/housekeeping` (+ `tasks/{id}/start\|complete\|defer`), `/admin/planning`, `/admin/refunds`, `/admin/complaints`, `/admin/reviews`, `/admin/audit-summary` |
| **Owner** | `apiResource /owner/admins`, `/owner/dashboard/{stats\|revenue\|occupancy}`, `/owner/audit-logs` |
| **Webhooks** | `POST /webhooks/orange` · `/webhooks/wave` (HMAC-SHA256) |

Les routes admin sont protégées par `role:admin` **et** une permission (`permission:manage_*`). Les routes client/owner par leur guard respectif.

---

## Tests & qualité

```bash
# Backend — 158 tests (PHPUnit, SQLite en mémoire)
cd backend && php artisan test

# Frontend — 43 tests unitaires (Vitest) + lint + build
cd frontend
npm run lint
npx vitest run
npx vite build
npm run test:e2e        # Playwright (smoke, démarre Vite automatiquement)
```

- **CI** : `.github/workflows/ci.yml` lance les tests backend et le build frontend à chaque push.
- **Style PHP** : style maison aligné volontaire — **ne pas** lancer `pint --fix` en masse (`pint --test` sert uniquement à repérer les imports morts).

---

## Structure du projet

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/{Auth,Public,Client,Admin,Owner}/
│   │   ├── Middleware/  (CheckRole, CheckPermission, VerifyWebhookSignature, SecurityHeaders)
│   │   ├── Requests/    (Form Requests — validation)
│   │   └── Resources/   (ReservationResource, RoomResource…)
│   ├── Models/          (Owner, Admin, AdminPermission, Client, Room, RoomImage,
│   │                     Reservation, Payment, Refund, Complaint, Review,
│   │                     HousekeepingTask, AuditLog)
│   ├── Observers/       (RoomObserver — synchro statut ⇄ ménage + broadcast)
│   ├── Services/        (AuthService, ReservationService, AuditService,
│   │                     PaymentService/ + InteractsWithPaymentWebhook)
│   ├── Events/          (HotelBroadcast — canal temps réel)
│   └── Console/Commands/ (reservations:cancel-unpaid, housekeeping:plan-stayovers)
├── config/             (housekeeping.php, reservations.php, services.php…)
├── database/           (39 migrations, factories, seeders)
└── resources/views/    (emails, invoices, receipts, exports/client-data)

frontend/src/
├── api/                (axios + clients par domaine)
├── store/              (authStore, uiStore, pdfViewerStore — Zustand)
├── hooks/              (useAuth, useRooms, useReservations, useAutoRefresh, badges…)
├── components/         (common, payments, reservations, rooms, admin, owner, complaints)
├── pages/              ({public, client, admin, owner})
├── guards/ · layouts/ · lib/ (echo, monitoring) · utils/ · config/brand.js
```

---

## Branches Git & CI

| Branche | Rôle |
|---|---|
| `Test` | Ligne de travail courante |
| `Dev` | Branche de développement |
| `main` | Branche principale |

Les trois branches sont maintenues au même niveau. La CI GitHub Actions valide backend + frontend sur `main`, `Dev` et `Test`.

---

## Dépannage

**Laravel utilise SQLite au lieu de MySQL** — une variable d'environnement OS a la priorité sur `.env`. La retirer, puis `php artisan config:clear`.

**Erreurs CORS** — vérifier que `FRONTEND_URLS` correspond exactement à l'URL de la SPA, puis `php artisan config:clear`.

**E-mails non envoyés** — `php artisan queue:work` doit tourner ; vérifier les variables `MAIL_*`.

**Pas de mise à jour temps réel** — vérifier que `php artisan reverb:start` tourne et que les variables `VITE_REVERB_*` (frontend) correspondent aux `REVERB_*` (backend).

**Le paiement simulé renvoie 403** — `PAYMENT_SIMULATION=true` doit être présent dans `backend/.env` (dev uniquement), puis `php artisan config:clear`.

**Réinitialiser la base** — `php artisan migrate:fresh --seed`.
