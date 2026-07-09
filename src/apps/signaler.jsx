import React, { useState, useEffect } from "react";
import { Droplets, CheckCircle2, ChevronDown, Send, MapPin } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";
import { LIEUX, TYPES_SIGNALEMENT, KEY_SANITAIRE } from "./lieux-sanitaires";

/* ---------------------------------------------------------------------
   SIGNALEMENT SANITAIRE -- page PUBLIQUE (QR codes)
   Chaque QR pointe vers #signaler/ID_DU_LIEU : le festivalier arrive sur
   une page pre-remplie, tape le probleme, c'est transmis a l'equipe
   sanitaire et au dashboard QG. Aucune donnee personnelle demandee.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

async function kvGet(key) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: SB_HEADERS }
  );
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

function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ID du lieu depuis le hash : #signaler/wc-e2
function lieuDepuisHash() {
  const m = window.location.hash.match(/^#signaler\/([\w-]+)/);
  if (!m) return null;
  return LIEUX.find((l) => l.id === m[1]) || null;
}

export default function Signaler() {
  const [lieu, setLieu] = useState(lieuDepuisHash());
  const [type, setType] = useState(null);
  const [commentaire, setCommentaire] = useState("");
  const [etat, setEtat] = useState("form"); // form | envoi | merci | erreur | trop
  useEffect(() => {
    const onHash = () => setLieu(lieuDepuisHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const types = lieu
    ? TYPES_SIGNALEMENT.filter((t) => t.equip.includes(lieu.equip))
    : TYPES_SIGNALEMENT;

  async function envoyer() {
    if (!lieu || !type) return;
    // Anti-spam simple : 1 signalement / minute / appareil
    try {
      const dernier = Number(localStorage.getItem("bfmf-sanitaire-dernier") || 0);
      if (Date.now() - dernier < 60000) { setEtat("trop"); return; }
    } catch (e) {}
    setEtat("envoi");
    try {
      const liste = (await kvGet(KEY_SANITAIRE)) || [];
      // Deduplication : meme lieu + meme type non resolu -> on incremente
      const existant = liste.find(
        (s) => s.locId === lieu.id && s.type === type.id && s.statut !== "resolu"
      );
      let next;
      if (existant) {
        next = liste.map((s) =>
          s === existant
            ? { ...s, count: (s.count || 1) + 1, heure: nowHM(), commentaire: commentaire.trim() || s.commentaire }
            : s
        );
      } else {
        next = [
          {
            id: "san" + Date.now(),
            heure: nowHM(),
            date: new Date().toISOString(),
            locId: lieu.id, locNom: lieu.nom, zone: lieu.zone, equip: lieu.equip,
            type: type.id, typeLabel: type.label,
            commentaire: commentaire.trim(),
            count: 1, statut: "nouveau", prisPar: "", heurePrise: "", heureResolution: "",
          },
          ...liste,
        ].slice(0, 200);
      }
      const ok = await kvSet(KEY_SANITAIRE, next);
      if (!ok) throw new Error();
      try { localStorage.setItem("bfmf-sanitaire-dernier", String(Date.now())); } catch (e) {}
      setEtat("merci");
    } catch (e) {
      setEtat("erreur");
    }
  }

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
      `}</style>

      <header className="bg-[#151b23] border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <Droplets className="w-5 h-5 text-sky-300" />
        <div>
          <div className="font-display tracking-wide text-sm">UN SOUCI SANITAIRE ?</div>
          <div className="text-[10px] text-slate-400">Bucolique Ferrieres Musique Festival 2026</div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full p-5">
        {etat === "form" && (
          <>
            {/* Lieu */}
            <div className="mb-5">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">Ou etes-vous ?</div>
              {lieu ? (
                <div className="flex items-center gap-2 rounded-lg ring-1 ring-sky-400/40 bg-sky-400/10 px-3 py-3">
                  <MapPin className="w-4 h-4 text-sky-300 shrink-0" />
                  <span className="text-sm text-slate-100">{lieu.nom}</span>
                </div>
              ) : (
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-[#232b36] ring-1 ring-white/25 rounded-lg px-3 py-3 text-[16px] text-white focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                    defaultValue=""
                    onChange={(e) => setLieu(LIEUX.find((l) => l.id === e.target.value) || null)}
                  >
                    <option value="" disabled>Choisissez le lieu...</option>
                    {LIEUX.map((l) => (
                      <option key={l.id} value={l.id}>{l.nom}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Probleme : gros boutons tactiles */}
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">Quel est le probleme ?</div>
            <div className="space-y-2 mb-5">
              {types.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t)}
                  className={`w-full text-left px-4 py-3.5 rounded-lg ring-1 text-[15px] transition-colors ${
                    type && type.id === t.id
                      ? "ring-sky-400/70 bg-sky-400/20 text-white"
                      : "ring-white/20 bg-[#1a212b] text-slate-200 hover:ring-white/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">Precision (facultatif)</div>
            <textarea
              className="w-full bg-[#232b36] ring-1 ring-white/25 rounded-lg px-3 py-3 text-[16px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60 mb-5"
              rows={2}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Ex: cabine du fond"
            />

            <button
              disabled={!lieu || !type}
              onClick={envoyer}
              className={`w-full py-4 rounded-lg font-display text-lg tracking-wider flex items-center justify-center gap-2 transition-all ${
                lieu && type
                  ? "ring-2 ring-sky-400/70 bg-sky-500/25 text-sky-100 hover:bg-sky-500/40 active:scale-[0.98]"
                  : "ring-1 ring-white/10 text-slate-600 cursor-not-allowed"
              }`}
            >
              <Send className="w-5 h-5" /> PREVENIR L'EQUIPE
            </button>
            <div className="text-[11px] text-slate-500 text-center mt-3 leading-relaxed">
              Anonyme et instantane. L'equipe sanitaire du festival est prevenue directement. Merci pour tous !
            </div>
          </>
        )}

        {etat === "envoi" && (
          <div className="text-center pt-16 text-slate-300">Envoi en cours...</div>
        )}

        {etat === "merci" && (
          <div className="text-center pt-12 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-300 mx-auto" />
            <div className="font-display text-2xl text-emerald-200">MERCI !</div>
            <div className="text-sm text-slate-300 leading-relaxed">
              L'equipe sanitaire est prevenue et passera des que possible.
              <br />Bon festival !
            </div>
          </div>
        )}

        {etat === "trop" && (
          <div className="text-center pt-12 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-sky-300 mx-auto" />
            <div className="font-display text-xl text-sky-200">C'EST DEJA NOTE !</div>
            <div className="text-sm text-slate-300">Un signalement vient d'etre envoye depuis cet appareil. L'equipe est prevenue.</div>
          </div>
        )}

        {etat === "erreur" && (
          <div className="text-center pt-12 space-y-4">
            <div className="font-display text-xl text-amber-200">ENVOI IMPOSSIBLE</div>
            <div className="text-sm text-slate-300">Reseau indisponible. Signalez le probleme a un benevole, merci !</div>
            <button onClick={() => setEtat("form")} className="text-xs text-slate-400 underline">Reessayer</button>
          </div>
        )}
      </main>

      <footer className="text-center text-[10px] text-slate-600 px-4 py-3">
        BFMF 2026 · Signalement anonyme · Aucune donnee personnelle collectee
      </footer>
    </div>
  );
}
