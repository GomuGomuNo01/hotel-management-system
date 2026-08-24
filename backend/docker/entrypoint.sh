#!/bin/sh
# Point d'entrée commun à tous les services basés sur l'image backend
# (php-fpm, queue, scheduler, reverb — voir docker-compose.yml : seule la
# commande change). Prépare les répertoires inscriptibles montés en volume
# depuis l'hôte (storage/ est bind-mounté, donc vide au tout premier
# démarrage sur un serveur neuf) puis exécute la commande demandée.
set -e

mkdir -p \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/testing \
    storage/framework/views \
    storage/logs \
    storage/app/public \
    storage/app/private \
    bootstrap/cache

# Utile uniquement en local (Caddy sert /storage/* directement depuis le
# volume storage/app/public en production — voir deploy/Caddyfile) ; inoffensif
# de le garder pour tout outil qui suivrait encore le lien historique.
[ -L public/storage ] || php artisan storage:link --quiet || true

exec "$@"
