# 4. Inhaltsblöcke

[← Der Editor](03-editor.md) · [Inhalt](README.md) · [Weiter: Das 14-KB-Budget →](05-byte-budget.md)

Inhalte bestehen aus Blöcken. **+ Block hinzufügen** bietet: **Absatz**, **Überschrift**, **Liste**, **Trenner**, **Abstand**, **Autor**, **Blogliste** und **Sektion**. Ein **Layout** kann innerhalb einer Sektion hinzugefügt werden.

## Textblöcke

### Paragraph, Blockquote und Code Block

Ein Absatz-Block hat links eine Auswahl, die zwischen drei Arten wechselt:

- **Paragraph**: normaler Fließtext.
- **Blockquote**: ein hervorgehobenes Zitat.
- **Code Block**: vorformatierter Text in Festbreitenschrift. Leerzeichen und Zeilenumbrüche bleiben genau erhalten. Textformatierung ist in Code-Blöcken nicht verfügbar.

### Überschrift

Wähle die Ebene **H1** bis **H6**. Verwende höchstens eine H1 pro Seite (meist ist schon der Seitentitel die Hauptüberschrift) und gliedere den Rest mit H2 und darunter.

### Liste

Wähle **Unordered List** (Aufzählungspunkte) oder **Ordered List** (Nummern).

- **Enter** legt einen neuen Listenpunkt an.
- **Rücktaste** in einem leeren Punkt löscht ihn.

### Text formatieren

Absätze, Zitate, Überschriften und Listen haben Formatierungsknöpfe. Markiere Text und klicke:

| Knopf | Ergebnis |
|---|---|
| **B** | Fett |
| **I** | Kursiv |
| **U** | Unterstrichen |
| **S** | Durchgestrichen |
| **<>** | Code im Text |
| **🔗** | Link |

### Links

Markiere den Text, der verlinkt werden soll, und klicke auf **🔗**. Im Link-Feld:

- Die Schnellknöpfe setzen das Präfix für eine Webadresse (`https://`), eine E-Mail-Adresse (`mailto:`) oder eine Telefonnummer (`tel:`).
- **Internal link** öffnet das Ziel im selben Tab, **External link (new tab)** in einem neuen. Adressen mit `https://` gelten automatisch als extern.

Erlaubte Ziele:

| Ziel | Beispiel |
|---|---|
| Eine Seite deiner Website | `/ueber-mich` |
| Ein Anker auf derselben Seite | `#kontakt` |
| Eine Webadresse | `https://example.com` |
| Eine E-Mail-Adresse | `mailto:name@example.com` |
| Eine Telefonnummer | `tel:+491234567` |

Gibst du eine E-Mail-Adresse oder Telefonnummer ohne Präfix ein, sagt dir der Editor, welches Präfix fehlt.

## Gliederungsblöcke

### Trenner

Eine waagerechte Linie zwischen zwei Teilen des Inhalts.

### Abstand

Leerer senkrechter Raum. Die **Höhe** gibst du als CSS-Länge an, etwa `1rem`, `2rem` oder `24px`.

## Automatische Blöcke

Diese Blöcke werden beim Veröffentlichen befüllt.

### Autor

Zeigt Angaben zum Post. Wähle aus, was erscheinen soll:

- **Veröffentlicht**: das Veröffentlichungsdatum
- **Aktualisiert**: das Datum der letzten Änderung (nur wenn der Post nach der Veröffentlichung geändert wurde)
- **Autor**: der Name aus dem **Meta**-Override der Seite, sonst aus **Einstellungen → Blog → Autor**, sonst der globale **Meta**-Autor
- **Tags**: bis zu 8 Schlagwörter mit je bis zu 32 Zeichen

> Die Daten stammen aus der veröffentlichten Fassung des Posts. Wenn du einen neuen Post zum ersten Mal veröffentlichst, kennt der Autor-Block noch kein Datum. Klicke nach der ersten Veröffentlichung einmal auf **Recompile** am Post, dann erscheint es.

### Blogliste

Listet deine Posts mit Titel und Datum auf, neueste zuerst. Nur Inhalte vom Seitentyp **Post** erscheinen. Die Anzahl richtet sich nach **Einstellungen → Blog → Post-Limit**. Ist die automatische Archivseite eingeschaltet, endet die Liste mit einem Link dorthin.

Seiten mit Blogliste werden automatisch neu gebaut, sobald du einen Post veröffentlichst, löschst oder wiederherstellst.

> Hinweis: Das Datumsformat in Bloglisten und der Text „Noch keine Posts.“ (wenn es noch keine Posts gibt) sind derzeit immer deutsch.

## Sektion

Eine Sektion ist ein Bereich über die volle Breite mit eigenen Farben. Sie kann weitere Blöcke enthalten: Klicke dazu auf **+ Block hinzufügen** innerhalb der Sektion. Einstellungen:

| Einstellung | Bedeutung |
|---|---|
| **Hintergrund** | Hintergrundfarbe |
| **Textfarbe** | Schriftfarbe |
| **Muster** | Optionales Hintergrundmuster: **Punkte**, **Gitter**, **Streifen**, **Kreuzschraffur** oder **Hexagone**, mit eigener Farbe und Deckkraft |
| **Breite** | Breite des Inhaltsbereichs, etwa `75%` oder `40rem` |
| **Padding** | Innenabstand, etwa `4rem` |
| **Ausrichtung** | Textausrichtung: Default, Left, Center oder Right |

Sektionen brauchen etwas zusätzliches CSS, das automatisch eingefügt wird, sobald eine Sektion auf der Seite vorkommt.

## Layout

Ein Layout ordnet Blöcke in einem Raster aus Spalten und Zeilen an, etwa zwei Spalten nebeneinander. Füge es innerhalb einer Sektion hinzu.

Mit **+** und **−** neben *Col* und *Row* änderst du die Anzahl der Spalten und Zeilen.

Jede Zelle hat eigene Einstellungen: Ausrichtung (links, zentriert, rechts), Innenabstand (Padding), Außenabstand (Margin), Breite (etwa `50%` oder `20rem`) und eine CSS-Klasse. In einer Zelle kannst du Absätze, Überschriften (H1 bis H6), Listen, Trenner und Abstände anlegen.

## Tipps

- Jeder Block zeigt seine eigene Byte-Zahl. So findest du die teuersten Stellen.
- Muster, Sektionen und Layouts sind bequem, kosten aber CSS-Bytes. Auf textlastigen Seiten kommst du mit schlichten Absätzen und Überschriften weiter.
- Dupliziere einen gut gestalteten Block (**⧉**), statt ihn neu aufzubauen.
