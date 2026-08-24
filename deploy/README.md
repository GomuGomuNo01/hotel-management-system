# Déploiement — VPS Docker

Architecture : un VPS, Docker Compose, **Caddy** en unique point d'entrée
(TLS automatique Let's Encrypt) sur 3 sous-domaines :

| Sous-domaine | Sert |
|---|---|
| `api.votredomaine.com` | API Laravel (PHP-FPM via `php_fastcgi`) + fichiers publics (`/storage/*`) |
| `ws.votredomaine.com` | WebSocket temps réel (Laravel Reverb) |
| `votredomaine.com` (ou `app.votredomaine.com`) | SPA React (fichiers statiques) |

Services Compose : `mysql`, `backend` (PHP-FPM), `queue` (`queue:work`),
`scheduler` (boucle `schedule:run` — pas de cron dans le conteneur),
`reverb`, `frontend-build` (job ponctuel qui produit le build React),
`caddy` (edge + TLS).

---

## 0. Prérequis

- VPS avec Docker + Docker Compose v2 installés, ports 80/443 ouverts.
- 3 enregistrements DNS de type A pointant vers l'IP du VPS :
  `api.votredomaine.com`, `ws.votredomaine.com`, `votredomaine.com`.
  **Doivent déjà résoudre avant le premier démarrage** — Caddy obtient les
  certificats TLS via une challenge HTTP-01 au premier accès.
- Un compte Google Cloud (OAuth), un fournisseur SMTP transactionnel
  (Mailgun/SES/Brevo…), et — quand ils seront branchés — les clés
  Orange Money CI / Wave CI. Tant que ces agrégateurs ne sont pas prêts,
  le paiement en ligne reste indisponible en prod (`PAYMENT_SIMULATION`
  DOIT rester `false` — jamais activé hors dev, voir `SecurityHardeningTest`).

## 1. Cloner et préparer les secrets

```bash
git clone https://github.com/GomuGomuNo01/hotel-management-system.git
cd hotel-management-system

cp .env.example .env                                       # orchestration (domaines, build frontend)
cp deploy/mysql.env.example deploy/mysql.env                # secrets MySQL
cp backend/.env.production.example backend/.env             # app Laravel
```

Compléter chacun des 3 fichiers (tous gitignorés, ne jamais les committer) :

- **`.env`** (racine) : les 3 domaines, `ACME_EMAIL`, `DB_DATABASE`/`DB_USERNAME`,
  les `VITE_*`, et `REVERB_APP_KEY` (doit être identique à celui de `backend/.env`).
- **`deploy/mysql.env`** : `MYSQL_ROOT_PASSWORD` + `MYSQL_PASSWORD` — ce
  dernier **doit être identique** à `DB_PASSWORD` dans `backend/.env`.
- **`backend/.env`** : `APP_KEY` (voir étape 2), `DB_PASSWORD`, `MAIL_*`,
  `GOOGLE_CLIENT_ID`/`SECRET`, `REVERB_APP_ID`/`KEY`/`SECRET` (générer des
  valeurs aléatoires propres à la prod — ne jamais réutiliser celles du dev).

## 2. Premier build et démarrage

```bash
# Construit toutes les images (backend, queue/scheduler/reverb réutilisent
# la même image backend — voir docker-compose.yml).
docker compose build

# Génère APP_KEY (nécessaire avant le premier démarrage réel).
docker compose run --rm backend php artisan key:generate --show
# → coller la valeur affichée dans backend/.env (APP_KEY=base64:...)

# Démarre tout. Caddy attend que frontend-build ait fini (service_completed_successfully)
# avant de démarrer — le tout premier lancement peut prendre 1-2 min (build npm).
docker compose up -d

docker compose logs -f caddy    # vérifier l'obtention des certificats TLS
```

## 3. Base de données — première migration

```bash
docker compose exec backend php artisan migrate --force

# Compte owner initial (aucun seeder de démo en prod — voir le seeder par
# défaut backend/database/seeders/DatabaseSeeder.php si vous voulez vous en
# inspirer, mais ne PAS l'exécuter tel quel : mots de passe "password").
docker compose exec backend php artisan tinker --execute="
\App\Models\Owner::create([
    'full_name' => 'Nom du propriétaire',
    'email'     => 'owner@votredomaine.com',
    'password'  => \Illuminate\Support\Facades\Hash::make('CHANGER-CE-MOT-DE-PASSE'),
]);
"
```

Ensuite, se connecter en owner sur `https://votredomaine.com` et créer les
comptes admin / chambres via l'interface (voir la roadmap de test donnée
plus haut dans cette conversation — elle s'applique telle quelle en prod).

## 4. Vérifications post-déploiement

- [ ] `https://api.votredomaine.com/up` répond 200 (health check Laravel).
- [ ] `https://votredomaine.com` charge le SPA, connexion owner fonctionne.
- [ ] Un événement temps réel arrive bien (ex. créer une chambre dans un
      onglet, la voir apparaître dans un autre sans recharger) → confirme
      que `wss://ws.votredomaine.com` fonctionne.
- [ ] `docker compose ps` : tous les services `Up`, `mysql`/`backend` healthy.
- [ ] E-mail de vérification reçu à l'inscription (confirme `MAIL_*` + le
      service `queue` tourne bien — les mails sont envoyés en job async).
