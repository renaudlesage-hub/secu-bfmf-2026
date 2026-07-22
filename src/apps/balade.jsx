import React, { useState, useEffect, useCallback } from "react";
import {
  UserCheck,
  Footprints,
  Plus,
  X,
  Clock,
  Users,
  MapPin,
  ChevronRight,
  CheckCircle2,
  TriangleAlert,
  RefreshCw,
  Radio,
  Flag,
  Download,
  ArrowRight,
  Home,
  Trash2,
} from "lucide-react";

/* ---------------------------------------------------------------------
   SUIVI BALADE / CROWD MANAGEMENT -- BFMF 2026
   Suivi des groupes sur le parcours 6,5 km (Point 0 -> E1 -> E2 -> E3 -> retour).
   Objectif QG : savoir en permanence combien de personnes sont sur le
   parcours, où elles se trouvent, et si une étape approche de sa capacité.
   Données partagées entre tous les téléphones via Supabase (table app_store).
--------------------------------------------------------------------- */

const STORAGE_KEY = "bfmf2026-suivi-balade";
const ALERT_KEY = "bfmf2026-suivi-balade-alerte";
const PROFILE_KEY = "bfmf2026-profil";


// Positions successives d'un groupe sur le parcours
const POSITIONS = [
  { id: "p0", label: "Point 0 (départ)", court: "P0" },
  { id: "t1", label: "En transit -> Etape 1", court: "->E1" },
  { id: "e1", label: "Etape 1 - Rue Sainte-Barbe", court: "E1" },
  { id: "t2", label: "En transit -> Etape 2 (1,7 km)", court: "->E2" },
  { id: "e2", label: "Etape 2 - Rue de Jehonhe", court: "E2" },
  { id: "t3", label: "En transit -> Etape 3 (2,5 km)", court: "->E3" },
  { id: "e3", label: "Etape 3 - Rue de la Chapelle", court: "E3" },
  { id: "tr", label: "En transit -> retour Point 0", court: "->P0" },
  { id: "ret", label: "Rentré au Point 0", court: "Rentré" },
];

const CAPACITE_ETAPE = 300;
const SEUIL_VIGILANCE = 0.72; // 72%
const SEUIL_ALERTE = 0.9; // 90%

const VAGUES = ["Départ 1", "Départ 2", "Départ 3", "Hors vague"];

const GROUPES_DEMO = [
  {
    id: "g1",
    nom: "Groupe A",
    vague: "Départ 1",
    heureDepart: "13:30",
    participants: 120,
    encadrants: ["Enc. 1 (tête)", "Enc. 2", "Enc. 3", "Enc. 4 (serre-file)"],
    contactRadio: "PMR4.1 - call sign GA",
    position: "e2",
    heureRetour: "",
    historique: [
      { heure: "13:30", texte: "Départ Point 0 -- 120 participants, 4 encadrants" },
      { heure: "14:05", texte: "Arrivé Etape 1" },
      { heure: "14:50", texte: "Reparti vers Etape 2" },
      { heure: "15:20", texte: "Arrivé Etape 2" },
    ],
    notes: "",
  },
  {
    id: "g2",
    nom: "Groupe B",
    vague: "Départ 2",
    heureDepart: "14:15",
    participants: 95,
    encadrants: ["Enc. 5 (tête)", "Enc. 6", "Enc. 7", "Enc. 8 (serre-file)"],
    contactRadio: "PMR4.1 - call sign GB",
    position: "e1",
    heureRetour: "",
    historique: [
      { heure: "14:15", texte: "Départ Point 0 -- 95 participants, 4 encadrants" },
      { heure: "14:55", texte: "Arrivé Etape 1" },
    ],
    notes: "",
  },
];

/* ------------------------------ Helpers ------------------------------ */

function pad(n) {
  return n.toString().padStart(2, "0");
}
function nowHM() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function posIndex(id) {
  return POSITIONS.findIndex((p) => p.id === id);
}

/* ------------------------------ Supabase ------------------------------ */
import { ROLES } from "./referentiels";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";
import { envoyer as envoyerAvecFile, demarrerRejeu } from "./file-attente";

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

async function kvGet(key) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: SB_HEADERS, credentials: "omit" }
  );
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

async function loadGroupes() {
  try {
    return await kvGet(STORAGE_KEY);
  } catch (e) {
    return null;
  }
}
async function saveGroupes(g) {
  try {
    return await kvSet(STORAGE_KEY, g);
  } catch (e) {
    console.error("Erreur sauvegarde:", e);
    return false;
  }
}

