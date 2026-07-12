import React, { useState, useEffect, useCallback, useRef } from "react";
import { Users, Clock, RefreshCw, Plus, Minus, RotateCcw, MapPin } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/* ---------------------------------------------------------------------
   JAUGE PLAINE -- comptage des acces au site (BFMF 2026)
   Un benevole par point d'acces : gros boutons +/- entrees et sorties.
   Le total site = somme (entrees - sorties) de tous les points.
   Ecriture par lots (toutes les 3 s) pour limiter les conflits.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const KEY_JAUGE = "bfmf2026-jauge";
const CAPACITE_SITE = 1500; // a ajuster selon le dossier de securite

const POINTS_ACCES = [
  { id: "acc-principal", nom: "Entree principale" },
  { id: "acc-parking", nom: "Acces parking" },
  { id: "acc-balade", nom: "Depart/retour balade" },
  { id: "acc-secours", nom: "Acces secondaire" },
];

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
function pad(n) { return String(n).padStart(2, "0"); }

export default function Jauge() {
  const [data, setData] = useState(null); // { compteurs: {id:{in,out}} }
  const [pointId, setPointId] = useState(POINTS_ACCES[0].id);
  const [sbError, setSbError] = useState(false);
  const [now, setNow] = useState(new Date());
  // Tampon local : clics non encore synchronises
  const tampon = useRef({}); // {pointId: {in: n, out: n}}
  const [tick, setTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const pull = useCallback(async () => {
    try {
      const d = await kvGet(KEY_JAUGE);
      setData(d && d.compteurs ? d : { compteurs: {} });
      setSbError(false);
    } catch (e) { setSbError(true); }
  }, []);
  useEffect(() => { pull(); const t = setInterval(pull, 10000); return () => clearInterval(t); }, [pull]);

  // Synchronisation du tampon toutes les 3 s (lecture-fusion-ecriture)
  useEffect(() => {
    const t = setInterval(async () => {
      const buf = tampon.current;
      if (!Object.keys(buf).length) return;
      tampon.current = {};
      try {
        const d = (await kvGet(KEY_JAUGE)) || { compteurs: {} };
        for (const [pid, v] of Object.entries(buf)) {
          const c = d.compteurs[pid] || { in: 0, out: 0 };
          d.compteurs[pid] = { in: Math.max(0, c.in + (v.in || 0)), out: Math.max(0, c.out + (v.out || 0)) };
        }
        const ok = await kvSet(KEY_JAUGE, d);
        if (ok) { setData(d); setSbError(false); } else throw new Error();
      } catch (e) {
        // re-crediter le tampon pour ne rien perdre
        for (const [pid, v] of Object.entries(buf)) {
          const c = tampon.current[pid] || { in: 0, out: 0 };
          tampon.current[pid] = { in: c.in + (v.in || 0), out: c.out + (v.out || 0) };
        }
        setSbError(true);
      }
    }, 3000);
    return () => clearInterval(t);
  }, []);

  function clic(sens, delta) {
    const c = tampon.current[pointId] || { in: 0, out: 0 };
    c[sens] = (c[sens] || 0) + delta;
    tampon.current[pointId] = c;
    setTick((x) => x + 1); // re-render pour feedback immediat
  }

  // Totaux (serveur + tampon local)
  const compteurs = (data && data.compteurs) || {};
  const totIn = POINTS_ACCES.reduce((s, p) => s + ((compteurs[p.id] || {}).in || 0) + ((tampon.current[p.id] || {}).in || 0), 0);
  const totOut = POINTS_ACCES.reduce((s, p) => s + ((compteurs[p.id] || {}).out || 0) + ((tampon.current[p.id] || {}).out || 0), 0);
  const surSite = Math.max(0, totIn - totOut);
  const pct = Math.min(100, Math.round((surSite / CAPACITE_SITE) * 100));
  const barCls = pct >= 90 ? "bg-red-400" : pct >= 72 ? "bg-amber-400" : "bg-emerald-400";

  const monPoint = POINTS_ACCES.find((p) => p.id === pointId);
  const monIn = ((compteurs[pointId] || {}).in || 0) + ((tampon.current[pointId] || {}).in || 0);
  const monOut = ((compteurs[pointId] || {}).out || 0) + ((tampon.current[pointId] || {}).out || 0);

  async function remiseAZero() {
    if (!window.confirm("Remettre TOUS les compteurs a zero ? (debut de journee uniquement)")) return;
    const d = { compteurs: {}, resetA: new Date().toISOString() };
    tampon.current = {};
    setData(d);
    await kvSet(KEY_JAUGE, d);
  }

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <header className="border-b border-white/10 bg-[#151b23]/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-[15px] leading-none">JAUGE PLAINE</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · COMPTAGE DES ACCES</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={remiseAZero} className="text-slate-600 hover:text-red-300" title="Remise a zero (debut de journee)"><RotateCcw className="w-4 h-4" /></button>
            <button onClick={pull} className="text-slate-500 hover:text-slate-200"><RefreshCw className="w-4 h-4" /></button>
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />{pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {sbError && <div className="rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 text-xs px-3 py-2">Reseau instable — vos clics sont conserves et seront synchronises.</div>}

        {/* Jauge globale */}
        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4 text-center">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">Personnes sur site (tous acces)</div>
          <div className={`font-display text-5xl mt-1 ${pct >= 90 ? "text-red-300" : pct >= 72 ? "text-amber-300" : "text-emerald-300"}`}>{surSite}</div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden mt-2">
            <div className={`h-full ${barCls} transition-all duration-500`} style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1.5">
            {pct}% de {CAPACITE_SITE} · {totIn} entrees · {totOut} sorties
          </div>
        </section>

        {/* Mon point d'acces */}
        <div>
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">Mon point d'acces</div>
          <select
            className="w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-3 text-[16px] text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60"
            value={pointId} onChange={(e) => setPointId(e.target.value)}
          >
            {POINTS_ACCES.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </div>

        {/* Gros boutons de comptage */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#151b23] rounded-lg ring-1 ring-emerald-400/30 p-4 text-center">
            <div className="text-[10px] font-mono text-emerald-300/80 uppercase">Entrees — {monPoint.nom}</div>
            <div className="font-display text-3xl text-emerald-300 my-1">{monIn}</div>
            <button onClick={() => clic("in", 1)}
              className="w-full py-8 rounded-lg ring-2 ring-emerald-400/60 bg-emerald-400/15 text-emerald-200 active:scale-95 transition-all">
              <Plus className="w-10 h-10 mx-auto" />
            </button>
            <button onClick={() => clic("in", -1)} className="mt-2 text-[11px] font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1 mx-auto">
              <Minus className="w-3 h-3" /> corriger
            </button>
          </div>
          <div className="bg-[#151b23] rounded-lg ring-1 ring-sky-400/30 p-4 text-center">
            <div className="text-[10px] font-mono text-sky-300/80 uppercase">Sorties — {monPoint.nom}</div>
            <div className="font-display text-3xl text-sky-300 my-1">{monOut}</div>
            <button onClick={() => clic("out", 1)}
              className="w-full py-8 rounded-lg ring-2 ring-sky-400/60 bg-sky-400/15 text-sky-200 active:scale-95 transition-all">
              <Plus className="w-10 h-10 mx-auto" />
            </button>
            <button onClick={() => clic("out", -1)} className="mt-2 text-[11px] font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1 mx-auto">
              <Minus className="w-3 h-3" /> corriger
            </button>
          </div>
        </div>

        {/* Detail par point */}
        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-3 space-y-1">
          {POINTS_ACCES.map((p) => {
            const cIn = ((compteurs[p.id] || {}).in || 0) + ((tampon.current[p.id] || {}).in || 0);
            const cOut = ((compteurs[p.id] || {}).out || 0) + ((tampon.current[p.id] || {}).out || 0);
            return (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="text-slate-300 flex-1">{p.nom}</span>
                <span className="font-mono text-emerald-300/80 w-14 text-right">+{cIn}</span>
                <span className="font-mono text-sky-300/80 w-14 text-right">−{cOut}</span>
                <span className="font-mono text-slate-200 w-14 text-right">{Math.max(0, cIn - cOut)}</span>
              </div>
            );
          })}
        </section>

        <div className="text-[10px] text-slate-600 font-mono text-center pb-2">
          Un benevole par point · un tap par personne · les clics partent par lots de 3 s (anti-conflit) · capacite dans le code : {CAPACITE_SITE}
        </div>
      </main>
    </div>
  );
}
