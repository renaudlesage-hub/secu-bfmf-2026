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
  QrCode,
  Printer,
  Trash2,
} from "lucide-react";

/* ---------------------------------------------------------------------
   MISSIONS LOGISTIQUES -- Bucolique Ferrières Musique Festival 2026
--------------------------------------------------------------------- */

const STORAGE_KEY = "bfmf2026-missions-logistique";
const ALERT_KEY = "bfmf2026-logistique-alerte";
const PROFILE_KEY = "bfmf2026-profil";
const KEY_METEO = "bfmf2026-meteo";


const MOTIFS_ALERTE = [
  "Situation bloquante générale",
  "Accès secours obstrué",
  "Panne critique (énergie, structure)",
  "Besoin de renfort immédiat",
  "Météo -- adaptation urgente",
  "Autre",
];

const STATUTS = ["A traiter", "Attribuee", "En cours", "Resolue"];

// Synchronisation complète des localisations avec le Dashboard QG
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
  "Point 0": { lat: 50.3835, lon: 5.6215, km: 0, segment: "Secteur Départ" },
  "Parcours Balade secteur A": { lat: 50.3821, lon: 5.6167, km: 0.5, segment: "Sentier départ forêt" },
  "PRV#4": { lat: 50.38212, lon: 5.61673, km: 0.5, segment: "Balisage Secours #4" },
  "Etape 1": { lat: 50.37858, lon: 5.6279, km: 0.9, segment: "Ravitaillement 1" },
  "Parcours Balade secteur B": { lat: 50.3756, lon: 5.6441, km: 1.8, segment: "Tracé Sud - Vers Étape 2" },
  "PRV#5": { lat: 50.37568, lon: 5.64412, km: 2.5, segment: "Balisage Secours #5" },
  "Etape 2": { lat: 50.37828, lon: 5.64549, km: 2.53, segment: "Ravitaillement 2" },
  "Parcours Balade secteur C": { lat: 50.3823, lon: 5.6457, km: 3.5, segment: "Tracé Est Crête" },
  "PRV#6": { lat: 50.38236, lon: 5.64579, km: 3.8, segment: "Balisage Secours #6" },
  "Etape 3": { lat: 50.38817, lon: 5.62891, km: 5.06, segment: "Ravitaillement 3" },
  "Parcours Balade secteur D": { lat: 50.3886, lon: 5.6269, km: 5.8, segment: "Secteur Nord Retour P0" },
  "PRV#7": { lat: 50.38865, lon: 5.62692, km: 5.5, segment: "Balisage Secours #7" }
};

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

import { ROLES } from "./referentiels";
import { SUPABASE_URL, SUPABASE_ANON_KEY, myMapsUrl } from "../config";

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

