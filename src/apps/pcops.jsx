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
  AlertTriangle,
  Sun,
  Sunset,
} from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY, myMapsUrl } from "../config";

/* ---------------------------------------------------------------------
   PC-OPS / AUTORITE -- BFMF 2026
   Vue de situation EN LECTURE SEULE destinée aux autorités (commune,
   discipline coordination) : événements en cours consolidés (SOS
   participants filtrés, alertes équipes, urgences logistiques), statut,
   localisation, gravité, et situation crowd management du parcours.
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
const KEY_METEO = "bfmf2026-meteo";

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

const METEO_FALLBACK = {
  live: true,
  province: "Liege",
  codeActuel: "vert",
  maj: "Initialisation",
  timeline: [{ creneau: "Prochaines heures", code: "vert", phenomene: "Conditions normales / RAS" }],
  station: "Ferrières (Province de Liège)",
  statutAlerte: "jaune",
  titre: "Avertissement Chaleur",
  validite: "Du 10/07/2026 00:00 au 15/07/2026 00:00",
  description: "Le SPF Santé Publique maintient la phase d'avertissement du Plan Forte Chaleur.",
  source: "Institut Royal Météorologique (IRM)",
  obsHeure: "17h00",
  obsResume: "Temps ensoleillé et sec — 22°C",
  obsLever: "05h38",
  obsCoucher: "21h52",
  obsUV: "6.8 (Élevé)",
  urlFerrieres: "https://www.meteo.be/fr/ferrieres"
};

/* ------------------------------ App ------------------------------ */

