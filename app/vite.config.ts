import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Für GitHub Pages unter Unterpfad (z. B. /orte_raten/): BASE_PATH=/orte_raten/ setzen
const base = process.env.BASE_PATH ?? './'

export default defineConfig({
  plugins: [react()],
  base,
})
