import React, { useState, useEffect } from "react";
import { ShieldAlert, Landmark, Clock, CircleDot, CheckCircle } from "lucide-react";
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

export default function AppPcOps() {
  const [now, setNow] = useState(new Date());
  const [sosParticipants, setSosParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    async function pull() {
      try {
        const data = await kvGet(KEY_SOS_PART);
        setSosParticipants(Array.isArray(data) ? data : []);
      } catch (e) { console.error("Erreur PcOps pull :", e); }
      setLoading(false);
    }
    pull();
    const interval = setInterval(pull, 10000); // Lecture seule toutes les 10s
    return () => { clearInterval(t); clearInterval(interval); };
  }, []);

  // Filtrage strict : efface l'alerte sous n'importe quelle orthographe de clôture
  const sosVisibles = sosParticipants.filter((s) => 
    s.statut !== "cloture" && 
    s.statut !== "clôture" && 
    s.statut !== "cloturé" &&
    s.statut !== "clos"
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 font-sans">
      <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
        <h1 className="font-bold tracking-tight text-lg text-white flex items-center gap-2">
          <Landmark className="w-5 h-5 text-sky-400" /> PC-OPS AUTORITÉS
        </h1>
        <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-1 rounded">
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </span>
      </header>

      <main className="space-y-4 max-w-xl mx-auto">
        <div className="text-xs bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-sky-300">
          Mode Lecture Seule — Console de supervision pour les disciplines d'urgence et représentants communaux.
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-10">Synchronisation avec le QG...</div>
        ) : sosVisibles.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-lg border border-dashed border-white/20">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-slate-300">Situation normale. Aucune alerte active.</p>
          </div>
        ) : (
          sosVisibles.map((s) => (
            <div key={s.id} className="bg-[#1e293b] rounded-xl p-4 border border-white/10 shadow-lg space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-mono text-slate-400">Signalement à {s.heure} · {s.nom}</div>
                  <h3 className="font-bold text-base text-white mt-0.5">{s.motif}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 ${
                  s.statut === 'nouveau' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 
                  s.statut === 'en route' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                  s.statut === 'sur place' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}>
                  {s.statut}
                </span>
              </div>

              {s.details && <p className="text-xs text-slate-400 italic">"{s.details}"</p>}
              
              <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-white/5 flex flex-wrap gap-x-3">
                {s.heureEnRoute && <span>En route : {s.heureEnRoute}</span>}
                {s.heureArrivee && <span>Sur place : {s.heureArrivee}</span>}
                {s.heurePriseEnCharge && <span>Soins : {s.heurePriseEnCharge}</span>}
                {s.heureRetourNormale && <span>Fin incident : {s.heureRetourNormale}</span>}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}