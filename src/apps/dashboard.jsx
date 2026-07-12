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
  Users,
  UserCheck,
  CheckCircle,
  UserPlus
} from "lucide-react";

/* ---------------------------------------------------------------------
   DASHBOARD QG — CONSOLE DE SUPERVISION INTERACTIVE AVEC ACQUITTEMENT
   Bucolique Ferrières Musique Festival 2026
--------------------------------------------------------------------- */

import { SUPABASE_URL, SUPABASE_ANON_KEY, myMapsUrl } from "../config";
// Importation dynamique des lieux sanitaires officiels du festival
import { LIEUX, KEY_SANITAIRE } from "./lieux-sanitaires";

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

const SESS_USER = {
  nom: "Radio-PC",
  role: "Opérateur QG / PCE",
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
const KEY_MEDIAS = "bfmf2026-medias-live";

const PRVS = ["Point 0", "PRV#4", "PRV#5", "PRV#6", "PRV#7", "Etape 1", "Etape 2", "Etape 3"];

// Points géographiques génériques pour la logistique et les SOS
const POINTS_GPS = {
  "Site grande scène": { km: 0, segment: "Plaine centrale — Grande Scène" },
  "Site petite scène": { km: 0, segment: "Plaine centrale — Petite Scène" },
  "Site plaine": { km: 0, segment: "Zone Public / Pelouse" },
  "Site bar": { km: 0, segment: "Zone Débit de Boissons" },
  "Site foodtrucks": { km: 0, segment: "Allée Restauration" },
  "Site backstage": { km: 0, segment: "Coulisses / Loges" },
  "Site zone logistique": { km: 0, segment: "Stockage technique / Énergie" },
  "Parking public": { km: 0, segment: "Zone Stationnement Public" },
  "Parking artistes": { km: 0, segment: "Zone Accès Contrôlé Artistes" },
  "Point 0": { km: 0, segment: "Secteur Départ" },
  "Etape 1": { km: 0.9, segment: "Ravitaillement 1" },
  "Etape 2": { km: 2.53, segment: "Ravitaillement 2" },
  "Etape 3": { km: 5.06, segment: "Ravitaillement 3" },
};

const LONGUEUR_KM = 6.5;
const POS_KM = { p0: 0, t1: 0.45, e1: 0.9, t2: 1.7, e2: 2.53, t3: 3.8, e3: 5.06, tr: 5.8, ret: 6.5 };

const REPERES = [
  { nom: "P0", km: 0 },
  { nom: "E1", km: 0.9 },
  { nom: "E2", km: 2.53 },
  { nom: "E3", km: 5.06 },
  { nom: "P0", km: 6.5 },
];

const METEO_FALLBACK = {
  live: false, province: "Liege", codeActuel: "vert", maj: "—",
  timeline: [{ creneau: "FLUX METEO NON RECU — verifier Edge Function", code: "jaune", phenomene: "indisponible" }]
};

const MEDIAS_FALLBACK = {
  ambiance: "neutre", maj: "En direct",
  canaux: [{ name: "Réseaux Sociaux", statut: "ok", note: "Aucun signalement critique" }]
};

const CANAUX_RADIO = [
  { canal: "PMR4.1", usage: "Coord. Générale" },
  { canal: "PMR5", usage: "Parking / Sanitaires" },
  { canal: "PMR15", usage: "Sécurité Privée" },
  { canal: "PMR333", usage: "URGENCE EXCLUSIF" },
];

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

  // States Formulaire SOS Actifs
  const [formMotif, setFormMotif] = useState("médical");
  const [formLieu, setFormLieu] = useState("Site grande scène");
  const [formNom, setFormNom] = useState(SESS_USER.nom);
  const [formDetails, setFormDetails] = useState("");

  // States Formulaire Nouvelle Demande Logistique
  const [formLogNature, setFormLogNature] = useState("");
  const [formLogLieu, setFormLogLieu] = useState("Site zone logistique");
  const [formLogPriorite, setFormLogPriorite] = useState("P3 - Standard");

  // States Formulaire Nouvelle Mission Sanitaire
  const [formSanType, setFormSanType] = useState("papier");
  const [formSanTypeLabel, setFormSanTypeLabel] = useState("Plus de papier toilette");
  // Initialisation par défaut sur le nom du premier élément du fichier externe
  const [formSanLieu, setFormSanLieu] = useState(LIEUX[0]?.nom || "Zone sanitaires");
  const [formSanCommentaire, setFormSanCommentaire] = useState("");

  // States Formulaire Console Météo Interne
  const [mgtVigilance, setMgtVigilance] = useState("vert");
  const [mgtCreneau, setMgtCreneau] = useState("Dans les 2h (+2h)");
  const [mgtTexteAlea, setMgtTexteAlea] = useState("Conditions normales / RAS");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function pullAllData() {
    try {
      const [mi, gr, aLog, aBal, sosP, co, mto, san, med] = await Promise.all([
        kvGet(KEY_MISSIONS), kvGet(KEY_GROUPES), kvGet(KEY_ALERTE_LOG),
        kvGet(KEY_ALERTE_BAL), kvGet(KEY_SOS_PART), kvGet(KEY_CONSIGNE),
        kvGet(KEY_METEO), kvGet(KEY_SANITAIRE), kvGet(KEY_MEDIAS),
      ]);
      setMissionsLog(Array.isArray(mi) ? mi : []);
      setGroupesBalade(Array.isArray(gr) ? gr : []);
      setSosParticipants(Array.isArray(sosP) ? sosP : []);
      setConsigne(co && co.active ? co : null);
      setMeteoLive(mto && mto.live ? mto : null);
      setMediasLive(med && med.canaux ? med : null);
      setSanitaire(Array.isArray(san) ? san : []);
      
      setAlertesCrises([
        aLog && aLog.active ? { ...aLog, source: "Logistique", keyDb: KEY_ALERTE_LOG } : null,
        aBal && aBal.active ? { ...aBal, source: "Balade / Secours", keyDb: KEY_ALERTE_BAL } : null,
      ].filter(Boolean));
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

  async function acquitterAlerteQg(keyDb, objetAlerte) {
    const tempsFige = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const alerteMiseAJour = { ...objetAlerte, acquittePar: `${SESS_USER.nom} (${SESS_USER.role})`, heureAcquittement: tempsFige };
    await kvSet(keyDb, alerteMiseAJour); pullAllData();
  }

  async function leverAlerteQg(keyDb, objetAlerte) {
    const alerteMiseAJour = { ...objetAlerte, active: false, leveePar: `${SESS_USER.nom} (${SESS_USER.role})`, heureLevee: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
    await kvSet(keyDb, alerteMiseAJour); pullAllData();
  }

  async function prendreEnCompteSos(id) {
    const next = safeSos.map((s) => s.id === id ? { ...s, statut: "pris en compte", heurePriseEnCompte: `${pad(now.getHours())}:${pad(now.getMinutes())}` } : s);
    setSosParticipants(next); await kvSet(KEY_SOS_PART, next);
  }

  async function cloturerSos(id) {
    const next = safeSos.map((s) => s.id === id ? { ...s, statut: "cloture", heureCloture: `${pad(now.getHours())}:${pad(now.getMinutes())}` } : s);
    setSosParticipants(next); await kvSet(KEY_SOS_PART, next);
  }

  async function declencherSosManuel(e) {
    e.preventDefault();
    const geoRef = POINTS_GPS[formLieu];
    const nouveauSos = {
      id: "manual-" + Date.now(), heure: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      motif: formMotif, nom: formNom, tel: "Radio", details: formDetails.trim(), statut: "nouveau",
      surTrace: geoRef ? { km: geoRef.km, segment: geoRef.segment } : null
    };
    const next = [nouveauSos, ...safeSos]; setSosParticipants(next); setFormDetails(""); await kvSet(KEY_SOS_PART, next);
  }

  async function ajouterMissionLogistique(e) {
    e.preventDefault();
    const nouvelleMission = {
      id: "log-" + Date.now(), ref: "LOG-" + pad(safeMissions.length + 1), nature: formLogNature.trim(), zone: formLogLieu, localisation: POINTS_GPS[formLogLieu]?.segment || "", priorite: formLogPriorite, bloquant: "Non", statut: "A affecter", heureConstat: `${pad(now.getHours())}:${pad(now.getMinutes())}`, signalePar: SESS_USER.nom, roleSignaleur: SESS_USER.role, attribueA: ""
    };
    const next = [nouvelleMission, ...safeMissions]; setMissionsLog(next); setFormLogNature(""); await kvSet(KEY_MISSIONS, next);
  }

  async function ajouterMissionSanitaire(e) {
    e.preventDefault();
    const nouvelleMissionSan = {
      id: "san-qg-" + Date.now(),
      heure: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      type: formSanType,
      typeLabel: formSanTypeLabel,
      locNom: formSanLieu,
      commentaire: formSanCommentaire.trim(),
      statut: "nouveau",
      count: 1,
      provenance: "PC Course / Radio"
    };
    const next = [nouvelleMissionSan, ...safeSanitaire];
    setSanitaire(next); setFormSanCommentaire(""); await kvSet(KEY_SANITAIRE, next);
  }

  async function resoudreMissionSanQG(id) {
    const next = safeSanitaire.map((s) => s.id === id ? { ...s, statut: "resolu", heureResolution: `${pad(now.getHours())}:${pad(now.getMinutes())}`, resoluPar: "PC Course (Radio)" } : s);
    setSanitaire(next); await kvSet(KEY_SANITAIRE, next);
  }

  async function attribuerMissionLog(id, equipe) {
    const next = safeMissions.map((m) => m.id === id ? { ...m, statut: "En cours", attribueA: equipe, heurePriseEnCharge: `${pad(now.getHours())}:${pad(now.getMinutes())}` } : m);
    setMissionsLog(next); await kvSet(KEY_MISSIONS, next);
  }

  async function resoudreMissionLog(id) {
    const next = safeMissions.map((m) => m.id === id ? { ...m, statut: "Resolue", heureResolution: `${pad(now.getHours())}:${pad(now.getMinutes())}` } : m);
    setMissionsLog(next); await kvSet(KEY_MISSIONS, next);
  }

  async function pousserEnCriseLog(m) {
    const al = { active: true, motif: `[LOGISTIQUE CRITIQUE] ${m.nature}`, details: `Localisé à ${m.zone}`, heure: `${pad(now.getHours())}:${pad(now.getMinutes())}`, auteur: "Console QG" };
    await kvSet(KEY_ALERTE_LOG, al); pullAllData();
  }

  async function engagerVolante() {
    const c = { active: true, prv: prvChoisi, message: msgConsigne.trim(), heure: `${pad(now.getHours())}:${pad(now.getMinutes())}`, auteur: `${SESS_USER.nom}` };
    setConsigne(c); setMsgConsigne(""); await kvSet(KEY_CONSIGNE, c);
  }

  async function leverConsigne() {
    if (!consigne) return;
    const c = { ...consigne, active: false }; setConsigne(null); await kvSet(KEY_CONSIGNE, c);
  }

  async function soumettreAjustementMeteo(e) {
    e.preventDefault();
    const baseMeteo = meteoLive || METEO_FALLBACK;
    const nouvelleLigne = { creneau: mgtCreneau, code: "jaune", phenomene: mgtTexteAlea.trim() };
    const payload = { ...baseMeteo, live: true, codeActuel: mgtVigilance, maj: `QG à ${pad(now.getHours())}:${pad(now.getMinutes())}`, timeline: [nouvelleLigne, ...(baseMeteo.timeline || [])].slice(0, 5) };
    setMeteoLive(payload); await kvSet(KEY_METEO, payload); setMgtTexteAlea("");
  }

  async function purgerTimelineMeteo() {
    const payload = { ...METEO_FALLBACK, live: true, maj: `Purgé à ${pad(now.getHours())}:${pad(now.getMinutes())}`, timeline: [{ creneau: "Actuel", code: "vert", phenomene: "Conditions normales / RAS" }] };
    setMeteoLive(payload); await kvSet(KEY_METEO, payload);
  }

  const METEO = meteoLive || METEO_FALLBACK;
  const MEDIAS = mediasLive || MEDIAS_FALLBACK;
  const safeMissions = missionsLog, safeGroupes = groupesBalade, safeSos = sosParticipants, safeSanitaire = sanitaire;

  const logOuvertes = safeMissions.filter((m) => m && m.statut !== "Resolue" && m.statut !== "Résolue");
  const grpDehors = safeGroupes.filter((g) => g && g.position !== "p0" && g.position !== "ret");
  const totalMarcheursEnForet = grpDehors.reduce((s, g) => s + (Number(g.participants) || 0), 0);
  const persAttente = safeGroupes.filter((g) => g && g.position === "p0").reduce((s, g) => s + (Number(g.participants) || 0), 0);
  const persRentres = safeGroupes.filter((g) => g && g.position === "ret").reduce((s, g) => s + (Number(g.participants) || 0), 0);

  const sosVisibles = safeSos.filter((s) => s && s.statut !== "cloture" && s.statut !== "clôture" && s.statut !== "cloturé" && s.statut !== "clos");
  const sanActifs = safeSanitaire.filter((s) => s && s.statut !== "resolu" && s.statut !== "résolu");

  return (
    <div className="min-h-screen bg-[#0f1319] text-slate-100 font-sans antialiased w-full">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=600;700&family=Inter:wght=400;500;600;700&family=JetBrains+Mono:wght=500&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes pulseSlow { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .pulse-slow { animation: pulseSlow 1.6s ease-in-out infinite; }
      `}</style>

      {/* HEADER DE SUPERVISION */}
      <header className="border-b border-white/5 bg-[#141922]/90 backdrop-blur sticky top-0 z-30 px-4 py-2.5 flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-display tracking-wider text-sm">QG BUCO — CONSOLE DE SUPERVISION PRINCIPALE</span>
          <div className="hidden md:flex items-center gap-1.5 ml-4 bg-white/5 px-2 py-0.5 rounded text-[11px] font-mono text-slate-400">
            <UserCheck className="w-3 h-3 text-sky-400" /> PC Ops : {SESS_USER.nom}
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs text-slate-400">
          {sbError && <span className="text-red-400 animate-pulse font-bold">⚠️ SYNC ERROR</span>}
          <div className="flex items-center gap-1.5 text-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> {pad(now.getHours())}:{pad(now.getMinutes())}
          </div>
        </div>
      </header>

      {/* BANDEAU ALERTES INTERACTIF */}
      {alertesCrises.length > 0 && (
        <div className="p-3 bg-red-950/40 border-b border-red-500/30 space-y-1.5 w-full">
          {alertesCrises.map((al, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-red-500/10 ring-1 ring-red-500/30 p-2 rounded text-xs gap-2">
              <div className="flex items-center gap-2 truncate flex-1">
                <TriangleAlert className="w-4 h-4 text-red-400 pulse-slow shrink-0" />
                <span className="font-bold text-red-200 uppercase shrink-0">SOS {al.source} :</span>
                <span className="text-slate-200 truncate">
                  "{al.motif}" {al.acquittePar && <span className="text-emerald-400 font-mono ml-2">✔️ Pris en compte par {al.acquittePar}</span>}
                </span>
              </div>
              <div className="flex gap-1.5 justify-end shrink-0">
                {!al.acquittePar && <button onClick={() => acquitterAlerteQg(al.keyDb, al)} className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">Acquitter</button>}
                <button onClick={() => leverAlerteQg(al.keyDb, al)} className="text-[10px] font-mono bg-white/5 text-slate-300 px-2 py-0.5 rounded border border-white/10">Lever</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONTENU PANORAMIQUE MULTI-COLONNES */}
      <main className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 w-full max-w-[1800px] mx-auto items-start">
        
        {/* ==================== COLONNE 1 : URGENCE & SECRETS TERRAIN 🚨 ==================== */}
        <div className="space-y-4 w-full lg:col-span-1">
          <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md">
            <div className="flex items-center gap-2 mb-3 pb-1 border-b border-white/5">
              <TriangleAlert className="w-4 h-4 text-red-400" />
              <h2 className="font-display text-xs tracking-wider uppercase text-slate-300">SOS Participants Actifs ({sosVisibles.length})</h2>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {sosVisibles.length === 0 ? (
                <div className="text-xxs text-slate-500 italic py-4 text-center">Aucune fiche de secours active.</div>
              ) : (
                sosVisibles.map((s) => (
                  <div key={s.id} className={`p-2.5 rounded border text-xs bg-white/[0.01] ${s.statut === "nouveau" ? "border-red-500/30 bg-red-500/5" : "border-white/5"}`}>
                    <div className="flex justify-between items-start font-mono text-[10px] text-slate-400 mb-1">
                      <span>{s.heure} · {s.nom}</span>
                      <span className="text-amber-400 uppercase font-bold">{s.statut}</span>
                    </div>
                    <div className="font-semibold text-slate-100">{s.motif}</div>
                    {s.details && <div className="text-[10px] text-slate-400 italic mt-1 bg-black/20 p-1 rounded">"{s.details}"</div>}
                    <div className="mt-2 flex gap-1.5 justify-end">
                      {s.statut === "nouveau" && <button onClick={() => prendreEnCompteSos(s.id)} className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-slate-200">Prendre en charge</button>}
                      <button onClick={() => cloturerSos(s.id)} className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">Clôturer</button>
                    </div>
                  </div>
                )))}
            </div>
          </div>

          <div className="bg-[#141a22] rounded-lg p-3.5 border-l-2 border-red-500 bg-gradient-to-br from-[#141a22] to-[#181a24] shadow-md">
            <div className="text-xs font-display text-red-400 tracking-wider uppercase mb-2 flex items-center gap-1.5"><PlusCircle className="w-3.5 h-3.5" /> Injecter un SOS terrain</div>
            <form onSubmit={declencherSosManuel} className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <select className="bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-200 focus:outline-none" value={formMotif} onChange={(e) => setFormMotif(e.target.value)}>
                  <option value="médical">Médical / Malaise</option>
                  <option value="Incendie / fumée">Incendie / Fumée</option>
                  <option value="Sûreté / violence">Sûreté / Bagarre</option>
                </select>
                <select className="bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-200 focus:outline-none" value={formLieu} onChange={(e) => setFormLieu(e.target.value)}>
                  {Object.keys(POINTS_GPS).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input type="text" className="w-full bg-black/50 border border-white/5 rounded px-2 py-1 text-slate-400 font-mono text-[11px]" value={`${formNom} (QG)`} disabled />
                <button type="submit" className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded font-mono font-bold text-white">ALERTER</button>
              </div>
              <input type="text" className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-300 focus:outline-none" value={formDetails} onChange={(e) => setFormDetails(e.target.value)} placeholder="Précisions terrain..." required />
            </form>
          </div>

          <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md">
            <h3 className="font-display text-xs text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Footprints className="w-4 h-4 text-slate-500" /> Engagement Équipe Volante</h3>
            {consigne ? (
              <div className="bg-white/[0.02] border border-white/5 p-2 rounded text-xs flex justify-between items-start">
                <div>
                  <div className="text-amber-300">Volante engagée : <strong className="text-slate-100">{consigne.prv}</strong></div>
                  {consigne.message && <div className="text-slate-400 mt-0.5 italic">"{consigne.message}"</div>}
                </div>
                <button onClick={leverConsigne} className="text-[10px] font-mono text-red-400 hover:underline">Rappeler</button>
              </div>
            ) : (
              <div className="flex gap-1">
                <select className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-slate-200" value={prvChoisi} onChange={(e) => setPrvChoisi(e.target.value)}>{PRVS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
                <input className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-slate-200" value={msgConsigne} onChange={(e) => setMsgConsigne(e.target.value)} placeholder="Ordre radio..." />
                <button onClick={engagerVolante} className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded border border-amber-500/30 text-xs font-mono">Lancer</button>
              </div>
            )}
          </div>
        </div>

        {/* ==================== BLOC DROIT AVANCÉ COLONNES 2 & 3 ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:col-span-2 w-full">
          
          {/* PLAN TRANSMISSION RADIO */}
          <div className="bg-[#141a22] rounded-lg p-3.5 border border-amber-400/20 shadow-md lg:col-span-2">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b border-white/5">
              <Radio className="w-4 h-4 text-amber-400" />
              <h2 className="font-display text-xs tracking-wider uppercase text-slate-200">Plan de Transmission Radio (BFMF 2026)</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              {CANAUX_RADIO.map((c) => (
                <div key={c.canal} className="bg-black/30 p-2 rounded border border-white/5 flex flex-col justify-between">
                  <span className="text-amber-300 font-bold text-sm">{c.canal}</span>
                  <span className="text-slate-400 text-[10px] mt-1 leading-tight">{c.usage}</span>
                </div>
              ))}
            </div>
          </div>

          {/* COLONNE INTERNE 2 : SUIVI ET MONITEUR SANITAIRE ECOUTE TERRAIN */}
          <div className="space-y-4 w-full">
            <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md">
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-white/5">
                <h2 className="font-display text-xs tracking-wider uppercase text-slate-300 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-sky-400" /> Cartographie Linéaire (PCOps)
                </h2>
                <span className="font-mono text-xxs bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">{totalMarcheursEnForet} sur parcours</span>
              </div>
              <div className="relative h-14 mt-4 mb-2">
                <div className="absolute top-6 left-0 right-0 h-1 bg-white/10 rounded-full" />
                {REPERES.map((r, i) => (
                  <div key={i} className="absolute top-3" style={{ left: `calc(${(r.km / LONGUEUR_KM) * 100}% - 8px)` }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mx-auto mt-2" />
                    <div className="text-[8px] font-mono text-slate-500 text-center mt-0.5">{r.nom}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 🩺 CONSOLE GESTION ET RETOUR SANITAIRE TERRAIN */}
            <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md">
              <div className="flex justify-between items-center mb-2.5 pb-1 border-b border-white/5">
                <h3 className="font-display text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-cyan-400" /> Moniteur Sanitaire Terrain
                </h3>
                <span className="font-mono text-xxs bg-cyan-500/10 text-cyan-400 px-1.5 rounded border border-cyan-500/20">{sanActifs.length} Actives</span>
              </div>

              {/* LISTING DES INTERVENTIONS TERRAIN */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 mb-3">
                {sanActifs.length === 0 ? (
                  <div className="text-xxs text-slate-500 italic py-2 text-center">Aucune alerte sanitaire active sur les blocs.</div>
                ) : (
                  sanActifs.map((s) => {
                    const estNouveau = s.statut === "nouveau" || s.statut === "en attente";
                    return (
                      <div key={s.id} className="text-xs bg-black/20 p-2 rounded border border-white/5 space-y-1">
                        <div className="flex justify-between items-center font-mono text-[9px]">
                          <span className="text-slate-400">🕒 {s.heure} · 📍 {s.locNom}</span>
                          <span className={`px-1 rounded font-bold uppercase ${estNouveau ? "text-sky-400 bg-sky-500/5" : "text-amber-400 bg-amber-500/5"}`}>
                            {s.statut === "en cours" ? "En cours" : "Attente"}
                          </span>
                        </div>
                        <p className="text-slate-200 font-medium leading-tight">{s.typeLabel || s.texte || "Intervention"}</p>
                        {s.commentaire && <p className="text-[11px] text-slate-400 italic">"{s.commentaire}"</p>}
                        
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-1 font-mono text-[10px]">
                          <span className="text-slate-400">
                            {s.statut === "en cours" ? (
                              <span className="text-amber-300 font-medium">⚠️ Pris en charge par : {s.prisPar || "Équipe"}</span>
                            ) : (
                              <span className="text-slate-500">⏳ En attente de prise en charge terrain</span>
                            )}
                          </span>
                          <button onClick={() => resoudreMissionSanQG(s.id)} className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 hover:bg-emerald-500/30">
                            ✓ Clore
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* FORMULAIRE DE CRÉATION SANITAIRE INTERFACÉ AVEC LES LIEUX SOURCÉS DU FICHIER EXTERNE */}
              <form onSubmit={ajouterMissionSanitaire} className="border-t border-white/5 pt-2.5 space-y-2 text-xs">
                <div className="text-[10px] font-display text-cyan-400 tracking-wider uppercase flex items-center gap-1">
                  <PlusCircle className="w-3.5 h-3.5" /> Lancer une alerte sanitaire
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    className="bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-200 text-xxs focus:outline-none" 
                    value={formSanType} 
                    onChange={(e) => {
                      setFormSanType(e.target.value);
                      const sel = e.target.options[e.target.selectedIndex].text;
                      setFormSanTypeLabel(sel);
                    }}
                  >
                    <option value="papier">Plus de papier toilette</option>
                    <option value="eau">Lave-mains sans eau / savon</option>
                    <option value="poubelle">Poubelle qui déborde</option>
                    <option value="bouche">WC bouché / hors service</option>
                    <option value="proprete">Propreté à revoir</option>
                    <option value="autre">Autre problème</option>
                  </select>
                  
                  {/* Récupération dynamique et scannée de la liste LIEUX */}
                  <select 
                    className="bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-200 text-xxs focus:outline-none" 
                    value={formSanLieu} 
                    onChange={(e) => setFormSanLieu(e.target.value)}
                  >
                    {LIEUX.map((l) => (
                      <option key={l.id} value={l.nom}>{l.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input type="text" className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-200 text-xxs focus:outline-none" value={formSanCommentaire} onChange={(e) => setFormSanCommentaire(e.target.value)} placeholder="Ex: cabine du fond" />
                  <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 px-3 py-1 rounded font-mono font-bold text-white text-xxs shadow">INJECTER</button>
                </div>
              </form>
            </div>

            {/* Management météo */}
            <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-display text-sky-400 tracking-wider uppercase flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> Alerte Météo Interne</div>
                <button onClick={purgerTimelineMeteo} className="text-[9px] font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/10">Purger</button>
              </div>
              <form onSubmit={soumettreAjustementMeteo} className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-1.5">
                  <select className="bg-black/40 border border-white/10 rounded p-1 text-[11px] text-slate-200" value={mgtVigilance} onChange={(e) => setMgtVigilance(e.target.value)}>
                    <option value="vert">VERT</option><option value="jaune">JAUNE</option><option value="orange">ORANGE</option>
                  </select>
                  <button type="submit" className="bg-sky-600 hover:bg-sky-500 rounded text-[10px] font-mono font-bold text-white shadow-sm">POUSSER</button>
                </div>
                <input type="text" className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-300" value={mgtTexteAlea} onChange={(e) => setMgtTexteAlea(e.target.value)} placeholder="Texte descriptif..." required />
              </form>
            </div>
          </div>

          {/* ==================== CONTENU INTERNE COLONNE 3 : LOGISTIQUE TECHNIQUE ==================== */}
          <div className="space-y-4 w-full">
            <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md">
              <div className="flex items-center justify-between mb-2.5 pb-1 border-b border-white/5">
                <h3 className="font-display text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-slate-400" /> Logistique Critique</h3>
                <span className="font-mono text-xxs text-slate-400">{logOuvertes.length} Ops</span>
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {logOuvertes.length === 0 ? (
                  <div className="text-xxs text-slate-500 italic py-4 text-center">Aucune anomalie matérielle ouverte.</div>
                ) : (
                  logOuvertes.map((m) => (
                    <div key={m.id} className="text-xs bg-white/[0.02] p-2.5 rounded border border-white/5 space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-200 font-medium flex-1 leading-snug">{m.nature}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 font-bold ${m.priorite?.startsWith("P1") ? "bg-red-500/20 text-red-400" : "bg-slate-500/10 text-slate-400"}`}>
                          {m.priorite ? m.priorite.slice(0,2) : "P3"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex justify-between items-center">
                        <span>📍 {m.zone}</span>
                        <span className="text-xxs text-slate-500">Statut: <strong className="text-amber-400 font-normal">{m.attribueA ? `En cours (${m.attribueA})` : "En attente"}</strong></span>
                      </div>
                      <div className="flex justify-end gap-1 pt-1.5 border-t border-white/5">
                        {!m.attribueA && (
                          <>
                            <button onClick={() => attribuerMissionLog(m.id, "Log-Volante 1")} className="text-[9px] font-mono bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded flex items-center gap-1"><UserPlus className="w-2.5 h-2.5" /> Volante 1</button>
                            <button onClick={() => attribuerMissionLog(m.id, "Log-Volante 2")} className="text-[9px] font-mono bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded flex items-center gap-1"><UserPlus className="w-2.5 h-2.5" /> Volante 2</button>
                            <button onClick={() => pousserEnCriseLog(m)} className="text-[9px] font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">🚨 Alerte</button>
                          </>
                        )}
                        <button onClick={() => resoudreMissionLog(m.id)} className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1 ml-auto"><CheckCircle className="w-2.5 h-2.5" /> Clore</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* FORMULAIRE D'INJECTION DEMANDE LOGISTIQUE */}
            <div className="bg-[#141a22] rounded-lg p-3.5 border-l-2 border-sky-400 bg-gradient-to-br from-[#141a22] to-[#151f2b] shadow-md">
              <div className="text-xs font-display text-sky-400 tracking-wider uppercase mb-2 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Créer une Demande Logistique</div>
              <form onSubmit={ajouterMissionLogistique} className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <select className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-200 focus:outline-none" value={formLogLieu} onChange={(e) => setFormLogLieu(e.target.value)}>
                      {Object.keys(POINTS_GPS).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <select className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-200 focus:outline-none" value={formLogPriorite} onChange={(e) => setFormLogPriorite(e.target.value)}>
                      <option value="P1 - Critique / Bloquant">P1 - Critique</option>
                      <option value="P2 - Urgent">P2 - Urgent</option>
                      <option value="P3 - Standard">P3 - Standard</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="text" className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-200 focus:outline-none" value={formLogNature} onChange={(e) => setFormLogNature(e.target.value)} placeholder="Panne matos, élec, barrière..." required />
                  <button type="submit" className="bg-sky-600 hover:bg-sky-500 px-3 py-1 rounded font-mono font-bold text-white shadow">INJECTER</button>
                </div>
              </form>
            </div>

            <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-display text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5"><Rss className="w-3.5 h-3.5 text-slate-400" /> Veille Réseaux</h3>
                <span className="text-xxs font-mono bg-emerald-500/10 text-emerald-400 px-1.5 rounded capitalize">{MEDIAS.ambiance}</span>
              </div>
              {MEDIAS.canaux?.slice(0, 2).map((c, i) => (
                <div key={i} className="text-[11px] bg-black/20 p-2 rounded border border-white/5 mt-1">
                  <span className="font-semibold text-slate-300 block">{c.name}</span>
                  <p className="text-slate-400 italic mt-0.5 truncate">"{c.note}"</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}