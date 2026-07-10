import React, { useState, useEffect } from "react";
import { ClipboardList, Save, RefreshCw, Layers, CheckCircle2 } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/* ---------------------------------------------------------------------
   GESTION DES STOCKS BARS CELLULAIRES -- BFMF 2026
   Séparation des inventaires par bar (Étape 1, Étape 2, Étape 3, Plaine).
   Sauvegarde individualisée sur le Key-Value store de Supabase.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

const BARS_CONFIG = [
  { id: "bar-plaine", label: "Bar Plaine" },
  { id: "bar-e1", label: "Bar Étape 1" },
  { id: "bar-e2", label: "Bar Étape 2" },
  { id: "bar-e3", label: "Bar Étape 3" },
];

const INITIAL_ROWS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  article: "",
  stockDepart: "",
  reassort: "",
  stockFinJ1: "",
  stockFinJ2: ""
}));

export default function StocksBar() {
  const [activeBar, setActiveBar] = useState(BARS_CONFIG[0].id);
  const [items, setItems] = useState(INITIAL_ROWS);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loading, setLoading] = useState(true);

  // Charger les stocks dès que le bar actif change
  useEffect(() => {
    async function loadStocks() {
      setLoading(true);
      setSaveStatus("idle");
      const keyStocks = `bfmf2026-stocks-${activeBar}`;
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(keyStocks)}&select=value`,
          { headers: SB_HEADERS }
        );
        if (r.ok) {
          const j = await r.json();
          if (j.length && Array.isArray(j[0].value)) {
            const savedData = j[0].value;
            const filledData = [...savedData];
            // Sécurité pour toujours conserver nos 22 lignes structurelles
            for (let i = filledData.length; i < 22; i++) {
              filledData.push({ id: i, article: "", stockDepart: "", reassort: "", stockFinJ1: "", stockFinJ2: "" });
            }
            setItems(filledData);
          } else {
            setItems(INITIAL_ROWS);
          }
        } else {
          setItems(INITIAL_ROWS);
        }
      } catch (e) {
        console.error(`Erreur de chargement des stocks pour ${activeBar}`, e);
        setItems(INITIAL_ROWS);
      } finally {
        setLoading(false);
      }
    }
    loadStocks();
  }, [activeBar]);

  const handleChange = (id, field, value) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
    if (saveStatus === "success") setSaveStatus("idle");
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    const keyStocks = `bfmf2026-stocks-${activeBar}`;
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/app_store`, {
        method: "POST",
        headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          key: keyStocks,
          value: items,
          updated_at: new Date().toISOString()
        }),
      });
      if (r.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (e) {
      setSaveStatus("error");
    }
  };

  const handleReset = () => {
    const currentBarLabel = BARS_CONFIG.find(b => b.id === activeBar)?.label;
    if (window.confirm(`Vider l'ensemble du tableau pour le "${currentBarLabel}" ?`)) {
      setItems(Array.from({ length: 22 }, (_, i) => ({
        id: i,
        article: "",
        stockDepart: "",
        reassort: "",
        stockFinJ1: "",
        stockFinJ2: ""
      })));
      setSaveStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 font-sans p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        
        {/* En-tête de l'application */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#131a22] p-4 rounded-lg ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="font-display tracking-wide text-base uppercase font-bold text-slate-200">Gestion Multi-Bars & Débits</h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">BFMF 2026 · COMPTABILITÉ LOGISTIQUE INDÉPENDANTE</p>
            </div>
          </div>

          {/* Boutons d'actions globaux */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-white/5 hover:bg-red-500/10 hover:text-red-300 rounded text-xs font-mono text-slate-400 ring-1 ring-white/10 transition-colors"
            >
              Vider ce bar
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving" || loading}
              className={`px-4 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 tracking-wide transition-all shadow ${
                saveStatus === "success" 
                  ? "bg-emerald-600 text-white" 
                  : saveStatus === "error" 
                  ? "bg-red-600 text-white" 
                  : "bg-amber-500 hover:bg-amber-400 text-[#0d1117]"
              }`}
            >
              {saveStatus === "saving" && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {saveStatus === "success" && <CheckCircle2 className="w-3.5 h-3.5" />}
              {saveStatus === "success" ? "Enregistré !" : saveStatus === "error" ? "Erreur de synchro" : "Sauvegarder ce bar"}
            </button>
          </div>
        </header>

        {/* Sélecteur de Bar (Onglets Tactiques) */}
        <div className="flex bg-[#131a22] p-1 rounded-lg ring-1 ring-white/10 overflow-x-auto gap-1">
          {BARS_CONFIG.map((bar) => (
            <button
              key={bar.id}
              onClick={() => setActiveBar(bar.id)}
              className={`flex-1 min-w-[100px] text-center py-2 text-xs font-mono font-medium rounded transition-all whitespace-nowrap ${
                activeBar === bar.id
                  ? "bg-amber-500 text-[#0d1117] font-bold shadow"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {bar.label}
            </button>
          ))}
        </div>

        {/* Tableau de saisie ou écran de chargement */}
        {loading ? (
          <div className="h-64 bg-[#131a22] rounded-lg ring-1 ring-white/10 flex items-center justify-center font-mono text-xs text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin mr-2 text-amber-300" /> Transfert des données sécurisées du bar...
          </div>
        ) : (
          <div className="bg-[#131a22] rounded-lg ring-1 ring-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-[#17202a] border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3 w-12 text-center">N°</th>
                    <th className="py-3 px-3 w-1/4">Désignation de la boisson</th>
                    <th className="py-3 px-3 text-center bg-white/[0.02]">Stock Départ</th>
                    <th className="py-3 px-3 text-center bg-white/[0.02]">Réassort</th>
                    <th className="py-3 px-3 text-center bg-amber-500/5 text-amber-200">Ventes J1</th>
                    <th className="py-3 px-3 text-center border-r border-white/10">Stock Fin J1</th>
                    <th className="py-3 px-3 text-center bg-sky-500/5 text-sky-200">Ventes J2</th>
                    <th className="py-3 px-3 text-center">Stock Fin J2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-xs">
                  {items.map((item, idx) => {
                    const dep = Number(item.stockDepart) || 0;
                    const rea = Number(item.reassort) || 0;
                    const fJ1 = item.stockFinJ1 !== "" ? Number(item.stockFinJ1) : null;
                    const fJ2 = item.stockFinJ2 !== "" ? Number(item.stockFinJ2) : null;

                    const ventesJ1 = fJ1 !== null ? Math.max(0, (dep + rea) - fJ1) : 0;
                    const ventesJ2 = fJ2 !== null && fJ1 !== null ? Math.max(0, fJ1 - fJ2) : 0;

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-2 px-3 text-slate-500 text-center font-sans text-[11px]">{idx + 1}</td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            value={item.article}
                            onChange={(e) => handleChange(item.id, "article", e.target.value)}
                            placeholder="Ex: Jupiler / Softs..."
                            className="w-full bg-[#1c2530] group-hover:bg-[#222d3a] text-slate-100 rounded border border-white/5 px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400 transition-colors"
                          />
                        </td>
                        <td className="py-1 px-2 bg-white/[0.01]">
                          <input
                            type="number"
                            value={item.stockDepart}
                            onChange={(e) => handleChange(item.id, "stockDepart", e.target.value)}
                            className="w-20 mx-auto text-center bg-[#1c2530] text-slate-200 rounded border border-white/5 py-1 focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="py-1 px-2 bg-white/[0.01]">
                          <input
                            type="number"
                            value={item.reassort}
                            onChange={(e) => handleChange(item.id, "reassort", e.target.value)}
                            className="w-20 mx-auto text-center bg-[#1c2530] text-slate-200 rounded border border-white/5 py-1 focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="py-1 px-3 text-center font-bold bg-amber-500/5 text-amber-300">
                          {fJ1 !== null ? ventesJ1 : <span className="text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="py-1 px-2 border-r border-white/10">
                          <input
                            type="number"
                            value={item.stockFinJ1}
                            onChange={(e) => handleChange(item.id, "stockFinJ1", e.target.value)}
                            className="w-20 mx-auto text-center bg-[#1c2530] text-slate-200 rounded border border-white/5 py-1 focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="py-1 px-3 text-center font-bold bg-sky-500/5 text-sky-300">
                          {fJ2 !== null && fJ1 !== null ? ventesJ2 : <span className="text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="number"
                            value={item.stockFinJ2}
                            onChange={(e) => handleChange(item.id, "stockFinJ2", e.target.value)}
                            className="w-20 mx-auto text-center bg-[#1c2530] text-slate-200 rounded border border-white/5 py-1 focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Note logistique dynamique */}
        <div className="rounded-md ring-1 ring-white/5 bg-[#131a22]/50 px-3 py-2 flex items-center gap-2 text-[10px] font-mono text-slate-500">
          <Layers className="w-3.5 h-3.5 shrink-0 text-slate-600" />
          Chaque bar dispose de sa propre base isolée. La modification ou la sauvegarde d'un bar n'écrase pas les données des autres points d'approvisionnement.
        </div>

      </div>
    </div>
  );
}