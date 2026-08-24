# Image de production pour l'API Laravel — servie en PHP-FPM (FastCGI) derrière
# Caddy (voir docker-compose.yml + deploy/Caddyfile à la racine du repo).
# Ce même Dockerfile sert aussi les process queue/scheduler/reverb (docker-compose.yml
# lance des services séparés sur cette image avec une commande différente).

# ---- Étape 1 : dépendances Composer (mise en cache séparée du code applicatif) ----
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist

COPY . .
RUN composer dump-autoload --no-dev --optimize \
    && rm -rf tests .git

# ---- Étape 2 : runtime PHP-FPM ----
FROM php:8.4-fpm-alpine AS app

RUN apk add --no-cache \
        libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev \
        libzip-dev icu-dev oniguruma-dev icu-data-full \
    && docker-php-ext-configure gd --with-jpeg --with-freetype --with-webp \
    && docker-php-ext-install -j"$(nproc)" \
        gd pdo_mysql bcmath zip intl mbstring exif pcntl opcache \
    && apk del --no-network libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev libzip-dev icu-dev oniguruma-dev

WORKDIR /var/www/html

COPY --from=vendor /app /var/www/html
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && addgroup -g 1000 www && adduser -D -u 1000 -G www www \
    && chown -R www:www /var/www/html

USER www

EXPOSE 9000

ENTRYPOINT ["entrypoint.sh"]
CMD ["php-fpm"]
