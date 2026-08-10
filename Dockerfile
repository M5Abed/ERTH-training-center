FROM php:8.2-apache

# ── Install PHP extensions & system tools ──
RUN apt-get update && apt-get install -y \
        libzip-dev libcurl4-openssl-dev libpng-dev libjpeg-dev libfreetype6-dev unzip curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql zip curl gd \
    && a2enmod rewrite headers expires \
    && rm -rf /var/lib/apt/lists/*

# ── Install Composer ──
COPY --from=composer:latest /usr/bin/composer /usr/local/bin/composer

# ── Apache: allow .htaccess overrides ──
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/sites-available/000-default.conf
# Also set it for the /var/www/html directory block in apache2.conf
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

# ── Set working directory ──
WORKDIR /var/www/html

# ── Copy composer files first (layer caching) ──
COPY composer.json ./
RUN composer install --no-dev --optimize-autoloader --no-interaction

# ── Copy the full project ──
COPY . .

# ── Ensure proper permissions ──
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

EXPOSE 80

CMD ["apache2-foreground"]
