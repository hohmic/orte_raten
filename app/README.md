# Südtirol-Raten (React)

React-18-/Vite-/TypeScript-Neuaufbau des Spiels „Südtirol-Raten“ mit vier Spielmodi: Orte, Gemeinden, Gipfel, Provinzen.

## Voraussetzungen

- Node.js (z. B. 18+) und npm

## Installation

```bash
cd app
npm install
```

## Entwicklung

```bash
npm run dev
```

Öffne im Browser die angezeigte URL (z. B. http://localhost:5173).

## Build

```bash
npm run build
```

Ausgabe in `dist/`.

## Routen

- `/` → Weiterleitung auf `/orte`
- `/orte` – Orte in Südtirol
- `/gemeinden` – Gemeinden
- `/gipfel` – Gipfel
- `/provinzen` – Provinzen in Italien

Tagesrätsel (Standard), Zufallsrätsel (`?game=12345`) und Archiv (`?day=2025-03-10`) werden über die Toolbar bzw. URL unterstützt.
