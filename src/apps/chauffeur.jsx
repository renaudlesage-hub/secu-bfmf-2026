import React, { useState, useEffect, useCallback } from "react";
import {
  Car, MapPin, Clock, Package, Phone, RefreshCw, ArrowRight, Check, TriangleAlert, Navigation,
} from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";
import { STATUT_ATTRIBUEE, STATUT_EN_COURS, STATUT_RESOLU, CHAUFFEURS } from "./referentiels";

/* ---------------------------------------------------------------------
   APP CHAUFFEUR — BFMF 2026 (chauffeurs extérieurs)
   Vue terrain légère, comme l'équipe sanitaire : ouverte par lien direct,
   SANS menu, avec le bandeau urgence + SOS (montés par App.jsx).

   Le chauffeur voit UNIQUEMENT les demandes de transport que le QG lui a
   confiées (cible "chauffeur"). Il les fait avancer : Départ -> Arrivé.
   Partage la MEME clé que l'app transport du QG (bfmf2026-transport) :
   ce que le QG attribue, le chauffeur le voit, et inversement.

   Les demandes confiées à la VOLANTE ne remontent PAS ici (elles vivent
   dans l'app volante). Ici : seulement le circuit chauffeur extérieur.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const KEY_TRANSPORT = "bfmf2026-transport";
const CHOIX_CHAUFFEUR_KEY = "bfmf-chauffeur-nom"; // mémorise le chauffeur (local)

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
async function kvMerge(key, mutateur) {
  try {
    const base = await kvGet(key);
    const fusion = mutateur(Array.isArray(base) ? base : []);
    return (await kvSet(key, fusion)) ? fusion : null;
  } catch (e) { return null; }
}

const pad = (n) => String(n).padStart(2, "0");
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// Lien de géoguidage universel : ouvre l'app de navigation par défaut du
// téléphone (Google Maps, Plans iOS…) en mode itinéraire vers l'adresse.
const mapsUrl = (adresse) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;

const JOURS = {
  j0: "Ven 14/08 (montage)", j1: "Sam 15/08", j2: "Dim 16/08",
  j3: "Lun 17/08", j4: "Mar 18/08 (démontage)",
};
const NATURES = {
  artiste: { label: "Artiste / groupe", dot: "bg-violet-400", text: "text-violet-300" },
  staff: { label: "Staff / bénévole", dot: "bg-sky-400", text: "text-sky-300" },
  technique: { label: "Technique / prestataire", dot: "bg-amber-400", text: "text-amber-300" },
};
const VOLUMES = {
  aucun: "Aucun / bagages à main", leger: "Léger (sacs / valises)",
  moyen: "Moyen (matériel, instruments)", lourd: "Lourd / volumineux",
};

export default function Chauffeur() {
  const [demandes, setDemandes] = useState([]);
  const [monNom, setMonNom] = useState(null);
  const [nomInput, setNomInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(false);
  const [flash, setFlash] = useState("");

  // Restaure le nom du chauffeur choisi précédemment (local).
  useEffect(() => {
    try { const s = localStorage.getItem(CHOIX_CHAUFFEUR_KEY); if (s) setMonNom(s); } catch (e) {}
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await kvGet(KEY_TRANSPORT);
      setDemandes(Array.isArray(data) ? data : []);
      setSyncError(false);
    } catch (e) { setSyncError(true); }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 12000);
    return () => clearInterval(t);
  }, [refresh]);

  function choisirNom() {
    const n = nomInput.trim();
    if (n.length < 2) return;
    setMonNom(n);
    try { localStorage.setItem(CHOIX_CHAUFFEUR_KEY, n); } catch (e) {}
  }

  function changerNom() {
    setMonNom(null);
    try { localStorage.removeItem(CHOIX_CHAUFFEUR_KEY); } catch (e) {}
  }

  // Avance une course : Attribuee -> En cours (départ) -> Resolue (arrivée).
  async function avancer(id) {
    const h = nowHM();
    const fusion = await kvMerge(KEY_TRANSPORT, (liste) =>
      liste.map((d) => {
        if (d.id !== id) return d;
        if (d.statut === STATUT_ATTRIBUEE) return { ...d, statut: STATUT_EN_COURS, heureDepart: h };
        if (d.statut === STATUT_EN_COURS) return { ...d, statut: STATUT_RESOLU, heureArrivee: h };
        return d;
      }));
    if (fusion) {
      setDemandes(fusion); setSyncError(false);
      setFlash("Course mise à jour.");
      setTimeout(() => setFlash(""), 3000);
    } else setSyncError(true);
  }

  // Mes courses : confiées à un chauffeur (pas la volante), non terminées d'abord.
  const normalise = (s) => (s || "").trim().toLowerCase();
  const mesCourses = demandes
    .filter((d) => d.cible === "chauffeur" && (!monNom || normalise(d.chauffeur) === normalise(monNom)))
    .sort((a, b) => {
      const at = a.statut === STATUT_RESOLU ? 1 : 0;
      const bt = b.statut === STATUT_RESOLU ? 1 : 0;
      if (at !== bt) return at - bt;
      return (a.jour + (a.heure || "")).localeCompare(b.jour + (b.heure || ""));
    });

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
      `}</style>

      {/* En-tête simple */}
      <header className="border-b border-white/10 bg-[#141a22]/95 backdrop-blur sticky top-0 z-20 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-indigo-400/10 ring-1 ring-indigo-400/30 flex items-center justify-center">
              <Car className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-[15px] leading-none">MES COURSES</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · CHAUFFEUR</div>
            </div>
          </div>
          <button onClick={refresh} className="text-slate-500 hover:text-slate-200" title="Rafraîchir">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4 pb-28">
        {syncError && (
          <div className="rounded-md bg-red-500/10 ring-1 ring-red-500/30 text-red-300 text-xs px-3 py-2 flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 shrink-0" /> Synchronisation interrompue — la liste peut ne pas être à jour.
          </div>
        )}
        {flash && (
          <div className="rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-200 text-xs px-3 py-2 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" /> {flash}
          </div>
        )}

        {!monNom ? (
          /* Choix du profil (première utilisation) */
          <div className="rounded-xl ring-1 ring-white/10 bg-[#151b23] p-5 space-y-3">
            <div className="text-sm text-slate-300 font-semibold">Qui êtes-vous ?</div>
            <div className="text-[11px] text-slate-500">
              Choisissez votre profil dans la liste. Vous ne verrez que les courses qui vous sont confiées par le QG.
            </div>
            <select
              value={nomInput}
              onChange={(e) => setNomInput(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 text-sm text-white"
            >
              <option value="">Sélectionnez votre nom…</option>
              {CHAUFFEURS.map((c) => (
                <option key={c.id} value={c.nom}>{c.nom}</option>
              ))}
            </select>
            <button
              onClick={choisirNom}
              disabled={nomInput.trim().length < 2}
              className="w-full py-2.5 rounded-lg bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/50 font-mono text-sm font-semibold disabled:opacity-40"
            >
              Voir mes courses
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Chauffeur : <strong className="text-slate-200 font-medium">{monNom}</strong>
              </div>
              <button onClick={changerNom} className="text-[11px] font-mono text-slate-500 hover:text-slate-300 underline underline-offset-2">
                Changer
              </button>
            </div>

            {loading && demandes.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-10 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Chargement…
              </div>
            ) : mesCourses.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-10 rounded-xl border border-dashed border-white/10">
                Aucune course ne vous est attribuée pour l'instant.
              </div>
            ) : (
              <div className="space-y-2.5">
                {mesCourses.map((d) => <CarteCourse key={d.id} d={d} onAvancer={() => avancer(d.id)} />)}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ---- Carte d'une course (vue chauffeur) ---- */
function CarteCourse({ d, onAvancer }) {
  const nm = NATURES[d.nature] || NATURES.artiste;
  const termine = d.statut === STATUT_RESOLU;
  const enCours = d.statut === STATUT_EN_COURS;

  return (
    <div className={`rounded-xl ring-1 ${termine ? "ring-white/10 opacity-70" : enCours ? "ring-emerald-400/40" : "ring-indigo-400/30"} bg-[#151b23] p-4`}>
      {/* Qui + nombre */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2 h-2 rounded-full shrink-0 ${nm.dot}`} />
            <span className="font-display text-lg truncate">{d.qui}</span>
            <span className="text-xs text-slate-500 font-mono">×{d.nb}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{nm.label}</div>
        </div>
        {d.contact && (
          <a href={`tel:${d.contact.replace(/\s/g, "")}`} className="shrink-0 flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded ring-1 ring-emerald-400/40 bg-emerald-400/10 text-emerald-200">
            <Phone className="w-3.5 h-3.5" /> Appeler
          </a>
        )}
      </div>

      {/* Trajet — avec adresse et bouton GPS quand renseignés */}
      <div className="mt-3 rounded-lg bg-black/20 ring-1 ring-white/5 p-3 space-y-2.5">
        {/* Départ */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 text-sm min-w-0">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-300/70">Prise en charge</div>
              <div className="text-slate-200 truncate">{d.depuis}</div>
              {d.adresseDepart && <div className="text-[11px] text-slate-500 leading-snug">{d.adresseDepart}</div>}
            </div>
          </div>
          {d.adresseDepart && (
            <a
              href={mapsUrl(d.adresseDepart)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 flex items-center gap-1 text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-emerald-400/40 bg-emerald-400/10 text-emerald-200"
            >
              <Navigation className="w-3.5 h-3.5" /> GPS
            </a>
          )}
        </div>
        {/* Arrivée */}
        <div className="flex items-start justify-between gap-2 border-t border-white/5 pt-2.5">
          <div className="flex items-start gap-2 text-sm min-w-0">
            <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[9px] font-mono uppercase tracking-wider text-indigo-300/70">Destination finale</div>
              <div className="text-slate-100 font-medium truncate">{d.vers}</div>
              {d.adresseArrivee && <div className="text-[11px] text-slate-500 leading-snug">{d.adresseArrivee}</div>}
            </div>
          </div>
          {d.adresseArrivee && (
            <a
              href={mapsUrl(d.adresseArrivee)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 flex items-center gap-1 text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-indigo-400/50 bg-indigo-400/15 text-indigo-100"
            >
              <Navigation className="w-3.5 h-3.5" /> GPS
            </a>
          )}
        </div>
      </div>

      {/* Horaires : rendez-vous (prise en charge) + arrivée souhaitée */}
      {(d.heure || d.heureDest) && (
        <div className="mt-2.5 rounded-lg bg-black/20 ring-1 ring-white/5 px-3 py-2 flex items-center justify-around text-center">
          {d.heure && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">RDV prise en charge</div>
              <div className="font-mono text-base text-amber-200 font-bold">{d.heure}</div>
            </div>
          )}
          {d.heure && d.heureDest && <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />}
          {d.heureDest && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Arrivée souhaitée</div>
              <div className="font-mono text-base text-indigo-200 font-bold">{d.heureDest}</div>
            </div>
          )}
        </div>
      )}

      {/* Infos pratiques */}
      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 flex-wrap">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {JOURS[d.jour] || d.jour}</span>
        <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {VOLUMES[d.volume] || "—"}</span>
      </div>
      {d.note && <div className="mt-2 text-[11px] text-slate-300 bg-white/[0.02] rounded p-2 leading-snug">{d.note}</div>}

      {/* Action : Départ -> Arrivée */}
      <div className="mt-3">
        {d.statut === STATUT_ATTRIBUEE && (
          <button onClick={onAvancer} className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-display text-base tracking-wide flex items-center justify-center gap-2 transition-colors">
            <Car className="w-5 h-5" /> C'est parti (départ)
          </button>
        )}
        {enCours && (
          <button onClick={onAvancer} className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-display text-base tracking-wide flex items-center justify-center gap-2 transition-colors">
            <Check className="w-5 h-5" /> Arrivé à destination
          </button>
        )}
        {termine && (
          <div className="text-center py-2 text-emerald-300/80 text-sm flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" /> Course terminée{d.heureArrivee ? ` à ${d.heureArrivee}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}