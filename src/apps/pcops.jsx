import React, { useState, useEffect } from "react";
import {
  Landmark,
  TriangleAlert,
  Clock,
  Footprints,
  MapPin,
  CircleDot,
  CheckCircle2,
  Users,
  PhoneCall,
  ExternalLink,
} from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY, myMapsUrl } from "../config";

/* ---------------------------------------------------------------------
   PC-OPS / AUTORITE -- BFMF 2026
   Vue de situation EN LECTURE SEULE destinée aux autorités (commune,
   discipline coordination) : événements en cours consolidés (SOS
   participants filtrés, alertes équipes, urgences logistiques).
   Aucune action possible depuis cette vue : l'engagement reste au QG.
--------------------------------------------------------------------- */

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

const KEY_MISSIONS = "bfmf2026-missions-logistique";
const KEY_GROUPES = "bfmf2026-suivi-balade";
const KEY_ALERTE_LOG = "bfmf2026-logistique-alerte";
const KEY_ALERTE_BAL = "bfmf2026-suivi-balade-alerte";
const KEY_SOS_PART = "bfmf2026-sos-participants";
const KEY_CONSIGNE = "bfmf2026-volante-consigne";

const CAPACITE_ETAPE = 300;
const LONGUEUR_KM = 6.5;

const POS_KM = { p0: 0, t1: 0.45, e1: 0.9, t2: 1.7, e2: 2.53, t3: 3.8, e3: 5.06, tr: 5.8, ret: 6.5 };
const POS_LABEL = {
  p0: "Point 0 (attente depart)", t1: "Transit vers Etape 1", e1: "Etape 1",
  t2: "Transit vers Etape 2", e2: "Etape 2", t3: "Transit vers Etape 3",
  e3: "Etape 3", tr: "Transit retour", ret: "Rentre au Point 0",
};

const REPERES = [
  { nom: "P0", km: 0 },
  { nom: "E1", km: 0.9 },
  { nom: "E2", km: 2.53 },
  { nom: "E3", km: 5.06 },
  { nom: "P0", km: 6.5 },
];

const GRAV = {
  critique: { rang: 3, cls: "text-red-300", ring: "ring-red-400/40", bg: "bg-red-400/10", dot: "bg-red-400" },
  grave: { rang: 2, cls: "text-amber-300", ring: "ring-amber-400/40", bg: "bg-amber-400/10", dot: "bg-amber-400" },
  modere: { rang: 1, cls: "text-sky-300", ring: "ring-sky-400/30", bg: "bg-sky-400/10", dot: "bg-sky-400" },
};

