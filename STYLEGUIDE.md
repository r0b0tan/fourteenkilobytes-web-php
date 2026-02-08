# Fourteenkilobytes Design System & Styleguide

**Version:** 1.0  
**Zielgruppe:** KI-Assistenten und Entwickler für konsistente UI-Änderungen

---

## Designphilosophie

Das Fourteenkilobytes CMS folgt einem **minimalistischen, funktionalen Designansatz** mit folgenden Prinzipien:

- **Byte-Effizienz**: Jedes Byte zählt – kompaktes, aber lesbares Design
- **Klarheit vor Dekor**: Funktion steht im Vordergrund, keine unnötigen Verzierungen
- **System-Fonts**: Verwendung von nativen Schriftarten für schnelles Laden
- **Subtile Interaktionen**: Sanfte Übergänge (0.15s ease), keine aufdringlichen Animationen
- **Konsistentes Spacing**: 8px-Basis-Raster (4px, 8px, 12px, 16px, 24px, 32px)

---

## Farbsystem

### CSS Custom Properties

Alle Farben sind über CSS-Variablen definiert (`style.css` Zeilen 1-31):

```css
:root {
  /* Graustufen - Basis-Palette */
  --black: #000000;
  --gray-900: #1a1a1a;
  --gray-800: #2d2d2d;
  --gray-700: #404040;
  --gray-600: #525252;
  --gray-500: #737373;
  --gray-400: #a3a3a3;
  --gray-300: #d4d4d4;
  --gray-200: #e5e5e5;
  --gray-100: #f5f5f5;
  --white: #ffffff;

  /* Akzentfarbe - Teal/Türkis */
  --accent: #0d9488;
  --accent-hover: #0f766e;
  --accent-alpha-15: rgba(13, 148, 136, 0.12);
  --accent-alpha-40: rgba(13, 148, 136, 0.25);

  /* Semantische Mappings */
  --bg: var(--white);
  --fg: var(--gray-900);
  --border: var(--gray-300);
  --input-bg: var(--white);
  --card-header-bg: var(--gray-100);

  /* Text-Hierarchie */
  --text-primary: var(--gray-900);
  --text-secondary: var(--gray-600);
  --text-muted: var(--gray-500);
}
```

### Farbverwendung

| Anwendung | CSS-Variable | Hex-Wert | Verwendung |
|-----------|--------------|----------|------------|
| **Primär-Aktion** | `--accent` | `#0d9488` | Buttons, Links, aktive Zustände |
| **Hover-Zustand** | `--accent-hover` | `#0f766e` | Hover auf Primär-Elementen |
| **Hintergrund Highlight** | `--accent-alpha-15` | `rgba(13, 148, 136, 0.12)` | Aktive Tabs, subtile Highlights |
| **Primär-Text** | `--text-primary` | `#1a1a1a` | Überschriften, wichtiger Text |
| **Sekundär-Text** | `--text-secondary` | `#525252` | Labels, Metadaten |
| **Gedämpfter Text** | `--text-muted` | `#737373` | Platzhalter, unwichtige Info |
| **Borders** | `--border` | `#d4d4d4` | Rahmen, Trennlinien |
| **Hintergrund** | `--bg` / `--white` | `#ffffff` | Karten, Eingabefelder |
| **Section-Hintergrund** | `--gray-100` | `#f5f5f5` | Override-Sections, Editoren |

### Spezielle Farben

```css
/* Danger/Fehler - NUR direkt verwenden, KEINE Variable */
color: #dc2626;           /* Danger-Button */
background: #fef2f2;      /* Danger-Hover-BG */

/* Logo-Akzent - leicht aufgehellt */
color: #14b8a6;           /* Logo, externe Links */
background: rgba(16, 168, 155, 0.12); /* Logo-Container */
```

**WICHTIG:** Danger-Farben haben **keine CSS-Variable** – immer Hex-Werte verwenden!

---

## Typografie

### Schriftarten

```css
/* Basis - System UI Stack */
font-family: system-ui, -apple-system, sans-serif;

/* Monospace - Code & Daten */
font-family: ui-monospace, "SF Mono", "Consolas", "Menlo", monospace;
```

### Textgrößen & Gewichte

