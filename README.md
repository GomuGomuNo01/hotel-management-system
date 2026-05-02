# 🏨 Hotel Management System

Système complet de gestion hôtelière — monorepo combinant une **API REST Laravel 13** et une **SPA React 18**. Il couvre la gestion des chambres, des réservations, des paiements mobiles (Orange Money / Wave), des check-ins/check-outs et du pilotage stratégique via un tableau de bord propriétaire.

```
hotel-management-system/
├── backend/    ← API Laravel 13 (PHP 8.3+)
└── frontend/   ← SPA React 18 + Vite
```

---

## Table des matières

1. [Stack technique](#stack-technique)
2. [Architecture & rôles](#architecture--rôles)
3. [Fonctionnalités](#fonctionnalités)
4. [Prérequis](#prérequis)
5. [Installation](#installation)
6. [Variables d'environnement](#variables-denvironnement)
7. [Comptes de test](#comptes-de-test)
8. [Structure du projet](#structure-du-projet)
9. [API — vue d'ensemble](#api--vue-densemble)
10. [Paiements & mode simulation](#paiements--mode-simulation)
11. [Branches Git](#branches-git)
12. [Dépannage](#dépannage)

---

## Stack technique

### Backend
| Composant | Version | Rôle |
|-----------|---------|------|
| PHP | 8.3+ | Runtime |
| Laravel | 13 | Framework API |
| Laravel Sanctum | 4 | Authentification par token (multi-modèle) |
| Laravel Socialite | 5 | OAuth Google |
| barryvdh/laravel-dompdf | 3.1 | Génération de PDF (factures, reçus) |
| MySQL | 8+ | Base de données relationnelle |

### Frontend
| Composant | Version | Rôle |
|-----------|---------|------|
| React | 18 | UI |
| Vite | 5 | Build tool & dev server |
| React Router | 6 | Routing SPA |
| Tailwind CSS | 3 | Styles utilitaires |
| Zustand | 4 | Gestion d'état global (auth) |
| Axios | 1.7 | Client HTTP |
| Recharts | 2 | Graphiques (dashboard propriétaire) |
| React Hook Form + Zod | 7 / 3 | Formulaires & validation |
| React Hot Toast | 2 | Notifications |
| Lucide React | 0.45 | Icônes |

---

## Architecture & rôles

Le système distingue **trois rôles** avec des espaces d'interface dédiés :

```
Visiteur (non connecté)
  └─ Peut consulter le catalogue de chambres (public)

Client (/mon-espace/*)
  └─ S'inscrit (email ou Google OAuth)
  └─ Réserve des chambres
  └─ Paie en ligne (Orange Money / Wave) en 1x ou 2x
  └─ Consulte ses réservations, télécharge ses reçus/factures
  └─ Gère son profil

Admin (/admin/*)
  └─ Back-office CRUD (chambres, réservations)
  └─ Effectue check-in / check-out
  └─ Enregistre des paiements en espèces
  └─ Consulte les clients
  └─ Permissions granulaires configurées par le propriétaire

Propriétaire /owner/*)
  └─ Tableau de bord stratégique (KPI, revenus, taux d'occupation)
  └─ Gère les comptes admin et leurs permissions
  └─ Accès au journal d'audit complet
```

L'authentification repose sur **Sanctum personal access tokens**. Chaque modèle (`Client`, `Admin`, `Owner`) possède sa propre table et son propre guard. Le token retourné à la connexion encode le rôle, ce qui permet aux guards frontend de rediriger vers le bon espace.

---

## Fonctionnalités

### Catalogue & chambres
- Liste paginée des chambres disponibles (public, sans connexion)
- Détail avec galerie d'images, équipements, tarif par nuit
- Gestion complète en back-office (CRUD, images multiples, image principale)
- Statuts : `available` · `occupied` · `maintenance`

### Réservations
- Formulaire en **2 étapes** : dates & chambre → plan de paiement & moyen
- Vérification de disponibilité en temps réel (détection de conflits de dates)
- Modification des dates (réservations en statut `pending`)
- Annulation client ou admin
- Cycle de vie complet : `pending` → `confirmed` → `checked_in` → `checked_out` / `cancelled`

### Paiements
- **Deux plans au choix** lors de la réservation :
  - **Intégral** — 100 % à la réservation
  - **En 2 fois** — 50 % d'acompte à la réservation, 50 % de solde payable en ligne ou en espèces à l'arrivée
- **Fournisseurs mobiles** : Orange Money CI (`orange_ci`) et Wave CI (`wave_ci`)
- **Paiement en espèces** : enregistrement par l'admin au moment du check-in
- Expiration automatique des paiements en attente (30 min)
- Reprise automatique d'un paiement abandonné via `sessionStorage`
- **Mode simulation** (environnement sans clés API) : boutons "Simuler succès" / "Simuler échec" directement dans l'interface
- Webhook HMAC-vérifié pour Orange et Wave

### Documents PDF
- **Facture** par paiement (`GET /payments/{id}/invoice`) — un PDF par transaction
- **Reçu de réservation** (`GET /reservations/{id}/receipt`) — récapitulatif consolidé avec l'historique de tous les paiements

### Authentification & profil
- Inscription email + vérification par lien
- Connexion email/mot de passe
- **OAuth Google** (Socialite) — connexion en un clic
- Modification du profil, changement de mot de passe
- Upload/suppression de photo de profil

### Back-office admin
- Dashboard avec statistiques (taux d'occupation, revenus du jour/mois, réservations en attente)
- Gestion des réservations avec filtres (statut, période, client, chambre)
- Check-in / Check-out sécurisés
- Consultation du profil client détaillé
- **Journal d'audit** : toutes les actions sensibles sont tracées (créateur, cible, ancienne/nouvelle valeur)
- Permissions granulaires : `manage_rooms` · `manage_reservations` · `manage_clients` · `manage_checkin_checkout`

### Tableau de bord propriétaire
- KPI en temps réel : taux d'occupation, revenus, réservations actives, clients enregistrés
- Graphique des revenus (Recharts) avec sélection de période
- Graphique du taux d'occupation mensuel
- Gestion des admins (créer, activer/désactiver, configurer les permissions)
- Journal d'audit filtrable par admin

---

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| PHP | 8.3 |
| Composer | 2.x |
| Node.js | 18 |
| npm | 9 |
| MySQL | 8.0 (ou MariaDB 10.6+) |

> **Redis** — optionnel. Si non disponible, remplacer `$middleware->throttleWithRedis()` par `$middleware->throttleApi()` dans `backend/bootstrap/app.php`.

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/GomuGomuNo01/hotel-management-system.git
cd hotel-management-system
```

### 2. Créer la base de données MySQL

```sql
CREATE DATABASE hotel_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 3. Backend (terminal 1 — port 8000)

```bash
cd backend

# Dépendances PHP
composer install

# Configuration
cp .env.example .env
php artisan key:generate
```

Éditer `backend/.env` (voir section [Variables d'environnement](#variables-denvironnement)), puis :

```bash
# Migrations + données de test
php artisan migrate --seed

# Démarrer le serveur de développement
php artisan serve
```

### 4. Worker de queue (terminal 2 — requis pour les e-mails)

```bash
cd backend
php artisan queue:work
```

### 5. Frontend (terminal 3 — port 5173)

```bash
cd frontend
cp .env.example .env   # ou créer un fichier .env avec VITE_API_URL
npm install
npm run dev
```

L'application est accessible sur **http://localhost:5173**.

---

## Variables d'environnement

### `backend/.env` — paramètres essentiels

```dotenv
# Application
APP_NAME="Hotel Management System"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

# SPA autorisée (CORS)
FRONTEND_URLS=http://localhost:5173,http://127.0.0.1:5173

# Base de données
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=hotel_management
DB_USERNAME=root
DB_PASSWORD=

# Queue (e-mails, notifications)
QUEUE_CONNECTION=database

# Mail (Mailtrap recommandé en local)
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=<votre_username>
MAIL_PASSWORD=<votre_password>
MAIL_FROM_ADDRESS=noreply@hotel.local

# OAuth Google (optionnel en local)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/api/auth/google/callback"

# Orange Money CI (laisser vide → mode simulation automatique)
ORANGE_CI_MERCHANT_KEY=
ORANGE_CI_WEBHOOK_SECRET=

# Wave CI (laisser vide → mode simulation automatique)
WAVE_CI_API_KEY=
WAVE_CI_WEBHOOK_SECRET=
```

### `frontend/.env`

```dotenv
VITE_API_URL=http://localhost:8000/api
```

> **Mode simulation** : si `ORANGE_CI_MERCHANT_KEY` et `WAVE_CI_API_KEY` sont vides (cas par défaut en développement), le backend bascule automatiquement en mode simulation. Un panneau ⚗️ apparaît sur la page de paiement pour simuler succès/échec sans appel API réel.

---

## Comptes de test

Créés automatiquement par le seeder (`php artisan migrate --seed`) :

| Rôle | E-mail | Mot de passe | Accès |
|------|--------|-------------|-------|
| Propriétaire | `patron@hotel.local` | `password` | `/owner/*` |
| Admin | `admin@hotel.local` | `password` | `/admin/*` |
| Client | `client@hotel.local` | `password` | `/mon-espace/*` |

> L'admin de test possède toutes les permissions activées.

---

## Structure du projet

### Backend

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/          ← Inscription, login, Google OAuth, vérif. e-mail
│   │   │   ├── Client/        ← Profil, réservations, paiements, reçus
│   │   │   ├── Admin/         ← Chambres, réservations, clients, check-in/out, espèces
│   │   │   ├── Owner/         ← Admins, dashboard KPI, logs d'audit
│   │   │   └── Public/        ← Catalogue chambres (sans auth)
│   │   ├── Requests/          ← Form requests (validation + autorisation)
│   │   ├── Resources/         ← API resources (ReservationResource, RoomResource…)
│   │   └── Middleware/        ← role, permission, webhook HMAC
│   ├── Models/
│   │   ├── Client.php
│   │   ├── Admin.php
│   │   ├── Owner.php
│   │   ├── Room.php
│   │   ├── RoomImage.php
│   │   ├── Reservation.php    ← paidAmount(), remainingAmount(), hasReceipt()
│   │   ├── Payment.php        ← isExpired(), paymentTypeLabel()
│   │   └── AuditLog.php
│   └── Services/
│       ├── AuthService.php
│       ├── ReservationService.php
│       ├── AuditService.php
│       └── PaymentService/
│           ├── OrangeCIService.php
│           └── WaveCIService.php
├── database/
│   ├── migrations/            ← 17 migrations chronologiques
│   └── seeders/               ← Owner, Admin, Clients, Rooms, données de démo
└── resources/views/
    ├── invoices/payment.blade.php    ← Facture PDF par paiement
    └── receipts/reservation.blade.php  ← Reçu PDF consolidé
```

### Frontend

```
frontend/src/
├── api/
│   ├── axios.js               ← Instance Axios + intercepteurs (auth, erreurs)
│   ├── reservations.api.js
│   ├── payments.api.js
│   └── rooms.api.js
├── components/
│   ├── common/                ← DataTable, StatusBadge, ConfirmModal, LoadingSpinner…
│   ├── payments/              ← PaymentPlanSelector, PaymentMethodSelector, PaymentStatusBanner
│   ├── reservations/          ← ReservationCard
│   └── rooms/                 ← RoomGallery
├── hooks/
│   ├── useAuth.js             ← Lecture du store Zustand
│   └── useReservations.js     ← Fetch + pagination
├── pages/
│   ├── public/                ← HomePage, RoomsPage, RoomDetailPage, Login, Register…
│   ├── client/                ← DashboardPage, ReservationsPage, NewReservationPage, PaymentPage…
│   ├── admin/                 ← ReservationsPage, RoomsPage, CheckInOutPage, ClientsPage…
│   └── owner/                 ← OwnerDashboardPage, AdminsPage, AuditLogsPage
├── store/
│   └── authStore.js           ← Zustand : token, user, role, helpers login/logout
└── utils/
    ├── formatCurrency.js      ← formatXOF() → "10 000 F CFA"
    └── formatDate.js          ← formatDate(), nightsBetween()
```

---

## API — vue d'ensemble

Base URL : `http://localhost:8000/api`

### Authentification

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/auth/register` | Inscription client |
| POST | `/auth/login` | Connexion (tous rôles) |
| GET | `/auth/google/redirect` | Démarrer OAuth Google |
| GET | `/auth/google/callback` | Callback OAuth Google |
| GET | `/auth/me` | Utilisateur connecté |
| POST | `/auth/logout` | Déconnexion |

### Chambres (public)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/rooms` | Liste paginée (`?status=available&per_page=12`) |
| GET | `/rooms/{id}` | Détail d'une chambre |

### Client — Réservations

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/reservations` | Mes réservations (paginées) |
| POST | `/reservations` | Créer une réservation |
| GET | `/reservations/{id}` | Détail |
| PUT | `/reservations/{id}` | Modifier dates/notes (statut `pending` uniquement) |
| DELETE | `/reservations/{id}` | Annuler |
| GET | `/reservations/{id}/receipt` | Télécharger le reçu PDF |

### Client — Paiements

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/payments/initiate` | Initier un paiement (montant calculé automatiquement) |
| GET | `/payments/{id}/status` | Statut d'un paiement |
| DELETE | `/payments/{id}` | Annuler un paiement en attente |
| POST | `/payments/{id}/simulate` | Simuler succès/échec (dev uniquement) |
| GET | `/payments/{id}/invoice` | Télécharger la facture PDF |

### Admin

| Méthode | Route | Description |
|---------|-------|-------------|
| GET/POST/PUT/DELETE | `/admin/rooms{/id}` | CRUD chambres |
| GET | `/admin/reservations` | Liste avec filtres |
| GET/PUT/DELETE | `/admin/reservations/{id}` | Détail / modifier statut / annuler |
| POST | `/admin/reservations/{id}/cash-payment` | Enregistrer paiement en espèces |
| GET | `/admin/reservations/{id}/receipt` | Reçu PDF (vue admin) |
| POST | `/admin/checkin/{id}` | Effectuer check-in |
| POST | `/admin/checkout/{id}` | Effectuer check-out |
| GET | `/admin/clients{/id}` | Liste et détail clients |
| GET | `/admin/dashboard/stats` | Statistiques du back-office |

### Propriétaire

| Méthode | Route | Description |
|---------|-------|-------------|
| GET/POST/PUT/DELETE | `/owner/admins{/id}` | Gestion des comptes admin |
| PATCH | `/owner/admins/{id}/status` | Activer / désactiver un admin |
| GET | `/owner/dashboard/stats` | KPI globaux |
| GET | `/owner/dashboard/revenue` | Revenus par période |
| GET | `/owner/dashboard/occupancy` | Taux d'occupation mensuel |
| GET | `/owner/audit-logs` | Journal d'audit complet |
| GET | `/owner/audit-logs/{adminId}` | Audit filtré par admin |

---

## Paiements & mode simulation

### Plan de paiement

À la création d'une réservation, le client choisit :

| Plan | Acompte | Solde |
|------|---------|-------|
| `full` | 100 % immédiatement | — |
| `partial` | 50 % immédiatement | 50 % en ligne (bouton "Payer le solde") ou en espèces à l'hôtel |

Le backend calcule automatiquement le montant à débiter selon les paiements déjà confirmés — le client n'a jamais à saisir un montant.

### Types de paiement enregistrés

| `payment_type` | Signification |
|----------------|---------------|
| `full` | Paiement intégral |
| `deposit` | Acompte 50 % |
| `balance` | Solde de la 2e tranche |

### Fournisseurs

| `provider` | Déclencheur |
|-----------|-------------|
| `orange_ci` | Orange Money Côte d'Ivoire |
| `wave_ci` | Wave Côte d'Ivoire |
| `cash` | Espèces enregistrées par l'admin |

### Mode simulation

Quand `ORANGE_CI_MERCHANT_KEY` et `WAVE_CI_API_KEY` sont vides (ou si `services.payment.simulation = true`), les services de paiement ne font aucun appel réseau. Un panneau **⚗️ Mode simulation** apparaît sur la page de paiement et propose :
- **Simuler succès** → le paiement passe à `success`, la réservation est confirmée
- **Simuler échec** → le paiement passe à `failed`, le client peut réessayer

### Récupération d'un paiement abandonné

Dès qu'un paiement est initié, son identifiant et sa date d'expiration sont sauvegardés dans `sessionStorage`. Si le client ferme l'onglet et revient sur `/mon-espace/paiement/{id}`, le paiement est automatiquement retrouvé et la page reprend là où elle s'était arrêtée.

---

## Branches Git

| Branche | Rôle |
|---------|------|
| `Dev` | Branche de référence — tout développement atterrit ici en premier |
| `main` | Maintenue en synchronisation avec `Dev` |
| `Test` | Branche de test, mergée régulièrement depuis `Dev` |

---

## Dépannage

### Laravel utilise SQLite au lieu de MySQL

Laravel lit les variables d'environnement OS **avant** le fichier `.env`. Si `DB_CONNECTION=sqlite` est défini au niveau système, il prend le dessus.

Diagnostiquer (PowerShell) :
```powershell
echo $env:DB_CONNECTION
[System.Environment]::GetEnvironmentVariable('DB_CONNECTION','User')
[System.Environment]::GetEnvironmentVariable('DB_CONNECTION','Machine')
```

Supprimer la variable si elle existe :
```powershell
Remove-Item Env:DB_CONNECTION -ErrorAction SilentlyContinue
[System.Environment]::SetEnvironmentVariable('DB_CONNECTION', $null, 'User')
# En admin si défini au niveau Machine :
[System.Environment]::SetEnvironmentVariable('DB_CONNECTION', $null, 'Machine')
```

Puis vérifier :
```bash
php artisan config:clear
php artisan tinker --execute="echo config('database.default').PHP_EOL;"
# Doit afficher : mysql
```

### Erreurs CORS dans la console navigateur

Vérifier que `FRONTEND_URLS` dans `backend/.env` correspond exactement à l'URL de la SPA (ex. `http://localhost:5173`), puis :
```bash
php artisan config:clear
```

### Les e-mails ne partent pas

S'assurer que `php artisan queue:work` tourne et que les variables `MAIL_*` sont configurées (Mailtrap recommandé).

### `Class "Redis" not found` au démarrage

Dans `backend/bootstrap/app.php`, remplacer :
```php
$middleware->throttleWithRedis()
```
par :
```php
$middleware->throttleApi()
```

### Réinitialiser la base de données

```bash
cd backend
php artisan migrate:fresh --seed
```

### `npm install` échoue avec des conflits de dépendances

```bash
npm install --legacy-peer-deps
```

### "APPLICATION IN PRODUCTION" à chaque commande Artisan

Vérifier que `APP_ENV=local` et `APP_DEBUG=true` sont bien définis dans `backend/.env`, puis :
```bash
php artisan config:clear
```
