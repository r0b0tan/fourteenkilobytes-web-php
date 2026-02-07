# fourteenkilobytes Docker image
FROM php:8.3-apache

# Enable Apache modules
RUN a2enmod rewrite

# Install required extensions
RUN docker-php-ext-install opcache

# Set recommended PHP settings
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=128'; \
    echo 'opcache.interned_strings_buffer=8'; \
    echo 'opcache.max_accelerated_files=4000'; \
    echo 'opcache.revalidate_freq=2'; \
    echo 'opcache.fast_shutdown=1'; \
} > /usr/local/etc/php/conf.d/opcache.ini

# Copy application files
COPY dist/ /var/www/html/

# Set permissions for data directory
RUN chown -R www-data:www-data /var/www/html/data/

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

CMD ["apache2-foreground"]
