import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/', // Racine absolue pour Vercel
  plugins: [react(), tailwindcss()],
})
