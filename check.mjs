import { readFileSync, existsSync, readdirSync } from 'fs';
const lire = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const T = [
  ['vite.config — Tailwind', lire('vite.config.js').includes('tailwindcss()')],
  ['vite.config — PWA', lire('vite.config.js').includes('VitePWA')],
  ['vite.config — pas de lock orientation', !lire('vite.config.js').includes("orientation: 'portrait'")],
  ['referentiels — ANNUAIRE', lire('src/apps/referentiels.js').includes('export const ANNUAIRE')],
  ['referentiels — PRV', lire('src/apps/referentiels.js').includes('export const PRV')],
  ['referentiels — POINTS_GPS', lire('src/apps/referentiels.js').includes('POINTS_GPS')],
  ['sos — repli sans GPS', lire('src/apps/sos.jsx').includes('LIEUX_MANUELS')],
  ['sos — blindage tableau', lire('src/apps/sos.jsx').includes('Array.isArray(brut)')],
  ['dashboard — acquittement SOS fusion', lire('src/apps/dashboard.jsx').includes('if (keyDb === KEY_SOS_PART)')],
  ['dashboard — operateur modifiable', lire('src/apps/dashboard.jsx').includes('OPERATEUR_KEY')],
  ['pcops — bilan interventions global', lire('src/apps/pcops.jsx').includes('BILAN DES INTERVENTIONS')],
  ['pcops — meteo couleur vigilance', lire('src/apps/pcops.jsx').includes('VIGILANCE_STYLE')],
  ['volante — libelle adaptatif', lire('src/apps/volante.jsx').includes('Rejoindre le foyer')],
  ['balade — cloture QG only', lire('src/apps/balade.jsx').includes('par le QG')],
  ['menu — pole RH', lire('src/apps/MenuApps.jsx').includes('Ressources humaines')],
  ['App — route benevoles', lire('src/App.jsx').includes('equipe-benevoles')],
  ['Console-CM — mode crise', lire('src/apps/Console-CM.jsx').includes('MODELES_CONSIGNE')],
  ['Benevoles — 17/08', lire('src/apps/Benevoles.jsx').includes('17/08')],
];
let ko = 0;
for (const [n, ok] of T) { if (!ok) ko++; console.log((ok ? '  OK     ' : '  ABSENT ') + n); }
const cors = readdirSync('src/apps').filter((f) => /\.(jsx|js)$/.test(f)).filter((f) => lire(`src/apps/${f}`).includes('credentials: "include"'));
console.log(cors.length === 0 ? '\nCORS : aucun credentials:"include" — OK' : `\n!!! CORS : ${cors.join(', ')}`);
const inv = [];
for (const f of readdirSync('src/apps')) { if (/\.(jsx|js)$/.test(f) && /[\u00a0\u200b\ufeff]/.test(lire(`src/apps/${f}`))) inv.push(f); }
for (const f of ['src/App.jsx', 'vite.config.js']) { if (/[\u00a0\u200b\ufeff]/.test(lire(f))) inv.push(f); }
console.log(inv.length === 0 ? 'Caracteres invisibles : aucun — OK' : `!!! INVISIBLES : ${inv.join(', ')}`);
console.log(ko === 0 && cors.length === 0 && inv.length === 0 ? '\n>>> VERSION A JOUR' : `\n>>> ${ko} manquant(s)`);
