import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  TriangleAlert,
  Clock,
  CircleDot,
  CheckCircle,
  Radio,
  Navigation,
} from "lucide-react";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";
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

const KEY_SOS_PART = "bfmf2026-sos-participants";

function pad(n) { return n.toString().padStart(2, "0"); }

export default function AppVolante() {
  const [now, setNow] = useState(new Date());
  const [sosParticipants, setSosParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    async function pull() {
      try {
        const data = await kvGet(KEY_SOS_PART);
        setSosParticipants(Array.isArray(data) ? data : []);
      } catch (e) { console.error("Erreur pull :", e); }
      setLoading(false);
    }
    pull();
    const interval = setInterval(pull, 5000);
    return () => { clearInterval(t); clearInterval(interval); };
  }, []);

  async function changerStatutSos(id, nouveauStatut, cleHeure) {
    const codeHeure = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const next = sosParticipants.map((s) =>
      s.id === id ? { ...s, statut: nouveauStatut, [cleHeure]: codeHeure } : s
    );
    setSosParticipants(next);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/app_store`, {
        method: "POST",
        headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ key: KEY_SOS_PART, value: next, updated_at: new Date().toISOString() }),
      });
    } catch (e) { console.error("Erreur sync :", e); }
  }

  // Filtrage : on cache uniquement les SOS "cloture" par le QG
  const sosVisibles = sosParticipants.filter((s) => s.statut !== "cloture");

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 font-sans">
      <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
        <h1 className="font-bold tracking-tight text-lg text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-amber-400" /> APP VOLANTE
        </h1>
        <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-1 rounded">
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </span>
      </header>

      <main className="space-y-4">
        {loading ? (
          <div className="text-center text-slate-500 py-10">Connexion QG...</div>
        ) : sosVisibles.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-lg border border-dashed border-white/20">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-slate-300">Aucune intervention en cours.</p>
          </div>
        ) : (
          sosVisibles.map((s) => (
            <div key={s.id} className="bg={#1e293b} rounded-xl p-4 border border-white/10 shadow-lg" style={{ backgroundColor: '#1e293b' }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono text-amber-400">{s.heure} · {s.nom}</div>
                  <h3 className="font-bold text-lg text-white">{s.motif}</h3>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${s.statut === 'nouveau' ? 'bg-red-500/20 text-red-300' : 'bg-sky-500/20 text-sky-300'}`}>
                  {s.statut}
                </div>
              </div>

              {s.details && <p className="text-sm text-slate-400 mt-2 italic">"{s.details}"</p>}

              <div className="mt-4 space-y-2">
                {s.statut === "nouveau" && (
                  <button onClick={() => changerStatutSos(s.id, "pris en compte", "heurePriseEnCompte")} className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Navigation className="w-4 h-4" /> EN ROUTE
                  </button>
                )}

                {s.statut === "pris en compte" && (
                  <button onClick={() => changerStatutSos(s.id, "sur place", "heureArrivee")} className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                    <CircleDot className="w-4 h-4" /> SIGNALER : SUR PLACE
                  </button>
                )}

                {s.statut === "sur place" && (
                  <div className="text-center text-xs text-emerald-400 py-3 bg-emerald-900/20 rounded-lg border border-emerald-500/30">
                    ✓ Arrivé sur place à {s.heureArrivee || "—"}. Prise en charge en cours.
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}