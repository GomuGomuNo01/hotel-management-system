# Déploiement — IvoireHôtel (backend)

Checklist de mise en production. À suivre dans l'ordre.

## 1. Variables d'environnement

Copier `.env.example` → `.env` et renseigner les valeurs réelles (jamais commitées) :

- `APP_KEY` : générer avec `php artisan key:generate`
- `APP_ENV=production`, `APP_DEBUG=false`
- `APP_URL` (domaine de l'API) et `FRONTEND_URL` (domaine du SPA) — **tous deux requis** :
  `FRONTEND_URL` pilote les redirections OAuth, vérification d'e-mail et reset de mot de passe.
- `DB_*`, `MAIL_*`, `GOOGLE_*`, `ORANGE_CI_*`, `WAVE_CI_*` : identifiants réels.
- `SANCTUM_TOKEN_EXPIRATION` (minutes), `RESERVATION_UNPAID_TIMEOUT_HOURS`.
- `SENTRY_LARAVEL_DSN` (optionnel) pour activer le monitoring.

## 2. Mise en cache (config:cache)

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan event:cache
```

> ⚠️  `config:cache` est sûr : aucune valeur d'environnement n'est lue via `env()`
> en dehors des fichiers `config/`. Toutes les URL frontend passent par
> `config('app.frontend_url')`. Ne jamais réintroduire d'appel `env()` dans le
> code applicatif (controllers, services, notifications) — il renverrait `null`
> une fois la config mise en cache.

## 3. File d'attente (e-mails asynchrones)

Les e-mails de vérification et de réinitialisation sont en file d'attente
(`ShouldQueue`). En production, basculer la connexion et lancer un worker :

```bash
# .env
QUEUE_CONNECTION=database   # ou redis

# processus permanent (supervisor / systemd)
php artisan queue:work --tries=3 --max-time=3600
```

> En dev, `QUEUE_CONNECTION=sync` exécute l'envoi immédiatement — aucun worker requis.

## 4. Tâches planifiées (scheduler)

L'auto-annulation des réservations impayées (`reservations:cancel-unpaid`)
tourne via le scheduler. Ajouter l'entrée cron unique de Laravel :

```cron
* * * * * cd /chemin/backend && php artisan schedule:run >> /dev/null 2>&1
```

## 5. Stockage

```bash
php artisan storage:link   # exposer les avatars/justificatifs publics
```

Les pièces d'identité sont stockées en disque privé et servies via des routes
authentifiées — ne pas les déplacer vers le disque public.
