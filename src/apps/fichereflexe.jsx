import React, { useState } from "react";
import { ANNUAIRE as NUMEROS, PRV, RADIO_PLAN as RADIO, QUE_FAIRE as CONDUITES, REGLE_OR } from "./referentiels";
import { LifeBuoy, Radio, PhoneCall, MapPin, ChevronDown, TriangleAlert, Flame, HeartPulse, UserSearch, CloudLightning, Footprints } from "lucide-react";

// Les conduites viennent de referentiels.js avec l'icone en CHAINE :
// ce mapping les relie aux composants lucide.
const ICONES = { TriangleAlert, Flame, HeartPulse, UserSearch, CloudLightning, Footprints, LifeBuoy };

/* ---------------------------------------------------------------------
   FICHE REFLEXE -- BFMF 2026
   Page STATIQUE : plan radio, numeros, PRV avec GPS, conduites a tenir.
   Aucune dependance reseau apres chargement : reste lisible meme si la
   4G tombe (tant que l'onglet est ouvert). A verifier au briefing.
   >>> METTEZ A JOUR LES NUMEROS ci-dessous avant impression/diffusion.
--------------------------------------------------------------------- */





export default function FicheReflexe() {
  const [ouvert, setOuvert] = useState(null);
  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <header className="border-b border-white/10 bg-[#151b23] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-emerald-400/10 ring-1 ring-emerald-400/30 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="font-display tracking-wide text-[15px] leading-none">FICHE REFLEXE</div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · A LIRE AU BRIEFING · GARDER L'ONGLET OUVERT</div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Numeros */}
        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-2">
            <PhoneCall className="w-4 h-4 text-slate-500" /> NUMEROS
          </h2>
          <div className="space-y-1">
            {NUMEROS.map((n) => (
              <a key={n.nom} href={`tel:${n.num.replace(/\s/g, "")}`}
                className={`flex items-center gap-2 rounded px-2.5 py-2 ring-1 ${n.urgent ? "ring-red-400/40 bg-red-400/10" : "ring-white/10 bg-white/[0.02]"}`}>
                <span className={`text-xs flex-1 ${n.urgent ? "text-red-200 font-semibold" : "text-slate-300"}`}>{n.nom}</span>
                {n.note && <span className="text-[9px] font-mono text-amber-300/70">{n.note}</span>}
                <span className={`font-mono text-sm ${n.urgent ? "text-red-200 font-bold" : "text-slate-200"}`}>{n.num}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Radio */}
        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-slate-500" /> PLAN RADIO
          </h2>
          <div className="space-y-1">
            {RADIO.map((c) => (
              <div key={c.canal} className={`flex items-start gap-2 text-[11px] rounded px-2 py-1.5 ${c.urgent ? "bg-red-400/5 ring-1 ring-red-400/20" : "bg-white/[0.02]"}`}>
                <span className={`font-mono shrink-0 w-14 ${c.urgent ? "text-red-300" : "text-amber-300"}`}>{c.canal}</span>
                <span className={`font-mono shrink-0 px-1.5 rounded text-[10px] ${c.urgent ? "bg-red-500/25 text-red-100" : "bg-sky-500/15 text-sky-200"}`}>
                  canal {c.num}{c.numAlt ? ` / ${c.numAlt}` : ""}
                </span>
                <span className="text-slate-400 leading-tight">
                  {c.usage}
                  {c.note && <span className="block text-[9px] text-slate-500">{c.note}</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-amber-200/80 mt-2 leading-relaxed">Le numéro du poste diffère du numéro PMR : <span className="font-semibold">PMR333 = CANAL 6</span>, PMR4.1 = canal 9.</div>
          <div className="text-[10px] text-slate-500 mt-2">Message type : QUI appelle · QUOI · OU (PRV/km) · COMBIEN de personnes · attendre l'accuse du QG.</div>
        </section>

        {/* PRV */}
        <section className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-4">
          <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-slate-500" /> POINTS DE RENDEZ-VOUS SECOURS (PRV)
          </h2>
          <div className="space-y-1">
            {PRV.map((p) => (
              <a key={p.nom} href={`https://www.google.com/maps?q=${p.gps.replace(/\s/g, "")}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-[11px] rounded px-2 py-1.5 bg-white/[0.02] hover:bg-white/[0.05]">
                <span className="text-slate-300 flex-1">{p.nom}</span>
                <span className="font-mono text-slate-500">{p.gps}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Conduites a tenir */}
        <section className="space-y-1.5">
          <h2 className="font-display tracking-wide text-sm text-slate-200 px-1">QUE FAIRE SI...</h2>
          {CONDUITES.map((c) => {
            const Ic = ICONES[c.icone] || LifeBuoy;
            const o = ouvert === c.id;
            return (
              <div key={c.id} className="rounded-lg ring-1 ring-white/10 bg-[#151b23] overflow-hidden">
                <button onClick={() => setOuvert(o ? null : c.id)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-white/[0.02]">
                  <Ic className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="text-sm text-slate-100 flex-1">{c.titre}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${o ? "rotate-180" : ""}`} />
                </button>
                {o && (
                  <ol className="px-4 pb-3 space-y-1.5">
                    {c.etapes.map((e, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                        <span className="font-mono text-amber-300/70 shrink-0">{i + 1}.</span> {e}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </section>

        <div className="text-[10px] text-slate-600 font-mono text-center pb-3 leading-relaxed">
          Regle d'or : PROTEGER → ALERTER (112 puis PMR333 si vital) → SECOURIR.<br />
          L'app complete la radio, elle ne la remplace pas. Version {new Date().getFullYear()} — verifier les numeros avant le festival.
        </div>
      </main>
    </div>
  );
}