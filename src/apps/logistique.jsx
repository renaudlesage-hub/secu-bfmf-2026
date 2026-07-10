import React, { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Plus,
  X,
  ChevronRight,
  Clock,
  CircleDot,
  CheckCircle2,
  UserCheck,
  TriangleAlert,
  MapPin,
  Package,
  Wrench,
  Users,
  Zap,
  Droplets,
  RefreshCw,
  ClipboardList,
  Flag,
  Download,
  CloudLightning,
  ExternalLink,
} from "lucide-react";

/* ---------------------------------------------------------------------
   MISSIONS LOGISTIQUES -- Bucolique Ferrières Musique Festival 2026
--------------------------------------------------------------------- */

const STORAGE_KEY = "bfmf2026-missions-logistique";
const ALERT_KEY = "bfmf2026-logistique-alerte";
const PROFILE_KEY = "bfmf2026-profil";
const KEY_METEO = "bfmf2026-meteo";

const ROLES = [
  "QG / PCE",
  "Coordination générale",
  "Volante",
  "Responsable scène 1",
  "Responsable scène 2",
  "Responsable Étape 1",
  "Responsable Étape 2",
  "Responsable Étape 3",
  "Bénévole parking",
  "Bénévole sanitaire",
  "Sécurité privée",
  "Technique",
  "Bar / restauration",
  "Logistique",
  "Médical / secouriste",
  "Autre",
];

const MOTIFS_ALERTE = [
  "Situation bloquante générale",
  "Accès secours obstrué",
  "Panne critique (énergie, structure)",
  "Besoin de renfort immédiat",
  "Météo -- adaptation urgente",
  "Autre",
];

const STATUTS = ["A traiter", "Attribuee", "En cours", "Resolue"];

const FONCTIONS = [
  "QG / PCE",
  "Coordination générale",
  "Volante",
  "Responsable scène 1",
  "Responsable scène 2",
  "Responsable Étape 1",
  "Responsable Étape 2",
  "Responsable Étape 3",
  "Bénévole parking",
  "Bénévole sanitaire",
  "Sécurité privée",
  "Gestion artistique / backstage",
  "Technique",
  "Bar / restauration",
  "Foodtruck",
  "Logistique",
  "Médical / secouriste",
  "Autre",
];

const CANAUX_REMONTEE = [
  "PMR4.1",
  "PMR5",
  "PMR7.1",
  "PMR15",
  "PMR333",
  "PMR x",
  "Telephone",
  "En direct",
  "Autre",
];

const PRIORITES = {
  "P1 - immediat / critique": { dot: "bg-red-400", text: "text-red-300", ring: "ring-red-400/30", bg: "bg-red-400/10" },
  "P2 - urgent": { dot: "bg-amber-400", text: "text-amber-300", ring: "ring-amber-400/30", bg: "bg-amber-400/10" },
  "P3 - important non bloquant": { dot: "bg-sky-400", text: "text-sky-300", ring: "ring-sky-400/30", bg: "bg-sky-400/10" },
  "P4 - amelioration / des que possible": { dot: "bg-emerald-400", text: "text-emerald-300", ring: "ring-emerald-400/30", bg: "bg-emerald-400/10" },
};

const CATEGORIES = [
  "Acces / circulation",
  "Parking",
  "Sanitaires",
  "Eau",
  "Dechets / proprete",
  "Electricite / energie",
  "Groupe electrogene",
  "Structure / montage",
  "Barrierage / Hera",
  "Signalisation / balisage",
  "Eclairage",
  "Foodtrucks / restauration",
  "Materiel manquant",
  "Transport / manutention",
  "Zone backstage / artistes",
  "Communication / radio",
  "Approvisionnement",
  "Confort public",
  "PMR / accessibilite",
  "Meteo / adaptation",
  "Autre",
];

