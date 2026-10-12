# 7. Einstellungen

[← Startseite, Archiv und Navigation](06-site-structure.md) · [Inhalt](README.md) · [Weiter: Daten und Wartung →](08-data-and-maintenance.md)

Unter **Einstellungen** liegt alles, was für die ganze Website gilt. Die Einstellungen sind auf Reiter verteilt.

## Speichern

Änderungen wirken erst nach **Speichern**. **Verwerfen** kehrt zum zuletzt gespeicherten Stand zurück. Willst du die Seite mit ungespeicherten Änderungen verlassen, fragt der Browser nach.

Ungültige Werte werden mit einer Meldung abgelehnt, die das Feld nennt, zum Beispiel „rss.siteUrl must be an http(s) URL or empty“. Gespeichert wird erst, wenn alle Werte gültig sind.

Die meisten Einstellungen bestimmen, wie neue Seiten aussehen. Bestehende Seiten behalten ihr Aussehen, bis sie neu gebaut werden. Nach Änderungen an Header, Footer, CSS, Favicon oder Meta-Tags nutzt du **Daten → Alle Seiten neu bauen**.

Der Kasten **Overhead** auf der Einstellungsseite zeigt, wie viele Bytes deine globalen Einstellungen jeder Seite hinzufügen und wie viel Platz für Inhalte bleibt (siehe [Das 14-KB-Budget](05-byte-budget.md)).

## Allgemein

