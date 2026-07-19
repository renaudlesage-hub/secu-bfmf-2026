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
  Car
} from "lucide-react";

/* ---------------------------------------------------------------------
   APP VOLANTE — OPTIMISÉE MOBILE, VÉHICULE & MYMAPS (BFMF 2026)
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
  vert:   { text: "text-emerald-300", bg: "bg-emerald-400/10", ring: "ring-emerald-400/30", dot: "bg-emerald-400", border: "border-emerald-400", borderT: "border-t-emerald-400", ringHover: "hover:ring-emerald-400/50", label: "VERT" },
  jaune:  { text: "text-amber-300", bg: "bg-amber-400/10", ring: "ring-amber-400/40", dot: "bg-amber-400", border: "border-amber-400", borderT: "border-t-amber-400", ringHover: "hover:ring-amber-400/50", label: "JAUNE" },
  orange: { text: "text-orange-300", bg: "bg-orange-400/10", ring: "ring-orange-400/40", dot: "bg-orange-400", border: "border-orange-400", borderT: "border-t-orange-400", ringHover: "hover:ring-orange-400/60", label: "ORANGE" },
  rouge:  { text: "text-red-300", bg: "bg-red-400/10", ring: "ring-red-400/30", dot: "bg-red-500", border: "border-red-500", borderT: "border-t-red-500", ringHover: "hover:ring-red-500/60", label: "ROUGE" },
};

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
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
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

  const mesMissions = missions.filter(
    (m) => (m.attribueA || "").toLowerCase().includes("volante") && m.statut !== "Resolue"
  );

  const sosActifs = sosPart.filter((s) => {
    const st = (s.statut || "").toLowerCase();
    return st !== "cloture" && st !== "clôture" && st !== "cloturé" && st !== "clos";
  }).slice(0, 5);

  const parEtape = { e1: 0, e2: 0, e3: 0 };
  groupes.forEach((g) => {
    if (parEtape[g.position] !== undefined) parEtape[g.position] += Number(g.participants) || 0;
  });

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
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans antialiased pb-12">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=500;600;700&family=Inter:wght=400;500;600;700&family=JetBrains+Mono:wght=400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes pulseSlow { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .pulse-slow { animation: pulseSlow 1.6s ease-in-out infinite; }
      `}</style>

      <header className="border-b border-white/10 bg-[#151b23]/95 backdrop-blur sticky top-0 z-20 shadow-md">
        <div className="w-full max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-base leading-none uppercase font-bold text-white">ÉQUIPE VOLANTE</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1 uppercase">BFMF 2026 · TERRAIN</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full ${maPos ? "bg-emerald-400" : "bg-red-500 pulse-slow"}`} />
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm font-semibold bg-white/[0.03] px-2 py-1 rounded border border-white/5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
            </div>
          </div>
        </div>
      </header>

      {cible && (
        <div className="sticky top-[69px] z-10 bg-[#1a2536] border-b-2 border-amber-400/60 shadow-lg px-4 py-3">
          <div className="w-full max-w-xl mx-auto flex items-center justify-between gap-3">
            <Compass className="w-6 h-6 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono uppercase tracking-wider text-amber-300 font-medium">Guidage Véhicule</div>
              <div className="text-sm text-white font-bold truncate mt-0.5">{cible.nom}</div>
              <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                {guidage ? `${fmtDist(guidage.d)} · Cap ${cardinal(guidage.b)} (${Math.round(guidage.b)}°)` : "Calcul GPS..."}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={mapsUrl(cible.lat, cible.lon)}
                target="_blank"
                 Terrell="noreferrer"
                className="text-[11px] font-mono font-bold px-2.5 py-2.5 rounded-xl ring-1 ring-amber-400/40 bg-amber-400/10 text-amber-300 flex items-center gap-1 active:bg-amber-400/30 shadow-sm"
              >
                <Car className="w-3.5 h-3.5" /> GPS
              </a>
              <a
                href={myMapsUrl(cible.lat, cible.lon)}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono font-bold px-2.5 py-2.5 rounded-xl ring-1 ring-sky-400/40 bg-sky-400/10 text-sky-300 flex items-center gap-1 active:bg-sky-400/30 shadow-sm"
                title="Carte opérationnelle Bucolique (Parcours + PRV)"
              >
                <MapPin className="w-3.5 h-3.5" /> Buco
              </a>
              <button onClick={() => setCible(null)} className="p-1 text-slate-400 hover:text-white active:bg-white/10 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="w-full max-w-xl mx-auto px-4 py-4 space-y-4">
        {sbError && (
          <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/20 text-red-400 text-xs px-3 py-2.5 font-mono flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 shrink-0" /> Synchronisation interrompue (Zone Blanche)
          </div>
        )}

        <section className="bg-[#151b23] rounded-xl p-4 ring-1 ring-white/10 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display tracking-wide text-xs text-slate-400 font-bold flex items-center gap-2 uppercase">
              <CloudLightning className="w-4 h-4 text-slate-500" /> Moniteur météo interne BFMF
            </h2>
            <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ring-1 ${mc.ring} ${mc.bg} ${mc.text}`}>{mc.label}</span>
          </div>
          <div className="space-y-2">
            {METEO.timeline && METEO.timeline.map((t, i) => {
              if (!t) return null;
              const tc = CODE_METEO[t.code] || CODE_METEO["vert"];
              return (
                <div key={i} className="flex items-center justify-between text-xs rounded-xl bg-black/20 border border-white/5 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${tc.dot} shrink-0`} />
                    <span className="text-slate-100 font-semibold truncate">{t.phenomene || "Pas de précisions terrain"}</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[10px] shrink-0 ml-2">{t.creneau || "Horizon"}</span>
                </div>
              );
            })}
          </div>
        </section>

        {consigne && (
          <section className="rounded-xl ring-2 ring-amber-400/50 bg-amber-400/10 p-4 shadow-lg space-y-3">
            <div>
              <div className="font-display text-amber-300 text-sm tracking-wide font-bold flex items-center gap-2">
                <TriangleAlert className="w-4 h-4 text-amber-400 pulse-slow" /> INSTRUCTION RADIALE QG
              </div>
              <div className="text-base text-white font-bold mt-1.5 leading-snug">
                Transit d'urgence vers <span className="text-amber-300 underline underline-offset-4">{consigne.prv}</span>
              </div>
              {consigne.message && <div className="text-sm text-slate-200 mt-1 bg-black/20 p-2 rounded-lg border border-white/5 font-mono">"{consigne.message}"</div>}
            </div>
            <div className="flex gap-2">
              {POINTS[consigne.prv] && (
                <button
                  onClick={() => guiderVers(consigne.prv, POINTS[consigne.prv].lat, POINTS[consigne.prv].lon, "Instruction QG")}
                  className="flex-1 flex items-center justify-center gap-2 text-xs font-mono font-bold px-3 py-3 rounded-xl ring-1 ring-amber-400/50 bg-amber-400/20 text-amber-200 active:bg-amber-400/40"
                >
                  <Car className="w-4 h-4" /> Transit routier {consigne.prv}
                </button>
              )}
              {!consigne.accusePar && (
                <button
                  onClick={accuserConsigne}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-mono font-bold px-3 py-3 rounded-xl ring-1 ring-emerald-400/50 bg-emerald-500/20 text-emerald-200 active:bg-emerald-500/40"
                >
                  <CheckCircle2 className="w-4 h-4" /> Accuser Réception
                </button>
              )}
            </div>
          </section>
        )}

        {alertes.map((a, i) => (
          <div key={i} className="rounded-xl ring-2 ring-red-500/50 bg-red-950/30 p-4 shadow-md">
            <div className="font-display text-red-400 text-sm tracking-wide font-bold flex items-center gap-2">
              <TriangleAlert className="w-4 h-4 text-red-400 pulse-slow" /> ALERTE ÉQUIPE — {a.source.toUpperCase()}
            </div>
            <div className="text-sm text-white font-semibold mt-1">{a.motif}</div>
            <div className="text-[11px] font-mono text-red-300/70 mt-1">
              Heure : {a.heure} · Auteur : {a.auteur} {a.groupe ? `· Unité : ${a.groupe}` : ""} {a.lieu ? `· Lieu : ${a.lieu}` : ""} {a.qui ? `· Concerne : ${a.qui}` : ""} {a.details ? `— ${a.details}` : ""}
            </div>
          </div>
        ))}

        <section className="bg-[#151b23] rounded-xl ring-1 ring-white/10 p-4 shadow-md space-y-3">
          <h2 className="font-display tracking-wide text-xs text-slate-400 font-bold flex items-center gap-2 uppercase border-b border-white/5 pb-2">
            <TriangleAlert className={`w-4 h-4 ${sosActifs.some((s) => (s.statut || "").toLowerCase() === "nouveau") ? "text-red-400 pulse-slow" : "text-slate-500"}`} />
            SOS Participants Actifs ({sosActifs.length})
          </h2>
          <div className="space-y-3">
            {sosActifs.length === 0 && <div className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/5 rounded-xl">Aucun signalement de festivalier en cours.</div>}
            {sosActifs.map((s) => {
              const prv = s.gps ? nearestPRV(s.gps.lat, s.gps.lon) : null;
              const currentStatutLower = (s.statut || "").toLowerCase();

              return (
                <div key={s.id} className="rounded-xl p-3.5 border border-white/10 bg-black/30 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span className="bg-white/5 px-1.5 py-0.5 rounded text-slate-300">{s.heure}</span>
                        <span className="truncate text-slate-300 font-medium">{s.nom}</span>
                      </div>
                      {/* FIX : ALIGNEMENT ROBUSTE DE L'AFFICHAGE DU NOM DU INCIDENT/SOS */}
                      <h3 className="text-base font-bold text-white mt-1 leading-tight">
                        {s.motif || s.typeLabel || s.texte || "Alerte Secours Victime"}
                      </h3>
                    </div>
                    {s.tel && (
                      <a href={`tel:${s.tel}`} className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 active:bg-emerald-500/20 shrink-0 border border-emerald-500/20">
                        <PhoneCall className="w-5 h-5" />
                      </a>
                    )}
                  </div>

                  {s.surTrace && (
                    <div className="text-xs text-slate-300 bg-white/[0.02] p-2 rounded-lg border border-white/5 font-mono">
                      📍 Alignement : {s.surTrace.segment || s.surTrace.reperePlusProche || "—"} {s.surTrace.km ? `(km ${s.surTrace.km})` : ""}
                      {s.surTrace.ecartMetres > 100 && (
                        s.surTrace.ecartMetres > 10000
                          ? <span className="text-amber-400 block mt-1 font-bold">⚠️ Position très éloignée (~{Math.round(s.surTrace.ecartMetres / 1000)} km) — GPS douteux / test</span>
                          : s.surTrace.ecartMetres > 2000
                          ? <span className="text-amber-400 block mt-1 font-bold">⚠️ Écart : ~{(s.surTrace.ecartMetres / 1000).toFixed(1)} km HORS TRACE</span>
                          : <span className="text-amber-400 block mt-1 font-bold">⚠️ Écart : ~{s.surTrace.ecartMetres} m HORS TRACE</span>
                      )}
                    </div>
                  )}

                  {s.details && <div className="text-xs text-slate-300 bg-black/40 p-2.5 rounded-lg border border-white/5 leading-relaxed font-mono">"{s.details}"</div>}

                  <div className="grid grid-cols-2 gap-2">
                    {s.gps && (
                      <button
                        onClick={() => guiderVers(`SOS: ${s.motif || "Secours"}`, s.gps.lat, s.gps.lon, `Festivalier: ${s.nom}`)}
                        className="text-xs font-mono font-bold px-2.5 py-3 rounded-xl ring-1 ring-red-500/40 bg-red-500/10 text-red-200 flex items-center justify-center gap-1.5 active:bg-red-500/30"
                      >
                        <Compass className="w-4 h-4" /> Approche Victime
                      </button>
                    )}
                    {prv && (
                      <button
                        onClick={() => guiderVers(prv.nom, prv.lat, prv.lon, `Zone de dépose PRV (${fmtDist(prv.d)})`)}
                        className="text-xs font-mono font-bold px-2.5 py-3 rounded-xl ring-1 ring-white/10 bg-white/5 text-slate-200 flex items-center justify-center gap-1.5 active:bg-white/10"
                      >
                        <MapPin className="w-4 h-4 text-amber-400" /> Rallier {prv.nom}
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    {(currentStatutLower === "nouveau" || currentStatutLower === "pris en compte") && (
                      <button
                        onClick={() => changerStatutSos(s.id, "en route", "heureEnRoute")}
                        className="w-full text-xs font-mono font-bold py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-1.5 transition-colors shadow-md"
                      >
                        <Navigation className="w-4 h-4" /> ENGAGER LE VÉHICULE (EN ROUTE)
                      </button>
                    )}

                    {currentStatutLower === "en route" && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-mono text-sky-400 text-center bg-sky-500/5 py-1 rounded border border-sky-500/10">✓ En transit routier depuis {s.heureEnRoute || "—"}</div>
                        <button
                          onClick={() => changerStatutSos(s.id, "sur place", "heureArrivee")}
                          className="w-full text-xs font-mono font-bold py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-1.5 transition-colors pulse-slow shadow-md"
                        >
                          <CircleDot className="w-4 h-4" /> ARRIVÉ SUR ZONE CONSTITUÉE
                        </button>
                      </div>
                    )}

                    {currentStatutLower === "sur place" && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-mono text-amber-400 text-center bg-amber-500/5 py-1 rounded border border-amber-500/10">✓ Contact établi à {s.heureArrivee || "—"}</div>
                        <button
                          onClick={() => changerStatutSos(s.id, "prise en charge", "heurePriseEnCharge")}
                          className="w-full text-xs font-mono font-bold py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 transition-colors shadow-md"
                        >
                          <ShieldAlert className="w-4 h-4" /> APPORT DES SOINS / PRISE EN CHARGE
                        </button>
                      </div>
                    )}

                    {currentStatutLower === "prise en charge" && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-mono text-purple-400 text-center bg-purple-500/5 py-1 rounded border border-purple-500/10">✓ Traitement médical en cours ({s.heurePriseEnCharge || "—"})</div>
                        <button
                          onClick={() => changerStatutSos(s.id, "retour a la normale", "heureRetourNormale")}
                          className="w-full text-xs font-mono font-bold py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-colors shadow-md"
                        >
                          <CheckCircle2 className="w-4 h-4" /> LIQUIDATION DE L'INCIDENT (R.A.N)
                        </button>
                      </div>
                    )}

                    {(currentStatutLower === "retour a la normale" || currentStatutLower === "cloture" || currentStatutLower === "clôture") && (
                      <div className="w-full text-center text-xs font-mono py-2.5 rounded-xl bg-emerald-950/30 text-emerald-400 border border-emerald-500/20">
                        ✓ Géré à {s.heureRetourNormale || s.heureCloture || "—"} — En attente d'archivage QG
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-[#151b23] rounded-xl ring-1 ring-white/10 p-4 shadow-md space-y-3">
          <h2 className="font-display tracking-wide text-xs text-slate-400 font-bold flex items-center gap-2 uppercase border-b border-white/5 pb-2">
            <ClipboardList className="w-4 h-4 text-slate-500" /> Missions Logistiques Volante ({mesMissions.length})
          </h2>
          <div className="space-y-2.5">
            {mesMissions.length === 0 && <div className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/5 rounded-xl">Aucun fret logistique ni mission attribuée.</div>}
            {mesMissions.map((m) => {
              const pt = POINTS[ZONE_VERS_POINT[m.zone] || ""] ? { nom: ZONE_VERS_POINT[m.zone], ...POINTS[ZONE_VERS_POINT[m.zone]] } : null;
              return (
                <div key={m.id || m.ref} className="rounded-xl p-3 bg-black/20 border border-white/5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${(m.priorite || "").startsWith("P1") ? "bg-red-400" : (m.priorite || "").startsWith("P2") ? "bg-amber-400" : "bg-sky-400"}`} />
                    <span className="font-mono text-[10px] text-slate-500 font-normal">{m.ref}</span>
                    <span className="text-slate-200 flex-1 min-w-0 truncate">{m.nature}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 pl-4 leading-tight">
                    Secteur : <span className="text-slate-300 font-medium">{m.zone}</span> · Loc : {m.localisation}
                    {m.delaiSouhaite ? ` · Échéance : ${m.delaiSouhaite}` : ""}
                  </div>
                  <div className="flex gap-2 mt-3 pl-4">
                    {pt && (
                      <button
                        onClick={() => guiderVers(`Livraison: ${pt.nom}`, pt.lat, pt.lon, `Fret ${m.ref}`)}
                        className="text-xs font-mono font-bold px-3 py-2 rounded-xl ring-1 ring-white/10 bg-white/5 text-slate-300 flex items-center gap-1 active:bg-white/10"
                      >
                        <Compass className="w-3.5 h-3.5" /> Itinéraire
                      </button>
                    )}
                    <button
                      onClick={() => avancerMission(m)}
                      className="flex-1 text-xs font-mono font-bold px-3 py-2 rounded-xl ring-1 ring-emerald-400/40 bg-emerald-400/10 text-emerald-300 active:bg-emerald-400/20"
                    >
                      {m.statut === "Attribuee" ? "Démarrer Mission" : "Clôturer la livraison"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="text-[10px] text-slate-600 font-mono text-center pt-2 leading-relaxed">
          Cycle de scrutation : 8s · Secours Prioritaire : Inter-Réseaux PMR333 / 112<br />
          L'application complète le réseau radio tactique
        </div>
      </main>
    </div>
  );
}