| Element | Font-Size | Font-Weight | Line-Height | Anwendung |
|---------|-----------|-------------|-------------|-----------|
| **Seitentitel (h1)** | `22px` | `600` | `1.6` | Hauptüberschrift |
| **Unterüberschrift (h2)** | `18px` | `500` | `1.6` | Sektionsüberschriften |
| **Normaler Text** | `15px` | `400` | `1.6` | Body, Inputs, Textarea |
| **Labels** | `13px` | `500` | `1.6` | Form-Labels, Buttons |
| **Metadaten** | `12px` | `400` | `1.6` | Post-Meta, Hinweise |
| **Monospace-Daten** | `11px` | `400` | `1.6` | Byte-Anzeigen, Rails |
| **Card-Titel** | `14px` | `600` | `1.6` | `text-transform: uppercase` |

### Text-Stile

```css
/* Labels - immer gleich formatiert */
label {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
  font-size: 13px;
}

/* Card-Titel - große Sektion */
.card-title {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

/* Logo-Text - spezielle Formatierung */
.logo-text {
  font-size: 13px;
  line-height: 1.1;
  font-family: ui-monospace, monospace;
  font-weight: 600;
  letter-spacing: 0.05em;
  opacity: 0.55;
}
```

---

## Spacing & Layout

### Spacing-Skala (8px-Basis)

Alle Abstände folgen einem 8px-Raster:

```css
/* Margins & Paddings */
4px   → kleine Lücken zwischen Icons
6px   → Icon-Text-Gap
8px   → Standard-Gap, kleine Paddings
12px  → mittlere Abstände, Card-Paddings
16px  → Form-Gruppen, Grid-Gaps
24px  → Sektion-Abstände, große Margins
32px  → Body-Padding, Header-Margins
```

### Container & Karten

```css
/* Body - zentrale Container */
body {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px;
}

/* Editor Cards - Haupt-Content-Container */
.editor-card {
  background: var(--input-bg);
  border: 1px solid #c4c4c4;  /* Bewusst NICHT --border, sondern dunkler! */
  border-radius: 8px;
  margin-bottom: 24px;
}

.card-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-body {
  padding: 16px;
}
```

### Grid-Layouts

```css
/* Standard 2-Spalten Form */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* 3-Spalten Basis-Daten */
.base-data-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr;
  gap: 16px;
}

/* Meta-Felder (Beschreibung + Autor) */
.meta-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}
```

---

## Komponenten

### Buttons

#### Basis-Button
```css
button, .btn {
  display: inline-block;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  background: var(--white);
  color: var(--text-primary);
  transition: background 0.15s, border-color 0.15s;
}

button:hover {
  background: var(--gray-100);
  border-color: var(--gray-400);
}
```

#### Button-Varianten

**Primary (Hauptaktion - Save, Submit):**
```css
.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--white);
}
.btn-primary:hover {
  background: var(--accent-hover);
}
```

**Secondary (Alternative Aktion):**
```css
.btn-secondary {
  background: var(--white);
  border-color: var(--accent);
  color: var(--text-primary);
}
.btn-secondary:hover {
  background: var(--accent-alpha-15);
}
```

**Danger (Löschen, destruktive Aktionen):**
```css
.btn-danger {
  background: var(--white);
  border-color: #dc2626;
  color: #dc2626;
}
.btn-danger:hover {
  background: #fef2f2;
  border-color: #b91c1c;
  color: #b91c1c;
}
```

**Small (kompakte Buttons):**
```css
.btn-small {
  padding: 4px 8px;
  font-size: 12px;
}
```

#### Button mit Icon
```css
.btn-icon {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
```

```html
<button class="btn btn-primary btn-icon">
  <svg>...</svg>
  Save
</button>
```

### Forms

#### Input-Felder
```css
input[type="text"],
input[type="password"],
input[type="url"],
input[type="number"],
textarea,
select {
  width: 100%;
  padding: 8px;
  font-size: 15px;
  font-family: inherit;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-primary);
}

input:focus {
  outline: none;
  border-color: var(--accent);
}
```

#### Textarea
```css
textarea {
  min-height: 100px;
  resize: vertical;
  font-family: ui-monospace, monospace;
  font-size: 13px;
}
```

#### Select-Dropdowns
```css
select {
  appearance: none;
  padding-right: 24px;
  background-image: url("data:image/svg+xml,..."); /* Chevron-Down */
  background-repeat: no-repeat;
  background-position: right 5px center;
}
```

#### Checkbox
```css
input[type="checkbox"] {
  accent-color: #10a697;
}
```

#### Form-Gruppen
```css
.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
  font-size: 13px;
}
```

### Tabs

**Klassenbasierte Tabs** (nicht Modern Pill-Style):

