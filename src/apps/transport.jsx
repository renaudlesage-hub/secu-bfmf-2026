import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Car, MapPin, Clock, Package, Phone, RefreshCw, Download,
  Plus, X, Check, ArrowRight, Trash2, TriangleAlert, Truck, Users, Navigation,
} from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";
import { STATUTS, STATUT_INITIAL, STATUT_ATTRIBUEE, STATUT_EN_COURS, STATUT_RESOLU } from "./referentiels";

/* ---------------------------------------------------------------------
   TRANSPORT DE PERSONNES -- BFMF 2026
   Le responsable programmation saisit ses BESOINS de transport (artistes,
   groupes, staff, benevoles) : qui, combien, d'ou, vers ou, quand, volume
   de materiel a embarquer, contact. Le QG attribue ensuite chaque demande
   a un chauffeur et en suit l'avancement, comme les missions logistiques.

   Cycle de statut IDENTIQUE aux missions (source unique referentiels.js) :
     A traiter -> Attribuee (chauffeur designe) -> En cours -> Resolue.

   Persistance Supabase partagee (cle bfmf2026-transport) : ce qui est saisi
   par la programmation est vu au QG, et inversement. Aucune donnee sensible
   (pas de cachet/contrat : uniquement l'operationnel du deplacement).
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const KEY_TRANSPORT = "bfmf2026-transport";
// Attribution "volante" : la demande devient une mission logistique classique,
// vue par l'app volante existante (qui lit cette cle et filtre sur attribueA).
const KEY_MISSIONS = "bfmf2026-missions-logistique";

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
// Relecture-modification-ecriture : evite d'ecraser une saisie concurrente.
async function kvMerge(key, mutateur) {
  try {
    const base = await kvGet(key);
    const fusion = mutateur(Array.isArray(base) ? base : []);
    return (await kvSet(key, fusion)) ? fusion : null;
  } catch (e) {
    return null;
  }
}

const pad = (n) => String(n).padStart(2, "0");
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// Jours du festival (+ veille/lendemain souvent concernes par les transferts).
const JOURS = [
  { id: "j0", label: "Ven 14/08 (montage)" },
  { id: "j1", label: "Sam 15/08" },
  { id: "j2", label: "Dim 16/08" },
  { id: "j3", label: "Lun 17/08" },
  { id: "j4", label: "Mar 18/08 (démontage)" },
];

// Nature du transport : distingue artistes et staff dans une meme liste.
const NATURES = [
  { id: "artiste", label: "Artiste / groupe", dot: "bg-violet-400", text: "text-violet-300", ring: "ring-violet-400/30", bg: "bg-violet-400/10" },
  { id: "staff", label: "Staff / bénévole", dot: "bg-sky-400", text: "text-sky-300", ring: "ring-sky-400/30", bg: "bg-sky-400/10" },
  { id: "technique", label: "Technique / prestataire", dot: "bg-amber-400", text: "text-amber-300", ring: "ring-amber-400/30", bg: "bg-amber-400/10" },
];
const natureMeta = (id) => NATURES.find((n) => n.id === id) || NATURES[0];

// Lieux frequents (depart/arrivee). Saisie libre possible en plus (gare, hotel).
const LIEUX_SUGGERES = [
  "Gare de Aywaille", "Gare de Liège-Guillemins", "Hôtel (préciser)",
  "Parking artistes", "Site backstage", "Site grande scène", "Site petite scène",
  "Site zone logistique", "Parking public", "Point 0 (balade)",
];

// Volume de materiel : echelle simple et parlante pour choisir le vehicule.
const VOLUMES = [
  { id: "aucun", label: "Aucun / bagages à main", note: "Voiture OK" },
  { id: "leger", label: "Léger (quelques sacs / valises)", note: "Break / monospace" },
  { id: "moyen", label: "Moyen (matériel, instruments)", note: "Monospace / minibus" },
  { id: "lourd", label: "Lourd / volumineux (backline, décors)", note: "Camionnette / remorque" },
];
const volumeMeta = (id) => VOLUMES.find((v) => v.id === id) || VOLUMES[0];

// Couleur du statut (aligne sur le cycle des missions).
const STATUT_STYLE = {
  "A traiter": { text: "text-amber-300", ring: "ring-amber-400/30", bg: "bg-amber-400/10", label: "À planifier" },
  "Attribuee": { text: "text-sky-300", ring: "ring-sky-400/30", bg: "bg-sky-400/10", label: "Attribuée" },
  "En cours": { text: "text-emerald-300", ring: "ring-emerald-400/30", bg: "bg-emerald-400/10", label: "En cours" },
  "Resolue": { text: "text-slate-400", ring: "ring-white/10", bg: "bg-white/[0.03]", label: "Terminée" },
};
const statutStyle = (s) => STATUT_STYLE[s] || STATUT_STYLE["A traiter"];

export default function Transport() {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filtre, setFiltre] = useState("Tous");
  const [selected, setSelected] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await kvGet(KEY_TRANSPORT);
      setDemandes(Array.isArray(data) ? data : []);
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

  const counts = useMemo(() => {
    const c = {};
    for (const s of STATUTS) c[s] = demandes.filter((d) => d.statut === s).length;
    return c;
  }, [demandes]);

  const affichees = useMemo(() => {
    const actives = demandes.filter((d) => filtre === "Tous" || d.statut === filtre);
    // Tri : non terminées d'abord, puis par jour/heure de prise en charge.
    return [...actives].sort((a, b) => {
      const at = a.statut === STATUT_RESOLU ? 1 : 0;
      const bt = b.statut === STATUT_RESOLU ? 1 : 0;
      if (at !== bt) return at - bt;
      return (a.jour + (a.heure || "")).localeCompare(b.jour + (b.heure || ""));
    });
  }, [demandes, filtre]);

  async function ajouter(demande) {
    const fusion = await kvMerge(KEY_TRANSPORT, (liste) => [demande, ...liste]);
    if (fusion) { setDemandes(fusion); setSyncError(false); setShowForm(false); }
    else setSyncError(true);
  }

  // Circuit CHAUFFEUR : la demande reste dans transport, vue par l'app chauffeur.
  async function attribuerChauffeur(id, chauffeur) {
    const h = nowHM();
    const fusion = await kvMerge(KEY_TRANSPORT, (liste) =>
      liste.map((d) => d.id === id ? { ...d, statut: STATUT_ATTRIBUEE, cible: "chauffeur", chauffeur, heureAttribution: h } : d));
    if (fusion) { setDemandes(fusion); setSyncError(false); } else setSyncError(true);
  }

  // Circuit VOLANTE : on cree une mission logistique a partir de la demande
  // (l'app volante la verra), et on marque la demande transport comme partie
  // vers la volante (elle sort du circuit chauffeur mais reste tracable ici).
  async function attribuerVolante(id) {
    const h = nowHM();
    const d = demandes.find((x) => x.id === id);
    if (!d) return;
    const nm = natureMeta(d.nature);
    const vm = volumeMeta(d.volume);
    const jourLabel = (JOURS.find((j) => j.id === d.jour) || {}).label || d.jour;
    // Mission logistique : la volante lit nature/zone/priorite/statut/attribueA.
    const mission = {
      id: "trsp-log-" + Date.now(),
      ref: "TRSP-" + Date.now().toString().slice(-4),
      nature: `Transport ${nm.label} : ${d.qui} (×${d.nb}) — ${d.depuis} → ${d.vers}`,
      zone: d.vers,
      localisation: `${jourLabel}${d.heure ? " · RDV " + d.heure : ""}${d.heureDest ? " · arrivée " + d.heureDest : ""} · ${vm.label}`,
      priorite: "P2 - urgent",
      bloquant: "Non",
      statut: STATUT_ATTRIBUEE,
      attribueA: "Équipe volante",
      heureAttribution: h,
      signalePar: d.demandePar || "Programmation",
      roleSignaleur: "Transport",
      source: "Transport",
      refTransport: d.id,
      heureRdv: d.heure || "",
      heureDest: d.heureDest || "",
      adresseDepart: d.adresseDepart || "",
      adresseArrivee: d.adresseArrivee || "",
    };
    // 1. Creer la mission cote volante.
    const okMission = await kvMerge(KEY_MISSIONS, (liste) => [mission, ...liste]);
    // 2. Marquer la demande transport comme confiee a la volante.
    const fusion = await kvMerge(KEY_TRANSPORT, (liste) =>
      liste.map((x) => x.id === id ? { ...x, statut: STATUT_ATTRIBUEE, cible: "volante", chauffeur: "Équipe volante", heureAttribution: h } : x));
    if (okMission && fusion) { setDemandes(fusion); setSyncError(false); } else setSyncError(true);
  }

  async function avancer(id) {
    const h = nowHM();
    const fusion = await kvMerge(KEY_TRANSPORT, (liste) =>
      liste.map((d) => {
        if (d.id !== id) return d;
        if (d.statut === STATUT_ATTRIBUEE) return { ...d, statut: STATUT_EN_COURS, heureDepart: h };
        if (d.statut === STATUT_EN_COURS) return { ...d, statut: STATUT_RESOLU, heureArrivee: h };
        return d;
      }));
    if (fusion) { setDemandes(fusion); setSyncError(false); } else setSyncError(true);
  }

  async function supprimer(id) {
    const fusion = await kvMerge(KEY_TRANSPORT, (liste) => liste.filter((d) => d.id !== id));
    if (fusion) { setDemandes(fusion); setSelected(null); setSyncError(false); } else setSyncError(true);
  }

  function exportCSV() {
    const entetes = ["Statut", "Nature", "Qui", "Nb", "De", "Vers", "Jour", "Heure RDV", "Heure arrivée", "Adresse départ", "Adresse arrivée", "Volume", "Chauffeur", "Contact", "Note"];
    const lignes = demandes.map((d) => [
      statutStyle(d.statut).label, natureMeta(d.nature).label, d.qui, d.nb, d.depuis, d.vers,
      d.jour, d.heure, d.heureDest || "", (d.adresseDepart || "").replace(/[\n;]/g, " "), (d.adresseArrivee || "").replace(/[\n;]/g, " "), volumeMeta(d.volume).label, d.chauffeur || "", d.contact || "", (d.note || "").replace(/[\n;]/g, " "),
    ].map((c) => `"${String(c ?? "")}"`).join(";"));
    const csv = [entetes.join(";"), ...lignes].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transport-bfmf-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
      `}</style>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* En-tete */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#131a22] p-4 rounded-lg ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-indigo-400/10 ring-1 ring-indigo-400/30 flex items-center justify-center">
              <Car className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h1 className="font-display tracking-wide text-base uppercase font-bold text-slate-200">Transport de personnes</h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">BFMF 2026 · NAVETTES ARTISTES & STAFF</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => { window.location.hash = "logistique"; }}
              className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded ring-1 ring-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 transition-colors"
              title="Ouvrir les missions logistiques"
            >
              <Truck className="w-4 h-4" /> <span className="hidden sm:inline">Logistique</span>
            </button>
            <button onClick={exportCSV} className="text-slate-500 hover:text-slate-200" title="Export CSV"><Download className="w-4 h-4" /></button>
            <button onClick={refresh} className="text-slate-500 hover:text-slate-200" title="Rafraîchir">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-sm font-mono font-semibold px-4 py-2.5 rounded-lg bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40 hover:bg-indigo-500/30 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nouveau besoin
            </button>
          </div>
        </header>

        {syncError && (
          <div className="rounded-md bg-red-500/10 ring-1 ring-red-500/30 text-red-300 text-xs px-3 py-2 flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 shrink-0" /> Synchronisation interrompue — la liste peut ne pas être à jour.
          </div>
        )}

        {/* Compteurs par statut */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUTS.map((s) => {
            const st = statutStyle(s);
            return (
              <div key={s} className={`rounded-lg ring-1 ${st.ring} ${st.bg} px-3 py-2.5`}>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{st.label}</div>
                <div className={`font-display text-xl ${st.text}`}>{counts[s] || 0}</div>
              </div>
            );
          })}
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["Tous", ...STATUTS].map((s) => (
            <button
              key={s}
              onClick={() => setFiltre(s)}
              className={`text-[11px] font-mono px-2.5 py-1 rounded-full ring-1 ${
                filtre === s ? "bg-indigo-400/10 text-indigo-300 ring-indigo-400/40" : "text-slate-400 ring-white/10"
              }`}
            >
              {s === "Tous" ? "Tous" : statutStyle(s).label} ({s === "Tous" ? demandes.length : counts[s] || 0})
            </button>
          ))}
        </div>

        {/* Liste des demandes */}
        {loading && demandes.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-10 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Chargement…
          </div>
        ) : affichees.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-10 rounded-xl border border-dashed border-white/10">
            {filtre === "Tous" ? "Aucun besoin de transport enregistré." : "Aucune demande dans ce statut."}
          </div>
        ) : (
          <div className="space-y-2">
            {affichees.map((d) => (
              <CarteDemande
                key={d.id}
                d={d}
                onAttribuerChauffeur={(chauffeur) => attribuerChauffeur(d.id, chauffeur)}
                onAttribuerVolante={() => attribuerVolante(d.id)}
                onAvancer={() => avancer(d.id)}
                onSupprimer={() => supprimer(d.id)}
                ouvert={selected === d.id}
                onToggle={() => setSelected(selected === d.id ? null : d.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && <FormNouveau onClose={() => setShowForm(false)} onAjouter={ajouter} />}
    </div>
  );
}

/* ---- Carte d'une demande de transport ---- */
function CarteDemande({ d, onAttribuerChauffeur, onAttribuerVolante, onAvancer, onSupprimer, ouvert, onToggle }) {
  const [chauffeurInput, setChauffeurInput] = useState("");
  const nm = natureMeta(d.nature);
  const st = statutStyle(d.statut);
  const vm = volumeMeta(d.volume);
  const jourLabel = (JOURS.find((j) => j.id === d.jour) || {}).label || d.jour;

  return (
    <div className={`rounded-lg ring-1 ${st.ring} bg-[#151b23] overflow-hidden`}>
      <button onClick={onToggle} className="w-full text-left p-3.5 flex items-start justify-between gap-3 hover:bg-white/[0.02]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2 h-2 rounded-full shrink-0 ${nm.dot}`} />
            <span className="font-display text-base truncate">{d.qui}</span>
            <span className="text-[11px] text-slate-500 font-mono">×{d.nb}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${nm.bg} ${nm.text} ring-1 ${nm.ring}`}>{nm.label}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5 flex-wrap">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{d.depuis}</span>
            <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
            <span className="truncate">{d.vers}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {jourLabel}{d.heure ? ` · ${d.heure}` : ""}</span>
            <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {vm.label}</span>
          </div>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ring-1 shrink-0 ${st.ring} ${st.bg} ${st.text}`}>{st.label}</span>
      </button>

      {ouvert && (
        <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-white/5">
          {/* Details */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-2">
            {d.contact && (
              <div className="col-span-2 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <a href={`tel:${d.contact.replace(/\s/g, "")}`} className="text-sky-300 font-mono">{d.contact}</a>
              </div>
            )}
            {d.chauffeur && (
              <div className="col-span-2 flex items-center gap-2 text-slate-300">
                {d.cible === "volante" ? <Users className="w-3.5 h-3.5 text-cyan-400" /> : <Car className="w-3.5 h-3.5 text-slate-500" />}
                {d.cible === "volante" ? "Confié à : " : "Chauffeur : "}
                <strong className="font-normal text-slate-100">{d.chauffeur}</strong>
              </div>
            )}
            <div className="col-span-2 text-[11px] text-slate-500">
              Volume : {vm.label} <span className="text-slate-600">— {vm.note}</span>
            </div>
            {(d.heure || d.heureDest) && (
              <div className="col-span-2 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                {d.heure && <span>RDV : <span className="text-slate-200">{d.heure}</span></span>}
                {d.heureDest && <span>Arrivée souhaitée : <span className="text-slate-200">{d.heureDest}</span></span>}
              </div>
            )}
            {(d.adresseDepart || d.adresseArrivee) && (
              <div className="col-span-2 flex flex-wrap gap-2 pt-0.5">
                {d.adresseDepart && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.adresseDepart)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" /> GPS prise en charge
                  </a>
                )}
                {d.adresseArrivee && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.adresseArrivee)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 ring-indigo-400/40 bg-indigo-400/10 text-indigo-300 hover:bg-indigo-400/20 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" /> GPS destination
                  </a>
                )}
              </div>
            )}
            {d.note && <div className="col-span-2 text-slate-300 bg-white/[0.02] rounded p-2 text-[11px] leading-snug">{d.note}</div>}
            {d.demandePar && <div className="col-span-2 text-[10px] text-slate-600">Demandé par {d.demandePar}{d.heureCreation ? ` · ${d.heureCreation}` : ""}</div>}
          </div>

          {/* Actions selon le statut (cycle QG) */}
          <div className="flex flex-wrap gap-2 items-center">
            {d.statut === STATUT_INITIAL && (
              <div className="w-full space-y-2">
                {/* Circuit 1 : confier à l'équipe volante (app volante existante) */}
                <button
                  onClick={onAttribuerVolante}
                  className="w-full flex items-center justify-center gap-2 text-xs font-mono font-semibold px-3 py-2 rounded bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
                >
                  <Users className="w-4 h-4" /> Attribuer à l'équipe volante
                </button>
                {/* Circuit 2 : confier à un chauffeur extérieur (app chauffeur) */}
                <div className="flex items-center gap-1.5">
                  <input
                    value={chauffeurInput}
                    onChange={(e) => setChauffeurInput(e.target.value)}
                    placeholder="Nom du chauffeur extérieur…"
                    className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600"
                  />
                  <button
                    onClick={() => chauffeurInput.trim() && onAttribuerChauffeur(chauffeurInput.trim())}
                    disabled={!chauffeurInput.trim()}
                    className="text-xs font-mono px-3 py-1.5 rounded bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40 disabled:opacity-40 shrink-0"
                  >
                    Attribuer chauffeur
                  </button>
                </div>
              </div>
            )}
            {d.statut === STATUT_ATTRIBUEE && (
              <button onClick={onAvancer} className="text-xs font-mono px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40">
                Départ (passer en cours)
              </button>
            )}
            {d.statut === STATUT_EN_COURS && (
              <button onClick={onAvancer} className="text-xs font-mono px-3 py-1.5 rounded bg-emerald-600/30 text-emerald-100 ring-1 ring-emerald-500/50">
                <Check className="w-3.5 h-3.5 inline mr-1" /> Arrivé (terminer)
              </button>
            )}
            {d.statut === STATUT_RESOLU && (
              <span className="text-[11px] text-slate-500">
                Terminé{d.heureArrivee ? ` à ${d.heureArrivee}` : ""}.
              </span>
            )}
            <button onClick={onSupprimer} className="ml-auto text-slate-600 hover:text-red-300" title="Supprimer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Formulaire de nouveau besoin ---- */
function FormNouveau({ onClose, onAjouter }) {
  const [nature, setNature] = useState("artiste");
  const [qui, setQui] = useState("");
  const [nb, setNb] = useState(1);
  const [depuis, setDepuis] = useState("");
  const [adresseDepart, setAdresseDepart] = useState("");
  const [adresseArrivee, setAdresseArrivee] = useState("");
  const [vers, setVers] = useState("");
  const [jour, setJour] = useState("j1");
  const [heure, setHeure] = useState("");
  const [heureDest, setHeureDest] = useState("");
  const [volume, setVolume] = useState("aucun");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [demandePar, setDemandePar] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const valide = qui.trim().length >= 2 && depuis.trim() && vers.trim();

  function soumettre() {
    if (!valide) return;
    setEnvoi(true);
    onAjouter({
      id: "trsp-" + Date.now(),
      statut: STATUT_INITIAL,
      nature, qui: qui.trim(), nb: Number(nb) || 1,
      depuis: depuis.trim(), vers: vers.trim(),
      adresseDepart: adresseDepart.trim(), adresseArrivee: adresseArrivee.trim(),
      jour, heure: heure.trim(), heureDest: heureDest.trim(), volume,
      contact: contact.trim(), note: note.trim(),
      demandePar: demandePar.trim(), heureCreation: nowHM(),
      chauffeur: "",
    });
  }

  const inputCls = "w-full bg-black/40 border border-white/10 rounded px-2.5 py-2 text-sm text-white placeholder:text-slate-600";
  const labelCls = "text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1 block";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl ring-1 ring-indigo-500/40 bg-[#141a22] p-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display tracking-wide text-slate-100 flex items-center gap-2">
            <Car className="w-5 h-5 text-indigo-300" /> Nouveau besoin de transport
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          {/* Nature */}
          <div>
            <span className={labelCls}>Type</span>
            <div className="grid grid-cols-3 gap-1.5">
              {NATURES.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setNature(n.id)}
                  className={`text-[11px] rounded px-2 py-2 ring-1 transition-colors ${
                    nature === n.id ? `${n.bg} ${n.text} ${n.ring} font-semibold` : "ring-white/10 text-slate-400"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          {/* Qui + combien */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <span className={labelCls}>Qui *</span>
              <input value={qui} onChange={(e) => setQui(e.target.value)} placeholder="Nom du groupe / de la personne" className={inputCls} />
            </div>
            <div>
              <span className={labelCls}>Nombre</span>
              <input type="number" min="1" value={nb} onChange={(e) => setNb(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Depuis / vers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className={labelCls}>Depuis *</span>
              <input list="lieux-transport" value={depuis} onChange={(e) => setDepuis(e.target.value)} placeholder="Gare, hôtel, parking…" className={inputCls} />
            </div>
            <div>
              <span className={labelCls}>Vers *</span>
              <input list="lieux-transport" value={vers} onChange={(e) => setVers(e.target.value)} placeholder="Scène, backstage…" className={inputCls} />
            </div>
            <datalist id="lieux-transport">
              {LIEUX_SUGGERES.map((l) => <option key={l} value={l} />)}
            </datalist>
          </div>

          {/* Adresses géoguidables : le chauffeur ouvrira son GPS dessus.
              Bouton GPS pour tester/ouvrir directement l'itinéraire.
              Départ = point de prise en charge · Arrivée = destination finale. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className={labelCls}>Point de prise en charge (adresse GPS)</span>
              <div className="flex gap-1.5">
                <input value={adresseDepart} onChange={(e) => setAdresseDepart(e.target.value)} placeholder="Rue, n°, code postal, ville" className={inputCls} />
                <a
                  href={adresseDepart.trim() ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresseDepart.trim())}` : undefined}
                  target="_blank" rel="noreferrer"
                  className={`shrink-0 px-2.5 flex items-center rounded-lg ring-1 transition-colors ${adresseDepart.trim() ? "ring-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20" : "ring-white/10 text-slate-600 pointer-events-none"}`}
                  title="Ouvrir le guidage GPS vers le point de prise en charge"
                >
                  <Navigation className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div>
              <span className={labelCls}>Destination finale (adresse GPS)</span>
              <div className="flex gap-1.5">
                <input value={adresseArrivee} onChange={(e) => setAdresseArrivee(e.target.value)} placeholder="Rue, n°, code postal, ville" className={inputCls} />
                <a
                  href={adresseArrivee.trim() ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresseArrivee.trim())}` : undefined}
                  target="_blank" rel="noreferrer"
                  className={`shrink-0 px-2.5 flex items-center rounded-lg ring-1 transition-colors ${adresseArrivee.trim() ? "ring-indigo-400/40 bg-indigo-400/10 text-indigo-300 hover:bg-indigo-400/20" : "ring-white/10 text-slate-600 pointer-events-none"}`}
                  title="Ouvrir le guidage GPS vers la destination finale"
                >
                  <Navigation className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Quand */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className={labelCls}>Jour</span>
              <select value={jour} onChange={(e) => setJour(e.target.value)} className={inputCls}>
                {JOURS.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
              </select>
            </div>
            <div>
              <span className={labelCls}>Heure de rendez-vous</span>
              <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className={inputCls} />
              <span className="text-[10px] text-slate-500 mt-0.5 block">avec les personnes à transporter</span>
            </div>
            <div>
              <span className={labelCls}>Heure attendue à destination</span>
              <input type="time" value={heureDest} onChange={(e) => setHeureDest(e.target.value)} className={inputCls} />
              <span className="text-[10px] text-slate-500 mt-0.5 block">arrivée souhaitée</span>
            </div>
          </div>

          {/* Volume materiel */}
          <div>
            <span className={labelCls}>Volume de matériel à embarquer</span>
            <select value={volume} onChange={(e) => setVolume(e.target.value)} className={inputCls}>
              {VOLUMES.map((v) => <option key={v.id} value={v.id}>{v.label} — {v.note}</option>)}
            </select>
          </div>

          {/* Contact + demandeur */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className={labelCls}>Contact sur place</span>
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Téléphone (optionnel)" className={inputCls} />
            </div>
            <div>
              <span className={labelCls}>Demandé par</span>
              <input value={demandePar} onChange={(e) => setDemandePar(e.target.value)} placeholder="Votre nom (optionnel)" className={inputCls} />
            </div>
          </div>

          {/* Note libre */}
          <div>
            <span className={labelCls}>Précisions</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Contraintes horaires, matériel particulier, accès…" className={inputCls} />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="px-3 py-2.5 rounded ring-1 ring-white/15 text-slate-400 text-sm">Annuler</button>
            <button
              onClick={soumettre}
              disabled={!valide || envoi}
              className="flex-1 flex items-center justify-center gap-2 rounded py-2.5 bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/50 font-mono text-sm font-semibold disabled:opacity-40"
            >
              {envoi ? "ENVOI…" : <><Plus className="w-4 h-4" /> ENREGISTRER LE BESOIN</>}
            </button>
          </div>
          {!valide && (qui || depuis || vers) && (
            <div className="text-[10px] text-amber-400/80 text-center">Renseignez au moins : qui, depuis et vers.</div>
          )}
        </div>
      </div>
    </div>
  );
}