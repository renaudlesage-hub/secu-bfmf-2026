import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  TriangleAlert,
  Radio,
  Clock,
  CircleDot,
  CloudLightning,
  ExternalLink,
  Footprints,
  ClipboardList,
  Droplets,
  PlusCircle,
  Smile,
  Meh,
  Frown,
  Rss,
  Wrench,
  AlertTriangle,
  Sun,
  Sunset,
  Compass,
  MapPin,
} from "lucide-react";

/* ---------------------------------------------------------------------
   DASHBOARD QG (Version - Panneau Parcours PCOps & Alignement SOS)
   Bucolique Ferrières Musique Festival 2026
--------------------------------------------------------------------- */

import { SUPABASE_URL, SUPABASE_ANON_KEY, myMapsUrl } from "../config";
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

const KEY_MISSIONS = "bfmf2026-missions-logistique";
const KEY_GROUPES = "bfmf2026-suivi-balade";
const KEY_ALERTE_LOG = "bfmf2026-logistique-alerte";
const KEY_ALERTE_BAL = "bfmf2026-suivi-balade-alerte";
const KEY_SOS_PART = "bfmf2026-sos-participants";
const KEY_CONSIGNE = "bfmf2026-volante-consigne";
const KEY_METEO = "bfmf2026-meteo";
const KEY_SANITAIRE = "bfmf2026-sanitaire";
const KEY_MEDIAS = "bfmf2026-medias-live";

const PRVS = ["Point 0", "PRV#4", "PRV#5", "PRV#6", "PRV#7", "Etape 1", "Etape 2", "Etape 3"];

const POINTS_GPS = {
  "Site grande scène": { lat: 50.3838, lon: 5.6212, km: 0, segment: "Plaine centrale — Grande Scène", ordre: 0 },
  "Site petite scène": { lat: 50.3832, lon: 5.6219, km: 0, segment: "Plaine centrale — Petite Scène", ordre: 0 },
  "Site plaine": { lat: 50.3835, lon: 5.6215, km: 0, segment: "Zone Public / Pelouse", ordre: 0 },
  "Site bar": { lat: 50.3836, lon: 5.6222, km: 0, segment: "Zone Débit de Boissons", ordre: 0 },
  "Site foodtrucks": { lat: 50.3831, lon: 5.6208, km: 0, segment: "Allée Restauration", ordre: 0 },
  "Site sanitaires": { lat: 50.3841, lon: 5.6211, km: 0, segment: "Blocs WC Publics", ordre: 0 },
  "Site backstage": { lat: 50.3842, lon: 5.6201, km: 0, segment: "Coulisses / Loges", ordre: 0 },
  "Site zone logistique": { lat: 50.3845, lon: 5.6195, km: 0, segment: "Stockage technique / Énergie", ordre: 0 },
  "Parking public": { lat: 50.3815, lon: 5.6182, km: 0, segment: "Zone Stationnement Public", ordre: 0 },
  "Parking artistes": { lat: 50.3848, lon: 5.6198, km: 0, segment: "Zone Accès Contrôlé Artistes", ordre: 0 },
  "Point 0": { lat: 50.3835, lon: 5.6215, km: 0, segment: "Secteur Départ", ordre: 1 },
  "Parcours Balade secteur A": { lat: 50.3821, lon: 5.6167, km: 0.5, segment: "Sentier départ forêt", ordre: 2 },
  "PRV#4": { lat: 50.38212, lon: 5.61673, km: 0.5, segment: "Balisage Secours #4", ordre: 3 },
  "Etape 1": { lat: 50.37858, lon: 5.6279, km: 0.9, segment: "Ravitaillement 1", ordre: 4 },
  "Parcours Balade secteur B": { lat: 50.3756, lon: 5.6441, km: 1.8, segment: "Tracé Sud - Vers Étape 2", ordre: 5 },
  "PRV#5": { lat: 50.37568, lon: 5.64412, km: 2.5, segment: "Balisage Secours #5", ordre: 6 },
  "Etape 2": { lat: 50.37828, lon: 5.64549, km: 2.53, segment: "Ravitaillement 2", ordre: 7 },
  "Parcours Balade secteur C": { lat: 50.3823, lon: 5.6457, km: 3.5, segment: "Tracé Est Crête", ordre: 8 },
  "PRV#6": { lat: 50.38236, lon: 5.64579, km: 3.8, segment: "Balisage Secours #6", ordre: 9 },
  "Etape 3": { lat: 50.38817, lon: 5.62891, km: 5.06, segment: "Ravitaillement 3", ordre: 10 },
  "Parcours Balade secteur D": { lat: 50.3886, lon: 5.6269, km: 5.8, segment: "Secteur Nord Retour P0", ordre: 11 },
  "PRV#7": { lat: 50.38865, lon: 5.62692, km: 5.5, segment: "Balisage Secours #7", ordre: 12 }
};

