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
} from "lucide-react";

/* ---------------------------------------------------------------------
   DASHBOARD QG (version allegée) -- Bucolique Ferrières Musique Festival 2026
   Vue de synthèse : alertes SOS, logistique et balade en direct (Supabase),
   vigilance météo IRM, veille médias compacte, plan radio.
   Les saisies se font dans les apps dédiées (Logistique / Balade) ;
   la main courante urgences reste dans le formulaire Google + Sheet.
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

/* ------------------------ Données de reference ------------------------ */

// Vigilance météo IRM -- province de Liège (simulée, axée sur les échéances tactiques)
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

// Veille médias compacte (simulée)
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

/* ------------------------------ App ------------------------------ */

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

  // Prise en compte d'un SOS participant
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

  // Agrégats
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

  const mc = CODE_METEO[METEO.codeActuel];

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
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