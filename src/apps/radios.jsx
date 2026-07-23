import React, { useState, useEffect, useCallback } from "react";
import {
  Radio, User, CheckCircle2, AlertTriangle, Settings2, BatteryFull,
  Clock, RefreshCw, Download, Search,
} from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/* ---------------------------------------------------------------------
   PARC & ATTRIBUTIONS RADIO -- BFMF 2026
   Main courante du materiel : qui detient quelle radio, sur quel canal,
   depuis quelle heure -> restitution en fin de journee, recherche d'un
   poste egare, verification du plan radio.
   Partage entre postes via Supabase (cle bfmf2026-radios), comme les
   autres apps : ce qui est saisi au QG est visible partout.
   Le memento de programmation reste consultable meme hors ligne (PWA).
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const KEY_RADIOS = "bfmf2026-radios";
const PROFILE_KEY = "bfmf2026-profil";

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
    if (s) { const p = JSON.parse(s); return p.nom || "QG"; }
  } catch (e) {}
  return "QG";
}
const pad = (n) => String(n).padStart(2, "0");
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/* --------------------- Memento technique (statique) --------------------- */
/* >>> A VERIFIER avec les postes reels avant le briefing. */
const MEMENTO = {
  modele: "Baofeng UV-16 Pro",
  canaux: [
    { ch: "PMR 4.1", freq: "446.04375", ctcss: "67.0 Hz (Tx/Rx)", usage: "Coordination générale" },
    { ch: "PMR 5.0", freq: "446.05625", ctcss: "Aucun", usage: "Parking / Sanitaires" },
    { ch: "PMR 15", freq: "446.18125", ctcss: "114.8 Hz", usage: "Sécurité privée" },
    { ch: "PMR 333", freq: "446.09375", ctcss: "À CONFIRMER", usage: "URGENCE — réservé" },
  ],
  resetMnu: "Menu 40 → RESET → ALL",
};

// Libelle = nom PMR + numero du canal sur le poste (ils different !).
const CANAUX = ["PMR4.1 (ch.9)", "PMR5 (ch.10 · ch.5 parking/sanit.)", "PMR15 (ch.25)", "PMR333 (ch.6 — URGENCE)"];

// Une radio physique ne doit apparaitre qu'une fois. En cas de doublon
// (donnees anciennes), on privilegie la ligne "En service" la plus recente.
function dedoublonner(liste) {
  const parSerie = new Map();
  for (const a of liste) {
    const cle = (a.serial || "").toUpperCase();
    const prec = parSerie.get(cle);
    if (!prec) { parSerie.set(cle, a); continue; }
    const mieux =
      (a.statut === "En service" && prec.statut !== "En service") ? a :
      (prec.statut === "En service" && a.statut !== "En service") ? prec :
      ((a.heure || "") >= (prec.heure || "") ? a : prec);
    parSerie.set(cle, mieux);
  }
  return Array.from(parSerie.values());
}