const CATEGORIE_ICONS = {
  "Acces / circulation": Flag,
  Parking: Truck,
  Sanitaires: Droplets,
  Eau: Droplets,
  "Dechets / proprete": Droplets,
  "Electricite / energie": Zap,
  "Groupe electrogene": Zap,
  "Structure / montage": Wrench,
  "Barrierage / Hera": Flag,
  "Signalisation / balisage": Flag,
  Eclairage: Zap,
  "Foodtrucks / restauration": Package,
  "Materiel manquant": Package,
  "Transport / manutention": Truck,
  "Zone backstage / artistes": Users,
  "Communication / radio": ClipboardList,
  Approvisionnement: Package,
  "Confort public": Users,
  "PMR / accessibilite": Users,
  "Meteo / adaptation": TriangleAlert,
  Autre: ClipboardList,
};

const NATURES_BESOIN = [
  "Manque",
  "Panne",
  "Dysfonctionnement",
  "Saturation",
  "Degradation",
  "Demande de renfort",
  "Deplacement / repositionnement",
  "Remplacement",
  "Reapprovisionnement",
  "Nettoyage",
  "Securisation",
  "Information manquante",
  "A verifier",
  "Autre",
];

const ZONES = [
  "Point 0",
  "Parking public",
  "Scene 1",
  "Scene 2",
  "Plaine / public",
  "Bar",
  "Foodtrucks",
  "Sanitaires",
  "Backstage",
  "Zone logistique",
  "Parcours secteur A",
  "Parcours secteur B",
  "Parcours secteur C",
  "Parcours secteur D",
  "Etape 1",
  "Etape 2",
  "Etape 3",
  "Voie d'acces secours",
  "Hors site",
  "Autre",
];

const EQUIPES = [
  "Volante",
  "Technique",
  "Logistique",
  "Responsable Étape 1",
  "Responsable Étape 2",
  "Responsable Étape 3",
  "Benevole parking",
  "Benevole sanitaire",
  "Bar / restauration",
  "Responsable scene 1",
  "Responsable scene 2",
  "Securite privee",
  "QG / PCE",
];

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

const inputCls =
  "w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-2.5 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60";

const MISSIONS_DEMO = [];

import { SUPABASE_URL, SUPABASE_ANON_KEY, myMapsUrl } from "../config";

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