```css
.settings-tabs,
.dashboard-tabs {
  display: flex;
  gap: 0;
  position: relative;
  bottom: -1px;
}

.tab-btn {
  background: var(--gray-100);
  border: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  color: var(--text-muted);
  padding: 8px 16px;
  font-weight: 500;
  font-size: 13px;
  border-radius: 4px 4px 0 0;
  margin-right: -1px;
}

.tab-btn:hover {
  background: var(--gray-200);
  color: var(--text-primary);
}

.tab-btn.active {
  background: var(--white);
  color: var(--text-primary);
  border-bottom-color: var(--white);
  z-index: 1;
}
```

**Tab-Content:**
```css
.tab-content {
  min-height: 100px;
}

.tab-content.hidden {
  display: none;
}
```

**Card-Body nach Tabs:**
```css
.card-header:has(.settings-tabs) + .card-body {
  border: 1px solid var(--border);
  border-radius: 0 4px 4px 4px; /* Oben-links kein Radius */
  background: var(--white);
}
```

### Navigation

#### Header-Navigation (Icon-Style)
```css
.header-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-icon {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: color 0.15s ease, background 0.15s ease;
}

.nav-icon:hover {
  color: var(--accent);
  background: var(--accent-alpha-15);
}

.nav-icon.active {
  color: var(--accent);
  background: var(--accent-alpha-15);
}
```

#### Navigation-Chips (für Links)
```css
.nav-links {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.nav-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 500;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: grab;
  height: 34px;
  box-sizing: border-box;
}

.nav-chip::before {
  content: "⠿";
  color: var(--gray-400);
  font-size: 12px;
}

.nav-chip:hover {
  background: var(--gray-100);
  border-color: var(--gray-400);
}
```

### Override-Sections

Spezielle Sections für Settings (Header, Footer, Meta, etc.):

```css
.override-section {
  padding: 12px 0;
}

.override-section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Editoren mit grauem Hintergrund */
#header-editor,
#footer-editor,
#nav-editor,
#meta-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--gray-100);
  border-radius: 6px;
}
```

### Post-Liste

```css
.posts-list {
  list-style: none;
}

.posts-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.post-info {
  flex: 1;
}

.post-title {
  font-weight: 500;
}

.post-title a {
  color: var(--fg);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color 0.15s ease;
}

.post-title a:hover {
  color: var(--accent);
}

.post-meta {
  font-size: 12px;
  color: var(--text-muted);
}

.post-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
```

### Suche & Filtern

```css
.list-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.search-box {
  position: relative;
}

.search-box .search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.search-box input {
  width: 160px;
  padding: 6px 8px 6px 30px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: 4px;
}
```

### Dropdowns

```css
.actions-dropdown {
  position: relative;
}

.actions-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 160px;
  display: none;
}

.actions-dropdown.open .actions-dropdown-menu {
  display: block;
}

.actions-dropdown-menu a,
.actions-dropdown-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  background: none;
  border: none;
  text-decoration: none;
  color: var(--text-primary);
}

.actions-dropdown-menu a:hover {
  background: var(--gray-100);
}
```

### Modals

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 320px;
  max-width: 400px;
}
```

---

## Icons

### Icon-System

- **Quelle:** Feather Icons (oder ähnliches einfaches Icon-Set)
- **Größe Standard:** `16px × 16px` (viewBox="0 0 24 24")
- **Stroke-Width:** `2`
- **Style:** `stroke="currentColor"` für automatische Farbanpassung

### Icon-Verwendung

```html
<!-- Icon in Button -->
<button class="btn btn-icon">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="..."/>
  </svg>
  Label
</button>

<!-- Icon in Navigation -->
<a href="#" class="nav-icon">
  <svg width="16" height="16">...</svg>
  Overview
</a>
```

### Häufige Icons

| Icon | Verwendung | Klasse |
|------|------------|--------|
| **Save (Floppy Disk)** | Save-Button | `.btn-primary` |
| **Home** | Overview-Link | `.nav-icon` |
| **Plus** | New-Button | `.btn` |
| **Settings (Gear)** | Settings-Link | `.nav-icon` |
| **External Link** | Blog-Link | `.nav-icon.external-link` |
| **Logout (Arrow-Right)** | Logout-Link | `.nav-icon.logout-icon` |
| **Trash** | Delete-Button | `.btn-danger` |
| **Search** | Suchfeld | `.search-icon` |
| **Calendar** | Datum-Filter | in `.list-controls` |

---

## Interaktionen & Transitions

### Standard-Transitions

```css
/* Alle interaktiven Elemente */
transition: color 0.15s ease, background 0.15s ease;

/* Links */
transition: color 0.15s ease;

