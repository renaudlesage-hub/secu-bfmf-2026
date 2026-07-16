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
  UserPlus,
  Megaphone,
  Bell,
  BellOff,
  Eye,
  EyeOff,
} from "lucide-react";

/* ---------------------------------------------------------------------
   DASHBOARD QG — CONSOLE DE SUPERVISION INTERACTIVE AVEC ACQUITTEMENT
   Bucolique Ferrières Musique Festival 2026
--------------------------------------------------------------------- */

import { PRIORITES, PRIORITE_DEFAUT, STATUT_INITIAL, STATUT_EN_COURS, STATUT_RESOLU, priorite } from "./referentiels";
import { SUPABASE_URL, SUPABASE_ANON_KEY, myMapsUrl } from "../config";
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
    { headers: SB_HEADERS, credentials: "omit" }
  );
  if (!r.ok) throw new Error(`Supabase GET ${r.status}`);
  const j = await r.json();
  return j.length ? j[0].value : null;
}

async function kvSet(key, value) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_store`, {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates" },
    credentials: "omit",
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
const KEY_CRISE = "bfmf2026-crise";
const KEY_RECH = "bfmf2026-recherche";
const KEY_JAUGE = "bfmf2026-jauge";
const CAPACITE_SITE = 1500; 

const MOTIFS_CRISE = [
  "METEO — mise a l'abri generale",
  "SUSPENSION des departs balade",
  "EVACUATION partielle (suivre consignes)",
  "INCIDENT MAJEUR — standby toutes equipes",
  "FIN D'ALERTE — reprise normale",
  "Autre consigne generale",
];

let _audioCtx = null;
function bipAlerte() {
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.45, 0.9].forEach((t) => {
      const o = _audioCtx.createOscillator();
      const g = _audioCtx.createGain();
      o.connect(g); g.connect(_audioCtx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.35, _audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + t + 0.35);
      o.start(_audioCtx.currentTime + t);
      o.stop(_audioCtx.currentTime + t + 0.4);
    });
  } catch (e) {}
}

const PRVS = ["Point 0", "PRV#4", "PRV#5", "PRV#6", "PRV#7", "Etape 1", "Etape 2", "Etape 3"];

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
  timeline: [{ creneau: "FLUX METEO NON RECU — verifier Edge Function meteo-irm + cron", code: "jaune", phenomene: "indisponible" }],
  station: "Ferrières (Province de Liège)", statutAlerte: "INDISPONIBLE", titre: "Données météo indisponibles",
  description: "Aucune donnée reçue de la fonction meteo-irm. Consulter meteo.be.",
  source: "—", obsHeure: "—", obsResume: "OBSERVATION INDISPONIBLE",
  obsLever: "—", obsCoucher: "—", obsUV: "—", urlFerrieres: "https://www.meteo.be/fr/ferrieres"
};

const MEDIAS_FALLBACK = {
  ambiance: "neutre", maj: "En direct",
  canaux: [{ name: "Réseaux Sociaux", statut: "ok", note: "Aucun signalement critique" }]
};

const CANAUX_RADIO = [
  { canal: "PMR4.1", usage: "Coord. Générale" },
  { canal: "PMR5", usage: "Parking / Sanitaires" },
  { canal: "PMR15", usage: "Sécurité Privée" },
  { canal: "PMR333", usage: "URGENCE" },
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
  const [crise, setCrise] = useState(null);
  const [recherches, setRecherches] = useState([]);
  const [jauge, setJauge] = useState(null);
  const [motifCrise, setMotifCrise] = useState(MOTIFS_CRISE[0]);
  const [msgCrise, setMsgCrise] = useState("");
  const [sonActif, setSonActif] = useState(false);
  // VEILLE QG : empeche la mise en veille de l'ecran tant que le dashboard est
  // ouvert (Screen Wake Lock API). Indispensable sur la tablette du PC : sans
  // ecran allume, les timers de polling sont geles et le bip ne part jamais.
  const [wakeActif, setWakeActif] = useState(false);
  const [wakeErreur, setWakeErreur] = useState("");
  const wakeRef = React.useRef(null);
  const wakeDispo = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const prevCritiques = React.useRef(null);

  async function acquerirWake() {
    try {
      const s = await navigator.wakeLock.request("screen");
      // Le verrou est relache automatiquement par le systeme si l'onglet passe
      // en arriere-plan : on note la perte pour pouvoir le reprendre au retour.
      s.addEventListener("release", () => { wakeRef.current = null; });
      wakeRef.current = s;
      return true;
    } catch (e) {
      // Cas typiques : mode economie de batterie actif, onglet non visible.
      setWakeErreur("Veille refusée par l'appareil (économie de batterie ?).");
      return false;
    }
  }
  async function basculerWake() {
    setWakeErreur("");
    if (wakeActif) {
      try { if (wakeRef.current) await wakeRef.current.release(); } catch (e) {}
      wakeRef.current = null;
      setWakeActif(false);
      return;
    }
    if (!wakeDispo) {
      setWakeErreur("Navigateur sans Wake Lock : régler la veille dans les paramètres de l'appareil.");
      return;
    }
    setWakeActif(await acquerirWake());
  }
  // Reprise du verrou quand l'onglet redevient visible, et liberation au demontage
  useEffect(() => {
    if (!wakeActif) return;
    const onVis = () => {
      if (document.visibilityState === "visible" && wakeRef.current === null) acquerirWake();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (wakeRef.current) { try { wakeRef.current.release(); } catch (e) {} wakeRef.current = null; }
    };
  }, [wakeActif]); // eslint-disable-line

  async function declencherCrise() {
    const dn = new Date();
    const c = {
      active: true, motif: motifCrise, message: msgCrise.trim(),
      heure: `${String(dn.getHours()).padStart(2, "0")}:${String(dn.getMinutes()).padStart(2, "0")}`,
      auteur: "QG", accuses: [],
    };
    setCrise(c); setMsgCrise("");
    if (!(await kvSet(KEY_CRISE, c))) setSbError(true);
  }
  
  async function leverCrise() {
    if (!crise) return;
    if (!window.confirm("Lever la consigne generale sur toutes les apps ?")) return;
    const dn = new Date();
    const c = { ...crise, active: false, heureLevee: `${String(dn.getHours()).padStart(2, "0")}:${String(dn.getMinutes()).padStart(2, "0")}` };
    setCrise(null);
    await kvSet(KEY_CRISE, c);
  }

  const surSite = jauge
    ? Object.values(jauge.compteurs).reduce((s, c) => s + Math.max(0, (c.in || 0) - (c.out || 0)), 0)
    : null;

  const nbCritiques =
    sosParticipants.filter((s) => s.statut === "nouveau").length +
    alertesCrises.length + (crise ? 1 : 0) + recherches.length;
    
  useEffect(() => {
    if (prevCritiques.current === null) { prevCritiques.current = nbCritiques; return; }
    if (sonActif && nbCritiques > prevCritiques.current) bipAlerte();
    prevCritiques.current = nbCritiques;
  }, [nbCritiques, sonActif]);
  
  const [prvChoisi, setPrvChoisi] = useState(PRVS[0]);
  const [msgConsigne, setMsgConsigne] = useState("");
  const [sbError, setSbError] = useState(false);

  const [formMotif, setFormMotif] = useState("Urgence médicale / Malaise");
  const [formLieu, setFormLieu] = useState("Site grande scène");
  const [formNom, setFormNom] = useState(SESS_USER.nom);
  const [formDetails, setFormDetails] = useState("");

  const [formLogNature, setFormLogNature] = useState("");
  const [formLogLieu, setFormLogLieu] = useState("Site zone logistique");
  const [formLogPriorite, setFormLogPriorite] = useState(PRIORITE_DEFAUT);
  const [formLogBloquant, setFormLogBloquant] = useState("Non");

  const [formSanType, setFormSanType] = useState("papier");
  const [formSanTypeLabel, setFormSanTypeLabel] = useState("Plus de papier toilette");
  const [formSanLieu, setFormSanLieu] = useState(LIEUX[0]?.nom || "Zone sanitaires");
  const [formSanCommentaire, setFormSanCommentaire] = useState("");

  const [mgtVigilance, setMgtVigilance] = useState("vert");
  const [mgtCreneau, setMgtCreneau] = useState("Dans les 2h (+2h)");
  const [mgtTexteAlea, setMgtTexteAlea] = useState("Conditions normales / RAS");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function pullAllData() {
    try {
      const [mi, gr, aLog, aBal, sosP, co, mto, san, med, cri, rch, jg] = await Promise.all([
        kvGet(KEY_MISSIONS), kvGet(KEY_GROUPES), kvGet(KEY_ALERTE_LOG),
        kvGet(KEY_ALERTE_BAL), kvGet(KEY_SOS_PART), kvGet(KEY_CONSIGNE),
        kvGet(KEY_METEO), kvGet(KEY_SANITAIRE), kvGet(KEY_MEDIAS),
        kvGet(KEY_CRISE), kvGet(KEY_RECH), kvGet(KEY_JAUGE),
      ]);
      setMissionsLog(Array.isArray(mi) ? mi : []);
      setGroupesBalade(Array.isArray(gr) ? gr : []);
      setSosParticipants(Array.isArray(sosP) ? sosP : []);
      setConsigne(co && co.active ? co : null);
      setMeteoLive(mto && mto.live ? mto : null);
      setMediasLive(med && med.canaux ? med : null);
      setSanitaire(Array.isArray(san) ? san : []);
      setCrise(cri && cri.active ? cri : null);
      setRecherches(Array.isArray(rch) ? rch.filter((x) => x.statut === "active") : []);
      setJauge(jg && jg.compteurs ? jg : null);
      
      // FIX : CAPTURE DU SOS TERRAIN DEPUIS L'APP POUR FAIRE FLASHER LE BANDEAU EN HAUT DU DASHBOARD
      const sosTerrainsCrise = Array.isArray(sosP)
        ? sosP.filter(s => s.statut === "nouveau").map(s => ({
            active: true,
            source: "App Externe / Terrain",
            motif: s.motif || s.typeLabel || s.texte || "SOS Matérialisé",
            details: s.details ? `(${s.details})` : "",
            keyDb: KEY_SOS_PART,
            idOriginal: s.id
          }))
        : [];

      setAlertesCrises([
        aLog && aLog.active ? { ...aLog, source: "Logistique", keyDb: KEY_ALERTE_LOG } : null,
        aBal && aBal.active ? { ...aBal, source: "Balade / Secours", keyDb: KEY_ALERTE_BAL } : null,
        ...sosTerrainsCrise
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

  async function leverAlerteQg(keyDb, alerteInfo) {
    if (keyDb === KEY_SOS_PART) {
      const updatedSos = safeSos.map(s => s.id === alerteInfo.idOriginal ? { ...s, statut: "pris en compte", heurePriseEnCompte: `${pad(now.getHours())}:${pad(now.getMinutes())}` } : s);
      await kvSet(KEY_SOS_PART, updatedSos);
    } else {
      await kvSet(keyDb, { ...alerteInfo, active: false, leveePar: `${SESS_USER.nom} (${SESS_USER.role})`, heureLevee: `${pad(now.getHours())}:${pad(now.getMinutes())}` });
    }
    pullAllData();
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
    const next = [nouveauSos, ...safeSos]; setSosParticipants(next); setFormDetails(""); await kvSet(KEY_SOS_PART, next); pullAllData();
  }

  async function ajouterMissionLogistique(e) {
    e.preventDefault();
    const nouvelleMission = {
      id: "log-" + Date.now(), ref: "LOG-" + pad(safeMissions.length + 1), nature: formLogNature.trim(), zone: formLogLieu, localisation: POINTS_GPS[formLogLieu]?.segment || "", priorite: formLogPriorite, bloquant: formLogBloquant, statut: STATUT_INITIAL, heureConstat: `${pad(now.getHours())}:${pad(now.getMinutes())}`, signalePar: SESS_USER.nom, roleSignaleur: SESS_USER.role, attribueA: ""
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
    const next = safeMissions.map((m) => m.id === id ? { ...m, statut: STATUT_EN_COURS, attribueA: equipe, heurePriseEnCharge: `${pad(now.getHours())}:${pad(now.getMinutes())}` } : m);
    setMissionsLog(next); await kvSet(KEY_MISSIONS, next);
  }

  async function resoudreMissionLog(id) {
    const next = safeMissions.map((m) => m.id === id ? { ...m, statut: STATUT_RESOLU, heureResolution: `${pad(now.getHours())}:${pad(now.getMinutes())}` } : m);
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
    const nouvelleLigne = { creneau: mgtCreneau, code: mgtVigilance, phenomene: mgtTexteAlea.trim() };
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

  const logOuvertes = safeMissions.filter((m) => m && m.statut !== STATUT_RESOLU && m.statut !== "Résolue");
  const grpDehors = safeGroupes.filter((g) => g && g.position !== "p0" && g.position !== "ret");
  const totalMarcheursEnForet = grpDehors.reduce((s, g) => s + (Number(g.participants) || 0), 0);
  const persAttente = safeGroupes.filter((g) => g && g.position === "p0").reduce((s, g) => s + (Number(g.participants) || 0), 0);
  const persRentres = safeGroupes.filter((g) => g && g.position === "ret").reduce((s, g) => s + (Number(g.participants) || 0), 0);

  const sosVisibles = safeSos.filter((s) => s && s.statut !== "cloture" && s.statut !== "clôture" && s.statut !== "cloturé" && s.statut !== "clos");
  const sanActifs = safeSanitaire.filter((s) => s && s.statut !== "resolu" && s.statut !== "résolu");
  const sanParLieu = {}; sanActifs.forEach((s) => { if(s?.locNom) sanParLieu[s.locNom] = (sanParLieu[s.locNom] || 0) + 1; });
  const sanTop = Object.entries(sanParLieu).sort((a, b) => b[1] - a[1]).slice(0, 2);

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

      {/* BANDEAU ALERTES INTERACTIF ET FLASH SOS TERRAIN */}
      {alertesCrises.length > 0 && (
        <div className="p-3 bg-red-950/40 border-b border-red-500/30 space-y-1.5 w-full">
          {alertesCrises.map((al, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-red-500/10 ring-1 ring-red-500/30 p-2 rounded text-xs gap-2">
              <div className="flex items-center gap-2 truncate flex-1">
                <TriangleAlert className="w-4 h-4 text-red-400 pulse-slow shrink-0" />
                <span className="font-bold text-red-200 uppercase shrink-0">SOS {al.source} :</span>
                <span className="text-slate-200 truncate">
                  "{al.motif}"{al.lieu ? ` · ${al.lieu}` : ""}{al.qui ? ` · concerne : ${al.qui}` : ""} {al.details} {al.acquittePar && <span className="text-emerald-400 font-mono ml-2">✔️ Pris en compte par {al.acquittePar}</span>}
                </span>
              </div>
              <div className="flex gap-1.5 justify-end shrink-0">
                {!al.acquittePar && <button onClick={() => acquitterAlerteQg(al.keyDb, al)} className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">Acquitter</button>}
                <button onClick={() => leverAlerteQg(al.keyDb, al)} className="text-[10px] font-mono bg-white/5 text-slate-300 px-2 py-0.5 rounded border border-white/10">Prendre en compte / Lever</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONTENU PANORAMIQUE MULTI-COLONNES */}
      <main className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 w-full max-w-[1800px] mx-auto items-start">
        {/* ===== BLOC PLEINE LARGEUR : consigne generale / recherches / jauge ===== */}
        <div className="lg:col-span-3 space-y-3">
          <section className={`rounded-lg p-4 ${crise ? "ring-2 ring-red-500/70 bg-red-500/15" : "bg-[#151b23] ring-1 ring-white/10"}`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className={`font-display tracking-wide text-sm flex items-center gap-2 ${crise ? "text-red-200" : "text-slate-200"}`}>
                <Megaphone className={`w-4 h-4 ${crise ? "text-red-300 pulse-slow" : "text-slate-500"}`} /> CONSIGNE GENERALE — TOUTES EQUIPES
              </h2>
              <button
                onClick={() => { setSonActif(!sonActif); if (!sonActif) bipAlerte(); }}
                className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 transition-colors ${sonActif ? "ring-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "ring-white/15 text-slate-500 hover:text-slate-300"}`}
                title="Bip sonore quand un nouvel evenement critique apparait (SOS, alerte, recherche)"
              >
                {sonActif ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                {sonActif ? "Alertes sonores ON" : "Alertes sonores OFF"}
              </button>
              <button
                onClick={basculerWake}
                className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 transition-colors ${wakeActif ? "ring-sky-400/40 bg-sky-400/10 text-sky-300" : "ring-white/15 text-slate-500 hover:text-slate-300"}`}
                title="Empêche l'écran de s'éteindre : poste de veille QG. Sans écran allumé, aucun bip ne part."
              >
                {wakeActif ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {wakeActif ? "Veille QG ON" : "Veille QG OFF"}
              </button>
            </div>
            {wakeErreur && (
              <div className="text-[10px] font-mono text-amber-300/80 mb-2">{wakeErreur}</div>
            )}
            {crise ? (
              <div>
                <div className="text-sm text-red-100 font-semibold">{crise.motif}</div>
                {crise.message && <div className="text-xs text-red-100/90 mt-0.5">{crise.message}</div>}
                <div className="text-[11px] font-mono text-red-200/70 mt-1">
                  Emise a {crise.heure} · Accuses "bien recu" : {(crise.accuses || []).length}
                  {(crise.accuses || []).length > 0 && (
                    <span className="text-red-200/60"> — {(crise.accuses || []).map((a) => `${a.nom} (${a.heure})`).join(" · ")}</span>
                  )}
                </div>
                <button onClick={leverCrise} className="mt-2 text-xs font-mono px-3 py-2 rounded ring-1 ring-white/40 text-white hover:bg-white/10">
                  LEVER LA CONSIGNE
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <select className="bg-[#232b36] ring-1 ring-white/25 rounded px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-400/60"
                  value={motifCrise} onChange={(e) => setMotifCrise(e.target.value)}>
                  {MOTIFS_CRISE.map((mo) => <option key={mo}>{mo}</option>)}
                </select>
                <input className="flex-1 min-w-[160px] bg-[#232b36] ring-1 ring-white/25 rounded px-2.5 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400/60"
                  value={msgCrise} onChange={(e) => setMsgCrise(e.target.value)} placeholder="Precision (zones concernees, consigne exacte...)" />
                <button onClick={declencherCrise}
                  className="text-xs font-mono font-semibold px-3.5 py-2 rounded ring-2 ring-red-400/60 bg-red-500/20 text-red-200 hover:bg-red-500/35 transition-colors">
                  DIFFUSER
                </button>
                <span className="w-full text-[10px] text-slate-600 font-mono">
                  Bandeau rouge permanent sur toutes les apps equipes, accuse de lecture nominatif. Doubler a la radio (PMR4.1).
                </span>
              </div>
            )}
          </section>

          {sosParticipants.filter((s) => s.statut === "nouveau").map((s) => (
            <div key={s.id} className="rounded-lg ring-2 ring-red-500/70 bg-red-500/15 px-4 py-3">
              <div className="flex items-start gap-3 flex-wrap">
                <TriangleAlert className="w-5 h-5 text-red-300 pulse-slow shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-red-100 uppercase tracking-wide">
                    SOS PARTICIPANT — {s.motif} <span className="font-mono text-[11px] text-red-200/70 normal-case">({s.heure})</span>
                  </div>
                  <div className="text-xs text-red-100/90 mt-0.5">
                    {s.nom}{s.tel ? ` · ${s.tel}` : ""}
                    {s.surTrace && <> · km {s.surTrace.km} — {s.surTrace.segment || s.surTrace.reperePlusProche}{s.surTrace.ecartMetres > 100 ? ` · ⚠ ~${s.surTrace.ecartMetres} m hors trace` : ""}</>}
                  </div>
                  {s.details && <div className="text-xs text-red-100/80 italic mt-0.5">"{s.details}"</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.gps && (
                    <a href={`https://www.google.com/maps?q=${s.gps.lat},${s.gps.lon}`} target="_blank" rel="noreferrer"
                      className="text-[11px] font-mono px-2.5 py-2 rounded ring-1 ring-white/40 text-white hover:bg-white/10">Carte</a>
                  )}
                  <button onClick={() => prendreEnCompteSos(s.id)}
                    className="text-xs font-mono font-semibold px-3 py-2 rounded ring-2 ring-white/60 bg-white/10 text-white hover:bg-white/20">
                    PRENDRE EN COMPTE
                  </button>
                </div>
              </div>
              <div className="text-[10px] font-mono text-red-200/60 mt-1.5 pl-8">
                "Prendre en compte" affiche une confirmation au participant sur son téléphone (il voit que les secours sont prévenus).
              </div>
            </div>
          ))}

          {recherches.map((r) => (
            <div key={r.id} className="rounded-lg ring-1 ring-amber-400/50 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-100">
              <span className="font-semibold uppercase">Recherche {r.categorie}</span> — {r.prenom || "?"}{r.age ? `, ${r.age}` : ""} · {r.description}
              <span className="opacity-80"> · vu(e) : {r.dernierLieu} · depuis {r.heure} · gestion : app Personne recherchee (#recherche)</span>
            </div>
          ))}

          {surSite !== null && (
            <div className="rounded-lg ring-1 ring-white/10 bg-[#151b23] px-4 py-2.5 flex items-center gap-3">
              <Users className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs text-slate-300">Jauge plaine</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full ${surSite / CAPACITE_SITE >= 0.9 ? "bg-red-400" : surSite / CAPACITE_SITE >= 0.72 ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ width: `${Math.min(100, Math.round((surSite / CAPACITE_SITE) * 100))}%` }} />
              </div>
              <span className={`font-mono text-sm ${surSite / CAPACITE_SITE >= 0.9 ? "text-red-300" : "text-slate-200"}`}>{surSite}</span>
              <span className="font-mono text-[10px] text-slate-500">/ {CAPACITE_SITE}</span>
            </div>
          )}
        </div>

        {/* ==================== COLONNE 1 : ENVIRONNEMENT & URGENCE 🚨 ==================== */}
        <div className="space-y-4 w-full lg:col-span-1">
          
          {/* DISPLAY MÉTÉO SOURCÉ IRM */}
          <a 
            href={METEO.urlFerrieres || METEO_FALLBACK.urlFerrieres} target="_blank" rel="noopener noreferrer"
            className="block bg-[#141a22] rounded-lg p-3 border border-amber-400/20 border-t-2 border-t-amber-400 hover:bg-[#18202b] transition-all shadow-md min-h-[102px] max-h-[102px] flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <span className={`text-xxs font-mono px-1.5 py-0.5 rounded border tracking-wider uppercase ${
                meteoLive ? "text-amber-300 bg-amber-400/10 border-amber-400/20" : "text-red-300 bg-red-400/10 border-red-400/30"
              }`}>{meteoLive ? "IRM LIVE" : "HORS LIGNE"}</span>
              <span className="text-[10px] font-mono text-slate-500">Sync: {METEO.obsHeure}</span>
            </div>
            <div className="text-xs font-semibold text-slate-100 truncate my-1">{METEO.titre} — {METEO.obsResume}</div>
            <div className="pt-1 border-t border-white/5 flex justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-0.5"><Sun className="w-3 h-3 text-amber-400" /> UV: {METEO.obsUV}</span>
              <span className="flex items-center gap-0.5"><Sunset className="w-3 h-3 text-orange-400" /> Coucher: {METEO.obsCoucher}</span>
            </div>
          </a>

          {/* 🌩️ CONSOLE DE RÉGULATION MÉTÉO INTERNE */}
          <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md min-h-[155px] max-h-[155px] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="text-xs font-display text-amber-400 tracking-wider uppercase flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> Régulation / Console Météo Interne</div>
              <button onClick={purgerTimelineMeteo} className="text-[9px] font-mono bg-red-500/10 hover:bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/10">Purger</button>
            </div>
            <form onSubmit={soumettreAjustementMeteo} className="space-y-2 text-xs flex-1 flex flex-col justify-end pt-2">
              <div className="grid grid-cols-3 gap-1.5">
                <select className="bg-black/40 border border-white/10 rounded p-1 text-[11px] text-slate-200 focus:outline-none" value={mgtVigilance} onChange={(e) => setMgtVigilance(e.target.value)}>
                  <option value="vert">VERT</option><option value="jaune">JAUNE</option><option value="orange">ORANGE</option><option value="rouge">ROUGE</option>
                </select>
                <select className="bg-black/40 border border-white/10 rounded p-1 text-[11px] text-slate-200 focus:outline-none" value={mgtCreneau} onChange={(e) => setMgtCreneau(e.target.value)}>
                  <option value="En cours">Direct</option><option value="Dans les 2h (+2h)">+2h</option>
                </select>
                <button type="submit" className="bg-sky-600 hover:bg-sky-500 rounded text-[10px] font-mono font-bold text-white shadow-sm transition-all">POUSSER</button>
              </div>
              <input type="text" className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-300 focus:outline-none text-[11px]" value={mgtTexteAlea} onChange={(e) => setMgtTexteAlea(e.target.value)} placeholder="Texte descriptif..." required />
            </form>
          </div>

          {/* 🚨 MONITEUR SÉCURITÉ */}
          <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md h-[360px] flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-1 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <TriangleAlert className="w-4 h-4 text-red-400" />
                <h2 className="font-display text-xs tracking-wider uppercase text-slate-300">Moniteur Sécurité</h2>
              </div>
              <span className="font-mono text-xxs bg-red-500/10 text-red-400 px-1.5 rounded border border-red-500/20">{sosVisibles.length} Actifs</span>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {sosVisibles.length === 0 ? (
                <div className="text-xxs text-slate-500 italic py-4 text-center">Aucune fiche de secours active.</div>
              ) : (
                sosVisibles.map((s) => (
                  <div key={s.id} className={`p-2.5 rounded border text-xs bg-white/[0.01] ${s.statut === "nouveau" ? "border-red-500/30 bg-red-500/5" : "border-white/5"}`}>
                    <div className="flex justify-between items-start font-mono text-[10px] text-slate-400 mb-1">
                      <span>{s.heure} · {s.nom}</span>
                      <span className="text-amber-400 uppercase font-bold text-[10px]">{s.statut}</span>
                    </div>
                    {/* ACCORD DE STRUTURE POUR TOUTES LES APPS EMETTRICES */}
                    <div className="font-semibold text-slate-100">{s.motif || s.typeLabel || s.texte || "SOS Matérialisé"}</div>
                    {s.details && <div className="text-[10px] text-slate-400 italic mt-1 bg-black/20 p-2 rounded font-mono">"{s.details}"</div>}
                    {s.surTrace && <div className="text-[9px] font-mono text-amber-400 mt-1">📍 Trace : {s.surTrace.segment || "—"}</div>}
                    <div className="mt-2 flex gap-1.5 justify-end">
                      {s.statut === "nouveau" && <button onClick={() => prendreEnCompteSos(s.id)} className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-slate-200">Prendre en charge</button>}
                      <button onClick={() => cloturerSos(s.id)} className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">Clôturer</button>
                    </div>
                  </div>
                )))}
            </div>
          </div>

          {/* INJECTION SOS TERRAIN */}
          <div className="bg-[#141a22] rounded-lg p-3.5 border-l-2 border-red-500 bg-gradient-to-br from-[#141a22] to-[#181a24] shadow-md h-[116px] flex flex-col justify-between">
            <div className="text-xs font-display text-red-400 tracking-wider uppercase flex items-center gap-1.5"><PlusCircle className="w-3.5 h-3.5" /> Injecter un SOS terrain</div>
            <form onSubmit={declencherSosManuel} className="space-y-1.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <select className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-slate-200 focus:outline-none" value={formMotif} onChange={(e) => setFormMotif(e.target.value)}>
                  <option value="Urgence médicale / Malaise">Médical / Malaise</option>
                  <option value="Personne blessée / chute">Blessure / Chute</option>
                  <option value="Personne perdue / désorientée">Personne perdue</option>
                  <option value="Sûreté / comportement dangereux">Sûreté / Bagarre</option>
                  <option value="Départ de feu / fumée suspecte">Incendie / Fumée</option>
                  <option value="Autre urgence">Autre</option>
                </select>
                <select className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-slate-200 focus:outline-none" value={formLieu} onChange={(e) => setFormLieu(e.target.value)}>
                  {Object.keys(POINTS_GPS).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input type="text" className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-0.5 text-slate-300 focus:outline-none text-[11px]" value={formDetails} onChange={(e) => setFormDetails(e.target.value)} placeholder="Précisions terrain..." required />
                <button type="submit" className="bg-red-600 hover:bg-red-500 px-3 py-0.5 rounded font-mono font-bold text-white shadow text-[11px]">ALERTER</button>
              </div>
            </form>
          </div>

          {/* ENGAGEMENT ÉQUIPE VOLANTE */}
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

        {/* ==================== BLOC DROIT AVANCÉ MUTÉ ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:col-span-2 w-full">
          
          {/* ⚡ PLAN RADIO LARGE */}
          <div className="bg-[#141a22] rounded-lg p-3.5 border border-amber-400/20 shadow-md lg:col-span-2 min-h-[102px] max-h-[102px] flex flex-col justify-between">
            <div className="flex items-center gap-2 pb-1 border-b border-white/5">
              <Radio className="w-4 h-4 text-amber-400" />
              <h2 className="font-display text-xs tracking-wider uppercase text-slate-200">Plan de Transmission & d'Urgence Radio (BFMF 2026)</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono flex-1 pt-2 items-center">
              {CANAUX_RADIO.map((c) => (
                <div key={c.canal} className="bg-black/30 px-2 py-1 rounded border border-white/5 flex flex-col justify-center h-full">
                  <span className="text-amber-300 font-bold text-xs">{c.canal}</span>
                  <span className="text-slate-400 text-[9px] leading-tight truncate">{c.usage}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 📍 CARTOGRAPHIE LINÉAIRE LARGE */}
          <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md lg:col-span-2 min-h-[155px] max-h-[155px] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <h2 className="font-display text-xs tracking-wider uppercase text-slate-300 flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400" /> Cartographie Linéaire (PCOps)
              </h2>
              <span className="font-mono text-xxs bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">{totalMarcheursEnForet} personnes sur parcours</span>
            </div>

            <div className="relative h-14 mt-2">
              <div className="absolute top-6 left-0 right-0 h-1 bg-white/10 rounded-full" />
              {REPERES.map((r, i) => (
                <div key={i} className="absolute top-3" style={{ left: `calc(${(r.km / LONGUEUR_KM) * 100}% - 8px)` }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mx-auto mt-2" />
                  <div className="text-[8px] font-mono text-slate-500 text-center mt-0.5">{r.nom}</div>
                </div>
              ))}
              {grpDehors.map((g, idx) => {
                const km = POS_KM[g.position] ?? 0;
                return (
                  <div key={idx} className="absolute top-0" style={{ left: `calc(${(km / LONGUEUR_KM) * 100}% - 10px)` }} title={`${g.nom} : ${g.participants} festivaliers`}>
                    <div className="flex items-center bg-sky-500/20 ring-1 ring-sky-400/50 rounded px-1 py-0.5 text-[8px] font-mono text-sky-200">
                      <Users className="w-2 h-2 text-sky-300 mr-0.5" />{g.participants}
                    </div>
                  </div>
                );
              })}
              {sosVisibles.filter((s) => s && s.surTrace && s.surTrace.km !== null).map((s) => (
                <div key={s.id} className="absolute top-8 z-10" style={{ left: `calc(${(Math.min(s.surTrace.km, LONGUEUR_KM) / LONGUEUR_KM) * 100}% - 7px)` }} title={`SOS : ${s.motif}`}>
                  <TriangleAlert className="w-3.5 h-3.5 text-red-400 pulse-slow" />
                </div>
              ))}
            </div>
            <div className="text-[10px] font-mono text-slate-500 flex justify-between px-1 mt-1">
              <span>Attente P0 : {persAttente}</span>
              <span>Rentré QG : {persRentres}</span>
            </div>
          </div>

          {/* ==================== SUB-COLONNE 2 ==================== */}
          <div className="space-y-4 w-full">
            
            {/* 🩺 MONITEUR SANITAIRE */}
            <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md h-[360px] flex flex-col">
              <div className="flex justify-between items-center mb-3 pb-1 border-b border-white/5 shrink-0">
                <h3 className="font-display text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-cyan-400" /> Moniteur Sanitaire
                </h3>
                <span className="font-mono text-xxs bg-cyan-500/10 text-cyan-400 px-1.5 rounded border border-cyan-500/20">{sanActifs.length} Actives</span>
              </div>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                {sanActifs.length === 0 ? (
                  <div className="text-xxs text-slate-500 italic py-4 text-center">Aucune alerte sanitaire active sur les blocs.</div>
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
                              <span className="text-slate-500">⏳ En attente terrain</span>
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
            </div>

            {/* 📥 CRÉER UNE DEMANDE SANITAIRE */}
            <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md h-[116px] flex flex-col justify-between">
              <form onSubmit={ajouterMissionSanitaire} className="space-y-1.5 text-xs flex flex-col justify-between h-full">
                <div className="text-[10px] font-display text-cyan-400 tracking-wider uppercase flex items-center gap-1">
                  <PlusCircle className="w-3.5 h-3.5" /> Créer une demande sanitaire
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-slate-200 text-xxs focus:outline-none" 
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
                  
                  <select 
                    className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-slate-200 text-xxs focus:outline-none" 
                    value={formSanLieu} 
                    onChange={(e) => setFormSanLieu(e.target.value)}
                  >
                    {LIEUX.map((l) => (
                      <option key={l.id} value={l.nom}>{l.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input type="text" className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-0.5 text-slate-200 text-xxs focus:outline-none" value={formSanCommentaire} onChange={(e) => setFormSanCommentaire(e.target.value)} placeholder="Ex: cabine du fond" />
                  <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 px-3 py-0.5 rounded font-mono font-bold text-white text-xxs shadow">INJECTER</button>
                </div>
              </form>
            </div>

            {/* SIGNALEMENTS SANITAIRES TOP ACCUMULATIONS */}
            <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md">
              <h3 className="font-display text-xs text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Droplets className="w-4 h-4 text-sky-400" /> Zones Sanitaires Chaudes</h3>
              {sanTop.length === 0 ? (
                <div className="text-xxs text-slate-500 italic py-2 text-center">Aucune accumulation sur les blocs.</div>
              ) : (
                <div className="space-y-1">
                  {sanTop.map(([lieu, count]) => (
                    <div key={lieu} className="flex justify-between items-center text-xs bg-black/20 p-2 rounded border border-white/5">
                      <span className="text-slate-300">{lieu}</span>
                      <span className="text-xxs font-mono text-amber-300 bg-amber-400/5 px-2 py-0.5 rounded border border-amber-500/20">{count} signalements</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ==================== SUB-COLONNE 3 ==================== */}
          <div className="space-y-4 w-full">
            
            {/* 🛠️ MONITEUR LOGISTIQUE */}
            <div className="bg-[#141a22] rounded-lg p-3.5 border border-white/5 shadow-md h-[360px] flex flex-col">
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-white/5 shrink-0">
                <h3 className="font-display text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-slate-400" /> Moniteur Logistique</h3>
                <span className="font-mono text-xxs bg-slate-500/15 text-slate-400 px-1.5 rounded border border-white/5">{logOuvertes.length} Actives</span>
              </div>
              <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                {logOuvertes.length === 0 ? (
                  <div className="text-xxs text-slate-500 italic py-4 text-center">Aucune anomalie matérielle ouverte.</div>
                ) : (
                  logOuvertes.map((m) => (
                    <div key={m.id} className="text-xs bg-white/[0.02] p-2.5 rounded border border-white/5 space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-200 font-medium flex-1 leading-snug">{m.nature}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 font-bold ${priorite(m.priorite).badge}`}>
                          {priorite(m.priorite).court}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex justify-between items-center">
                        <span>📍 {m.zone}</span>
                        <span className="text-xxs text-slate-500">Statut: <strong className="text-amber-400 font-normal">{m.attribueA ? `En cours (${m.attribueA})` : "En attente"}</strong></span>
                      </div>
                      <div className="flex justify-end gap-1 pt-1.5 border-t border-white/5">
                        {!m.attribueA && (
                          <>
                            <button onClick={() => attribuerMissionLog(m.id, "Log-Volante 1")} className="text-[9px] font-mono bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded flex items-center gap-1"><UserPlus className="w-2.5 h-2.5" /> Volante 1</button>
                            <button onClick={() => attribuerMissionLog(m.id, "Log-Volante 2")} className="text-[9px] font-mono bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded flex items-center gap-1"><UserPlus className="w-2.5 h-2.5" /> Volante 2</button>
                            <button onClick={() => pousserEnCriseLog(m)} className="text-[9px] font-mono bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">🚨 Alerte</button>
                          </>
                        )}
                        <button onClick={() => resoudreMissionLog(m.id)} className="text-[9px] font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 ml-auto"><CheckCircle className="w-2.5 h-2.5" /> Clore</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 📥 CRÉER UNE DEMANDE LOGISTIQUE */}
            <div className="bg-[#141a22] rounded-lg p-3.5 border-l-2 border-sky-400 bg-gradient-to-br from-[#141a22] to-[#151f2b] shadow-md h-[116px] flex flex-col justify-between">
              <div className="text-xs font-display text-sky-400 tracking-wider uppercase flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Créer une Demande Logistique</div>
              <form onSubmit={ajouterMissionLogistique} className="space-y-1.5 text-xs flex flex-col justify-between h-full">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <select className="w-full bg-black/40 border border-white/10 rounded px-2 py-0.5 text-slate-200 focus:outline-none" value={formLogLieu} onChange={(e) => setFormLogLieu(e.target.value)}>
                      {Object.keys(POINTS_GPS).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <select className="w-full bg-black/40 border border-white/10 rounded px-2 py-0.5 text-slate-200 focus:outline-none" value={formLogPriorite} onChange={(e) => setFormLogPriorite(e.target.value)}>
                      {Object.entries(PRIORITES).map(([val, p]) => (
                        <option key={val} value={val}>{p.libelle}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="text" className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-0.5 text-slate-200 focus:outline-none text-[11px]" value={formLogNature} onChange={(e) => setFormLogNature(e.target.value)} placeholder="Panne matos, élec, barrière..." required />
                  <button type="submit" className="bg-sky-600 hover:bg-sky-500 px-3 py-0.5 rounded font-mono font-bold text-white shadow text-[11px]">INJECTER</button>
                </div>
              </form>
            </div>

            {/* VEILLE RÉSEAUX */}
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