export default function PcOps() {
  const [missions, setMissions] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [sosPart, setSosPart] = useState([]);
  const [consigne, setConsigne] = useState(null);
  const [meteoLive, setMeteoLive] = useState(null);
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
        const [mi, gr, aLog, aBal, sp, co, mto] = await Promise.all([
          kvGet(KEY_MISSIONS), kvGet(KEY_GROUPES), kvGet(KEY_ALERTE_LOG),
          kvGet(KEY_ALERTE_BAL), kvGet(KEY_SOS_PART), kvGet(KEY_CONSIGNE),
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

  const sosVisibles = sosPart.filter((s) => {
    const st = (s.statut || "").toLowerCase();
    return st !== "cloture" && st !== "clôture" && st !== "cloturé" && st !== "clos" && st !== "retour a la normale";
  });

  sosVisibles.forEach((s) => {
    const st = (s.statut || "").toLowerCase();
    let texteStatut = "Nouveau — non pris en compte";
    if (st === "en route") texteStatut = `Volante en route (${s.heureEnRoute || ""})`;
    else if (st === "sur place") texteStatut = `Volante sur place (${s.heureArrivee || ""})`;
    else if (st === "prise en charge") texteStatut = `Victime prise en charge / Soins (${s.heurePriseEnCharge || ""})`;
    else if (st === "pris en compte") texteStatut = `Pris en compte par le QG (${s.heurePriseEnCompte || ""})`;

    evenements.push({
      id: s.id,
      heure: s.heure,
      type: "SOS participant",
      libelle: s.motif + (s.nom && s.nom !== "Anonyme" ? ` — ${s.nom}` : ""),
      gravite: "critique",
      localisation: s.surTrace ? `Parcours km ${s.surTrace.km} · ${s.surTrace.segment}` : "Position non geolocalisee (voir description)",
      km: s.surTrace ? s.surTrace.km : null,
      gps: s.gps || null,
      statut: texteStatut,
      details: s.details,
    });
  });

  alertes.forEach((a, i) => {
    if (a.acquittePar) return;
    evenements.push({
      id: "al" + i,
      heure: a.heure,
      type: "Alerte " + a.source.toLowerCase(),
      libelle: a.motif,
      gravite: "critique",
      localisation: a.groupe || a.details || "Voir QG",
      km: null,
      gps: null,
      statut: "Non acquittee",
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
        details: "",
      });
    });

  evenements.sort((a, b) => {
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

  const etapesSaturees = ["e1", "e2", "e3"]
    .map((eid, i) => {
      const n = parEtape[eid];
      const pct = n / CAPACITE_ETAPE;
      return { nom: `Etape ${i + 1}`, n, pct, label: pct >= 1.0 ? "COMPLET" : "DENSITE ELEVEE" };
    })
    .filter((e) => e.pct >= 0.72);

  const critiques = evenements.filter((e) => e.gravite === "critique").length;
  const niveau = critiques > 0 ? "critique" : evenements.length > 0 || Object.values(parEtape).some((n) => n / CAPACITE_ETAPE >= 0.9) ? "modere" : "mineur";
  const niveauLabel = { mineur: "NORMAL", modere: "VIGILANCE", critique: "ALERTE" }[niveau];

  const METEO = meteoLive || METEO_FALLBACK;
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=500;600;700&family=Inter:wght=400;500;600;700&family=JetBrains+Mono:wght=400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes pulseSlow { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        .pulse-slow { animation: pulseSlow 1.8s ease-in-out infinite; }
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

        {/* PANEL IRM BELGIQUE — SURVEILLANCE DIRECTE ET CLIQUABLE (LECTURE SEULE AUTORITÉS) */}
        <a 
          href={METEO.urlFerrieres || METEO_FALLBACK.urlFerrieres}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-[#131a22] rounded-lg p-4 ring-1 ring-amber-400/30 border-t-4 border-amber-400 shadow-xl hover:bg-[#1a232e] hover:ring-amber-400/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 pulse-slow" />
              <h2 className="font-display tracking-wide text-sm text-amber-300 uppercase flex items-center gap-1.5">
                IRM LIVE — AVERTISSEMENTS OFFICIELS ({METEO.station || METEO_FALLBACK.station})
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 transition-colors inline" />
              </h2>
            </div>
            <div className="text-[10px] font-mono bg-amber-400/10 text-amber-300 px-2 py-0.5 rounded border border-amber-400/20 uppercase tracking-wider">
              Vigilance : {METEO.statutAlerte || METEO_FALLBACK.statutAlerte}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="md:col-span-2 bg-white/[0.02] border border-white/5 rounded p-2.5">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {METEO.titre || METEO_FALLBACK.titre}
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                {METEO.description || METEO_FALLBACK.description}
              </p>
              <div className="text-[10px] font-mono text-slate-400 mt-2">
                Période de validité : {METEO.validite || METEO_FALLBACK.validite}
              </div>
            </div>
            
            <div className="bg-white/[0.02] border border-white/5 rounded p-2.5 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Météo & Données Clés</div>
                <div className="text-xs font-medium text-slate-200">{METEO.obsResume || METEO_FALLBACK.obsResume}</div>
                
                <div className="mt-2 pt-2 border-t border-white/5 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400"><Sun className="w-3 h-3 text-amber-400" /> Lever :</span>
                    <span className="font-mono font-medium">{METEO.obsLever || METEO_FALLBACK.obsLever}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400"><Sunset className="w-3 h-3 text-orange-400" /> Coucher :</span>
                    <span className="font-mono font-medium">{METEO.obsCoucher || METEO_FALLBACK.obsCoucher}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300 pt-0.5">
                    <span className="text-slate-400">Indice UV max :</span>
                    <span className="font-mono font-bold text-amber-400">{METEO.obsUV || METEO_FALLBACK.obsUV}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-[9px] font-mono text-slate-500 pt-1.5 border-t border-white/5 mt-3">
                Source : {METEO.source || METEO_FALLBACK.source} <br/>
                Observation : {METEO.maj}
              </div>
            </div>
          </div>
        </a>

        {/* Synthese chiffree */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Evenements actifs" value={evenements.length} accent={critiques > 0 ? "text-red-300" : "text-amber-300"} />
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

        {/* Crowd management */}
        <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
            <Footprints className="w-4 h-4 text-slate-500" /> PARCOURS 6,5 KM — SITUATION
          </h2>

          <div className="relative h-16 mb-2">
            <div className="absolute top-8 left-0 right-0 h-1 bg-white/15 rounded-full" />
            {REPERES.map((r, i) => (
              <div key={i} className="absolute top-5" style={{ left: `calc(${(r.km / LONGUEUR_KM) * 100}% - 8px)` }}>
                <div className="w-2 h-2 rounded-full bg-slate-500 mx-auto mt-2" />
                <div className="text-[9px] font-mono text-slate-500 text-center mt-1">{r.nom}</div>
              </div>
            ))}
            {grpDehors.map((g) => {
              const km = POS_KM[g.position] ?? 0;
              return (
                <div key={g.id} className="absolute top-1" style={{ left: `calc(${(km / LONGUEUR_KM) * 100}% - 10px)` }} title={`${g.nom} · ${g.participants} pers.`}>
                  <div className="flex items-center gap-0.5 bg-amber-400/20 ring-1 ring-amber-400/50 rounded px-1 py-0.5">
                    <Users className="w-2.5 h-2.5 text-amber-300" />
                    <span className="text-[9px] font-mono text-amber-200">{g.participants}</span>
                  </div>
                </div>
              );
            })}
            {evenements.filter((e) => e.type === "SOS participant" && e.km !== null).map((e) => (
              <div key={e.id} className="absolute top-10" style={{ left: `calc(${(Math.min(e.km, LONGUEUR_KM) / LONGUEUR_KM) * 100}% - 6px)` }} title={e.libelle}>
                <TriangleAlert className="w-3.5 h-3.5 text-red-400 pulse-slow" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            {["e1", "e2", "e3"].map((eid, idx) => {
              const n = parEtape[eid];
              const pct = Math.min(100, Math.round((n / CAPACITE_ETAPE) * 100));
              const cls = pct >= 100 ? "bg-red-500" : pct >= 72 ? "bg-amber-400" : "bg-emerald-400";
              return (
                <div key={eid} className="rounded bg-white/[0.03] ring-1 ring-white/10 p-2">
                  <div className="text-[10px] font-mono text-slate-500 flex justify-between items-center">
                    <span>ETAPE {idx + 1}</span>
                    {pct >= 100 && <span className="text-[8px] font-bold text-red-400 uppercase tracking-wide">COMPLET</span>}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden my-1">
                    <div className={`h-full ${cls} ${pct >= 100 ? "pulse-slow" : ""}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">{n}/{CAPACITE_ETAPE}</div>
                </div>
              );
            })}
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            {persAttente} en attente au Point 0 · {persDehors} sur le parcours · {persRentres} rentres
          </div>
        </section>

        {etapesSaturees.length > 0 && (
          <section className="rounded-lg ring-1 ring-amber-400/40 bg-amber-400/5 p-3.5">
            <div className="font-display text-amber-200 text-sm tracking-wide flex items-center gap-2 mb-1.5">
              <Footprints className="w-4 h-4" /> 
              {etapesSaturees.some(e => e.pct >= 1) ? "CROWD — CAPACITE MAXIMALE ATTEINTE" : "CROWD — DENSITE ELEVEE"}
            </div>
            <div className="space-y-1">
              {etapesSaturees.map((e) => (
                <div key={e.nom} className="flex items-center justify-between text-xs text-slate-200 py-0.5">
                  <div className="flex items-center gap-2">
                    <span>{e.nom} : {e.n}/{CAPACITE_ETAPE} ({Math.round(e.pct * 100)}%)</span>
                    {e.pct >= 1 && <span className="text-[9px] font-bold bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded ring-1 ring-red-500/40 font-mono">COMPLET</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Evenements en cours nettoyés sans doublon */}
        <section className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-4">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
            <TriangleAlert className="w-4 h-4 text-slate-500" /> EVENEMENTS EN COURS
            <span className="text-[11px] font-mono text-slate-500 font-normal">{evenements.length}</span>
          </h2>
          <div className="space-y-2">
            {evenements.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-4 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Aucun evenement en cours.
              </div>
            )}
            {evenements.map((e) => {
              const g = GRAV[e.gravite] || GRAV["modere"];
              return (
                <div key={e.id} className={`rounded-md px-3 py-2.5 ring-1 ${g.ring} ${g.bg}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-1.5 h-1.5 rounded-full ${g.dot} shrink-0 bg-red-400`} />
                    <span className="font-mono text-[11px] text-slate-400">{e.heure}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ring-1 ${g.ring} ${g.cls}`}>{e.gravite.toUpperCase()}</span>
                    <span className="text-[10px] font-mono text-slate-500">{e.type}</span>
                  </div>
                  <div className="text-sm text-slate-100 mt-1">{e.libelle}</div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" /> {e.localisation}
                    {e.gps && (
                      <>
                        <a href={`https://maps.google.com/?q=${e.gps.lat},${e.gps.lon}`} target="_blank" rel="noreferrer" className="text-sky-300 hover:text-sky-200 inline-flex items-center gap-0.5 ml-1">
                          Maps <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <a href={myMapsUrl(e.gps.lat, e.gps.lon)} target="_blank" rel="noreferrer" className="text-amber-300 hover:text-amber-200 inline-flex items-center gap-0.5 ml-1">
                          carte Buco <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </>
                    )}
                  </div>
                  {e.details && <div className="text-[11px] text-slate-500 italic mt-0.5">"{e.details}"</div>}
                  <div className="text-[11px] font-mono mt-1 text-amber-300">Statut : {e.statut}</div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="text-[10px] text-slate-600 font-mono text-center pb-2">
          {maj ? `Derniere synchronisation : ${pad(maj.getHours())}:${pad(maj.getMinutes())}:${pad(maj.getSeconds())}` : "Synchronisation..."} · rafraichissement 10 s
        </div>
      </main>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div className="bg-[#131a22] rounded-lg ring-1 ring-white/10 p-3">
      <div className="text-[10px] font-mono text-slate-500 tracking-wide uppercase">{label}</div>
      <div className={`font-display text-2xl mt-0.5 ${accent}`}>{value}</div>
    </div>
  );
}