async function kvGet(key) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(key)}&select=value`, { headers: SB_HEADERS, credentials: "omit" });
  if (!r.ok) throw new Error(`Supabase GET ${r.status}`);
  const j = await r.json();
  return j.length ? j[0].value : null;
}

async function kvSet(key, value) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_store`, {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates" },
    credentials: "omit",
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
  const [vue, setVue] = useState("missions"); // missions | qr
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
      lieu: data.lieu || "",
      qui: data.qui || "",
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
      heureConstat: nowHM(),
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
          texte: `Demande creee automatiquement par profil de session: ${signature}`,
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
            <button
              onClick={() => setVue(vue === "qr" ? "missions" : "qr")}
              className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded ring-1 transition-colors ${
                vue === "qr" ? "ring-indigo-400/50 bg-indigo-400/15 text-indigo-200" : "ring-white/20 text-slate-400 hover:text-slate-200"
              }`}
              title="Générer les étiquettes QR à coller sur les équipements"
            >
              <QrCode className="w-4 h-4" /> <span className="hidden sm:inline">Étiquettes QR</span>
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
        {vue === "qr" ? (
          <GenerateurQR />
        ) : (
        <>
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
        </>
        )}
      </main>

      {showForm && <FormNouvelle onClose={() => setShowForm(false)} onSubmit={addMission} signature={signature} />}
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
  const [lieu, setLieu] = useState(Object.keys(POINTS_GPS)[0]);
  const [qui, setQui] = useState("");
  const [details, setDetails] = useState("");
  const valide = details.trim().length >= 5;
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#1a212b] p-5 rounded-lg max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-red-300 font-display">Alerte Générale — SOS Équipe</h3>

        <div>
          <div className="text-[11px] font-mono text-slate-300 uppercase mb-1">Nature de l'alerte *</div>
          <select className={inputCls} value={motif} onChange={(e) => setMotif(e.target.value)}>
            {MOTIFS_ALERTE.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <div className="text-[11px] font-mono text-slate-300 uppercase mb-1">Localisation *</div>
          <select className={inputCls} value={lieu} onChange={(e) => setLieu(e.target.value)}>
            {Object.keys(POINTS_GPS).map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>

        <div>
          <div className="text-[11px] font-mono text-slate-300 uppercase mb-1">Qui est concerné</div>
          <input className={inputCls} value={qui} onChange={(e) => setQui(e.target.value)}
            placeholder="Ex: bénévole bar, festivalier, prestataire son..." />
        </div>

        <div>
          <div className="text-[11px] font-mono text-slate-300 uppercase mb-1">Descriptif de la situation * (min. 5 car.)</div>
          <textarea className={inputCls} rows={3} value={details} onChange={(e) => setDetails(e.target.value)}
            placeholder="Ce qui se passe, depuis quand, besoin exprimé..." />
        </div>

        <button
          disabled={!valide}
          onClick={() => onDeclencher({ motif, lieu, qui: qui.trim(), details: details.trim() })}
          className={`w-full py-2.5 rounded font-mono font-semibold transition-colors ${valide ? "bg-red-600 text-white hover:bg-red-500" : "bg-white/5 text-slate-600 cursor-not-allowed"}`}
        >
          LANCER L'ALERTE
        </button>
        <div className="text-[10px] text-slate-500 text-center">Visible immédiatement au QG (dashboard) et sur l'app Volante. Doubler à la radio (PMR4.1, PMR333 si vital).</div>
      </div>
    </div>
  );
}

function StatutBadge({ statut }) {
  return <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 rounded">{statut}</span>;
}

// Composant d'encapsulation de champ modifié pour plus de clarté
function Field({ label, children }) {
  return (
    <div>
      <div className="text-[11px] font-mono text-slate-300 uppercase mb-1">{label}</div>
      {children}
    </div>
  );
}

// FORMULAIRE MIS À JOUR AVEC SYNCHRONISATION GPS ET AUTOMATISATION LOGIN
function FormNouvelle({ onClose, onSubmit, signature }) {
  const [nature, setNature] = useState("");
  const [zone, setZone] = useState("Site zone logistique");
  const [formPriorite, setFormPriorite] = useState("P3 - important non bloquant");
  const [formCategorie, setFormCategorie] = useState("Autre");
  const [formBloquant, setFormBloquant] = useState("Non");

  const executerCreation = () => {
    if (!nature) return;
    onSubmit({
      nature,
      zone,
      localisation: POINTS_GPS[zone]?.segment || "",
      priorite: formPriorite,
      categorie: formCategorie,
      bloquant: formBloquant,
      emetteurNom: signature,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#1a212b] p-5 rounded-lg max-w-md w-full space-y-3.5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <h3 className="text-white font-display text-lg">Nouvelle Demande Logistique</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <ScannerLogistique
          onScanSuccess={(infos) => {
            if (infos.nature) setNature(infos.nature);
            if (infos.lieu && POINTS_GPS[infos.lieu]) setZone(infos.lieu);
          }}
        />

        <Field label="Nature de l'incident / Besoin matériel *">
          <input className={inputCls} value={nature} onChange={(e) => setNature(e.target.value)} placeholder="Ex: Panne éclairage, manque gobelets..." required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Localisation (Synchro Dashboard)">
            <select className={inputCls} value={zone} onChange={(e) => setZone(e.target.value)}>
              {Object.keys(POINTS_GPS).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          <Field label="Degré de Priorité">
            <select className={inputCls} value={formPriorite} onChange={(e) => setFormPriorite(e.target.value)}>
              {Object.keys(PRIORITES).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Catégorie Métier">
            <select className={inputCls} value={formCategorie} onChange={(e) => setFormCategorie(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Incident Bloquant ?">
            <select className={inputCls} value={formBloquant} onChange={(e) => setFormBloquant(e.target.value)}>
              <option value="Non">Non</option>
              <option value="Oui">Oui</option>
            </select>
          </Field>
        </div>

        {/* RECOUVREMENT AUTOMATIQUE DU PROFIL DE SESSION */}
        <Field label="Qui signale ? (Lecture Seule - Auto)">
          <input className="w-full bg-black/40 ring-1 ring-white/10 rounded px-3 py-2.5 text-[14px] text-slate-400 font-mono select-none" value={signature} disabled />
        </Field>

        <button onClick={executerCreation} disabled={!nature} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 font-mono text-white rounded font-bold transition-colors shadow-md disabled:opacity-50">
          INJECTER LA DEMANDE
        </button>
      </div>
    </div>
  );
}

function MissionDetail({ mission, onClose, onAttribuer, onDemarrer, onResoudre }) {
  const [action, setAction] = useState("");
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#151b23] p-5 rounded-lg max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start border-b border-white/5 pb-2">
          <div>
            <span className="text-[10px] font-mono text-slate-500 block mb-0.5">{mission.ref}</span>
            <h3 className="text-white font-display text-lg leading-tight">{mission.nature}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        
        <div className="text-xs space-y-1 bg-black/20 p-2.5 rounded border border-white/5 text-slate-300">
          <div>📍 <span className="font-semibold">Zone :</span> {mission.zone}</div>
          {mission.localisation && <div>🗺️ <span className="font-semibold">Localisation :</span> {mission.localisation}</div>}
          <div>👤 <span className="font-semibold">Auteur :</span> {mission.emetteurNom}</div>
          <div>⚠️ <span className="font-semibold">Priorité :</span> {mission.priorite}</div>
        </div>

        <div className="space-y-2 pt-2">
          {mission.statut === "A traiter" && <button onClick={() => onAttribuer(mission.id, { statut: "Attribuee" }, "Pris en charge")} className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-mono transition-colors">Prendre la mission</button>}
          {mission.statut === "Attribuee" && <button onClick={() => onDemarrer(mission.id)} className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-mono transition-colors">Démarrer le traitement</button>}
          {mission.statut === "En cours" && (
            <div className="space-y-2">
              <input className={inputCls} value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action effectuée" />
              <button onClick={() => action.trim() && onResoudre(mission.id, { action: action.trim() })} disabled={!action.trim()} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono transition-colors disabled:opacity-40">Clôturer résolue</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ---------------------------------------------------------------------
   SCANNER QR MATERIEL
   Format attendu sur l'etiquette : LOC:Site bar|MAT:Panne eclairage
   - LOC doit correspondre EXACTEMENT a une cle de POINTS_GPS pour que la
     localisation se pre-remplisse (sinon seule la nature est reprise).
   - La librairie html5-qrcode est chargee A LA DEMANDE (import dynamique) :
     pas d'alourdissement du bundle, et une absence de librairie ne casse
     pas le formulaire.
   - Camera : necessite HTTPS (OK sur Vercel) + autorisation de l'utilisateur.
--------------------------------------------------------------------- */

export function ScannerLogistique({ onScanSuccess }) {
  const [scanOuvert, setScanOuvert] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!scanOuvert) return;
    let scanner = null;
    let annule = false;

    (async () => {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (annule) return;
        scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );
        scanner.render(
          (decodedText) => {
            const infos = { lieu: "", nature: "" };
            decodedText.split("|").forEach((d) => {
              const t = d.trim();
              if (t.startsWith("LOC:")) infos.lieu = t.slice(4).trim();
              if (t.startsWith("MAT:")) infos.nature = t.slice(4).trim();
            });
            // QR non conforme : on reprend le texte brut comme nature
            if (!infos.lieu && !infos.nature) infos.nature = decodedText.trim();
            try { scanner.clear(); } catch (e) {}
            setScanOuvert(false);
            onScanSuccess(infos);
          },
          () => { /* erreurs de lecture continues : ignorees */ }
        );
      } catch (e) {
        if (!annule) setErreur("Scanner indisponible (librairie ou caméra). Saisie manuelle possible.");
      }
    })();

    return () => {
      annule = true;
      if (scanner) { try { scanner.clear(); } catch (e) {} }
    };
  }, [scanOuvert]); // eslint-disable-line

  return (
    <div>
      {!scanOuvert ? (
        <button
          type="button"
          onClick={() => { setErreur(""); setScanOuvert(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-xs font-bold font-mono w-full justify-center transition-colors"
        >
          <QrCode className="w-4 h-4" /> SCANNER UN ÉQUIPEMENT (QR CODE)
        </button>
      ) : (
        <div className="bg-black/50 p-2 rounded border border-indigo-500/50">
          <div id="qr-reader" className="w-full max-w-sm mx-auto bg-white" />
          <button type="button" onClick={() => setScanOuvert(false)} className="mt-2 w-full text-center text-xs text-red-400 py-2">
            Annuler le scan
          </button>
        </div>
      )}
      {erreur && <div className="text-[11px] text-amber-300 mt-1.5">{erreur}</div>}
    </div>
  );
}


/* ---------------------------------------------------------------------
   GENERATEUR D'ETIQUETTES QR -- equipements et points logistiques
   Le QR encode le TEXTE "LOC:<lieu>|MAT:<materiel>" (pas une URL) : c'est
   ce que lit le scanner du formulaire de demande. Scanne avec l'appareil
   photo natif du telephone, il affichera juste ce texte -> le scan doit se
   faire DEPUIS l'app (#logistique > Nouvelle demande > Scanner).
   Les etiquettes personnalisees sont conservees dans le navigateur
   (localStorage) : elles survivent aux rechargements sur ce poste.
   >>> IMPRIMER DEPUIS L'URL DE PRODUCTION, apres deploiement.
--------------------------------------------------------------------- */

const QR_KEY_LOCAL = "bfmf2026-qr-equipements";

function qrImg(texte, taille = 260) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${taille}x${taille}&margin=8&data=${encodeURIComponent(texte)}`;
}

