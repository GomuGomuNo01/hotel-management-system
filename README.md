# Hotel Management System

Système de gestion hôtelière full-stack — monorepo composé d'une **API REST Laravel 13** et d'une **SPA React 18 + Vite**. Le système couvre l'intégralité du cycle hôtelier : catalogue de chambres, réservations, paiements mobiles (Orange Money CI / Wave CI), check-in/check-out, génération de PDF et pilotage stratégique.

```
hotel-management-system/
├── backend/    ← API Laravel 13 (PHP 8.4+)
└── frontend/   ← SPA React 18 + Vite 5
```

---

## Sommaire

1. [Stack technique](#stack-technique)
2. [Architecture & rôles](#architecture--rôles)
3. [Prérequis](#prérequis)
4. [Installation](#installation)
5. [Variables d'environnement](#variables-denvironnement)
6. [Données de test (seeder)](#données-de-test-seeder)
7. [Fonctionnalités détaillées](#fonctionnalités-détaillées)
8. [API — référence complète](#api--référence-complète)
9. [Système de paiement](#système-de-paiement)
10. [Génération de PDF](#génération-de-pdf)
11. [Structure du projet](#structure-du-projet)
12. [Branches Git](#branches-git)
13. [Dépannage](#dépannage)

---

## Stack technique

### Backend

| Composant | Version | Usage |
|---|---|---|
| PHP | 8.4+ | Runtime |
| Laravel | 13 | Framework API |
| Laravel Sanctum | 4 | Tokens d'accès personnels (multi-modèle) |
| Laravel Socialite | 5 | OAuth Google |
| barryvdh/laravel-dompdf | 3.1 | Génération de factures et reçus PDF |
| MySQL | 8+ | Base de données |

### Frontend

| Composant | Version | Usage |
|---|---|---|
| React | 18 | UI |
| Vite | 5 | Build & dev server |
| React Router | 6 | Routing SPA |
| Tailwind CSS | 3 | Styles utilitaires |
| Zustand | 4 | État global (auth, UI) |
| Axios | 1.7 | Client HTTP + intercepteurs |
| Recharts | 2 | Graphiques (dashboard propriétaire) |
| React Hook Form + Zod | 7 / 3 | Formulaires & validation |
| React Hot Toast | 2 | Notifications |
| Lucide React | 0.45 | Icônes |
| date-fns | 3 | Manipulation de dates |

---

## Architecture & rôles

Quatre niveaux d'accès distincts, chacun avec son espace d'interface :

```
Visiteur (non connecté)
  └── Consulte le catalogue de chambres (public)

Client  →  /mon-espace/*
  └── Inscription email + vérification ou Google OAuth
  └── Réservation de chambres (formulaire en 2 étapes)
  └── Paiement en ligne : 100 % ou 50 % d'acompte + solde
  └── Suivi des réservations, téléchargement reçus/factures
  └── Gestion du profil et de la photo

Admin  →  /admin/*
  └── Dashboard avec KPIs opérationnels
  └── CRUD complet des chambres (avec images multiples)
  └── Gestion des réservations + check-in / check-out
  └── Enregistrement de paiements en espèces
  └── Consultation des fiches clients
  └── Permissions granulaires assignées par le propriétaire

Propriétaire  →  /owner/*
  └── Dashboard stratégique (KPIs, revenus, taux d'occupation)
  └── Gestion des comptes admin et de leurs permissions
  └── Journal d'audit complet et filtrable
```

**Authentification :** Sanctum personal access tokens. Chaque type d'utilisateur (`Client`, `Admin`, `Owner`) a sa propre table et son propre guard. Le rôle est retourné à la connexion et persisté dans le store Zustand (localStorage).

---

## Prérequis

| Outil | Version minimale |
|---|---|
| PHP | 8.4 |
| Composer | 2.x |
| Node.js | 18 |
| npm | 9 |
| MySQL | 8.0 (ou MariaDB 10.6+) |

> **Redis** — optionnel. Si non disponible, remplacer `throttleWithRedis()` par `throttleApi()` dans `backend/bootstrap/app.php`.

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

### 3. Backend — terminal 1 (port 8000)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Configurer `backend/.env` (voir la section [Variables d'environnement](#variables-denvironnement)), puis :

```bash
php artisan migrate --seed   # migrations + données de démo
php artisan serve            # http://localhost:8000
```

### 4. Worker de queue — terminal 2 (requis pour les e-mails)

```bash
cd backend
php artisan queue:work
```

### 5. Frontend — terminal 3 (port 5173)

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

La variable `VITE_API_URL` dans `frontend/.env` pointe par défaut vers `http://localhost:8000/api`.

---

## Variables d'environnement

### `backend/.env`

```dotenv
# Application
APP_NAME="Hotel Management System"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000
APP_TIMEZONE=UTC

# SPA autorisée (CORS) — liste d'origines séparées par des virgules
FRONTEND_URLS=http://localhost:5173,http://127.0.0.1:5173

# Clé Laravel (générée par php artisan key:generate)
APP_KEY=

BCRYPT_ROUNDS=12

# Base de données
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=hotel_management
DB_USERNAME=root
DB_PASSWORD=
DB_TIMEZONE=+00:00

# Queue & cache (base de données par défaut, pas besoin de Redis)
QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=file
FILESYSTEM_DISK=local

# Mail (Mailtrap recommandé en local)
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=<votre_username_mailtrap>
MAIL_PASSWORD=<votre_password_mailtrap>
MAIL_FROM_ADDRESS=noreply@hotel.local
MAIL_FROM_NAME="${APP_NAME}"

# Google OAuth (optionnel — laisser vide pour désactiver)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/api/auth/google/callback"

# Orange Money CI — laisser vide → bascule automatiquement en mode simulation
ORANGE_CI_API_URL=https://api.orange.com/orange-money-webpay/ci/v1
ORANGE_CI_MERCHANT_KEY=
ORANGE_CI_WEBHOOK_SECRET=

# Wave CI — laisser vide → bascule automatiquement en mode simulation
WAVE_CI_API_URL=https://api.wave.com/v1
WAVE_CI_API_KEY=
WAVE_CI_WEBHOOK_SECRET=
```

### `frontend/.env`

```dotenv
VITE_API_URL=http://localhost:8000/api
```

---

## Données de test (seeder)

`php artisan migrate --seed` crée les données suivantes :

### Comptes utilisateurs

| Rôle | E-mail | Mot de passe | Accès |
|---|---|---|---|
| Propriétaire | `patron@hotel.local` | `password` | `/owner/*` |
| Admin | `admin@hotel.local` | `password` | `/admin/*` |
| Client | `client@hotel.local` | `password` | `/mon-espace/*` |

> L'admin de test (`Admin Principal`, rôle `Réceptionniste`) possède les 7 permissions activées.

### Chambres créées

| N° | Type | Prix / nuit | Capacité | Équipements |
|---|---|---|---|---|
| 101 | Simple | 25 000 XOF | 1 pers. | WiFi, Clim, TV, Mini-bar |
| 102 | Simple | 25 000 XOF | 1 pers. | WiFi, Clim, TV, Mini-bar |
| 201 | Double | 45 000 XOF | 2 pers. | WiFi, Clim, TV, Mini-bar |
| 202 | Double | 45 000 XOF | 2 pers. | WiFi, Clim, TV, Mini-bar |
| 301 | Suite | 95 000 XOF | 2 pers. | WiFi, Clim, TV, Mini-bar |
| 401 | Familiale | 75 000 XOF | 4 pers. | WiFi, Clim, TV, Mini-bar |

Toutes les chambres sont au statut `available` au démarrage.

---

## Fonctionnalités détaillées

### Catalogue de chambres (public)

- Liste paginée sans authentification, filtrable par `room_type`, `status`, `capacity`, `price_min`, `price_max`
- Page de détail avec galerie d'images et équipements
- Bouton « Réserver » → redirige vers `/login?redirect=...` si non connecté, sinon vers le formulaire de réservation

### Inscription & authentification

- **Inscription email** : création du compte client + envoi d'un lien de vérification signé (24h)
- **Vérification e-mail** : obligatoire avant de pouvoir se connecter (lien `/api/auth/email/verify/{id}/{hash}`)
- **Renvoi du lien** : possible depuis la page de vérification
- **OAuth Google** : connexion en un clic via Socialite — le compte est créé automatiquement si inexistant, l'e-mail est marqué vérifié
- **Login multi-rôle** : un seul endpoint `/api/auth/login` détecte automatiquement le type d'utilisateur (Client → Admin → Owner)
- **Sécurité** : compte admin inactif bloqué à la connexion (code 403 + flag `inactive: true`)

### Espace client (`/mon-espace/*`)

#### Réservations

Formulaire en **2 étapes** :

1. **Dates & chambre** — sélection de la chambre, dates d'arrivée/départ, remarques (optionnel). Récapitulatif du total affiché dynamiquement.
2. **Paiement** — choix du plan (intégral ou en 2 fois), fournisseur (Orange Money / Wave), numéro de téléphone.

À la validation : la réservation est créée, puis le paiement est immédiatement initié. L'utilisateur est redirigé vers la page de paiement.

Depuis la liste des réservations :
- Bouton **Payer** / **Payer le solde** — redirige vers la page de paiement
- Bouton **Reçu** — télécharge le PDF récapitulatif (si au moins un paiement réussi)
- Modal de détail — dates, montants, statut de paiement, barre de progression, modification des dates (statut `pending` uniquement), annulation

#### Paiements

La page `/mon-espace/paiement/:id` gère l'intégralité du flux :

| Cas | Comportement |
|---|---|
| Premier paiement (plan intégral) | Formulaire → montant = 100 % du total |
| Premier paiement (plan en 2 fois) | Formulaire → montant = 50 % (acompte) |
| Solde restant à payer | Formulaire → montant = 50 % restant |
| Paiement en attente | Écran d'attente + countdown 30 min + polling toutes les 5 s |
| Mode simulation | Panneau ⚗️ avec boutons « Simuler succès » et « Simuler échec » |
| Paiement réussi | Récapitulatif + téléchargement facture + téléchargement reçu |
| Paiement échoué | Message d'erreur + bouton « Réessayer » |
| Paiement annulé / expiré | Message + bouton « Nouvelle tentative » |
| Abandon & retour | Récupération automatique depuis `sessionStorage` (valable 30 min) |

#### Profil

- Modification : prénom, nom, téléphone, date de naissance, genre, nationalité, adresse, langue, préférences
- Changement de mot de passe (vérifie l'ancien, révoque les autres tokens)
- Upload / suppression de photo de profil (redimensionnée en 400×400 JPEG, max 4 Mo)

### Espace admin (`/admin/*`)

#### Dashboard

KPIs du jour : réservations du jour, check-ins prévus, check-outs prévus, chambres disponibles / occupées / en maintenance, paiements en attente.

#### Chambres

- CRUD complet avec upload d'images multiples (JPEG/PNG/WebP, max 4 Mo)
- Définition de l'image principale par chambre
- Suppression d'image individuelle (l'image suivante est promue automatiquement)
- Blocage de la suppression si la chambre a des réservations actives
- Filtres : type, statut, recherche textuelle

#### Réservations

- Liste paginée (20/page) avec filtres : statut, période, client, chambre
- Modal de détail avec toutes les informations (client, dates, paiement, notes)
- Actions : confirmer, annuler, check-in, check-out
- **Enregistrement de paiement en espèces** : bouton disponible pour les réservations `confirmed` / `checked_in` / `checked_out` avec un solde restant. L'admin saisit la réception du montant, un paiement `cash` est créé immédiatement avec le statut `success`.
- Téléchargement du reçu PDF (vue admin)
- Édition des notes internes

#### Check-in / Check-out

Page dédiée pour les opérations rapides de passage :
- Check-in : statut `confirmed` → `checked_in`, chambre `reserved` → `occupied`
- Check-out : statut `checked_in` → `checked_out`, chambre `occupied` → `available`

#### Clients

- Liste paginée avec recherche (email, nom, prénom, téléphone)
- Fiche client : coordonnées + 10 dernières réservations

#### Profil admin

- Mêmes champs que le client + champs professionnels (poste, date d'embauche, numéro de document)
- Changement de mot de passe (révoque les autres sessions, désactive le flag `must_change_password`)
- Photo de profil (400×400 JPEG)

### Espace propriétaire (`/owner/*`)

#### Dashboard stratégique

- **KPIs globaux** : clients inscrits, admins actifs/inactifs, chambres, taux d'occupation, revenus du mois, paiements en attente/échoués
- **Graphique des revenus** sur une période configurable (7 à 180 jours) — courbe journalière avec décomposition par fournisseur (Orange Money / Wave)
- **Graphique du taux d'occupation** sur 30 jours + top 5 chambres les plus réservées
- **Aperçu rapide** : 6 réservations récentes + 8 dernières entrées du journal d'audit

#### Gestion des admins

- Créer un admin : formulaire complet (informations personnelles + 7 permissions configurables)
- À la création : mot de passe temporaire généré automatiquement (12 caractères) et envoyé par e-mail + flag `must_change_password=true`
- Modifier un admin : infos et permissions
- Activer / désactiver (révoque tous les tokens si désactivation)
- Supprimer un compte admin

**7 permissions disponibles** :

| Permission | Accès accordé |
|---|---|
| `manage_rooms` | CRUD chambres + images |
| `manage_reservations` | Gestion réservations + paiements espèces |
| `manage_clients` | Consultation des fiches clients |
| `manage_checkin_checkout` | Check-in / Check-out |
| `manage_payments` | (réservé pour usage futur) |
| `view_reports` | (réservé pour usage futur) |
| `view_audit_summary` | (réservé pour usage futur) |

#### Journal d'audit

Toutes les actions sensibles sont tracées de façon immuable :

| Action tracée |
|---|
| Création / modification / suppression de chambre |
| Modification / annulation de réservation |
| Check-in / check-out |
| Paiement en espèces enregistré |
| Modification de profil admin |

Chaque entrée enregistre : admin responsable, type d'action, entité cible, anciennes valeurs, nouvelles valeurs, adresse IP, user-agent. Filtrable par admin, type d'action, entité, période.

---

## API — référence complète

**Base URL :** `http://localhost:8000/api`

Toutes les réponses JSON suivent l'enveloppe : `{ success, message, data, meta? }`.

---

### Authentification (public, throttle 10 req/min)

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/auth/register` | Inscription client — envoie un e-mail de vérification |
| `POST` | `/auth/login` | Connexion tous rôles — retourne `{ user, token, role }` |
| `GET` | `/auth/google/redirect` | Démarre l'OAuth Google |
| `GET` | `/auth/google/callback` | Callback Google — redirige vers le frontend avec token |
| `POST` | `/auth/email/resend` | Renvoyer le lien de vérification |
| `GET` | `/auth/email/verify/{id}/{hash}` | Valider l'e-mail (URL signée) |
| `GET` | `/auth/me` | Utilisateur connecté (Sanctum requis) |
| `POST` | `/auth/logout` | Déconnexion — révoque le token courant |

---

### Chambres (public, sans authentification)

| Méthode | Route | Paramètres |
|---|---|---|
| `GET` | `/rooms` | `room_type`, `status`, `capacity`, `price_min`, `price_max`, `per_page` (défaut 12) |
| `GET` | `/rooms/{id}` | — |

---

### Client — Profil (Sanctum + role:client)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/profile` | Lire le profil |
| `PATCH` | `/profile` | Modifier les informations |
| `PATCH` | `/profile/password` | Changer le mot de passe |
| `POST` | `/profile/photo` | Uploader une photo (multipart, max 4 Mo) |
| `DELETE` | `/profile/photo` | Supprimer la photo |

---

### Client — Réservations (Sanctum + role:client)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/reservations` | Mes réservations paginées (15/page) — inclut `paid_amount`, `remaining_amount`, `is_fully_paid`, `has_receipt`, `nights`, `is_editable`, `is_cancellable` |
| `POST` | `/reservations` | Créer — body : `room_id`, `check_in_date`, `check_out_date`, `payment_plan` (`full`\|`partial`), `notes?` |
| `GET` | `/reservations/{id}` | Détail avec paiements |
| `PUT` | `/reservations/{id}` | Modifier dates/notes (uniquement si statut `pending`) |
| `DELETE` | `/reservations/{id}` | Annuler |
| `GET` | `/reservations/{id}/receipt` | Reçu PDF consolidé (nécessite ≥ 1 paiement réussi) |

---

### Client — Paiements (Sanctum + role:client)

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/payments/initiate` | Initier — body : `reservation_id`, `provider` (`orange_ci`\|`wave_ci`), `phone_number`. Montant calculé automatiquement. |
| `GET` | `/payments/{id}/status` | Statut d'un paiement (auto-expire si dépassé) |
| `DELETE` | `/payments/{id}` | Annuler un paiement en attente |
| `POST` | `/payments/{id}/simulate` | Simuler — body : `outcome` (`success`\|`failed`) |
| `GET` | `/payments/{id}/invoice` | Facture PDF d'un paiement réussi |

---

### Admin — Dashboard (Sanctum + role:admin)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/admin/dashboard/stats` | KPIs : check-ins/outs du jour, chambres disponibles, paiements en attente, 8 réservations récentes |

---

### Admin — Chambres (+ permission:manage_rooms)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/admin/rooms` | Liste filtrée (`room_type`, `status`, `search`), paginée 15/page |
| `POST` | `/admin/rooms` | Créer (multipart avec images) |
| `GET` | `/admin/rooms/{id}` | Détail |
| `PATCH` | `/admin/rooms/{id}` | Modifier |
| `DELETE` | `/admin/rooms/{id}` | Supprimer (bloqué si réservations actives) |
| `DELETE` | `/admin/rooms/{room}/images/{image}` | Supprimer une image |
| `PUT` | `/admin/rooms/{room}/images/{image}/primary` | Définir l'image principale |

---

### Admin — Réservations (+ permission:manage_reservations)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/admin/reservations` | Liste filtrée (`status`, `client_id`, `room_id`, `date_from`, `date_to`), paginée 20/page |
| `GET` | `/admin/reservations/{id}` | Détail complet avec paiements |
| `PATCH` | `/admin/reservations/{id}` | Modifier statut (`pending`\|`confirmed`\|`cancelled`) ou notes |
| `DELETE` | `/admin/reservations/{id}` | Annuler |
| `POST` | `/admin/reservations/{id}/cash-payment` | Enregistrer paiement espèces (solde restant, statut `success` immédiat) |
| `GET` | `/admin/reservations/{id}/receipt` | Reçu PDF (vue admin) |

---

### Admin — Opérations hôtelières

| Méthode | Route | Permission | Description |
|---|---|---|---|
| `POST` | `/admin/checkin/{id}` | manage_checkin_checkout | Check-in : `confirmed` → `checked_in` |
| `POST` | `/admin/checkout/{id}` | manage_checkin_checkout | Check-out : `checked_in` → `checked_out` |
| `GET` | `/admin/clients` | manage_clients | Liste clients avec recherche |
| `GET` | `/admin/clients/{id}` | manage_clients | Fiche client + 10 dernières réservations |

---

### Admin — Profil

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/admin/profile` | Lire profil (inclut permissions) |
| `PATCH` | `/admin/profile` | Modifier |
| `PATCH` | `/admin/profile/password` | Changer le mot de passe |
| `POST` | `/admin/profile/photo` | Uploader photo |
| `DELETE` | `/admin/profile/photo` | Supprimer photo |

---

### Propriétaire — Admins (Sanctum + role:owner)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/owner/admins` | Liste avec permissions et compteur d'audits |
| `POST` | `/owner/admins` | Créer (mot de passe auto-généré, e-mail envoyé) |
| `GET` | `/owner/admins/{id}` | Détail + 20 derniers audits |
| `PATCH` | `/owner/admins/{id}` | Modifier infos et permissions |
| `DELETE` | `/owner/admins/{id}` | Supprimer |
| `PATCH` | `/owner/admins/{id}/status` | Activer / désactiver |

---

### Propriétaire — Dashboard & Audit

| Méthode | Route | Paramètres |
|---|---|---|
| `GET` | `/owner/dashboard/stats` | — |
| `GET` | `/owner/dashboard/revenue` | `days` (7–180, défaut 30) |
| `GET` | `/owner/dashboard/occupancy` | `days` (défaut 30) |
| `GET` | `/owner/audit-logs` | `admin_id`, `action_type`, `entity_type`, `date_from`, `date_to` — paginé 30/page |
| `GET` | `/owner/audit-logs/{adminId}` | Audit d'un admin spécifique |

---

### Webhooks paiement (HMAC-SHA256)

| Méthode | Route | Middleware |
|---|---|---|
| `POST` | `/webhooks/orange` | `webhook:orange` |
| `POST` | `/webhooks/wave` | `webhook:wave` |

---

## Système de paiement

### Plans de paiement

| Plan | `payment_plan` | Premier versement | Solde |
|---|---|---|---|
| Intégral | `full` | 100 % à la réservation | — |
| En 2 fois | `partial` | 50 % d'acompte à la réservation | 50 % en ligne ou en espèces à l'hôtel |

### Types de paiement

| `payment_type` | Signification |
|---|---|
| `full` | Paiement unique intégral |
| `deposit` | Acompte 50 % (premier versement d'un plan `partial`) |
| `balance` | Solde restant (deuxième versement) |

### Fournisseurs

| `provider` | Description |
|---|---|
| `orange_ci` | Orange Money Côte d'Ivoire |
| `wave_ci` | Wave Côte d'Ivoire |
| `cash` | Espèces enregistrées par l'admin |

### Calcul automatique du montant

Le backend détermine seul le montant à débiter selon la logique suivante :

```
Aucun paiement réussi + plan=full    → 100 % du total  (type: full)
Aucun paiement réussi + plan=partial → 50 % du total   (type: deposit)
Paiement(s) réussi(s) existant(s)   → solde restant    (type: balance)
```

### Cycle de vie d'un paiement

```
initiate() → pending (expiration : 30 min)
                ├── webhook success / simulate('success') → success → reservation: confirmed
                ├── webhook failed  / simulate('failed')  → failed
                ├── DELETE /payments/{id}                 → cancelled (manuel)
                └── isExpired() = true                    → cancelled (auto)
```

### Mode simulation

Quand `ORANGE_CI_MERCHANT_KEY` et `WAVE_CI_API_KEY` sont vides (par défaut en développement), les services ne font aucun appel réseau. Un panneau **⚗️ Mode simulation** s'affiche sur la page de paiement avec deux boutons :

- **Simuler succès** — passe le paiement à `success`, confirme la réservation
- **Simuler échec** — passe le paiement à `failed`, le client peut réessayer

### Récupération d'un paiement abandonné

Dès qu'un paiement est initié, l'identifiant et la date d'expiration sont sauvegardés dans `sessionStorage` (clé `pay_{reservationId}`). Si le client ferme l'onglet et revient sur la page de paiement avant l'expiration, le paiement est retrouvé automatiquement et la page reprend l'état en cours.

---

## Génération de PDF

Deux documents sont disponibles au téléchargement :

### Facture de paiement

**Route :** `GET /payments/{id}/invoice`  
**Accès :** client propriétaire du paiement, statut `success`  
**Contenu :** détail d'un paiement (référence, montant, fournisseur, date, informations de la réservation)

### Reçu de réservation

**Route client :** `GET /reservations/{id}/receipt`  
**Route admin :** `GET /admin/reservations/{id}/receipt`  
**Condition :** au moins un paiement réussi (`hasReceipt() = true`)  
**Contenu :** récapitulatif complet de la réservation avec l'historique de **tous** les paiements réussis (ligne par ligne : type, montant, fournisseur, date, référence), solde total et statut financier final.

---

## Structure du projet

### Backend

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/
│   │   │   │   ├── AuthController.php         (register, login, me, logout)
│   │   │   │   ├── GoogleAuthController.php   (redirect, callback)
│   │   │   │   └── VerifyEmailController.php  (verify, resend)
│   │   │   ├── Public/
│   │   │   │   └── RoomController.php         (index, show — sans auth)
│   │   │   ├── Client/
│   │   │   │   ├── ReservationController.php
│   │   │   │   ├── PaymentController.php      (initiate, status, cancel, simulate, invoice, receipt, webhooks)
│   │   │   │   └── ProfileController.php
│   │   │   ├── Admin/
│   │   │   │   ├── DashboardController.php
│   │   │   │   ├── RoomController.php
│   │   │   │   ├── ReservationController.php
│   │   │   │   ├── PaymentController.php      (cashPayment, receipt)
│   │   │   │   ├── CheckInOutController.php
│   │   │   │   ├── ClientController.php
│   │   │   │   └── ProfileController.php
│   │   │   └── Owner/
│   │   │       ├── AdminController.php
│   │   │       ├── DashboardController.php
│   │   │       └── AuditLogController.php
│   │   ├── Middleware/
│   │   │   ├── CheckRole.php                  (role:client|admin|owner + is_active)
│   │   │   ├── CheckPermission.php            (permission:{key})
│   │   │   └── VerifyWebhookSignature.php     (HMAC-SHA256)
│   │   ├── Requests/                          (Form Requests — validation + autorisation)
│   │   └── Resources/
│   │       ├── ReservationResource.php        (paid_amount, remaining_amount, is_fully_paid, has_receipt, nights, is_editable, is_cancellable…)
│   │       ├── RoomResource.php
│   │       └── ClientResource.php
│   ├── Models/
│   │   ├── Owner.php
│   │   ├── Admin.php                          (hasPermission(), getFullNameAttribute())
│   │   ├── AdminPermission.php                (7 KEYS constants)
│   │   ├── Client.php                         (MustVerifyEmail, Google OAuth fields)
│   │   ├── Room.php                           (primaryImage(), isAvailable())
│   │   ├── RoomImage.php
│   │   ├── Reservation.php                    (paidAmount(), remainingAmount(), isFullyPaid(), hasReceipt(), nightsCount())
│   │   ├── Payment.php                        (isExpired(), paymentTypeLabel())
│   │   └── AuditLog.php                       (immuable, ACTION_* constants)
│   └── Services/
│       ├── AuthService.php
│       ├── ReservationService.php             (checkAvailability, calculateTotal, createReservation, confirmReservation, checkIn, checkOut, cancelReservation)
│       ├── AuditService.php                   (static log())
│       └── PaymentService/
│           ├── OrangeCIService.php            (initiate, handleWebhook)
│           └── WaveCIService.php              (initiate, handleWebhook)
├── database/
│   ├── migrations/                            (17 migrations)
│   └── seeders/                               (Owner + Admin + Client + 6 chambres)
└── resources/views/
    ├── emails/
    │   ├── admin-credentials.blade.php
    │   ├── payment-receipt.blade.php
    │   ├── reservation-confirmed.blade.php
    │   └── verify-client-email.blade.php
    ├── invoices/payment.blade.php
    └── receipts/reservation.blade.php
```

### Frontend

```
frontend/src/
├── api/
│   ├── axios.js                   (instance + intercepteurs auth & erreurs)
│   ├── auth.api.js
│   ├── rooms.api.js               (roomsApi + adminRoomsApi)
│   ├── reservations.api.js        (reservationsApi + adminReservationsApi)
│   ├── payments.api.js            (paymentsApi + adminPaymentsApi)
│   ├── profile.api.js
│   ├── admin.api.js               (dashboard, clients, check-in/out)
│   └── owner.api.js               (admins, dashboard, audit)
├── store/
│   ├── authStore.js               (Zustand + persist — user, token, role)
│   ├── darkStore.js
│   └── uiStore.js
├── hooks/
│   ├── useAuth.js
│   ├── useRooms.js
│   ├── useReservations.js
│   └── useOwnerStats.js
├── components/
│   ├── common/
│   │   ├── ConfirmModal.jsx
│   │   ├── DataTable.jsx
│   │   ├── EmptyState.jsx
│   │   ├── ErrorMessage.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── PasswordInput.jsx
│   │   ├── PasswordStrengthIndicator.jsx
│   │   ├── RoomGallery.jsx
│   │   └── StatusBadge.jsx
│   ├── payments/
│   │   ├── PaymentMethodSelector.jsx  (Orange Money / Wave)
│   │   ├── PaymentPlanSelector.jsx    (intégral / 2 fois)
│   │   └── PaymentStatusBanner.jsx
│   ├── reservations/
│   │   ├── ReservationCard.jsx
│   │   └── ReservationStatusTimeline.jsx
│   ├── rooms/
│   │   ├── RoomCard.jsx
│   │   └── RoomFilters.jsx
│   ├── admin/
│   │   ├── AdminHeader.jsx
│   │   └── AdminSidebar.jsx
│   └── owner/
│       ├── OwnerSidebar.jsx
│       ├── StatCard.jsx
│       ├── RevenueChart.jsx
│       ├── OccupancyChart.jsx
│       ├── PaymentMixChart.jsx
│       └── AuditLogTable.jsx
├── pages/
│   ├── public/
│   │   ├── HomePage.jsx
│   │   ├── RoomsPage.jsx
│   │   ├── RoomDetailPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── VerifyEmailPage.jsx
│   │   ├── EmailVerifiedPage.jsx
│   │   ├── GoogleCallbackPage.jsx
│   │   └── NotFoundPage.jsx
│   ├── client/
│   │   ├── DashboardPage.jsx
│   │   ├── ReservationsPage.jsx
│   │   ├── NewReservationPage.jsx
│   │   ├── PaymentPage.jsx
│   │   └── ProfilePage.jsx
│   ├── admin/
│   │   ├── AdminDashboardPage.jsx
│   │   ├── RoomsPage.jsx
│   │   ├── ReservationsPage.jsx
│   │   ├── ClientsPage.jsx
│   │   ├── ClientDetailPage.jsx
│   │   ├── CheckInOutPage.jsx
│   │   └── AdminProfilePage.jsx
│   └── owner/
│       ├── OwnerDashboardPage.jsx
│       ├── AdminsPage.jsx
│       ├── AdminFormPage.jsx
│       └── AuditLogsPage.jsx
├── guards/
│   ├── ClientGuard.jsx
│   ├── AdminGuard.jsx
│   └── OwnerGuard.jsx
├── layouts/
│   ├── PublicLayout.jsx
│   ├── AdminLayout.jsx
│   └── OwnerLayout.jsx
└── utils/
    ├── formatCurrency.js          (formatXOF → "10 000 F CFA")
    └── formatDate.js              (formatDate, nightsBetween)
```

---

## Branches Git

| Branche | Rôle |
|---|---|
| `Dev` | Branche de référence — tout développement atterrit ici en premier |
| `main` | Maintenue en synchronisation avec `Dev` |
| `Test` | Branche de recette, mergée régulièrement depuis `Dev` |

---

## Dépannage

### Laravel utilise SQLite au lieu de MySQL

Laravel lit les variables d'environnement OS **avant** `.env`. Diagnostiquer :

```powershell
echo $env:DB_CONNECTION
[System.Environment]::GetEnvironmentVariable('DB_CONNECTION','User')
[System.Environment]::GetEnvironmentVariable('DB_CONNECTION','Machine')
```

Supprimer si une valeur est présente :

```powershell
Remove-Item Env:DB_CONNECTION -ErrorAction SilentlyContinue
[System.Environment]::SetEnvironmentVariable('DB_CONNECTION', $null, 'User')
# En administrateur si défini au niveau Machine :
[System.Environment]::SetEnvironmentVariable('DB_CONNECTION', $null, 'Machine')
```

Vérifier ensuite :

```bash
php artisan config:clear
php artisan tinker --execute="echo config('database.default').PHP_EOL;"
# Résultat attendu : mysql
```

### Erreurs CORS dans la console navigateur

Vérifier que `FRONTEND_URLS` dans `backend/.env` correspond exactement à l'URL de la SPA (ex. `http://localhost:5173`) :

```bash
php artisan config:clear
```

### Les e-mails ne sont pas envoyés

S'assurer que `php artisan queue:work` tourne et que les variables `MAIL_*` sont correctement configurées. Mailtrap est recommandé en développement.

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

### « APPLICATION IN PRODUCTION » à chaque commande Artisan

Vérifier `APP_ENV=local` et `APP_DEBUG=true` dans `backend/.env` :

```bash
php artisan config:clear
```
