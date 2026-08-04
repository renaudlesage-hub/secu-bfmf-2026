import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { MapPin, Plus, X, RefreshCw, Layers, Navigation, TriangleAlert } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";
import { TRACE, PRV, POINTS_GPS, SECTEURS_PARCOURS } from "./referentiels";

/* ---------------------------------------------------------------------
   MAP OPS — Cartographie tactique BFMF 2026
   Adapté à l'architecture app_store (clé/valeur JSON + polling), comme le
   reste de la plateforme : PAS de client supabase, PAS de table SQL, PAS
   de Realtime. Les incidents sont stockés dans une clé app_store unique
   et scrutés toutes les 8 s.

   Deux fonds de carte :
     • SVG (par défaut) : le parcours (trace GPX) dessiné + PRV + étapes.
       Zéro dépendance, fonctionne hors-ligne. Clic = placer un incident.
     • Leaflet (optionnel) : carte routière OpenStreetMap, chargée seulement
       si le paquet `leaflet` est installé (import dynamique). Sinon on
       reste en SVG sans planter.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const KEY_CARTE = "bfmf2026-incidents-carte";
const KEY_SOS = "bfmf2026-sos-participants";

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
// Anti-collision : relit la liste fraîche avant d'écrire (comme les autres apps).
async function kvMerge(key, mutateur) {
  const actuel = await kvGet(key);
  const liste = Array.isArray(actuel) ? actuel : [];
  const fusion = mutateur(liste);
  return (await kvSet(key, fusion)) ? fusion : null;
}

// Catégories = mêmes couleurs que le dashboard (sécurité / sanitaire / logistique).
const CATEGORIES = {
  securite: { label: "Sécurité", dot: "#f87171", ring: "ring-red-400/40", bg: "bg-red-400/10", text: "text-red-300" },
  sanitaire: { label: "Sanitaire", dot: "#22d3ee", ring: "ring-cyan-400/40", bg: "bg-cyan-400/10", text: "text-cyan-300" },
  logistique: { label: "Logistique", dot: "#fbbf24", ring: "ring-amber-400/40", bg: "bg-amber-400/10", text: "text-amber-300" },
};

/* ---- Projection GPS -> coordonnées SVG -----------------------------
   On calcule la boîte englobante de la trace, avec une marge, puis on
   projette chaque (lat, lon) dans un viewBox fixe. lat croît vers le
   nord donc on inverse l'axe Y. */
const VB_W = 1000, VB_H = 700, PAD = 40;
const lats = TRACE.map((p) => p[0]);
const lons = TRACE.map((p) => p[1]);
const BBOX = {
  minLat: Math.min(...lats), maxLat: Math.max(...lats),
  minLon: Math.min(...lons), maxLon: Math.max(...lons),
};
function projeter(lat, lon) {
  const x = PAD + ((lon - BBOX.minLon) / (BBOX.maxLon - BBOX.minLon || 1)) * (VB_W - 2 * PAD);
  const y = PAD + ((BBOX.maxLat - lat) / (BBOX.maxLat - BBOX.minLat || 1)) * (VB_H - 2 * PAD);
  return [x, y];
}
// Inverse : d'un point SVG cliqué -> (lat, lon) approché.
function deprojeter(x, y) {
  const lon = BBOX.minLon + ((x - PAD) / (VB_W - 2 * PAD)) * (BBOX.maxLon - BBOX.minLon || 1);
  const lat = BBOX.maxLat - ((y - PAD) / (VB_H - 2 * PAD)) * (BBOX.maxLat - BBOX.minLat || 1);
  return [lat, lon];
}

// Points d'intérêt fixes (étapes + PRV) à afficher sur le fond.
function parseGps(s) {
  const m = (s || "").match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}
const REPERES_CARTE = [
  ...["Etape 1", "Etape 2", "Etape 3", "Point 0"].map((nom) => {
    const p = POINTS_GPS[nom];
    return p ? { nom, lat: p.lat, lon: p.lon, type: "etape" } : null;
  }).filter(Boolean),
  ...PRV.map((prv) => {
    const c = parseGps(prv.gps);
    return c ? { nom: prv.nom.split(" — ")[0], lat: c[0], lon: c[1], type: "prv" } : null;
  }),
];