const CAPACITE_ETAPE = 300;
const DISTANCE_TOTALE_BOUCLE = 6.2; // Distance totale théorique de la balade gourmande (km)

const METEO_FALLBACK = {
  live: true,
  province: "Liege",
  codeActuel: "vert",
  maj: "Initialisation",
  timeline: [{ creneau: "Prochaines heures", code: "vert", phenomene: "Conditions normales / RAS" }],
  station: "Ferrières (Province de Liège)",
  statutAlerte: "jaune",
  titre: "Avertissement Chaleur",
  validite: "Du 10/07/2026 00:00 au 15/07/2026 00:00",
  description: "Le SPF Santé Publique maintient la phase d'avertissement du Plan Forte Chaleur et Pics d'Ozone.",
  source: "Institut Royal Météorologique (IRM)",
  obsHeure: "17h00",
  obsResume: "Temps ensoleillé et sec — 22°C",
  obsLever: "05h38",
  obsCoucher: "21h52",
  obsUV: "6.8 (Élevé)",
  urlFerrieres: "https://www.meteo.be/fr/ferrieres"
};

const MEDIAS_FALLBACK = {
  ambiance: "neutre",
  maj: "il y a 8 min",
  canaux: [
    { name: "Facebook (Groupe Local Ferrières)", statut: "attention", note: "Plaintes sur l'attente au parking public" },
    { name: "Instagram (#bfmf2026)", statut: "ok", note: "Retours très positifs sur la scénographie" }
  ]
};

const CANAUX_RADIO = [
  { canal: "PMR4.1", usage: "Coordination générale (QG, scènes, volante)" },
  { canal: "PMR5", usage: "Bénévoles parking et sanitaires" },
  { canal: "PMR15", usage: "Sécurité privée" },
  { canal: "PMR333", usage: "URGENCE exclusif" },
];

const CODE_METEO = {
  vert: { text: "text-emerald-300", bg: "bg-emerald-400/10", ring: "ring-emerald-400/30", dot: "bg-emerald-400", label: "VERT" },
  jaune: { text: "text-amber-300", bg: "bg-amber-400/10", ring: "ring-amber-400/40", dot: "bg-amber-400", label: "JAUNE" },
  orange: { text: "text-orange-300", bg: "bg-orange-400/10", ring: "ring-orange-400/40", dot: "bg-orange-400", label: "ORANGE" },
  rouge: { text: "text-red-300", bg: "bg-red-400/10", ring: "ring-red-400/30", dot: "bg-red-400", label: "ROUGE" },
};

// Libellés d'affichage propres pour les étapes et secteurs de balade
const DICT_POSITIONS = {
  p0: { label: "Point 0 (Départ)", km: 0, pct: 0 },
  a: { label: "Secteur A (Forêt)", km: 0.5, pct: 10 },
  e1: { label: "Étape 1 (Ravitaillement)", km: 0.9, pct: 25 },
  b: { label: "Secteur B (Tracé Sud)", km: 1.8, pct: 40 },
  e2: { label: "Étape 2 (Ravitaillement)", km: 2.53, pct: 55 },
  c: { label: "Secteur C (Crête Est)", km: 3.5, pct: 70 },
  e3: { label: "Étape 3 (Ravitaillement)", km: 5.06, pct: 85 },
  d: { label: "Secteur D (Retour)", km: 5.8, pct: 95 },
  ret: { label: "Retour (Terminé)", km: 6.2, pct: 100 }
};

function pad(n) { return n.toString().padStart(2, "0"); }

