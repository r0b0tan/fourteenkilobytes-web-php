# 10. Fehlerbehebung

[← Konto und Sicherheit](09-account-and-security.md) · [Inhalt](README.md)

Einige Meldungen kommen direkt vom Server und erscheinen deshalb auch in der deutschen Oberfläche auf Englisch. Sie sind hier so zitiert, wie sie auf dem Bildschirm stehen.

## Die Website

### Die Startseite zeigt „Homepage nicht konfiguriert“

Es ist keine Startseite ausgewählt. Öffne die **Einstellungen**: Gibt es noch keine Startseite, wird automatisch eine angelegt. Andernfalls wähle unter **Allgemein → Startseite** eine Seite aus und klicke auf **Speichern**. Nur Inhalte vom Seitentyp **Seite** stehen zur Auswahl.

### Alle Seiten außer der Startseite zeigen „Seite nicht gefunden“

Der Webserver leitet Adressen wie `/mein-post` nicht an fourteenkilobytes weiter.

- **Apache:** Prüfe, ob `mod_rewrite` eingeschaltet ist und der virtuelle Host `.htaccess`-Dateien erlaubt (`AllowOverride All`).
- **nginx:** Übernimm die location-Regeln aus `nginx.conf.example`.

### Änderungen an Navigation, Footer oder Design erscheinen nicht

Seiten sind statische Dateien und behalten das Aussehen, das sie beim Veröffentlichen hatten. Nutze **Einstellungen → Daten → Alle Seiten neu bauen**.

### Auf älteren Seiten kleben Wörter zusammen, zum Beispiel „HalloWelt“

Ältere Versionen haben das Leerzeichen zwischen zwei formatierten Wörtern entfernt. Die aktuelle Version behält es, aber Seiten, die vor dem Update veröffentlicht wurden, enthalten noch die alte Ausgabe. Nutze einmal **Einstellungen → Daten → Alle Seiten neu bauen**.

### Ein Post erscheint nicht in der Liste auf der Startseite

- Prüfe den Seitentyp: Nur **Post** erscheint in Beitragslisten, **Seite** nie.
- Prüfe **Einstellungen → Blog → Post-Limit**: Ältere Posts fallen aus der Liste, wenn das Limit erreicht ist. Auf der Archivseite bleiben sie erreichbar.
- Konnte die Startseite beim Veröffentlichen nicht neu gebaut werden, stand das in der Bestätigung. Klicke unter **Einstellungen → Allgemein** auf **Aktualisieren** oder nutze **Alle Seiten neu bauen**.

### Der Autor-Block zeigt kein Datum

Beim ersten Veröffentlichen eines Posts ist das Datum beim Bauen der Seite noch nicht bekannt. Klicke in der Übersicht einmal auf **Recompile** am Post.

### Der RSS-Feed enthält falsche Adressen

Trage die vollständige Adresse deiner Website unter **Einstellungen → RSS → Website URL** ein, etwa `https://example.com`.

### Das Datum in Beitragslisten ist immer deutsch

Das ist eine derzeitige Einschränkung: Bloglisten verwenden immer das deutsche Datumsformat und den Text „Noch keine Posts.“, wenn es noch keine Posts gibt.

## Bearbeiten und Veröffentlichen

### „Über Limit!“ oder der Post lässt sich nicht veröffentlichen

Die Seite ist größer als 14.336 Bytes. Wie du Bytes sparst, steht unter [Das 14-KB-Budget](05-byte-budget.md); alternativ lässt du den Editor den Post auf mehrere Seiten verteilen.

### „Post ist zu groß und kann nicht in Seiten aufgeteilt werden.“

Ein einzelner Block ist für sich allein zu groß für eine Seite. Teile ihn in mehrere kleinere Blöcke auf, etwa mehrere Absätze statt eines sehr langen.

### „Slug '…' was previously used and tombstoned“

Inhalt mit dieser Adresse wurde früher gelöscht. Stelle ihn im Reiter **Archiv** der Übersicht wieder her, lösche ihn dort endgültig, um die Adresse freizugeben, oder wähle einen anderen Slug.

### Ich habe den Titel geändert, und jetzt gibt es den Post doppelt

Das passierte in älteren Versionen, wenn der Titel eines bestehenden Inhalts geändert wurde. Lösche die Kopie mit der unerwünschten Adresse in der Übersicht. In der aktuellen Version behält ein bestehender Inhalt seine Adresse, wenn du den Titel änderst.

### „Titel erforderlich“ oder „Mindestens ein Block erforderlich“

Gib vor dem Veröffentlichen einen Titel ein und füge mindestens einen Block hinzu.

### „Server busy, please try again“

Zwei Änderungen wurden genau gleichzeitig gespeichert. Warte eine Sekunde und versuche es noch einmal.

## Einstellungen und Daten

### Einstellungen lassen sich nicht speichern

Die Meldung nennt das Feld und das Problem. Häufige Ursachen:

| Feld | Anforderung |
|---|---|
| RSS **Website URL** | Muss mit `https://` oder `http://` beginnen oder leer sein |
| **Seitenbreite** | Eine CSS-Länge wie `42rem`, `800px` oder `90%` |
| **Archiv-URL** | Nur Kleinbuchstaben, Ziffern und Bindestriche |
| **Favicon** | Ein Bild mit höchstens 4 KB |

### Der Import überspringt einige Artikel

Übersprungen werden Artikel, deren Slug zu gelöschtem Inhalt gehört, und Artikel mit ungültigem Slug. Stelle den alten Inhalt wieder her oder lösche ihn endgültig und importiere erneut.

### Speichern schlägt mit „Failed to write …“ fehl

Der Webserver kann nicht in das Verzeichnis `data/` schreiben. Führe auf dem Server `sudo ./fix-permissions.sh www-data www-data` aus (den Benutzer an deinen Webserver anpassen).

## Anmelden

### „Fehler bei Anmeldung“, obwohl das Passwort stimmt

Nach fünf falschen Passwörtern innerhalb von fünf Minuten sind Anmeldungen von deiner Adresse fünf Minuten lang gesperrt, und die Anmeldeseite zeigt auch beim richtigen Passwort „Fehler bei Anmeldung“. Warte fünf Minuten und versuche es erneut. Ein falsches Passwort zeigt dagegen „Falsches Passwort“.

### Nach wenigen Fehlversuchen sind alle gleichzeitig gesperrt

Deine Website läuft vermutlich hinter einem Proxy, sodass alle Besucher dieselbe Adresse zu haben scheinen. Setze `FKB_TRUSTED_PROXIES` wie unter [Betrieb hinter einem Proxy](09-account-and-security.md#betrieb-hinter-einem-proxy) beschrieben.

### Ich werde unerwartet abgemeldet

Eine Anmeldung dauert höchstens 24 Stunden. Abgemeldet wirst du auch, wenn das Passwort in einem anderen Browser geändert wurde oder nach einem kompletten Zurücksetzen.

### Ich habe mein Passwort vergessen

Siehe [Verlorenes Passwort zurücksetzen](09-account-and-security.md#verlorenes-passwort-zurücksetzen). Lösche nicht `data/instance.json`.