function GenerateurQR() {
  const [etiquettes, setEtiquettes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(QR_KEY_LOCAL) || "[]"); } catch (e) { return []; }
  });
  const [lieu, setLieu] = useState(Object.keys(POINTS_GPS)[0]);
  const [materiel, setMateriel] = useState("");
  const [onglet, setOnglet] = useState("lieux"); // lieux | equipements

  function sauver(next) {
    setEtiquettes(next);
    try { localStorage.setItem(QR_KEY_LOCAL, JSON.stringify(next)); } catch (e) {}
  }
  function ajouter() {
    if (!materiel.trim()) return;
    sauver([...etiquettes, { id: "eq" + Date.now(), lieu, materiel: materiel.trim() }]);
    setMateriel("");
  }
  function supprimer(id) {
    sauver(etiquettes.filter((e) => e.id !== id));
  }

  return (
    <div className="print-root">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .qr-card { break-inside: avoid; page-break-inside: avoid; }
          body, .print-root { background: white !important; }
        }
      `}</style>

      <div className="no-print space-y-3 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-indigo-300" /> ÉTIQUETTES QR À COLLER
          </h2>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded ring-1 ring-white/20 text-slate-300 hover:text-white">
            <Printer className="w-3.5 h-3.5" /> Imprimer cette page
          </button>
        </div>

        <div className="flex gap-1.5">
          {[["lieux", `Par lieu (${Object.keys(POINTS_GPS).length})`], ["equipements", `Par équipement (${etiquettes.length})`]].map(([k, lab]) => (
            <button key={k} onClick={() => setOnglet(k)}
              className={`text-[11px] font-mono px-3 py-1.5 rounded-full ring-1 transition-colors ${
                onglet === k ? "ring-indigo-400/50 bg-indigo-400/10 text-indigo-300" : "ring-white/15 text-slate-400 hover:text-slate-200"
              }`}>
              {lab}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-500 leading-relaxed">
          Le scan se fait depuis l'app : <span className="text-slate-300">Nouvelle demande → SCANNER UN ÉQUIPEMENT</span>.
          La localisation (et le matériel si présent) se pré-remplit. Imprimer depuis l'URL de production, puis plastifier.
        </div>

        {onglet === "equipements" && (
          <div className="flex gap-2 flex-wrap items-end bg-[#151b23] ring-1 ring-white/10 rounded-lg p-3">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Lieu</div>
              <select className={inputCls} value={lieu} onChange={(e) => setLieu(e.target.value)}>
                {Object.keys(POINTS_GPS).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Équipement / matériel</div>
              <input className={inputCls} value={materiel} onChange={(e) => setMateriel(e.target.value)}
                placeholder="Ex: Tireuse n°2, Groupe électrogène A, Barrière Nadar lot 3"
                onKeyDown={(e) => { if (e.key === "Enter") ajouter(); }} />
            </div>
            <button onClick={ajouter} disabled={!materiel.trim()}
              className={`flex items-center gap-1.5 text-xs font-mono px-3 py-2.5 rounded transition-colors ${
                materiel.trim() ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-white/5 text-slate-600 cursor-not-allowed"
              }`}>
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>
        )}
      </div>

      {/* Grille imprimable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {onglet === "lieux" && Object.keys(POINTS_GPS).map((p) => (
          <div key={p} className="qr-card rounded-lg bg-white text-slate-900 p-4 text-center">
            <div className="font-display text-base tracking-wide">SIGNALER ICI</div>
            <div className="text-[10px] text-slate-600 mb-2">Panne, manque, incident — scanner depuis l'app logistique</div>
            <img src={qrImg(`LOC:${p}`)} alt={`QR ${p}`} className="mx-auto w-40 h-40" />
            <div className="mt-2 text-sm font-semibold">{p}</div>
            <div className="text-[9px] text-slate-500 mt-0.5 font-mono">LOC:{p}</div>
            <div className="text-[9px] text-slate-400 mt-1">BFMF 2026 · logistique</div>
          </div>
        ))}

        {onglet === "equipements" && etiquettes.length === 0 && (
          <div className="no-print col-span-full text-sm text-slate-500 text-center py-8 rounded-lg ring-1 ring-white/10 bg-[#151b23]">
            Aucune étiquette d'équipement. Ajoutez-en une ci-dessus.
          </div>
        )}

        {onglet === "equipements" && etiquettes.map((e) => (
          <div key={e.id} className="qr-card rounded-lg bg-white text-slate-900 p-4 text-center relative">
            <button onClick={() => supprimer(e.id)}
              className="no-print absolute top-2 right-2 text-slate-400 hover:text-red-500" title="Supprimer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="font-display text-base tracking-wide">SIGNALER CET ÉQUIPEMENT</div>
            <div className="text-[10px] text-slate-600 mb-2">Scanner depuis l'app logistique</div>
            <img src={qrImg(`LOC:${e.lieu}|MAT:${e.materiel}`)} alt={`QR ${e.materiel}`} className="mx-auto w-40 h-40" />
            <div className="mt-2 text-sm font-semibold">{e.materiel}</div>
            <div className="text-[11px] text-slate-600">{e.lieu}</div>
            <div className="text-[9px] text-slate-400 mt-1">BFMF 2026 · logistique</div>
          </div>
        ))}
      </div>
    </div>
  );
}
