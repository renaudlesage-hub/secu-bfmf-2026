import React, { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Plus,
  X,
  ChevronRight,
  Clock,
  CircleDot,
  CheckCircle2,
  UserCheck,
  TriangleAlert,
  MapPin,
  Package,
  Wrench,
  Users,
  Zap,
  Droplets,
  RefreshCw,
  ClipboardList,
  Flag,
  Download,
  CloudLightning,
} from "lucide-react";

/* ---------------------------------------------------------------------
   MISSIONS LOGISTIQUES -- Bucolique Ferrières Musique Festival 2026
   Application d'attribution et de suivi, alignée sur le
   "LOGBOOK LOGISTIQUE BFMF 2026" (colonnes du Google Sheet).
   Données partagées entre tous les utilisateurs via Supabase (table app_store)
   (plusieurs téléphones du QG voient le même tableau).
--------------------------------------------------------------------- */

const STORAGE_KEY = "bfmf2026-missions-logistique";
const ALERT_KEY = "bfmf2026-logistique-alerte";
const PROFILE_KEY = "bfmf2026-profil";
const KEY_METEO = "bfmf2026-meteo";

const ROLES = [
  "QG / PCE",
  "Coordination générale",
  "Volante",
  "Responsable scène 1",
  "Responsable scène 2",
  "Responsable Étape 1",
  "Responsable Étape 2",
  "Responsable Étape 3",
  "Bénévole parking",
  "Bénévole sanitaire",
  "Sécurité privée",
  "Technique",
  "Bar / restauration",
  "Logistique",
  "Médical / secouriste",
  "Autre",
];

const MOTIFS_ALERTE = [
  "Situation bloquante générale",
  "Accès secours obstrué",
  "Panne critique (énergie, structure)",
  "Besoin de renfort immédiat",
  "Météo -- adaptation urgente",
  "Autre",
];

const STATUTS = ["A traiter", "Attribuee", "En cours", "Resolue"];

const TYPES_ENTREE = [
  "Nouveau besoin / probleme logistique",
  "Mise a jour d'un besoin existant",
  "Action realisee / cloture",
  "Retour d'experience / amelioration",
  "Test / exercice",
];

const PERIODES = [
  "Pre-ouverture",
  "Balade - depart 1",
  "Balade - depart 2",
  "Balade - depart 3",
  "Periode inter-balade",
  "Ouverture soiree",
  "Exploitation soiree",
  "Fermeture",
  "Demontage",
  "Test / exercice",
];

const FONCTIONS = [
  "QG / PCE",
  "Coordination générale",
  "Volante",
  "Responsable scène 1",
  "Responsable scène 2",
  "Responsable Étape 1",
  "Responsable Étape 2",
  "Responsable Étape 3",
  "Bénévole parking",
  "Bénévole sanitaire",
  "Sécurité privée",
  "Gestion artistique / backstage",
  "Technique",
  "Bar / restauration",
  "Foodtruck",
  "Logistique",
  "Médical / secouriste",
  "Autre",
];

const CANAUX_REMONTEE = [
  "PMR4.1",
  "PMR5",
  "PMR7.1",
  "PMR15",
  "PMR333",
  "PMR x",
  "Telephone",
  "En direct",
  "Autre",
];

const PRIORITES = {
  "P1 - immediat / critique": { dot: "bg-red-400", text: "text-red-300", ring: "ring-red-400/30", bg: "bg-red-400/10" },
  "P2 - urgent": { dot: "bg-amber-400", text: "text-amber-300", ring: "ring-amber-400/30", bg: "bg-amber-400/10" },
  "P3 - important non bloquant": { dot: "bg-sky-400", text: "text-sky-300", ring: "ring-sky-400/30", bg: "bg-sky-400/10" },
  "P4 - amelioration / des que possible": { dot: "bg-emerald-400", text: "text-emerald-300", ring: "ring-emerald-400/30", bg: "bg-emerald-400/10" },
};

const IMPACTS = [
  "la securite immediate",
  "l'acces secours",
  "l'exploitation en cours",
  "le public",
  "les artistes / backstage",
  "les sanitaires / l'hygiene",
  "le flux / la circulation",
  "le confort uniquement",
  "l'image de l'evenement",
  "aucun impact majeur a ce stade",
];

const CATEGORIES = [
  "Acces / circulation",
  "Parking",
  "Sanitaires",
  "Eau",
  "Dechets / proprete",
  "Electricite / energie",
  "Groupe electrogene",
  "Structure / montage",
  "Barrierage / Hera",
  "Signalisation / balisage",
  "Eclairage",
  "Foodtrucks / restauration",
  "Materiel manquant",
  "Transport / manutention",
  "Zone backstage / artistes",
  "Communication / radio",
  "Approvisionnement",
  "Confort public",
  "PMR / accessibilite",
  "Meteo / adaptation",
  "Autre",
];

const CATEGORIE_ICONS = {
  "Acces / circulation": Flag,
  Parking: Truck,
  Sanitaires: Droplets,
  Eau: Droplets,
  "Dechets / proprete": Droplets,
  "Electricite / energie": Zap,
  "Groupe electrogene": Zap,
  "Structure / montage": Wrench,
  "Barrierage / Hera": Flag,
  "Signalisation / balisage": Flag,
  Eclairage: Zap,
  "Foodtrucks / restauration": Package,
  "Materiel manquant": Package,
  "Transport / manutention": Truck,
  "Zone backstage / artistes": Users,
  "Communication / radio": ClipboardList,
  Approvisionnement: Package,
  "Confort public": Users,
  "PMR / accessibilite": Users,
  "Meteo / adaptation": TriangleAlert,
  Autre: ClipboardList,
};

