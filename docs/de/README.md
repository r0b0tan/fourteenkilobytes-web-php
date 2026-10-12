# fourteenkilobytes Benutzerhandbuch

fourteenkilobytes ist ein kleines Content-Management-System für Blogs und persönliche Websites. Jede veröffentlichte Seite darf höchstens **14.336 Bytes** (14 KB) groß sein. Das ist ungefähr die Datenmenge, die ein Server im ersten Hin und Her einer Verbindung schicken kann. Seiten kommen dadurch in einem Stück an, auch über langsame Verbindungen.

Du schreibst Inhalte in einem Block-Editor im Browser. Beim Veröffentlichen übersetzt der Editor die Seite in eine einzelne, in sich geschlossene HTML-Datei und zeigt dir genau, wie viele Bytes jeder Teil braucht. Besucher bekommen ausschließlich diese statischen Dateien: kein JavaScript, kein Tracking, keine Datenbank.

[English version](../en/README.md)

## Kapitel

1. [Erste Schritte](01-getting-started.md): Installation, Setup-Assistent, erste Anmeldung, dein erster Post
2. [Die Übersicht](02-dashboard.md): Inhalte finden, öffnen, duplizieren und löschen
3. [Der Editor](03-editor.md): Titel, Slug, Seitentyp, Einstellungen pro Seite, Veröffentlichen, Bearbeiten
4. [Inhaltsblöcke](04-blocks.md): Absätze, Überschriften, Listen, Sektionen, Layouts und mehr
5. [Das 14-KB-Budget](05-byte-budget.md): was zählt, wie du Bytes sparst, lange Posts auf mehreren Seiten
6. [Startseite, Archiv und Navigation](06-site-structure.md): wie die Teile einer Website zusammenhängen
7. [Einstellungen](07-settings.md): alle Reiter der Einstellungen erklärt
8. [Daten und Wartung](08-data-and-maintenance.md): Backups, Import, Neu bauen, Löschen und Wiederherstellen
9. [Konto und Sicherheit](09-account-and-security.md): Passwort, Anmeldungen, Audit-Log, Reverse-Proxys
10. [Fehlerbehebung](10-troubleshooting.md): häufige Probleme und ihre Lösung

## Begriffe in diesem Handbuch

| Begriff | Bedeutung |
|---|---|
| **Post** | Ein datierter Artikel. Posts erscheinen in Beitragslisten (Bloglisten), im Archiv und im RSS-Feed. |
| **Seite** | Inhalt ohne Datumsbezug, etwa ein Impressum, eine Über-mich-Seite oder die Startseite. Seiten erscheinen nie in Beitragslisten oder im Feed. |
| **Slug** | Der Adressteil einer Seite: Der Post mit dem Slug `mein-erster-post` ist unter `/mein-erster-post` erreichbar. |
| **Block** | Ein Inhaltsbaustein im Editor, zum Beispiel ein Absatz, eine Überschrift oder eine Liste. |
| **Veröffentlichen / Kompilieren** | Aus dem Editor-Inhalt die fertige HTML-Datei erzeugen, die Besucher sehen. |
| **Neu bauen** | Eine bestehende Seite aus ihrem gespeicherten Inhalt erneut veröffentlichen, etwa nach einer Änderung an globalen Einstellungen. |
| **Tombstone** | Eine gelöschte Seite. Ihre Adresse antwortet mit „410 Gone“, damit Suchmaschinen und Besucher erfahren, dass sie absichtlich entfernt wurde. |

Die Admin-Oberfläche gibt es auf Deutsch und Englisch. Einige Bedienelemente sind auch in der deutschen Oberfläche englisch beschriftet, etwa die Auswahlfelder in den Blöcken und der Setup-Assistent. Dieses Handbuch nennt sie so, wie sie auf dem Bildschirm stehen.
