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
} from "lucide-react";

/* ---------------------------------------------------------------------
   APP VOLANTE -- BFMF 2026
   Vue terrain unifiee pour l'equipe volante :
   - Consigne d'engagement du QG (PRV choisi) avec guidage GPS
   - SOS participants geolocalises (guidage vers la victime ou le PRV)
   - Alertes equipes (logistique + balade) et saturation des etapes
   - Missions logistiques attribuees a la volante, avec guidage
   Lecture/ecriture via Supabase (memes cles que les autres apps).
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

/* -------------------- Points de reference geolocalises -------------------- */
// Coordonnees issues du dossier de securite / trace GPX

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

// Zone logistique (nom de zone du form) -> point de guidage
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
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
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
  const [sbError, setSbError] = useState(false);
  const [now, setNow] = useState(new Date());
  const [maPos, setMaPos] = useState(null);
  const [cible, setCible] = useState(null); // {nom, lat, lon, contexte}
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
        const [mi, gr, aLog, aBal, sp, co] = await Promise.all([
          kvGet(KEY_MISSIONS),
          kvGet(KEY_GROUPES),
          kvGet(KEY_ALERTE_LOG),
          kvGet(KEY_ALERTE_BAL),
          kvGet(KEY_SOS_PART),
          kvGet(KEY_CONSIGNE),
        ]);
        if (stop) return;
        setMissions(Array.isArray(mi) ? mi : []);
        setGroupes(Array.isArray(gr) ? gr : []);
        setSosPart(Array.isArray(sp) ? sp : []);
        setConsigne(co && co.active ? co : null);
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

  // Missions attribuees a la volante, non resolues
  const mesMissions = missions.filter(
    (m) => (m.attribueA || "").toLowerCase().includes("volante") && m.statut !== "Resolue"
  );

  // SOS participants actifs (nouveaux + pris en compte, non clos)
  const sosActifs = sosPart.filter((s) => s.statut !== "clos").slice(0, 5);

  // Saturation etapes
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

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
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

        {/* SOS participants */}
        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
            <TriangleAlert className={`w-4 h-4 ${sosActifs.some((s) => s.statut === "nouveau") ? "text-red-300 pulse-slow" : "text-slate-500"}`} />
            SOS PARTICIPANTS
            <span className="text-[11px] font-mono text-slate-500 font-normal">{sosActifs.length} actif(s)</span>
          </h2>
          <div className="space-y-2">
            {sosActifs.length === 0 && <div className="text-xs text-slate-500 text-center py-2">Aucun SOS actif.</div>}
            {sosActifs.map((s) => {
              const prv = s.gps ? nearestPRV(s.gps.lat, s.gps.lon) : null;
              return (
                <div
                  key={s.id}
                  className={`rounded-md px-3 py-2.5 ring-1 ${s.statut === "nouveau" ? "ring-red-400/40 bg-red-400/10" : "ring-white/10 bg-white/[0.03]"}`}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-[11px] text-slate-400">{s.heure}</span>
                    <span className="text-slate-100 font-medium flex-1 min-w-0 truncate">{s.motif}</span>
                    {s.tel && (
                      <a href={`tel:${s.tel}`} className="text-emerald-300 shrink-0">
                        <PhoneCall className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {s.surTrace && (
                    <div className="text-xs text-slate-300 mt-0.5">
                      km {s.surTrace.km} · {s.surTrace.segment}
                      {s.surTrace.ecartMetres > 100 && <span className="text-amber-300"> · ~{s.surTrace.ecartMetres} m hors sentier</span>}
                    </div>
                  )}
                  {s.details && <div className="text-[11px] text-slate-400 italic mt-0.5">"{s.details}"</div>}
                  <div className="flex gap-2 mt-2">
                    {s.gps && (
                      <button
                        onClick={() => guiderVers(`Victime (${s.motif})`, s.gps.lat, s.gps.lon, s.nom)}
                        className="flex-1 text-[11px] font-mono px-2 py-2 rounded ring-1 ring-red-400/40 bg-red-400/10 text-red-200 flex items-center justify-center gap-1"
                      >
                        <Compass className="w-3.5 h-3.5" /> Vers la victime
                      </button>
                    )}
                    {prv && (
                      <button
                        onClick={() => guiderVers(prv.nom, prv.lat, prv.lon, `PRV le plus proche de la victime (${fmtDist(prv.d)})`)}
                        className="flex-1 text-[11px] font-mono px-2 py-2 rounded ring-1 ring-white/20 text-slate-300 flex items-center justify-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" /> {prv.nom}
                      </button>
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