export default function Cartographie({ lectureSeule = false, embarque = false }) {
  const [incidents, setIncidents] = useState([]);
  const [sosGeo, setSosGeo] = useState([]); // SOS participants géolocalisés (lecture seule)
  const [syncError, setSyncError] = useState(false);
  const [modal, setModal] = useState(null); // { lat, lon } quand on place un incident
  const [form, setForm] = useState({ titre: "", categorie: "securite", description: "" });
  const [detail, setDetail] = useState(null); // incident affiché en détail
  const [detailSos, setDetailSos] = useState(null); // SOS affiché en détail (lecture seule)
  const [fond, setFond] = useState("svg"); // "svg" | "leaflet"
  const [leafletDispo, setLeafletDispo] = useState(false);

  const cacheRef = useRef(null);

  // Détecte si Leaflet est installé (import dynamique, sans planter sinon).
  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        await import("leaflet");
        await import("react-leaflet");
        if (vivant) setLeafletDispo(true);
      } catch {
        if (vivant) setLeafletDispo(false); // paquet absent : on reste en SVG
      }
    })();
    return () => { vivant = false; };
  }, []);

  const sosCacheRef = useRef(null);

  // Scrutation polling (8 s), cohérente avec le reste de la plateforme.
  // Lit deux clés : les incidents manuels (KEY_CARTE) ET les SOS participants
  // géolocalisés (KEY_SOS, en lecture seule — gérés depuis volante/dashboard).
  const pull = useCallback(async () => {
    try {
      const [dataInc, dataSos] = await Promise.all([kvGet(KEY_CARTE), kvGet(KEY_SOS)]);

      const liste = Array.isArray(dataInc) ? dataInc : [];
      const sig = JSON.stringify(liste);
      if (sig !== cacheRef.current) {
        cacheRef.current = sig;
        setIncidents(liste);
      }

      // SOS : on ne garde que les actifs AVEC coordonnées GPS (les autres ne
      // peuvent pas être placés sur la carte).
      const sosListe = (Array.isArray(dataSos) ? dataSos : [])
        .filter((s) => {
          const st = (s.statut || "").toLowerCase();
          const actif = st !== "cloture" && st !== "clôture" && st !== "cloturé" && st !== "clos" && st !== "resolu" && st !== "résolu";
          return actif && s.gps && typeof s.gps.lat === "number" && typeof s.gps.lon === "number";
        });
      const sigSos = JSON.stringify(sosListe);
      if (sigSos !== sosCacheRef.current) {
        sosCacheRef.current = sigSos;
        setSosGeo(sosListe);
      }

      setSyncError(false);
    } catch {
      setSyncError(true);
    }
  }, []);

  useEffect(() => {
    pull();
    const t = setInterval(pull, 8000);
    return () => clearInterval(t);
  }, [pull]);

  function nowHM() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  async function creerIncident() {
    if (!form.titre.trim() || !modal) return;
    const incident = {
      id: "inc-" + Date.now(),
      titre: form.titre.trim(),
      categorie: form.categorie,
      description: form.description.trim(),
      lat: modal.lat,
      lon: modal.lon,
      heure: nowHM(),
      creeLe: new Date().toISOString(),
    };
    const fusion = await kvMerge(KEY_CARTE, (liste) => [incident, ...liste]);
    if (fusion) {
      setIncidents(fusion);
      cacheRef.current = JSON.stringify(fusion);
      setModal(null);
      setForm({ titre: "", categorie: "securite", description: "" });
    } else {
      setSyncError(true);
    }
  }

  async function supprimerIncident(id) {
    const fusion = await kvMerge(KEY_CARTE, (liste) => liste.filter((i) => i.id !== id));
    if (fusion) {
      setIncidents(fusion);
      cacheRef.current = JSON.stringify(fusion);
      setDetail(null);
    } else {
      setSyncError(true);
    }
  }

  // Clic sur le fond SVG -> ouvre la modale de saisie au point projeté.
  function onSvgClick(e) {
    if (lectureSeule) return; // autorités : consultation seule, pas de création
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    const [lat, lon] = deprojeter(loc.x, loc.y);
    setModal({ lat, lon });
  }

  const traceD = TRACE.map((p, i) => {
    const [x, y] = projeter(p[0], p[1]);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className={embarque ? "text-slate-100 font-sans" : "min-h-screen bg-[#0d1117] text-slate-100 font-sans"}>
      {/* En-tête */}
      <header className={embarque ? "border-b border-white/10 mb-3" : "border-b border-white/10 bg-[#151b23]/90 backdrop-blur sticky top-0 z-20"}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-emerald-400/10 ring-1 ring-emerald-400/30 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <div className="font-display tracking-wide text-[15px] leading-none">MAP OPS — Cartographie tactique</div>
              <div className="text-[11px] text-slate-400 font-mono mt-1">
                {incidents.length} incident{incidents.length > 1 ? "s" : ""}
                {sosGeo.length > 0 && <span className="text-red-300"> · {sosGeo.length} SOS géolocalisé{sosGeo.length > 1 ? "s" : ""}</span>}
                {lectureSeule ? " · consultation (lecture seule)" : " · cliquez sur la carte pour placer un incident"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {syncError && (
              <span className="flex items-center gap-1 text-[11px] text-amber-300 font-mono">
                <TriangleAlert className="w-3.5 h-3.5" /> sync
              </span>
            )}
            {/* Bascule de fond de carte */}
            <div className="flex rounded-lg ring-1 ring-white/10 overflow-hidden text-[11px] font-mono">
              <button
                onClick={() => setFond("svg")}
                className={`px-2.5 py-1.5 ${fond === "svg" ? "bg-emerald-400/15 text-emerald-200" : "text-slate-400 hover:text-slate-200"}`}
              >
                Parcours
              </button>
              <button
                onClick={() => leafletDispo && setFond("leaflet")}
                disabled={!leafletDispo}
                title={leafletDispo ? "Carte OpenStreetMap" : "Installez le paquet leaflet pour l'activer"}
                className={`px-2.5 py-1.5 flex items-center gap-1 ${fond === "leaflet" ? "bg-emerald-400/15 text-emerald-200" : "text-slate-400 hover:text-slate-200"} ${!leafletDispo ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <Layers className="w-3.5 h-3.5" /> Carte
              </button>
            </div>
            <button onClick={pull} className="p-1.5 rounded-lg ring-1 ring-white/10 text-slate-400 hover:text-slate-200" title="Rafraîchir">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
        {/* Carte */}
        <div className="rounded-xl ring-1 ring-white/10 bg-[#131a22] overflow-hidden">
          {fond === "leaflet" && leafletDispo ? (
            <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Chargement de la carte…</div>}>
              <LeafletMap incidents={incidents} sosGeo={sosGeo} onPlace={lectureSeule ? () => {} : (lat, lon) => setModal({ lat, lon })} onSelect={setDetail} onSelectSos={setDetailSos} />
            </Suspense>
          ) : (
            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              className={`w-full h-auto select-none ${lectureSeule ? "" : "cursor-crosshair"}`}
              onClick={onSvgClick}
            >
              {/* fond quadrillé léger */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M50 0 L0 0 0 50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width={VB_W} height={VB_H} fill="url(#grid)" />

              {/* le parcours */}
              <path d={traceD} fill="none" stroke="rgba(52,211,153,0.5)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

              {/* repères fixes (étapes + PRV) */}
              {REPERES_CARTE.map((r, i) => {
                const [x, y] = projeter(r.lat, r.lon);
                const estEtape = r.type === "etape";
                return (
                  <g key={i} pointerEvents="none">
                    <circle cx={x} cy={y} r={estEtape ? 6 : 4} fill={estEtape ? "#34d399" : "#64748b"} opacity="0.9" />
                    <text x={x + 9} y={y + 4} fontSize="12" fill={estEtape ? "#6ee7b7" : "#94a3b8"} fontFamily="monospace">
                      {r.nom}
                    </text>
                  </g>
                );
              })}

              {/* incidents */}
              {incidents.map((inc) => {
                if (typeof inc.lat !== "number" || typeof inc.lon !== "number") return null;
                const [x, y] = projeter(inc.lat, inc.lon);
                const cat = CATEGORIES[inc.categorie] || CATEGORIES.securite;
                return (
                  <g key={inc.id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setDetail(inc); }}>
                    <circle cx={x} cy={y} r="11" fill={cat.dot} opacity="0.25">
                      <animate attributeName="r" values="11;16;11" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={x} cy={y} r="7" fill={cat.dot} stroke="#0d1117" strokeWidth="2" />
                  </g>
                );
              })}

              {/* SOS participants géolocalisés (losange rouge pulsant, lecture seule) */}
              {sosGeo.map((sos) => {
                const [x, y] = projeter(sos.gps.lat, sos.gps.lon);
                const nouveau = (sos.statut || "").toLowerCase() === "nouveau";
                return (
                  <g key={sos.id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setDetailSos(sos); }}>
                    <circle cx={x} cy={y} r="13" fill="#ef4444" opacity="0.3">
                      <animate attributeName="r" values="13;19;13" dur="1.2s" repeatCount="indefinite" />
                    </circle>
                    {/* losange = SOS, pour distinguer des incidents (cercles) */}
                    <rect
                      x={x - 7} y={y - 7} width="14" height="14"
                      transform={`rotate(45 ${x} ${y})`}
                      fill="#ef4444" stroke={nouveau ? "#fca5a5" : "#0d1117"} strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Panneau latéral : SOS géolocalisés + incidents */}
        <div className="space-y-2">
          {sosGeo.length > 0 && (
            <>
              <div className="text-[11px] font-mono uppercase tracking-wider text-red-300 px-1 flex items-center gap-1.5">
                <TriangleAlert className="w-3.5 h-3.5" /> SOS géolocalisés
              </div>
              {sosGeo.map((sos) => {
                const nouveau = (sos.statut || "").toLowerCase() === "nouveau";
                return (
                  <button
                    key={sos.id}
                    onClick={() => setDetailSos(sos)}
                    className="w-full text-left rounded-lg ring-1 ring-red-400/40 bg-red-400/10 px-3 py-2.5 flex items-start gap-2.5"
                  >
                    <span className={`w-2.5 h-2.5 rounded-sm shrink-0 mt-1 bg-red-400 ${nouveau ? "animate-pulse" : ""}`} style={{ transform: "rotate(45deg)" }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-100 font-medium truncate">{sos.motif || "SOS"}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        <span className="text-red-300">{nouveau ? "NOUVEAU" : (sos.statut || "").toUpperCase()}</span>
                        {sos.surTrace ? ` · km ${sos.surTrace.km}` : ""} · {sos.heure}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 px-1 pt-1">Incidents placés</div>
          {incidents.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-8 border border-dashed border-white/5 rounded-xl">
              Aucun incident placé.<br />Cliquez sur la carte pour commencer.
            </div>
          )}
          {incidents.map((inc) => {
            const cat = CATEGORIES[inc.categorie] || CATEGORIES.securite;
            return (
              <button
                key={inc.id}
                onClick={() => setDetail(inc)}
                className={`w-full text-left rounded-lg ring-1 ${cat.ring} ${cat.bg} px-3 py-2.5 flex items-start gap-2.5`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: cat.dot }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-100 font-medium truncate">{inc.titre}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    <span className={cat.text}>{cat.label}</span> · {inc.heure}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Modale de création d'incident */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-[#151b23] rounded-xl ring-1 ring-white/15 w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display tracking-wide text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-300" /> Nouvel incident
              </h2>
              <button onClick={() => setModal(null)} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
            </div>

            <div className="text-[11px] font-mono text-slate-500 bg-black/20 rounded px-2.5 py-1.5">
              Position : {modal.lat.toFixed(5)}, {modal.lon.toFixed(5)}
              <a
                href={`https://www.google.com/maps?q=${modal.lat},${modal.lon}`}
                target="_blank" rel="noreferrer"
                className="ml-2 text-emerald-300 inline-flex items-center gap-0.5"
              >
                <Navigation className="w-3 h-3" /> vérifier
              </a>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">Titre *</label>
              <input
                autoFocus
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
                placeholder="Ex : Malaise public, barrière endommagée…"
                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">Catégorie</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(CATEGORIES).map(([id, c]) => (
                  <button
                    key={id}
                    onClick={() => setForm({ ...form, categorie: id })}
                    className={`py-2 rounded-lg text-xs font-mono ring-1 transition-colors ${
                      form.categorie === id ? `${c.ring} ${c.bg} ${c.text}` : "ring-white/10 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Détails de la situation…"
                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-slate-600 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 ring-1 ring-white/10 hover:text-slate-200">Annuler</button>
              <button
                onClick={creerIncident}
                disabled={!form.titre.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/50 disabled:opacity-40"
              >
                Placer l'incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Détail d'un incident */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-[#151b23] rounded-xl ring-1 ring-white/15 w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const cat = CATEGORIES[detail.categorie] || CATEGORIES.securite;
              return (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.dot }} />
                      <h2 className="font-display tracking-wide text-slate-100 truncate">{detail.titre}</h2>
                    </div>
                    <button onClick={() => setDetail(null)} className="text-slate-500 hover:text-slate-300 shrink-0"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className={`px-1.5 py-0.5 rounded ${cat.bg} ${cat.text}`}>{cat.label}</span>
                    <span className="text-slate-500">signalé à {detail.heure}</span>
                  </div>
                  {detail.description && (
                    <p className="text-sm text-slate-300 bg-black/20 rounded p-3 leading-snug">{detail.description}</p>
                  )}
                  <div className="text-[11px] font-mono text-slate-500">
                    {typeof detail.lat === "number" ? `${detail.lat.toFixed(5)}, ${detail.lon.toFixed(5)}` : "position inconnue"}
                    {typeof detail.lat === "number" && (
                      <a href={`https://www.google.com/maps?q=${detail.lat},${detail.lon}`} target="_blank" rel="noreferrer" className="ml-2 text-emerald-300 inline-flex items-center gap-0.5">
                        <Navigation className="w-3 h-3" /> guidage
                      </a>
                    )}
                  </div>
                  {!lectureSeule && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => supprimerIncident(detail.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono text-red-300 ring-1 ring-red-400/30 bg-red-400/10 hover:bg-red-400/20"
                      >
                        Clôturer / supprimer
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Détail d'un SOS participant (lecture seule — géré via volante/dashboard) */}
      {detailSos && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setDetailSos(null)}>
          <div className="bg-[#151b23] rounded-xl ring-1 ring-red-400/30 w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <TriangleAlert className="w-5 h-5 text-red-400 shrink-0" />
                <h2 className="font-display tracking-wide text-slate-100 truncate">SOS — {detailSos.motif || "participant"}</h2>
              </div>
              <button onClick={() => setDetailSos(null)} className="text-slate-500 hover:text-slate-300 shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-red-400/10 text-red-300 uppercase">{detailSos.statut || "nouveau"}</span>
              <span className="text-slate-500">reçu à {detailSos.heure}</span>
            </div>
            {detailSos.nom && detailSos.nom !== "Anonyme" && (
              <div className="text-sm text-slate-300">
                {detailSos.nom}{detailSos.tel ? ` · ${detailSos.tel}` : ""}
              </div>
            )}
            {detailSos.details && (
              <p className="text-sm text-slate-300 bg-black/20 rounded p-3 leading-snug">{detailSos.details}</p>
            )}
            {detailSos.surTrace && (
              <div className="text-[11px] font-mono text-slate-400 bg-black/20 rounded px-2.5 py-1.5">
                Position : km {detailSos.surTrace.km} · {detailSos.surTrace.segment}
                {detailSos.surTrace.ecartMetres != null ? ` · écart ${detailSos.surTrace.ecartMetres} m` : ""}
              </div>
            )}
            <div className="text-[11px] font-mono text-slate-500">
              {detailSos.gps.lat.toFixed(5)}, {detailSos.gps.lon.toFixed(5)}
              {detailSos.gps.precision != null ? ` (±${detailSos.gps.precision} m)` : ""}
              <a href={`https://www.google.com/maps?q=${detailSos.gps.lat},${detailSos.gps.lon}`} target="_blank" rel="noreferrer" className="ml-2 text-emerald-300 inline-flex items-center gap-0.5">
                <Navigation className="w-3 h-3" /> guidage
              </a>
            </div>
            <div className="text-[10px] text-slate-600 pt-1 border-t border-white/5">
              Ce SOS se gère depuis l'app volante ou le tableau de bord (prise en charge, clôture). La carte l'affiche en lecture seule.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------
   FOND LEAFLET (optionnel) — rendu uniquement si le paquet est installé.
   On utilise React.lazy via un composant interne pour éviter que l'import
   statique casse le build quand leaflet est absent. Ici on charge à la
   volée avec require dynamique encapsulé dans un composant lazy.
--------------------------------------------------------------------- */
const LeafletMap = React.lazy(() => import("./cartographie-leaflet").catch(() => ({ default: FondIndispo })));

function FondIndispo() {
  return (
    <div className="p-8 text-center text-sm text-slate-500">
      Carte OpenStreetMap indisponible.<br />
      Installez le paquet <code className="text-slate-300">leaflet react-leaflet</code> pour l'activer.
    </div>
  );
}