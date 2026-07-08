import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  TriangleAlert,
  Radio,
  Clock,
  CircleDot,
  CloudLightning,
  Wind,
  Thermometer,
  Rss,
  Smile,
  Meh,
  Frown,
  Footprints,
  ClipboardList,
  PhoneCall,
  ExternalLink,
} from "lucide-react";

/* ---------------------------------------------------------------------
   DASHBOARD QG (version allegée) -- Bucolique Ferrières Musique Festival 2026
   Vue de synthèse : alertes SOS, logistique et balade en direct (Supabase),
   vigilance météo IRM cliquable, veille médias compacte, plan radio.
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

const KEY_MISSIONS = "bfmf2026-missions-logistique";
const KEY_GROUPES = "bfmf2026-suivi-balade";
const KEY_ALERTE_LOG = "bfmf2026-logistique-alerte";
const KEY_ALERTE_BAL = "bfmf2026-suivi-balade-alerte";
const KEY_SOS_PART = "bfmf2026-sos-participants";
const KEY_CONSIGNE = "bfmf2026-volante-consigne";
const KEY_METEO = "bfmf2026-meteo";

const PRVS = ["Point 0", "PRV#4", "PRV#5", "PRV#6", "PRV#7", "Etape 1", "Etape 2", "Etape 3"];

async function kvSet(key, value) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_store`, {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  return r.ok;
}

const CAPACITE_ETAPE = 300;

const METEO_FALLBACK = {
  province: "Liege",
  codeActuel: "jaune",
  phenomenes: ["orages", "vent"],
  maj: "il y a 12 min",
  timeline: [
    { creneau: "Dans les 2 prochaines heures (+2h)", code: "vert", phenomene: "RAS" },
    { creneau: "Dans les 4 prochaines heures (+4h)", code: "jaune", phenomene: "orages" },
    { creneau: "Dans les 8 prochaines heures (+8h)", code: "jaune", phenomene: "vent" },
    { creneau: "Dans les 12 prochaines heures (+12h)", code: "vert", phenomene: "RAS" },
  ],
};

const SEUILS_IRM = {
  jaune: "Veille renforcée, briefing météo QG.",
  orange: "Sécuriser structures légères, préparer évacuation.",
  rouge: "Suspension départs balade, évacuation selon zones.",
};

const MEDIA = { mentions24h: 486, variation: 14, sentiment: { positif: 68, neutre: 24, negatif: 8 } };

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

const PHENOMENE_ICON = { orages: CloudLightning, vent: Wind, chaleur: Thermometer, RAS: CircleDot };

function pad(n) {
  return n.toString().padStart(2, "0");
}

export default function DashboardQG() {
  const [now, setNow] = useState(new Date());
  const [missionsLog, setMissionsLog] = useState([]);
  const [groupesBalade, setGroupesBalade] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [sosParticipants, setSosParticipants] = useState([]);
  const [consigne, setConsigne] = useState(null);
  const [meteoLive, setMeteoLive] = useState(null);
  const [prvChoisi, setPrvChoisi] = useState(PRVS[0]);
  const [msgConsigne, setMsgConsigne] = useState("");
  const [sbError, setSbError] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let stop = false;
    async function pull() {
      try {
        const [mi, gr, aLog, aBal, sosP, co, mto] = await Promise.all([
          kvGet(KEY_MISSIONS),
          kvGet(KEY_GROUPES),
          kvGet(KEY_ALERTE_LOG),
          kvGet(KEY_ALERTE_BAL),
          kvGet(KEY_SOS_PART),
          kvGet(KEY_CONSIGNE),
          kvGet(KEY_METEO),
        ]);
        if (stop) return;
        setMissionsLog(Array.isArray(mi) ? mi : []);
        setGroupesBalade(Array.isArray(gr) ? gr : []);
        setSosParticipants(Array.isArray(sosP) ? sosP : []);
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
    const t = setInterval(pull, 10000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  async function prendreEnCompteSos(id) {
    const next = sosParticipants.map((s) =>
      s.id === id ? { ...s, statut: "pris en compte", heurePriseEnCompte: `${pad(now.getHours())}:${pad(now.getMinutes())}` } : s
    );
    setSosParticipants(next);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/app_store`, {
        method: "POST",
        headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ key: KEY_SOS_PART, value: next, updated_at: new Date().toISOString() }),
      });
    } catch (e) {
      setSbError(true);
    }
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
    const ok = await kvSet(KEY_CONSIGNE, c);
    if (!ok) setSbError(true);
  }

  async function leverConsigne() {
    if (!consigne) return;
    const c = { ...consigne, active: false, heureLevee: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
    setConsigne(null);
    await kvSet(KEY_CONSIGNE, c);
  }

  const METEO = meteoLive || METEO_FALLBACK;

  const logOuvertes = missionsLog.filter((m) => m.statut !== "Resolue");
  const logBloquantes = logOuvertes.filter((m) => m.bloquant === "Oui" || (m.priorite || "").startsWith("P1"));
  const grpDehors = groupesBalade.filter((g) => g.position !== "p0" && g.position !== "ret");
  const persDehors = grpDehors.reduce((s, g) => s + (Number(g.participants) || 0), 0);
  const parEtape = { e1: 0, e2: 0, e3: 0 };
  groupesBalade.forEach((g) => {
    if (parEtape[g.position] !== undefined) parEtape[g.position] += Number(g.participants) || 0;
  });
  const etapeSaturee = Object.values(parEtape).some((n) => n / CAPACITE_ETAPE >= 0.9);
  const sosPartNouveaux = sosParticipants.filter((s) => s.statut === "nouveau");
  const sosActif = alertes.length > 0 || sosPartNouveaux.length > 0;
  const meteoGrave = METEO.codeActuel === "orange" || METEO.codeActuel === "rouge";

  const niveau =
    sosActif || logBloquantes.length > 0 || METEO.codeActuel === "rouge"
      ? "critique"
      : etapeSaturee || meteoGrave || METEO.codeActuel === "jaune"
      ? "modere"
      : "mineur";
  const niveauLabel = { mineur: "NORMAL", modere: "VIGILANCE", critique: "ALERTE" }[niveau];

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="font-display tracking-wide text-[15px] leading-none truncate">QG BUCO — SYNTHESE</div>
              <div className="text-[11px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · FERRIERES</div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full ring-1 font-mono text-xs tracking-wider ${
                niveau === "critique"
                  ? "bg-red-400/10 ring-red-400/40 text-red-300"
                  : niveau === "modere"
                  ? "bg-amber-400/10 ring-amber-400/40 text-amber-300"
                  : "bg-emerald-400/10 ring-emerald-400/30 text-emerald-300"
              }`}
            >
              <CircleDot className={`w-3 h-3 ${niveau === "critique" ? "pulse-slow" : ""}`} />
              {niveauLabel}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />
              {pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {sbError && (
          <div className="rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 text-xs px-3 py-2">
            Connexion Supabase indisponible — données Logistique / Balade potentiellement obsolètes.
          </div>
        )}

        {/* Alertes SOS */}
        {alertes.map((a, i) => (
          <div key={i} className="rounded-lg ring-2 ring-red-400/60 bg-red-500/15 p-4">
            <div className="flex items-start gap-3">
              <TriangleAlert className="w-5 h-5 text-red-300 pulse-slow shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-display text-red-200 text-sm tracking-wide">
                  SOS {a.source.toUpperCase()} — {a.motif}
                </div>
                <div className="text-xs text-red-200/80 mt-1">
                  {a.heure} · {a.auteur}
                  {a.groupe ? ` · ${a.groupe}` : ""}
                  {a.details ? ` — ${a.details}` : ""}
                </div>
                <div className="text-[11px] font-mono text-red-200/60 mt-1">
                  {a.acquittePar ? `Acquittée par ${a.acquittePar} à ${a.heureAcquittement}` : `NON ACQUITTEE — traiter dans l'app ${a.source}`}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* SOS participants */}
        {sosParticipants.length > 0 && (
          <section className={`bg-[#151b23] rounded-lg p-4 ${sosPartNouveaux.length > 0 ? "ring-2 ring-red-400/60" : "ring-1 ring-white/10"}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2">
                <TriangleAlert className={`w-4 h-4 ${sosPartNouveaux.length > 0 ? "text-red-300 pulse-slow" : "text-slate-500"}`} />
                SOS PARTICIPANTS
              </h2>
              <span className={`font-mono text-xs ${sosPartNouveaux.length > 0 ? "text-red-300" : "text-slate-500"}`}>
                {sosPartNouveaux.length} nouveau(x) · {sosParticipants.length} au total
              </span>
            </div>
            <div className="space-y-2">
              {sosParticipants.slice(0, 6).map((s) => (
                <div
                  key={s.id}
                  className={`rounded-md px-3 py-2.5 ring-1 ${
                    s.statut === "nouveau" ? "ring-red-400/40 bg-red-400/10" : "ring-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-slate-400">{s.heure}</span>
                    <span className="text-sm text-slate-100 font-medium">{s.motif}</span>
                    <span className="text-[11px] text-slate-400">— {s.nom}{s.tel ? ` · ${s.tel}` : ""}</span>
                    <span className="flex-1" />
                    {s.statut === "nouveau" ? (
                      <button
                        onClick={() => prendreEnCompteSos(s.id)}
                        className="text-[11px] font-mono px-2.5 py-1 rounded ring-1 ring-red-300/50 text-red-200 hover:bg-red-400/20 transition-colors"
                      >
                        Prendre en compte
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-500">pris en compte{s.heurePriseEnCompte ? ` à ${s.heurePriseEnCompte}` : ""}</span>
                    )}
                  </div>
                  {s.surTrace && (
                    <div className="text-xs text-slate-300 mt-1">
                      <span className="font-mono text-amber-200">km {s.surTrace.km}</span> · {s.surTrace.segment}
                      {s.surTrace.ecartMetres > 100 && (
                        <span className="text-amber-300"> · ~{s.surTrace.ecartMetres} m hors sentier</span>
                      )}
                      <span className="text-slate-500"> · repère : {s.surTrace.reperePlusProche}</span>
                    </div>
                  )}
                  {!s.surTrace && <div className="text-[11px] text-amber-300/90 mt-1">Sans GPS — voir description</div>}
                  {s.details && <div className="text-[11px] text-slate-400 mt-0.5 italic">"{s.details}"</div>}
                  {s.gps && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${s.gps.lat},${s.gps.lon}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-mono text-sky-300 hover:text-sky-200 mt-0.5 inline-block"
                    >
                      Ouvrir dans Google Maps ({s.gps.lat.toFixed(5)}, {s.gps.lon.toFixed(5)})
                    </a>
                  )}
                </div>
              ))}
              {sosParticipants.length > 6 && (
                <div className="text-[10px] font-mono text-slate-600 text-center">+ {sosParticipants.length - 6} plus ancien(s)</div>
              )}
            </div>
          </section>
        )}

        {/* Engagement volante */}
        <section className={`bg-[#151b23] rounded-lg p-4 ${consigne ? "ring-2 ring-amber-400/50" : "ring-1 ring-white/10"}`}>
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
            <Footprints className="w-4 h-4 text-slate-500" /> ENGAGEMENT VOLANTE
          </h2>
          {consigne ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-amber-200">
                  Engagée vers <span className="font-semibold">{consigne.prv}</span>
                  {consigne.message ? ` — ${consigne.message}` : ""}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  Émise à {consigne.heure} ·{" "}
                  {consigne.accusePar ? (
                    <span className="text-emerald-300">accusée "bien reçu" à {consigne.heureAccuse}</span>
                  ) : (
                    <span className="text-amber-300 pulse-slow">en attente d'accusé</span>
                  )}
                </div>
              </div>
              <button
                onClick={leverConsigne}
                className="shrink-0 text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-white/25 text-slate-300 hover:text-white hover:ring-white/40"
              >
                Lever
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="bg-[#232b36] ring-1 ring-white/25 rounded px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                value={prvChoisi}
                onChange={(e) => setPrvChoisi(e.target.value)}
              >
                {PRVS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                className="flex-1 min-w-[140px] bg-[#232b36] ring-1 ring-white/25 rounded px-2.5 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                value={msgConsigne}
                onChange={(e) => setMsgConsigne(e.target.value)}
                placeholder="Message (ex: SOS km 2,5 -- malaise)"
              />
              <button
                onClick={engagerVolante}
                className="text-xs font-mono px-3 py-2 rounded ring-1 ring-amber-400/50 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 transition-colors"
              >
                Engager
              </button>
            </div>
          )}
          <div className="text-[10px] text-slate-600 font-mono mt-2">
            La consigne s'affiche dans l'app Volante avec guidage GPS vers le point choisi. Doubler à la radio (PMR4.1).
          </div>
        </section>

        {/* Logistique + Balade en direct */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-500" /> LOGISTIQUE
              </h2>
              <span className={`font-mono text-xs ${logBloquantes.length > 0 ? "text-red-300" : logOuvertes.length > 0 ? "text-amber-300" : "text-emerald-300"}`}>
                {logOuvertes.length} ouverte(s){logBloquantes.length > 0 ? ` · ${logBloquantes.length} bloquante(s)` : ""}
              </span>
            </div>
            <div className="space-y-1.5">
              {logOuvertes.slice(0, 4).map((m) => (
                <div key={m.id || m.ref} className="flex items-center gap-2 text-xs rounded bg-white/[0.03] ring-1 ring-white/10 px-2.5 py-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${(m.priorite || "").startsWith("P1") ? "bg-red-400" : (m.priorite || "").startsWith("P2") ? "bg-amber-400" : "bg-sky-400"}`} />
                  <span className="text-slate-200 flex-1 min-w-0 truncate">{m.nature}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">{m.attribueA || "—"}</span>
                </div>
              ))}
              {logOuvertes.length === 0 && <div className="text-xs text-slate-500 text-center py-3">Rien d'ouvert.</div>}
              {logOuvertes.length > 4 && (
                <div className="text-[10px] font-mono text-slate-600 text-center">+ {logOuvertes.length - 4} autre(s) dans l'app Logistique</div>
              )}
            </div>
          </section>

          <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2">
                <Footprints className="w-4 h-4 text-slate-500" /> BALADE
              </h2>
              <span className="font-mono text-xs text-amber-300">{persDehors} sur le parcours</span>
            </div>
            <div className="space-y-1.5">
              {["e1", "e2", "e3"].map((eid, idx) => {
                const n = parEtape[eid];
                const pct = Math.min(100, Math.round((n / CAPACITE_ETAPE) * 100));
                const cls = pct >= 90 ? "bg-red-400" : pct >= 72 ? "bg-amber-400" : "bg-emerald-400";
                return (
                  <div key={eid} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 w-14 shrink-0">Etape {idx + 1}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full ${cls}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 w-14 text-right shrink-0">{n}/{CAPACITE_ETAPE}</span>
                  </div>
                );
              })}
              <div className="text-[11px] text-slate-500 pt-1">
                {grpDehors.length} groupe(s) dehors · {groupesBalade.filter((g) => g.position === "ret").length} rentré(s)
              </div>
            </div>
          </section>
        </div>

        {/* Météo IRM cliquable */}
        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2">
              <CloudLightning className="w-4 h-4 text-slate-500" /> METEO IRM
            </h2>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ring-1 ${mc.ring} ${mc.bg} ${mc.text}`}>{mc.label}</span>
          </div>
          <div className="space-y-2">
            {METEO.timeline.map((t, i) => {
              const traduirePhenomene = (p) => {
                if (!p || p === "phenomene") return "Alerte Vigilance";
                const memo = String(p).toLowerCase();
                if (memo.includes("thunderstorm") || memo.includes("orage")) return "Orages violents";
                if (memo.includes("wind") || memo.includes("vent")) return "Vent violent / Rafales";
                if (memo.includes("rain") || memo.includes("pluie")) return "Pluie / Inondation";
                if (memo.includes("snow") || memo.includes("neige")) return "Neige / Verglas";
                if (memo.includes("heat") || memo.includes("chaleur")) return "Forte chaleur / Canicule";
                return p;
              };

              const Icon = PHENOMENE_ICON[t.phenomene] || CircleDot;
              const st = CODE_METEO[t.code] || CODE_METEO["vert"];

              const texteCreneau = String(t.creneau)
                .replace(/phenomene\s*·\s*/gi, "")
                .replace(/mer\.\s*/gi, "Mer. ")
                .replace(/jeu\.\s*/gi, "Jeu. ")
                .replace(/ven\.\s*/gi, "Ven. ")
                .replace(/sam\.\s*/gi, "Sam. ")
                .replace(/dim\.\s*/gi, "Dim. ");

              return (
                <a
                  key={i}
                  href="https://www.meteo.be/fr/meteo/avertissements/provincial"
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs rounded bg-white/[0.02] border border-white/5 p-2 hover:bg-white/[0.06] hover:border-white/20 transition-all group cursor-pointer"
                  title="Cliquez pour ouvrir le site officiel de l'IRM"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot} shrink-0`} />
                    <div className="min-w-0">
                      <span className="text-slate-100 font-medium flex items-center gap-1.5 group-hover:text-amber-300 transition-colors">
                        {traduirePhenomene(t.phenomene)}
                        <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                      <span className="text-slate-400 font-mono text-[11px] block mt-0.5">
                        {texteCreneau}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                    <span className={`font-mono text-[10px] uppercase ${st.text} bg-white/[0.02] px-1.5 py-0.5 rounded border border-white/5`}>
                      {st.label}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
          {METEO.codeActuel !== "vert" && (
            <div className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-white/10">{SEUILS_IRM[METEO.codeActuel]}</div>
          )}
          <div className="text-[10px] text-slate-600 font-mono mt-2">
            Prov. {METEO.province} · maj {METEO.maj} ·{" "}
            {meteoLive ? "Source : IRM via MeteoAlarm (CC BY 4.0)" : "SIMULE — Cliquez sur un bloc pour ouvrir les avertissements de l'IRM"}
          </div>
        </section>

        {/* Veille Médias */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
            <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
              <Rss className="w-4 h-4 text-slate-500" /> MEDIAS
            </h2>
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-white/10">
              <div className="bg-emerald-400 h-full" style={{ width: `${MEDIA.sentiment.positif}%` }} />
              <div className="bg-slate-500 h-full" style={{ width: `${MEDIA.sentiment.neutre}%` }} />
              <div className="bg-red-400 h-full" style={{ width: `${MEDIA.sentiment.negatif}%` }} />
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><Smile className="w-3 h-3 text-emerald-300" />{MEDIA.sentiment.positif}%</span>
              <span className="flex items-center gap-1"><Meh className="w-3 h-3 text-slate-400" />{MEDIA.sentiment.neutre}%</span>
              <span className="flex items-center gap-1"><Frown className="w-3 h-3 text-red-300" />{MEDIA.sentiment.negatif}%</span>
            </div>
            <div className="text-[10px] text-slate-600 font-mono mt-2">Simulé · à connecter à un outil de veille</div>
          </section>

          {/* Plan Radio */}
          <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
            <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-slate-500" /> PLAN RADIO
            </h2>
            <div className="grid grid-cols-1 gap-1.5">
              {CANAUX_RADIO.map((c) => (
                <div key={c.canal} className={`flex items-start gap-2 text-[11px] rounded px-2 py-1.5 ${c.canal === "PMR333" ? "bg-red-400/5 ring-1 ring-red-400/20" : "bg-white/[0.02]"}`}>
                  <span className={`font-mono shrink-0 w-14 ${c.canal === "PMR333" ? "text-red-300" : "text-amber-300"}`}>{c.canal}</span>
                  <span className="text-slate-400">{c.usage}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-3 flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
          <PhoneCall className="w-3.5 h-3.5" /> Urgence vitale : 112 en priorité, information immédiate QG (Canal PMR333).
        </section>

        <div className="text-[10px] text-slate-600 font-mono text-center pt-1">
          Synthèse en lecture seule · rafraîchissement auto 10 s · saisies dans les apps Logistique et Balade
        </div>
      </main>
    </div>
  );
}