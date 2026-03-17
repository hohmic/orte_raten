var _a;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Für GitHub Pages unter Unterpfad (z. B. /orte_raten/): BASE_PATH=/orte_raten/ setzen
var base = (_a = process.env.BASE_PATH) !== null && _a !== void 0 ? _a : './';
export default defineConfig({
    plugins: [react()],
    base: base,
});
