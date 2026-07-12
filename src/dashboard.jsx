import React, { useState, useEffect, useCallback } from "react";
import { TriangleAlert, UserSearch, CheckCircle2 } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/* ---------------------------------------------------------------------
   BANDEAU GENERAL -- composant partage, monte dans App.jsx pour toutes
   les apps EQUIPES (jamais sur les routes publiques #sos / #signaler).
   Affiche en permanence, au-dessus de tout :
   - la CONSIGNE GENERALE / MODE CRISE (cle bfmf2026-crise) avec accuse
   - les RECHERCHES DE PERSONNE actives (cle bfmf2026-recherche)
   Synchronisation acceleree (5 s) tant qu'un des deux est actif.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const KEY_CRISE = "bfmf2026-crise";
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
function nowHM() { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function monNom() {
  try { const s = localStorage.getItem(PROFILE_KEY); if (s) { const p = JSON.parse(s); return `${p.nom} (${p.role})`; } } catch (e) {}
  return "equipe";
}

export default function BandeauGeneral() {
  const [crise, setCrise] = useState(null);
  const [recherches, setRecherches] = useState([]);

  const pull = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([kvGet(KEY_CRISE), kvGet(KEY_RECH)]);
      setCrise(c && c.active ? c : null);
      setRecherches(Array.isArray(r) ? r.filter((x) => x.statut === "active") : []);
    } catch (e) { /* silencieux : le bandeau ne doit jamais casser une app */ }
  }, []);

  useEffect(() => {
    pull();
    const actif = crise || recherches.length > 0;
    const t = setInterval(pull, actif ? 5000 : 12000);
    return () => clearInterval(t);
  }, [pull, !!crise, recherches.length]);

  async function accuserCrise() {
    if (!crise) return;
    const nom = monNom();
    if ((crise.accuses || []).some((a) => a.nom === nom)) return;
    const c = { ...crise, accuses: [...(crise.accuses || []), { nom, heure: nowHM() }] };
    setCrise(c);
    await kvSet(KEY_CRISE, c);
  }

  if (!crise && recherches.length === 0) return null;
  const dejaAccuse = crise && (crise.accuses || []).some((a) => a.nom === monNom());

  return (
    <div className="sticky top-0 z-[60]">
      <style>{`@keyframes bgPulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } } .bg-pulse { animation: bgPulse 1.4s ease-in-out infinite; }`}</style>

      {crise && (
        <div className="bg-red-600/95 text-white px-4 py-2.5 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-start gap-3">
            <TriangleAlert className="w-5 h-5 shrink-0 mt-0.5 bg-pulse" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm tracking-wide uppercase">Consigne generale QG — {crise.motif}</div>
              <div className="text-xs opacity-95">{crise.message}</div>
              <div className="text-[10px] opacity-80 mt-0.5">Emise a {crise.heure} · confirmez lecture puis appliquez · radio PMR4.1</div>
            </div>
            <button
              onClick={accuserCrise}
              disabled={dejaAccuse}
              className={`shrink-0 text-[11px] font-semibold px-3 py-2 rounded ${dejaAccuse ? "bg-white/20 cursor-default" : "bg-white text-red-700 hover:bg-red-50"}`}
            >
              {dejaAccuse ? "✓ Lu" : "BIEN RECU"}
            </button>
          </div>
        </div>
      )}

      {recherches.map((r) => (
        <div key={r.id} className="bg-amber-500/95 text-slate-900 px-4 py-2 shadow-lg border-t border-black/10">
          <div className="max-w-3xl mx-auto flex items-start gap-3">
            <UserSearch className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-xs">
              <span className="font-bold uppercase">Recherche {r.categorie}</span>
              {" — "}{r.prenom || "?"}{r.age ? `, ${r.age}` : ""} · {r.description}
              <span className="opacity-80"> · vu(e) : {r.dernierLieu}{r.heureDerniereVue ? ` ~${r.heureDerniereVue}` : ""} (depuis {r.heure})</span>
              <span className="font-semibold"> · Si repere(e) : accompagner a l'ACCUEIL POINT 0 + radio PMR4.1</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
