#!/bin/sh
# Sauvegarde MySQL + fichiers uploadés (storage/app) — à lancer depuis la
# racine du repo sur le VPS (là où vit docker-compose.yml), typiquement via
# une entrée cron sur l'HÔTE (pas dans un conteneur — voir deploy/README.md §6).
#
# Ne fait QUE produire les archives locales dans BACKUP_DIR. Le transfert
# vers un stockage hors-VPS (S3, rsync vers un autre serveur, restic, etc.)
# n'est volontairement pas géré ici : le choix du fournisseur dépend de vous.
# Enchaînez cette commande avec votre outil de sync habituel (voir exemple
# en bas de deploy/README.md §6).
set -eu

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [ ! -f deploy/mysql.env ]; then
    echo "deploy/mysql.env introuvable — rien à faire (voir deploy/README.md §1)." >&2
    exit 1
fi
# shellcheck disable=SC1091
. ./deploy/mysql.env

if [ -z "${MYSQL_ROOT_PASSWORD:-}" ]; then
    echo "MYSQL_ROOT_PASSWORD absent de deploy/mysql.env." >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "==> Dump MySQL (hotel_management)"
docker compose exec -T mysql \
    mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" \
    --single-transaction --routines --triggers \
    hotel_management | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz"

echo "==> Archive des fichiers uploadés (photos, pièces d'identité)"
# backend/storage est un bind mount hôte (voir docker-compose.yml) : simple
# dossier sur disque, pas besoin de passer par le conteneur.
tar -czf "$BACKUP_DIR/storage-$STAMP.tar.gz" \
    -C backend/storage/app public private

echo "==> Purge des sauvegardes locales de plus de ${RETENTION_DAYS} jours"
find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.gz' -mtime "+$RETENTION_DAYS" -delete

echo "==> Terminé : $BACKUP_DIR/db-$STAMP.sql.gz + storage-$STAMP.tar.gz"
echo "    Pensez à synchroniser $BACKUP_DIR vers un stockage hors-VPS."