- [ ] `docker compose logs backend | grep -i error` vide.

## 5. Redéployer une mise à jour

```bash
git pull
docker compose build backend frontend-build
docker compose up -d --force-recreate backend queue scheduler reverb

# frontend-build est un job "restart: no" — sans --build il ne se relance pas.
docker compose up -d --build frontend-build
```

**Important** : `opcache.validate_timestamps=0` (voir `backend/docker/php.ini`)
— le bytecode PHP n'est jamais revalidé sur disque, `--force-recreate` sur
`backend`/`queue`/`scheduler`/`reverb` est donc nécessaire à chaque déploiement
(un simple `git pull` sans recréer les conteneurs ne suffit PAS).

Après une migration de schéma :
```bash
docker compose exec backend php artisan migrate --force
```

## 6. Sauvegardes

`deploy/backup.sh` dump la base (`mysqldump --single-transaction`, compressé)
et archive `backend/storage/app/{public,private}` (photos de chambre, pièces
d'identité) dans `./backups/`, avec purge automatique des archives locales de
plus de 14 jours (`RETENTION_DAYS`). Il ne fait **que** produire ces archives
en local — le transfert vers un stockage hors-VPS reste à votre charge (S3,
rsync vers un autre serveur, restic…) puisque le choix du fournisseur vous
appartient.

```bash
chmod +x deploy/backup.sh
./deploy/backup.sh
```

À planifier sur l'**hôte** (pas dans un conteneur) via cron, par exemple
tous les jours à 3h, suivi d'une synchronisation vers un stockage externe :

```cron
0 3 * * * cd /opt/hotel-management-system && ./deploy/backup.sh && rsync -a ./backups/ user@backup-host:/backups/hotel/ >> /var/log/hotel-backup.log 2>&1
```

**Test de restauration** — à faire au moins une fois avant le lancement réel :
```bash
gunzip -c backups/db-<horodatage>.sql.gz | docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" hotel_management
tar -xzf backups/storage-<horodatage>.tar.gz -C backend/storage/app
```

## 7. Ce qui reste à décider avant un vrai lancement public

- Agrégateurs de paiement réels (Orange Money CI / Wave CI) — tant qu'ils ne
  sont pas branchés, `PAYMENT_SIMULATION` doit rester `false` et le paiement
  en ligne est indisponible (le reste de l'app fonctionne).
- `SENTRY_LARAVEL_DSN` — vivement recommandé avant l'ouverture publique pour
  être alerté des erreurs 500 en production.
- `deploy/backup.sh` produit les archives (§6) mais ne les envoie nulle part :
  choisir un stockage externe (S3, rsync vers un autre serveur…), le
  brancher dans le cron, et **faire un vrai test de restauration** avant
  d'accueillir des données réelles.
- Un WAF/CDN devant Caddy (Cloudflare ou équivalent) si trafic public —
  Caddy seul n'a pas de protection anti-DDoS.
