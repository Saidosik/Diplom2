# syntax=docker/dockerfile:1.7

FROM php:8.4-cli-bookworm AS app

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_HOME=/tmp/composer \
    PHP_OPCACHE_VALIDATE_TIMESTAMPS=0

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        libicu-dev \
        libonig-dev \
        libpq-dev \
        libsodium-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        exif \
        intl \
        mbstring \
        pcntl \
        pdo_pgsql \
        pgsql \
        zip \
    && (php -m | grep -qi '^sodium$' || docker-php-ext-install sodium) \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/pear

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

ARG COMPOSER_INSTALL_ARGS="--no-interaction --prefer-dist --optimize-autoloader"
RUN composer install ${COMPOSER_INSTALL_ARGS} \
    && groupadd --gid 1000 laravel \
    && useradd --uid 1000 --gid laravel --shell /bin/bash --create-home laravel \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R laravel:laravel storage bootstrap/cache

COPY docker/entrypoint.sh /usr/local/bin/laravel-entrypoint
RUN chmod +x /usr/local/bin/laravel-entrypoint

USER laravel

EXPOSE 8000
ENTRYPOINT ["laravel-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
