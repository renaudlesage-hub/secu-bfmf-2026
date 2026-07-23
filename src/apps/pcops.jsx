import React, { useState, useEffect } from "react";
import {
  Landmark,
  TriangleAlert,
  Clock,
  Footprints,
  MapPin,
  CircleDot,
  CheckCircle2,
  Users,
  PhoneCall,
  ExternalLink,
  AlertTriangle,
  Sun,
  Sunset,
  FileText,
  Radio,
  Megaphone,
  UserSearch,
  LifeBuoy,
  Map as MapIcon,
  ShieldAlert,
  Zap,
  Droplets,
  HeartPulse,
  Navigation,
  Flag,
  Truck,
} from "lucide-react";
import {
  STATUT_RESOLU, estUrgente, priorite, ANNUAIRE, PRV as PRV_LIST, RADIO_PLAN,
  RESSOURCES_EAU as EAU_CARTE, DEA, ZONES_HELICO, VOIES_ACCES, BORNES_KM,
  SEGMENTS_PARCOURS, HORAIRES, FREQUENTATION, PROGRAMMATION_RADIO, RADIO_EXCEPTION, POSTES_RADIO,
} from "./referentiels";
import { SUPABASE_URL, SUPABASE_ANON_KEY, myMapsUrl, MYMAPS_MID } from "../config";

/* ---------------------------------------------------------------------
   PC-OPS / AUTORITE -- BFMF 2026
   Vue de situation EN LECTURE SEULE destinée aux autorités (commune,
   discipline coordination) : événements en cours consolidés (SOS
   participants filtrés, alertes équipes, urgences logistiques), statut,
   localisation, gravité, et situation crowd management du parcours.
   Aucune action possible depuis cette vue : l'engagement reste au QG.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

async function kvGet(key) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: SB_HEADERS, credentials: "omit" }
  );
  if (!r.ok) throw new Error("GET " + r.status);
  const j = await r.json();
  return j.length ? j[0].value : null;
}

const KEY_MISSIONS = "bfmf2026-missions-logistique";
const KEY_GROUPES = "bfmf2026-suivi-balade";
const KEY_ALERTE_LOG = "bfmf2026-logistique-alerte";
const KEY_ALERTE_BAL = "bfmf2026-suivi-balade-alerte";
const KEY_SOS_PART = "bfmf2026-sos-participants";
const KEY_CONSIGNE = "bfmf2026-volante-consigne";
const KEY_METEO = "bfmf2026-meteo";
const KEY_CRISE = "bfmf2026-crise";
const KEY_RECH = "bfmf2026-recherche";
const KEY_JAUGE = "bfmf2026-jauge";

const CAPACITE_SITE = 1500; // a ajuster selon le dossier de securite

/* =====================================================================
   ONGLET DOSSIER -- contenu de reference pour les autorites.
   >>> C'EST ICI QUE L'ON MET A JOUR : liens Drive, numeros, PC.
   Partage Drive requis : "Tous les utilisateurs disposant du lien -> Lecteur",
   sinon les destinataires tombent sur une demande d'acces.
===================================================================== */

const DOCUMENTS = [
  {
    titre: "Dossier de sécurité BFMF 2026",
    desc: "Dispositif complet : implantation, effectifs, procédures, analyse de risques.",
    url: "https://docs.google.com/document/d/1AKBVDT6yO-ubdPxrYnfMJjLFnw2l6p-B/preview",
  },
  {
    titre: "PPUI — Plan Particulier d'Urgence et d'Intervention",
    desc: "Plan d'urgence de l'événement : scénarios, alerte, montée en puissance, disciplines.",
    url: "https://docs.google.com/document/d/1MzOi61IGcpgcFyxcCFJUWxyhi78mxZBP/preview",
  },
  {
    titre: "Plan d'implantation / plan de site",
    desc: "À COMPLÉTER : coller ici le lien de partage Drive.",
    url: "",
  },
  {
    titre: "Carte opérationnelle « Buco 2026 »",
    desc: "Parcours 6,5 km, étapes, PRV, points GPS (Google My Maps).",
    url: `https://www.google.com/maps/d/viewer?mid=${MYMAPS_MID}`,
  },
];




/* =====================================================================
   ONGLET INTERVENTION -- ce que demande un Dir-PC-Ops en arrivant de nuit.
   TOUT EST STATIQUE : reste affiche meme si la liaison Supabase tombe.
   >>> A RENSEIGNER DEPUIS LE DOSSIER DE SECURITE ET LE PPUI. Tant que les
   champs portent "A COMPLETER", ils s'affichent en ambre : mieux vaut un
   trou visible qu'une information fausse.
===================================================================== */

const ACCES_SECOURS = [
  {
    nom: "Accès principal — À COMPLÉTER",
    gps: "50.3835, 5.6215",
    detail: "À COMPLÉTER : rue exacte, largeur utile, portail/barrière, revêtement, pente.",
    vehicules: "À COMPLÉTER : autopompe ? ambulance ? grue ?",
    cle: "À COMPLÉTER : cadenas ? qui détient la clé ? joignable comment ?",
  },
  {
    nom: "Accès parcours — voies secours balisées (carte officielle)",
    gps: "50.38219, 5.63600",
    detail: "3 voies d'accès depuis les PRV vers les scènes : Scène 1 par PRV#4 (721 m), "
      + "Scène 2 par PRV#5 ressortant au PRV#6 (752 m), Scène 3 par PRV#7 (131 m). "
      + "À COMPLÉTER : praticabilité 4x4, largeur utile, état par temps de pluie.",
    vehicules: "À COMPLÉTER : ces voies sont-elles carrossables autopompe / ambulance ?",
    cle: "À COMPLÉTER : barrière ou cadenas sur ces voies ?",
  },
];

const POINT_RENCONTRE = {
  lieu: "PRV#1 — Entrée site / Départ (Croisement Le Raumont – Chemin de l'Épine)",
  gps: "50.38242, 5.61624",
  qui: "Renaud — Coordinateur sécurité",
  tel: "0494 22 29 33",
  suppleant: "Jérôme — Directeur d'événement · 0477 99 48 42",
};

const RISQUES_SITE = [
  { titre: "Foodtrucks — bonbonnes de gaz", detail: "À COMPLÉTER : nombre, emplacement, vanne de coupure, distance aux scènes." },
  { titre: "Alimentation électrique / groupes électrogènes", detail: "Les scènes de la balade sont alimentées par GROUPES ÉLECTROGÈNES (dossier § 11) — pas de raccordement réseau, donc pas de réception électrique SECT sur ces points. Site principal : réception électrique par SECT agréé. À COMPLÉTER : emplacement exact, puissance, organe de coupure générale (qui, où)." },
  { titre: "Structures scéniques", detail: "Balade : installations < 250 m² au sol, aucun risque de chute ≥ 2 m (pas de réception mécanique). Site principal : réception mécanique par SECT agréé. À COMPLÉTER : hauteur, PV de montage, seuil de vent d'arrêt (km/h)." },
  { titre: "Pyrotechnie / effets", detail: "À COMPLÉTER : prévu ou non. Si oui : opérateur, horaires, périmètre." },
  { titre: "Public — jauge et évacuation", detail: "À COMPLÉTER : capacité plaine, largeur des sorties, points de rassemblement." },
  { titre: "Parcours balade — 6,5 km", detail: "Boisé, non éclairé. AUCUN éclairage de secours sur les lieux de concert de la balade (milieux ouverts, dossier § 11) : prévoir l'éclairage individuel pour tout retour après le coucher du soleil. Jusqu'à plusieurs centaines de personnes réparties sur le tracé. Accès secours par les PRV#4 à #7." },
];