const NATURES_BESOIN = [
  "Manque",
  "Panne",
  "Dysfonctionnement",
  "Saturation",
  "Degradation",
  "Demande de renfort",
  "Deplacement / repositionnement",
  "Remplacement",
  "Reapprovisionnement",
  "Nettoyage",
  "Securisation",
  "Information manquante",
  "A verifier",
  "Autre",
];

const ZONES = [
  "Point 0",
  "Parking public",
  "Scene 1",
  "Scene 2",
  "Plaine / public",
  "Bar",
  "Foodtrucks",
  "Sanitaires",
  "Backstage",
  "Zone logistique",
  "Parcours secteur A",
  "Parcours secteur B",
  "Parcours secteur C",
  "Parcours secteur D",
  "Etape 1",
  "Etape 2",
  "Etape 3",
  "Voie d'acces secours",
  "Hors site",
  "Autre",
];

const PPDS = ["Point 0", "PPD Etape 1", "PPD Etape 2", "PPD Etape 3", "Aucun", "Inconnu", "A preciser"];

const DELAIS = [
  "Immediatement",
  "< 15 min",
  "< 30 min",
  "< 1 h",
  "Pendant la sequence en cours",
  "Avant prochaine vague / prochain depart",
  "Avant ouverture soiree",
  "Avant fin de journee",
  "Apres exploitation",
  "Pour edition suivante / REX",
];

const EQUIPES = [
  "Volante",
  "Technique",
  "Logistique",
  "Responsable Étape 1",
  "Responsable Étape 2",
  "Responsable Étape 3",
  "Benevole parking",
  "Benevole sanitaire",
  "Bar / restauration",
  "Responsable scene 1",
  "Responsable scene 2",
  "Securite privee",
  "QG / PCE",
];

const TYPES_RESSOURCE = [
  "Vehicule / remorque",
  "Bras (2-3 personnes)",
  "Materiel technique",
  "Stock / reapprovisionnement",
  "Outillage",
  "Aucune (info seulement)",
];

const METEO_FALLBACK = {
  live: true,
  province: "Liege",
  codeActuel: "vert",
  maj: "Initialisation",
  timeline: [
    { creneau: "Prochaines heures", code: "vert", phenomene: "Conditions normales / RAS" }
  ],
};

const CODE_METEO = {
  vert: { text: "text-emerald-300", bg: "bg-emerald-400/10", ring: "ring-emerald-400/30", dot: "bg-emerald-400", label: "VERT" },
  jaune: { text: "text-amber-300", bg: "bg-amber-400/10", ring: "ring-amber-400/40", dot: "bg-amber-400", label: "JAUNE" },
  orange: { text: "text-orange-300", bg: "bg-orange-400/10", ring: "ring-orange-400/40", dot: "bg-orange-400", label: "ORANGE" },
  rouge: { text: "text-red-300", bg: "bg-red-400/10", ring: "ring-red-400/30", dot: "bg-red-400", label: "ROUGE" },
};

const MISSIONS_DEMO = [
  {
    id: "m1",
    ref: "LOG-2026-001",
    typeEntree: "Nouveau besoin / probleme logistique",
    dateEvenement: "2026-08-15",
    heureConstat: "14:20",
    periode: "Exploitation soiree",
    emetteurNom: "A. Lambert",
    equipeOrigine: "Responsable scene 1",
    canal: "PMR4.1",
    moyenContact: "Call sign SC1",
    zone: "Scene 1",
    localisation: "Bar principal, cote gauche scene",
    ppd: "Aucun",
    gps: "",
    categorie: "Approvisionnement",
    natureBesoin: "Reapprovisionnement",
    nature: "Rupture imminente futs de biere",
    description: "Stock bar scene 1 presque epuise, affluence forte prevue en soiree.",
    quantite: "8 futs 30L",
    depuisQuand: "constat a 14:15",
    priorite: "P2 - urgent",
    impacts: ["l'exploitation en cours", "le public"],
    bloquant: "Non",
    avantOuverture: "Non",
    delaiSouhaite: "< 1 h",
    actionDemandee: "Reapprovisionner depuis reserve Point 0",
    typeRessource: "Vehicule / remorque",
    ressourceDetail: "Camionnette + 2 personnes",
    attribueA: "Volante",
    responsableSuivi: "QG / PCE",
    arbitrage: "Non",
    statut: "En cours",
    heurePriseEnCompte: "14:35",
    heureEstimeeResolution: "15:30",
    actionEffectuee: "",
    realiseePar: "",
    regleTotalement: "",
    risqueResiduel: "",
    pointREX: "",
    historique: [
      { heure: "14:20", texte: "Demande creee par A. Lambert (Responsable scene 1)" },
      { heure: "14:35", texte: "Attribuee a Volante, prise en compte" },
    ],
  },
  {
    id: "m2",
    ref: "LOG-2026-002",
    typeEntree: "Nouveau besoin / probleme logistique",
    dateEvenement: "2026-08-15",
    heureConstat: "15:05",
    periode: "Exploitation soiree",
    emetteurNom: "M. Peeters",
    equipeOrigine: "Benevole sanitaire",
    canal: "PMR5",
    moyenContact: "",
    zone: "Etape 2",
    localisation: "Bloc sanitaire etape 2",
    ppd: "PPD Etape 2",
    gps: "",
    categorie: "Sanitaires",
    natureBesoin: "Saturation",
    nature: "Papier toilette epuise + poubelles pleines",
    description: "Les 4 cabines de l'etape 2 sont a sec, poubelles debordantes.",
    quantite: "1 caisse papier + 10 sacs",
    depuisQuand: "depuis 20 min",
    priorite: "P3 - important non bloquant",
    impacts: ["les sanitaires / l'hygiene", "le confort uniquement"],
    bloquant: "Non",
    avantOuverture: "Non",
    delaiSouhaite: "< 1 h",
    actionDemandee: "Reapprovisionner et vider poubelles",
    typeRessource: "Bras (2-3 personnes)",
    ressourceDetail: "2 benevoles avec stock",
    attribueA: "",
    responsableSuivi: "",
    arbitrage: "Non",
    statut: "A traiter",
    heurePriseEnCompte: "",
    heureEstimeeResolution: "",
    actionEffectuee: "",
    realiseePar: "",
    regleTotalement: "",
    risqueResiduel: "",
    pointREX: "",
    historique: [{ heure: "15:05", texte: "Demande creee par M. Peeters (Benevole sanitaire)" }],
  },
];

