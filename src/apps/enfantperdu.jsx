import React, { useState, useEffect, useCallback } from "react";
import { BookText, Clock, RefreshCw, Download, Star, Radio, ShieldAlert, Megaphone, Info, TriangleAlert } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/* ---------------------------------------------------------------------
   MAIN COURANTE QG -- BFMF 2026
   Journal chronologique unifie de l'evenement : chaque fait notable
   horodate et signe. Outil central du PC, base de la releve et du REX.
   Lecture par le PC-Ops possible (meme cle).
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const KEY_MC = "bfmf2026-main-courante";
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

const TYPES = [
  { id: "info", label: "Information", icon: Info, cls: "text-sky-300", ring: "ring-sky-400/30" },
  { id: "radio", label: "Message radio", icon: Radio, cls: "text-slate-300", ring: "ring-white/20" },
  { id: "decision", label: "Decision QG", icon: Megaphone, cls: "text-amber-300", ring: "ring-amber-400/40" },
  { id: "incident", label: "Incident", icon: TriangleAlert, cls: "text-red-300", ring: "ring-red-400/40" },
  { id: "consigne", label: "Consigne / releve", icon: ShieldAlert, cls: "text-emerald-300", ring: "ring-emerald-400/40" },
];

export default function MainCourante() {
  const [entrees, setEntrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sbError, setSbError] = useState(false);
  const [texte, setTexte] = useState("");
  const [type, setType] = useState("info");
  const [important, setImportant] = useState(false);
  const [filtre, setFiltre] = useState("tous");
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { loadProfile().then((p) => { setProfile(p); setProfileLoaded(true); }); }, []);

  const refresh = useCallback(async () => {
    try {
      const d = await kvGet(KEY_MC);
      setEntrees(Array.isArray(d) ? d : []);
      setSbError(false);
    } catch (e) { setSbError(true); }
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 12000); return () => clearInterval(t); }, [refresh]);

  async function ajouter() {
    if (!texte.trim()) return;
    const e = {
      id: "mc" + Date.now(),
      heure: nowHM(),
      date: new Date().toISOString(),
      type, important,
      texte: texte.trim(),
      auteur: profile ? `${profile.nom} (${profile.role})` : "?",
    };
    const next = [e, ...entrees].slice(0, 500);
    setEntrees(next);
    setTexte(""); setImportant(false);
    const ok = await kvSet(KEY_MC, next);
    setSbError(!ok);
  }

  function exportCSV() {
    const lignes = [["Date", "Heure", "Type", "Important", "Texte", "Auteur"].join(";")];
    [...entrees].reverse().forEach((e) => {
      const esc = (s) => /[";\n]/.test(s || "") ? '"' + String(s).replace(/"/g, '""') + '"' : (s || "");
      lignes.push([e.date ? e.date.slice(0, 10) : "", e.heure, e.type, e.important ? "OUI" : "", esc(e.texte), esc(e.auteur)].join(";"));
    });
    const blob = new Blob(["\uFEFF" + lignes.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `main-courante-bfmf2026-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (profileLoaded && !profile) {
    return (
      <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans flex items-center justify-center p-4">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');.font-display{font-family:'Oswald',sans-serif;}`}</style>
        <div className="bg-[#1a212b] ring-1 ring-white/15 rounded-lg w-full max-w-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <BookText className="w-6 h-6 text-amber-300" />
            <div className="font-display tracking-wide text-white">MAIN COURANTE QG</div>
          </div>
          <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide mb-1.5">Nom + fonction *</div>
          <input id="mc-nom" className="w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-2.5 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60 mb-2" placeholder="Nom (ex: R. Lesage)" />
          <input id="mc-role" className="w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-2.5 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60" placeholder="Fonction (ex: QG / PCE)" />
          <button
            onClick={async () => {
              const nom = document.getElementById("mc-nom").value.trim();
              const role = document.getElementById("mc-role").value.trim() || "QG";
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

  const visibles = entrees.filter((e) => filtre === "tous" ? true : filtre === "important" ? e.important : e.type === filtre);

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <header className="border-b border-white/10 bg-[#151b23]/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center">
              <BookText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-[15px] leading-none">MAIN COURANTE QG</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · JOURNAL OFFICIEL DE L'EVENEMENT</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="text-slate-500 hover:text-slate-200" title="Export CSV"><Download className="w-4 h-4" /></button>
            <button onClick={refresh} className="text-slate-500 hover:text-slate-200" title="Rafraichir"><RefreshCw className="w-4 h-4" /></button>
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />{pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {sbError && <div className="rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 text-xs px-3 py-2">Reseau instable — entree possiblement non synchronisee.</div>}

        {/* Saisie */}
        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4 space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {TYPES.map((t) => {
              const Ic = t.icon;
              return (
                <button key={t.id} onClick={() => setType(t.id)}
                  className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded-full ring-1 transition-colors ${type === t.id ? `${t.ring} bg-white/5 ${t.cls}` : "ring-white/10 text-slate-500 hover:text-slate-300"}`}>
                  <Ic className="w-3 h-3" /> {t.label}
                </button>
              );
            })}
          </div>
          <textarea
            className="w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-2.5 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
            rows={2} value={texte} onChange={(e) => setTexte(e.target.value)}
            placeholder="Fait, decision, message... (qui, quoi, ou)"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) ajouter(); }}
          />
          <div className="flex items-center gap-2">
            <button onClick={() => setImportant(!important)}
              className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-2 rounded ring-1 transition-colors ${important ? "ring-amber-400/50 bg-amber-400/15 text-amber-200" : "ring-white/15 text-slate-500"}`}>
              <Star className={`w-3.5 h-3.5 ${important ? "fill-amber-300 text-amber-300" : ""}`} /> Important
            </button>
            <button onClick={ajouter} disabled={!texte.trim()}
              className={`flex-1 py-2.5 rounded font-display tracking-wider text-sm transition-all ${texte.trim() ? "ring-2 ring-emerald-400/60 bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30" : "ring-1 ring-white/10 text-slate-600 cursor-not-allowed"}`}>
              INSCRIRE AU JOURNAL — {nowHM()}
            </button>
          </div>
        </section>

        {/* Filtres */}
        <div className="flex gap-1.5 flex-wrap">
          {[["tous", `Tout (${entrees.length})`], ["important", "★ Importants"], ...TYPES.map((t) => [t.id, t.label])].map(([k, lab]) => (
            <button key={k} onClick={() => setFiltre(k)}
              className={`text-[11px] font-mono px-2.5 py-1 rounded-full ring-1 transition-colors ${filtre === k ? "ring-amber-400/40 bg-amber-400/10 text-amber-300" : "ring-white/15 text-slate-500 hover:text-slate-300"}`}>
              {lab}
            </button>
          ))}
        </div>

        {/* Journal */}
        <section className="space-y-1.5">
          {loading && <div className="text-sm text-slate-500 text-center py-6">Chargement...</div>}
          {!loading && visibles.length === 0 && <div className="text-sm text-slate-500 text-center py-8 rounded-lg ring-1 ring-white/10 bg-[#151b23]">Journal vide.</div>}
          {visibles.map((e) => {
            const t = TYPES.find((x) => x.id === e.type) || TYPES[0];
            const Ic = t.icon;
            return (
              <div key={e.id} className={`rounded-md px-3 py-2.5 ring-1 bg-[#151b23] ${e.important ? "ring-amber-400/40" : "ring-white/10"}`}>
                <div className="flex items-start gap-2.5">
                  <Ic className={`w-4 h-4 shrink-0 mt-0.5 ${t.cls}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-slate-400">{e.heure}</span>
                      <span className={`text-[10px] font-mono uppercase ${t.cls}`}>{t.label}</span>
                      {e.important && <Star className="w-3 h-3 fill-amber-300 text-amber-300" />}
                      <span className="flex-1" />
                      <span className="text-[10px] font-mono text-slate-600">{e.auteur}</span>
                    </div>
                    <div className="text-sm text-slate-200 mt-0.5 whitespace-pre-wrap">{e.texte}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <div className="text-[10px] text-slate-600 font-mono text-center pb-2">
          Journal partage (500 dernieres entrees) · export CSV chaque soir · Ctrl+Entree pour inscrire
        </div>
      </main>
    </div>
  );
}
