import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  TriangleAlert,
  PhoneCall,
  MapPin,
  Navigation,
  CheckCircle2,
  Clock,
  Footprints,
  ClipboardList,
  RefreshCw,
  Compass,
  X,
  CircleDot,
  ShieldAlert,
  CloudLightning,
} from "lucide-react";

/* ---------------------------------------------------------------------
   APP VOLANTE -- BFMF 2026
   Vue terrain unifiée pour l'équipe volante :
   - Moniteur météo interne synchronisé en temps réel
   - Consigne d'engagement du QG (PRV choisi) avec guidage GPS
   - SOS participants avec cycle tactique complet (tolérant aux injections QG)
   - Alertes équipes (logistique + balade) et saturation des étapes
   - Missions logistiques attribuées à la volante, avec guidage
--------------------------------------------------------------------- */

/* ------------------------------ Supabase ------------------------------ */
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
  if (!r.ok) throw new Error("GET " + r.status);
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

/* -------------------- Points de reference geolocalises -------------------- */
const POINTS = {
  "Point 0": { lat: 50.3835, lon: 5.6215 },
  "PRV#4": { lat: 50.38212, lon: 5.61673 },
  "PRV#5": { lat: 50.37568, lon: 5.64412 },
  "PRV#6": { lat: 50.38236, lon: 5.64579 },
  "PRV#7": { lat: 50.38865, lon: 5.62692 },
  "Etape 1": { lat: 50.37858, lon: 5.6279 },
  "Etape 2": { lat: 50.37828, lon: 5.64549 },
  "Etape 3": { lat: 50.38817, lon: 5.62891 },
};

const ZONE_VERS_POINT = {
  "Point 0": "Point 0",
  "Parking public": "Point 0",
  "Scene 1": "Point 0",
  "Scene 2": "Point 0",
  "Plaine / public": "Point 0",
  Bar: "Point 0",
  Foodtrucks: "Point 0",
  Sanitaires: "Point 0",
  Backstage: "Point 0",
  "Zone logistique": "Point 0",
  "Etape 1": "Etape 1",
  "Etape 2": "Etape 2",
  "Etape 3": "Etape 3",
  "Parcours secteur A": "Etape 1",
  "Parcours secteur B": "Etape 2",
  "Parcours secteur C": "Etape 3",
  "Parcours secteur D": "Point 0",
};

const CAPACITE_ETAPE = 300;

const METEO_FALLBACK = {
  live: true,
  province: "Liege",
  codeActuel: "vert",
  maj: "Initialisation",
  timeline: [{ creneau: "Prochaines heures", code: "vert", phenomene: "Conditions normales / RAS" }],
};

const CODE_METEO = {
  vert: { text: "text-emerald-300", bg: "bg-emerald-400/10", ring: "ring-emerald-400/30", dot: "bg-emerald-400", label: "VERT" },
  jaune: { text: "text-amber-300", bg: "bg-amber-400/10", ring: "ring-amber-400/40", dot: "bg-amber-400", label: "JAUNE" },
  orange: { text: "text-orange-300", bg: "bg-orange-400/10", ring: "ring-orange-400/40", dot: "bg-orange-400", label: "ORANGE" },
  rouge: { text: "text-red-300", bg: "bg-red-400/10", ring: "ring-red-400/30", dot: "bg-red-400", label: "ROUGE" },
};