// Ressources en eau : liste issue de la carte officielle (calque Pompiers).
// Le debit de chaque hydrant reste a documenter aupres de la zone de secours.
const RESSOURCES_EAU = [
  {
    titre: "Bouches incendie et pompes — relevé carte officielle",
    detail: `${EAU_CARTE.filter((e) => e.type.startsWith("Bouche")).length} bouches incendie, `
      + `${EAU_CARTE.filter((e) => e.type.startsWith("Pompe")).length} pompes à eau, 1 tridivision. `
      + `La plus proche de l'entrée : tridivision à 96 m. Détail et GPS ci-dessous.`,
  },
  { titre: "Débit des hydrants", detail: "À COMPLÉTER : débit (m³/h) à obtenir auprès de la zone de secours." },
  { titre: "Point d'eau naturel", detail: "À COMPLÉTER : cours d'eau, accès engin, aspiration possible ?" },
];

const MOYENS_ORGA = [
  {
    titre: "Défibrillateurs (DEA) — carte officielle",
    detail: `DEA de l'organisation sur site (50.38244, 5.61735), à 80 m de l'entrée. `
      + `${DEA.length - 1} autres DEA dans un rayon de 4,5 km. Emplacements ci-dessous.`,
  },
  { titre: "Poste de secours / secouristes", detail: "1 secouriste (dossier § 10). 1 trousse de secours par site. 1 DEA sur le site du festival, mis à disposition par la Commune de Ferrières. À COMPLÉTER : organisme, emplacement du poste, brancard, VPSP ?" },
  { titre: "Sécurité privée", detail: "À COMPLÉTER : société, nombre d'agents, chef de poste, canal PMR15." },
  { titre: "Équipe volante organisateur", detail: "À COMPLÉTER : nombre, moyen de déplacement, canal PMR4.1." },
  { titre: "Encadrants balade", detail: "4 personnes de l'organisation par groupe (dossier § 4.2), briefées sécurité. 3 groupes par jour d'environ 300 personnes." },
];

const DOCTRINE = [
  "112 d'abord pour toute urgence vitale, puis information du QG par PMR333.",
  "Les applications complètent la radio : elles ne la remplacent jamais.",
  "L'engagement des moyens reste au QG festival — cette vue est en lecture seule.",
  "Point de regroupement enfant perdu / personne recherchée : ACCUEIL POINT 0.",
];

const CAPACITE_ETAPE = 300;
const LONGUEUR_KM = 6.5;

const POS_KM = { p0: 0, t1: 0.45, e1: 0.9, t2: 1.7, e2: 2.53, t3: 3.8, e3: 5.06, tr: 5.8, ret: 6.5 };
const POS_LABEL = {
  p0: "Point 0 (attente depart)", t1: "Transit vers Etape 1", e1: "Etape 1",
  t2: "Transit vers Etape 2", e2: "Etape 2", t3: "Transit vers Etape 3",
  e3: "Etape 3", tr: "Transit retour", ret: "Rentre au Point 0",
};

const REPERES = [
  { nom: "P0", km: 0 },
  { nom: "E1", km: 0.9 },
  { nom: "E2", km: 2.53 },
  { nom: "E3", km: 5.06 },
  { nom: "P0", km: 6.5 },
];

const GRAV = {
  critique: { rang: 3, cls: "text-red-300", ring: "ring-red-400/40", bg: "bg-red-400/10", dot: "bg-red-400" },
  grave: { rang: 2, cls: "text-amber-300", ring: "ring-amber-400/40", bg: "bg-amber-400/10", dot: "bg-amber-400" },
  modere: { rang: 1, cls: "text-sky-300", ring: "ring-sky-400/30", bg: "bg-sky-400/10", dot: "bg-sky-400" },
};

