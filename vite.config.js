import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// vite.config.js
export default defineConfig({
  base: './', // <-- LIGNE CRUCIALE pour éviter les erreurs 404 du CSS
  plugins: [react()],
})
