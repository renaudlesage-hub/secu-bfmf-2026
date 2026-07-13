import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// vite.config.js
export default defineConfig({
  base: './', // Utilise des chemins relatifs pour éviter les erreurs 404
  plugins: [react()],
});
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ]
})