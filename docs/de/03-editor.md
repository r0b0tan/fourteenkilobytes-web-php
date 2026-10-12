# 3. Der Editor

[← Die Übersicht](02-dashboard.md) · [Inhalt](README.md) · [Weiter: Inhaltsblöcke →](04-blocks.md)

Im Editor schreibst du Posts und Seiten. Er öffnet sich auf drei Wegen:

| Weg | Ergebnis |
|---|---|
| **Neu** in der oberen Navigation | Ein leerer Editor für neue Inhalte |
| **Recompile** in der Übersicht | Die bestehende Seite mit ihrem Inhalt, bereit zum Ändern. Die Unterzeile lautet „Editing source · requires rebuild“, und der Veröffentlichen-Knopf heißt **Rekompilieren**. |
| **Duplizieren** in der Übersicht | Eine Kopie einer bestehenden Seite mit leerem Titel und Slug |

Der Editor hat vier Bereiche: **Head**, **Body**, **Footer** und **Build**. Neben jedem Bereich zeigt eine kleine Zahl, wie viele Bytes er zur Seite beiträgt.

## Vorlagen und Zurücksetzen

Oben rechts:

- **Vorlage auswählen…** lädt einen Ausgangspunkt: *Blog Post*, *Landing Page* oder *Static Page*. Eine Vorlage ersetzt nach einer Rückfrage den aktuellen Inhalt.
- **Zurücksetzen** leert nach einer Rückfrage alle Eingaben.

## Head

### Titel, Slug und Seitentyp

- **Titel** ist die Überschrift der Seite und der Text in Beitragslisten.
- **Slug** ist die Adresse der Seite. Bei neuen Inhalten entsteht er automatisch aus dem Titel (`Mein erster Post` wird zu `mein-erster-post`). Sobald du selbst im Slug-Feld tippst, folgt er dem Titel nicht mehr. Erlaubt sind Kleinbuchstaben, Ziffern und Bindestriche.
- **Seitentyp**:
  - **Post**: ein datierter Artikel. Er erscheint in Beitragslisten, auf der Archivseite und im RSS-Feed.
  - **Seite**: Inhalte wie Impressum oder Über-mich-Seite. Der Hinweis „(not in feed)“ erinnert daran, dass Seiten nie in Beitragslisten oder im Feed auftauchen.

> **Adresse bestehender Inhalte ändern.** Wenn du bestehende Inhalte öffnest, bleibt ihr Slug erhalten, auch wenn du den Titel änderst. Änderst du das Slug-Feld selbst, entsteht beim Veröffentlichen eine *neue* Seite unter der neuen Adresse, und die alte bleibt online. Zum Umziehen: unter dem neuen Slug veröffentlichen, dann die alte Seite in der Übersicht löschen.

### Einstellungen pro Seite (Overrides)

Manche Einstellungen gelten global für jede Seite (siehe [Einstellungen](07-settings.md)). In den Bereichen Head und Footer kannst du sie für eine einzelne Seite überschreiben. Jeder Override hat eine Checkbox:

- **Nicht angehakt**: Die Seite nutzt die globale Einstellung. Ein kurzer Hinweis zeigt, welche das ist.
- **Angehakt**: Die Felder werden bearbeitbar und gelten nur für diese Seite. Sie starten mit den globalen Werten, damit du nur änderst, was abweicht.

| Override | Wirkung, wenn angehakt |
|---|---|
| **Browser-Tab-Titel** | Ersetzt den Text im Browser-Tab. Standardmäßig zeigt der Tab „Titel \| Seitentitel“, oder nur den Titel, wenn kein Seitentitel gesetzt ist. |
| **Meta** | Eigene **Beschreibung** (bis 160 Zeichen, wird von Suchmaschinen angezeigt) und eigener **Autor** für diese Seite. |
| **Navigation** | Eigene Links für diese Seite. **+ Link** fügt einen hinzu, ein Klick auf einen Link ändert oder löscht ihn, per Ziehen änderst du die Reihenfolge. |
| **Footer** | Eigener Footer-Text für diese Seite. **{{bytes}}** fügt die Byte-Anzeige ein. |
| **CSS** | Zusätzliche CSS-Regeln für diese Seite. Sie werden *nach* dem globalen CSS eingefügt; du kannst also einzelne Details anpassen, ohne das ganze Stylesheet zu wiederholen. |

## Body

Der Body enthält den eigentlichen Inhalt als Liste von Blöcken. **+ Block hinzufügen** fügt einen hinzu. Jeder Block hat rechts Knöpfe:

| Knopf | Funktion |
|---|---|
| Feld **Selektor** | Optionale CSS-Klasse oder ID für den Block, etwa `.hervorgehoben` oder `#intro`, um ihn mit eigenem CSS zu gestalten. Nur bei Blöcken der obersten Ebene, nicht bei Blöcken innerhalb einer Sektion. |
| **↑ / ↓** | Block nach oben oder unten verschieben |
| **⧉** | Block direkt darunter duplizieren |
| **×** | Block löschen |

Alle Blocktypen erklärt das Kapitel [Inhaltsblöcke](04-blocks.md).

## Footer-Bereich

Enthält die oben beschriebenen Overrides **Footer** und **CSS**.

## Build

Der Bereich **Build** zeigt, wie sich die 14.336 Bytes verteilen:

| Zeile | Bedeutung |
|---|---|
| **Base** | Das HTML-Grundgerüst, das jede Seite braucht |
| **Title** | Seitentitel und Browser-Tab-Titel |
| **Favicon** | Das Website-Icon, falls gesetzt |
| **Navigation** | Die Navigationslinks |
| **Meta** | Beschreibung und Autor |
| **Footer** | Die Footer-Zeile |
| **CSS** | Das Stylesheet (global und seitenspezifisch) |
| **Content** | Deine Blöcke |
| **Total** | Alles zusammen, verglichen mit 14.336 B |

Das Kreisdiagramm zeigt dasselbe als Anteile: *Overhead* (alles außer deinem Inhalt), *Content* und *Free*. Liegt die Summe über dem Limit, zeigt der Editor **Über Limit!**. Wie du Bytes sparst, steht unter [Das 14-KB-Budget](05-byte-budget.md).

## Veröffentlichen

Klicke auf **Kompilieren & Veröffentlichen** (bei bestehenden Inhalten **Rekompilieren**). Der Editor:

1. prüft, ob ein Titel und mindestens ein Block vorhanden sind,
2. prüft die Größe. Ist die Seite größer als 14.336 Bytes und lässt sie sich teilen, fragt er, ob sie auf mehrere Seiten verteilt werden soll (siehe [Lange Posts auf mehreren Seiten](05-byte-budget.md#lange-posts-auf-mehreren-seiten)),
3. kompiliert und speichert die Seite,
4. baut alle Seiten mit Beitragsliste (Startseite, Archiv) neu, damit der neue oder geänderte Post dort sofort erscheint,
5. zeigt eine Bestätigung mit Adresse und Größe. **Ansehen** öffnet die Seite in einem neuen Tab.

Nach dem Veröffentlichen neuer Inhalte wird der Editor für den nächsten Post geleert. Bei bestehenden Inhalten bleibt er geöffnet.

Konnten einzelne Seiten mit Beitragsliste nicht neu gebaut werden, nennt die Bestätigung sie. Du kannst sie später über **Einstellungen → Daten → Alle Seiten neu bauen** nachholen.
