import React, { useState, useEffect } from "react";
import { ClipboardList, Save, RefreshCw, Layers, CheckCircle2 } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/* ---------------------------------------------------------------------
   GESTION DES STOCKS BARS -- BFMF 2026
   Tableau de saisie et de calcul automatisé des volumes par boisson.
   Sauvegarde centralisée sur le Key-Value store de Supabase.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

const KEY_STOCKS = "bfmf2026-stocks-bars";

// Génération de 22 lignes vierges par défaut pour couvrir la gamme de boissons
const INITIAL_ROWS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  article: "",
  stockDepart: "",
  reassort: "",
  stockFinJ1: "",
  stockFinJ2: ""
}));

export default function StocksBar() {
  const [items, setItems] = useState(INITIAL_ROWS);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle, saving, success, error
  const [loading, setLoading] = useState(true);

  // Chargement des données existantes de l'an passé ou de la session en cours
  useEffect(() => {
    async function loadStocks() {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(KEY_STOCKS)}&select=value`,
          { headers: SB_HEADERS }
        );
        if (r.ok) {
          const j = await r.json();
          if (j.length && Array.isArray(j[0].value)) {
            // Si des lignes ont moins de 22 éléments, on comble pour garder le format
            const savedData = j[0].value;
            const filledData = [...savedData];
            for (let i = filledData.length; i < 22; i++) {
              filledData.push({ id: i, article: "", stockDepart: "", reassort: "", stockFinJ1: "", stockFinJ2: "" });
            }
            setItems(filledData);
          }
        }
      } catch (e) {
        console.error("Erreur de chargement des stocks", e);
      } finally {
        setLoading(false);
      }
    }
    loadStocks();
  }, []);

  // Gestion des changements de saisie dans le tableau
  const handleChange = (id, field, value) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
    if (saveStatus === "success") setSaveStatus("idle");
  };

  // Sauvegarde globale sur Supabase
  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/app_store`, {
        method: "POST",
        headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          key: KEY_STOCKS,
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

  // Remise à zéro complète du tableau (après confirmation)
  const handleReset = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vider l'ensemble du tableau des stocks ?")) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-slate-400 flex items-center justify-center font-mono text-sm">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Chargement du livre des stocks...
      </div>
    );
  }

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
              <h1 className="font-display tracking-wide text-base uppercase font-bold text-slate-200">Gestion des Stocks & Débit Bars</h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">BFMF 2026 · FEUILLE DE COMPTABILITÉ LOGISTIQUE</p>
            </div>
          </div>

          {/* Boutons d'actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-white/5 hover:bg-red-500/10 hover:text-red-300 rounded text-xs font-mono text-slate-400 ring-1 ring-white/10 transition-colors"
            >
              Vider le tableau
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
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
              {saveStatus === "idle" && <Save className="w-3.5 h-3.5" />}
              {saveStatus === "success" ? "Enregistré !" : saveStatus === "error" ? "Erreur de synchro" : "Sauvegarder les stocks"}
            </button>
          </div>
        </header>

        {/* Tableau Principal de Gestion */}
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

                  // Calcul automatisé des flux de ventes
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
                      {/* Stock Départ */}
                      <td className="py-1 px-2 bg-white/[0.01]">
                        <input
                          type="number"
                          value={item.stockDepart}
                          onChange={(e) => handleChange(item.id, "stockDepart", e.target.value)}
                          className="w-20 mx-auto text-center bg-[#1c2530] text-slate-200 rounded border border-white/5 py-1 focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>
                      {/* Réassort */}
                      <td className="py-1 px-2 bg-white/[0.01]">
                        <input
                          type="number"
                          value={item.reassort}
                          onChange={(e) => handleChange(item.id, "reassort", e.target.value)}
                          className="w-20 mx-auto text-center bg-[#1c2530] text-slate-200 rounded border border-white/5 py-1 focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>
                      {/* Ventes J1 (Calculées) */}
                      <td className="py-1 px-3 text-center font-bold bg-amber-500/5 text-amber-300">
                        {fJ1 !== null ? ventesJ1 : <span className="text-slate-600 font-normal">—</span>}
                      </td>
                      {/* Stock Fin J1 */}
                      <td className="py-1 px-2 border-r border-white/10">
                        <input
                          type="number"
                          value={item.stockFinJ1}
                          onChange={(e) => handleChange(item.id, "stockFinJ1", e.target.value)}
                          className="w-20 mx-auto text-center bg-[#1c2530] text-slate-200 rounded border border-white/5 py-1 focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>
                      {/* Ventes J2 (Calculées) */}
                      <td className="py-1 px-3 text-center font-bold bg-sky-500/5 text-sky-300">
                        {fJ2 !== null && fJ1 !== null ? ventesJ2 : <span className="text-slate-600 font-normal">—</span>}
                      </td>
                      {/* Stock Fin J2 */}
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

        {/* Note de bas de page explicative */}
        <div className="rounded-md ring-1 ring-white/5 bg-[#131a22]/50 px-3 py-2 flex items-center gap-2 text-[10px] font-mono text-slate-500">
          <Layers className="w-3.5 h-3.5 shrink-0 text-slate-600" />
          Les ventes sont déduites automatiquement selon la formule : Ventes J1 = (Départ + Réassort) - Fin J1. Pensez à cliquer sur "Sauvegarder" avant la fermeture de la console.
        </div>

      </div>
    </div>
  );
}