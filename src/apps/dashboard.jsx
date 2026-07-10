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
} from "lucide-react";

/* ---------------------------------------------------------------------
   DASHBOARD QG (Version Finale Consolidée - Suivi Aléas Météo & Médias)
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
  "Site grande scène": { lat: 50.3838, lon: 5.6212, km: 0, segment: "Plaine centrale — Grande Scène" },
  "Site petite scène": { lat: 50.3832, lon: 5.6219, km: 0, segment: "Plaine centrale — Petite Scène" },
  "Site plaine": { lat: 50.3835, lon: 5.6215, km: 0, segment: "Zone Public / Pelouse" },
  "Site bar": { lat: 50.3836, lon: 5.6222, km: 0, segment: "Zone Débit de Boissons" },
  "Site foodtrucks": { lat: 50.3831, lon: 5.6208, km: 0, segment: "Allée Restauration" },
  "Site sanitaires": { lat: 50.3841, lon: 5.6211, km: 0, segment: "Blocs WC Publics" },
  "Site backstage": { lat: 50.3842, lon: 5.6201, km: 0, segment: "Coulisses / Loges" },
  "Site zone logistique": { lat: 50.3845, lon: 5.6195, km: 0, segment: "Stockage technique / Énergie" },
  "Parking public": { lat: 50.3815, lon: 5.6182, km: 0, segment: "Zone Stationnement Public" },
  "Parking artistes": { lat: 50.3848, lon: 5.6198, km: 0, segment: "Zone Accès Contrôlé Artistes" },
  "Parcours Balade secteur A": { lat: 50.3821, lon: 5.6167, km: 0.5, segment: "Sentier départ forêt" },
  "Parcours Balade secteur B": { lat: 50.3756, lon: 5.6441, km: 1.8, segment: "Tracé Sud - Vers Étape 2" },
  "Parcours Balade secteur C": { lat: 50.3823, lon: 5.6457, km: 3.5, segment: "Tracé Est Crête" },
  "Parcours Balade secteur D": { lat: 50.3886, lon: 5.6269, km: 5.8, segment: "Secteur Nord Retour P0" },
  "Etape 1": { lat: 50.37858, lon: 5.6279, km: 0.9, segment: "Ravitaillement 1" },
  "Etape 2": { lat: 50.37828, lon: 5.64549, km: 2.53, segment: "Ravitaillement 2" },
  "Etape 3": { lat: 50.38817, lon: 5.62891, km: 5.06, segment: "Ravitaillement 3" },
  "Point 0": { lat: 50.3835, lon: 5.6215, km: 0, segment: "Secteur Départ" },
  "PRV#4": { lat: 50.38212, lon: 5.61673, km: 0.5, segment: "Balisage Secours #4" },
  "PRV#5": { lat: 50.37568, lon: 5.64412, km: 2.5, segment: "Balisage Secours #5" },
  "PRV#6": { lat: 50.38236, lon: 5.64579, km: 3.8, segment: "Balisage Secours #6" },
  "PRV#7": { lat: 50.38865, lon: 5.62692, km: 5.5, segment: "Balisage Secours #7" }
};

const CAPACITE_ETAPE = 300;

const METEO_FALLBACK = {
  province: "Liege",
  codeActuel: "jaune",
  phenomenes: ["orages", "vent"],
  maj: "il y a 12 min",
  timeline: [
    { creneau: "Dans les 2 prochaines heures (+2h)", code: "vert", phenomene: "RAS" },
    { creneau: "Dans les 4 prochaines heures (+4h)", code: "jaune", phenomene: "Risque d'orages locaux" },
    { creneau: "Dans les 8 prochaines heures (+8h)", code: "jaune", phenomene: "Rafales de vent soutenues" },
    { creneau: "Dans les 12 prochaines heures (+12h)", code: "vert", phenomene: "Retour au calme / RAS" },
  ],
};

const MEDIAS_FALLBACK = {
  ambiance: "neutre",
  maj: "il y a 8 min",
  canaux: [
    { name: "Facebook (Groupe Local Ferrières)", statut: "attention", note: "Plaintes sur l'attente au parking public à l'ouverture" },
    { name: "Instagram (#bfmf2026)", statut: "ok", note: "Retours très positifs sur la scénographie et le stand ravitaillement Etape 1" },
    { name: "Presse Locale (L'Avenir)", statut: "ok", note: "Brève publiée, focus sur l'écofestival et l'affluence record" }
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
  rouge: { text: "text-red-300", bg: "bg-red-400/10", ring: "ring-red-400/40", dot: "bg-red-400", label: "ROUGE" },
};

function pad(n) { return n.toString().padStart(2, "0"); }

export default function DashboardQG() {
  const [now, setNow] = useState(new Date());
  const [missionsLog, setMissionsLog] = useState([]);
  const [groupesBalade, setGroupesBalade] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [sosParticipants, setSosParticipants] = useState([]);
  const [consigne, setConsigne] = useState(null);
  const [meteoLive, setMeteoLive] = useState(null);
  const [mediasLive, setMediasLive] = useState(null);
  const [sanitaire, setSanitaire] = useState([]);
  const [prvChoisi, setPrvChoisi] = useState(PRVS[0]);
  const [msgConsigne, setMsgConsigne] = useState("");
  const [sbError, setSbError] = useState(false);

  const [formMotif, setFormMotif] = useState("médical");
  const [formLieu, setFormLieu] = useState("Site grande scène");
  const [formNom, setFormNom] = useState("Radio-PC");
  const [formDetails, setFormDetails] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let stop = false;
    async function pull() {
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
        if (stop) return;
        setMissionsLog(Array.isArray(mi) ? mi : []);
        setGroupesBalade(Array.isArray(gr) ? gr : []);
        setSosParticipants(Array.isArray(sosP) ? sosP : []);
        setConsigne(co && co.active ? co : null);
        setMeteoLive(mto && mto.live ? mto : null);
        setMediasLive(med && med.canaux ? med : null);
        setSanitaire(Array.isArray(san) ? san : []);
        setAlertes(
          [
            aLog && aLog.active ? { ...aLog, source: "Logistique" } : null,
            aBal && aBal.active ? { ...aBal, source: "Balade" } : null,
          ].filter(Boolean)
        );
        setSbError(false);
      } catch (e) {
        if (!stop) setSbError(true);
      }
    }
    pull();
    const t = setInterval(pull, 10000);
    return () => { stop = true; clearInterval(t); };
  }, []);

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

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/app_store`, {
        method: "POST",
        headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ key: KEY_SOS_PART, value: next, updated_at: new Date().toISOString() }),
      });
    } catch (err) {
      setSbError(true);
    }
  }

  async function prendreEnCompteSos(id) {
    const currentSos = Array.isArray(sosParticipants) ? sosParticipants : [];
    const next = currentSos.map((s) =>
      s.id === id ? { ...s, statut: "pris en compte", heurePriseEnCompte: `${pad(now.getHours())}:${pad(now.getMinutes())}` } : s
    );
    setSosParticipants(next);
    await kvSet(KEY_SOS_PART, next);
  }

  async function cloturerSos(id) {
    const currentSos = Array.isArray(sosParticipants) ? sosParticipants : [];
    const next = currentSos.map((s) =>
      s.id === id ? { ...s, statut: "cloture", heureCloture: `${pad(now.getHours())}:${pad(now.getMinutes())}` } : s
    );
    setSosParticipants(next);
    await kvSet(KEY_SOS_PART, next);
  }

  async function engagerVolante() {
    const c = {
      active: true,
      prv: prvChoisi,
      message: msgConsigne.trim(),
      heure: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      auteur: "QG",
      accusePar: "",
      heureAccuse: "",
    };
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
  const persDehors = grpDehors.reduce((s, g) => s + (Number(g.participants) || 0), 0);
  
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
          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm">
            <Clock className="w-4 h-4 text-slate-500" />
            {pad(now.getHours())}:{pad(now.getMinutes())}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        
        {/* FORMULAIRE SOS MANUEL DETECTE */}
        <section className="bg-[#1c232e] border-l-4 border-red-500 rounded-r-lg p-4 shadow-lg ring-1 ring-white/5">
          <div className="flex items-center gap-2 mb-3 text-red-400 font-display text-sm tracking-wide">
            <PlusCircle className="w-4 h-4" /> LANCER UNE ALERTE SOS MANUELLE (APPELS RADIO / TÉLÉPHONE)
          </div>
          <form onSubmit={declencherSosManuel} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Nature de l'urgence</label>
              <select 
                className="w-full bg-[#11151b] ring-1 ring-white/10 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formMotif} onChange={(e) => setFormMotif(e.target.value)}
              >
                <option value="médical">médical</option>
                <option value="Incendie / fumée">Incendie / fumée</option>
                <option value="Technique / énergie">Technique / énergie</option>
                <option value="Gaz / Groupe électrogène">Gaz / Groupe électrogène</option>
                <option value="météo">météo</option>
                <option value="Mouvement de foule">Mouvement de foule</option>
                <option value="Sûreté / violence">Sûreté / violence</option>
                <option value="Enfant perdu / personne vulnérable">Enfant perdu / personne vulnérable</option>
                <option value="accident circulation / parking">accident circulation / parking</option>
                <option value="logistique">logistique</option>
                <option value="communication">communication</option>
                <option value="environnement">environnement</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Localisation / Repère</label>
              <select 
                className="w-full bg-[#11151b] ring-1 ring-white/10 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formLieu} onChange={(e) => setFormLieu(e.target.value)}
              >
                <option value="Site grande scène">Site grande scène</option>
                <option value="Site petite scène">Site petite scène</option>
                <option value="Site plaine">Site plaine</option>
                <option value="Site bar">Site bar</option>
                <option value="Site foodtrucks">Site foodtrucks</option>
                <option value="Site sanitaires">Site sanitaires</option>
                <option value="Site backstage">Site backstage</option>
                <option value="Site zone logistique">Site zone logistique</option>
                <option value="Parking public">Parking public</option>
                <option value="Parking artistes">Parking artistes</option>
                <option value="Parcours Balade secteur A">Parcours Balade secteur A</option>
                <option value="Parcours Balade secteur B">Parcours Balade secteur B</option>
                <option value="Parcours Balade secteur C">Parcours Balade secteur C</option>
                <option value="Parcours Balade secteur D">Parcours Balade secteur D</option>
                <option value="Etape 1">Etape 1</option>
                <option value="Etape 2">Etape 2</option>
                <option value="Etape 3">Etape 3</option>
                <option value="Point 0">Point 0</option>
                <option value="PRV#4">PRV#4</option>
                <option value="PRV#5">PRV#5</option>
                <option value="PRV#6">PRV#6</option>
                <option value="PRV#7">PRV#7</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Origine / Indicatif</label>
              <input 
                type="text" className="w-full bg-[#11151b] ring-1 ring-white/10 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formNom} onChange={(e) => setFormNom(e.target.value)} placeholder="Ex: PMR 333 / Secu"
              />
            </div>
            <div>
              <button type="submit" className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono rounded tracking-wide transition-colors shadow">
                INJECTER SOS INTERRAIN
              </button>
            </div>
            <div className="sm:col-span-4">
              <input 
                type="text" className="w-full bg-[#11151b] ring-1 ring-white/10 rounded px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formDetails} onChange={(e) => setFormDetails(e.target.value)} placeholder="Détails descriptifs de la situation terrain..." required
              />
            </div>
          </form>
        </section>

        {/* SOS PARTICIPANTS ACTIFS */}
        {sosVisibles.length > 0 && (
          <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2">
                <TriangleAlert className={`w-4 h-4 ${sosPartNouveaux.length > 0 ? "text-red-300 pulse-slow" : "text-slate-500"}`} />
                SOS PARTICIPANTS ACTIVES
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
                    {s.surTrace && <div className="text-xs text-slate-300 mt-1">km {s.surTrace.km} · Repère : {s.surTrace.reperePlusProche} · {s.surTrace.segment}</div>}
                    {s.details && <div className="text-[11px] text-slate-400 mt-0.5 italic">"{s.details}"</div>}
                    <div className="text-[11px] font-mono mt-1.5 text-amber-300 bg-amber-400/5 px-2 py-0.5 rounded w-fit border border-amber-500/10">
                      Statut : {libelleStatutInterterrain}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Engagement volante */}
        <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3"><Footprints className="w-4 h-4 text-slate-500" /> ENGAGEMENT VOLANTE</h2>
          {consigne ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-amber-200">Engagée vers <span className="font-semibold">{consigne.prv}</span> {consigne.message ? ` — ${consigne.message}` : ""}</div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">Émise à {consigne.heure} · {consigne.accusePar ? <span className="text-emerald-300">Accusée à {consigne.heureAccuse}</span> : <span className="text-amber-300 pulse-slow">En attente d'accusé</span>}</div>
              </div>
              <button onClick={leverConsigne} className="text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-white/25 text-slate-300 hover:text-white">Lever</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <select className="bg-[#232b36] ring-1 ring-white/25 rounded px-2.5 py-2 text-sm text-white focus:outline-none" value={prvChoisi} onChange={(e) => setPrvChoisi(e.target.value)}>
                {PRVS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
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
              {logOuvertes.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-2 text-center">Aucune tâche logistique en attente.</div>
              ) : (
                logOuvertes.slice(0, 6).map((m) => {
                  if (!m) return null;
                  return (
                    <div key={m.id || m.ref} className="flex items-center gap-2 text-xs rounded bg-white/[0.03] ring-1 ring-white/10 px-2.5 py-2">
                      <span className="text-slate-200 flex-1 truncate">{m.nature}</span>
                      <span className={`text-[10px] font-mono px-1 rounded ${m.bloquant === "Oui" || (m.priorite || "").startsWith("P1") ? "bg-red-500/20 text-red-300" : "bg-slate-500/20 text-slate-400"}`}>
                        {m.priorite || "P3"}
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0">{m.attribueA || "non-attribué"}</span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2"><Footprints className="w-4 h-4 text-slate-500" /> BALADE</h2>
              <span className="font-mono text-xs text-amber-300">{persDehors} dehors</span>
            </div>
            <div className="space-y-1.5">
              {["e1", "e2", "e3"].map((eid, idx) => {
                const n = parEtape[eid];
                const pct = Math.min(100, Math.round((n / CAPACITE_ETAPE) * 100));
                const cls = pct >= 100 ? "bg-red-500" : pct >= 72 ? "bg-amber-400" : "bg-emerald-400";
                return (
                  <div key={eid} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 w-14">Etape {idx + 1}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full ${cls}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] font-mono w-14 text-right">{n}/{CAPACITE_ETAPE}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Suivi sanitaire */}
        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2"><Droplets className="w-4 h-4 text-slate-500" /> SANITAIRE</h2>
          </div>
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

        {/* VEILLE MÉDIAS ET RÉSEAUX SOCIAUX */}
        <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2"><Rss className="w-4 h-4 text-slate-500" /> VEILLE MÉDIAS & RÉSEAUX</h2>
            <div className="flex items-center gap-1.5 text-[11px] font-mono bg-white/5 px-2 py-0.5 rounded text-slate-400">
              <span>Ambiance :</span>
              {MEDIAS.ambiance === "positive" && <Smile className="w-3.5 h-3.5 text-emerald-400" />}
              {MEDIAS.ambiance === "neutre" && <Meh className="w-3.5 h-3.5 text-amber-400" />}
              {MEDIAS.ambiance === "negative" && <Frown className="w-3.5 h-3.5 text-red-400" />}
              <span className="uppercase text-[10px] tracking-wider text-slate-300">{MEDIAS.ambiance}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {MEDIAS.canaux && MEDIAS.canaux.map((c, i) => {
              if (!c) return null;
              return (
                <div key={i} className="text-xs rounded bg-white/[0.02] border border-white/5 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="min-w-0">
                    <span className="font-mono text-slate-300 block font-medium">{c.name}</span>
                    <span className="text-slate-400 text-[11px] mt-0.5 block italic">"{c.note}"</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider w-fit shrink-0 ${
                    c.statut === "ok" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {c.statut}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* SUIVI MÉTÉO IRM CORRIGÉ (SÉCURISÉ + DECODAGE DISCRET D'ALÉAS) */}
        <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2"><CloudLightning className="w-4 h-4 text-slate-500" /> METEO IRM</h2>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ring-1 ${mc.ring} ${mc.bg} ${mc.text}`}>{mc.label}</span>
          </div>
          <div className="space-y-2">
            {METEO.timeline && METEO.timeline.map((t, i) => {
              if (!t) return null;
              
              const tc = CODE_METEO[t.code] || CODE_METEO["vert"];
              const nomDuPhenomene = t.phenomene || t.label || t.title || "Alerte";
              const labelCreneau = t.creneau || "En cours";

              // Extraction autonome et cloisonnée du type d'aléa pour affichage de badge
              const lowerText = nomDuPhenomene.toLowerCase();
              let typeAlea = "";
              let aleaClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";

              if (lowerText.includes("orage")) {
                typeAlea = "Orages";
                aleaClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
              } else if (lowerText.includes("chaleur") || lowerText.includes("canicule") || lowerText.includes("température")) {
                typeAlea = "Chaleur";
                aleaClass = "bg-orange-500/10 text-orange-400 border-orange-500/20";
              } else if (lowerText.includes("pluie") || lowerText.includes("précipit") || lowerText.includes("inond")) {
                typeAlea = "Précipitations";
                aleaClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
              } else if (lowerText.includes("vent") || lowerText.includes("rafale") || lowerText.includes("tempête")) {
                typeAlea = "Vent";
                aleaClass = "bg-sky-500/10 text-sky-300 border-sky-500/20";
              }

              return (
                <a key={i} href="https://www.meteo.be/fr/ferrieres" target="_blank" rel="noreferrer" className="flex items-center justify-between text-xs rounded bg-white/[0.02] border border-white/5 p-2.5 hover:bg-white/[0.06] transition-all group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${tc.dot} shrink-0`} />
                    {typeAlea && (
                      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${aleaClass}`}>
                        {typeAlea}
                      </span>
                    )}
                    <span className="text-slate-100 font-medium group-hover:text-amber-300 truncate">
                      {nomDuPhenomene}
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-amber-400 shrink-0" />
                  </div>
                  <span className="text-slate-500 font-mono text-[10px] shrink-0 ml-2">{labelCreneau}</span>
                </a>
              );
            })}
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