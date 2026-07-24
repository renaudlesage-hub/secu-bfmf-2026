import { readFileSync, existsSync, readdirSync } from 'fs';
const lire = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const T = [
  ['index.html — titre festival', lire('index.html').includes('Sécurité BFMF 2026')],
  ['index.html — pas le titre Vite', !lire('index.html').includes('Vite + React')],
  ['index.html — lang fr', lire('index.html').includes('lang="fr"')],
  ['index.html — favicon = logo Bucolique', lire('index.html').includes('/pwa-192x192.png') && !lire('index.html').includes('href="/favicon.svg"')],
  ['icone PWA 192', existsSync('public/pwa-192x192.png')],
  ['icone PWA 512', existsSync('public/pwa-512x512.png')],
  ['vite.config — Tailwind', lire('vite.config.js').includes('tailwindcss()')],
  ['vite.config — PWA', lire('vite.config.js').includes('VitePWA')],
  ['vite.config — pas de lock orientation', !lire('vite.config.js').includes("orientation: 'portrait'")],
  ['referentiels — ANNUAIRE', lire('src/apps/referentiels.js').includes('export const ANNUAIRE')],
  ['referentiels — PRV', lire('src/apps/referentiels.js').includes('export const PRV')],
  ['referentiels — POINTS_GPS', lire('src/apps/referentiels.js').includes('POINTS_GPS')],
  ['sos — repli sans GPS', lire('src/apps/sos.jsx').includes('LIEUX_MANUELS')],
  ['referentiels — trace GPX centralisee', lire('src/apps/referentiels.js').includes('export const TRACE')],
  ['referentiels — 207 points de trace', (lire('src/apps/referentiels.js').split('\n').length > 500)],
  ['sos — trace non dupliquee', !lire('src/apps/sos.jsx').includes('const TRACE = [')],
  ['balade — trace non dupliquee', !lire('src/apps/balade.jsx').includes('const TRACE = [')],
  ['balade — GPS en complement', lire('src/apps/balade.jsx').includes('watchPosition')],
  ['balade — GPS non bloquant', lire('src/apps/balade.jsx').includes('Pas de position GPS')],
  ['balade — position declaree conservee', lire('src/apps/balade.jsx').includes('LIEUX_PARCOURS')],
  ['dashboard — carte alerte balade', lire('src/apps/dashboard.jsx').includes('voir sur la carte')],
  ['balade — alerte balade tracable', lire('src/apps/balade.jsx').includes('KEY_INTERVENTIONS')],
  ['balade — lien anti-doublon', lire('src/apps/balade.jsx').includes('refAlerte: a.id')],
  ['pcops — pas de double comptage', lire('src/apps/pcops.jsx').includes('s.refAlerte === a.id')],
  ['volante — origine balade visible', lire('src/apps/volante.jsx').includes('Alerte balade')],
  ['sos — blindage tableau', lire('src/apps/sos.jsx').includes('Array.isArray(brut)')],
  ['dashboard — acquittement SOS fusion', lire('src/apps/dashboard.jsx').includes('if (keyDb === KEY_SOS_PART)')],
  ['dashboard — operateur modifiable', lire('src/apps/dashboard.jsx').includes('OPERATEUR_KEY')],
  ['pcops — bilan interventions global', lire('src/apps/pcops.jsx').includes('BILAN DES INTERVENTIONS')],
  ['pcops — meteo couleur vigilance', lire('src/apps/pcops.jsx').includes('VIGILANCE_STYLE')],
  ['volante — libelle adaptatif', lire('src/apps/volante.jsx').includes('Rejoindre le foyer')],
  ['balade — cloture QG only', lire('src/apps/balade.jsx').includes('par le QG')],
  ['vocabulaire — accompagnateur affiche', lire('src/apps/balade.jsx').includes('Accompagnateurs dehors')],
  ['vocabulaire — champ donnees preserve', lire('src/apps/balade.jsx').includes('encadrants: encadrants.filter')],
  ['menu — pole RH', lire('src/apps/MenuApps.jsx').includes('Ressources humaines')],
  ['App — route benevoles', lire('src/App.jsx').includes('equipe-benevoles')],
  ['Console-CM — mode crise', lire('src/apps/Console-CM.jsx').includes('MODELES_CONSIGNE')],
  ['Benevoles — 17/08', lire('src/apps/Benevoles.jsx').includes('17/08')],
  ['mode degrade — module file', existsSync('src/apps/file-attente.js')],
  ['mode degrade — indicateur', existsSync('src/apps/IndicateurReseau.jsx')],
  ['mode degrade — sos branche', lire('src/apps/sos.jsx').includes('envoyerAvecFile')],
  ['mode degrade — balade branche', lire('src/apps/balade.jsx').includes('envoyerAvecFile')],
  ['bandeau urgence — QUE_FAIRE', lire('src/apps/BandeauUrgence.jsx').includes('QUE_FAIRE')],
  ['carte officielle — PRV#4 corrige', lire('src/apps/referentiels.js').includes('50.38219, 5.63600')],
  ['carte officielle — ressources eau', lire('src/apps/referentiels.js').includes('RESSOURCES_EAU')],
  ['carte officielle — DEA', lire('src/apps/referentiels.js').includes('export const DEA')],
  ['carte officielle — zones helico', lire('src/apps/referentiels.js').includes('ZONES_HELICO')],
  ['carte officielle — voies acces', lire('src/apps/referentiels.js').includes('VOIES_ACCES')],
  ['pcops — integration carte', lire('src/apps/pcops.jsx').includes('EAU_CARTE')],
  ['dossier — segments/brancardage', lire('src/apps/referentiels.js').includes('SEGMENTS_PARCOURS')],
  ['dossier — adresses PRV', lire('src/apps/referentiels.js').includes('4190 Burnontige')],
  ['dossier — horaires', lire('src/apps/referentiels.js').includes('HORAIRES')],
  ['pcops — section brancardage', lire('src/apps/pcops.jsx').includes('BRANCARDAGE')],
  ['radio — numeros de canal', lire('src/apps/referentiels.js').includes('PROGRAMMATION_RADIO')],
  ['radio — PMR333 canal 6', lire('src/apps/referentiels.js').includes('num: 6')],
  ['radio — exception parking/sanit', lire('src/apps/referentiels.js').includes('RADIO_EXCEPTION')],
  ['dashboard — plan radio centralise', !lire('src/apps/dashboard.jsx').includes('const CANAUX_RADIO = [')],
  ['radios — memento centralise', !lire('src/apps/radios.jsx').includes('446.04375')],
  ['radios — pas de procedure reset', !lire('src/apps/radios.jsx').includes('Menu 40')],
  ['radio — deux programmations', lire('src/apps/referentiels.js').includes('POSTES_RADIO')],
  ['radio — PMR333 absent postes simples', lire('src/apps/referentiels.js').includes("PMR333 n'y est pas programm")],
  ['radio — table standard 25 canaux', lire('src/apps/referentiels.js').includes('PROGRAMMATION_RADIO')],
  ['radio — materiel', lire('src/apps/referentiels.js').includes('RADIO_MATERIEL')],
  ['referentiels — freq/ctcss', lire('src/apps/referentiels.js').includes('446.04375')],
];
let ko = 0;
for (const [n, ok] of T) { if (!ok) ko++; console.log((ok ? '  OK     ' : '  ABSENT ') + n); }
const cors = readdirSync('src/apps').filter((f) => /\.(jsx|js)$/.test(f)).filter((f) => lire(`src/apps/${f}`).includes('credentials: "include"'));
console.log(cors.length === 0 ? '\nCORS : aucun credentials:"include" — OK' : `\n!!! CORS : ${cors.join(', ')}`);
const inv = [];
for (const f of readdirSync('src/apps')) { if (/\.(jsx|js)$/.test(f) && /[\u00a0\u200b\ufeff]/.test(lire(`src/apps/${f}`))) inv.push(f); }
for (const f of ['src/App.jsx', 'vite.config.js']) { if (/[\u00a0\u200b\ufeff]/.test(lire(f))) inv.push(f); }
console.log(inv.length === 0 ? 'Caracteres invisibles : aucun — OK' : `!!! INVISIBLES : ${inv.join(', ')}`);

