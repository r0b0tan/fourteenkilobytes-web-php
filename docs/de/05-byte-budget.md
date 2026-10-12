# 5. Das 14-KB-Budget

[← Inhaltsblöcke](04-blocks.md) · [Inhalt](README.md) · [Weiter: Startseite, Archiv und Navigation →](06-site-structure.md)

Jede veröffentlichte Seite darf höchstens **14.336 Bytes** groß sein. Der Editor veröffentlicht nichts Größeres, und der Server prüft die Größe noch einmal.

## Warum 14 KB?

Wenn sich ein Browser mit einem Server verbindet, darf der Server zunächst nur etwa 14 KB schicken, bevor er auf eine Bestätigung des Browsers warten muss. Eine Seite, die in diesen ersten Durchgang passt, kommt vollständig in einem Stück an. Größere Seiten brauchen weitere Durchgänge, was auf mobilen und langsamen Verbindungen spürbar Zeit kostet.

## Was zählt

Das Limit gilt für die fertige HTML-Datei jeder Seite. Alles, was ein Besucher braucht, steckt in dieser einen Datei:

| Teil | Typische Größe | Hinweis |
|---|---|---|
| HTML-Grundgerüst | einige hundert Bytes | Immer vorhanden |
| Titel und Browser-Tab-Titel | klein | Wächst mit langen Seitentiteln |
| Favicon | bis 4 KB | Steckt in **jeder** Seite. Ein kleines Icon spart viel. |
| Navigation | klein bis mittel | Jeder Link kostet auf jeder Seite Bytes |
| Meta-Tags | klein | Beschreibung und Autor |
| Footer | klein | Wächst mit langen Texten und Links |
| CSS | 1–4 KB | Globale Vorlage plus seitenspezifische Regeln; Sektionen bringen eigenes CSS mit |
| Inhalt | der Rest | Deine Blöcke |

Alles außer dem Inhalt heißt **Overhead**: Er wiederholt sich auf jeder Seite. Die **Einstellungen** zeigen den aktuellen Overhead in einem Kreisdiagramm, zusammen mit dem Platz, der für Inhalte noch **Verfügbar** ist.

Gezählt werden Bytes, nicht Zeichen. Buchstaben wie ä, ö, ü oder das €-Zeichen belegen zwei bis drei Bytes.

## Bytes sparen

**In den Einstellungen** (wirkt auf jede Seite):

- Lass die **Komprimierung** eingeschaltet (**Einstellungen → Optimierungen**). Sie entfernt überflüssige Leerzeichen und Kommentare aus HTML und CSS.
- Schalte **Class-Mangling** ein, um die Klassennamen von Sektionen, Layouts und Beitragslisten zu verkürzen. **Sicher** kürzt Layout- und Sektions-Klassen, **Aggressiv** zusätzlich die Klassen von Bloglisten und Seitennavigation. Nimm **Sicher**, wenn du diese Elemente mit eigenem CSS gestaltest.
- Nutze ein kleines Favicon oder gar keins.
- Halte Navigation und Footer kurz.
- Schreibe bei **Eigenes CSS** nur die Regeln, die du wirklich brauchst.

**Im Inhalt:**

- Schlichte Absätze und Überschriften sind die günstigsten Blöcke. Sektionen, Muster und Layouts kosten zusätzliches CSS.
- Jeder Block zeigt im Editor seine Byte-Zahl. Fang bei den größten an.
- Lange Link-Adressen kosten Bytes. Interne Links wie `/ueber-mich` sind kürzer als vollständige Adressen.
- Verzichte auf leere Absätze und Abstände, wo ein Trenner oder eine Überschrift dieselbe Arbeit macht.

## Lange Posts auf mehreren Seiten

Ist ein Post zu groß, bietet der Editor an, ihn zu teilen, zum Beispiel: „Dein Post überschreitet das 14KB-Limit (18204 Bytes). Möchtest du ihn in 2 Seiten aufteilen?“

- **Ja** veröffentlicht den Post auf mehreren Seiten: Die erste behält den Slug (`/langer-post`), die weiteren bekommen eine Nummer (`/langer-post-2`, `/langer-post-3`, …). Jede Seite enthält Links zu den anderen.
- **Nein** bricht das Veröffentlichen ab, damit du den Post kürzen kannst.

Geteilt wird zwischen Blöcken. Ein einzelner Block, der für sich allein größer als eine ganze Seite ist, lässt sich nicht teilen; der Editor meldet dann „Post ist zu groß und kann nicht in Seiten aufgeteilt werden.“ Teile den Block in mehrere kleinere auf.

Der Overhead (Navigation, CSS, Footer, …) wiederholt sich auf jeder Seite, daher fasst jede Seite etwas weniger als 14 KB Inhalt.

Löschst du einen geteilten Post, werden alle seine Seiten gelöscht. Veröffentlichst du ihn mit weniger Seiten neu, werden die nicht mehr benötigten Seiten entfernt.
