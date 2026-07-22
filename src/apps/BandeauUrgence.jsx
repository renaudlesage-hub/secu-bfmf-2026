import React, { useState } from "react";
import {
  LifeBuoy, PhoneCall, MapPin, ChevronUp, ChevronDown, ExternalLink,
  TriangleAlert, Flame, HeartPulse, UserSearch, CloudLightning, Footprints,
} from "lucide-react";
import { ANNUAIRE, PRV, QUE_FAIRE, REGLE_OR } from "./referentiels";

/* ------------------------------------------------------------------
   BANDEAU URGENCE — composant partage, affiche en bas des apps terrain.
   Replie par defaut (discret), depliable en un tap.
   Ordre voulu : NUMEROS -> QUE FAIRE SI -> PRV. (Pas de plan radio :
   les equipes l'ont sur leur poste, il encombrait pour rien.)
   Source unique : referentiels.js — aucune donnee en dur ici, donc
   aucune divergence possible avec la fiche reflexe.
   Lecture seule : aucune navigation vers le reste de la plateforme.
------------------------------------------------------------------ */

// Les conduites portent leur icone en CHAINE dans le referentiel.
const ICONES = { TriangleAlert, Flame, HeartPulse, UserSearch, CloudLightning, Footprints, LifeBuoy };

export default function BandeauUrgence() {
  const [ouvert, setOuvert] = useState(false);
  const [situation, setSituation] = useState(null); // id de la conduite depliee

  return (
    <div className="sticky bottom-0 left-0 right-0 z-40 pointer-events-none">
      {/* pl-16 sur mobile : laisse la place au bouton menu (bas a gauche) */}
      <div className="max-w-3xl mx-auto pl-16 pr-2 md:px-2 pb-2 pointer-events-auto">
        {ouvert && (
          <div className="rounded-t-xl ring-1 ring-red-500/40 bg-[#141a22] shadow-2xl max-h-[70vh] overflow-y-auto">
            <div className="p-3 space-y-3">

              {/* 1. NUMEROS ------------------------------------------------ */}
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

              {/* 2. QUE FAIRE SI ------------------------------------------- */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300/80 mb-1.5 flex items-center gap-1.5">
                  <TriangleAlert className="w-3 h-3" /> Que faire si...
                </div>
                <div className="space-y-1">
                  {QUE_FAIRE.map((c) => {
                    const Ic = ICONES[c.icone] || LifeBuoy;
                    const depliee = situation === c.id;
                    return (
                      <div key={c.id} className="rounded ring-1 ring-white/10 bg-white/[0.02] overflow-hidden">
                        <button
                          onClick={() => setSituation(depliee ? null : c.id)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 text-left active:bg-white/[0.06]"
                        >
                          <Ic className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                          <span className="flex-1 text-xs text-slate-100">{c.titre}</span>
                          {depliee
                            ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                            : <ChevronUp className="w-3.5 h-3.5 text-slate-500 rotate-180" />}
                        </button>
                        {depliee && (
                          <ol className="px-3 pb-2.5 pt-0.5 space-y-1.5">
                            {c.etapes.map((e, i) => (
                              <li key={i} className="flex gap-2 text-[11px] text-slate-300 leading-snug">
                                <span className="font-mono text-amber-400/80 shrink-0">{i + 1}.</span>
                                <span>{e}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. PRV ---------------------------------------------------- */}
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
                {REGLE_OR}
              </div>
            </div>
          </div>
        )}

        {/* Barre de declenchement (toujours visible) */}
        <button
          onClick={() => setOuvert((v) => !v)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 font-mono text-xs font-bold tracking-wider shadow-2xl transition-colors ${
            ouvert
              ? "rounded-b-xl ring-1 ring-red-500/40 bg-red-500/20 text-red-100"
              : "rounded-xl ring-1 ring-red-500/50 bg-red-500/15 text-red-200 active:bg-red-500/25"
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          {ouvert ? "FERMER" : "URGENCE — NUMÉROS · QUE FAIRE · PRV"}
          {ouvert ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}