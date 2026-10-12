# 1. Erste Schritte

[← Inhalt](README.md) · [Weiter: Die Übersicht →](02-dashboard.md)

## Voraussetzungen

- PHP 8.3 oder neuer (mit der Erweiterung `mbstring`, die fast jede PHP-Installation mitbringt)
- Apache mit `mod_rewrite` oder nginx mit PHP-FPM
- Schreibrechte für den Webserver im Verzeichnis `data/`

Eine Datenbank wird nicht gebraucht. Alle Inhalte und Einstellungen liegen als Dateien in `data/`.

## Installation

### Variante A: Release-Paket (empfohlen)

1. Lade das aktuelle Release-Paket von GitHub herunter und entpacke es in das Wurzelverzeichnis deines Webservers.
2. Gib dem Webserver Schreibrechte für `data/`. Auf den meisten Linux-Servern heißt der Webserver-Benutzer `www-data`:

   ```bash
   sudo ./fix-permissions.sh www-data www-data
   ```

3. Richte den Webserver ein:
   - **Apache:** Die mitgelieferte `.htaccess` erledigt alles. Für das Verzeichnis muss `AllowOverride All` gesetzt und `mod_rewrite` aktiv sein.
   - **nginx:** Kopiere `nginx.conf.example`, passe `server_name`, `root`, die Zertifikatspfade und den PHP-FPM-Socket an und lade nginx neu.
4. Öffne deine Domain im Browser. Du wirst automatisch zum Setup-Assistenten weitergeleitet.

### Variante B: Docker

```bash
docker-compose up -d
```

Die Website ist dann unter `http://localhost:8080/` erreichbar. Die Inhalte liegen im Verzeichnis `data/` neben der `docker-compose.yml`.

### Variante C: lokal ausprobieren ohne Webserver

Für einen schnellen Blick auf dem eigenen Rechner:

```bash
php -S localhost:8000 router.php
```

Dann `http://localhost:8000/` öffnen.

## Der Setup-Assistent

Der Assistent läuft nur einmal und ist englisch beschriftet. Er führt durch sechs Schritte:

1. **First-Time Setup**: eine kurze Begrüßung.
2. **System Requirements**: prüft die PHP-Version, die Schreibrechte für `data/`, die URL-Umschreibung und HTTPS. Pflichtprüfungen müssen bestanden sein, bevor es weitergeht. URL-Umschreibung und HTTPS sind nur empfohlen; der Assistent warnt, lässt dich aber fortfahren.
3. **Create Admin Account**: Lege das Admin-Passwort fest (8 bis 500 Zeichen). Es gibt nur ein Admin-Konto und keinen Benutzernamen.
4. **Site Configuration**: der Seitentitel (erscheint in Browser-Tabs) und die Sprache der Admin-Oberfläche (Englisch oder Deutsch).
5. **Webserver Configuration**: zeigt die passende `.htaccess`- bzw. nginx-Konfiguration. Du brauchst sie nur, wenn dein Server noch nicht eingerichtet ist.
6. **Setup Complete**: Link in den Admin-Bereich unter `/admin/`.

Nach der Einrichtung sperrt sich der Assistent. Er lässt sich nicht noch einmal öffnen, auch nicht von Besuchern, die die Adresse kennen.

> **Bewahre dein Passwort gut auf.** Es gibt keine „Passwort vergessen“-E-Mail. Falls du es verlierst, hilft [Verlorenes Passwort zurücksetzen](09-account-and-security.md#verlorenes-passwort-zurücksetzen).

## Anmelden

Öffne `/admin/` und gib dein Admin-Passwort ein. Eine Anmeldung gilt bis zu 24 Stunden. Nach fünf falschen Versuchen sind Anmeldungen von deiner Adresse fünf Minuten lang gesperrt.

Die obere Navigation des Admin-Bereichs hat drei Hauptbereiche:

- **Übersicht**: die [Übersicht](02-dashboard.md) mit allen Posts und Seiten
- **Neu**: der [Editor](03-editor.md) für einen neuen Post oder eine neue Seite
- **Einstellungen**: [globale Einstellungen](07-settings.md) für die ganze Website

**Blog** öffnet deine öffentliche Website in einem neuen Tab, **Logout** beendet deine Anmeldung.

## Deine ersten Schritte

### 1. Startseite anlegen lassen

Direkt nach der Einrichtung zeigt deine öffentliche Adresse „Homepage nicht konfiguriert“. Öffne einmal die **Einstellungen**: Gibt es noch keine Startseite, legt fourteenkilobytes eine Seite *Startseite* (Slug `startseite`) mit einem Begrüßungstext und einer Liste deiner neuesten Posts an und wählt sie als Startseite aus. Du kannst sie später ändern oder ersetzen (siehe [Startseite, Archiv und Navigation](06-site-structure.md)).

### 2. Grundeinstellungen prüfen

Sieh dir in den **Einstellungen** an:

- **Header → Seitentitel**: der Name, der in Browser-Tabs erscheint.
- **Header → Navigation**: Links, die oben auf jeder Seite stehen.
- **Footer**: eine kurze Zeile am Ende jeder Seite, etwa ein Copyright-Hinweis.

Klicke anschließend auf **Speichern**. Einzelheiten stehen unter [Einstellungen](07-settings.md).

### 3. Deinen ersten Post schreiben

1. Klicke auf **Neu**.
2. Gib einen **Titel** ein. Der **Slug** entsteht daraus automatisch.
3. Lass den **Seitentyp** auf **Post**.
4. Schreibe deinen Text in den ersten Absatz-Block. Über **+ Block hinzufügen** kommen Überschriften, Listen und weitere Inhalte dazu.
5. Behalte den Byte-Zähler im Bereich **Build** im Blick: Er zeigt, wie viel von den 14.336 Bytes du verbrauchst.
6. Klicke auf **Kompilieren & Veröffentlichen**.

Die Erfolgsmeldung verlinkt auf deinen neuen Post. Die Liste auf der Startseite wird automatisch aktualisiert.