/* ------------------------------ Supabase ------------------------------ */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

async function kvGet(key) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: SB_HEADERS }
  );
  if (!r.ok) throw new Error(`Supabase GET ${r.status}`);
  const j = await r.json();
  return j.length ? j[0].value : null;
}

async function kvSet(key, value) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_store`, {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  return r.ok;
}

let profilMemoire = null;
async function loadProfile() {
  try {
    const s = localStorage.getItem(PROFILE_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {}
  return profilMemoire;
}
async function saveProfile(p) {
  profilMemoire = p;
  try {
    if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROFILE_KEY);
  } catch (e) {}
  return true;
}

async function loadMissions() {
  try {
    return await kvGet(STORAGE_KEY);
  } catch (e) {
    return null;
  }
}
async function saveMissions(missions) {
  try {
    return await kvSet(STORAGE_KEY, missions);
  } catch (e) {
    console.error("Erreur sauvegarde missions:", e);
    return false;
  }
}

async function loadAlerte() {
  try {
    return await kvGet(ALERT_KEY);
  } catch (e) {
    return null;
  }
}
async function saveAlerte(a) {
  try {
    return await kvSet(ALERT_KEY, a);
  } catch (e) {
    return false;
  }
}

/* ------------------------------ App ------------------------------ */

export default function LogistiqueMissions() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [now, setNow] = useState(new Date());
  const [meteoLive, setMeteoLive] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [alerte, setAlerte] = useState(null);
  const [showAlarme, setShowAlarme] = useState(false);

  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      setProfileLoaded(true);
    });
  }, []);

  const refresh = useCallback(async (initial = false) => {
    const [data, al, mto] = await Promise.all([loadMissions(), loadAlerte(), kvGet(KEY_METEO)]);
    if (data) {
      setMissions(data);
    } else if (initial) {
      setMissions(MISSIONS_DEMO);
      await saveMissions(MISSIONS_DEMO);
    }
    setAlerte(al && al.active ? al : null);
    setMeteoLive(mto && mto.live ? mto : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh(true);
    const t = setInterval(() => refresh(false), alerte ? 5000 : 15000);
    return () => clearInterval(t);
  }, [refresh, alerte]);

  async function persist(next) {
    setMissions(next);
    const ok = await saveMissions(next);
    setSaveError(!ok);
  }

  const signature = profile ? `${profile.nom} (${profile.role})` : "?";

  function updateMission(id, changes, logTexte) {
    const next = missions.map((m) => {
      if (m.id !== id) return m;
      const historique = logTexte
        ? [...(m.historique || []), { heure: nowHM(), texte: `${logTexte} -- par ${signature}` }]
        : m.historique;
      return { ...m, ...changes, historique };
    });
    persist(next);
    if (selected && selected.id === id) {
      setSelected(next.find((m) => m.id === id));
    }
  }

  async function declencherAlerte(data) {
    const a = {
      active: true,
      heure: nowHM(),
      auteur: signature,
      motif: data.motif || "Alerte",
      details: data.details || "",
      acquittePar: "",
      heureAcquittement: "",
    };
    setAlerte(a);
    await saveAlerte(a);
    setShowAlarme(false);
  }

  async function acquitterAlerte() {
    if (!alerte) return;
    const a = { ...alerte, acquittePar: signature, heureAcquittement: nowHM() };
    setAlerte(a);
    await saveAlerte(a);
  }

  async function leverAlerte() {
    if (!alerte) return;
    const a = { ...alerte, active: false, leveePar: signature, heureLevee: nowHM() };
    setAlerte(null);
    await saveAlerte(a);
  }

  function addMission(data) {
    const mission = {
      ...data,
      id: `m${Date.now()}`,
      ref: genRef(missions.length),
      heureConstat: data.heureConstat || nowHM(),
      statut: "A traiter",
      attribueA: "",
      responsableSuivi: "",
      heurePriseEnCompte: "",
      heureEstimeeResolution: "",
      actionEffectuee: "",
      realiseePar: "",
      regleTotalement: "",
      risqueResiduel: "",
      pointREX: "",
      historique: [
        {
          heure: nowHM(),
          texte: `Demande creee par ${data.emetteurNom || "?"} (${data.equipeOrigine || "?"}) -- saisie: ${signature}`,
        },
      ],
    };
    persist([mission, ...missions]);
    setShowForm(false);
  }

  function attribuer(id, equipe) {
    updateMission(
      id,
      { attribueA: equipe, statut: "Attribuee", heurePriseEnCompte: nowHM(), responsableSuivi: "QG / PCE" },
      `Attribuee a ${equipe}`
    );
  }

  function demarrer(id) {
    updateMission(id, { statut: "En cours" }, "Traitement demarre");
  }

  function resoudre(id, detail) {
    updateMission(
      id,
      {
        statut: "Resolue",
        actionEffectuee: detail.action || "",
        realiseePar: detail.par || "",
        regleTotalement: detail.regle || "Oui",
        risqueResiduel: detail.risqueResiduel || "",
        causeProbable: detail.causeProbable || "",
        recommandation: detail.recommandation || "",
        heureResolution: nowHM(),
      },
      `Resolue${detail.par ? " par " + detail.par : ""}`
    );
  }

  const filtered = filtreStatut === "Tous" ? missions : missions.filter((m) => m.statut === filtreStatut);
  const counts = STATUTS.reduce((acc, s) => ({ ...acc, [s]: missions.filter((m) => m.statut === s).length }), {});
  const bloquantes = missions.filter((m) => m.statut !== "Resolue" && (m.bloquant === "Oui" || m.priorite === "P1 - immediat / critique")).length;

  const METEO = meteoLive || METEO_FALLBACK;
  const mc = CODE_METEO[METEO.codeActuel] || CODE_METEO["vert"];

  function exportCSV() {
    const cols = [
      ["Reference", "ref"], ["Type d'entree", "typeEntree"], ["Date de l'evenement", "dateEvenement"],
      ["Heure du constat", "heureConstat"], ["Periode / sequence", "periode"],
      ["Emetteur (nom prenom)", "emetteurNom"], ["Fonction / equipe", "equipeOrigine"],
      ["Canal de remontee", "canal"], ["Moyen de contact", "moyenContact"],
      ["Zone principale", "zone"], ["Localisation precise", "localisation"],
      ["PPD / repere secours", "ppd"], ["GPS / carte", "gps"],
      ["Categorie principale", "categorie"], ["Nature du besoin", "natureBesoin"],
      ["Titre", "nature"], ["Description", "description"], ["Quantite/volume", "quantite"],
      ["Depuis quand", "depuisQuand"], ["Priorite", "priorite"], ["Impacts", "impacts"],
      ["Bloquant", "bloquant"], ["Avant ouverture/poursuite", "avantOuverture"],
      ["Delai souhaite", "delaiSouhaite"], ["Action demandee", "actionDemandee"],
      ["Type de ressource", "typeRessource"], ["Ressource detaillee", "ressourceDetail"],
      ["Arbitrage", "arbitrage"], ["Attribuee a", "attribueA"], ["Responsable suivi", "responsableSuivi"],
      ["Heure prise en compte", "heurePriseEnCompte"], ["Resolution estimee", "heureEstimeeResolution"],
      ["Statut", "statut"], ["Heure de resolution", "heureResolution"],
      ["Action effectuee", "actionEffectuee"], ["Realisee par", "realiseePar"],
      ["Totalement regle", "regleTotalement"], ["Risque residuel", "risqueResiduel"],
      ["Cause probable (REX)", "causeProbable"], ["Recommandation (REX)", "recommandation"],
      ["Historique", "historique"],
    ];
    const esc = (v) => {
      let s =
        v == null
          ? ""
          : Array.isArray(v)
          ? v.map((h) => (h && h.heure ? `${h.heure} ${h.texte}` : String(h))).join(" | ")
          : String(v);
      if (/[";\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const lines = [
      cols.map((c) => esc(c[0])).join(";"),
      ...missions.map((m) => cols.map((c) => esc(m[c[1]])).join(";")),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logbook-logistique-bfmf2026-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (profileLoaded && !profile) {
    return (
      <ProfilSetup
        onSave={async (p) => {
          setProfile(p);
          await saveProfile(p);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=500;600;700&family=Inter:wght=400;500;600;700&family=JetBrains+Mono:wght=400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes pulseSlow { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        .pulse-slow { animation: pulseSlow 1.8s ease-in-out infinite; }
      `}</style>

      <header className="border-b border-white/10 bg-[#151b23]/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="font-display tracking-wide text-[15px] leading-none truncate">MISSIONS LOGISTIQUES</div>
              <div className="text-[11px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · QG BUCO</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setShowAlarme(true)}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded ring-2 ring-red-400/60 bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors font-semibold"
              title="Declencher une alerte visible par tous"
            >
              <TriangleAlert className="w-4 h-4" /> SOS
            </button>
            <button
              onClick={() => refresh(false)}
              className="text-slate-500 hover:text-slate-200 transition-colors"
              title="Rafraichir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                setProfile(null);
                await saveProfile(null);
              }}
              className="hidden sm:block text-[11px] font-mono text-slate-500 hover:text-slate-300 max-w-[120px] truncate"
              title="Changer de profil"
            >
              {profile ? profile.nom : ""}
            </button>
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />
              {pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {alerte && (
          <div className="rounded-lg ring-2 ring-red-400/60 bg-red-500/15 p-4">
            <div className="flex items-start gap-3">
              <TriangleAlert className="w-5 h-5 text-red-300 pulse-slow shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-display text-red-200 text-sm tracking-wide">
                  ALERTE EN COURS — {alerte.motif}
                </div>
                <div className="text-xs text-red-200/80 mt-1">
                  Declenchee a {alerte.heure} par {alerte.auteur}
                  {alerte.details ? ` — ${alerte.details}` : ""}
                </div>
                {alerte.acquittePar && (
                  <div className="text-[11px] font-mono text-red-200/60 mt-1">
                    Acquittee par {alerte.acquittePar} a {alerte.heureAcquittement}
                  </div>
                )}
                <div className="text-[11px] font-mono text-red-200/60 mt-1.5">
                  Rappel : urgence vitale = 112 en priorite + PMR333. Cette alerte ne remplace pas la radio.
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {!alerte.acquittePar && (
                  <button
                    onClick={acquitterAlerte}
                    className="text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-red-300/50 text-red-100 hover:bg-red-400/20"
                  >
                    Acquitter
                  </button>
                )}
                <button
                  onClick={leverAlerte}
                  className="text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-white/30 text-slate-200 hover:bg-white/10"
                >
                  Lever l'alerte
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUIVI MÉTÉO - PANEL INTERNE REPRISE DU DASHBOARD PRINCIPAL */}
        <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2">
              <CloudLightning className="w-4 h-4 text-slate-500" /> MONITEUR MÉTÉO INTERNE BFMF
            </h2>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ring-1 ${mc.ring} ${mc.bg} ${mc.text}`}>
              {mc.label}
            </span>
          </div>
          
          <div className="text-[11px] font-mono text-slate-400 mb-2 px-1">
            Status : {METEO.maj}
          </div>

          <div className="space-y-2">
            {METEO.timeline && METEO.timeline.map((t, i) => {
              if (!t) return null;
              
              const tc = CODE_METEO[t.code] || CODE_METEO["vert"];
              const texteAlerteDefinitif = t.phenomene || "Pas de précisions terrain";
              const labelCreneau = t.creneau || "Horizon en cours";

              const lowerText = texteAlerteDefinitif.toLowerCase();
              let typeAlea = "";
              let aleaClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";

              if (lowerText.includes("orage")) {
                typeAlea = "Orages";
                aleaClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
              } else if (lowerText.includes("chaleur") || lowerText.includes("canicule") || lowerText.includes("température") || lowerText.includes("chaud")) {
                typeAlea = "Chaleur";
                aleaClass = "bg-orange-500/10 text-orange-400 border-orange-500/20";
              } else if (lowerText.includes("pluie") || lowerText.includes("précipit") || lowerText.includes("inond") || lowerText.includes("flotte")) {
                typeAlea = "Précipitations";
                aleaClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
              } else if (lowerText.includes("vent") || lowerText.includes("rafale") || lowerText.includes("tempête") || lowerText.includes("coup de vent")) {
                typeAlea = "Vent";
                aleaClass = "bg-sky-500/10 text-sky-300 border-sky-500/20";
              } else if (t.code === "jaune" || t.code === "orange" || t.code === "rouge") {
                typeAlea = "Vigilance";
                aleaClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
              }

              return (
                <div key={i} className="flex items-center justify-between text-xs rounded bg-white/[0.02] border border-white/5 p-2.5 transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${tc.dot} shrink-0`} />
                    {typeAlea && (
                      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${aleaClass}`}>
                        {typeAlea}
                      </span>
                    )}
                    <span className="text-slate-100 font-medium truncate">
                      {texteAlerteDefinitif}
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono text-[10px] shrink-0 ml-2">{labelCreneau}</span>
                </div>
              );
            })}
          </div>
        </section>

        {saveError && (
          <div className="rounded-md bg-red-400/10 ring-1 ring-red-400/30 text-red-300 text-xs px-3 py-2">
            Sauvegarde impossible -- verifiez la connexion. Les modifications locales peuvent etre perdues.
          </div>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="A traiter" value={counts["A traiter"] || 0} accent={counts["A traiter"] > 0 ? "text-amber-300" : "text-slate-200"} />
          <Kpi label="Attribuees" value={counts["Attribuee"] || 0} accent="text-sky-300" />
          <Kpi label="En cours" value={counts["En cours"] || 0} accent="text-slate-200" />
          <Kpi label="Bloquantes" value={bloquantes} accent={bloquantes > 0 ? "text-red-300" : "text-emerald-300"} />
        </section>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {["Tous", ...STATUTS].map((s) => (
              <button
                key={s}
                onClick={() => setFiltreStatut(s)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-full ring-1 transition-colors ${
                  filtreStatut === s
                    ? "ring-amber-400/40 bg-amber-400/10 text-amber-300"
                    : "ring-white/15 text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}
                {s !== "Tous" && ` (${counts[s] || 0})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded ring-1 ring-white/15 text-slate-400 hover:text-slate-200 hover:ring-white/30 transition-colors"
              title="Exporter toutes les missions en CSV pour archivage dans le Google Sheet"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded ring-1 ring-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nouvelle demande
            </button>
          </div>
        </div>

        <section className="space-y-2">
          {loading && <div className="text-sm text-slate-500 py-8 text-center">Chargement des missions...</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-sm text-slate-500 py-8 text-center rounded-lg ring-1 ring-white/10 bg-[#151b23]">
              Aucune mission {filtreStatut !== "Tous" ? `au statut "${filtreStatut}"` : ""}.
            </div>
          )}
          {!loading && filtered.map((m) => {
            const p = PRIORITES[m.priorite] || PRIORITES["P3 - important non bloquant"];
            const Icon = CATEGORIE_ICONS[m.categorie] || ClipboardList;
            const estBloquante = m.bloquant === "Oui" || m.priorite === "P1 - immediat / critique";
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className={`w-full text-left rounded-lg ring-1 p-3.5 transition-colors bg-[#151b23] hover:bg-[#1a212b] ${
                  estBloquante && m.statut !== "Resolue" ? "ring-red-400/30" : "ring-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.dot} shrink-0 ${estBloquante && m.statut !== "Resolue" ? "pulse-slow" : ""}`} />
                  <span className="font-mono text-[11px] text-slate-500 shrink-0">{m.ref}</span>
                  <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-200 flex-1 min-w-0 truncate">{m.nature}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                </div>
                <div className="pl-[18px] mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ring-1 ${p.ring} ${p.bg} ${p.text}`}>{m.priorite}</span>
                  <StatutBadge statut={m.statut} />
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {m.zone}
                  </span>
                  {m.attribueA && (
                    <span className="text-[11px] text-sky-300 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> {m.attribueA}
                    </span>
                  )}
                  {m.delaiSouhaite && (
                    <span className="text-[11px] text-slate-500 font-mono">delai: {m.delaiSouhaite}</span>
                  )}
                </div>
              </button>
            );
          })}
        </section>

        <div className="text-[10px] text-slate-600 font-mono text-center pt-2">
          Donnees partagees entre tous les utilisateurs de cette application (QG, equipes terrain). Rafraichissement automatique toutes les 15 s.
        </div>
      </main>

      {showForm && <FormNouvelle onClose={() => setShowForm(false)} onSubmit={addMission} />}
      {showAlarme && <AlarmeForm onClose={() => setShowAlarme(false)} onDeclencher={declencherAlerte} />}
      {selected && (
        <MissionDetail
          mission={missions.find((m) => m.id === selected.id) || selected}
          onClose={() => setSelected(null)}
          onAttribuer={attribuer}
          onDemarrer={demarrer}
          onResoudre={resoudre}
        />
      )}
    </div>
  );
}

