## Südtirol-Raten

Fork/Nachbau von [Ciddle](https://ciddle.winklerweb.net/) für Südtirol. Datenbasis von OSM.

**Im Original:**  
Spielen unter z. B. [Orte raten](https://jrkager.github.io), [Gemeinden](https://jrkager.github.io/gemeinden.html), [Provinzen](https://jrkager.github.io/province.html), [Gipfel](https://jrkager.github.io/peaks.html).

**Dieser Fork:**  
Vektor-SVG-Karte, Lösungskarte (OpenStreetMap) nach dem Spiel, responsive für Desktop und Mobil. Modi: Orte, Gemeinden, Gipfel, Provinzen.

---

### Lokal testen

Wegen `fetch()` für die JSON-Daten braucht es einen lokalen Webserver. Im Projektordner (bzw. für die App in `app/`):

- **Python:** `python -m http.server 8000` (bzw. `py -m http.server 8000`) → Browser: http://localhost:8000  
- **Node/App:** `cd app` → `npm install` → `npm run dev` → angezeigte URL im Browser öffnen

In PowerShell Befehle mit `;` trennen, nicht mit `&&`.

---

### Deployment

Zum testweisen oder dauerhaften Deploy auf GitHub Pages (github.io) siehe **[DEPLOY-GITHUB-PAGES.md](DEPLOY-GITHUB-PAGES.md)**.