| Einstellung | Beschreibung |
|---|---|
| **Sprache** | Sprache der Admin-Oberfläche (Englisch oder Deutsch). Wird im Browser gespeichert, jeder Browser kann also seine eigene Sprache haben. Wirkt nach dem Neuladen der Seite. |
| **Website-Sprache** | Sprache deiner öffentlichen Seiten (Englisch oder Deutsch). Browser, Screenreader und Suchmaschinen nutzen sie, und sie bestimmt das Datumsformat und die Texte, die das System selbst in Seiten schreibt: „Noch keine Posts.“ in Beitragslisten und „Veröffentlicht“, „Aktualisiert“, „Von“ im Autor-Block. Nach einer Änderung **Daten → Alle Seiten neu bauen** ausführen. |
| **Startseite** | Die Seite unter `/`. Zur Auswahl stehen nur veröffentlichte Inhalte vom Typ **Seite**. **Aktualisieren** baut die ausgewählte Seite mit den aktuellen Posts neu. Siehe [Startseite, Archiv und Navigation](06-site-structure.md#die-startseite). |
| **Update-Check** | **Beim Start auf Updates prüfen** fragt höchstens einmal am Tag bei GitHub nach einer neuen Version. Standardmäßig ausgeschaltet; dabei werden keine weiteren Daten übertragen. |
| **Passwort** | Das Admin-Passwort ändern. Siehe [Konto und Sicherheit](09-account-and-security.md#passwort-ändern). Dieses Formular funktioniert unabhängig von **Speichern**. |
| **Favicon** | Das kleine Icon im Browser-Tab. **Hochladen** akzeptiert PNG-, ICO-, SVG- und GIF-Dateien bis 4 KB. Das Icon steckt in jeder Seite, kleiner ist also besser. **Entfernen** löscht es. |

## Header

| Einstellung | Beschreibung |
|---|---|
| **Seitentitel** | Der Name deiner Website. Mit **Seitentitel aktivieren** zeigen Browser-Tabs „Titel der Seite \| Seitentitel“. |
| **Navigation** | Links oben auf jeder Seite. Mit **Navigation aktivieren** fügst du über **+ Link** Links hinzu, ein Klick auf einen Link ändert oder löscht ihn, per Ziehen änderst du die Reihenfolge. |
| **Meta** | Mit **Meta aktivieren** erhält jede Seite eine **Beschreibung** (wird von Suchmaschinen angezeigt) und einen **Autor**. Einzelne Seiten können beides überschreiben. |

## Footer

Mit **Footer aktivieren** erscheint am Ende jeder Seite eine Textzeile.

- Einfaches HTML ist erlaubt: Links (`<a href="…">`), fett, kursiv, Zeilenumbrüche, `<small>`, `<code>`, Listen. Bilder, Skripte und Styles werden entfernt.
- **{{bytes}}** fügt einen Platzhalter ein, der durch die tatsächliche Größe der jeweiligen Seite ersetzt wird. Der Footer `© 2026 | {{bytes}}/14336 bytes` erscheint auf einer Seite als „© 2026 | 9812/14336 bytes“.

## CSS

| Einstellung | Beschreibung |
|---|---|
| **Globales CSS verwenden** | Schaltet das Stylesheet für alle Seiten ein oder aus. Ohne CSS zeigen Seiten die Standarddarstellung des Browsers. |
| **CSS Vorlagen** | **Standard**, **Light** und **Dark** sind fertige Vorlagen. Ihr CSS wird schreibgeschützt als Vorschau angezeigt. Mit **Eigenes CSS** schreibst du dein eigenes Stylesheet. |
| **Seitenbreite** | Maximale Breite des Seiteninhalts, etwa `42rem`, `800px` oder `90%`. Leer lassen, um die Breite der Vorlage zu nutzen. |

Einzelne Seiten können über den Override **CSS** im Editor Regeln ergänzen; diese folgen auf das globale CSS.

## Blog

| Einstellung | Beschreibung |
|---|---|
| **Autor** | Standard-Autorenname für Autor-Blöcke und Meta-Tags, falls eine Seite keinen eigenen setzt. |
| **Post-Limit** | Höchstzahl an Posts in Bloglisten (1 bis 100). Die Archivseite zeigt immer alle Posts. |
| **Archiv-Seite** | **Automatische Archiv-Seite aktivieren** legt beim Speichern der Einstellungen eine Seite mit allen Posts an. |
| **Archiv-URL** | Adresse der Archivseite, etwa `archiv`. Nur Kleinbuchstaben, Ziffern und Bindestriche. |
| **Archiv-Link-Text** | Text des Links zum Archiv am Ende von Bloglisten, etwa „Alle Beiträge →“. |

**Rekompilieren** im Archiv-Abschnitt baut die Archivseite sofort neu. Siehe [Die Archivseite](06-site-structure.md#die-archivseite).

## RSS

| Einstellung | Beschreibung |
|---|---|
| **RSS Feed aktivieren** | Veröffentlicht den Feed unter `/feed.xml`. **Kopieren** kopiert die Feed-Adresse, **Öffnen** zeigt den Feed. |
| **Website URL** | Die vollständige Adresse deiner Website ohne abschließenden Schrägstrich, etwa `https://example.com`. Wird für die Links im Feed gebraucht. Ist sie leer, verwendet der Feed die Adresse, unter der er abgerufen wurde. |
| **Sprache** | Sprache des Feeds, etwa Deutsch (de-DE) oder English (en-US). |
| **Copyright** | Optionaler Copyright-Hinweis für den Feed. |
| **Maximale Einträge** | Anzahl der Posts im Feed (5 bis 100). |
| **Cache-Zeit (Minuten)** | Wie oft Feed-Reader nach neuen Posts schauen sollen. |

Der Feed enthält nur Posts, nie Seiten.

## Optimierungen

| Einstellung | Beschreibung |
|---|---|
| **Komprimierung aktivieren** | Entfernt beim Veröffentlichen überflüssige Leerzeichen, Zeilenumbrüche und Kommentare aus HTML und CSS. Empfohlen. Leerzeichen zwischen Wörtern und in Code-Blöcken bleiben erhalten. |
| **Class-Mangling aktivieren** | Verkürzt die Klassennamen, die für Sektionen, Layouts und Beitragslisten erzeugt werden. |
| **Mangling-Modus** | **Sicher** kürzt Layout- und Sektions-Klassen. **Aggressiv** kürzt zusätzlich die Klassen von Bloglisten und Seitennavigation. Gestaltet dein eigenes CSS Beitragslisten oder Seitenlinks über Klassennamen, nimm **Sicher**. |

## Daten

Export, Import, Neu bauen und Zurücksetzen beschreibt [Daten und Wartung](08-data-and-maintenance.md).

## Logs

Das Audit-Log hält sicherheitsrelevante Ereignisse fest: Anmeldungen, fehlgeschlagene Anmeldungen, Passwortänderungen, veröffentlichte und gelöschte Inhalte, Änderungen an Einstellungen, Importe und blockierte Anfragen.

- **Suche…** und der Aktionsfilter grenzen die Liste ein.
- **Aktualisieren** lädt sie neu, **Exportieren** lädt sie als Datei herunter.
- **Löschen** leert das Log nach einer Rückfrage. Auf dem Server bleibt eine Sicherungskopie.

Siehe [Konto und Sicherheit](09-account-and-security.md#das-audit-log).
