import React, { useState, useEffect, useCallback } from "react";
import { UserSearch, Clock, RefreshCw, CheckCircle2, X, MapPin, Phone, TriangleAlert } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/* ---------------------------------------------------------------------
   ENFANT PERDU / PERSONNE RECHERCHEE -- BFMF 2026
   Signalement structure diffuse instantanement a TOUTES les apps equipes
   (bandeau general). Cloture "retrouve" qui leve l'alerte partout.
   Point de regroupement convenu : ACCUEIL POINT 0.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const KEY_RECH = "bfmf2026-recherche";
const PROFILE_KEY = "bfmf2026-profil";

async function kvGet(key) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(key)}&select=value`, { headers: SB_HEADERS });
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
let profilMemoire = null;
async function loadProfile() {
  try { const s = localStorage.getItem(PROFILE_KEY); if (s) return JSON.parse(s); } catch (e) {}
  return profilMemoire;
}
async function saveProfile(p) {
  profilMemoire = p;
  try { p ? localStorage.setItem(PROFILE_KEY, JSON.stringify(p)) : localStorage.removeItem(PROFILE_KEY); } catch (e) {}
}
function pad(n) { return String(n).padStart(2, "0"); }
function nowHM() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

const LIEUX_VUE = [
  "Point 0 / accueil", "Scene 1", "Scene 2", "Foodtrucks / bars", "Parking",
  "Parcours : Point 0 -> E1", "Etape 1", "Parcours : E1 -> E2", "Etape 2",
  "Parcours : E2 -> E3", "Etape 3", "Parcours : E3 -> retour", "Inconnu",
];

const inputCls = "w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-2.5 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400/60";

export default function EnfantPerdu() {
  const [recherches, setRecherches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sbError, setSbError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { loadProfile().then((p) => { setProfile(p); setProfileLoaded(true); }); }, []);

  const refresh = useCallback(async () => {
    try {
      const d = await kvGet(KEY_RECH);
      setRecherches(Array.isArray(d) ? d : []);
      setSbError(false);
    } catch (e) { setSbError(true); }
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 8000); return () => clearInterval(t); }, [refresh]);

  const signature = profile ? `${profile.nom} (${profile.role})` : "?";

  async function persist(next) {
    setRecherches(next);
    const ok = await kvSet(KEY_RECH, next);
    setSbError(!ok);
  }

  function creer(f) {
    const r = {
      id: "rch" + Date.now(),
      heure: nowHM(),
      date: new Date().toISOString(),
      statut: "active", // active | retrouve | close
      categorie: f.categorie,
      prenom: f.prenom.trim(),
      age: f.age.trim(),
      description: f.description.trim(),
      dernierLieu: f.dernierLieu,
      heureDerniereVue: f.heureDerniereVue.trim(),
      contactProche: f.contactProche.trim(),
      creePar: signature,
      historique: [{ heure: nowHM(), texte: `Recherche lancee par ${signature}` }],
    };
    persist([r, ...recherches].slice(0, 50));
    setShowForm(false);
  }

  function retrouve(r) {
    const lieu = prompt("Ou la personne a-t-elle ete retrouvee ? (facultatif)") || "";
    persist(recherches.map((x) => x.id === r.id ? {
      ...x, statut: "retrouve", heureRetrouve: nowHM(),
      historique: [...x.historique, { heure: nowHM(), texte: `RETROUVE(E)${lieu ? " — " + lieu : ""} — par ${signature}` }],
    } : x));
  }
  function clore(r) {
    persist(recherches.map((x) => x.id === r.id ? {
      ...x, statut: "close",
      historique: [...x.historique, { heure: nowHM(), texte: `Dossier clos (remise effectuee) — ${signature}` }],
    } : x));
  }
  function ajouterInfo(r) {
    const info = prompt("Information a ajouter (signalement, zone verifiee...) :");
    if (!info || !info.trim()) return;
    persist(recherches.map((x) => x.id === r.id ? {
      ...x, historique: [...x.historique, { heure: nowHM(), texte: `${info.trim()} — ${signature}` }],
    } : x));
  }

  if (profileLoaded && !profile) {
    return (
      <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans flex items-center justify-center p-4">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');.font-display{font-family:'Oswald',sans-serif;}`}</style>
        <div className="bg-[#1a212b] ring-1 ring-white/15 rounded-lg w-full max-w-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserSearch className="w-6 h-6 text-red-300" />
            <div className="font-display tracking-wide text-white">PERSONNE RECHERCHEE</div>
          </div>
          <input id="ep-nom" className={inputCls + " mb-2"} placeholder="Votre nom *" />
          <input id="ep-role" className={inputCls} placeholder="Fonction (ex: Accueil Point 0)" />
          <button
            onClick={async () => {
              const nom = document.getElementById("ep-nom").value.trim();
              const role = document.getElementById("ep-role").value.trim() || "Equipe";
              if (nom.length < 2) return;
              const p = { nom, role };
              setProfile(p); await saveProfile(p);
            }}
            className="w-full mt-4 text-sm font-mono px-4 py-2.5 rounded ring-1 ring-emerald-400/60 bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30"
          >Commencer</button>
        </div>
      </div>
    );
  }

  const actives = recherches.filter((r) => r.statut === "active");
  const retrouves = recherches.filter((r) => r.statut !== "active");

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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-red-400/10 ring-1 ring-red-400/30 flex items-center justify-center">
              <UserSearch className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-[15px] leading-none">PERSONNE RECHERCHEE</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · REGROUPEMENT : ACCUEIL POINT 0</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="text-slate-500 hover:text-slate-200"><RefreshCw className="w-4 h-4" /></button>
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />{pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {sbError && <div className="rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 text-xs px-3 py-2">Reseau instable.</div>}

        <button onClick={() => setShowForm(true)}
          className="w-full py-4 rounded-lg ring-2 ring-red-400/60 bg-red-500/20 text-red-100 font-display text-lg tracking-wider hover:bg-red-500/30 active:scale-[0.99] transition-all">
          + LANCER UNE RECHERCHE
        </button>
        <div className="text-[11px] text-slate-500 text-center -mt-2">
          La recherche s'affiche immediatement sur toutes les apps equipes. Doubler a la radio (PMR4.1). Si enfant non retrouve sous 15 min : 112/101.
        </div>

        {/* Recherches actives */}
        {actives.map((r) => (
          <div key={r.id} className="rounded-lg ring-2 ring-red-400/50 bg-red-500/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TriangleAlert className="w-4 h-4 text-red-300 pulse-slow" />
              <span className="font-display text-red-200 tracking-wide">{r.categorie.toUpperCase()} — {r.prenom || "?"}{r.age ? `, ${r.age}` : ""}</span>
              <span className="flex-1" />
              <span className="font-mono text-[11px] text-red-200/70">depuis {r.heure}</span>
            </div>
            <div className="text-sm text-slate-100 whitespace-pre-wrap">{r.description}</div>
            <div className="text-xs text-slate-300 mt-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-300" /> Vu(e) : {r.dernierLieu}{r.heureDerniereVue ? ` vers ${r.heureDerniereVue}` : ""}
            </div>
            {r.contactProche && (
              <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Proche : {r.contactProche}
              </div>
            )}
            <div className="mt-2 max-h-24 overflow-y-auto space-y-0.5">
              {r.historique.slice().reverse().map((h, i) => (
                <div key={i} className="text-[11px] text-slate-400"><span className="font-mono text-slate-600">{h.heure}</span> {h.texte}</div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => ajouterInfo(r)} className="text-[11px] font-mono px-2.5 py-2 rounded ring-1 ring-white/25 text-slate-300 hover:text-white">+ Info</button>
              <button onClick={() => retrouve(r)} className="flex-1 text-sm font-mono px-3 py-2 rounded ring-2 ring-emerald-400/60 bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30 font-semibold">
                ✓ RETROUVE(E)
              </button>
            </div>
          </div>
        ))}
        {actives.length === 0 && !loading && (
          <div className="text-sm text-slate-500 text-center py-6 rounded-lg ring-1 ring-white/10 bg-[#151b23] flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Aucune recherche en cours.
          </div>
        )}

        {/* Historique */}
        {retrouves.length > 0 && (
          <section className="space-y-1.5">
            <div className="text-[11px] font-mono text-slate-500 uppercase">Cloturees ({retrouves.length})</div>
            {retrouves.slice(0, 10).map((r) => (
              <div key={r.id} className="rounded-md px-3 py-2 ring-1 ring-white/10 bg-white/[0.02] opacity-80">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span className="text-slate-300">{r.prenom || "?"}{r.age ? `, ${r.age}` : ""}</span>
                  <span className="text-slate-500 font-mono">{r.heure} → {r.heureRetrouve || "—"}</span>
                  <span className="flex-1" />
                  {r.statut === "retrouve" && (
                    <button onClick={() => clore(r)} className="text-[10px] font-mono text-slate-500 hover:text-slate-300 underline">clore</button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {showForm && <FormRecherche onClose={() => setShowForm(false)} onSubmit={creer} />}
    </div>
  );
}

function FormRecherche({ onClose, onSubmit }) {
  const [f, setF] = useState({
    categorie: "Enfant", prenom: "", age: "", description: "",
    dernierLieu: LIEUX_VUE[0], heureDerniereVue: "", contactProche: "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.description.trim().length >= 10;
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#1a212b] ring-2 ring-red-400/40 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display text-xl text-red-200">Lancer une recherche</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <select className={inputCls} value={f.categorie} onChange={set("categorie")}>
              <option>Enfant</option><option>Adulte vulnerable</option><option>Adulte</option>
            </select>
            <input className={inputCls} value={f.prenom} onChange={set("prenom")} placeholder="Prenom" />
            <input className={inputCls} value={f.age} onChange={set("age")} placeholder="Age" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide mb-1">Description (vetements, taille, cheveux...) *</div>
            <textarea className={inputCls} rows={3} value={f.description} onChange={set("description")}
              placeholder="Ex: garcon ~1m20, t-shirt jaune, short bleu, cheveux blonds, sac a dos rouge" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide mb-1">Vu(e) pour la derniere fois</div>
              <select className={inputCls} value={f.dernierLieu} onChange={set("dernierLieu")}>
                {LIEUX_VUE.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide mb-1">Vers quelle heure</div>
              <input className={inputCls} value={f.heureDerniereVue} onChange={set("heureDerniereVue")} placeholder="Ex: 15h30" />
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide mb-1">Proche sur place (nom + GSM)</div>
            <input className={inputCls} value={f.contactProche} onChange={set("contactProche")} placeholder="Ex: maman — 0470 12 34 56" />
          </div>
        </div>
        <button disabled={!valid} onClick={() => onSubmit(f)}
          className={`w-full mt-4 py-3 rounded-lg font-display tracking-wider text-lg transition-all ${valid ? "ring-2 ring-red-400/70 bg-red-500/25 text-red-100 hover:bg-red-500/40" : "ring-1 ring-white/10 text-slate-600 cursor-not-allowed"}`}>
          DIFFUSER A TOUTES LES EQUIPES
        </button>
        <div className="text-[10px] text-slate-500 text-center mt-2">
          Donnees minimales, effacees apres l'evenement (RGPD). Pas de photo dans l'app : description precise uniquement.
        </div>
      </div>
    </div>
  );
}
