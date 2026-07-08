# Plateforme sécurité — Bucolique Ferrières Musique Festival 2026

5 applications reliées par une base Supabase commune :

| Route | App | Usage |
|---|---|---|
| `#dashboard` | Dashboard QG | Synthèse lecture seule : SOS, logistique, balade, météo, engagement volante |
| `#logistique` | Missions logistiques | Saisie (remplace le Google Form), attribution, suivi, export CSV/REX |
| `#balade` | Suivi balade | Crowd management du parcours 6,5 km, groupes, jauges d'étapes, SOS équipe |
| `#volante` | App Volante | Consignes QG, guidage GPS (PRV, victimes, missions) |
| `#pcops` | PC-Ops / Autorité | **Lecture seule** — vue de situation consolidée pour les autorités |
| `#sos` | SOS Participants | **Public** — géolocalisation sur la trace GPX, à diffuser par QR code |

## Mise en route (10 min)

1. **Supabase** : créez un projet gratuit sur supabase.com, ouvrez *SQL Editor*,
   collez le contenu de `supabase-setup.sql`, cliquez *Run*.
2. **Clés** : *Settings → API* → copiez *Project URL* et la clé *anon/public*
   dans `src/config.js` (unique fichier à modifier).
3. **Test** : lancez la preview StackBlitz, ouvrez `#logistique`, créez une
   demande, vérifiez qu'elle apparaît sur `#dashboard` (~10 s).

## Déploiement production

StackBlitz sert au développement/test. Pour le festival, déployez sur
Vercel ou Netlify (HTTPS obligatoire pour la géolocalisation) :
- Vercel : importez le repo ou `npx vercel` depuis le dossier
- Netlify : build `npm run build`, publiez le dossier `dist/`

## Règles d'usage (briefing équipes)

- **112 d'abord** pour toute urgence vitale, puis PMR333. Les apps
  complètent la radio, elles ne la remplacent pas.
- Le clic « Prendre en compte » (dashboard) envoie la réassurance au
  participant en détresse : il n'est pas administratif.
- Ne diffusez publiquement QUE le lien `#sos`. Les autres apps restent
  dans l'équipe (pas d'authentification forte : sécurité = lien secret + RLS).
- Export CSV logistique chaque soir (sauvegarde + REX).

## Limites connues

- Stockage « un bloc JSON par app » : si deux personnes enregistrent au
  même instant, la dernière écriture gagne (rare, mais possible).
- Guidage GPS à vol d'oiseau : direction et distance vraies, chemin à
  adapter au terrain.
- Météo IRM et veille médias : données simulées, à connecter (meteo.be
  sur demande, outil de social listening).
