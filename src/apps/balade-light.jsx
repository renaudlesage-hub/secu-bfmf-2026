import React, { useState, useEffect, useCallback } from "react";
import { MapPin, ChevronRight, RefreshCw, TriangleAlert, Users, Check, Footprints } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";
import { envoyer as envoyerAvecFile, demarrerRejeu } from "./file-attente";

/* =========================================================================
   BALADE — VERSION LIGHT (accompagnateurs terrain)
   -------------------------------------------------------------------------
   Vue simplifiee pour les accompagnateurs sur le parcours. Elle PARTAGE la
   meme donnee que l'app complete (cle "bfmf2026-suivi-balade") : le QG cree
   et gere les groupes depuis l'app complete, l'accompagnateur les fait juste
   avancer d'etape en etape depuis ici.

   Ce que garde cette version : le choix de son groupe, l'avancement, un
   apercu des 2 autres groupes, et le SOS (bandeau d'urgence en bas d'ecran
   monte par App.jsx, plus le bouton SOS flottant du BandeauUrgence).

   Ce qu'elle N'A PAS (volontairement) :
   - creation / suppression / edition de groupes (reserve au QG)
   - la RADIO : les accompagnateurs de balade n'ont PAS de radio. Aucune
     mention de canal / call sign ici.
   - les agregats crowd management, le detail historique, l'export.
   ========================================================================= */

const STORAGE_KEY = "bfmf2026-suivi-balade";        // meme cle que l'app complete
const ALERT_KEY = "bfmf2026-suivi-balade-alerte";
const CHOIX_GROUPE_KEY = "bfmf-balade-light-groupe"; // memorise le groupe choisi (local)

// Positions successives — identiques a l'app complete (source de verite).
const POSITIONS = [
  { id: "p0", label: "Point 0 (départ)", court: "P0" },
  { id: "t1", label: "En transit → Etape 1", court: "→E1" },
  { id: "e1", label: "Etape 1 — Rue Sainte-Barbe", court: "E1" },
  { id: "t2", label: "En transit → Etape 2", court: "→E2" },
  { id: "e2", label: "Etape 2 — Rue de Jehonhe", court: "E2" },
  { id: "t3", label: "En transit → Etape 3", court: "→E3" },
  { id: "e3", label: "Etape 3 — Rue de la Chapelle", court: "E3" },
  { id: "tr", label: "En transit → retour Point 0", court: "→P0" },
  { id: "ret", label: "Rentré au Point 0", court: "Rentré" },
];

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

function pad(n) { return n < 10 ? `0${n}` : `${n}`; }
function nowHM() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function posIndex(id) { const i = POSITIONS.findIndex((p) => p.id === id); return i < 0 ? 0 : i; }
function posLabel(id) { const p = POSITIONS.find((x) => x.id === id); return p ? p.label : id; }
function posCourt(id) { const p = POSITIONS.find((x) => x.id === id); return p ? p.court : id; }

async function kvGet(key) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: SB_HEADERS, credentials: "omit" }
  );
  if (!r.ok) throw new Error(`Supabase GET ${r.status}`);
  const j = await r.json();
  return j.length ? j[0].value : null;
}

