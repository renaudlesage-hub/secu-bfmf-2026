import React, { useState, useEffect, useCallback } from "react";
import { KeyRound, Download, RefreshCw, Clock, Plus, ArrowLeftRight, Check, Trash2, Search } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/* ---------------------------------------------------------------------
   GESTION DES CLÉS — BFMF 2026
   Calquée sur l'app radios : même architecture app_store (clé/valeur JSON
   + polling), PAS de client supabase, PAS de table SQL, PAS de Realtime.

   Deux fonctions :
     1) ENCODAGE : un formulaire ajoute une clé au « clefier » avec une
        référence numérotée automatique (K-001, K-002, …).
     2) EMPRUNT / RESTITUTION : chaque clé du clefier se prête (qui, quand)
        et se rend, avec traçabilité (par qui l'opération a été faite).

   Partage entre postes via Supabase (clé bfmf2026-cles), polling 15 s.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const KEY_CLES = "bfmf2026-cles";
const PROFILE_KEY = "bfmf2026-profil";

async function kvGet(key) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: SB_HEADERS, credentials: "omit" }
  );
  if (!r.ok) throw new Error("GET " + r.status);
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
function monNom() {
  try {
    const s = localStorage.getItem(PROFILE_KEY);
    if (s) { const p = JSON.parse(s); return p.nom || "QG"; }
  } catch (e) {}
  return "QG";
}
const pad = (n) => String(n).padStart(2, "0");
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// Référence numérotée automatique : K-001, K-002, … La numérotation
// prend le plus grand numéro déjà présent + 1 (robuste aux suppressions).
function prochaineRef(cles) {
  let max = 0;
  cles.forEach((c) => {
    const m = (c.ref || "").match(/K-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return "K-" + pad(max + 1).padStart(3, "0");
}

const inputCls =
  "bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 w-full";

export default function GestionCles() {
  const [cles, setCles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sbError, setSbError] = useState(false);
  const [now, setNow] = useState(new Date());
  const [filtre, setFiltre] = useState("");

  // Formulaire d'encodage.
  const [fNom, setFNom] = useState("");
  const [fLocal, setFLocal] = useState("");
  const [fClou, setFClou] = useState("");

  // Emprunt : à qui, pour la clé en cours d'attribution.
  const [empruntPour, setEmpruntPour] = useState(null); // { id }
  const [nomEmprunteur, setNomEmprunteur] = useState("");

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const refresh = useCallback(async () => {
    try {
      const d = await kvGet(KEY_CLES);
      setCles(Array.isArray(d) ? d : []);
      setSbError(false);
    } catch (e) { setSbError(true); }
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 15000); return () => clearInterval(t); }, [refresh]);

  async function persist(next) {
    setCles(next);
    const ok = await kvSet(KEY_CLES, next);
    setSbError(!ok);
  }

  // 1) ENCODAGE : ajoute une clé au clefier avec référence auto.
  async function encoderCle(e) {
    e.preventDefault();
    if (!fNom.trim()) return;
    const cle = {
      id: "cle" + Date.now(),
      ref: prochaineRef(cles),
      nom: fNom.trim(),
      local: fLocal.trim(),
      clou: fClou.trim(),
      statut: "Disponible",
      empruntePar: null,
      heureEmprunt: null,
      rendueLe: null,
      parQui: monNom(),
      creeeLe: nowHM(),
    };
    setFNom(""); setFLocal(""); setFClou("");
    await persist([...cles, cle]);
  }

  // 2a) EMPRUNT : marque la clé empruntée par une personne.
  async function confirmerEmprunt() {
    if (!empruntPour || !nomEmprunteur.trim()) return;
    const next = cles.map((c) => c.id === empruntPour.id
      ? { ...c, statut: "Empruntée", empruntePar: nomEmprunteur.trim(), heureEmprunt: nowHM(), rendueLe: null, parQui: monNom() }
      : c);
    setEmpruntPour(null); setNomEmprunteur("");
    await persist(next);
  }

  // 2b) RESTITUTION : la clé revient au clefier.
  async function restituer(id) {
    await persist(cles.map((c) => c.id === id
      ? { ...c, statut: "Disponible", rendueLe: nowHM(), parQui: monNom() }
      : c));
  }

  async function supprimerCle(id) {
    const c = cles.find((x) => x.id === id);
    if (c && c.statut === "Empruntée") {
      if (!window.confirm(`${c.ref} est actuellement empruntée par ${c.empruntePar}. Supprimer quand même ?`)) return;
    }
    await persist(cles.filter((c) => c.id !== id));
  }

  function exportCSV() {
    const esc = (s) => (/[";\n]/.test(s || "") ? '"' + String(s).replace(/"/g, '""') + '"' : (s || ""));
    const lignes = [["Ref", "Cle", "Local", "N° clou", "Statut", "Empruntee par", "Heure emprunt", "Rendue a", "Par"].join(";")];
    cles.forEach((c) => {
      lignes.push([c.ref, esc(c.nom), esc(c.local), esc(c.clou || c.note || ""), c.statut, esc(c.empruntePar || ""), c.heureEmprunt || "", c.rendueLe || "", esc(c.parQui || "")].join(";"));
    });
    const blob = new Blob(["\uFEFF" + lignes.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `clefier-bfmf2026-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const empruntees = cles.filter((c) => c.statut === "Empruntée");
  const visibles = filtre
    ? cles.filter((c) => (c.ref + " " + c.nom + " " + c.local + " " + (c.empruntePar || "")).toLowerCase().includes(filtre.toLowerCase()))
    : cles;
  // Tri : empruntées d'abord (à surveiller), puis par référence.
  const triees = [...visibles].sort((a, b) => {
    if ((a.statut === "Empruntée") !== (b.statut === "Empruntée")) return a.statut === "Empruntée" ? -1 : 1;
    return (a.ref || "").localeCompare(b.ref || "");
  });

  return (
    <div className="min-h-screen bg-[#0f1319] text-slate-200">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <header className="border-b border-white/10 bg-[#141a22]/95 backdrop-blur sticky top-0 z-20 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-[15px] leading-none">CLEFIER</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · ENCODAGE & EMPRUNTS</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-mono px-2 py-1 rounded ring-1 ${empruntees.length ? "ring-amber-400/40 bg-amber-400/10 text-amber-300" : "ring-white/10 text-slate-500"}`}>
              {empruntees.length} sortie{empruntees.length > 1 ? "s" : ""}
            </span>
            <button onClick={exportCSV} className="text-slate-500 hover:text-slate-200" title="Export CSV"><Download className="w-4 h-4" /></button>
            <button onClick={refresh} className="text-slate-500 hover:text-slate-200" title="Rafraîchir"><RefreshCw className="w-4 h-4" /></button>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />{pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-5xl mx-auto items-start">
        {sbError && (
          <div className="lg:col-span-3 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 text-xs px-3 py-2">
            Liaison instable — les emprunts peuvent ne pas être partagés avec les autres postes.
          </div>
        )}

        {/* Clefier */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#141a22] rounded-lg p-4 border border-white/5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display text-sm tracking-wider uppercase flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" /> Clefier
              </h2>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Filtrer…"
                  className="bg-black/40 border border-white/10 rounded pl-7 pr-2 py-1 text-xs text-white placeholder:text-slate-600 w-32 focus:w-44 transition-all focus:outline-none" />
              </div>
            </div>

            {loading ? (
              <div className="text-slate-500 text-sm py-8 text-center">Chargement…</div>
            ) : triees.length === 0 ? (
              <div className="text-slate-500 text-sm py-8 text-center">
                {filtre ? "Aucune clé ne correspond." : "Aucune clé encodée. Utilisez le formulaire pour en ajouter."}
              </div>
            ) : (
              <div className="space-y-2">
                {triees.map((c) => {
                  const sortie = c.statut === "Empruntée";
                  return (
                    <div key={c.id} className={`rounded-lg px-3 py-2.5 ring-1 flex items-center gap-3 ${sortie ? "ring-amber-400/30 bg-amber-400/[0.05]" : "ring-white/10 bg-black/20"}`}>
                      <span className="font-mono text-xs font-bold text-amber-300 w-12 shrink-0">{c.ref}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-100 font-medium truncate flex items-center gap-1.5">
                          <span className="truncate">{c.nom}{c.local ? <span className="text-slate-500 font-normal"> · {c.local}</span> : null}</span>
                          {(c.clou || c.note) && (
                            <span className="shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20">
                              clou {c.clou || c.note}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono mt-0.5">
                          {sortie ? (
                            <span className="text-amber-300">Sortie {c.heureEmprunt} — {c.empruntePar}</span>
                          ) : (
                            <span className="text-emerald-400">Disponible{c.rendueLe ? ` · rendue ${c.rendueLe}` : ""}</span>
                          )}
                        </div>
                      </div>
                      {sortie ? (
                        <button onClick={() => restituer(c.id)}
                          className="shrink-0 text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-emerald-400/40 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Rendre
                        </button>
                      ) : (
                        <button onClick={() => { setEmpruntPour({ id: c.id }); setNomEmprunteur(""); }}
                          className="shrink-0 text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20 inline-flex items-center gap-1">
                          <ArrowLeftRight className="w-3.5 h-3.5" /> Prêter
                        </button>
                      )}
                      <button onClick={() => supprimerCle(c.id)} className="shrink-0 text-slate-600 hover:text-red-300" title="Supprimer la clé">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : encodage d'une nouvelle clé */}
        <div className="space-y-4">
          <div className="bg-[#141a22] rounded-lg p-4 border border-white/5">
            <h2 className="font-display text-sm tracking-wider uppercase flex items-center gap-2 mb-1">
              <Plus className="w-4 h-4 text-amber-400" /> Encoder une clé
            </h2>
            <p className="text-[10px] font-mono text-slate-500 mb-3 leading-relaxed">
              Ajoute une clé au clefier avec une référence numérotée automatique
              (prochaine : <span className="text-amber-300">{prochaineRef(cles)}</span>).
            </p>
            <form onSubmit={encoderCle} className="space-y-2">
              <input value={fNom} onChange={(e) => setFNom(e.target.value)} placeholder="Nom / désignation (ex : Cadenas régie)" className={inputCls} required />
              <input value={fLocal} onChange={(e) => setFLocal(e.target.value)} placeholder="Local / accès (ex : Container backstage)" className={inputCls} />
              <input value={fClou} onChange={(e) => setFClou(e.target.value)} placeholder="N° de clou sur le panneau (ex : 12)" className={inputCls} />
              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 rounded font-bold text-xs text-white py-2 transition-colors inline-flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> ENCODER LA CLÉ
              </button>
            </form>
          </div>

          <div className="bg-[#141a22] rounded-lg p-4 border border-white/5 text-[11px] font-mono text-slate-400 leading-relaxed">
            <div className="text-slate-300 uppercase tracking-wider text-[10px] mb-2">Repères</div>
            <div>{cles.length} clé{cles.length > 1 ? "s" : ""} au clefier · <span className="text-amber-300">{empruntees.length}</span> sortie{empruntees.length > 1 ? "s" : ""} · <span className="text-emerald-400">{cles.length - empruntees.length}</span> disponible{cles.length - empruntees.length > 1 ? "s" : ""}.</div>
            <div className="mt-1.5 text-slate-500">Chaque emprunt / restitution est horodaté et attribué au poste qui fait l'opération. Export CSV pour le bilan de fin d'événement.</div>
          </div>
        </div>
      </main>

      {/* Modale d'emprunt : à qui prête-t-on la clé ? */}
      {empruntPour && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEmpruntPour(null)}>
          <div className="bg-[#141a22] rounded-xl ring-1 ring-white/15 w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display tracking-wide text-slate-100 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-amber-300" /> Prêter la clé
            </h2>
            {(() => {
              const c = cles.find((x) => x.id === empruntPour.id);
              return c ? (
                <div className="text-[11px] font-mono text-slate-400 bg-black/20 rounded px-2.5 py-1.5">
                  <span className="text-amber-300">{c.ref}</span> · {c.nom}{c.local ? ` · ${c.local}` : ""}
                </div>
              ) : null;
            })()}
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">Emprunté par *</label>
              <input autoFocus value={nomEmprunteur} onChange={(e) => setNomEmprunteur(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmerEmprunt(); }}
                placeholder="Nom / rôle de la personne" className={inputCls} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEmpruntPour(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 ring-1 ring-white/10 hover:text-slate-200">Annuler</button>
              <button onClick={confirmerEmprunt} disabled={!nomEmprunteur.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500/25 text-amber-100 ring-1 ring-amber-400/50 disabled:opacity-40">
                Confirmer l'emprunt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}