let profilMemoire = null;
async function loadProfile() {
  try {
    const s = localStorage.getItem(PROFILE_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {}
  return profilMemoire;
}
async function saveProfile(p) {
  profilMemoire = p;
  try {
    if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROFILE_KEY);
  } catch (e) {}
  return true;
}

async function loadAlerte() {
  try {
    return await kvGet(ALERT_KEY);
  } catch (e) {}
  return null;
}
async function saveAlerte(a) {
  // Passe par la file d'attente : sur le parcours, des zones sont sans 4G.
  // Une alerte emise la-bas est conservee et rejouee au retour du reseau.
  return await envoyerAvecFile(ALERT_KEY, a, "ecriture"); // "transmis" | "en_attente" | "perdu"
}

/* ------------------------------ App ------------------------------ */

export default function SuiviBalade() {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [now, setNow] = useState(new Date());
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [alerte, setAlerte] = useState(null);
  const [showAlarme, setShowAlarme] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      setProfileLoaded(true);
    });
  }, []);

  const refresh = useCallback(async (initial = false) => {
    const [data, al] = await Promise.all([loadGroupes(), loadAlerte()]);
    if (data) setGroupes(data);
    else if (initial) {
      setGroupes(GROUPES_DEMO);
      await saveGroupes(GROUPES_DEMO);
    }
    setAlerte(al && al.active ? al : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh(true);
    const t = setInterval(() => refresh(false), alerte ? 5000 : 12000);
    return () => clearInterval(t);
  }, [refresh, alerte]);

  async function persist(next) {
    setGroupes(next);
    const ok = await saveGroupes(next);
    setSaveError(!ok);
  }

  const signature = profile ? `${profile.nom} (${profile.role})` : "?";

  function updateGroupe(id, changes, logTexte) {
    const next = groupes.map((g) => {
      if (g.id !== id) return g;
      const historique = logTexte
        ? [...(g.historique || []), { heure: nowHM(), texte: `${logTexte} -- par ${signature}` }]
        : g.historique;
      return { ...g, ...changes, historique };
    });
    persist(next);
    if (selected && selected.id === id) setSelected(next.find((g) => g.id === id));
  }

  function deleteGroupe(id) {
    const next = groupes.filter((g) => g.id !== id);
    persist(next);
    setSelected(null);
  }

  async function declencherAlerte(data) {
    const a = {
      active: true,
      heure: nowHM(),
      auteur: signature,
      groupe: data.groupe || "",
      motif: data.motif || "Alerte",
      lieu: data.lieu || "",
      qui: data.qui || "",
      details: data.details || "",
      acquittePar: "",
      heureAcquittement: "",
    };
    setAlerte(a);
    await saveAlerte(a);
    setShowAlarme(false);
  }

  async function acquitterAlerte() {
    if (!alerte) return;
    const a = { ...alerte, acquittePar: signature, heureAcquittement: nowHM() };
    setAlerte(a);
    await saveAlerte(a);
  }

  // NB : pas de fonction "lever l'alerte" ici. Clôturer une alerte est une
  // décision de commandement (vue d'ensemble), réservée au QG. L'encadrant
  // terrain peut UNIQUEMENT accuser réception ("Bien reçu").

  function avancer(id) {
    const g = groupes.find((x) => x.id === id);
    if (!g) return;
    const i = posIndex(g.position);
    if (i >= POSITIONS.length - 1) return;
    const nextPos = POSITIONS[i + 1];
    const changes = { position: nextPos.id };
    if (nextPos.id === "ret") changes.heureRetour = nowHM();
    updateGroupe(id, changes, `Position: ${nextPos.label}`);
  }

  function reculer(id) {
    const g = groupes.find((x) => x.id === id);
    if (!g) return;
    const i = posIndex(g.position);
    if (i <= 0) return;
    const prevPos = POSITIONS[i - 1];
    const changes = { position: prevPos.id };
    if (g.position === "ret") changes.heureRetour = "";
    updateGroupe(id, changes, `Correction position: ${prevPos.label}`);
  }

  function ajusterEffectif(id, delta, motif) {
    const g = groupes.find((x) => x.id === id);
    if (!g) return;
    const nv = Math.max(0, g.participants + delta);
    updateGroupe(id, { participants: nv }, `Effectif ${delta > 0 ? "+" : ""}${delta} (${motif}) -> ${nv}`);
  }

  function addGroupe(data) {
    const g = {
      ...data,
      id: `g${Date.now()}`,
      position: "p0",
      heureRetour: "",
      historique: [
        {
          heure: nowHM(),
          texte: `Groupe créé -- ${data.participants} participants, ${data.encadrants.filter(Boolean).length} encadrants`,
        },
      ],
      notes: "",
    };
    persist([...groupes, g]);
    setShowForm(false);
  }

  function demarrerDepart(id) {
    updateGroupe(id, { position: "t1", heureDepart: nowHM() }, `Départ Point 0 confirmed`);
  }

  /* ---- Agrégats crowd management ---- */
  const surParcours = groupes.filter((g) => g.position !== "p0" && g.position !== "ret");
  const totalSurParcours = surParcours.reduce((s, g) => s + g.participants, 0);
  const totalEncadrantsDehors = surParcours.reduce((s, g) => s + (g.encadrants || []).filter(Boolean).length, 0);
  const rentres = groupes.filter((g) => g.position === "ret");
  const enAttente = groupes.filter((g) => g.position === "p0");

  const parEtape = { e1: 0, e2: 0, e3: 0 };
  const enTransit = groupes
    .filter((g) => ["t1", "t2", "t3", "tr"].includes(g.position))
    .reduce((s, g) => s + g.participants, 0);
  groupes.forEach((g) => {
    if (parEtape[g.position] !== undefined) parEtape[g.position] += g.participants;
  });

  function etatEtape(n) {
    const ratio = n / CAPACITE_ETAPE;
    if (ratio >= SEUIL_ALERTE) return { label: "SATURE", cls: "text-red-300", bar: "bg-red-400", ring: "ring-red-400/40" };
    if (ratio >= SEUIL_VIGILANCE) return { label: "ELEVE", cls: "text-amber-300", bar: "bg-amber-400", ring: "ring-amber-400/40" };
    return { label: "OK", cls: "text-emerald-300", bar: "bg-emerald-400", ring: "ring-emerald-400/20" };
  }

  const alerteEtape = Object.values(parEtape).some((n) => n / CAPACITE_ETAPE >= SEUIL_ALERTE);

  if (profileLoaded && !profile) {
    return (
      <ProfilSetup
        onSave={async (p) => {
          setProfile(p);
          await saveProfile(p);
        }}
      />
    );
  }

  function exportCSV() {
    const cols = [
      ["Groupe", "nom"], ["Vague", "vague"], ["Heure depart", "heureDepart"],
      ["Participants", "participants"], ["Encadrants", "encadrants"],
      ["Contact radio", "contactRadio"], ["Position", "position"],
      ["Heure retour", "heureRetour"], ["Historique", "historique"], ["Notes", "notes"],
    ];
    const esc = (v) => {
      let s =
        v == null
          ? ""
          : Array.isArray(v)
          ? v.map((h) => (h && h.heure ? `${h.heure} ${h.texte}` : String(h))).join(" | ")
          : String(v);
      if (/[";\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const posLabel = (id) => (POSITIONS.find((p) => p.id === id) || {}).label || id;
    const lines = [
      cols.map((c) => esc(c[0])).join(";"),
      ...groupes.map((g) =>
        cols.map((c) => esc(c[1] === "position" ? posLabel(g.position) : g[c[1]])).join(";")
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suivi-balade-bfmf2026-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
              <Footprints className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="font-display tracking-wide text-[15px] leading-none truncate">SUIVI BALADE · CROWD MGMT</div>
              <div className="text-[11px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · PARCOURS 6,5 KM</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setShowAlarme(true)}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded ring-2 ring-red-400/60 bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors font-semibold"
              title="Déclencher une alerte visible par tous"
            >
              <TriangleAlert className="w-4 h-4" /> SOS
            </button>
            {alerteEtape && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full ring-1 ring-red-400/40 bg-red-400/10 text-red-300">
                <TriangleAlert className="w-3 h-3 pulse-slow" /> ETAPE SATUREE
              </span>
            )}
            <button onClick={() => refresh(false)} className="text-slate-500 hover:text-slate-200 transition-colors" title="Rafraîchir">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                setProfile(null);
                await saveProfile(null);
              }}
              className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-1.5 rounded ring-1 ring-white/15 text-slate-400 hover:text-slate-100 hover:ring-white/30 transition-colors max-w-[140px]"
              title="Changer de rôle / profil sur cet appareil"
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{profile ? profile.role : "Profil"}</span>
            </button>
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
              <TriangleAlert className="w-5 h-5 text-red-300 pulse-slow shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-display text-red-200 text-sm tracking-wide">
                  ALERTE EN COURS — {alerte.motif}
                </div>
                <div className="text-xs text-red-200/80 mt-1">
                  Déclenchée à {alerte.heure} par {alerte.auteur}
                  {alerte.groupe ? ` · ${alerte.groupe}` : ""}
                  {alerte.details ? ` — ${alerte.details}` : ""}
                </div>
                {alerte.acquittePar && (
                  <div className="text-[11px] font-mono text-red-200/60 mt-1">
                    Acquittée par {alerte.acquittePar} à {alerte.heureAcquittement}
                  </div>
                )}
                <div className="text-[11px] font-mono text-red-200/60 mt-1.5">
                  Rappel : urgence vitale = 112 en priorité + PMR333. Cette alerte ne remplace pas la radio.
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {!alerte.acquittePar && (
                  <button
                    onClick={acquitterAlerte}
                    className="text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-red-300/50 text-red-100 hover:bg-red-400/20"
                  >
                    Bien reçu
                  </button>
                )}
                {alerte.acquittePar && (
                  <span className="text-[10px] font-mono text-red-200/50 text-center leading-tight">
                    Clôture<br />par le QG
                  </span>
                )}
                {/* Pas de bouton "Lever l'alerte" cote terrain : cloturer est
                    une decision de commandement, reservee au QG. L'encadrant
                    accuse reception ("Bien recu"), le QG cloture. */}
              </div>
            </div>
          </div>
        )}
        {saveError && (
          <div className="rounded-md bg-red-400/10 ring-1 ring-red-400/30 text-red-300 text-xs px-3 py-2">
            Sauvegarde impossible -- vérifiez la connexion.
          </div>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi label="Sur le parcours" value={totalSurParcours} sub={`${surParcours.length} groupe(s)`} accent="text-amber-300" icon={<Footprints className="w-4 h-4" />} />
          <Kpi label="Encadrants dehors" value={totalEncadrantsDehors} sub="min. 4 / groupe" accent={surParcours.some((g) => (g.encadrants || []).filter(Boolean).length < 4) ? "text-red-300" : "text-emerald-300"} icon={<Users className="w-4 h-4" />} />
          <Kpi label="En transit" value={enTransit} sub="entre les étapes" accent="text-slate-200" icon={<ArrowRight className="w-4 h-4" />} />
          <Kpi label="Rentrés" value={rentres.reduce((s, g) => s + g.participants, 0)} sub={`${rentres.length} groupe(s) / ${enAttente.length} en attente`} accent="text-slate-200" icon={<Home className="w-4 h-4" />} />
        </section>

        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-slate-500" /> OCCUPATION DES ETAPES
            <span className="text-[10px] font-mono text-slate-500 font-normal">cap. {CAPACITE_ETAPE} / étape</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["e1", "e2", "e3"].map((eid, idx) => {
              const n = parEtape[eid];
              const et = etatEtape(n);
              const pct = Math.min(100, Math.round((n / CAPACITE_ETAPE) * 100));
              return (
                <div key={eid} className={`rounded-md bg-white/[0.03] ring-1 ring-white/10 p-3 ${et.ring}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-200">Etape {idx + 1}</span>
                    <span className={`font-mono text-xs ${et.cls}`}>{et.label}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full ${et.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1.5 font-mono text-[11px] text-slate-500">
                    {n} / {CAPACITE_ETAPE} ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] font-mono text-slate-500">
            {groupes.length} groupe(s) · rafraîchissement auto 12 s
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded ring-1 ring-white/15 text-slate-400 hover:text-slate-200 hover:ring-white/30 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded ring-1 ring-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nouveau groupe
            </button>
          </div>
        </div>

        <section className="space-y-2">
          {loading && <div className="text-sm text-slate-500 py-8 text-center">Chargement...</div>}
          {!loading && groupes.length === 0 && (
            <div className="text-sm text-slate-500 py-8 text-center rounded-lg ring-1 ring-white/10 bg-[#151b23]">
              Aucun groupe. Créez le premier départ.
            </div>
          )}
          {groupes.map((g) => {
            const i = posIndex(g.position);
            const pos = POSITIONS[i];
            const rentre = g.position === "ret";
            const auDepart = g.position === "p0";
            const nbEnc = (g.encadrants || []).filter(Boolean).length;
            return (
              <div key={g.id} className={`rounded-lg ring-1 bg-[#151b23] p-3.5 ${rentre ? "ring-white/5 opacity-70" : "ring-white/10"}`}>
                {/* CORRECTIF : Toujours cliquable pour ouvrir la fiche de détails, même si rentré */}
                <button onClick={() => setSelected(g)} className="w-full text-left">
                  <div className="flex items-center gap-3">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rentre ? "bg-slate-500" : auDepart ? "bg-sky-400" : "bg-amber-400"}`} />
                    <span className="text-sm font-medium text-slate-200">{g.nom}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded ring-1 ring-white/15 text-slate-400">{g.vague}</span>
                    <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {g.participants}
                    </span>
                    {nbEnc < 4 && !rentre && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded ring-1 ring-red-400/30 bg-red-400/10 text-red-300">
                        {nbEnc} enc.
                      </span>
                    )}
                    <span className="flex-1" />
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  </div>
                </button>

                <div className="mt-2.5 pl-[18px] flex items-center gap-1 overflow-x-auto pb-1">
                  {POSITIONS.map((p, pi) => (
                    <React.Fragment key={p.id}>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap ${
                          pi === i
                            ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/50"
                            : pi < i
                            ? "text-slate-500"
                            : "text-slate-700"
                        }`}
                      >
                        {p.court}
                      </span>
                      {pi < POSITIONS.length - 1 && <span className={`text-[9px] ${pi < i ? "text-slate-500" : "text-slate-700"}`}>·</span>}
                    </React.Fragment>
                  ))}
                </div>

                <div className="mt-2 pl-[18px] flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {rentre ? `Rentré à ${g.heureRetour}` : pos.label}
                    {!rentre && !auDepart && g.heureDepart ? ` · parti à ${g.heureDepart}` : ""}
                  </span>
                  <span className="flex-1" />
                  {auDepart && (
                    <button
                      onClick={() => demarrerDepart(g.id)}
                      className="text-[11px] font-mono px-2.5 py-1 rounded ring-1 ring-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 transition-colors"
                    >
                      Confirmer le départ
                    </button>
                  )}
                  {!auDepart && !rentre && (
                    <button
                      onClick={() => avancer(g.id)}
                      className="text-[11px] font-mono px-2.5 py-1 rounded ring-1 ring-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-colors flex items-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" /> {POSITIONS[i + 1] ? POSITIONS[i + 1].court : ""}
                    </button>
                  )}
                  {rentre && (
                    <button
                      onClick={() => setSelected(g)}
                      className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-white/5 rounded px-2 py-0.5 border border-white/5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Corriger / Détails
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <div className="text-[10px] text-slate-600 font-mono text-center pt-2">
          Données partagées entre tous les utilisateurs (QG + encadrants). L'encadrant de tête met à jour la position, le QG garde la vision d'ensemble.
        </div>
      </main>

      {showForm && <FormGroupe onClose={() => setShowForm(false)} onSubmit={addGroupe} />}
      {showAlarme && (
        <AlarmeForm groupes={groupes} onClose={() => setShowAlarme(false)} onDeclencher={declencherAlerte} />
      )}
      {selected && (
        <GroupeDetail
          groupe={groupes.find((g) => g.id === selected.id) || selected}
          onClose={() => setSelected(null)}
          onAvancer={avancer}
          onReculer={reculer}
          onAjuster={ajusterEffectif}
          onDelete={deleteGroupe}
        />
      )}
    </div>
  );
}

/* --------------------------- Sous-composants --------------------------- */

function Kpi({ label, value, sub, accent, icon }) {
  return (
    <div className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 tracking-wide uppercase">
        {icon}
        {label}
      </div>
      <div className={`font-display text-2xl mt-0.5 ${accent}`}>{value}</div>
      <div className="text-[11px] text-slate-500">{sub}</div>
    </div>
  );
}

function ProfilSetup({ onSave }) {
  const [nom, setNom] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const valid = nom.trim().length >= 2;
  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans flex items-center justify-center p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=500;600;700&family=Inter:wght=400;500;600;700&family=JetBrains+Mono:wght=400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>
      <div className="bg-[#1a212b] ring-1 ring-white/15 rounded-lg w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center">
            <Footprints className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="font-display tracking-wide text-white">SUIVI BALADE BFMF 2026</div>
            <div className="text-[11px] text-slate-400 font-mono">Identifiez-vous pour commencer</div>
          </div>
        </div>
        <div className="space-y-3">
          <Field label="Votre nom / call sign *">
            <input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: J. Dupont ou GA-tête" />
          </Field>
          <Field label="Votre rôle">
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="text-[11px] text-slate-500 mt-3 leading-relaxed">
          Ce profil est mémorisé sur cet appareil et signe toutes vos actions (positions, effectifs, alertes). Il ne s'agit pas d'une authentification sécurisée : l'app reste réservée à l'équipe.
        </div>
        <button
          disabled={!valid}
          onClick={() => onSave({ nom: nom.trim(), role })}
          className={`w-full mt-4 text-sm font-mono px-4 py-2.5 rounded ring-1 transition-colors ${
            valid
              ? "ring-emerald-400/60 bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30"
              : "ring-white/10 text-slate-600 cursor-not-allowed"
          }`}
        >
          Commencer
        </button>
      </div>
    </div>
  );
}

const LIEUX_PARCOURS = [
  "Point 0 / Départ", "Point 0 → Étape 1", "Étape 1 (Sainte-Barbe)",
  "Étape 1 → Étape 2", "Étape 2 (Jehonhé)", "Étape 2 → Étape 3",
  "Étape 3 (Chapelle)", "Étape 3 → Retour", "Hors parcours",
];

const MOTIFS_ALERTE = [
  "Urgence médicale",
  "Personne manquante",
  "Groupe en difficulté",
  "Danger sur le parcours",
  "Météo — mise à l'abri",
  "Autre",
];

function AlarmeForm({ groupes, onClose, onDeclencher }) {
  const [motif, setMotif] = useState(MOTIFS_ALERTE[0]);
  const [groupe, setGroupe] = useState("");
  const [lieu, setLieu] = useState(LIEUX_PARCOURS[0]);
  const [qui, setQui] = useState("");
  const [details, setDetails] = useState("");
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#1a212b] ring-2 ring-red-400/50 rounded-lg w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-display text-xl text-red-200 flex items-center gap-2">
            <TriangleAlert className="w-5 h-5" /> Déclencher une alerte
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-[11px] text-red-200/70 mb-4 leading-relaxed">
          L'alerte s'affiche sur tous les appareils connectés (délai de quelques secondes). Pour une urgence vitale : 112 d'abord, puis PMR333. Cet outil complète la radio, il ne la remplace pas.
        </div>
        <div className="space-y-3">
          <Field label="Motif *">
            <select className={inputCls} value={motif} onChange={(e) => setMotif(e.target.value)}>
              {MOTIFS_ALERTE.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Groupe concerné">
            <select className={inputCls} value={groupe} onChange={(e) => setGroupe(e.target.value)}>
              <option value="">-- Aucun / général --</option>
              {groupes.map((g) => (
                <option key={g.id} value={g.nom}>{g.nom}</option>
              ))}
            </select>
          </Field>
          <Field label="Localisation *">
            <select className={inputCls} value={lieu} onChange={(e) => setLieu(e.target.value)}>
              {LIEUX_PARCOURS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Qui est concerné">
            <input className={inputCls} value={qui} onChange={(e) => setQui(e.target.value)}
              placeholder="Ex: marcheur du groupe B, encadrant, riverain..." />
          </Field>
          <Field label="Détails (localisation, situation)">
            <textarea
              className={inputCls}
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Ex: entre E1 et E2, près du bois"
            />
          </Field>
        </div>
        <button
          onClick={() => onDeclencher({ motif, groupe, lieu, qui: qui.trim(), details })}
          className="w-full mt-4 text-sm font-mono font-semibold px-4 py-3 rounded ring-2 ring-red-400/70 bg-red-500/25 text-red-100 hover:bg-red-500/40 transition-colors"
        >
          DECLENCHER L'ALERTE
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-2.5 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60";

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function FormGroupe({ onClose, onSubmit }) {
  const [nom, setNom] = useState("");
  const [vague, setVague] = useState(VAGUES[0]);
  const [participants, setParticipants] = useState(50);
  const [encadrants, setEncadrants] = useState(["", "", "", ""]);
  const [contactRadio, setContactRadio] = useState("");

  const handleEncadrantChange = (index, value) => {
    const updated = [...encadrants];
    updated[index] = value;
    setEncadrants(updated);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!nom.trim()) return;
    onSubmit({
      nom: nom.trim(),
      vague,
      participants: parseInt(participants, 10) || 0,
      encadrants: encadrants.filter(Boolean),
      contactRadio: contactRadio.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#1a212b] ring-1 ring-white/15 rounded-lg w-full max-w-md p-5 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" /> Créer un nouveau groupe
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Field label="Nom du groupe *">
            <input required className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Groupe C" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vague de départ">
              <select className={inputCls} value={vague} onChange={(e) => setVague(e.target.value)}>
                {VAGUES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Nombre de participants">
              <input type="number" min="1" className={inputCls} value={participants} onChange={(e) => setParticipants(e.target.value)} />
            </Field>
          </div>

          <Field label="Contact / Canal Radio">
            <input className={inputCls} value={contactRadio} onChange={(e) => setContactRadio(e.target.value)} placeholder="Ex: PMR 4.1" />
          </Field>

          <div className="space-y-2">
            <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide">Encadrants (min. 4 recommandés)</div>
            {encadrants.map((enc, idx) => (
              <input
                key={idx}
                className={inputCls}
                value={enc}
                onChange={(e) => handleEncadrantChange(idx, e.target.value)}
                placeholder={idx === 0 ? "Responsable tête de groupe" : idx === 3 ? "Responsable serre-file" : `Encadrant ${idx + 1}`}
              />
            ))}
          </div>

          <button type="submit" className="w-full mt-2 text-sm font-mono font-semibold px-4 py-3 rounded ring-1 ring-emerald-400/50 bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30 transition-colors">
            VALIDER ET REJOINDRE LE PARCOURS
          </button>
        </form>
      </div>
    </div>
  );
}

function GroupeDetail({ groupe, onClose, onAvancer, onReculer, onAjuster, onDelete }) {
  const i = posIndex(groupe.position);
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#1a212b] ring-1 ring-white/15 rounded-lg w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display text-xl text-white">{groupe.nom}</h3>
            <p className="text-xs text-slate-400 font-mono">
              {groupe.vague} · {groupe.participants} personnes · Position : <span className="text-amber-300 font-semibold">{(POSITIONS[i] || {}).label || groupe.position}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 my-4">
          {/* CORRECTIF : Les contrôles de position restent accessibles pour corriger une erreur d'avancement, même à la fin */}
          <div className="flex gap-2">
            <button 
              disabled={i <= 0}
              onClick={() => onReculer(groupe.id)} 
              className="flex-1 text-xs font-mono py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Reculer position
            </button>
            <button 
              disabled={i >= POSITIONS.length - 1}
              onClick={() => onAvancer(groupe.id)} 
              className="flex-1 text-xs font-mono py-2.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Avancer position →
            </button>
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase mb-1.5">Ajuster effectif</div>
            <div className="flex gap-2">
              <button onClick={() => onAjuster(groupe.id, -5, "Correction manuelle")} className="flex-1 text-xs font-mono py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">-5</button>
              <button onClick={() => onAjuster(groupe.id, -1, "Correction manuelle")} className="flex-1 text-xs font-mono py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">-1</button>
              <button onClick={() => onAjuster(groupe.id, 1, "Correction manuelle")} className="flex-1 text-xs font-mono py-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">+1</button>
              <button onClick={() => onAjuster(groupe.id, 5, "Correction manuelle")} className="flex-1 text-xs font-mono py-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">+5</button>
            </div>
          </div>

          {groupe.historique && (
            <div className="border-t border-white/10 pt-3 max-h-32 overflow-y-auto">
              <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Historique tactique</div>
              <div className="space-y-1">
                {groupe.historique.slice().reverse().map((h, idx) => (
                  <div key={idx} className="text-[11px] font-mono text-slate-400 leading-tight">
                    <span className="text-amber-400/70 mr-1">[{h.heure}]</span> {h.texte}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CORRECTIF : Bouton de suppression toujours actif en bas de la fiche */}
        <div className="border-t border-white/10 pt-3 flex justify-end">
          <button
            onClick={() => {
              if (confirm(`Supprimer définitivement le ${groupe.nom} du système Supabase ?`)) {
                onDelete(groupe.id);
              }
            }}
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Supprimer définitivement le groupe
          </button>
        </div>
      </div>
    </div>
  );
}