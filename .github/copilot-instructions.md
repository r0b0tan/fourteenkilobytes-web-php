# Copilot Instructions for web-php

Diese Regeln gelten für alle Änderungen in diesem Repository.

## 1) Compiler-Workflow ist verpflichtend

- Änderungen am Compiler **niemals direkt** in `public/admin/compiler.browser.js` durchführen.
- Vor jeder Arbeit mit Compiler-Bezug zuerst `COMPILER_WORKFLOW.md` lesen und befolgen.
- Source of Truth ist das separate Projekt: `../compiler`.
- Compiler-Änderungen immer in `../compiler/src/*` umsetzen.
- Danach das Browser-Bundle im Compiler-Projekt bauen und die generierte Datei nach `public/admin/compiler.browser.js` kopieren.

## 2) Pflicht-Check vor Bearbeitung

Vor Code-Änderungen kurz prüfen:

- Betrifft die Aufgabe Compiler-Logik, Rendering oder Bundle-Verhalten?
- Falls ja: Workflow aus `COMPILER_WORKFLOW.md` zwingend anwenden.
- Betrifft die Aufgabe UI/Styles/HTML-Struktur im Admin oder Setup?
- Falls ja: Vorgaben aus `STYLEGUIDE.md` zwingend anwenden.
- Betrifft die Aufgabe Setup-Flow, Setup-Routing oder Setup-API?
- Falls ja: `SETUP_TESTING.md` als Test- und Verhaltensreferenz verwenden.

## 3) Verbotene Direktänderung

- Keine manuellen Edits in `public/admin/compiler.browser.js`, außer das Ziel ist explizit: „kopiertes Build-Artefakt aus `../compiler/dist/compiler.browser.js` aktualisieren“.

## 4) Konsistenz-Regel

- Wenn Compiler-Output-Verhalten geändert wird, müssen Source-Änderung und aktualisiertes Bundle zusammen vorliegen.
- Wenn möglich, kurze Validierung ausführen (z. B. Syntax-Check) und im Ergebnis erwähnen.

## 5) Bei Unsicherheit

- Wenn unklar ist, ob eine Aufgabe den Compiler betrifft: konservativ handeln und zuerst `COMPILER_WORKFLOW.md` prüfen.

## 6) UI- und Design-Regeln sind verpflichtend

- Bei Änderungen an UI, CSS, Komponenten, Spacing, Farben oder Interaktionen immer `STYLEGUIDE.md` zuerst lesen.
- Keine neuen Design-Patterns einführen, wenn sie dem Styleguide widersprechen.
- Bestehende Tokens/Variablen/Komponenten bevorzugen statt neue ad-hoc Styles.

## 7) Setup-Änderungen müssen testbar sein

- Bei Änderungen an Setup-bezogenen Dateien (`/setup/*`, Routing-Weiterleitungen, Setup-Status-Logik) die Checkliste aus `SETUP_TESTING.md` berücksichtigen.
- Nach Möglichkeit relevante Setup-Checks kurz ausführen oder klar benennen, welche manuell zu prüfen sind.

## 8) Pflicht: Tests nach nicht-trivialen Änderungen

- Nach jeder **nicht-trivialen Code-Änderung** (Logik, Datenfluss, Rendering, API-Verhalten, Refactoring) müssen passende Tests ausgeführt werden.
- Bevorzugte Reihenfolge:
	1. zuerst zielgerichtete Tests für die geänderten Module/Dateien,
	2. danach (wenn sinnvoll verfügbar) ein breiterer Lauf, z. B. `npm test` oder `npm run test:coverage`.
- Ziel ist, Regressionsfehler früh zu erkennen; Testergebnisse kurz im Ergebnisbericht erwähnen.

### Definition: trivial vs. nicht-trivial

- **Trivial** = rein mechanische Änderungen ohne Verhaltensauswirkung (z. B. Rechtschreibung, Kommentare, reine Formatierung, Umbenennung ohne Logikänderung).
- **Nicht-trivial** = jede Änderung mit möglicher Verhaltensauswirkung (z. B. Bedingungen/Branches, Datenfluss/State, API-Handling, Rendering/Event-Logik, Fehlerpfade, Refactoring mit Funktionsumbau).
- **Daumenregel**: Wenn sich Nutzerverhalten, Rückgabewerte, Seiteneffekte oder Fehlerverhalten ändern **können**, gilt die Änderung als nicht-trivial.
- **Im Zweifel** immer als nicht-trivial einstufen und mindestens zielgerichtete Tests ausführen.
