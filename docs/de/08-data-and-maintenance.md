# 8. Daten und Wartung

[← Einstellungen](07-settings.md) · [Inhalt](README.md) · [Weiter: Konto und Sicherheit →](09-account-and-security.md)

Die meisten dieser Funktionen findest du unter **Einstellungen → Daten**.

## Export (Backup)

**Exportieren** lädt ein Backup als JSON-Datei herunter. Wähle, was enthalten sein soll:

- **Alles (Einstellungen + Artikel)**
- **Nur Artikel**
- **Nur Einstellungen**

Das Backup enthält den bearbeitbaren Quellinhalt jedes Posts und jeder Seite (Titel, Blöcke, Einstellungen pro Seite) sowie die globalen Einstellungen. Gelöschte Inhalte sind nicht enthalten. Die fertigen HTML-Dateien gehören nicht zum Backup, weil sie sich jederzeit aus dem Quellinhalt neu bauen lassen.

Dein Admin-Passwort ist nie Teil eines Backups.

## Import (Wiederherstellen)

1. Ziehe eine Backup-Datei auf die Import-Fläche oder klicke auf **durchsuchen**.
2. Wähle im Dialog:
   - **Einstellungen importieren**: ersetzt deine aktuellen Einstellungen.
   - **N Artikel importieren**: fügt Posts und Seiten hinzu oder aktualisiert sie.
   - **Artikel nach Import bauen**: veröffentlicht die importierten Inhalte sofort. Lass diese Option eingeschaltet.
3. Klicke auf **Importieren**. Ein Fortschrittsbalken zeigt den Baufortschritt.

Was mit bestehenden Inhalten passiert:

| Situation | Ergebnis |
|---|---|
| Den Slug gibt es noch nicht | Der Inhalt wird hinzugefügt. Er zeigt **noch nicht gebaut**, bis er gebaut ist. |
| Den Slug gibt es schon | Quellinhalt und Titel werden ersetzt. Die Seite bleibt in ihrer alten Fassung online, bis sie gebaut ist. |
| Der Slug gehört zu gelöschtem Inhalt | Der Eintrag wird übersprungen. Stelle den alten Inhalt zuerst wieder her oder lösche ihn endgültig. |

Der Import wird geprüft, bevor etwas geschrieben wird. Ein Backup mit ungültigen Einstellungen wird als Ganzes abgelehnt, mit einer Meldung, die das Problem nennt. Einträge mit ungültigen Slugs werden übersprungen. Ein Import darf bis zu 100 Artikel und bis zu 10 MB enthalten.

> Importiere nur Backups, die du selbst erstellt hast oder denen du vertraust. Ein Backup ersetzt Einstellungen und Inhalte.

## Alle Seiten neu bauen

**Alle Seiten neu bauen** veröffentlicht jeden Post und jede Seite erneut aus dem gespeicherten Quellinhalt. Nutze es, nachdem du etwas Globales geändert hast:

- Navigation, Footer oder Seitentitel
- CSS-Vorlage, eigenes CSS oder Seitenbreite
- Favicon oder Meta-Tags
- Komprimierung oder Class-Mangling

Seiten mit Beitragsliste kommen zuletzt dran, damit sie den aktuellen Stand aller Posts zeigen. Der Knopf zeigt den Fortschritt („Baue 3/12…“). Schlagen einzelne Seiten fehl, werden sie am Ende aufgelistet; die übrigen werden trotzdem neu gebaut.

## Löschen, Wiederherstellen, endgültig Löschen

Diese Aktionen liegen in der [Übersicht](02-dashboard.md):

| Aktion | Wo | Adresse danach | Rückgängig zu machen |
|---|---|---|---|
| **Löschen** | Reiter Posts / Seiten | 410 Gone | Ja, mit **Wiederherstellen** |
| **Wiederherstellen** | Reiter Archiv | wieder online | – |
| **Endgültig löschen** | Reiter Archiv | 404 Not Found, Slug wieder frei | Nein |

## Alle Artikel löschen

**Einstellungen → Daten → Zurücksetzen → Alle Artikel löschen** löscht nach zwei Rückfragen alle Posts und Seiten. Sie wandern alle ins Archiv und lassen sich weiterhin einzeln wiederherstellen.

## Komplett zurücksetzen

**Komplett zurücksetzen** löscht nach zwei Rückfragen alle Posts, Seiten, Einstellungen und deren gespeicherte Quellinhalte. Das lässt sich nicht rückgängig machen.

Das Admin-Passwort bleibt erhalten. Du wirst abgemeldet und kannst dich mit deinem bisherigen Passwort wieder anmelden. Exportiere vorher ein Backup, falls du später noch etwas brauchen könntest.

## Automatische Sicherungskopien auf dem Server

Der Server hebt jedes Mal die vorherige Fassung auf, wenn er das Inhaltsverzeichnis, die Einstellungen oder die Liste der Seitentypen speichert (Dateien mit der Endung `.bak` im Verzeichnis `data/`). Wird eine dieser Dateien einmal beschädigt, etwa durch eine volle Festplatte, nutzt fourteenkilobytes automatisch die Kopie und bewahrt die beschädigte Datei als `….corrupt-…` zur Untersuchung auf.

Diese Kopien schützen nur vor beschädigten Dateien. Sie ersetzen keine Backups: Exportiere regelmäßig oder sichere das ganze Verzeichnis `data/` auf dem Server.

## Updates

Wie du eine neue Version installierst, beschreibt die Haupt-[README](../../README.md#versioned-releases-recommended-for-upgrades) (englisch). Das Verzeichnis `data/` bleibt bei einem Update erhalten.

Nutze nach einem Update **Alle Seiten neu bauen**, damit alle Seiten von Verbesserungen am Compiler profitieren.
