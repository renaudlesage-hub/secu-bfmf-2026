import React, { useState, useEffect } from "react";
import { WifiOff, CloudUpload, CheckCircle2 } from "lucide-react";
import { demarrerRejeu, rejouerFile } from "./file-attente";

/* ------------------------------------------------------------------
   INDICATEUR RESEAU — bandeau discret en haut des apps terrain.
   Ne s'affiche QUE s'il y a un probleme : hors ligne, ou des messages
   non transmis en attente. Invisible quand tout va bien.

   Objectif : que personne ne croie qu'un message est parti alors qu'il
   dort dans la file. Le silence n'est pas une confirmation.
------------------------------------------------------------------ */
export default function IndicateurReseau() {
  const [enAttente, setEnAttente] = useState(0);
  const [enLigne, setEnLigne] = useState(true);
  const [succes, setSucces] = useState(false); // flash bref apres rattrapage

  useEffect(() => {
    let precedent = 0;
    const arreter = demarrerRejeu(({ enAttente: n, enLigne: ol }) => {
      // La file vient de se vider : on confirme visuellement 4 secondes.
      if (precedent > 0 && n === 0) {
        setSucces(true);
        setTimeout(() => setSucces(false), 4000);
      }
      precedent = n;
      setEnAttente(n);
      setEnLigne(ol);
    });
    return arreter;
  }, []);

  // Tout va bien et rien en attente : on n'affiche rien.
  if (enLigne && enAttente === 0 && !succes) return null;

  if (succes) {
    return (
      <div className="w-full bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-200 text-xs font-mono px-3 py-1.5 flex items-center justify-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Messages en attente transmis au QG
      </div>
    );
  }

  const critique = enAttente > 0;

  return (
    <div
      className={`w-full text-xs font-mono px-3 py-1.5 flex items-center justify-center gap-2 ring-1 ${
        critique
          ? "bg-amber-500/15 ring-amber-400/40 text-amber-100"
          : "bg-slate-500/15 ring-slate-400/30 text-slate-300"
      }`}
    >
      {critique ? <CloudUpload className="w-3.5 h-3.5 shrink-0" /> : <WifiOff className="w-3.5 h-3.5 shrink-0" />}
      {critique ? (
        <span>
          <span className="font-bold">{enAttente} message(s) NON transmis</span> — envoi automatique dès le retour du réseau.
          {" "}Urgence vitale : 112 + radio.
        </span>
      ) : (
        <span>Hors ligne — les envois seront mis en attente.</span>
      )}
      {critique && (
        <button
          onClick={() => rejouerFile()}
          className="underline shrink-0 opacity-80 hover:opacity-100"
        >
          réessayer
        </button>
      )}
    </div>
  );
}