// --- Equilibre JSX : detecte les <div> non fermes -------------------
// Le comptage d'accolades ne voit PAS la nidification des balises.
// Un </div> en trop ou manquant casse le build sans qu'aucun autre
// controle ne le remarque. Ce test l'attrape.
const jsxPb = [];
for (const f of readdirSync('src/apps').filter((x) => x.endsWith('.jsx')).concat(['../App.jsx'])) {
  const p = f.startsWith('..') ? 'src/App.jsx' : `src/apps/${f}`;
  let s = lire(p);
  const i = s.indexOf('return (');
  if (i < 0) continue;
  s = s.slice(i);
  s = s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/[^\n]*/g, '');
  let avant = null;
  while (avant !== s) {           // retirer les balises auto-fermantes
    avant = s;
    s = s.replace(/<[A-Za-z][\w.]*(?:[^<>]|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*?\/>/g, '');
  }
  const ouv = (s.match(/<div(?:[^<>]|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*?>/g) || []).length;
  const fer = (s.match(/<\/div>/g) || []).length;
  if (ouv !== fer) jsxPb.push(`${p} (${ouv} <div> / ${fer} </div>)`);
}
console.log(jsxPb.length === 0 ? 'Equilibre JSX (div) : OK' : `!!! JSX DESEQUILIBRE : ${jsxPb.join(', ')}`);

console.log(ko === 0 && cors.length === 0 && inv.length === 0 && jsxPb.length === 0 ? '\n>>> VERSION A JOUR' : `\n>>> ${ko} manquant(s)`);