export default function DashboardQG() {
  const [now, setNow] = useState(new Date());
  const [missionsLog, setMissionsLog] = useState([]);
  const [groupesBalade, setGroupesBalade] = useState([]);
  const [alertesCrises, setAlertesCrises] = useState([]);
  const [sosParticipants, setSosParticipants] = useState([]);
  const [consigne, setConsigne] = useState(null);
  const [meteoLive, setMeteoLive] = useState(null);
  const [mediasLive, setMediasLive] = useState(null);
  const [sanitaire, setSanitaire] = useState([]);
  const [prvChoisi, setPrvChoisi] = useState(PRVS[0]);
  const [msgConsigne, setMsgConsigne] = useState("");
  const [sbError, setSbError] = useState(false);

  // States Formulaire SOS
  const [formMotif, setFormMotif] = useState("médical");
  const [formLieu, setFormLieu] = useState("Site grande scène");
  const [formNom, setFormNom] = useState("Radio-PC");
  const [formDetails, setFormDetails] = useState("");

  // States Formulaire Console Météo Interne
  const [mgtVigilance, setMgtVigilance] = useState("vert");
  const [mgtCreneau, setMgtCreneau] = useState("Dans les 2h (+2h)");
  const [mgtCouleurLigne, setMgtCouleurLigne] = useState("vert");
  const [mgtTexteAlea, setMgtTexteAlea] = useState("Conditions normales / RAS");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function pullAllData() {
    try {
      const [mi, gr, aLog, aBal, sosP, co, mto, san, med] = await Promise.all([
        kvGet(KEY_MISSIONS),
        kvGet(KEY_GROUPES),
        kvGet(KEY_ALERTE_LOG),
        kvGet(KEY_ALERTE_BAL),
        kvGet(KEY_SOS_PART),
        kvGet(KEY_CONSIGNE),
        kvGet(KEY_METEO),
        kvGet(KEY_SANITAIRE),
        kvGet(KEY_MEDIAS),
      ]);
      setMissionsLog(Array.isArray(mi) ? mi : []);
      setGroupesBalade(Array.isArray(gr) ? gr : []);
      setSosParticipants(Array.isArray(sosP) ? sosP : []);
      setConsigne(co && co.active ? co : null);
      setMeteoLive(mto && mto.live ? mto : null);
      setMediasLive(med && med.canaux ? med : null);
      setSanitaire(Array.isArray(san) ? san : []);
      
      setAlertesCrises(
        [
          aLog && aLog.active ? { ...aLog, source: "Logistique", keyDb: KEY_ALERTE_LOG } : null,
          aBal && aBal.active ? { ...aBal, source: "Balade / Secours", keyDb: KEY_ALERTE_BAL } : null,
        ].filter(Boolean)
      );
      setSbError(false);
    } catch (e) {
      setSbError(true);
    }
  }

  useEffect(() => {
    pullAllData();
    const t = setInterval(pullAllData, 10000);
    return () => clearInterval(t);
  }, []);

  async function acquitterAlerteEquipe(alerte) {
    const a = { ...alerte, acquittePar: "QG / PCE", heureAcquittement: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
    await kvSet(alerte.keyDb, a);
    pullAllData();
  }

  async function leverAlerteEquipe(alerte) {
    const a = { ...alerte, active: false, leveePar: "QG / PCE", heureLevee: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
    await kvSet(alerte.keyDb, a);
    pullAllData();
  }

  async function soumettreAjustementMeteo(e) {
    e.preventDefault();
    const heureMaj = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const baseMeteo = meteoLive || METEO_FALLBACK;
    const timelineExistante = Array.isArray(baseMeteo.timeline) ? baseMeteo.timeline : [];

    const nouvelleLigneTimeline = { creneau: mgtCreneau, code: mgtCouleurLigne, phenomene: mgtTexteAlea.trim() };
    const payloadMeteo = {
      ...baseMeteo,
      live: true,
      codeActuel: mgtVigilance,
      maj: `Mise à jour QG à ${heureMaj}`,
      timeline: [nouvelleLigneTimeline, ...timelineExistante].slice(0, 5)
    };

    setMeteoLive(payloadMeteo);
    await kvSet(KEY_METEO, payloadMeteo);
    setMgtTexteAlea("");
  }

  async function purgerTimelineMeteo() {
    const heureMaj = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const payloadVierge = {
      ...METEO_FALLBACK,
      live: true,
      maj: `Purgé par le QG à ${heureMaj}`,
      timeline: [{ creneau: "Actuel", code: "vert", phenomene: "Conditions normales / RAS" }]
    };
    setMeteoLive(payloadVierge);
    await kvSet(KEY_METEO, payloadVierge);
  }

  async function declencherSosManuel(e) {
    e.preventDefault();
    const heureSaisie = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const geoRef = POINTS_GPS[formLieu];

    const nouveauSos = {
      id: "manual-" + Date.now(),
      heure: heureSaisie,
      motif: formMotif,
      nom: formNom,
      tel: "Canal Radio",
      details: formDetails.trim(),
      statut: "nouveau",
      gps: geoRef ? { lat: geoRef.lat, lon: geoRef.lon } : null,
      surTrace: geoRef ? { km: geoRef.km, segment: geoRef.segment, ecartMetres: 0, reperePlusProche: formLieu } : null
    };

    const currentSos = Array.isArray(sosParticipants) ? sosParticipants : [];
    const next = [nouveauSos, ...currentSos];
    setSosParticipants(next);
    setFormDetails("");
    await kvSet(KEY_SOS_PART, next);
  }

  async function prendreEnCompteSos(id) {
    const currentSos = Array.isArray(sosParticipants) ? sosParticipants : [];
    const next = currentSos.map((s) => s.id === id ? { ...s, statut: "pris en compte", heurePriseEnCompte: `${pad(now.getHours())}:${pad(now.getMinutes())}` } : s);
    setSosParticipants(next);
    await kvSet(KEY_SOS_PART, next);
  }

  async function cloturerSos(id) {
    const currentSos = Array.isArray(sosParticipants) ? sosParticipants : [];
    const next = currentSos.map((s) => s.id === id ? { ...s, statut: "cloture", heureCloture: `${pad(now.getHours())}:${pad(now.getMinutes())}` } : s);
    setSosParticipants(next);
    await kvSet(KEY_SOS_PART, next);
  }

  async function engagerVolante() {
    const c = { active: true, prv: prvChoisi, message: msgConsigne.trim(), heure: `${pad(now.getHours())}:${pad(now.getMinutes())}`, auteur: "QG", accusePar: "", heureAccuse: "" };
    setConsigne(c);
    setMsgConsigne("");
    await kvSet(KEY_CONSIGNE, c);
  }

  async function leverConsigne() {
    if (!consigne) return;
    const c = { ...consigne, active: false, heureLevee: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
    setConsigne(null);
    await kvSet(KEY_CONSIGNE, c);
  }

  const METEO = meteoLive || METEO_FALLBACK;
  const MEDIAS = mediasLive || MEDIAS_FALLBACK;
  
  const safeMissions = Array.isArray(missionsLog) ? missionsLog : [];
  const safeGroupes = Array.isArray(groupesBalade) ? groupesBalade : [];
  const safeSos = Array.isArray(sosParticipants) ? sosParticipants : [];
  const safeSanitaire = Array.isArray(sanitaire) ? sanitaire : [];

  const logOuvertes = safeMissions.filter((m) => m && m.statut !== "Resolue" && m.statut !== "Résolue");
  const grpDehors = safeGroupes.filter((g) => g && g.position !== "p0" && g.position !== "ret");
  const totalMarcheursEnForet = grpDehors.reduce((s, g) => s + (Number(g.participants) || 0), 0);
  
  // Calcul de la distance totale cumulée (PCOps Metrics)
  const kmCumulesMarches = safeGroupes.reduce((sum, g) => {
    const posMeta = DICT_POSITIONS[g.position] || { km: 0 };
    return sum + (posMeta.km * (Number(g.participants) || 0));
  }, 0);

  const parEtape = { e1: 0, e2: 0, e3: 0 };
  safeGroupes.forEach((g) => {
    if (g && parEtape[g.position] !== undefined) parEtape[g.position] += Number(g.participants) || 0;
  });

  const sosVisibles = safeSos.filter((s) => s && s.statut !== "cloture" && s.statut !== "clôture" && s.statut !== "cloturé" && s.statut !== "clos");
  const sosPartNouveaux = sosVisibles.filter((s) => s && s.statut === "nouveau");

  const sanActifs = safeSanitaire.filter((s) => s && s.statut !== "resolu" && s.statut !== "résolu");
  const sanParLieu = {};
  sanActifs.forEach((s) => { if(s && s.locNom) sanParLieu[s.locNom] = (sanParLieu[s.locNom] || 0) + (s.count || 1); });
  const sanTop = Object.entries(sanParLieu).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const mc = CODE_METEO[METEO.codeActuel] || CODE_METEO["vert"];

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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-[15px] leading-none">QG BUCO — DASHBOARD PRINCIPAL</div>
              <div className="text-[11px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · CONSOLE COORD</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sbError && <span className="text-xxs text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 mr-2">Erreur Sync</span>}
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />
              {pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* 1. PANNEAU CRISES SOS ÉQUIPES */}
        {alertesCrises.map((al, idx) => (
          <div key={idx} className="rounded-lg ring-2 ring-red-400/60 bg-red-500/15 p-4 border-l-4 border-red-500">
            <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-start gap-3 min-w-0">
                <TriangleAlert className="w-5 h-5 text-red-300 pulse-slow mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-sm tracking-wide text-red-200 uppercase font-bold">SOS CANAL {al.source.toUpperCase()}</span>
                    <span className="text-[10px] font-mono bg-red-500/30 text-white px-2 py-0.2 rounded border border-red-400/30">CRITIQUE</span>
                  </div>
                  <div className="text-sm text-white font-semibold mt-1">{al.motif}</div>
                  {al.details && <p className="text-xs text-red-200/80 mt-1 italic">"{al.details}"</p>}
                  <div className="text-[10px] text-slate-400 font-mono mt-2">
                    Déclenché par <span className="text-slate-300">{al.auteur}</span> à {al.heure}
                    {al.acquittePar && <span className="text-emerald-400 ml-2">✓ Pris en compte par {al.acquittePar} ({al.heureAcquittement})</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 self-center shrink-0">
                {!al.acquittePar && (
                  <button onClick={() => acquitterAlerteEquipe(al)} className="text-xs font-mono px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded border border-white/20 text-white transition-all">Acquitter</button>
                )}
                <button onClick={() => leverAlerteEquipe(al)} className="text-xs font-mono px-2.5 py-1 bg-red-600 hover:bg-red-500 rounded text-white font-bold transition-all shadow">Lever l'alerte</button>
              </div>
            </div>
          </div>
        ))}

        {/* 2. PANNEAU SOS PARTICIPANTS ACTIFS */}
        {sosVisibles.length > 0 && (
          <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-red-400/30">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2">
                <TriangleAlert className={`w-4 h-4 ${sosPartNouveaux.length > 0 ? "text-red-300 pulse-slow" : "text-slate-500"}`} />
                SOS PARTICIPANTS ACTIFS
              </h2>
            </div>
            <div className="space-y-2">
              {sosVisibles.map((s) => {
                if (!s) return null;
                const st = (s.statut || "").toLowerCase();
                
                let libelleStatutInterterrain = "Pris en compte par le QG";
                if (st === "nouveau") libelleStatutInterterrain = "Nouveau — non pris en compte";
                else if (st === "en route") libelleStatutInterterrain = `Volante en route (${s.heureEnRoute || ""})`;
                else if (st === "sur place") libelleStatutInterterrain = `Volante sur place (${s.heureArrivee || ""})`;
                else if (st === "prise en charge") libelleStatutInterterrain = `Victime prise en charge / Soins (${s.heurePriseEnCharge || ""})`;
                else if (st === "retour a la normale") libelleStatutInterterrain = `Retour à la normale terrain (${s.heureRetourNormale || ""})`;
                else if (st === "pris en compte" && s.heurePriseEnCompte) libelleStatutInterterrain = `Pris en compte par le QG (${s.heurePriseEnCompte})`;

                return (
                  <div key={s.id} className={`rounded-md px-3 py-2.5 ring-1 ${st === "nouveau" ? "ring-red-400/40 bg-red-400/10" : "ring-white/10 bg-white/[0.03]"}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-slate-400">{s.heure}</span>
                      <span className="text-sm text-slate-100 font-medium capitalize">{s.motif}</span>
                      <span className="text-[11px] text-slate-400">— Origine: {s.nom}</span>
                      <span className="flex-1" />
                      <div className="flex items-center gap-2">
                        {st === "nouveau" && (
                          <button onClick={() => prendreEnCompteSos(s.id)} className="text-[11px] font-mono px-2.5 py-1 rounded ring-1 ring-red-300/50 text-red-200 hover:bg-red-400/20">Prendre en compte</button>
                        )}
                        <button onClick={() => cloturerSos(s.id)} className="text-[11px] font-mono px-2.5 py-1 rounded ring-1 ring-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20">Clôturer</button>
                      </div>
                    </div>
                    {s.surTrace && <div className="text-xs text-slate-300 mt-1">km {s.surTrace.km} · {s.surTrace.segment || s.surTrace.reperePlusProche}</div>}
                    {s.details && <div className="text-[11px] text-slate-400 mt-0.5 italic">"{s.details}"</div>}
                    <div className="text-[11px] font-mono mt-1.5 text-amber-300 bg-amber-400/5 px-2 py-0.5 rounded w-fit border border-amber-500/10">Statut : {libelleStatutInterterrain}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 2B. NOUVEAU PANNEAU INTEGRÉ : SITUATION DU PARCOURS (PCOPS METHODOLOGY) */}
        <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              SITUATION STRATÉGIQUE DU PARCOURS (PCOPS)
            </h2>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-slate-400">Total Forêt: <strong className="text-sky-400">{totalMarcheursEnForet}</strong> pax</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Marche Cumulée: <strong className="text-emerald-400">{kmCumulesMarches.toFixed(0)}</strong> km-pax</span>
            </div>
          </div>

          <div className="space-y-3">
            {safeGroupes.length === 0 ? (
              <div className="text-xs text-slate-500 italic text-center py-4">Aucune vague ni groupe actif sur la balade gourmande.</div>
            ) : (
              safeGroupes.map((g) => {
                if (!g) return null;
                const posMeta = DICT_POSITIONS[g.position] || { label: g.position, km: 0, pct: 0 };
                
                return (
                  <div key={g.id || g.nom} className="bg-white/[0.01] border border-white/5 rounded px-3 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                    <div className="min-w-[160px]">
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                        Vague: {g.nom || "Anonyme"}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Effectif : <span className="text-slate-200 font-medium">{g.participants || 0} marcheurs</span>
                      </div>
                    </div>

                    {/* Barre de progression tactique sur la boucle de 6.2 km */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                        <span>Départ</span>
                        <span className="text-sky-300 font-medium">{posMeta.label} ({posMeta.km} km)</span>
                        <span>Terminé</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden ring-1 ring-white/10 p-0.5">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500" 
                          style={{ width: `${posMeta.pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right font-mono text-[11px] min-w-[100px] bg-white/5 px-2 py-1 rounded border border-white/5 self-end md:self-center">
                      <span className="text-slate-400">Total : </span>
                      <strong className="text-slate-200">{((g.participants || 0) * posMeta.km).toFixed(0)} km</strong>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
        
        {/* 3. PANEL IRM BELGIQUE */}
        <a 
          href={METEO.urlFerrieres || METEO_FALLBACK.urlFerrieres}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-[#151b23] rounded-lg p-4 ring-1 ring-amber-400/30 border-t-4 border-amber-400 shadow-xl hover:bg-[#1b222c] hover:ring-amber-400/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 pulse-slow" />
              <h2 className="font-display tracking-wide text-sm text-amber-300 uppercase flex items-center gap-1.5">
                IRM LIVE — AVERTISSEMENTS OFFICIELS ({METEO.station || METEO_FALLBACK.station})
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 transition-colors inline" />
              </h2>
            </div>
            <div className="text-[10px] font-mono bg-amber-400/10 text-amber-300 px-2 py-0.5 rounded border border-amber-400/20 uppercase tracking-wider">
              Vigilance : {METEO.statutAlerte || METEO_FALLBACK.statutAlerte}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="md:col-span-2 bg-white/[0.02] border border-white/5 rounded p-2.5">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {METEO.titre || METEO_FALLBACK.titre}
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{METEO.description || METEO_FALLBACK.description}</p>
              <div className="text-[10px] font-mono text-slate-400 mt-2">Période de validité : {METEO.validite || METEO_FALLBACK.validite}</div>
            </div>
            
            <div className="bg-white/[0.02] border border-white/5 rounded p-2.5 flex flex-col justify-between space-y-3">
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
              <div className="text-[9px] font-mono text-slate-500 pt-1.5 border-t border-white/5">Source : {METEO.source} <br/>Obs Synchro : {METEO.maj}</div>
            </div>
          </div>
        </a>
        
        {/* GRILLE : PANNEAUX DE SAISIE CÔTE À CÔTE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* COLONNE A : FORMULAIRE SOS RAPIDE PC */}
          <section className="bg-[#1c232e] border-l-4 border-red-500 rounded-r-lg p-4 shadow-lg ring-1 ring-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 text-red-400 font-display text-sm tracking-wide"><PlusCircle className="w-4 h-4" /> INJECTER SOS INTERRAIN</div>
              <form onSubmit={declencherSosManuel} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Urgence</label>
                    <select className="w-full bg-[#11151b] ring-1 ring-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none" value={formMotif} onChange={(e) => setFormMotif(e.target.value)}>
                      <option value="médical">médical</option>
                      <option value="Incendie / fumée">Incendie / fumée</option>
                      <option value="Technique / énergie">Technique / énergie</option>
                      <option value="Gaz / G.E.">Gaz / G.E.</option>
                      <option value="météo">météo</option>
                      <option value="Mouvement de foule">Mouvement de foule</option>
                      <option value="Sûreté / violence">Sûreté / violence</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Localisation</label>
                    <select className="w-full bg-[#11151b] ring-1 ring-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none" value={formLieu} onChange={(e) => setFormLieu(e.target.value)}>
                      {Object.keys(POINTS_GPS).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Origine / Indicatif</label>
                    <input type="text" className="w-full bg-[#11151b] ring-1 ring-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none" value={formNom} onChange={(e) => setFormNom(e.target.value)} placeholder="Ex: PMR 333 / Secu" />
                  </div>
                  <button type="submit" className="py-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold font-mono rounded tracking-wide transition-colors shadow">LANCER SOS</button>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Détails</label>
                  <input type="text" className="w-full bg-[#11151b] ring-1 ring-white/10 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none" value={formDetails} onChange={(e) => setFormDetails(e.target.value)} placeholder="Descriptif de l'événement..." required />
                </div>
              </form>
            </div>
          </section>

          {/* COLONNE B : REPORT MÉTÉO INTERNE */}
          <section className="bg-[#1a1f26] border-l-4 border-sky-500 rounded-r-lg p-4 shadow-lg ring-1 ring-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sky-400 font-display text-sm tracking-wide"><Wrench className="w-4 h-4" /> MANAGEMENT MÉTÉO INTERNE</div>
                <button onClick={purgerTimelineMeteo} className="text-[9px] font-mono bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded transition-all">Purger tout</button>
              </div>
              <form onSubmit={soumettreAjustementMeteo} className="space-y-2.5">
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Global</label>
                    <select className="w-full bg-[#11151b] ring-1 ring-white/10 rounded px-1.5 py-1 text-[11px] text-slate-200 focus:outline-none" value={mgtVigilance} onChange={(e) => setMgtVigilance(e.target.value)}>
                      <option value="vert">VERT</option><option value="jaune">JAUNE</option><option value="orange">ORANGE</option><option value="rouge">ROUGE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Créneau</label>
                    <select className="w-full bg-[#11151b] ring-1 ring-white/10 rounded px-1.5 py-1 text-[11px] text-slate-200 focus:outline-none" value={mgtCreneau} onChange={(e) => setMgtCreneau(e.target.value)}>
                      <option value="En cours">Direct</option><option value="Dans les 2h (+2h)">+2h</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Ligne</label>
                    <select className="w-full bg-[#11151b] ring-1 ring-white/10 rounded px-1.5 py-1 text-[11px] text-slate-200 focus:outline-none" value={mgtCouleurLigne} onChange={(e) => setMgtCouleurLigne(e.target.value)}>
                      <option value="vert">Vert</option><option value="jaune">Jaune</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Texte descriptif</label>
                    <input type="text" className="w-full bg-[#11151b] ring-1 ring-white/10 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none" value={mgtTexteAlea} onChange={(e) => setMgtTexteAlea(e.target.value)} placeholder="Ex: Orages isolés..." required />
                  </div>
                  <button type="submit" className="py-1 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold font-mono rounded tracking-wide shadow">POUSSER</button>
                </div>
              </form>
            </div>
          </section>
        </div>

        {/* Engagement volante */}
        <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3"><Footprints className="w-4 h-4 text-slate-500" /> ENGAGEMENT VOLANTE</h2>
          {consigne ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-amber-200">Engagée vers <span className="font-semibold">{consigne.prv}</span>{consigne.message ? ` — ${consigne.message}` : ""}</div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">Émise à {consigne.heure} · {consigne.accusePar ? <span className="text-emerald-300">Accusée à {consigne.heureAccuse}</span> : <span className="text-amber-300 pulse-slow">En attente d'accusé</span>}</div>
              </div>
              <button onClick={leverConsigne} className="text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-white/25 text-slate-300">Lever</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <select className="bg-[#232b36] ring-1 ring-white/25 rounded px-2.5 py-2 text-sm text-white focus:outline-none" value={prvChoisi} onChange={(e) => setPrvChoisi(e.target.value)}>{PRVS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
              <input className="flex-1 bg-[#232b36] ring-1 ring-white/25 rounded px-2.5 py-2 text-sm text-white focus:outline-none" value={msgConsigne} onChange={(e) => setMsgConsigne(e.target.value)} placeholder="Message d'accompagnement radio" />
              <button onClick={engagerVolante} className="text-xs font-mono px-3 py-2 rounded ring-1 ring-amber-400/50 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25">Engager</button>
            </div>
          )}
        </section>

        {/* Logistique + Balade en direct */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-slate-500" /> LOGISTIQUE</h2>
              <span className="font-mono text-xs text-slate-400">{logOuvertes.length} ouvertes</span>
            </div>
            <div className="space-y-1.5">
              {logOuvertes.length === 0 ? <div className="text-xs text-slate-500 italic py-2 text-center">Aucune tâche logistique.</div> : logOuvertes.slice(0, 6).map((m) => (
                <div key={m.id || m.ref} className="flex items-center gap-2 text-xs rounded bg-white/[0.03] ring-1 ring-white/10 px-2.5 py-2">
                  <span className="text-slate-200 flex-1 truncate">{m.nature}</span>
                  <span className={`text-[10px] font-mono px-1 rounded ${m.bloquant === "Oui" || (m.priorite || "").startsWith("P1") ? "bg-red-500/20 text-red-300" : "bg-slate-500/20 text-slate-400"}`}>{m.priorite || "P3"}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">{m.attribueA || "non-attribué"}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2"><Footprints className="w-4 h-4 text-slate-500" /> SEUILS DES ÉTAPES</h2>
              <span className="font-mono text-xs text-amber-300">{totalMarcheursEnForet} engagés</span>
            </div>
            <div className="space-y-1.5">
              {["e1", "e2", "e3"].map((eid, idx) => {
                const n = parEtape[eid];
                const pct = Math.min(100, Math.round((n / CAPACITE_ETAPE) * 100));
                const cls = pct >= 100 ? "bg-red-500" : pct >= 72 ? "bg-amber-400" : "bg-emerald-400";
                return (
                  <div key={eid} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 w-14">Etape {idx + 1}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className={`h-full ${cls}`} style={{ width: `${pct}%` }} /></div>
                    <span className="text-[11px] font-mono w-14 text-right">{n}/{CAPACITE_ETAPE}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Suivi sanitaire */}
        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3"><Droplets className="w-4 h-4 text-slate-500" /> SANITAIRE</h2>
          {sanActifs.length === 0 ? <div className="text-xs text-slate-500 text-center py-2">Aucun signalement bloc WC.</div> : (
            <div className="space-y-1.5">
              {sanTop.map(([lieu, n]) => (
                <div key={lieu} className="flex items-center justify-between text-xs rounded bg-white/[0.02] ring-1 ring-white/5 px-2.5 py-2">
                  <span className="text-slate-300 font-medium">{lieu}</span>
                  <span className="font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">{n} signalement(s)</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* VEILLE MÉDIAS */}
        <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2"><Rss className="w-4 h-4 text-slate-500" /> VEILLE MÉDIAS</h2>
            <div className="flex items-center gap-1.5 text-[11px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">
              <span>Ambiance :</span>
              {MEDIAS.ambiance === "positive" && <Smile className="w-3.5 h-3.5 text-emerald-400" />}
              {MEDIAS.ambiance === "neutre" && <Meh className="w-3.5 h-3.5 text-amber-400" />}
              <span className="uppercase text-[10px] tracking-wider text-slate-300">{MEDIAS.ambiance}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {MEDIAS.canaux && MEDIAS.canaux.map((c, i) => (
              <div key={i} className="text-xs rounded bg-white/[0.02] border border-white/5 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="min-w-0">
                  <span className="font-mono text-slate-300 block font-medium">{c.name}</span>
                  <span className="text-slate-400 text-[11px] mt-0.5 block italic">"{c.note}"</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${c.statut === "ok" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{c.statut}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Plan Radio */}
        <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3"><Radio className="w-4 h-4 text-slate-500" /> PLAN RADIO</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {CANAUX_RADIO.map((c) => (
              <div key={c.canal} className="flex items-start gap-2 text-[11px] rounded bg-white/[0.02] px-2 py-1.5">
                <span className="font-mono text-amber-300 w-14">{c.canal}</span>
                <span className="text-slate-400">{c.usage}</span>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}