/* Buttons mit mehreren Properties */
transition: background 0.15s, border-color 0.15s;
```

**Regel:** Immer `0.15s ease` verwenden (nicht `0.2s`, nicht `ease-in-out`).

### Hover-Zustände

```css
/* Links */
a:hover {
  color: var(--accent);
}

/* Buttons */
button:hover {
  background: var(--gray-100);
  border-color: var(--gray-400);
}

/* Primary Button */
.btn-primary:hover {
  background: var(--accent-hover);
}

/* Navigation Icons */
.nav-icon:hover {
  color: var(--accent);
  background: var(--accent-alpha-15);
}
```

### Disabled States

```css
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

input:disabled {
  opacity: 0.6;
  pointer-events: none;
}
```

---

## Benennungskonventionen

### BEM-ähnliche Struktur

```css
/* Block */
.editor-card { }

/* Element */
.card-header { }
.card-body { }
.card-title { }

/* Modifier */
.btn-primary { }
.btn-secondary { }
.btn-danger { }
.btn-small { }
```

### Semantische Namen

```css
/* GUT */
.nav-icon
.post-actions
.settings-tabs
.override-section

/* SCHLECHT */
.green-button
.big-box
.left-side
```

### Zustandsklassen

```css
.active    /* aktiver Tab, aktiver Link */
.hidden    /* unsichtbar */
.open      /* geöffnetes Dropdown */
.disabled  /* deaktiviert */
.dragging  /* während Drag-Operation */
```

---

## Layout-Patterns

### Dashboard/Overview-Layout

```html
<main>
  <h1 class="page-title">Overview</h1>
  
  <div class="editor-card">
    <div class="card-header">
      <div class="dashboard-tabs">
        <button class="tab-btn active">Posts</button>
        <button class="tab-btn">Pages</button>
        <button class="tab-btn">Archive</button>
      </div>
      <div class="list-controls">
        <div class="search-box">
          <svg class="search-icon">...</svg>
          <input type="text" placeholder="Search...">
        </div>
        <select>
          <option>10</option>
          <option>25</option>
        </select>
      </div>
    </div>
    <div class="card-body">
      <!-- Content -->
    </div>
  </div>
</main>
```

### Settings-Layout mit Tabs

```html
<main>
  <h1 class="page-title">Settings</h1>
  
  <div class="editor-card">
    <div class="card-header">
      <div class="settings-tabs">
        <button class="tab-btn active">General</button>
        <button class="tab-btn">Header</button>
        <button class="tab-btn">Footer</button>
        <!-- mehr Tabs -->
      </div>
      <div class="settings-actions">
        <button class="btn btn-primary btn-icon">
          <svg>...</svg>
          Save
        </button>
      </div>
    </div>
    <div class="card-body">
      <div class="tab-content">
        <!-- Tab-Inhalt -->
      </div>
    </div>
  </div>
</main>
```

### Editor-Layout (Seiten bearbeiten)

```html
<div class="editor-card">
  <div class="card-header">
    <h2 class="card-title">Metadata</h2>
  </div>
  <div class="card-body">
    <!-- 3-Spalten Basis-Daten -->
    <div class="base-data-row">
      <div class="form-group">
        <label>Title</label>
        <input type="text">
      </div>
      <div class="form-group">
        <label>Slug</label>
        <input type="text">
      </div>
      <div class="form-group">
        <label>Type</label>
        <select>...</select>
      </div>
    </div>
    
    <!-- Override Section -->
    <div class="override-section">
      <div class="override-section-title">META</div>
      <label class="override-toggle">
        <input type="checkbox">
        Enable meta
      </label>
      <div class="override-editor" id="meta-editor">
        <div class="meta-row">
          <div class="form-group">
            <label>Description</label>
            <input type="text">
          </div>
          <div class="form-group">
            <label>Author</label>
            <input type="text">
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## Do's & Don'ts

### ✅ DO

- **CSS-Variablen verwenden** für Farben (`var(--accent)`, `var(--text-primary)`)
- **Konsistente Abstände** aus dem 8px-Raster verwenden
- **`0.15s ease` Transitions** für alle Interaktionen
- **Semantische Klassennamen** verwenden (`.nav-icon`, nicht `.blue-link`)
- **`flex` oder `grid`** für Layouts verwenden
- **`font-size: 13px`** für Buttons und Labels
- **`border-radius: 4px`** für Buttons, Inputs, Cards (außer Card-border-radius: 8px)
- **Icons mit `currentColor`** für automatische Farbvererbung
- **`gap` für Flexbox/Grid-Abstände** (nicht margin)

