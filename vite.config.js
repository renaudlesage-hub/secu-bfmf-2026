import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/* ---------------------------------------------------------------------
   PREREQUIS : npm install -D vite-plugin-pwa
   (sinon le build echoue sur "Cannot find module 'vite-plugin-pwa'")

   CHOIX DE CONCEPTION -- IMPORTANT POUR UNE PLATEFORME DE SECURITE :
   - On precache la COQUILLE de l'app (JS/CSS/HTML/polices) : les apps se
     lancent meme sans reseau -> fiche reflexe, PRV, numeros consultables.
   - On NE MET PAS EN CACHE les reponses Supabase (NetworkOnly explicite) :
     un cache renverrait des donnees perimees SANS que l'app le sache, donc
     sans son bandeau "Reseau instable". Un SOS vieux d'une heure affiche
     comme actuel est plus dangereux qu'une absence de donnee.
   - PAS de backgroundSync sur les ecritures : le modele de stockage est
     "1 bloc JSON par cle, derniere ecriture gagnante". Rejouer une ecriture
     differee ecraserait tout ce qui a ete ecrit entre-temps (SOS, consignes).
--------------------------------------------------------------------- */

export default defineConfig({
  base: '/', // Racine absolue pour Vercel
  plugins: [
    react(),
    tailwindcss(), // NE JAMAIS RETIRER : sans lui, plus aucun style (Tailwind v4)
    VitePWA({
      registerType: 'autoUpdate', // la nouvelle version prend la main au rechargement
      includeAssets: ['favicon.svg', 'icons.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html', // routes #hash disponibles hors ligne
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Supabase : TOUJOURS le reseau. Pas de cache = pas de fausse donnee.
            urlPattern: /^https:\/\/iisovgzwewwxwrwqtkhy\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Polices Google : cache long (confort hors ligne, aucun risque)
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Sécurité BFMF 2026 — QG & Terrain',
        short_name: 'Sécu BFMF',
        description: 'Plateforme de gestion et de supervision du Bucolique Ferrières Musique Festival 2026',
        theme_color: '#0f1319',
        background_color: '#0f1319',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
