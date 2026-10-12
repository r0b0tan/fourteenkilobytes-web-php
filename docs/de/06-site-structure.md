# 6. Startseite, Archiv und Navigation

[← Das 14-KB-Budget](05-byte-budget.md) · [Inhalt](README.md) · [Weiter: Einstellungen →](07-settings.md)

fourteenkilobytes hat kein festes Theme mit eingebauter Startseite. Deine Website besteht aus Seiten, die du selbst baust und die über einige Einstellungen zusammenhängen.

## Die Startseite

Die Adresse `/` zeigt die Seite, die unter **Einstellungen → Allgemein → Startseite** ausgewählt ist. Zur Auswahl stehen nur veröffentlichte Inhalte vom Typ **Seite**.

Öffnest du die Einstellungen zum ersten Mal und es gibt noch keine Startseite, legt fourteenkilobytes eine Seite mit Überschrift, Begrüßungstext und Blogliste an und wählt sie aus. Ihr Name hängt von der Website-Sprache ab: *Startseite* (`/startseite`) auf Deutsch, *Home* (`/home`) auf Englisch.

So gestaltest du eine eigene Startseite:

1. Lege eine neue Seite mit dem Seitentyp **Seite** an, etwa mit dem Slug `willkommen`.
2. Füge einen Begrüßungstext hinzu und, falls die Startseite deine Posts auflisten soll, einen Block **Blogliste**.
3. Veröffentliche sie.
4. Wähle sie unter **Einstellungen → Allgemein → Startseite** aus und klicke auf **Speichern**.

**Aktualisieren** neben der Startseiten-Auswahl baut die Startseite mit den aktuellen Posts neu. Normalerweise brauchst du das nicht, weil Seiten mit Blogliste bei jeder Änderung an einem Post automatisch neu gebaut werden.

Ist keine Startseite ausgewählt, zeigt `/` einen kurzen Hinweis „Homepage nicht konfiguriert“.

## Beitragslisten (Blogliste)

Ein Block **Blogliste** listet deine Posts mit Titel und Datum auf, neueste zuerst. Du kannst ihn auf jeder Seite einsetzen, so oft du willst.

- Er zeigt nur Inhalte vom Typ **Post**, nie Seiten.
- Die Höchstzahl der Einträge legst du unter **Einstellungen → Blog → Post-Limit** fest.
- Datum und der Text „Noch keine Posts.“ richten sich nach **Einstellungen → Allgemein → Website-Sprache**.
- Ist die automatische Archivseite eingeschaltet, endet die Liste mit einem Link dorthin (Standardtext „View all posts →“, änderbar unter Archiv-Link-Text).
- Seiten mit Blogliste werden automatisch neu gebaut, wenn ein Post veröffentlicht, gelöscht oder wiederhergestellt wird.

## Die Archivseite

Die Archivseite listet *alle* Posts auf, ohne Begrenzung. Du schaltest sie unter **Einstellungen → Blog** ein:

- **Automatische Archiv-Seite aktivieren**: legt die Seite beim Speichern der Einstellungen an.
- **Archiv-URL**: ihre Adresse, etwa `archiv` für `/archiv`.
- **Archiv-Link-Text**: der Text des Links am Ende von Bloglisten.

Die Archivseite wird bei jedem Speichern der Einstellungen neu erzeugt, solange sie eingeschaltet ist. **Rekompilieren** im selben Abschnitt baut sie bei Bedarf sofort neu.

> Die Archivseite wird automatisch erzeugt. Änderungen, die du im Editor an ihr vornimmst, werden beim nächsten Erzeugen überschrieben. Für ein selbst gestaltetes Archiv schaltest du die automatische Archivseite aus und legst eine eigene Seite mit Blogliste an.

## Navigation

Die Navigation ist eine Reihe von Links oben auf jeder Seite. Du richtest sie unter **Einstellungen → Header → Navigation** ein:

1. Hake **Navigation aktivieren** an.
2. Klicke auf **+ Link**, gib einen **Text** (etwa „Über mich“) und ein **Ziel** (etwa `/ueber-mich`) ein und bestätige mit **OK**.
3. Ein Klick auf einen Link ändert oder löscht ihn. Per Ziehen änderst du die Reihenfolge.
4. Klicke auf **Speichern**.

Eine einzelne Seite kann mit dem Override **Navigation** im Editor eigene Links verwenden (siehe [Der Editor](03-editor.md#einstellungen-pro-seite-overrides)).

## Wann globale Änderungen auf deinen Seiten ankommen

Seiten sind statische Dateien. Eine Änderung an einer globalen Einstellung (Navigation, Footer, CSS, Seitentitel, Favicon, Meta-Tags) erscheint auf einer Seite erst, wenn diese neu gebaut wird.

- Neue und neu veröffentlichte Seiten nutzen die neuen Einstellungen automatisch.
- Um alle bestehenden Seiten auf einmal zu aktualisieren, nutze **Einstellungen → Daten → Alle Seiten neu bauen**.

## Der RSS-Feed

Ist der Feed eingeschaltet (**Einstellungen → RSS**), steht er unter `/feed.xml` bereit. Er enthält deine neuesten Posts (nie Seiten) mit Titel, Link, Datum und einer kurzen Beschreibung aus den ersten Absätzen.