### ❌ DON'T

- **KEINE festen Hex-Farben** für Standard-Elemente (Ausnahme: Danger-Farben)
- **KEINE `transition-duration` größer als `0.15s`**
- **KEINE Abstände außerhalb des 8px-Rasters** (kein 5px, 15px, 20px)
- **KEINE absolute Positionierung** für normales Layout (nur Dropdowns, Modals)
- **KEINE Font-Imports** – nur system-fonts
- **KEINE `float`-basierten Layouts** – nur flex/grid
- **KEINE unterschiedlichen Border-Radius** für ähnliche Komponenten
- **KEINE `!important`** außer für `.hidden`-Klasse
- **KEINE Icon-Größen größer als `27px`** (Logo-Exception)

---

## Spezielle Hinweise für KI

### Wenn du Buttons anpasst:
- Prüfe ob Primary (`btn-primary`), Secondary (`btn-secondary`) oder Danger (`btn-danger`)
- Alle Buttons haben `font-size: 13px` und `font-weight: 500`
- Icons in Buttons bekommen `gap: 4px` via `.btn-icon`

### Wenn du Tabs erstellst:
- Verwende die klassischen Tab-Styles (`.tab-btn`), **NICHT** moderne Pill-Styles
- Aktiver Tab: `background: var(--white)` + `border-bottom-color: var(--white)`
- Tab-Content danach bekommt `border-radius: 0 4px 4px 4px`

### Wenn du Forms baust:
- Labels sind **immer** `font-size: 13px` und `font-weight: 500`
- Inputs sind **immer** `font-size: 15px`
- Form-Groups haben **immer** `margin-bottom: 24px`
- Textareas bekommen Monospace-Font

### Wenn du mit Farben arbeitest:
- **Prüfe zuerst** ob es eine CSS-Variable gibt
- Für Danger/Error: verwende direkt `#dc2626` (keine Variable!)
- Für transparente Akzente: `var(--accent-alpha-15)`

### Wenn du Spacing anpasst:
- **Verwende nur:** 4px, 6px, 8px, 12px, 16px, 24px, 32px
- Bevorzuge `gap` über `margin` in flex/grid-Containern

### Wenn du Icons einfügst:
- Standard-Größe: `width="16" height="16"`
- Immer `stroke="currentColor"` für automatische Farbe
- In `.nav-icon`: Icon kommt **vor** dem Text

---

## Responsive Verhalten

**WICHTIG:** Das aktuelle Design ist **Desktop-First** ohne explizite Mobile-Breakpoints.

Wenn Responsive-Anpassungen nötig werden:
- Breakpoint: `1024px` für Tablets
- Breakpoint: `768px` für Mobile
- Verwende `min-width` Media Queries

---

## Accessibility

### Semantisches HTML
```html
<!-- GUT -->
<button type="button">Click</button>
<a href="/page">Link</a>
<label for="title">Title</label>

<!-- SCHLECHT -->
<div onclick="...">Click</div>
<span class="link">Link</span>
```

### Focus States
Alle interaktiven Elemente haben Focus-States:
```css
input:focus,
button:focus {
  outline: none;
  border-color: var(--accent);
}
```

### Visuell versteckt
```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
```

---

## Browser-Support

- **Modern Browsers:** Chrome, Firefox, Safari, Edge (aktuelle Versionen)
- **CSS Features:** CSS Grid, Flexbox, Custom Properties (erforderlich)
- **KEINE Unterstützung:** IE11 und älter

---

## Zusammenfassung Für Schnelle Referenz

| Aspekt | Wert | Notizen |
|--------|------|---------|
| **Primärfarbe** | `--accent` (#0d9488) | Teal/Türkis |
| **Hover-Farbe** | `--accent-hover` (#0f766e) | |
| **Text** | `--text-primary` (#1a1a1a) | |
| **Border** | `--border` (#d4d4d4) | |
| **Transition** | `0.15s ease` | Immer! |
| **Border-Radius Buttons** | `4px` | |
| **Border-Radius Cards** | `8px` | |
| **Font-Size Body** | `15px` | |
| **Font-Size Buttons** | `13px` | |
| **Font-Size Labels** | `13px` | |
| **Font-Weight Labels** | `500` | |
| **Spacing-Basis** | `8px` | 4, 8, 12, 16, 24, 32 |
| **Max-Width Body** | `1120px` | Zentriert |

---

**Bei Unsicherheit:** Lies die `style.css` oder schaue dir bestehende Komponenten im Code an.