/* --------------------------- Sous-composants --------------------------- */

function Kpi({ label, value, accent }) {
  return (
    <div className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-3">
      <div className="text-[10px] font-mono text-slate-500 tracking-wide uppercase">{label}</div>
      <div className={`font-display text-2xl mt-0.5 ${accent}`}>{value}</div>
    </div>
  );
}

function ProfilSetup({ onSave }) {
  const [nom, setNom] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const valid = nom.trim().length >= 2;
  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans flex items-center justify-center p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>
      <div className="bg-[#1a212b] ring-1 ring-white/15 rounded-lg w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center">
            <Truck className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="font-display tracking-wide text-white">MISSIONS LOGISTIQUES BFMF 2026</div>
            <div className="text-[11px] text-slate-400 font-mono">Identifiez-vous pour commencer</div>
          </div>
        </div>
        <div className="space-y-3">
          <Field label="Votre nom / call sign *">
            <input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: J. Dupont" />
          </Field>
          <Field label="Votre role">
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="text-[11px] text-slate-500 mt-3 leading-relaxed">
          Ce profil est memorise sur cet appareil et signe toutes vos actions (creations, attributions, clotures, alertes). Ce n'est pas une authentification securisee : l'app reste reservee a l'equipe.
        </div>
        <button
          disabled={!valid}
          onClick={() => onSave({ nom: nom.trim(), role })}
          className={`w-full mt-4 text-sm font-mono px-4 py-2.5 rounded ring-1 transition-colors ${
            valid
              ? "ring-emerald-400/60 bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30"
              : "ring-white/10 text-slate-600 cursor-not-allowed"
          }`}
        >
          Commencer
        </button>
      </div>
    </div>
  );
}

