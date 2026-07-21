import React, { useState } from "react";
import { LifeBuoy, PhoneCall, MapPin, Radio, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { ANNUAIRE, PRV, RADIO_PLAN } from "./referentiels";

/* ------------------------------------------------------------------
   BANDEAU URGENCE — composant partagé, affiché en bas des apps terrain.
   Replié par défaut (discret), dépliable en un tap. Contient l'essentiel
   de la fiche réflexe : numéros cliquables, PRV avec GPS, plan radio.
   Source unique : referentiels.js (aucune donnée en dur ici).
   Lecture seule, aucune navigation vers le reste de la plateforme.
------------------------------------------------------------------ */
export default function BandeauUrgence() {
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="sticky bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-3xl mx-auto px-2 pb-2 pointer-events-auto">
        {/* Panneau déplié */}
        {ouvert && (
          <div className="rounded-t-xl ring-1 ring-red-500/40 bg-[#141a22] shadow-2xl max-h-[65vh] overflow-y-auto">
            <div className="p-3 space-y-3">
              {/* Numéros */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-red-300/80 mb-1.5 flex items-center gap-1.5">
                  <PhoneCall className="w-3 h-3" /> Numéros d'urgence
                </div>
                <div className="space-y-1">
                  {ANNUAIRE.map((c) => (
                    <a
                      key={c.num}
                      href={`tel:${c.num.replace(/\s/g, "")}`}
                      className={`flex items-center gap-2 rounded px-2.5 py-2 ring-1 transition-colors ${
                        c.urgent
                          ? "ring-red-500/40 bg-red-500/10 active:bg-red-500/20"
                          : "ring-white/10 bg-white/[0.02] active:bg-white/[0.06]"
                      }`}
                    >
                      <PhoneCall className={`w-3.5 h-3.5 shrink-0 ${c.urgent ? "text-red-300" : "text-slate-400"}`} />
                      <span className={`flex-1 text-xs ${c.urgent ? "text-red-100 font-semibold" : "text-slate-200"}`}>
                        {c.nom}{c.note ? <span className="text-slate-500 font-normal"> · {c.note}</span> : ""}
                      </span>
                      <span className={`font-mono text-sm ${c.urgent ? "text-red-200" : "text-slate-300"}`}>{c.num}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Plan radio */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300/80 mb-1.5 flex items-center gap-1.5">
                  <Radio className="w-3 h-3" /> Plan radio
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {RADIO_PLAN.map((r) => (
                    <div
                      key={r.canal}
                      className={`rounded px-2 py-1.5 ring-1 text-[11px] ${
                        r.urgent ? "ring-red-500/30 bg-red-500/5" : "ring-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <span className={`font-mono font-semibold ${r.urgent ? "text-red-200" : "text-sky-200"}`}>{r.canal}</span>
                      <span className="text-slate-400"> — {r.usage}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PRV */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300/80 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Points de rendez-vous secours
                </div>
                <div className="space-y-1">
                  {PRV.map((p) => (
                    <a
                      key={p.nom}
                      href={`https://www.google.com/maps?q=${p.gps.replace(/\s/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded px-2 py-1.5 ring-1 ring-white/10 bg-white/[0.02] active:bg-white/[0.06]"
                    >
                      <MapPin className="w-3 h-3 shrink-0 text-emerald-300" />
                      <span className="flex-1 text-[11px] text-slate-200 leading-tight">{p.nom}</span>
                      <span className="font-mono text-[10px] text-sky-300 flex items-center gap-0.5">
                        {p.gps} <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="text-[9px] font-mono text-slate-600 text-center leading-relaxed pt-1">
                Urgence vitale : 112 d'abord, puis QG par radio. Cet aide-mémoire ne remplace pas la radio.
              </div>
            </div>
          </div>
        )}

        {/* Barre de déclenchement (toujours visible) */}
        <button
          onClick={() => setOuvert((v) => !v)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 font-mono text-xs font-bold tracking-wider shadow-2xl transition-colors ${
            ouvert
              ? "rounded-b-xl ring-1 ring-red-500/40 bg-red-500/20 text-red-100"
              : "rounded-xl ring-1 ring-red-500/50 bg-red-500/15 text-red-200 active:bg-red-500/25"
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          {ouvert ? "FERMER" : "URGENCE — NUMÉROS · PRV · RADIO"}
          {ouvert ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}