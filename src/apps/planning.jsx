import React, { useState, useEffect } from "react";
import { CalendarDays, Footprints, Music, Clock, MapPin } from "lucide-react";
import { HORAIRES, PROGRAMMATION } from "./referentiels";

/* ---------------------------------------------------------------------
   APP PLANNING WEEK-END — BFMF 2026
   Vue chronologique consolidée pour le QG et les équipes : fusionne, pour
   chaque jour, les DÉPARTS DE BALADE (referentiels HORAIRES) et les
   CONCERTS (referentiels PROGRAMMATION) sur une même timeline triée par
   heure. Lecture seule : aucune écriture Supabase, aucun egress.

   Les heures après minuit (00h15, 01h00) restent rattachées à la soirée
   qui les a ouvertes et sont donc triées APRÈS 23h59 (on leur ajoute
   +24h pour le tri uniquement, l'affichage garde l'heure réelle).
--------------------------------------------------------------------- */

// "17:30" -> minutes depuis minuit ; "00:15"/"01:00" -> +24h pour le tri
function minutesTri(hhmm) {
  const [h, m] = hhmm.replace("h", ":").split(":").map((x) => parseInt(x, 10));
  let mn = h * 60 + (m || 0);
  if (h < 6) mn += 24 * 60; // après minuit = fin de soirée, pas début de journée
  return mn;
}

// Normalise "13h00" ou "13:00" -> "13:00"
const fmtH = (h) => h.replace("h", ":");

export default function Planning() {
  const [now, setNow] = useState(new Date());
  const [jourActif, setJourActif] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Construit la timeline fusionnée d'un jour (balades + concerts triés)
  function timelineDuJour(idx) {
    const h = HORAIRES[idx];
    const prog = PROGRAMMATION[idx];
    const items = [];

    (h?.departs || []).forEach((d) => {
      items.push({ type: "balade", heure: fmtH(d), label: "Départ balade — Point 0" });
    });
    (prog?.concerts || []).forEach((c) => {
      items.push({ type: "concert", heure: c.heure, label: c.artiste, scene: c.scene });
    });

    return items.sort((a, b) => minutesTri(a.heure) - minutesTri(b.heure));
  }

  // Heure actuelle en minutes (avec la même logique après-minuit)
  const maintenantMin = (() => {
    let mn = now.getHours() * 60 + now.getMinutes();
    if (now.getHours() < 6) mn += 24 * 60;
    return mn;
  })();

  // Extrait [jour, mois] depuis un libellé "Samedi 15/08" -> [15, 8].
  function dateDuLibelle(libelle) {
    const m = (libelle || "").match(/(\d{1,2})\/(\d{1,2})/);
    return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
  }

  // Compare le jour AFFICHÉ à la date réelle : renvoie "avant" | "aujourdhui" | "apres".
  // Les créneaux après minuit (< 6h) appartiennent encore à la soirée de la veille,
  // donc on rattache la nuit au jour du planning correspondant.
  function positionJour(jourLibelle) {
    const d = dateDuLibelle(jourLibelle);
    if (!d) return "aujourdhui"; // au pire, comportement horaire seul
    const [jour, mois] = d;
    // Date réelle, en tenant compte de la nuit (avant 6h = encore la veille au soir)
    const ref = new Date(now);
    if (ref.getHours() < 6) ref.setDate(ref.getDate() - 1);
    const rJour = ref.getDate();
    const rMois = ref.getMonth() + 1;
    if (rMois === mois && rJour === jour) return "aujourdhui";
    // comparaison simple mois puis jour
    if (rMois < mois || (rMois === mois && rJour < jour)) return "apres";
    return "avant";
  }

  // Un item est "en cours" s'il a commencé et que le suivant n'a pas encore commencé,
  // ET SEULEMENT si le jour affiché est le jour réel (sinon on aurait "en cours"
  // sur les deux jours à la même heure).
  function statutItem(items, i, jourLibelle) {
    const pos = positionJour(jourLibelle);
    if (pos === "avant") return "passe";   // jour déjà écoulé : tout est passé
    if (pos === "apres") return "avenir";  // jour futur : tout est à venir
    // pos === "aujourdhui" : logique horaire habituelle
    const debut = minutesTri(items[i].heure);
    const finApprox = i + 1 < items.length ? minutesTri(items[i + 1].heure) : debut + 60;
    if (maintenantMin >= debut && maintenantMin < finApprox) return "encours";
    if (maintenantMin >= finApprox) return "passe";
    return "avenir";
  }

  const jours = HORAIRES.map((h) => h.jour);
  const items = timelineDuJour(jourActif);

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans">
      <header className="border-b border-white/10 bg-[#151b23]/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-sky-400/10 ring-1 ring-sky-400/30 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-sky-300" />
          </div>
          <div className="min-w-0">
            <div className="font-display tracking-wide text-[15px] leading-none">PLANNING DU WEEK-END</div>
            <div className="text-[11px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · Balades & Concerts</div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Sélecteur de jour */}
        <div className="grid grid-cols-2 gap-2">
          {jours.map((j, i) => (
            <button
              key={j}
              onClick={() => setJourActif(i)}
              className={`rounded-xl p-3 ring-1 transition-colors flex flex-col items-center gap-1 ${
                jourActif === i ? "ring-sky-400/50 bg-sky-400/10 text-sky-200" : "ring-white/10 bg-[#151b23] text-slate-400"
              }`}
            >
              <span className="font-display text-sm">{j}</span>
              <span className="text-[10px] font-mono text-slate-500">
                {HORAIRES[i].departs.length} balades · {PROGRAMMATION[i].concerts.length} concerts
              </span>
            </button>
          ))}
        </div>

        {/* Timeline du jour */}
        <div className="space-y-2">
          {items.map((it, i) => {
            const st = statutItem(items, i, jours[jourActif]);
            const estBalade = it.type === "balade";
            return (
              <div
                key={i}
                className={`rounded-xl p-3 ring-1 flex items-center gap-3 transition-opacity ${
                  st === "passe" ? "opacity-40" : ""
                } ${
                  st === "encours"
                    ? "ring-emerald-400/50 bg-emerald-400/[0.06]"
                    : estBalade
                    ? "ring-amber-400/20 bg-amber-400/[0.03]"
                    : "ring-white/10 bg-[#151b23]"
                }`}
              >
                <div className="font-mono text-sm font-bold text-slate-200 w-14 shrink-0 text-right">{it.heure}</div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  estBalade ? "bg-amber-400/10 text-amber-300" : "bg-sky-400/10 text-sky-300"
                }`}>
                  {estBalade ? <Footprints className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-100 font-medium truncate">{it.label}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                    {estBalade ? (
                      <><MapPin className="w-3 h-3" /> Départ groupe balade</>
                    ) : (
                      <>Scène {it.scene}</>
                    )}
                  </div>
                </div>
                {st === "encours" && (
                  <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded bg-emerald-400/15 text-emerald-300 shrink-0">
                    En cours
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-[10px] text-slate-600 font-mono text-center pt-2 leading-relaxed">
          <Clock className="w-3 h-3 inline mr-1" />
          Fin du festival dans la nuit du dimanche au lundi. Départs balade : 3 groupes/jour.
        </div>
      </div>
    </div>
  );
}