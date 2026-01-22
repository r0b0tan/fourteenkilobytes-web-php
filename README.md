# fourteenkilobytes (PHP Version)

Eine einfache Blog-Software mit 14KB-Limit pro Seite. Diese PHP-Version benötigt kein Node.js - einfach auf den Server kopieren und fertig.

## Installation

1. **Ordner auf den Server kopieren**

   Kopiere den gesamten Inhalt dieses Ordners in dein Webverzeichnis (z.B. `/var/www/html/` oder `htdocs/`).

2. **Schreibrechte setzen**

   Der `data/`-Ordner muss für den Webserver beschreibbar sein:
   ```bash
   chmod -R 755 data/
   chown -R www-data:www-data data/
   ```

3. **Admin aufrufen**

   Öffne `https://deine-domain.de/admin/` im Browser und lege ein Passwort fest.

## Struktur

```
/
├── index.php           # Blog-Router (/, /:slug)
├── .htaccess           # URL-Rewriting für Apache
├── api/
│   └── index.php       # API-Endpoints
├── public/
│   ├── index.html      # Blog-Startseite (optional)
│   └── admin/          # Admin-Interface
│       ├── index.html
│       ├── editor.html
│       ├── settings.html
│       ├── setup.html
│       ├── app.js      # Frontend-Logik
│       ├── compiler.js # Browser-Compiler
│       └── style.css
└── data/               # Daten (wird automatisch erstellt)
    ├── instance.json   # Admin-Credentials
    ├── manifest.json   # Post-Index
    ├── settings.json   # Globale Einstellungen
    └── posts/          # HTML-Dateien der Posts
```

## Server-Anforderungen

- PHP 8.0 oder höher
- Apache mit mod_rewrite (oder nginx mit entsprechender Konfiguration)
- Schreibrechte für `data/`-Ordner

## nginx-Konfiguration

Falls du nginx statt Apache verwendest:

```nginx
server {
    listen 80;
    server_name deine-domain.de;
    root /pfad/zu/fourteenkilobytes;
    index index.php;

    # API
    location /api/ {
        try_files $uri /api/index.php?$args;
    }

    # Admin
    location /admin {
        alias /pfad/zu/fourteenkilobytes/public/admin;
        try_files $uri $uri/ /public/admin/index.html;
    }

    # Blog posts
    location / {
        try_files $uri $uri/ /index.php?slug=$uri&$args;
    }

    # PHP
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

## Passwort zurücksetzen

Falls du dein Passwort vergessen hast, lösche die Datei `data/instance.json` und rufe `/admin/setup` erneut auf.

## Backup

Sichere regelmäßig den `data/`-Ordner - er enthält alle Posts und Einstellungen.

## Unterschiede zur Node.js-Version

| Feature | Node.js | PHP |
|---------|---------|-----|
| Installation | `npm install` | Dateien kopieren |
| Compiler | Serverseitig | Clientseitig (Browser) |
| Webserver | Eingebaut | Apache/nginx erforderlich |
| Runtime | Node.js 20+ | PHP 8.0+ |