// Habillage couleur du panneau meteo selon le niveau de vigilance IRM
// (vert / jaune / orange / rouge). Evite l'incoherence "vigilance verte
// mais panneau jaune" : tout le bloc prend la couleur du niveau reel.
const VIGILANCE_STYLE = {
  vert:   { border: "border-emerald-400", ring: "ring-emerald-400/30", ringHover: "hover:ring-emerald-400/50", titre: "text-emerald-300", icone: "text-emerald-400", dot: "bg-emerald-400", badge: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20", label: "VERT" },
  jaune:  { border: "border-amber-400", ring: "ring-amber-400/30", ringHover: "hover:ring-amber-400/50", titre: "text-amber-300", icone: "text-amber-400", dot: "bg-amber-400", badge: "bg-amber-400/10 text-amber-300 border-amber-400/20", label: "JAUNE" },
  orange: { border: "border-orange-400", ring: "ring-orange-400/40", ringHover: "hover:ring-orange-400/60", titre: "text-orange-300", icone: "text-orange-400", dot: "bg-orange-400", badge: "bg-orange-400/10 text-orange-300 border-orange-400/30", label: "ORANGE" },
  rouge:  { border: "border-red-500", ring: "ring-red-500/40", ringHover: "hover:ring-red-500/60", titre: "text-red-300", icone: "text-red-400", dot: "bg-red-500", badge: "bg-red-500/15 text-red-300 border-red-500/30", label: "ROUGE" },
};

const METEO_FALLBACK = {
  // FALLBACK DE SECURITE : plus aucune donnee inventee (l'ancien fallback
  // affichait un faux "Avertissement Chaleur" et "Temps ensoleillé — 22°C"
  // meme la nuit). Une vue autorite ne doit montrer que du reel ou
  // l'indisponibilite explicite.
  live: false,
  province: "Liege",
  codeActuel: "vert",
  maj: "—",
  timeline: [{ creneau: "FLUX METEO NON RECU — verifier Edge Function meteo-irm + cron", code: "jaune", phenomene: "indisponible" }],
  station: "Ferrières (Province de Liège)",
  statutAlerte: "INDISPONIBLE",
  titre: "Données météo indisponibles",
  validite: "—",
  description: "Aucune donnée reçue du flux météo. Se référer à meteo.be et au briefing météo du QG festival.",
  source: "—",
  obsHeure: "—",
  obsResume: "OBSERVATION INDISPONIBLE — consulter meteo.be",
  obsLever: "—",
  obsCoucher: "—",
  obsUV: "—",
  urlFerrieres: "https://www.meteo.be/fr/ferrieres"
};

/* ------------------------------ App ------------------------------ */

export default function PcOps() {
  const [missions, setMissions] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [sosPart, setSosPart] = useState([]);
  const [consigne, setConsigne] = useState(null);
  const [meteoLive, setMeteoLive] = useState(null);
  const [sbError, setSbError] = useState(false);
  const [maj, setMaj] = useState(null);
  const [now, setNow] = useState(new Date());
  const [crise, setCrise] = useState(null);
  const [recherches, setRecherches] = useState([]);
  const [jauge, setJauge] = useState(null);
  const [vue, setVue] = useState("situation"); // situation | dossier

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let stop = false;
    async function pull() {
      try {
        const [mi, gr, aLog, aBal, sp, co, mto, cri, rch, jg] = await Promise.all([
          kvGet(KEY_MISSIONS), kvGet(KEY_GROUPES), kvGet(KEY_ALERTE_LOG),
          kvGet(KEY_ALERTE_BAL), kvGet(KEY_SOS_PART), kvGet(KEY_CONSIGNE),
          kvGet(KEY_METEO), kvGet(KEY_CRISE), kvGet(KEY_RECH), kvGet(KEY_JAUGE),
        ]);
        if (stop) return;
        setMissions(Array.isArray(mi) ? mi : []);
        setGroupes(Array.isArray(gr) ? gr : []);
        setSosPart(Array.isArray(sp) ? sp : []);
        setConsigne(co && co.active ? co : null);
        setMeteoLive(mto && mto.live ? mto : null);
        setCrise(cri && cri.active ? cri : null);
        setRecherches(Array.isArray(rch) ? rch.filter((x) => x.statut === "active") : []);
        setJauge(jg && jg.compteurs ? jg : null);
        setAlertes(
          [
            aLog && aLog.active ? { ...aLog, source: "Equipe logistique" } : null,
            aBal && aBal.active ? { ...aBal, source: "Equipe balade" } : null,
          ].filter(Boolean)
        );
        setMaj(new Date());
        setSbError(false);
      } catch (e) {
        if (!stop) setSbError(true);
      }
    }
    pull();
    const t = setInterval(pull, 10000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  /* ------------------- Consolidation des evenements ------------------- */
  const evenements = [];

  const sosVisibles = sosPart.filter((s) => {
    const st = (s.statut || "").toLowerCase();
    return st !== "cloture" && st !== "clôture" && st !== "cloturé" && st !== "clos" && st !== "retour a la normale";
  });

  sosVisibles.forEach((s) => {
    const st = (s.statut || "").toLowerCase();
    let texteStatut = "Nouveau — non pris en compte";
    if (st === "en route") texteStatut = `Volante en route (${s.heureEnRoute || ""})`;
    else if (st === "sur place") texteStatut = `Volante sur place (${s.heureArrivee || ""})`;
    else if (st === "prise en charge") texteStatut = `Victime prise en charge / Soins (${s.heurePriseEnCharge || ""})`;
    else if (st === "pris en compte") texteStatut = `Pris en compte par le QG (${s.heurePriseEnCompte || ""})`;

    evenements.push({
      id: s.id,
      heure: s.heure,
      type: "SOS participant",
      libelle: s.motif + (s.nom && s.nom !== "Anonyme" ? ` — ${s.nom}` : ""),
      gravite: "critique",
      localisation: s.surTrace ? `Parcours km ${s.surTrace.km} · ${s.surTrace.segment}` : "Position non geolocalisee (voir description)",
      km: s.surTrace ? s.surTrace.km : null,
      gps: s.gps || null,
      statut: texteStatut,
      details: s.details,
    });
  });

  alertes.forEach((a, i) => {
    if (a.acquittePar) return;
    evenements.push({
      id: "al" + i,
      heure: a.heure,
      type: "Alerte " + a.source.toLowerCase(),
      libelle: a.motif,
      gravite: "critique",
      localisation: a.groupe || a.details || "Voir QG",
      km: null,
      gps: null,
      statut: "Non acquittee",
      details: a.details,
    });
  });

  missions
    .filter((m) => m.statut !== STATUT_RESOLU && (m.bloquant === "Oui" || estUrgente(m.priorite)))
    .forEach((m) => {
      evenements.push({
        id: m.id || m.ref,
        heure: m.heureConstat,
        type: "Logistique " + (m.priorite || "").slice(0, 2),
        libelle: m.nature,
        gravite: m.bloquant === "Oui" || priorite(m.priorite).rang === 1 ? "grave" : "modere",
        localisation: `${m.zone}${m.localisation ? " · " + m.localisation : ""}`,
        km: null,
        gps: null,
        statut: m.statut + (m.attribueA ? ` — ${m.attribueA}` : " — non attribuee"),
        details: "",
      });
    });

  evenements.sort((a, b) => {
    const ga = GRAV[a.gravite].rang, gb = GRAV[b.gravite].rang;
    if (ga !== gb) return gb - ga;
    return (b.heure || "").localeCompare(a.heure || "");
  });

  /* --------------------------- Crowd management --------------------------- */
  const grpDehors = groupes.filter((g) => g.position !== "p0" && g.position !== "ret");
  const persDehors = grpDehors.reduce((s, g) => s + (Number(g.participants) || 0), 0);
  const persAttente = groupes.filter((g) => g.position === "p0").reduce((s, g) => s + (Number(g.participants) || 0), 0);
  const persRentres = groupes.filter((g) => g.position === "ret").reduce((s, g) => s + (Number(g.participants) || 0), 0);
  const parEtape = { e1: 0, e2: 0, e3: 0 };
  groupes.forEach((g) => {
    if (parEtape[g.position] !== undefined) parEtape[g.position] += Number(g.participants) || 0;
  });

  const etapesSaturees = ["e1", "e2", "e3"]
    .map((eid, i) => {
      const n = parEtape[eid];
      const pct = n / CAPACITE_ETAPE;
      return { nom: `Etape ${i + 1}`, n, pct, label: pct >= 1.0 ? "COMPLET" : "DENSITE ELEVEE" };
    })
    .filter((e) => e.pct >= 0.72);

  const surSite = jauge
    ? Object.values(jauge.compteurs).reduce((s, c) => s + Math.max(0, (c.in || 0) - (c.out || 0)), 0)
    : null;

  /* --------------------- BILAN DES INTERVENTIONS ---------------------
     Vue GLOBALE pour le Dir-PC-Ops : TOUTES les interventions en cours
     (medicales ET non medicales : securite, feu, personne perdue...),
     ventilees par TYPE et par STATUT de prise en charge. On ne discrimine
     plus le medical -- un depart de feu ou une bagarre compte autant.
  ------------------------------------------------------------------- */
  // Categorisation par type a partir du motif du SOS / de l'alerte.
  function typeIntervention(motif) {
    const m = (motif || "").toLowerCase();
    if (/m[ée]dical|malaise|bless|chute|soin|inconsc|douleur|crise/.test(m)) return "Médical";
    if (/feu|fum[ée]e|incendie|flamme/.test(m)) return "Incendie / fumée";
    if (/bagarre|agress|vol|s[ûu]ret[ée]|alterc|violence|intrus/.test(m)) return "Sûreté";
    if (/perdu|recherche|disparu|[ée]gar[ée]|enfant/.test(m)) return "Personne recherchée";
    if (/[ée]lec|technique|structure|barri[èe]re|panne/.test(m)) return "Technique / matériel";
    return "Autre";
  }
  // Statuts reels : nouveau -> pris en compte -> en route -> prise en charge.
  // "pris en compte" = QG a acquitte sans forcement engager de moyen.
  function statutIntervention(s) {
    const st = (s.statut || "").toLowerCase();
    if (st === "nouveau" || st === "pris en compte") return "en_attente";
    if (st === "en route" || st === "sur place") return "moyen_engage";
    if (st === "prise en charge") return "prise_en_charge";
    return "en_attente";
  }

  // Interventions = SOS participants + alertes equipes non acquittees.
  // (Les missions logistiques P3/P4 restent hors bilan : ce ne sont pas
  //  des interventions de secours mais de la maintenance.)
  const interventions = [
    ...sosVisibles.map((s) => ({
      id: s.id, heure: s.heure, motif: s.motif, nom: s.nom, details: s.details,
      surTrace: s.surTrace, gps: s.gps,
      type: typeIntervention(s.motif),
      etat: statutIntervention(s),
      statutBrut: s.statut,
    })),
    ...alertes.filter((a) => !a.acquittePar).map((a, i) => ({
      id: "al" + i, heure: a.heure, motif: a.motif, details: a.details,
      localisation: a.groupe || a.details,
      type: typeIntervention(a.motif),
      etat: "en_attente",
      statutBrut: "alerte non acquittée",
    })),
  ];

  const intEnAttente = interventions.filter((i) => i.etat === "en_attente");
  const intEngage = interventions.filter((i) => i.etat === "moyen_engage");
  const intPriseEnCharge = interventions.filter((i) => i.etat === "prise_en_charge");

  // Repartition par type (pour le tableau de synthese)
  const parType = {};
  interventions.forEach((i) => { parType[i.type] = (parType[i.type] || 0) + 1; });
  const typesTries = Object.entries(parType).sort((a, b) => b[1] - a[1]);

  const critiques = evenements.filter((e) => e.gravite === "critique").length + (crise ? 1 : 0);
  const niveau = critiques > 0 ? "critique" : evenements.length > 0 || Object.values(parEtape).some((n) => n / CAPACITE_ETAPE >= 0.9) ? "modere" : "mineur";
  const niveauLabel = { mineur: "NORMAL", modere: "VIGILANCE", critique: "ALERTE" }[niveau];

  const METEO = meteoLive || METEO_FALLBACK;
  // Couleur du panneau meteo = niveau de vigilance courant (defaut vert)
  const vig = VIGILANCE_STYLE[(METEO.codeActuel || "vert").toLowerCase()] || VIGILANCE_STYLE.vert;
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=500;600;700&family=Inter:wght=400;500;600;700&family=JetBrains+Mono:wght=400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes pulseSlow { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        .pulse-slow { animation: pulseSlow 1.8s ease-in-out infinite; }
      `}</style>

      <header className="border-b border-white/10 bg-[#131a22]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-sky-400/10 ring-1 ring-sky-400/30 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5 text-sky-300" />
            </div>
            <div className="min-w-0">
              <div className="font-display tracking-wide text-[15px] leading-none truncate">PC-OPS · AUTORITE</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · FERRIERES · VUE DE SITUATION</div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ring-1 font-mono text-xs tracking-wider ${
              niveau === "critique" ? "bg-red-400/10 ring-red-400/40 text-red-300"
              : niveau === "modere" ? "bg-amber-400/10 ring-amber-400/40 text-amber-300"
              : "bg-emerald-400/10 ring-emerald-400/30 text-emerald-300"}`}>
              <CircleDot className={`w-3 h-3 ${niveau === "critique" ? "pulse-slow" : ""}`} />
              {niveauLabel}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />
              {pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
        {/* Onglets : SITUATION (temps reel) / DOSSIER (references) */}
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1.5">
          {[["situation", "Situation", CircleDot], ["intervention", "Intervention", ShieldAlert], ["dossier", "Dossier", FileText]].map(([k, lab, Ic]) => (
            <button
              key={k}
              onClick={() => setVue(k)}
              className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full ring-1 transition-colors ${
                vue === k ? "ring-sky-400/50 bg-sky-400/10 text-sky-300" : "ring-white/10 text-slate-500 hover:text-slate-300"
              }`}
            >
              <Ic className="w-3.5 h-3.5" /> {lab}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {sbError && (
          <div className="rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 text-xs px-3 py-2">
            Liaison donnees indisponible — la situation affichee peut etre obsolete.
          </div>
        )}

        {/* ------------------------------------------------------------------
            BANDEAUX PERMANENTS — hors onglets.
            Une autorite consultant le Dossier doit voir passer une mise a
            l'abri : ces blocs restent donc affiches quel que soit l'onglet.
            LECTURE SEULE, volontairement sans bouton "BIEN RECU" : les
            accuses de reception comptabilisent les EQUIPES du festival. Un
            clic d'autorite fausserait le decompte du QG ("qui a lu ma
            consigne ?") et partirait sans nom (pas de profil cote autorite).
        ------------------------------------------------------------------ */}
        {crise && (
          <section className="rounded-lg ring-2 ring-red-500/70 bg-red-500/15 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-4 h-4 text-red-300 pulse-slow" />
              <h2 className="font-display tracking-wide text-sm text-red-200 uppercase">Consigne générale diffusée par le QG</h2>
            </div>
            <div className="text-sm text-red-100 font-semibold">{crise.motif}</div>
            {crise.message && <div className="text-xs text-red-100/90 mt-0.5">{crise.message}</div>}
            <div className="text-[11px] font-mono text-red-200/70 mt-1">
              Émise à {crise.heure} · {(crise.accuses || []).length} équipe(s) ont accusé réception
            </div>
          </section>
        )}

        {recherches.map((r) => (
          <div key={r.id} className="rounded-lg ring-1 ring-amber-400/50 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-100 flex items-start gap-2">
            <UserSearch className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
            <div>
              <span className="font-semibold uppercase">Recherche {r.categorie} en cours</span> — depuis {r.heure}
              <div className="opacity-80 mt-0.5">
                Dernier lieu connu : {r.dernierLieu}{r.heureDerniereVue ? ` (vers ${r.heureDerniereVue})` : ""} · regroupement : accueil Point 0 · gestion QG festival
              </div>
            </div>
          </div>
        ))}

        {vue === "dossier" ? (
          <Dossier />
        ) : vue === "intervention" ? (
          <Intervention
            interventions={interventions}
            enAttente={intEnAttente}
            engage={intEngage}
            priseEnCharge={intPriseEnCharge}
            typesTries={typesTries}
            surSite={surSite}
            persDehors={persDehors}
          />
        ) : (
        <>
        {/* PANEL IRM BELGIQUE — SURVEILLANCE DIRECTE ET CLIQUABLE (LECTURE SEULE AUTORITÉS) */}
        <a 
          href={METEO.urlFerrieres || METEO_FALLBACK.urlFerrieres}
          target="_blank"
          rel="noopener noreferrer"
          className={`block bg-[#131a22] rounded-lg p-4 ring-1 ${vig.ring} border-t-4 ${vig.border} shadow-xl hover:bg-[#1a232e] ${vig.ringHover} transition-all cursor-pointer group`}
        >
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${vig.icone} pulse-slow`} />
              <h2 className={`font-display tracking-wide text-sm ${vig.titre} uppercase flex items-center gap-1.5`}>
                {meteoLive ? "IRM LIVE — AVERTISSEMENTS OFFICIELS" : "MÉTÉO HORS LIGNE — DONNÉES NON REÇUES"} ({METEO.station})
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors inline" />
              </h2>
            </div>
            <div className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${vig.badge}`}>
              Vigilance : {vig.label}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="md:col-span-2 bg-white/[0.02] border border-white/5 rounded p-2.5">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${vig.dot}`} />
                {METEO.titre || METEO_FALLBACK.titre}
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                {METEO.description || METEO_FALLBACK.description}
              </p>
              <div className="text-[10px] font-mono text-slate-400 mt-2">
                Période de validité : {METEO.validite || METEO_FALLBACK.validite}
              </div>
            </div>
            
            <div className="bg-white/[0.02] border border-white/5 rounded p-2.5 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Météo & Données Clés</div>
                <div className="text-xs font-medium text-slate-200">{METEO.obsResume || METEO_FALLBACK.obsResume}</div>
                
                <div className="mt-2 pt-2 border-t border-white/5 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400"><Sun className="w-3 h-3 text-amber-400" /> Lever :</span>
                    <span className="font-mono font-medium">{METEO.obsLever || METEO_FALLBACK.obsLever}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400"><Sunset className="w-3 h-3 text-orange-400" /> Coucher :</span>
                    <span className="font-mono font-medium">{METEO.obsCoucher || METEO_FALLBACK.obsCoucher}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300 pt-0.5">
                    <span className="text-slate-400">Indice UV max :</span>
                    <span className="font-mono font-bold text-amber-400">{METEO.obsUV || METEO_FALLBACK.obsUV}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-[9px] font-mono text-slate-500 pt-1.5 border-t border-white/5 mt-3">
                Source : {METEO.source || METEO_FALLBACK.source} <br/>
                Observation : {METEO.maj}
              </div>
            </div>
          </div>
        </a>

        {/* Synthese chiffree */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Evenements actifs" value={evenements.length} accent={critiques > 0 ? "text-red-300" : "text-amber-300"} />
          <Kpi label="Dont critiques" value={critiques} accent={critiques > 0 ? "text-red-300" : "text-emerald-300"} />
          <Kpi label="Public sur parcours" value={persDehors} accent="text-amber-300" />
          <Kpi label="Groupes dehors" value={grpDehors.length} accent="text-slate-200" />
        </section>

        {/* Jauge plaine (comptage des acces au site) */}
        {surSite !== null && (
          <div className="rounded-lg ring-1 ring-white/10 bg-[#131a22] px-4 py-2.5 flex items-center gap-3">
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs text-slate-300 shrink-0">Jauge plaine</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full ${surSite / CAPACITE_SITE >= 0.9 ? "bg-red-400" : surSite / CAPACITE_SITE >= 0.72 ? "bg-amber-400" : "bg-emerald-400"}`}
                style={{ width: `${Math.min(100, Math.round((surSite / CAPACITE_SITE) * 100))}%` }} />
            </div>
            <span className={`font-mono text-sm ${surSite / CAPACITE_SITE >= 0.9 ? "text-red-300" : "text-slate-200"}`}>{surSite}</span>
            <span className="font-mono text-[10px] text-slate-500 shrink-0">/ {CAPACITE_SITE}</span>
          </div>
        )}

        {consigne && (
          <div className="rounded-md ring-1 ring-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
            Moyens engages : equipe volante vers <span className="font-semibold">{consigne.prv}</span>
            {consigne.message ? ` — ${consigne.message}` : ""} (emis {consigne.heure}
            {consigne.accusePar ? `, accuse ${consigne.heureAccuse}` : ", en attente d'accuse"})
          </div>
        )}

        {/* Crowd management */}
        <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
            <Footprints className="w-4 h-4 text-slate-500" /> PARCOURS 6,5 KM — SITUATION
          </h2>

          <div className="relative h-16 mb-2">
            <div className="absolute top-8 left-0 right-0 h-1 bg-white/15 rounded-full" />
            {REPERES.map((r, i) => (
              <div key={i} className="absolute top-5" style={{ left: `calc(${(r.km / LONGUEUR_KM) * 100}% - 8px)` }}>
                <div className="w-2 h-2 rounded-full bg-slate-500 mx-auto mt-2" />
                <div className="text-[9px] font-mono text-slate-500 text-center mt-1">{r.nom}</div>
              </div>
            ))}
            {grpDehors.map((g) => {
              const km = POS_KM[g.position] ?? 0;
              return (
                <div key={g.id} className="absolute top-1" style={{ left: `calc(${(km / LONGUEUR_KM) * 100}% - 10px)` }} title={`${g.nom} · ${g.participants} pers.`}>
                  <div className="flex items-center gap-0.5 bg-amber-400/20 ring-1 ring-amber-400/50 rounded px-1 py-0.5">
                    <Users className="w-2.5 h-2.5 text-amber-300" />
                    <span className="text-[9px] font-mono text-amber-200">{g.participants}</span>
                  </div>
                </div>
              );
            })}
            {evenements.filter((e) => e.type === "SOS participant" && e.km !== null).map((e) => (
              <div key={e.id} className="absolute top-10" style={{ left: `calc(${(Math.min(e.km, LONGUEUR_KM) / LONGUEUR_KM) * 100}% - 6px)` }} title={e.libelle}>
                <TriangleAlert className="w-3.5 h-3.5 text-red-400 pulse-slow" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            {["e1", "e2", "e3"].map((eid, idx) => {
              const n = parEtape[eid];
              const pct = Math.min(100, Math.round((n / CAPACITE_ETAPE) * 100));
              const cls = pct >= 100 ? "bg-red-500" : pct >= 72 ? "bg-amber-400" : "bg-emerald-400";
              return (
                <div key={eid} className="rounded bg-white/[0.03] ring-1 ring-white/10 p-2">
                  <div className="text-[10px] font-mono text-slate-500 flex justify-between items-center">
                    <span>ETAPE {idx + 1}</span>
                    {pct >= 100 && <span className="text-[8px] font-bold text-red-400 uppercase tracking-wide">COMPLET</span>}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden my-1">
                    <div className={`h-full ${cls} ${pct >= 100 ? "pulse-slow" : ""}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">{n}/{CAPACITE_ETAPE}</div>
                </div>
              );
            })}
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            {persAttente} en attente au Point 0 · {persDehors} sur le parcours · {persRentres} rentres
          </div>
        </section>

        {etapesSaturees.length > 0 && (
          <section className="rounded-lg ring-1 ring-amber-400/40 bg-amber-400/5 p-3.5">
            <div className="font-display text-amber-200 text-sm tracking-wide flex items-center gap-2 mb-1.5">
              <Footprints className="w-4 h-4" /> 
              {etapesSaturees.some(e => e.pct >= 1) ? "CROWD — CAPACITE MAXIMALE ATTEINTE" : "CROWD — DENSITE ELEVEE"}
            </div>
            <div className="space-y-1">
              {etapesSaturees.map((e) => (
                <div key={e.nom} className="flex items-center justify-between text-xs text-slate-200 py-0.5">
                  <div className="flex items-center gap-2">
                    <span>{e.nom} : {e.n}/{CAPACITE_ETAPE} ({Math.round(e.pct * 100)}%)</span>
                    {e.pct >= 1 && <span className="text-[9px] font-bold bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded ring-1 ring-red-500/40 font-mono">COMPLET</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Evenements en cours nettoyés sans doublon */}
        <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
            <TriangleAlert className="w-4 h-4 text-slate-500" /> EVENEMENTS EN COURS
            <span className="text-[11px] font-mono text-slate-500 font-normal">{evenements.length}</span>
          </h2>
          <div className="space-y-2">
            {evenements.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-4 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Aucun evenement en cours.
              </div>
            )}
            {evenements.map((e) => {
              const g = GRAV[e.gravite] || GRAV["modere"];
              return (
                <div key={e.id} className={`rounded-md px-3 py-2.5 ring-1 ${g.ring} ${g.bg}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-1.5 h-1.5 rounded-full ${g.dot} shrink-0 bg-red-400`} />
                    <span className="font-mono text-[11px] text-slate-400">{e.heure}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ring-1 ${g.ring} ${g.cls}`}>{e.gravite.toUpperCase()}</span>
                    <span className="text-[10px] font-mono text-slate-500">{e.type}</span>
                  </div>
                  <div className="text-sm text-slate-100 mt-1">{e.libelle}</div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" /> {e.localisation}
                    {e.gps && (
                      <>
                        <a href={`https://maps.google.com/?q=${e.gps.lat},${e.gps.lon}`} target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200 inline-flex items-center gap-0.5 ml-1">
                          Maps <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <a href={myMapsUrl(e.gps.lat, e.gps.lon)} target="_blank" rel="noreferrer" className="text-amber-300 hover:text-amber-200 inline-flex items-center gap-0.5 ml-1">
                          carte Buco <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </>
                    )}
                  </div>
                  {e.details && <div className="text-[11px] text-slate-500 italic mt-0.5">"{e.details}"</div>}
                  <div className="text-[11px] font-mono mt-1 text-amber-300">Statut : {e.statut}</div>
                </div>
              );
            })}
          </div>
        </section>

        </>
        )}

        <div className="text-[10px] text-slate-600 font-mono text-center pb-2">
          {maj ? `Derniere synchronisation : ${pad(maj.getHours())}:${pad(maj.getMinutes())}:${pad(maj.getSeconds())}` : "Synchronisation..."} · rafraichissement 10 s
        </div>
      </main>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-3">
      <div className="text-[10px] font-mono text-slate-500 tracking-wide uppercase">{label}</div>
      <div className={`font-display text-2xl mt-0.5 ${accent}`}>{value}</div>
    </div>
  );
}
/* =====================================================================
   ONGLET DOSSIER — documents de reference, annuaire, points fixes.
   Contenu statique : reste consultable meme si la liaison Supabase tombe.
===================================================================== */

function Dossier() {
  return (
    <div className="space-y-4">
      {/* Documents */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-sky-300" /> DOCUMENTS DE RÉFÉRENCE
        </h2>
        <div className="text-[10px] font-mono text-slate-500 mb-3">
          Consultation réservée aux autorités et disciplines — ne pas rediffuser.
        </div>
        <div className="space-y-2">
          {DOCUMENTS.map((d) => {
            const dispo = Boolean(d.url);
            const Contenu = (
              <>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${dispo ? "text-slate-100" : "text-slate-400"}`}>{d.titre}</span>
                  {dispo ? (
                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-sky-300 transition-colors" />
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded ring-1 ring-amber-400/30 text-amber-300/80">à venir</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{d.desc}</div>
              </>
            );
            return dispo ? (
              <a key={d.titre} href={d.url} target="_blank" rel="noopener noreferrer"
                className="group block rounded-md px-3 py-2.5 ring-1 ring-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:ring-sky-400/30 transition-all">
                {Contenu}
              </a>
            ) : (
              <div key={d.titre} className="rounded-md px-3 py-2.5 ring-1 ring-white/5 bg-white/[0.01]">
                {Contenu}
              </div>
            );
          })}
        </div>
      </section>

      {/* Annuaire de crise */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
          <PhoneCall className="w-4 h-4 text-slate-500" /> ANNUAIRE DE CRISE
        </h2>
        <div className="space-y-1">
          {ANNUAIRE.map((n) => (
            <a key={n.nom} href={`tel:${n.num.replace(/\s/g, "")}`}
              className={`flex items-center gap-2 rounded px-2.5 py-2 ring-1 ${n.urgent ? "ring-red-400/40 bg-red-400/10" : "ring-white/10 bg-white/[0.02]"}`}>
              <span className={`text-xs flex-1 leading-tight ${n.urgent ? "text-red-200 font-semibold" : "text-slate-300"}`}>
                {n.nom}
                {n.mail && <span className="block text-[9px] font-mono text-slate-500">{n.mail}</span>}
              </span>
              {n.note && <span className="text-[9px] font-mono text-amber-300/70 shrink-0">{n.note}</span>}
              <span className={`font-mono text-sm ${n.urgent ? "text-red-200 font-bold" : "text-slate-200"}`}>{n.num}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Plan radio */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
          <Radio className="w-4 h-4 text-slate-500" /> PLAN RADIO
        </h2>
        <div className="space-y-1">
          {RADIO_PLAN.map((c) => (
            <div key={c.canal} className={`flex items-start gap-2 text-[11px] rounded px-2 py-1.5 ${c.urgent ? "bg-red-400/5 ring-1 ring-red-400/20" : "bg-white/[0.02]"}`}>
              <span className={`font-mono shrink-0 w-14 ${c.urgent ? "text-red-300" : "text-amber-300"}`}>{c.canal}</span>
              <span className={`font-mono shrink-0 px-1.5 rounded text-[10px] ${c.urgent ? "bg-red-500/25 text-red-100" : "bg-sky-500/15 text-sky-200"}`}>
                ch.{c.num}
                {c.postes === "les deux" && (
                  <span className="text-amber-200"> / {c.numSimple != null ? c.numSimple : "?"}</span>
                )}
              </span>
              <span className="text-slate-400 leading-tight">
                {c.usage}
                {c.postes === "standard" && (
                  <span className="block text-[9px] text-amber-300/70">Postes standard uniquement</span>
                )}
                {c.postes === "les deux" && (
                  <span className="block text-[9px] text-slate-500">
                    canal {c.num} sur poste standard · {c.numSimple != null ? "canal " + c.numSimple : "à confirmer"} sur poste simple
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-2.5 rounded px-2.5 py-2 ring-1 ring-amber-400/40 bg-amber-400/[0.08] text-[10px] text-amber-100 leading-relaxed">
          <span className="font-semibold">Deux programmations coexistent.</span>
          {" "}Postes <span className="text-sky-200">standard</span> ({POSTES_RADIO.standard.qui}) : 25 canaux,
          urgence PMR333 sur le <span className="font-semibold">canal 6</span>.
          {" "}Postes <span className="text-amber-200">simples</span> ({POSTES_RADIO.simple.qui}) :
          <span className="font-semibold"> PMR333 n'y est pas programmé</span>.
          <span className="block mt-1 text-amber-200/80">
            Ne jamais demander à ces équipes de passer sur PMR333. Leur circuit : 112 par téléphone
            pour une urgence vitale, puis alerte au QG sur leur propre canal — le QG écoute PMR5,
            émet sur PMR15 (radio n°2) et relaie vers PMR333.
          </span>
        </div>

        {/* Table complete de programmation des postes */}
        <details className="mt-2">
          <summary className="text-[10px] font-mono uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-300">
            Programmation complète des postes ({PROGRAMMATION_RADIO.length} canaux)
          </summary>
          <div className="grid grid-cols-3 gap-1 mt-2">
            {PROGRAMMATION_RADIO.map((c) => {
              const utilise = RADIO_PLAN.some((r) => r.num === c.num);
              const urg = c.pmr.includes("333");
              return (
                <div
                  key={c.num}
                  className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] font-mono ring-1 ${
                    urg ? "ring-red-400/40 bg-red-400/10 text-red-200"
                      : utilise ? "ring-amber-400/25 bg-amber-400/[0.06] text-amber-200"
                      : "ring-white/5 bg-white/[0.02] text-slate-500"
                  }`}
                >
                  <span className="font-bold w-5 text-right">{c.num}</span>
                  <span>{c.pmr}</span>
                </div>
              );
            })}
          </div>
          <div className="text-[9px] font-mono text-slate-600 mt-1.5">
            En ambre : canaux utilisés par le dispositif. En rouge : canal d'urgence.
          </div>
        </details>
      </section>

      {/* Points de rendez-vous secours */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-1">
          <MapIcon className="w-4 h-4 text-slate-500" /> POINTS DE RENDEZ-VOUS SECOURS (PRV)
        </h2>
        <div className="text-[10px] font-mono text-slate-500 mb-2">Coordonnées cliquables — ouvre Google Maps / navigation.</div>
        <div className="space-y-1">
          {PRV_LIST.map((r) => (
            <a key={r.nom} href={`https://www.google.com/maps?q=${r.gps.replace(/\s/g, "")}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-[11px] rounded px-2 py-1.5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
              <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
              <span className="flex-1 leading-tight">
                <span className="text-slate-300">{r.nom}</span>
                {r.adresse && <span className="block text-[10px] text-slate-500">{r.adresse}</span>}
              </span>
              <span className="font-mono text-slate-500 shrink-0">{r.gps}</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-600 shrink-0" />
            </a>
          ))}
        </div>
      </section>

      {/* Doctrine */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
          <LifeBuoy className="w-4 h-4 text-emerald-300" /> DOCTRINE D'ALERTE
        </h2>
        <ul className="space-y-1.5">
          {DOCTRINE.map((d, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
              <span className="font-mono text-emerald-300/70 shrink-0">{i + 1}.</span> {d}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* =====================================================================
   ONGLET INTERVENTION — ce dont un Dir-PC-Ops a besoin en arrivant.
   Ordre volontaire : d'abord le bilan humain, puis comment entrer, qui
   commander, ce qui peut aggraver, avec quels moyens.
   Les blocs statiques restent lisibles meme si Supabase est injoignable.
===================================================================== */

function AC({ texte }) {
  // Affiche un champ non renseigne en ambre : un trou visible vaut mieux
  // qu'une information fausse dans une vue de crise.
  const vide = /À COMPLÉTER|À CONFIRMER|À PRÉCISER/i.test(texte || "") || /04XX/.test(texte || "");
  return <span className={vide ? "text-amber-300/80" : "text-slate-300"}>{texte}</span>;
}

// Ligne compacte : libelle + coordonnees cliquables (ouvre la carte).
function LigneGps({ label, gps, note, accent }) {
  return (
    <a
      href={`https://www.google.com/maps?q=${gps.replace(/\s/g, "")}`}
      target="_blank" rel="noreferrer"
      className="flex items-center gap-2 rounded px-2 py-1 ring-1 ring-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
    >
      <MapPin className={`w-3 h-3 shrink-0 ${accent || "text-slate-500"}`} />
      <span className="flex-1 text-[11px] text-slate-200 leading-tight">
        {label}
        {note && <span className="text-slate-500"> · {note}</span>}
      </span>
      <span className="font-mono text-[10px] text-sky-300 flex items-center gap-0.5 shrink-0">
        {gps} <ExternalLink className="w-2.5 h-2.5" />
      </span>
    </a>
  );
}

const ETAT_STYLE = {
  en_attente:      { label: "EN ATTENTE",       cls: "ring-red-400/40 bg-red-400/10",     badge: "bg-red-500/25 text-red-200" },
  moyen_engage:    { label: "MOYEN ENGAGÉ",     cls: "ring-amber-400/30 bg-amber-400/5",  badge: "bg-amber-500/25 text-amber-200" },
  prise_en_charge: { label: "PRISE EN CHARGE",  cls: "ring-emerald-400/30 bg-emerald-400/5", badge: "bg-emerald-500/25 text-emerald-200" },
};

function Intervention({ interventions, enAttente, engage, priseEnCharge, typesTries, surSite, persDehors }) {
  return (
    <div className="space-y-4">
      {/* 1. BILAN DES INTERVENTIONS (toutes natures) */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
          <LifeBuoy className="w-4 h-4 text-red-300" /> BILAN DES INTERVENTIONS
          <span className="text-[11px] font-mono text-slate-500 font-normal">{interventions.length} en cours</span>
        </h2>

        {/* Statut de prise en charge */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Kpi label="En attente" value={enAttente.length} accent={enAttente.length ? "text-red-300" : "text-emerald-300"} />
          <Kpi label="Moyen engagé" value={engage.length} accent="text-amber-300" />
          <Kpi label="Prises en charge" value={priseEnCharge.length} accent="text-emerald-300" />
        </div>

        {/* Repartition par type */}
        {typesTries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {typesTries.map(([type, n]) => (
              <span key={type} className="text-[11px] font-mono px-2 py-1 rounded ring-1 ring-white/10 bg-white/[0.02] text-slate-300">
                {type} <span className="text-slate-100 font-semibold">{n}</span>
              </span>
            ))}
          </div>
        )}

        {/* Liste detaillee */}
        {interventions.length === 0 ? (
          <div className="text-xs text-slate-500 flex items-center gap-2 py-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Aucune intervention en cours.
          </div>
        ) : (
          <div className="space-y-1.5">
            {interventions.map((it) => {
              const es = ETAT_STYLE[it.etat] || ETAT_STYLE.en_attente;
              return (
                <div key={it.id} className={`rounded px-2.5 py-2 ring-1 ${es.cls} text-xs`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-slate-400">{it.heure}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded ring-1 ring-white/15 text-slate-300">{it.type}</span>
                    <span className="text-slate-100 font-semibold">{it.motif}{it.nom && it.nom !== "Anonyme" ? ` — ${it.nom}` : ""}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${es.badge}`}>{es.label}</span>
                  </div>
                  <div className="text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {it.surTrace ? `km ${it.surTrace.km} · ${it.surTrace.segment}` : (it.localisation || "position non géolocalisée")}
                    {it.gps && (
                      <a href={`https://www.google.com/maps?q=${it.gps.lat},${it.gps.lon}`} target="_blank" rel="noreferrer"
                        className="text-sky-300 hover:text-sky-200 inline-flex items-center gap-0.5 ml-1">
                        Carte <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {it.details && (
                    <div className="text-slate-300 mt-1 italic">"{it.details}"</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="text-[10px] font-mono text-slate-600 mt-2.5 leading-relaxed">
          Toutes les interventions en cours (médicales, sûreté, incendie, personne recherchée, technique),
          ventilées par type et par statut de prise en charge. Source : SOS participants + alertes équipes.
          Ce bilan complète le point de situation verbal du coordinateur, il ne le remplace pas.
        </div>
      </section>

      {/* 2. ACCES SECOURS */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-sky-300" /> ACCÈS SECOURS
        </h2>
        <div className="space-y-2">
          {ACCES_SECOURS.map((a) => (
            <div key={a.nom} className="rounded-md ring-1 ring-white/10 bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-100"><AC texte={a.nom} /></span>
                {a.gps && (
                  <a href={`https://www.google.com/maps?q=${a.gps.replace(/\s/g, "")}`} target="_blank" rel="noreferrer"
                    className="text-[11px] font-mono text-sky-300 hover:text-sky-200 inline-flex items-center gap-0.5">
                    {a.gps} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <div className="text-[11px] mt-1 space-y-0.5">
                <div><span className="text-slate-500">Voirie : </span><AC texte={a.detail} /></div>
                <div><span className="text-slate-500">Engins : </span><AC texte={a.vehicules} /></div>
                <div><span className="text-slate-500">Verrouillage : </span><AC texte={a.cle} /></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2 bis. ACCES AUX ETAPES — BRANCARDAGE ET NATURE DES VOIES */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-1">
          <Footprints className="w-4 h-4 text-amber-300" /> ACCÈS AUX ÉTAPES — BRANCARDAGE
        </h2>
        <div className="text-[10px] font-mono text-slate-500 mb-3 leading-relaxed">
          Dossier de sécurité § 9. La <span className="text-amber-200">distance de brancardage</span> est
          l'éloignement maximal entre un point du tronçon et un véhicule : c'est elle qui dimensionne
          l'équipe de portage, pas le cumul de voies non carrossables.
        </div>

        <div className="space-y-2">
          {SEGMENTS_PARCOURS.map((s) => {
            const dur = s.brancardageMaxM >= 400 ? "ring-red-400/40 bg-red-400/[0.07]"
              : s.brancardageMaxM >= 250 ? "ring-amber-400/30 bg-amber-400/[0.05]"
              : "ring-white/10 bg-white/[0.02]";
            const txt = s.brancardageMaxM >= 400 ? "text-red-200"
              : s.brancardageMaxM >= 250 ? "text-amber-200" : "text-emerald-200";
            return (
              <div key={s.nom} className={`rounded px-2.5 py-2 ring-1 ${dur}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-100 font-semibold">{s.nom}</span>
                  <span className="font-mono text-[10px] text-slate-500">{s.distanceM} m</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 ${txt}`}>
                    brancardage max {s.brancardageMaxM} m
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 leading-snug">{s.voies}</div>
                <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px]">
                  <span className="text-slate-500">Arrivée :</span>
                  <span className="text-slate-300">{s.arriveeNom}</span>
                  <a
                    href={`https://www.google.com/maps?q=${s.arriveeGps.replace(/\s/g, "")}`}
                    target="_blank" rel="noreferrer"
                    className="text-sky-300 inline-flex items-center gap-0.5"
                  >
                    {s.arriveeGps} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{s.arriveeAdresse}</span>
                  <span className="text-slate-500">· PRV :</span>
                  <span className="text-amber-200/80 font-mono">{s.prv.join(" / ")}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[10px] font-mono text-slate-600 mt-2.5 leading-relaxed">
          Lecture : les longueurs par type de voie sont des <span className="text-slate-400">cumuls sur le tronçon</span>,
          pas des portions continues. Un tronçon « 1250 m non carrossables » comporte plusieurs sections
          entrecoupées de chemins accessibles aux véhicules.
        </div>
      </section>

      {/* 2 ter. HORAIRES ET FREQUENTATION */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-sky-300" /> HORAIRES &amp; FRÉQUENTATION
        </h2>
        <div className="space-y-1.5">
          {HORAIRES.map((h) => (
            <div key={h.jour} className="rounded px-2.5 py-1.5 bg-white/[0.02] ring-1 ring-white/5">
              <div className="text-xs text-slate-100">{h.jour}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Départs balade : <span className="font-mono text-slate-200">{h.departs.join(" · ")}</span>
                {" — "}Concerts : <span className="font-mono text-slate-200">{h.concerts}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 pt-2 border-t border-white/5 text-[11px] text-slate-400 leading-relaxed">
          {FREQUENTATION.groupesParJour} groupes/jour d'environ {FREQUENTATION.personnesParGroupe} personnes ·
          {" "}{FREQUENTATION.etapeParVague} personnes par vague à chaque étape ·
          {" "}{FREQUENTATION.encadrantsParGroupe} encadrants par groupe.
          <br />
          Soirée : <span className="text-slate-200">{FREQUENTATION.soireeAttendue}</span> attendues.
          {" "}Capacité maximale : <AC texte={FREQUENTATION.capaciteMax} />
        </div>
      </section>

      {/* 3. POINT DE RENCONTRE / COMMANDEMENT ORGANISATEUR */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
          <Flag className="w-4 h-4 text-emerald-300" /> POINT DE RENCONTRE & COMMANDEMENT
        </h2>
        <div className="text-xs space-y-1.5">
          <div><span className="text-slate-500">Lieu : </span><AC texte={POINT_RENCONTRE.lieu} /></div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">GPS :</span>
            <a href={`https://www.google.com/maps?q=${POINT_RENCONTRE.gps.replace(/\s/g, "")}`} target="_blank" rel="noreferrer"
              className="font-mono text-sky-300 hover:text-sky-200 inline-flex items-center gap-0.5">
              {POINT_RENCONTRE.gps} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div><span className="text-slate-500">Interlocuteur : </span><span className="text-slate-200">{POINT_RENCONTRE.qui}</span></div>
          <a href={`tel:${POINT_RENCONTRE.tel.replace(/\s/g, "")}`}
            className="flex items-center gap-2 rounded px-2.5 py-2 ring-1 ring-emerald-400/30 bg-emerald-400/10 mt-1">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="flex-1 text-slate-300">Coordinateur sécurité</span>
            <span className="font-mono text-sm text-emerald-200"><AC texte={POINT_RENCONTRE.tel} /></span>
          </a>
          <div><span className="text-slate-500">Suppléant : </span><AC texte={POINT_RENCONTRE.suppleant} /></div>
        </div>
        <div className="text-[10px] font-mono text-slate-600 mt-2.5">
          L'organisateur conserve la direction de son dispositif jusqu'à la prise en charge par les disciplines.
        </div>
      </section>

      {/* 4. RISQUES PARTICULIERS */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-amber-400/30 p-4">
        <h2 className="font-display tracking-wide text-sm text-amber-200 flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-amber-300" /> RISQUES PARTICULIERS DU SITE
        </h2>
        <div className="text-[10px] font-mono text-slate-500 mb-2.5">Synthèse du dossier de sécurité et du PPUI — le détail reste dans les documents (onglet Dossier).</div>
        <div className="space-y-1.5">
          {RISQUES_SITE.map((r) => (
            <div key={r.titre} className="rounded px-2.5 py-1.5 bg-white/[0.02] ring-1 ring-white/5">
              <div className="text-xs text-slate-100">{r.titre}</div>
              <div className="text-[11px] mt-0.5"><AC texte={r.detail} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. RESSOURCES EAU */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
          <Droplets className="w-4 h-4 text-sky-300" /> RESSOURCES EN EAU
        </h2>
        <div className="space-y-1.5">
          {RESSOURCES_EAU.map((r) => (
            <div key={r.titre} className="rounded px-2.5 py-1.5 bg-white/[0.02] ring-1 ring-white/5">
              <div className="text-xs text-slate-100">{r.titre}</div>
              <div className="text-[11px] mt-0.5"><AC texte={r.detail} /></div>
            </div>
          ))}
        </div>

        {/* Liste detaillee issue de la carte officielle */}
        <div className="mt-3 pt-2.5 border-t border-white/5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300/70 mb-1.5">
            Emplacements — carte officielle ({EAU_CARTE.length})
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {EAU_CARTE.map((e, i) => (
              <LigneGps
                key={i}
                label={e.type}
                note={e.repere}
                gps={e.gps}
                accent={e.type.startsWith("Bouche") ? "text-sky-400" : "text-cyan-300"}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 5 bis. EVACUATION HELIPORTEE + VOIES D'ACCES */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
          <Navigation className="w-4 h-4 text-violet-300" /> ÉVACUATION HÉLIPORTÉE &amp; VOIES D'ACCÈS
        </h2>

        <div className="text-[10px] font-mono uppercase tracking-wider text-violet-300/70 mb-1.5">
          Zones d'atterrissage CMH ({ZONES_HELICO.length})
        </div>
        <div className="space-y-1">
          {ZONES_HELICO.map((z) => (
            <LigneGps
              key={z.nom}
              label={z.nom}
              note={z.nuit ? "utilisable de NUIT" : null}
              gps={z.gps}
              accent={z.nuit ? "text-amber-300" : "text-violet-300"}
            />
          ))}
        </div>

        <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300/70 mt-3 mb-1.5">
          Voies d'accès secours ({VOIES_ACCES.length})
        </div>
        <div className="space-y-1">
          {VOIES_ACCES.map((v) => (
            <div key={v.nom} className="rounded px-2.5 py-1.5 bg-white/[0.02] ring-1 ring-white/5">
              <div className="text-[11px] text-slate-100">{v.nom}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Depuis <span className="text-slate-200">{v.depuis}</span> vers {v.vers} · {v.longueurM} m
              </div>
              <a
                href={`https://www.google.com/maps?q=${v.depart.replace(/\s/g, "")}`}
                target="_blank" rel="noreferrer"
                className="font-mono text-[10px] text-sky-300 inline-flex items-center gap-0.5 mt-0.5"
              >
                entrée : {v.depart} <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          ))}
        </div>

        <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300/70 mt-3 mb-1.5">
          Balisage kilométrique du parcours ({BORNES_KM.length} bornes)
        </div>
        <div className="grid grid-cols-2 gap-1">
          {BORNES_KM.map((b) => (
            <LigneGps key={b.nom} label={b.nom} note={`km ${b.km.toFixed(1)}`} gps={b.gps} accent="text-sky-400" />
          ))}
        </div>
        <div className="text-[10px] font-mono text-slate-600 mt-2.5 leading-relaxed">
          Une intervention annoncée « au km 3,2 » se situe entre BK3 et BK4. Ces bornes sont
          physiquement posées sur le parcours : elles restent lisibles sans réseau ni batterie.
          Zones et voies relevées sur la carte opérationnelle partagée avec les disciplines.
          Seules les zones marquées NUIT sont utilisables après le coucher du soleil.
        </div>
      </section>

      {/* 6. MOYENS DE L'ORGANISATEUR */}
      <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
        <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-slate-500" /> MOYENS DE L'ORGANISATEUR
        </h2>
        <div className="space-y-1.5">
          {MOYENS_ORGA.map((m) => (
            <div key={m.titre} className="rounded px-2.5 py-1.5 bg-white/[0.02] ring-1 ring-white/5">
              <div className="text-xs text-slate-100">{m.titre}</div>
              <div className="text-[11px] mt-0.5"><AC texte={m.detail} /></div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2.5 border-t border-white/5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-red-300/70 mb-1.5 flex items-center gap-1.5">
            <HeartPulse className="w-3 h-3" /> Défibrillateurs (DEA) — carte officielle
          </div>
          <div className="space-y-1">
            {DEA.map((d) => (
              <LigneGps
                key={d.gps}
                label={d.nom}
                note={d.note}
                gps={d.gps}
                accent={d.nom.includes("organisation") ? "text-red-300" : "text-slate-500"}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
          Public présent à l'instant : <span className="font-mono text-slate-200">{surSite !== null ? surSite : "—"}</span> sur la plaine ·
          <span className="font-mono text-slate-200"> {persDehors}</span> sur le parcours de 6,5 km.
        </div>
      </section>
    </div>
  );
}