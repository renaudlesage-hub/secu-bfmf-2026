import React, { useState } from "react";
import { Lightbulb, X, Check, AlertTriangle, ThumbsUp, Wrench, PackageX } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/* ---------------------------------------------------------------------
   BOUTON REX — capture du retour d'expérience À CHAUD, sur toutes les apps.
   Monté une seule fois dans App.jsx (comme les bandeaux), il apparaît donc
   partout sans toucher aux apps elles-mêmes.

   Capture asynchrone : on écrit ponctuellement une entrée dans app_store
   (clé bfmf2026-rex). Pas de polling ici → aucun coût d'egress permanent.
   Chaque entrée : nature, texte, heure, app d'origine, auteur (profil).
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const KEY_REX = "bfmf2026-rex";
const PROFILE_KEY = "bfmf2026-profil";

// Natures de remontée REX (menu déroulant).
export const REX_NATURES = [
  { id: "dysfonctionnement", label: "Dysfonctionnement", icone: AlertTriangle, couleur: "text-red-300" },
  { id: "bonne_pratique", label: "Bonne pratique à garder", icone: ThumbsUp, couleur: "text-emerald-300" },
  { id: "amelioration", label: "Idée d'amélioration", icone: Wrench, couleur: "text-sky-300" },
  { id: "manque_moyen", label: "Manque de moyen", icone: PackageX, couleur: "text-amber-300" },
];

async function kvGet(key) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: SB_HEADERS, credentials: "omit" }
  );
  if (!r.ok) throw new Error("GET " + r.status);
  const j = await r.json();
  return j.length ? j[0].value : null;
}
async function kvSet(key, value) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_store`, {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates" },
    credentials: "omit",
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  return r.ok;
}
function monNom() {
  try {
    const s = localStorage.getItem(PROFILE_KEY);
    if (s) { const p = JSON.parse(s); return p.nom || "Anonyme"; }
  } catch (e) {}
  return "Anonyme";
}
const pad = (n) => String(n).padStart(2, "0");

// Libellé lisible de l'app d'origine, déduit du hash courant.
function appOrigine() {
  const h = (window.location.hash || "").replace("#", "").split("/")[0];
  return h || "inconnue";
}

export default function BoutonRex() {
  const [ouvert, setOuvert] = useState(false);
  const [nature, setNature] = useState("dysfonctionnement");
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [ok, setOk] = useState(false);
  const [erreur, setErreur] = useState(false);

  async function envoyer() {
    if (!texte.trim()) return;
    setEnvoi(true); setErreur(false);
    const d = new Date();
    const entree = {
      id: "rex" + Date.now(),
      nature,
      texte: texte.trim(),
      app: appOrigine(),
      auteur: monNom(),
      heure: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      date: d.toISOString(),
    };
    try {
      // Lecture-ajout-écriture : on ne scrute pas en boucle, on lit juste au
      // moment d'écrire pour ne pas écraser les autres remontées.
      const actuel = await kvGet(KEY_REX);
      const liste = Array.isArray(actuel) ? actuel : [];
      const okSet = await kvSet(KEY_REX, [entree, ...liste]);
      if (!okSet) throw new Error("write");
      setOk(true);
      setTexte("");
      setTimeout(() => { setOk(false); setOuvert(false); }, 1200);
    } catch (e) {
      setErreur(true);
    }
    setEnvoi(false);
  }

  return (
    <>
      {/* Bouton flottant, discret, en bas à droite (le toggle menu est à gauche) */}
      <button
        onClick={() => { setOuvert(true); setOk(false); setErreur(false); }}
        className="fixed bottom-4 right-4 z-[64] flex items-center gap-1.5 px-3 h-11 rounded-full bg-violet-600/90 hover:bg-violet-500 ring-1 ring-violet-300/40 shadow-xl text-white active:scale-95 transition-all"
        title="Remonter un point de retour d'expérience"
      >
        <Lightbulb className="w-4 h-4" />
        <span className="text-xs font-mono font-semibold tracking-wide">REX</span>
      </button>

      {/* Pavé de saisie */}
      {ouvert && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-3" onClick={() => setOuvert(false)}>
          <div className="bg-[#141a22] rounded-xl ring-1 ring-white/15 w-full max-w-sm p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display tracking-wide text-slate-100 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-violet-300" /> Retour d'expérience
              </h2>
              <button onClick={() => setOuvert(false)} className="text-slate-500 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            {ok ? (
              <div className="py-6 text-center text-emerald-300 flex flex-col items-center gap-2">
                <Check className="w-8 h-8" />
                <span className="text-sm font-mono">Remontée enregistrée. Merci !</span>
              </div>
            ) : (
              <>
                <div className="text-[11px] font-mono text-slate-500 leading-relaxed">
                  Noté à chaud, relu au débriefing. Court et concret suffit.
                </div>

                {/* Menu déroulant : nature de la remontée */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">Nature</label>
                  <select
                    value={nature}
                    onChange={(e) => setNature(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-400/50"
                  >
                    {REX_NATURES.map((n) => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                </div>

                {/* Champ de texte libre */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">Ce que tu veux remonter</label>
                  <textarea
                    autoFocus
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    rows={3}
                    placeholder="Ex : le canal PMR15 sature aux heures de pointe, prévoir un 2e canal l'an prochain."
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-400/50 resize-none"
                  />
                </div>

                {erreur && (
                  <div className="text-[11px] text-amber-300 font-mono">Enregistrement impossible — réessaie dans un instant.</div>
                )}

                <button
                  onClick={envoyer}
                  disabled={!texte.trim() || envoi}
                  className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-display text-sm tracking-wide disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {envoi ? "Enregistrement…" : "Remonter ce point"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}