async function kvGet(key) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(key)}&select=value`, { headers: SB_HEADERS });
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

function pad(n) { return n.toString().padStart(2, "0"); }
function nowHM() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function genRef(count) { return `LOG-2026-${String(count + 1).padStart(3, "0")}`; }

export default function LogistiqueMissions() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [now, setNow] = useState(new Date());
  const [meteoLive, setMeteoLive] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [alerte, setAlerte] = useState(null);
  const [showAlarme, setShowAlarme] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      const s = localStorage.getItem(PROFILE_KEY);
      if (s) setProfile(JSON.parse(s));
    } catch (e) {}
    setProfileLoaded(true);
  }, []);

  const refresh = useCallback(async (initial = false) => {
    try {
      const [data, al, mto] = await Promise.all([kvGet(STORAGE_KEY), kvGet(ALERT_KEY), kvGet(KEY_METEO)]);
      if (data) {
        setMissions(data);
      } else if (initial) {
        setMissions(MISSIONS_DEMO);
        await kvSet(STORAGE_KEY, MISSIONS_DEMO);
      }
      setAlerte(al && al.active ? al : null);
      setMeteoLive(mto && mto.live ? mto : null);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh(true);
    const t = setInterval(() => refresh(false), alerte ? 5000 : 15000);
    return () => clearInterval(t);
  }, [refresh, alerte]);

  async function persist(next) {
    setMissions(next);
    const ok = await kvSet(STORAGE_KEY, next);
    setSaveError(!ok);
  }

  const signature = profile ? `${profile.nom} (${profile.role})` : "?";

  // Corrections mineures sur l'historique et évite le crash du .find si vide
  function updateMission(id, changes, logTexte) {
    const next = missions.map((m) => {
      if (m.id !== id) return m;
      const historique = logTexte
        ? [...(m.historique || []), { heure: nowHM(), texte: `${logTexte} -- par ${signature}` }]
        : m.historique || [];
      return { ...m, ...changes, historique };
    });
    persist(next);
    if (selected && selected.id === id) {
      setSelected(next.find((m) => m.id === id) || null);
    }
  }

  async function declencherAlerte(data) {
    const a = {
      active: true,
      heure: nowHM(),
      auteur: signature,
      motif: data.motif || "Alerte",
      details: data.details || "",
      acquittePar: "",
      heureAcquittement: "",
    };
    setAlerte(a);
    await kvSet(ALERT_KEY, a);
    setShowAlarme(false);
  }

  async function acquitterAlerte() {
    if (!alerte) return;
    const a = { ...alerte, acquittePar: signature, heureAcquittement: nowHM() };
    setAlerte(a);
    await kvSet(ALERT_KEY, a);
  }

  async function leverAlerte() {
    if (!alerte) return;
    const a = { ...alerte, active: false, leveePar: signature, heureLevee: nowHM() };
    setAlerte(null);
    await kvSet(ALERT_KEY, a);
  }

  function addMission(data) {
    const mission = {
      ...data,
      id: `m${Date.now()}`,
      ref: genRef(missions.length),
      heureConstat: data.heureConstat || nowHM(),
      statut: "A traiter",
      attribueA: "",
      responsableSuivi: "",
      heurePriseEnCompte: "",
      heureEstimeeResolution: "",
      actionEffectuee: "",
      realiseePar: "",
      regleTotalement: "",
      risqueResiduel: "",
      pointREX: "",
      historique: [
        {
          heure: nowHM(),
          texte: `Demande creee par ${data.emetteurNom || "?"} (${data.equipeOrigine || "?"}) -- saisie: ${signature}`,
        },
      ],
    };
    persist([mission, ...missions]);
    setShowForm(false);
  }

  const filtered = filtreStatut === "Tous" ? missions : missions.filter((m) => m.statut === filtreStatut);
  const counts = STATUTS.reduce((acc, s) => ({ ...acc, [s]: missions.filter((m) => m.id && m.statut === s).length }), {});
  const bloquantes = missions.filter((m) => m.statut !== "Resolue" && (m.bloquant === "Oui" || m.priorite?.startsWith("P1"))).length;

  const METEO = meteoLive || METEO_FALLBACK;
  const mc = CODE_METEO[METEO.codeActuel] || CODE_METEO["vert"];

  function exportCSV() {
    const cols = [
      ["Reference", "ref"], ["Titre", "nature"], ["Statut", "statut"], ["Zone", "zone"], ["Priorite", "priorite"]
    ];
    const esc = (v) => {
      let s = v == null ? "" : String(v);
      if (/[";\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const lines = [
      cols.map((c) => esc(c[0])).join(";"),
      ...missions.map((m) => cols.map((c) => esc(m[c[1]])).join(";")),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logbook-logistique-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (profileLoaded && !profile) {
    return (
      <ProfilSetup
        onSave={(p) => {
          setProfile(p);
          try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch(e){}
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans">
      <header className="border-b border-white/10 bg-[#151b23]/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="font-display tracking-wide text-[15px] leading-none truncate">MISSIONS LOGISTIQUES</div>
              <div className="text-[11px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · QG BUCO</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button onClick={() => setShowAlarme(true)} className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded ring-2 ring-red-400/60 bg-red-500/20 text-red-200 hover:bg-red-500/30 font-semibold">
              <TriangleAlert className="w-4 h-4" /> SOS
            </button>
            <button onClick={() => refresh(false)} className="text-slate-500 hover:text-slate-200"><RefreshCw className="w-4 h-4" /></button>
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />
              {pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {alerte && (
          <div className="rounded-lg ring-2 ring-red-400/60 bg-red-500/15 p-4">
            <div className="flex items-start gap-3">
              <TriangleAlert className="w-5 h-5 text-red-300 pulse-slow mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-display text-red-200 text-sm">{alerte.motif}</div>
                <div className="text-xs text-red-200/80 mt-1">Saisie par {alerte.auteur} à {alerte.heure}</div>
              </div>
              <div className="flex gap-2">
                {!alerte.acquittePar && <button onClick={acquitterAlerte} className="text-xs font-mono px-2 py-1 ring-1 ring-white/20 rounded">Acquitter</button>}
                <button onClick={leverAlerte} className="text-xs font-mono px-2 py-1 ring-1 ring-white/20 rounded">Lever</button>
              </div>
            </div>
          </div>
        )}

        {/* METEO PANEL */}
        <section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2">
              <CloudLightning className="w-4 h-4 text-slate-500" /> MONITEUR MÉTÉO INTERNE BFMF
            </h2>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ring-1 ${mc.ring} ${mc.bg} ${mc.text}`}>{mc.label}</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2 font-mono">Status : {METEO.maj}</p>
          <div className="space-y-2">
            {METEO.timeline?.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-xs rounded bg-white/[0.02] border border-white/5 p-2.5">
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full ${CODE_METEO[t.code]?.dot || "bg-emerald-400"}`} />
                  <span className="text-slate-100 font-medium truncate">{t.phenomene}</span>
                </div>
                <span className="text-slate-500 font-mono text-[10px] ml-2 shrink-0">{t.creneau}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="A traiter" value={counts["A traiter"] || 0} accent="text-amber-300" />
          <Kpi label="Attribuees" value={counts["Attribuee"] || 0} accent="text-sky-300" />
          <Kpi label="En cours" value={counts["En cours"] || 0} accent="text-slate-200" />
          <Kpi label="Bloquantes" value={bloquantes} accent={bloquantes > 0 ? "text-red-300" : "text-emerald-300"} />
        </section>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {["Tous", ...STATUTS].map((s) => (
              <button key={s} onClick={() => setFiltreStatut(s)} className={`text-[11px] font-mono px-2.5 py-1 rounded-full ring-1 ${filtreStatut === s ? "bg-amber-400/10 text-amber-300 ring-amber-400/40" : "text-slate-400 ring-white/10"}`}>
                {s} ({s === "Tous" ? missions.length : counts[s] || 0})
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="text-xs font-mono px-3 py-1.5 rounded ring-1 ring-white/10 text-slate-400"><Download className="w-3.5 h-3.5 inline mr-1" /> Export CSV</button>
            <button onClick={() => setShowForm(true)} className="text-xs font-mono px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"><Plus className="w-3.5 h-3.5 inline mr-1" /> Nouvelle demande</button>
          </div>
        </div>

        <section className="space-y-2">
          {filtered.map((m) => {
            const p = PRIORITES[m.priorite] || PRIORITES["P3 - important non bloquant"];
            const Icon = CATEGORIE_ICONS[m.categorie] || ClipboardList;
            return (
              <button key={m.id} onClick={() => setSelected(m)} className="w-full text-left rounded-lg ring-1 p-3.5 bg-[#151b23] ring-white/10 hover:bg-[#1a212b] flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                  <span className="font-mono text-[11px] text-slate-500">{m.ref}</span>
                  <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-200 truncate">{m.nature}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>
            );
          })}
        </section>
      </main>

      {showForm && <FormNouvelle onClose={() => setShowForm(false)} onSubmit={addMission} />}
      {showAlarme && <AlarmeForm onClose={() => setShowAlarme(false)} onDeclencher={declencherAlerte} />}
      {selected && (
        <MissionDetail
          mission={missions.find((m) => m.id === selected.id) || selected}
          onClose={() => setSelected(null)}
          onAttribuer={updateMission}
          onDemarrer={(id) => updateMission(id, { statut: "En cours" }, "Démarré")}
          onResoudre={(id, dt) => updateMission(id, { statut: "Resolue", actionEffectuee: dt.action }, "Résolue")}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-3">
      <div className="text-[10px] font-mono text-slate-500 uppercase">{label}</div>
      <div className={`font-display text-2xl mt-0.5 ${accent}`}>{value}</div>
    </div>
  );
}

function ProfilSetup({ onSave }) {
  const [nom, setNom] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  return (
    <div className="min-h-screen bg-[#11151b] flex items-center justify-center p-4">
      <div className="bg-[#1a212b] p-6 rounded-lg max-w-sm w-full space-y-4">
        <h3 className="font-display text-white text-lg">Configuration du Profil</h3>
        <input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom / Indicatif" />
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={() => nom.trim() && onSave({ nom: nom.trim(), role })} className="w-full py-2 bg-emerald-600 text-white font-mono rounded">Valider</button>
      </div>
    </div>
  );
}

function AlarmeForm({ onClose, onDeclencher }) {
  const [motif, setMotif] = useState(MOTIFS_ALERTE[0]);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#1a212b] p-5 rounded-lg max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-red-300 font-display">Alerte Générale</h3>
        <select className={inputCls} value={motif} onChange={(e) => setMotif(e.target.value)}>
          {MOTIFS_ALERTE.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={() => onDeclencher({ motif })} className="w-full py-2 bg-red-600 text-white rounded font-mono">LANCER</button>
      </div>
    </div>
  );
}

function StatutBadge({ statut }) {
  return <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 rounded">{statut}</span>;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] font-mono text-slate-300 uppercase mb-1">{label}</div>
      {children}
    </label>
  );
}

function FormNouvelle({ onClose, onSubmit }) {
  const [nature, setNature] = useState("");
  const [emetteurNom, setEmetteurNom] = useState("");
  const [localisation, setLocalisation] = useState("");
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#1a212b] p-5 rounded-lg max-w-md w-full space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-display text-lg">Nouvelle Demande</h3>
        <Field label="Titre court / Nature de l'incident *">
          <input className={inputCls} value={nature} onChange={(e) => setNature(e.target.value)} placeholder="Ex : Panne éclairage" />
        </Field>
        <Field label="Qui signale ? *">
          <input className={inputCls} value={emetteurNom} onChange={(e) => setEmetteurNom(e.target.value)} placeholder="Nom" />
        </Field>
        <Field label="Localisation précise *">
          <input className={inputCls} value={localisation} onChange={(e) => setLocalisation(e.target.value)} placeholder="Lieu" />
        </Field>
        <button onClick={() => nature && emetteurNom && localisation && onSubmit({ nature, emetteurNom, localisation })} className="w-full py-2 bg-emerald-600 text-white rounded">Créer</button>
      </div>
    </div>
  );
}

function MissionDetail({ mission, onClose, onAttribuer, onDemarrer, onResoudre }) {
  const [action, setAction] = useState("");
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#151b23] p-5 rounded-lg max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-display text-lg">{mission.nature}</h3>
        <p className="text-xs text-slate-400">Signalé par {mission.emetteurNom} — Lieu : {mission.localisation}</p>
        <div className="space-y-2 pt-2 border-t border-white/10">
          {mission.statut === "A traiter" && <button onClick={() => onAttribuer(mission.id, { statut: "Attribuee" })} className="w-full py-2 bg-sky-600 text-white rounded text-xs font-mono">Prendre la mission</button>}
          {mission.statut === "Attribuee" && <button onClick={() => onDemarrer(mission.id)} className="w-full py-2 bg-amber-600 text-white rounded text-xs font-mono">Démarrer le traitement</button>}
          {mission.statut === "En cours" && (
            <div className="space-y-2">
              <input className={inputCls} value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action effectuée" />
              <button onClick={() => onResoudre(mission.id, { action })} className="w-full py-2 bg-emerald-600 text-white rounded text-xs font-mono">Clôturer résolue</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}