export default function PcOps() {
  const [missions, setMissions] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [sosPart, setSosPart] = useState([]);
  const [consigne, setConsigne] = useState(null);
  const [sbError, setSbError] = useState(false);
  const [maj, setMaj] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let stop = false;
    async function pull() {
      try {
        const [mi, gr, aLog, aBal, sp, co] = await Promise.all([
          kvGet(KEY_MISSIONS), kvGet(KEY_GROUPES), kvGet(KEY_ALERTE_LOG),
          kvGet(KEY_ALERTE_BAL), kvGet(KEY_SOS_PART), kvGet(KEY_CONSIGNE),
        ]);
        if (stop) return;
        setMissions(Array.isArray(mi) ? mi : []);
        setGroupes(Array.isArray(gr) ? gr : []);
        setSosPart(Array.isArray(sp) ? sp : []);
        setConsigne(co && co.active ? co : null);
        setAlertes(
          [
            aLog && aLog.active ? { ...aLog, source: "Equipe logistique" } : null,
            aBal && aBal.active ? { ...aBal, source: "Equipe balade" } : null,
          ].filter(Boolean)
        );
        setMaj(new Date());
        setSbError(false);
      } catch (e) {
        if (!stop) setSbError(true);
      }
    }
    pull();
    const t = setInterval(pull, 10000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  /* ------------------- Consolidation des evenements ------------------- */
  const evenements = [];

  // FILTRAGE STRICT : On écarte tous les SOS clôturés par le QG sous n'importe quelle variante
  const sosVisibles = sosPart.filter((s) => 
    s.statut !== "cloture" && 
    s.statut !== "clôture" && 
    s.statut !== "cloturé" &&
    s.statut !== "clos"
  );

  sosVisibles.forEach((s) => {
    // Formatage dynamique du libellé selon l'évolution du statut terrain transmis par la Volante
    let texteStatut = "Nouveau — non pris en compte";
    if (s.statut === "en route") texteStatut = `Volante en route (${s.heureEnRoute || ""})`;
    else if (s.statut === "sur place") texteStatut = `Volante sur place (${s.heureArrivee || ""})`;
    else if (s.statut === "prise en charge") texteStatut = `Victime prise en charge / Soins (${s.heurePriseEnCharge || ""})`;
    else if (s.statut === "retour a la normale") texteStatut = `Incident géré — retour à la normale (${s.heureRetourNormale || ""})`;
    else if (s.statut === "pris en compte") texteStatut = `Pris en compte par le QG (${s.heurePriseEnCompte || ""})`;

    evenements.push({
      id: s.id,
      heure: s.heure,
      type: "SOS participant",
      libelle: s.motif + (s.nom && s.nom !== "Anonyme" ? ` — ${s.nom}` : ""),
      gravite: s.statut === "retour a la normale" ? "modere" : "critique",
      localisation: s.surTrace
        ? `Parcours km ${s.surTrace.km} · ${s.surTrace.segment}`
        : "Position non geolocalisee (voir description)",
      km: s.surTrace ? s.surTrace.km : null,
      gps: s.gps || null,
      statut: texteStatut,
      actif: s.statut === "nouveau" || s.statut === "en route" || s.statut === "sur place" || s.statut === "prise en charge",
      details: s.details,
    });
  });

  alertes.forEach((a, i) => {
    evenements.push({
      id: "al" + i,
      heure: a.heure,
      type: "Alerte " + a.source.toLowerCase(),
      libelle: a.motif,
      gravite: "critique",
      localisation: a.groupe || a.details || "Voir QG",
      km: null,
      gps: null,
      statut: a.acquittePar ? `Acquittee par ${a.acquittePar} (${a.heureAcquittement})` : "Non acquittee",
      actif: !a.acquittePar,
      details: a.details,
    });
  });

  missions
    .filter((m) => m.statut !== "Resolue" && (m.bloquant === "Oui" || (m.priorite || "").startsWith("P1") || (m.priorite || "").startsWith("P2")))
    .forEach((m) => {
      evenements.push({
        id: m.id || m.ref,
        heure: m.heureConstat,
        type: "Logistique " + (m.priorite || "").slice(0, 2),
        libelle: m.nature,
        gravite: m.bloquant === "Oui" || (m.priorite || "").startsWith("P1") ? "grave" : "modere",
        localisation: `${m.zone}${m.localisation ? " · " + m.localisation : ""}`,
        km: null,
        gps: null,
        statut: m.statut + (m.attribueA ? ` — ${m.attribueA}` : " — non attribuee"),
        actif: m.statut === "A traiter",
        details: "",
      });
    });

  evenements.sort((a, b) => {
    if (a.actif !== b.actif) return a.actif ? -1 : 1;
    const ga = GRAV[a.gravite].rang, gb = GRAV[b.gravite].rang;
    if (ga !== gb) return gb - ga;
    return (b.heure || "").localeCompare(a.heure || "");
  });

  /* --------------------------- Crowd management --------------------------- */
  const grpDehors = groupes.filter((g) => g.position !== "p0" && g.position !== "ret");
  const persDehors = grpDehors.reduce((s, g) => s + (Number(g.participants) || 0), 0);
  const persAttente = groupes.filter((g) => g.position === "p0").reduce((s, g) => s + (Number(g.participants) || 0), 0);
  const persRentres = groupes.filter((g) => g.position === "ret").reduce((s, g) => s + (Number(g.participants) || 0), 0);
  const parEtape = { e1: 0, e2: 0, e3: 0 };
  groupes.forEach((g) => {
    if (parEtape[g.position] !== undefined) parEtape[g.position] += Number(g.participants) || 0;
  });

  const critiques = evenements.filter((e) => e.gravite === "critique" && e.actif).length;
  const niveau = critiques > 0 ? "critique" : evenements.some((e) => e.actif) || Object.values(parEtape).some((n) => n / CAPACITE_ETAPE >= 0.9) ? "modere" : "mineur";
  const niveauLabel = { mineur: "NORMAL", modere: "VIGILANCE", critique: "ALERTE" }[niveau];

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes pulseSlow { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .pulse-slow { animation: pulseSlow 1.6s ease-in-out infinite; }
      `}</style>

      <header className="border-b border-white/10 bg-[#131a22]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-sky-400/10 ring-1 ring-sky-400/30 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5 text-sky-300" />
            </div>
            <div className="min-w-0">
              <div className="font-display tracking-wide text-[15px] leading-none truncate">PC-OPS · AUTORITE</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · FERRIERES · VUE DE SITUATION</div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ring-1 font-mono text-xs tracking-wider ${
              niveau === "critique" ? "bg-red-400/10 ring-red-400/40 text-red-300"
              : niveau === "modere" ? "bg-amber-400/10 ring-amber-400/40 text-amber-300"
              : "bg-emerald-400/10 ring-emerald-400/30 text-emerald-300"}`}>
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

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {sbError && (
          <div className="rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 text-xs px-3 py-2">
            Liaison donnees indisponible — la situation affichee peut etre obsolete.
          </div>
        )}

        {/* Synthese chiffree */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Evenements actifs" value={evenements.filter((e) => e.actif).length} accent={critiques > 0 ? "text-red-300" : "text-amber-300"} />
          <Kpi label="Dont critiques" value={critiques} accent={critiques > 0 ? "text-red-300" : "text-emerald-300"} />
          <Kpi label="Public sur parcours" value={persDehors} accent="text-amber-300" />
          <Kpi label="Groupes dehors" value={grpDehors.length} accent="text-slate-200" />
        </section>

        {consigne && (
          <div className="rounded-md ring-1 ring-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
            Moyens engages : equipe volante vers <span className="font-semibold">{consigne.prv}</span>
            {consigne.message ? ` — ${consigne.message}` : ""} (emis {consigne.heure}
            {consigne.accusePar ? `, accuse ${consigne.heureAccuse}` : ", en attente d'accuse"})
          </div>
        )}

        {/* Crowd management : parcours lineaire */}
        <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4