/* ------------------------------ Geometrie ------------------------------ */
function hav(la1, lo1, la2, lo2) {
  const R = 6371000, r = Math.PI / 180;
  const a =
    Math.sin(((la2 - la1) * r) / 2) ** 2 +
    Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(((lo2 - lo1) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function bearing(la1, lo1, la2, lo2) {
  const r = Math.PI / 180;
  const y = Math.sin((lo2 - lo1) * r) * Math.cos(la2 * r);
  const x =
    Math.cos(la1 * r) * Math.sin(la2 * r) -
    Math.sin(la1 * r) * Math.cos(la2 * r) * Math.cos((lo2 - lo1) * r);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function cardinal(b) {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(b / 45) % 8];
}

function fmtDist(m) {
  return m >= 1000 ? (m / 1000).toFixed(1) + " km" : Math.round(m) + " m";
}

function mapsUrl(lat, lon) {
  return `http://googleusercontent.com/maps.google.com/?q=${lat},${lon}&travelmode=walking`;
}

function nearestPRV(lat, lon) {
  let best = null;
  for (const [nom, p] of Object.entries(POINTS)) {
    if (!nom.startsWith("PRV")) continue;
    const d = hav(lat, lon, p.lat, p.lon);
    if (!best || d < best.d) best = { nom, ...p, d };
  }
  return best;
}

function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ------------------------------ App ------------------------------ */
export default function AppVolante() {
  const [missions, setMissions] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [sosPart, setSosPart] = useState([]);
  const [consigne, setConsigne] = useState(null);
  const [meteoLive, setMeteoLive] = useState(null);
  const [sbError, setSbError] = useState(false);
  const [now, setNow] = useState(new Date());
  const [maPos, setMaPos] = useState(null);
  const [cible, setCible] = useState(null);
  const watchRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Position en continu (guidage)
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setMaPos({ lat: pos.coords.latitude, lon: pos.coords.longitude, precision: pos.coords.accuracy }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  // Donnees partagees
  useEffect(() => {
    let stop = false;
    async function pull() {
      try {
        const [mi, gr, aLog, aBal, sp, co, mto] = await Promise.all([
          kvGet(KEY_MISSIONS),
          kvGet(KEY_GROUPES),
          kvGet(KEY_ALERTE_LOG),
          kvGet(KEY_ALERTE_BAL),
          kvGet(KEY_SOS_PART),
          kvGet(KEY_CONSIGNE),
          kvGet(KEY_METEO),
        ]);
        if (stop) return;
        setMissions(Array.isArray(mi) ? mi : []);
        setGroupes(Array.isArray(gr) ? gr : []);
        setSosPart(Array.isArray(sp) ? sp : []);
        setConsigne(co && co.active ? co : null);
        setMeteoLive(mto && mto.live ? mto : null);
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
    const t = setInterval(pull, 8000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  // Missions attribuées à la volante, non résolues
  const mesMissions = missions.filter(
    (m) => (m.attribueA || "").toLowerCase().includes("volante") && m.statut !== "Resolue"
  );

  // SOS participants actifs (exclut les clôturés)
  const sosActifs = sosPart.filter((s) => {
    const st = (s.statut || "").toLowerCase();
    return st !== "cloture" && st !== "clôture" && st !== "cloturé" && st !== "clos";
  }).slice(0, 5);

  // Saturation étapes
  const parEtape = { e1: 0, e2: 0, e3: 0 };
  groupes.forEach((g) => {
    if (parEtape[g.position] !== undefined) parEtape[g.position] += Number(g.participants) || 0;
  });
  const etapesSaturees = ["e1", "e2", "e3"]
    .map((eid, i) => ({ nom: `Etape ${i + 1}`, n: parEtape[eid], pct: parEtape[eid] / CAPACITE_ETAPE }))
    .filter((e) => e.pct >= 0.72);

  async function accuserConsigne() {
    if (!consigne) return;
    const c = { ...consigne, accusePar: "Volante", heureAccuse: nowHM() };
    setConsigne(c);
    await kvSet(KEY_CONSIGNE, c);
  }

  async function avancerMission(m) {
    const nextStatut = m.statut === "Attribuee" ? "En cours" : "Resolue";
    const next = missions.map((x) =>
      x.id === m.id
        ? {
            ...x,
            statut: nextStatut,
            historique: [...(x.historique || []), { heure: nowHM(), texte: `${nextStatut} -- par Volante (app terrain)` }],
          }
        : x
    );
    setMissions(next);
    await kvSet(KEY_MISSIONS, next);
  }

  async function changerStatutSos(id, nouveauStatut, cleHeure) {
    const codeHeure = nowHM();
    const next = sosPart.map((s) =>
      s.id === id ? { ...s, statut: nouveauStatut, [cleHeure]: codeHeure } : s
    );
    setSosPart(next);
    try {
      await kvSet(KEY_SOS_PART, next);
    } catch (e) {
      console.error("Erreur sync SOS tactique :", e);
    }
  }

  function guiderVers(nom, lat, lon, contexte) {
    setCible({ nom, lat, lon, contexte });
  }

  const guidage =
    cible && maPos
      ? {
          d: hav(maPos.lat, maPos.lon, cible.lat, cible.lon),
          b: bearing(maPos.lat, maPos.lon, cible.lat, cible.lon),
        }
      : null;

  const METEO = meteoLive || METEO_FALLBACK;
  const mc = CODE_METEO[METEO.codeActuel] || CODE_METEO["vert"];

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=500;600;700&family=Inter:wght=400;500;600;700&family=JetBrains+Mono:wght=400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes pulseSlow { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .pulse-slow { animation: pulseSlow 1.6s ease-in-out infinite; }
      `}</style>

      <header className="border-b border-white/10 bg-[#151b23]/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-[15px] leading-none">VOLANTE</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · TERRAIN</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-2 h-2 rounded-full ${maPos ? "bg-emerald-400" : "bg-slate-600"}`} title={maPos ? "GPS actif" : "GPS inactif"} />
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />
              {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
            </div>
          </div>
        </div>
      </header>

      {/* Bandeau guidage actif */}
      {cible && (
        <div className="sticky top-[57px] z-10 bg-[#1a2432] border-b-2 border-amber-400/50 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Compass className="w-6 h-6 text-amber-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-medium truncate">→ {cible.nom}</div>
              <div className="text-xs text-slate-400 truncate">
                {guidage
                  ? `${fmtDist(guidage.d)} · direction ${cardinal(guidage.b)} (${Math.round(guidage.b)}°)`
                  : "En attente du GPS..."}
                {cible.contexte ? ` · ${cible.contexte}` : ""}
              </div>
            </div>
            <a
              href={mapsUrl(cible.lat, cible.lon)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[11px] font-mono px-2.5 py-2 rounded ring-1 ring-amber-400/50 bg-amber-400/15 text-amber-200 flex items-center gap-1"
            >
              <Navigation className="w-3.5 h-3.5" /> Maps
            </a>
            <a
              href={myMapsUrl(cible.lat, cible.lon)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[11px] font-mono px-2.5 py-2 rounded ring-1 ring-sky-400/50 bg-sky-400/15 text-sky-200 flex items-center gap-1"
              title="Carte operationnelle Buco (parcours, PRV)"
            >
              <MapPin className="w-3.5 h-3.5" /> Buco
            </a>
            <button onClick={() => setCible(null)} className="shrink-0 text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {sbError && (
          <div className="rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 text-xs px-3 py-2">
            Reseau instable — donnees possiblement obsoletes.
          </div>
        )}

        {/* SUIVI MÉTÉO - PANEL INTERNE REPRIS DU DASHBOARD PRINCIPAL */}
        <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2">
              <CloudLightning className="w-4 h-4 text-slate-500" /> MONITEUR MÉTÉO INTERNE BFMF
            </h2>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ring-1 ${mc.ring} ${mc.bg} ${mc.text}`}>{mc.label}</span>
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

        {/* Consigne d'engagement QG */}
        {consigne && (
          <section className="rounded-lg ring-2 ring-amber-400/60 bg-amber-400/10 p-4">
            <div className="font-display text-amber-200 text-sm tracking-wide flex items-center gap-2 mb-1">
              <TriangleAlert className="w-4 h-4 pulse-slow" /> CONSIGNE QG — ENGAGEMENT
            </div>
            <div className="text-sm text-slate-100">
              Rejoindre <span className="font-semibold text-amber-200">{consigne.prv}</span>
              {consigne.message ? ` — ${consigne.message}` : ""}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              Emise a {consigne.heure} par {consigne.auteur || "QG"}
              {consigne.accusePar ? ` · accusee a ${consigne.heureAccuse}` : ""}
            </div>
            <div className="flex gap-2 mt-3">
              {POINTS[consigne.prv] && (
                <button
                  onClick={() => guiderVers(consigne.prv, POINTS[consigne.prv].lat, POINTS[consigne.prv].lon, "consigne QG")}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-mono px-3 py-2.5 rounded ring-1 ring-amber-400/50 bg-amber-400/15 text-amber-200"
                >
                  <Compass className="w-4 h-4" /> Guider vers {consigne.prv}
                </button>
              )}
              {!consigne.accusePar && (
                <button
                  onClick={accuserConsigne}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-mono px-3 py-2.5 rounded ring-1 ring-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                >
                  <CheckCircle2 className="w-4 h-4" /> Bien recu
                </button>
              )}
            </div>
          </section>
        )}

        {/* Alertes equipes */}
        {alertes.map((a, i) => (
          <div key={i} className="rounded-lg ring-2 ring-red-400/60 bg-red-500/15 p-3.5">
            <div className="font-display text-red-200 text-sm tracking-wide flex items-center gap-2">
              <TriangleAlert className="w-4 h-4 pulse-slow" /> SOS {a.source.toUpperCase()} — {a.motif}
            </div>
            <div className="text-xs text-red-200/80 mt-1">
              {a.heure} · {a.auteur}
              {a.groupe ? ` · ${a.groupe}` : ""}
              {a.details ? ` — ${a.details}` : ""}
            </div>
          </div>
        ))}

        {/* Saturation etapes (crowd) */}
        {etapesSaturees.length > 0 && (
          <section className="rounded-lg ring-1 ring-amber-400/40 bg-amber-400/5 p-3.5">
            <div className="font-display text-amber-200 text-sm tracking-wide flex items-center gap-2 mb-1.5">
              <Footprints className="w-4 h-4" /> CROWD — DENSITE ELEVEE
            </div>
            {etapesSaturees.map((e) => (
              <div key={e.nom} className="flex items-center justify-between text-xs text-slate-200 py-0.5">
                <span>{e.nom} : {e.n}/{CAPACITE_ETAPE} ({Math.round(e.pct * 100)}%)</span>
                <button
                  onClick={() => guiderVers(e.nom, POINTS[e.nom].lat, POINTS[e.nom].lon, "appui crowd")}
                  className="text-[11px] font-mono text-amber-300 hover:text-amber-200 flex items-center gap-1"
                >
                  <Compass className="w-3 h-3" /> Guider
                </button>
              </div>
            ))}
          </section>
        )}

        {/* SOS participants évolutifs */}
        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
            <TriangleAlert className={`w-4 h-4 ${sosActifs.some((s) => (s.statut || "").toLowerCase() === "nouveau") ? "text-red-300 pulse-slow" : "text-slate-500"}`} />
            SOS PARTICIPANTS
            <span className="text-[11px] font-mono text-slate-500 font-normal">{sosActifs.length} actif(s)</span>
          </h2>
          <div className="space-y-3">
            {sosActifs.length === 0 && <div className="text-xs text-slate-500 text-center py-2">Aucun SOS actif.</div>}
            {sosActifs.map((s) => {
              const prv = s.gps ? nearestPRV(s.gps.lat, s.gps.lon) : null;
              const currentStatutLower = (s.statut || "").toLowerCase();

              return (
                <div
                  key={s.id}
                  className="rounded-lg px-3 py-3 border border-white/5 bg-white/[0.02] space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span>{s.heure}</span>
                        <span>·</span>
                        <span className="truncate text-slate-300 font-medium">{s.nom}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-0.5">{s.motif}</h3>
                    </div>
                    {s.tel && (
                      <a href={`tel:${s.tel}`} className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 shrink-0">
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {s.surTrace && (
                    <div className="text-xs text-slate-300 bg-white/[0.01] p-1.5 rounded border border-white/5">
                      km {s.surTrace.km} · {s.surTrace.segment || s.surTrace.reperePlusProche}
                      {s.surTrace.ecartMetres > 100 && <span className="text-amber-300 block mt-0.5 font-medium">⚠️ ~{s.surTrace.ecartMetres} m hors sentier</span>}
                    </div>
                  )}

                  {s.details && <div className="text-[11px] text-slate-400 italic bg-black/10 p-1.5 rounded">"{s.details}"</div>}

                  {/* Boutons de navigation/guidage */}
                  <div className="flex gap-2">
                    {s.gps && (
                      <button
                        onClick={() => guiderVers(`Victime (${s.motif})`, s.gps.lat, s.gps.lon, s.nom)}
                        className="flex-1 text-[11px] font-mono px-2 py-1.5 rounded ring-1 ring-red-400/40 bg-red-400/10 text-red-200 flex items-center justify-center gap-1"
                      >
                        <Compass className="w-3.5 h-3.5" /> Victime
                      </button>
                    )}
                    {prv && (
                      <button
                        onClick={() => guiderVers(prv.nom, prv.lat, prv.lon, `PRV le plus proche de la victime (${fmtDist(prv.d)})`)}
                        className="flex-1 text-[11px] font-mono px-2 py-1.5 rounded ring-1 ring-white/20 text-slate-300 flex items-center justify-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" /> {prv.nom}
                      </button>
                    )}
                  </div>

                  {/* BLOC CHRONOLOGIQUE ET TACTIQUE DES SECOURS CORRIGÉ — PREND EN COMPTE L'INJECTION DASHBOARD */}
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    {(currentStatutLower === "nouveau" || currentStatutLower === "pris en compte") && (
                      <button
                        onClick={() => changerStatutSos(s.id, "en route", "heureEnRoute")}
                        className="w-full text-xs font-mono py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" /> EN ROUTE
                      </button>
                    )}

                    {currentStatutLower === "en route" && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-sky-400 text-center">✓ En route depuis {s.heureEnRoute || "—"}</div>
                        <button
                          onClick={() => changerStatutSos(s.id, "sur place", "heureArrivee")}
                          className="w-full text-xs font-mono py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center justify-center gap-1.5 transition-colors pulse-slow"
                        >
                          <CircleDot className="w-3.5 h-3.5" /> ARRIVÉ SUR PLACE
                        </button>
                      </div>
                    )}

                    {currentStatutLower === "sur place" && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-amber-400 text-center">✓ Sur place depuis {s.heureArrivee || "—"}</div>
                        <button
                          onClick={() => changerStatutSos(s.id, "prise en charge", "heurePriseEnCharge")}
                          className="w-full text-xs font-mono py-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> VICTIME PRISE EN CHARGE
                        </button>
                      </div>
                    )}

                    {currentStatutLower === "prise en charge" && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-purple-400 text-center">✓ Soins en cours ({s.heurePriseEnCharge || "—"})</div>
                        <button
                          onClick={() => changerStatutSos(s.id, "retour a la normale", "heureRetourNormale")}
                          className="w-full text-xs font-mono py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> RETOUR À LA NORMALE
                        </button>
                      </div>
                    )}

                    {(currentStatutLower === "retour a la normale" || currentStatutLower === "cloture" || currentStatutLower === "clôture") && (
                      <div className="w-full text-center text-xs font-mono py-2 rounded bg-emerald-900/20 text-emerald-400 border border-emerald-500/30">
                        ✓ Géré à {s.heureRetourNormale || s.heureCloture || "—"} — En attente d'archivage QG
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Missions logistiques attribuees */}
        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-slate-500" /> MES MISSIONS LOGISTIQUES
            <span className="text-[11px] font-mono text-slate-500 font-normal">{mesMissions.length}</span>
          </h2>
          <div className="space-y-2">
            {mesMissions.length === 0 && <div className="text-xs text-slate-500 text-center py-2">Aucune mission attribuee a la volante.</div>}
            {mesMissions.map((m) => {
              const pt = POINTS[ZONE_VERS_POINT[m.zone] || ""] ? { nom: ZONE_VERS_POINT[m.zone], ...POINTS[ZONE_VERS_POINT[m.zone]] } : null;
              return (
                <div key={m.id || m.ref} className="rounded-md px-3 py-2.5 ring-1 ring-white/10 bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${(m.priorite || "").startsWith("P1") ? "bg-red-400" : (m.priorite || "").startsWith("P2") ? "bg-amber-400" : "bg-sky-400"}`} />
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">{m.ref}</span>
                    <span className="text-slate-100 flex-1 min-w-0 truncate">{m.nature}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 pl-3.5">
                    {m.zone} · {m.localisation}
                    {m.delaiSouhaite ? ` · delai : ${m.delaiSouhaite}` : ""}
                  </div>
                  <div className="flex gap-2 mt-2 pl-3.5">
                    {pt && (
                      <button
                        onClick={() => guiderVers(`${pt.nom} (${m.ref})`, pt.lat, pt.lon, m.localisation)}
                        className="text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-white/20 text-slate-300 flex items-center gap-1"
                      >
                        <Compass className="w-3.5 h-3.5" /> Guider
                      </button>
                    )}
                    <button
                      onClick={() => avancerMission(m)}
                      className="flex-1 text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    >
                      {m.statut === "Attribuee" ? "Demarrer" : "Marquer resolue"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="text-[10px] text-slate-600 font-mono text-center pb-2">
          Rafraichissement 8 s · Urgence vitale : 112 puis PMR333 · L'app complete la radio
        </div>
      </main>
    </div>
  );
}