function AlarmeForm({ onClose, onDeclencher }) {
  const [motif, setMotif] = useState(MOTIFS_ALERTE[0]);
  const [details, setDetails] = useState("");
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#1a212b] ring-2 ring-red-400/50 rounded-lg w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-display text-xl text-red-200 flex items-center gap-2">
            <TriangleAlert className="w-5 h-5" /> Declencher une alerte
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-[11px] text-red-200/70 mb-4 leading-relaxed">
          L'alerte s'affiche sur tous les appareils connectes a cette app (delai de quelques secondes). Pour une urgence vitale : 112 d'abord, puis PMR333. Cet outil complete la radio, il ne la remplace pas.
        </div>
        <div className="space-y-3">
          <Field label="Motif *">
            <select className={inputCls} value={motif} onChange={(e) => setMotif(e.target.value)}>
              {MOTIFS_ALERTE.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Details (localisation, situation)">
            <textarea
              className={inputCls}
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Ex: acces secours parking bloque cote nord"
            />
          </Field>
        </div>
        <button
          onClick={() => onDeclencher({ motif, details })}
          className="w-full mt-4 text-sm font-mono font-semibold px-4 py-3 rounded ring-2 ring-red-400/70 bg-red-500/25 text-red-100 hover:bg-red-500/40 transition-colors"
        >
          DECLENCHER L'ALERTE
        </button>
      </div>
    </div>
  );
}

