# 2. Die Übersicht

[← Erste Schritte](01-getting-started.md) · [Inhalt](README.md) · [Weiter: Der Editor →](03-editor.md)

Die **Übersicht** listet alles, was du veröffentlicht hast.

## Reiter

| Reiter | Inhalt |
|---|---|
| **Posts** | Alle Posts, neueste zuerst |
| **Seiten** | Alle Seiten (Startseite, Impressum, Archivseite, …) |
| **Archiv** | Gelöschte Posts und Seiten, die sich wiederherstellen lassen |

## Inhalte finden

- **Suche…** filtert beim Tippen nach Titel und Slug.
- **Datum** öffnet einen Zeitraumfilter mit **Von** und **Bis**. **Zurücksetzen** entfernt den Filter.
- Die Zahlenauswahl (5, 10, 20, **Alle**) legt fest, wie viele Einträge pro Seite erscheinen. Mit den Pfeilen unter der Liste blätterst du.

Jeder Eintrag zeigt den Slug, das Datum (**Veröffentlicht** oder nach späteren Änderungen **Aktualisiert**) und, falls gesetzt, den Autor.

## Aktionen für veröffentlichte Inhalte

| Aktion | Was passiert |
|---|---|
| Klick auf den Titel | Öffnet die öffentliche Seite in einem neuen Tab. |
| **Recompile** | Öffnet die Seite im Editor, damit du sie ändern und erneut veröffentlichen kannst. |
| **Duplizieren** | Öffnet den Editor mit einer Kopie des Inhalts. Titel und Slug sind leer, damit du die Kopie als neue Seite veröffentlichen kannst. |
| **Löschen** | Nimmt die Seite nach einer Rückfrage von der Website. Ihre Adresse antwortet danach mit „410 Gone“. Die Seite wandert in den Reiter **Archiv** und lässt sich wiederherstellen. |

Nach dem Löschen eines Posts werden Seiten mit Beitragsliste (etwa die Startseite) automatisch neu gebaut, damit der gelöschte Post dort verschwindet.

## Aktionen im Archiv

| Aktion | Was passiert |
|---|---|
| **Wiederherstellen** | Veröffentlicht die Seite erneut aus ihrem gespeicherten Inhalt. Das ursprüngliche Veröffentlichungsdatum bleibt erhalten. Seiten mit Beitragsliste werden aktualisiert. |
| **Endgültig löschen** | Entfernt die Seite nach einer Rückfrage vollständig. Ihre Adresse antwortet danach mit „404 Not Found“, und der Slug ist für neue Inhalte frei. Das lässt sich nicht rückgängig machen. |

Warum zwei Stufen? Eine gelöschte Adresse, die „410 Gone“ meldet, sagt Suchmaschinen, dass die Seite absichtlich entfernt wurde; sie nehmen sie dann schnell aus dem Index. **Endgültig löschen** brauchst du nur, wenn du den Slug wiederverwenden willst.

## Einträge mit „noch nicht gebaut“

Nach dem Import eines Backups können neue Einträge **noch nicht gebaut** anzeigen. Sie sind im System vorhanden, haben aber noch keine öffentliche Seite. Normalerweise baut der Import sie sofort. Falls das nicht passiert ist (etwa weil **Artikel nach Import bauen** abgewählt war), nutze **Recompile** am Eintrag oder **Einstellungen → Daten → Alle Seiten neu bauen**.

## Update-Hinweis

Ist der Update-Check eingeschaltet (**Einstellungen → Allgemein → Update-Check**), zeigt die Übersicht einen Hinweis, sobald eine neue Version verfügbar ist. **Release ansehen** öffnet die Versionshinweise, **In 7 Tagen erinnern** blendet den Hinweis für eine Woche aus.