/* ============================ APP ============================ */
export default function BaladeLight() {
  const [groupes, setGroupes] = useState([]);
  const [monGroupeId, setMonGroupeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(false);
  const [flash, setFlash] = useState("");

  // Rejeu de la file d'attente au demarrage (zones sans 4G sur le parcours).
  useEffect(() => { demarrerRejeu(); }, []);

  // Restaure le groupe choisi precedemment (memorise en local).
  useEffect(() => {
    try {
      const s = localStorage.getItem(CHOIX_GROUPE_KEY);
      if (s) setMonGroupeId(s);
    } catch (e) {}
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await kvGet(STORAGE_KEY);
      setGroupes(Array.isArray(data) ? data : []);
      setSyncError(false);
    } catch (e) {
      setSyncError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 12000);
    return () => clearInterval(t);
  }, [refresh]);

  function choisirGroupe(id) {
    setMonGroupeId(id);
    try { localStorage.setItem(CHOIX_GROUPE_KEY, id); } catch (e) {}
  }

  // Fait avancer un groupe a la position suivante. Ecrit dans la MEME cle que
  // le QG : la progression est vue partout. Passe par la file d'attente pour
  // survivre aux micro-coupures reseau du parcours.
  async function avancer(id) {
    // On relit la liste la plus fraiche AVANT d'ecrire : le QG peut avoir
    // modifie un autre groupe entre-temps. Ainsi on ne fait progresser que
    // NOTRE groupe sans ecraser les changements des autres (dans la mesure
    // du possible — l'ecriture reste last-write-wins).
    let base = groupes;
    try {
      const frais = await kvGet(STORAGE_KEY);
      if (Array.isArray(frais)) { base = frais; setGroupes(frais); }
    } catch (e) { /* hors reseau : on avance sur la copie locale */ }

    const g = base.find((x) => x.id === id);
    if (!g) return;
    const i = posIndex(g.position);
    if (i >= POSITIONS.length - 1) return;
    const next = POSITIONS[i + 1];

    const changes = { position: next.id };
    if (next.id === "ret") changes.heureRetour = nowHM();
    const histo = [...(g.historique || []), { heure: nowHM(), texte: `Position: ${next.label}` }];

    const nouveauxGroupes = base.map((x) =>
      x.id === id ? { ...x, ...changes, historique: histo } : x
    );
    setGroupes(nouveauxGroupes); // optimiste : reactif tout de suite

    const etat = await envoyerAvecFile(STORAGE_KEY, nouveauxGroupes, "ecriture");
    if (etat === "en_attente") setFlash("Réseau instable — l'avancée partira au retour du réseau.");
    else if (etat === "perdu") { setSyncError(true); setFlash("Échec — réessayez."); }
    else setFlash(`Groupe déplacé : ${next.label}`);
    setTimeout(() => setFlash(""), 4000);
  }

  const monGroupe = groupes.find((g) => g.id === monGroupeId) || null;
  const autres = groupes.filter((g) => g.id !== monGroupeId);

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .pulse-slow { animation: ps 2s ease-in-out infinite; }
        @keyframes ps { 0%,100%{opacity:1} 50%{opacity:.45} }
      `}</style>

      {/* En-tete simple */}
      <header className="border-b border-white/10 bg-[#141a22]/95 backdrop-blur sticky top-0 z-20 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-cyan-400/10 ring-1 ring-cyan-400/30 flex items-center justify-center">
              <Footprints className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-[15px] leading-none">SUIVI BALADE</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · ACCOMPAGNATEUR</div>
            </div>
          </div>
          <button onClick={refresh} className="text-slate-500 hover:text-slate-200" title="Rafraîchir">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4 pb-28">
        {/* Perte de synchronisation en lecture */}
        {syncError && (
          <div className="rounded-md bg-red-500/10 ring-1 ring-red-500/30 text-red-300 text-xs px-3 py-2 flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 shrink-0" />
            Synchronisation interrompue — les positions affichées peuvent ne pas être à jour.
          </div>
        )}

        {/* Confirmation d'action */}
        {flash && (
          <div className="rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-200 text-xs px-3 py-2 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" /> {flash}
          </div>
        )}

        {loading && groupes.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-10 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Chargement des groupes…
          </div>
        ) : groupes.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-10 rounded-xl border border-dashed border-white/10">
            Aucun groupe n'a encore été créé par le QG.
          </div>
        ) : !monGroupe ? (
          /* --- Choix du groupe (premiere utilisation) --- */
          <div className="space-y-3">
            <div className="text-sm text-slate-300 font-semibold">Quel groupe accompagnez-vous ?</div>
            {groupes.map((g) => (
              <button
                key={g.id}
                onClick={() => choisirGroupe(g.id)}
                className="w-full text-left rounded-xl ring-1 ring-white/10 bg-[#151b23] hover:bg-[#1a212b] p-4 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-display text-lg">{g.nom}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {g.participants} participants · Actuellement : {posCourt(g.position)}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>
            ))}
          </div>
        ) : (
          /* --- Vue principale : mon groupe en grand --- */
          <>
            <MonGroupe groupe={monGroupe} onAvancer={() => avancer(monGroupe.id)} onChanger={() => setMonGroupeId(null)} />

            {/* Apercu des autres groupes */}
            {autres.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Autres groupes</div>
                {autres.map((g) => (
                  <div key={g.id} className="rounded-lg ring-1 ring-white/[0.07] bg-white/[0.02] px-3 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Users className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="font-display text-sm truncate">{g.nom}</span>
                      <span className="text-[11px] text-slate-500">{g.participants} pers.</span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded ring-1 ring-white/10 text-slate-300 shrink-0">
                      {posCourt(g.position)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ---- Carte du groupe principal ---- */
function MonGroupe({ groupe, onAvancer, onChanger }) {
  const i = posIndex(groupe.position);
  const arrive = groupe.position === "ret";
  const suivante = i < POSITIONS.length - 1 ? POSITIONS[i + 1] : null;

  return (
    <div className="rounded-2xl ring-1 ring-cyan-400/25 bg-[#151b23] p-5 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-display text-2xl tracking-wide">{groupe.nom}</div>
          <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-1">
            <Users className="w-4 h-4" /> {groupe.participants} participants
          </div>
        </div>
        <button onClick={onChanger} className="text-[11px] font-mono text-slate-500 hover:text-slate-300 underline underline-offset-2">
          Changer
        </button>
      </div>

      {/* Position actuelle, bien visible */}
      <div className="mt-4 rounded-xl bg-cyan-400/[0.07] ring-1 ring-cyan-400/20 px-4 py-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300/70">Position actuelle</div>
        <div className="flex items-center gap-2 mt-1 text-cyan-100 font-display text-lg">
          <MapPin className="w-5 h-5 text-cyan-300" /> {posLabel(groupe.position)}
        </div>
      </div>

      {/* Bouton d'avancement — l'action principale */}
      {arrive ? (
        <div className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-200 font-semibold">
          <Check className="w-5 h-5" /> Groupe rentré au Point 0
        </div>
      ) : (
        <button
          onClick={onAvancer}
          className="mt-4 w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-display text-lg tracking-wide transition-colors shadow"
        >
          {suivante ? <>Avancer → {suivante.court}</> : "Avancer"}
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
      <div className="text-[10px] text-slate-500 text-center mt-2">
        Touchez « Avancer » quand le groupe arrive à l'étape ou repart vers la suivante.
      </div>
    </div>
  );
}