function StatutBadge({ statut }) {
  const styles = {
    "A traiter": "ring-amber-400/30 bg-amber-400/10 text-amber-300",
    Attribuee: "ring-sky-400/30 bg-sky-400/10 text-sky-300",
    "En cours": "ring-white/20 bg-white/5 text-slate-300",
    Resolue: "ring-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  };
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ring-1 ${styles[statut] || styles["A traiter"]}`}>
      {statut}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide mb-1.5">{label}</div>
      {children}
    </label>
  );
}

const inputCls =
  "w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-2.5 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60";

function SectionTitle({ children }) {
  return (
    <div className="text-[11px] font-mono text-amber-300/90 uppercase tracking-wider pt-2 pb-1 border-b border-white/10">
      {children}
    </div>
  );
}

function FormNouvelle({ onClose, onSubmit }) {
  const today = new Date().toISOString().slice(0, 10);
  
  const [emetteurNom, setEmetteurNom] = useState("");
  const [equipeOrigine, setEquipeOrigine] = useState(FONCTIONS[15]); // Logistique par défaut
  const [canal, setCanal] = useState(CANAUX_REMONTEE[6]); // Téléphone par défaut
  const [zone, setZone] = useState(ZONES[0]);
  const [localisation, setLocalisation] = useState("");
  const [categorie, setCategorie] = useState(CATEGORIES[0]);
  const [natureBesoin, setNatureBesoin] = useState(NATURES_BESOIN[0]);
  const [nature, setNature] = useState("");
  const [description, setDescription] = useState("");
  const [priorite, setPriorite] = useState("P3 - important non bloquant");
  const [bloquant, setBloquant] = useState("Non");

  const valid = nature.trim() && emetteurNom.trim() && localisation.trim() && description.trim();

  const handleCreate = () => {
    if (!valid) return;

    const completeData = {
      typeEntree: "Nouveau besoin / probleme logistique",
      dateEvenement: today,
      heureConstat: nowHM(),
      periode: "Exploitation soiree",
      emetteurNom: emetteurNom.trim(),
      equipeOrigine,
      canal,
      moyenContact: "",
      zone,
      localisation: localisation.trim(),
      ppd: "Aucun",
      gps: "",
      categorie,
      natureBesoin,
      nature: nature.trim(),
      description: description.trim(),
      quantite: "",
      depuisQuand: "",
      priorite,
      impacts: [],
      bloquant,
      avantOuverture: "Non",
      delaiSouhaite: "< 1 h",
      actionDemandee: "",
      typeRessource: "Aucune (info seulement)",
      ressourceDetail: "",
      arbitrage: "Non",
    };

    onSubmit(completeData);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#1a212b] ring-1 ring-white/15 rounded-lg w-full max-w-lg max-h-[85vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-xl text-white">Nouvelle demande</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Saisie rapide terrain</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-[#151b23]/50 p-3 rounded border border-white/5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Qui signale le besoin ? *">
                <input 
                  className={inputCls} 
                  value={emetteurNom} 
                  onChange={(e) => setEmetteurNom(e.target.value)} 
                  placeholder="Ex: P. Ledoux" 
                />
              </Field>
              <Field label="Son équipe / fonction *">
                <select className={inputCls} value={equipeOrigine} onChange={(e) => setEquipeOrigine(e.target.value)}>
                  {FONCTIONS.map((fn) => (
                    <option key={fn} value={fn}>{fn}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Canal de réception (Radio / GSM) *">
              <select className={inputCls} value={canal} onChange={(e) => setCanal(e.target.value)}>
                {CANAUX_REMONTEE.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="bg-[#151b23]/50 p-3 rounded border border-white/5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Zone générale *">
                <select className={inputCls} value={zone} onChange={(e) => setZone(e.target.value)}>
                  {ZONES.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </Field>
              <Field label="Localisation précise / Repère terrain *">
                <input 
                  className={inputCls} 
                  value={localisation} 
                  onChange={(e) => setLocalisation(e.target.value)} 
                  placeholder="Ex: Derrière le container du bar 1" 
                />
              </Field>
            </div>
          </div>

          <div className="bg-[#151b23]/50 p-3 rounded border border-white/5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Catégorie *">
                <select className={inputCls} value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nature du problème *">
                <select className={inputCls} value={natureBesoin} onChange={(e) => setNatureBesoin(e.target.value)}>
                  {NATURES_BESOIN.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Titre court de l'incident *">
              <input 
                className={inputCls} 
                value={nature} 
                onChange={(e) => setNature(e.target.value)} 
                placeholder="Ex: Plus d'électricité au Foodtruck frites" 
              />
            </Field>

            <Field label="Description / Détails factuels *">
              <textarea
                className={inputCls}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détaillez le problème (conséquences, volume manquant...)"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-[#151b23]/50 p-3 rounded border border-white/5">
            <Field label="Niveau de priorité *">
              <select className={inputCls} value={priorite} onChange={(e) => setPriorite(e.target.value)}>
                {Object.keys(PRIORITES).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Situation bloquante ? *">
              <select className={inputCls} value={bloquant} onChange={(e) => setBloquant(e.target.value)}>
                <option>Non</option>
                <option>Oui</option>
                <option>Potentiellement</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-white/15">
          <button onClick={onClose} className="text-sm font-mono px-4 py-2 rounded ring-1 ring-white/25 text-slate-300 hover:text-white hover:ring-white/40">
            Annuler
          </button>
          <button
            disabled={!valid}
            onClick={handleCreate}
            className={`text-sm font-mono px-4 py-2 rounded ring-1 transition-colors ${
              valid
                ? "ring-emerald-400/60 bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30"
                : "ring-white/10 text-slate-600 cursor-not-allowed"
            }`}
          >
            Créer la demande
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wide">{label}</div>
      <div className="text-xs text-slate-300 mt-0.5">{value || "--"}</div>
    </div>
  );
}

function MissionDetail({ mission, onClose, onAttribuer, onDemarrer, onResoudre }) {
  const m = mission;
  const p = PRIORITES[m.priorite] || PRIORITES["P3 - important non bloquant"];
  const [equipe, setEquipe] = useState(m.attribueA || EQUIPES[0]);
  const [showResolve, setShowResolve] = useState(false);
  const [resolveData, setResolveData] = useState({ action: "", par: "", regle: "Oui", risqueResiduel: "", causeProbable: "", recommandation: "" });

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#151b23] ring-1 ring-white/10 rounded-lg w-full max-w-lg max-h-[88vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-mono text-slate-500">{m.ref}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ring-1 ${p.ring} ${p.bg} ${p.text}`}>{m.priorite}</span>
              <StatutBadge statut={m.statut} />
              {m.bloquant === "Oui" && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded ring-1 ring-red-400/30 bg-red-400/10 text-red-300 flex items-center gap-1">
                  <TriangleAlert className="w-3 h-3" /> Bloquant
                </span>
              )}
            </div>
            <h3 className="font-display text-lg text-slate-100 leading-snug">{m.nature}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {m.description && <div className="text-xs text-slate-400 leading-relaxed mb-4">{m.description}</div>}

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-3 mb-4">
          <Info label="Type d'entree" value={m.typeEntree} />
          <Info label="Periode / sequence" value={m.periode} />
          <Info label="Date" value={m.dateEvenement} />
          <Info label="Heure du constat" value={m.heureConstat} />
          <Info label="Emetteur" value={m.emetteurNom} />
          <Info label="Fonction / equipe" value={m.equipeOrigine} />
          <Info label="Canal de remontee" value={m.canal} />
          <Info label="Moyen de contact" value={m.moyenContact} />
          <Info label="Zone" value={m.zone} />
          <Info label="Localisation precise" value={m.localisation} />
          <Info label="PPD / repere secours" value={m.ppd} />
          <Info label="GPS / carte" value={m.gps} />
          <Info label="Categorie" value={m.categorie} />
          <Info label="Nature du besoin" value={m.natureBesoin} />
          <Info label="Quantite / volume" value={m.quantite} />
          <Info label="Depuis quand" value={m.depuisQuand} />
          <Info label="Avant ouverture / poursuite" value={m.avantOuverture} />
          <Info label="Delai souhaite" value={m.delaiSouhaite} />
          <Info label="Action demandee" value={m.actionDemandee} />
          <Info label="Arbitrage necessaire" value={m.arbitrage} />
          <Info label="Type de ressource" value={m.typeRessource} />
          <Info label="Ressource detaillee" value={m.ressourceDetail} />
        </div>

        {m.impacts && m.impacts.length > 0 && (
          <div className="border-t border-white/10 pt-3 mb-4">
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wide mb-1.5">Le besoin impacte</div>
            <div className="flex flex-wrap gap-1.5">
              {m.impacts.map((imp) => (
                <span key={imp} className="text-[11px] px-2 py-0.5 rounded-full ring-1 ring-amber-400/30 bg-amber-400/10 text-amber-200">
                  {imp}
                </span>
              ))}
            </div>
          </div>
        )}

        {(m.attribueA || m.heurePriseEnCompte) && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-3 mb-4">
            <Info label="Attribuee a" value={m.attribueA} />
            <Info label="Responsable suivi" value={m.responsableSuivi} />
            <Info label="Prise en compte" value={m.heurePriseEnCompte} />
            <Info label="Resolution estimee" value={m.heureEstimeeResolution} />
          </div>
        )}

        {m.statut === "Resolue" && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-3 mb-4">
            <Info label="Action effectuee" value={m.actionEffectuee} />
            <Info label="Realisee par" value={m.realiseePar} />
            <Info label="Heure de resolution" value={m.heureResolution} />
            <Info label="Totalement regle" value={m.regleTotalement} />
            <Info label="Risque residuel" value={m.risqueResiduel} />
            <Info label="Cause probable (REX)" value={m.causeProbable} />
            <Info label="Recommandation (REX)" value={m.recommandation} />
          </div>
        )}

        {m.historique && m.historique.length > 0 && (
          <div className="border-t border-white/10 pt-3 mb-4">
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wide mb-2">Historique</div>
            <div className="space-y-1">
              {m.historique.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="font-mono text-slate-600 shrink-0">{h.heure}</span>
                  <span className="text-slate-400">{h.texte}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/10 pt-4">
          {m.statut === "A traiter" && (
            <div className="flex items-center gap-2">
              <select className={inputCls + " flex-1"} value={equipe} onChange={(e) => setEquipe(e.target.value)}>
                {EQUIPES.map((eq) => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
              <button
                onClick={() => onAttribuer(m.id, equipe)}
                className="shrink-0 flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded ring-1 ring-sky-400/40 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" /> Attribuer
              </button>
            </div>
          )}

          {m.statut === "Attribuee" && (
            <button
              onClick={() => onDemarrer(m.id)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-mono px-3 py-2 rounded ring-1 ring-white/20 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors"
            >
              <CircleDot className="w-3.5 h-3.5" /> Marquer "En cours"
            </button>
          )}

          {m.statut === "En cours" && !showResolve && (
            <button
              onClick={() => setShowResolve(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-mono px-3 py-2 rounded ring-1 ring-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Marquer comme resolue
            </button>
          )}

          {m.statut === "En cours" && showResolve && (
            <div className="space-y-2">
              <Field label="Action reellement effectuee">
                <input
                  className={inputCls}
                  value={resolveData.action}
                  onChange={(e) => setResolveData({ ...resolveData, action: e.target.value })}
                  placeholder="Ex: 8 futs livres au bar scene 1"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Par qui">
                  <input
                    className={inputCls}
                    value={resolveData.par}
                    onChange={(e) => setResolveData({ ...resolveData, par: e.target.value })}
                    placeholder="Ex: Equipe volante"
                  />
                </Field>
                <Field label="Totalement regle ?">
                  <select
                    className={inputCls}
                    value={resolveData.regle}
                    onChange={(e) => setResolveData({ ...resolveData, regle: e.target.value })}
                  >
                    <option>Oui</option>
                    <option>Partiellement</option>
                    <option>Non</option>
                  </select>
                </Field>
              </div>
              <Field label="Risque residuel / point de vigilance">
                <input
                  className={inputCls}
                  value={resolveData.risqueResiduel}
                  onChange={(e) => setResolveData({ ...resolveData, risqueResiduel: e.target.value })}
                  placeholder="Ex: stock restant faible, a surveiller"
                />
              </Field>
              <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wide pt-1">REX -- prochaine edition (optionnel)</div>
              <Field label="Cause probable">
                <input
                  className={inputCls}
                  value={resolveData.causeProbable}
                  onChange={(e) => setResolveData({ ...resolveData, causeProbable: e.target.value })}
                  placeholder="Ex: sous-estimation conso soiree"
                />
              </Field>
              <Field label="Recommandation prochaine edition">
                <input
                  className={inputCls}
                  value={resolveData.recommandation}
                  onChange={(e) => setResolveData({ ...resolveData, recommandation: e.target.value })}
                  placeholder="Ex: prevoir +30% de stock scene 1"
                />
              </Field>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setShowResolve(false)} className="text-xs font-mono px-3 py-1.5 rounded ring-1 ring-white/15 text-slate-400 hover:text-slate-200">
                  Annuler
                </button>
                <button
                  onClick={() => onResoudre(m.id, resolveData)}
                  className="text-xs font-mono px-3 py-1.5 rounded ring-1 ring-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 transition-colors"
                >
                  Confirmer la resolution
                </button>
              </div>
            </div>
          )}

          {m.statut === "Resolue" && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-slate-500 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Mission cloturee
            </div>
          )}
        </div>
      </div>
    </div>
  );
}