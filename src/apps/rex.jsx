import React, { useState, useEffect, useCallback } from "react";
import { Lightbulb, Download, RefreshCw, Clock, Trash2, Filter } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";
import { REX_NATURES } from "./BoutonRex";

/* ---------------------------------------------------------------------
   REX — CONSULTATION QG des retours d'expérience remontés à chaud.
   Lit la clé bfmf2026-rex (alimentée par le bouton REX présent sur toutes
   les apps). Polling doux (20 s) : le REX n'a pas besoin de temps réel.
   Filtrage par nature, export CSV pour le débriefing post-événement.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const KEY_REX = "bfmf2026-rex";

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
const pad = (n) => String(n).padStart(2, "0");
const natureMeta = (id) => REX_NATURES.find((n) => n.id === id) || { label: id, icone: Lightbulb, couleur: "text-slate-300" };

export default function RexQG() {
  const [entrees, setEntrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sbError, setSbError] = useState(false);
  const [now, setNow] = useState(new Date());
  const [filtre, setFiltre] = useState("tous");

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const refresh = useCallback(async () => {
    try {
      const d = await kvGet(KEY_REX);
      setEntrees(Array.isArray(d) ? d : []);
      setSbError(false);
    } catch (e) { setSbError(true); }
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 20000); return () => clearInterval(t); }, [refresh]);

  async function supprimer(id) {
    const e = entrees.find((x) => x.id === id);
    if (e && !window.confirm(`Supprimer cette remontée REX ?\n\n"${e.texte}"`)) return;
    const next = entrees.filter((x) => x.id !== id);
    setEntrees(next);
    const ok = await kvSet(KEY_REX, next);
    setSbError(!ok);
  }

  function exportCSV() {
    const esc = (s) => (/[";\n]/.test(s || "") ? '"' + String(s).replace(/"/g, '""') + '"' : (s || ""));
    const lignes = [["Date", "Heure", "Nature", "App", "Auteur", "Remontee"].join(";")];
    entrees.forEach((e) => {
      lignes.push([
        (e.date || "").slice(0, 10), e.heure || "",
        natureMeta(e.nature).label, esc(e.app || ""), esc(e.auteur || ""), esc(e.texte || ""),
      ].join(";"));
    });
    const blob = new Blob(["\uFEFF" + lignes.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rex-bfmf2026-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const parNature = {};
  REX_NATURES.forEach((n) => { parNature[n.id] = entrees.filter((e) => e.nature === n.id).length; });
  const visibles = filtre === "tous" ? entrees : entrees.filter((e) => e.nature === filtre);

  return (
    <div className="min-h-screen bg-[#0f1319] text-slate-200">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <header className="border-b border-white/10 bg-[#141a22]/95 backdrop-blur sticky top-0 z-20 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-violet-400/10 ring-1 ring-violet-400/30 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-[15px] leading-none">RETOURS D'EXPÉRIENCE</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · REX REMONTÉ À CHAUD</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-1 rounded ring-1 ring-violet-400/30 bg-violet-400/10 text-violet-200">{entrees.length}</span>
            <button onClick={exportCSV} className="text-slate-500 hover:text-slate-200" title="Export CSV"><Download className="w-4 h-4" /></button>
            <button onClick={refresh} className="text-slate-500 hover:text-slate-200" title="Rafraîchir"><RefreshCw className="w-4 h-4" /></button>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />{pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {sbError && (
          <div className="rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 text-xs px-3 py-2">
            Liaison instable — la liste peut être incomplète.
          </div>
        )}

        {/* Compteurs par nature = filtres cliquables */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltre("tous")}
            className={`text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 transition-colors ${filtre === "tous" ? "ring-violet-400/50 bg-violet-400/15 text-violet-200" : "ring-white/10 text-slate-400 hover:text-slate-200"}`}
          >
            Tous ({entrees.length})
          </button>
          {REX_NATURES.map((n) => {
            const Ic = n.icone;
            return (
              <button
                key={n.id}
                onClick={() => setFiltre(n.id)}
                className={`text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 flex items-center gap-1.5 transition-colors ${filtre === n.id ? "ring-violet-400/50 bg-violet-400/15 text-violet-200" : "ring-white/10 text-slate-400 hover:text-slate-200"}`}
              >
                <Ic className={`w-3.5 h-3.5 ${n.couleur}`} /> {n.label} ({parNature[n.id]})
              </button>
            );
          })}
        </div>

        {/* Liste des remontées */}
        {loading ? (
          <div className="text-slate-500 text-sm py-10 text-center">Chargement…</div>
        ) : visibles.length === 0 ? (
          <div className="text-slate-500 text-sm py-10 text-center">
            {entrees.length === 0
              ? "Aucune remontée REX pour l'instant. Le bouton REX (en bas à droite des apps) alimente cette liste."
              : "Aucune remontée pour ce filtre."}
          </div>
        ) : (
          <div className="space-y-2">
            {visibles.map((e) => {
              const nm = natureMeta(e.nature);
              const Ic = nm.icone;
              return (
                <div key={e.id} className="rounded-lg px-3 py-2.5 ring-1 ring-white/10 bg-white/[0.02]">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ring-1 ring-white/10 flex items-center gap-1 ${nm.couleur}`}>
                      <Ic className="w-3 h-3" /> {nm.label}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">{e.heure}</span>
                    <span className="text-[10px] font-mono text-slate-600">· {e.app}</span>
                    <span className="text-[10px] font-mono text-slate-600">· {e.auteur}</span>
                    <button onClick={() => supprimer(e.id)} className="ml-auto text-slate-600 hover:text-red-300" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-sm text-slate-100 leading-snug">{e.texte}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-[10px] font-mono text-slate-600 leading-relaxed pt-2">
          Ces remontées sont saisies à chaud pendant l'événement via le bouton REX présent sur les apps.
          À exploiter au débriefing (REX) post-festival. Export CSV pour l'analyse.
        </div>
      </main>
    </div>
  );
}