export default function GestionRadios() {
  const [attributions, setAttributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sbError, setSbError] = useState(false);
  const [formSerial, setFormSerial] = useState("");
  const [formUser, setFormUser] = useState("");
  const [formCanal, setFormCanal] = useState("PMR4.1 (ch.9)");
  const [filtre, setFiltre] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const refresh = useCallback(async () => {
    try {
      const d = await kvGet(KEY_RADIOS);
      setAttributions(dedoublonner(Array.isArray(d) ? d : []));
      setSbError(false);
    } catch (e) { setSbError(true); }
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 15000); return () => clearInterval(t); }, [refresh]);

  async function persist(next) {
    setAttributions(next);
    const ok = await kvSet(KEY_RADIOS, next);
    setSbError(!ok);
  }

  async function attribuerRadio(e) {
    e.preventDefault();
    if (!formSerial.trim() || !formUser.trim()) return;
    const serial = formSerial.trim().toUpperCase();

    // Une radio physique = UNE seule ligne. Si ce numero de serie existe
    // deja (en service OU rendu), on met la ligne a jour au lieu d'en creer
    // une seconde -> impossible d'avoir le meme poste "en service" et
    // "en charge" en meme temps.
    const existante = attributions.find((a) => a.serial === serial);
    if (existante && existante.statut === "En service") {
      if (!window.confirm(`${serial} est déjà en service (${existante.assigneA}). La réattribuer à ${formUser.trim()} ?`)) return;
    }

    const ligne = {
      id: existante ? existante.id : "rad" + Date.now(),
      serial,
      assigneA: formUser.trim(),
      canal: formCanal,
      bat: "100%",
      statut: "En service",
      heure: nowHM(),
      heureRetour: null,   // on repart d'une sortie propre
      rendueA: null,
      parQui: monNom(),
    };
    const next = existante
      ? attributions.map((a) => (a.serial === serial ? ligne : a))
      : [ligne, ...attributions].slice(0, 300);

    setFormSerial(""); setFormUser("");
    await persist(next);
  }

  async function declarerRetour(id) {
    await persist(attributions.map((a) => a.id === id
      ? { ...a, statut: "Retournée (en charge)", heureRetour: nowHM(), rendueA: monNom() }
      : a));
  }

  function exportCSV() {
    const esc = (s) => (/[";\n]/.test(s || "") ? '"' + String(s).replace(/"/g, '""') + '"' : (s || ""));
    const lignes = [["Serie", "Assignee a", "Canal", "Statut", "Sortie", "Retour", "Attribuee par"].join(";")];
    [...attributions].reverse().forEach((a) => {
      lignes.push([a.serial, esc(a.assigneA), a.canal, a.statut, a.heure, a.heureRetour || "", esc(a.parQui || "")].join(";"));
    });
    const blob = new Blob(["\uFEFF" + lignes.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `parc-radio-bfmf2026-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const enService = attributions.filter((a) => a.statut === "En service");
  const visibles = filtre
    ? attributions.filter((a) =>
        (a.serial + " " + a.assigneA + " " + a.canal).toLowerCase().includes(filtre.toLowerCase()))
    : attributions;

  const inputCls = "bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50";

  return (
    <div className="min-h-screen bg-[#0f1319] text-slate-200">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <header className="border-b border-white/10 bg-[#141a22]/95 backdrop-blur sticky top-0 z-20 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-sky-400/10 ring-1 ring-sky-400/30 flex items-center justify-center">
              <Radio className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-[15px] leading-none">PARC RADIO</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · ATTRIBUTIONS & MÉMENTO</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-mono px-2 py-1 rounded ring-1 ${enService.length ? "ring-sky-400/40 bg-sky-400/10 text-sky-300" : "ring-white/10 text-slate-500"}`}>
              {enService.length} en service
            </span>
            <button onClick={exportCSV} className="text-slate-500 hover:text-slate-200" title="Export CSV"><Download className="w-4 h-4" /></button>
            <button onClick={refresh} className="text-slate-500 hover:text-slate-200" title="Rafraîchir"><RefreshCw className="w-4 h-4" /></button>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />{pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-5xl mx-auto items-start">
        {sbError && (
          <div className="lg:col-span-3 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 text-xs px-3 py-2">
            Liaison instable — l'attribution peut ne pas être partagée avec les autres postes.
          </div>
        )}

        {/* Main courante materiel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#141a22] rounded-lg p-4 border border-white/5">
            <h2 className="font-display text-sm tracking-wider uppercase flex items-center gap-2 mb-4">
              <Radio className="w-4 h-4 text-sky-400" /> Main courante matériel radio
            </h2>

            <form onSubmit={attribuerRadio} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
              <input type="text" placeholder="N° série / identifiant" value={formSerial}
                onChange={(e) => setFormSerial(e.target.value)} className={inputCls} required />
              <input type="text" placeholder="Assigné à (nom / rôle)" value={formUser}
                onChange={(e) => setFormUser(e.target.value)} className={inputCls} required />
              <select value={formCanal} onChange={(e) => setFormCanal(e.target.value)} className={inputCls}>
                {CANAUX.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="submit" className="bg-sky-600 hover:bg-sky-500 rounded font-bold text-xs text-white py-2 transition-colors">
                ATTRIBUER
              </button>
            </form>

            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Rechercher un poste, un porteur..."
                className="w-full bg-black/40 border border-white/10 rounded pl-8 pr-3 py-1.5 text-[11px] text-slate-300 font-mono focus:outline-none focus:border-sky-500/50" />
            </div>

            <div className="space-y-2">
              {loading && <div className="text-xs text-slate-500 text-center py-4">Chargement...</div>}
              {!loading && visibles.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-6">Aucune radio attribuée pour l'instant.</div>
              )}
              {visibles.map((attr) => (
                <div key={attr.id}
                  className={`flex items-center justify-between gap-2 p-2 rounded text-xs border flex-wrap ${
                    attr.statut === "En service" ? "bg-white/[0.02] border-white/10" : "bg-emerald-900/20 border-emerald-500/30 text-emerald-200"
                  }`}>
                  <div className="flex gap-3 items-center flex-wrap min-w-0">
                    <span className="font-mono font-bold text-amber-400">{attr.serial}</span>
                    <span className="flex items-center gap-1 truncate"><User className="w-3 h-3 shrink-0" /> {attr.assigneA}</span>
                    <span className="flex items-center gap-1"><Settings2 className="w-3 h-3" /> {attr.canal}</span>
                    <span className="flex items-center gap-1 text-slate-500"><BatteryFull className="w-3 h-3" /> {attr.bat}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[10px] text-slate-500">
                      {attr.heure}{attr.heureRetour ? ` → ${attr.heureRetour}` : ""}
                    </span>
                    {attr.statut === "En service" ? (
                      <button onClick={() => declarerRetour(attr.id)} className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors">
                        Marquer retour
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> En charge</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10px] font-mono text-slate-600 mt-3">
              Partagé entre tous les postes · rafraîchissement 15 s · export CSV pour l'inventaire de fin d'événement
            </div>
          </div>
        </div>

        {/* Memento programmation */}
        <div className="space-y-4">
          <div className="bg-[#141a22] rounded-lg p-4 border border-amber-400/30">
            <h2 className="font-display text-sm text-amber-400 tracking-wider uppercase flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" /> Mémento programmation
            </h2>
            <div className="text-xs space-y-3">
              <div className="bg-black/30 p-2 rounded border border-white/5 font-mono">
                <div className="text-slate-400 text-[10px] uppercase">Standard matériel</div>
                <div className="font-bold text-white">{MEMENTO.modele}</div>
              </div>

              <div className="space-y-1.5">
                {MEMENTO.canaux.map((c, i) => (
                  <div key={i} className="bg-black/30 p-2 rounded border border-white/5 flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sky-300 font-mono text-[11px]">{c.ch}</div>
                      <div className="text-[9px] text-slate-500">{c.usage}</div>
                    </div>
                    <div className="text-right font-mono text-[10px] shrink-0">
                      <div>{c.freq} MHz</div>
                      <div className="text-amber-400/70">{c.ctcss}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-red-950/30 p-2 rounded border border-red-500/20 font-mono text-[10px] text-red-300">
                Hard reset : {MEMENTO.resetMnu}
              </div>
              <div className="text-[9px] text-slate-600 font-mono leading-relaxed">
                Vérifier ces valeurs sur un poste réel avant le briefing (fichier src/apps/radios.jsx, bloc MEMENTO).
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}