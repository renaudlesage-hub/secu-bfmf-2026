import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, UserPlus, Clock, Phone, Search, RefreshCw, Download,
  CircleDot, CheckCircle2, X, CalendarDays, ClipboardList, Trash2,
} from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";
import { ROLES } from "./referentiels";

/* ---------------------------------------------------------------------
   GESTION DES BENEVOLES -- BFMF 2026
   Trois vues combinees :
     - DE GARDE : qui est de service a l'instant present, par poste.
     - PLANNING : grille des creneaux sur les jours du festival.
     - ANNUAIRE : fiche de chaque benevole (role, contact) + affectation.
   Persistance Supabase partagee (cle bfmf2026-benevoles), comme le reste
   de la plateforme : ce qui est saisi au QG est visible partout.

   >>> NE CONTIENT AUCUNE DONNEE DE RETRIBUTION. La paie / le defraiement
   relevent du droit social (volontariat ASBL, extras, etudiants...) et se
   gerent hors de cette base non authentifiee. Ici : uniquement l'operationnel
   -- qui, quel poste, quand, joignable comment.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const KEY_BENEVOLES = "bfmf2026-benevoles";

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

// Les jours du festival (dont fermeture le lundi). minH/maxH bornent la grille horaire.
const JOURS = [
  { id: "j1", label: "Sam 15/08", date: "2026-08-15" },
  { id: "j2", label: "Dim 16/08", date: "2026-08-16" },
  { id: "j3", label: "Lun 17/08", date: "2026-08-17" },
];
const H_MIN = 8;   // 08:00
const H_MAX = 30;  // 06:00 le lendemain (24 + 6) -> festival de nuit

// Un creneau au format "HH:MM" -> minutes depuis minuit (gere l'apres-minuit)
function hm2min(hm) {
  if (!hm || !/^\d{1,2}:\d{2}$/.test(hm)) return null;
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}
// Compare a l'heure courante en tenant compte du passage minuit (02:00 = 26:00)
function estDeGarde(creneau, maintenantMin) {
  const d = hm2min(creneau.debut);
  let f = hm2min(creneau.fin);
  if (d === null || f === null) return false;
  if (f <= d) f += 24 * 60; // fin apres minuit
  let n = maintenantMin;
  if (n < d) n += 24 * 60;  // on est apres minuit, creneau commence avant
  return n >= d && n < f;
}

export default function GestionBenevoles() {
  const [benevoles, setBenevoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sbError, setSbError] = useState(false);
  const [vue, setVue] = useState("garde"); // garde | planning | annuaire
  const [filtre, setFiltre] = useState("");
  const [now, setNow] = useState(new Date());
  const [edite, setEdite] = useState(null); // benevole en cours d'edition (ou {} pour nouveau)
  const [jourPlanning, setJourPlanning] = useState("j1");

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  const refresh = useCallback(async () => {
    try {
      const d = await kvGet(KEY_BENEVOLES);
      setBenevoles(Array.isArray(d) ? d : []);
      setSbError(false);
    } catch (e) { setSbError(true); }
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 20000); return () => clearInterval(t); }, [refresh]);

  async function sauver(b) {
    // b : { id?, nom, role, tel, creneaux:[{jour,debut,fin,poste}] }
    const id = b.id || "bv" + Date.now();
    const fiche = { ...b, id };
    const fusion = await kvMerge(KEY_BENEVOLES, (liste) => {
      const existe = liste.some((x) => x.id === id);
      return existe ? liste.map((x) => (x.id === id ? fiche : x)) : [...liste, fiche];
    });
    if (fusion) { setBenevoles(fusion); setSbError(false); setEdite(null); } else setSbError(true);
  }
  async function supprimer(id) {
    if (!window.confirm("Supprimer ce bénévole et tous ses créneaux ?")) return;
    const fusion = await kvMerge(KEY_BENEVOLES, (liste) => liste.filter((x) => x.id !== id));
    if (fusion) { setBenevoles(fusion); setEdite(null); } else setSbError(true);
  }

  function exportCSV() {
    const esc = (s) => (/[";\n]/.test(s || "") ? '"' + String(s).replace(/"/g, '""') + '"' : (s || ""));
    const lignes = [["Nom", "Role", "Tel", "Jour", "Debut", "Fin", "Poste"].join(";")];
    benevoles.forEach((b) => {
      if (!b.creneaux || !b.creneaux.length) {
        lignes.push([esc(b.nom), esc(b.role), esc(b.tel), "", "", "", ""].join(";"));
      } else {
        b.creneaux.forEach((c) => {
          const j = JOURS.find((x) => x.id === c.jour);
          lignes.push([esc(b.nom), esc(b.role), esc(b.tel), j ? j.label : c.jour, c.debut, c.fin, esc(c.poste)].join(";"));
        });
      }
    });
    const blob = new Blob(["\uFEFF" + lignes.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `benevoles-bfmf2026-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const maintenantMin = now.getHours() * 60 + now.getMinutes();
  const jourAujourdhui = now.toISOString().slice(0, 10);
  const jourActif = JOURS.find((j) => j.date === jourAujourdhui);

  // Liste "de garde maintenant" : benevoles ayant un creneau actif aujourd'hui
  const deGarde = useMemo(() => {
    const res = [];
    benevoles.forEach((b) => {
      (b.creneaux || []).forEach((c) => {
        const jc = JOURS.find((x) => x.id === c.jour);
        const estAujourdhui = jourActif ? c.jour === jourActif.id : false;
        if (estAujourdhui && estDeGarde(c, maintenantMin)) {
          res.push({ ...b, creneau: c });
        }
      });
    });
    return res.sort((a, b) => (a.creneau.poste || "").localeCompare(b.creneau.poste || ""));
  }, [benevoles, maintenantMin, jourActif]);

  const visibles = filtre
    ? benevoles.filter((b) =>
        (b.nom + " " + b.role + " " + (b.creneaux || []).map((c) => c.poste).join(" "))
          .toLowerCase().includes(filtre.toLowerCase()))
    : benevoles;

  const totalCreneaux = benevoles.reduce((s, b) => s + (b.creneaux ? b.creneaux.length : 0), 0);

  const onglets = [
    ["garde", "De garde", CircleDot],
    ["planning", "Planning", CalendarDays],
    ["annuaire", "Annuaire", ClipboardList],
  ];

  return (
    <div className="min-h-screen bg-[#0f1319] text-slate-200">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <header className="border-b border-white/10 bg-[#141a22]/95 backdrop-blur sticky top-0 z-20 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-cyan-400/10 ring-1 ring-cyan-400/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-[15px] leading-none">BÉNÉVOLES</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · PLANNING & CONTACTS</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-mono px-2 py-1 rounded ring-1 ${deGarde.length ? "ring-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "ring-white/10 text-slate-500"}`}>
              {deGarde.length} de garde
            </span>
            <button onClick={exportCSV} className="text-slate-500 hover:text-slate-200" title="Export CSV"><Download className="w-4 h-4" /></button>
            <button onClick={refresh} className="text-slate-500 hover:text-slate-200" title="Rafraîchir"><RefreshCw className="w-4 h-4" /></button>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />{pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-2.5 flex gap-1.5">
          {onglets.map(([k, lab, Ic]) => (
            <button key={k} onClick={() => setVue(k)}
              className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full ring-1 transition-colors ${
                vue === k ? "ring-cyan-400/50 bg-cyan-400/10 text-cyan-300" : "ring-white/10 text-slate-500 hover:text-slate-300"
              }`}>
              <Ic className="w-3.5 h-3.5" /> {lab}
            </button>
          ))}
          <button onClick={() => setEdite({ nom: "", role: ROLES[0], tel: "", creneaux: [] })}
            className="ml-auto flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
            <UserPlus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {sbError && (
          <div className="rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 text-xs px-3 py-2">
            Liaison instable — la saisie peut ne pas être partagée avec les autres postes.
          </div>
        )}

        {/* ============ VUE DE GARDE ============ */}
        {vue === "garde" && (
          <section className="bg-[#141a22] rounded-lg ring-1 ring-white/10 p-4">
            <h2 className="font-display text-sm tracking-wider uppercase flex items-center gap-2 mb-1">
              <CircleDot className="w-4 h-4 text-emerald-300" /> De garde maintenant
              <span className="text-[11px] font-mono text-slate-500 font-normal normal-case">
                {jourActif ? `${jourActif.label} · ${pad(now.getHours())}:${pad(now.getMinutes())}` : "hors dates festival"}
              </span>
            </h2>
            {!jourActif && (
              <div className="text-[11px] text-slate-500 mb-2">
                La date actuelle n'est pas un jour de festival — cette vue s'activera les 15, 16 et 17/08.
                Consultez le <button onClick={() => setVue("planning")} className="text-cyan-300 underline">planning</button> en attendant.
              </div>
            )}
            {loading ? (
              <div className="text-xs text-slate-500 text-center py-4">Chargement...</div>
            ) : deGarde.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-600" /> Personne de garde sur ce créneau.
              </div>
            ) : (
              <div className="space-y-1.5">
                {deGarde.map((b, i) => (
                  <div key={b.id + i} className="flex items-center justify-between gap-2 rounded px-3 py-2 bg-white/[0.02] ring-1 ring-white/10 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-wrap">
                      <span className="text-sm text-slate-100 font-medium">{b.nom}</span>
                      <span className="text-[11px] font-mono text-cyan-300">{b.creneau.poste || b.role}</span>
                      <span className="text-[11px] font-mono text-slate-500">{b.creneau.debut}–{b.creneau.fin}</span>
                    </div>
                    {b.tel && (
                      <a href={`tel:${b.tel.replace(/\s/g, "")}`}
                        className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded ring-1 ring-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                        <Phone className="w-3 h-3" /> {b.tel}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============ VUE PLANNING ============ */}
        {vue === "planning" && (
          <section className="bg-[#141a22] rounded-lg ring-1 ring-white/10 p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-display text-sm tracking-wider uppercase flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-cyan-300" /> Planning des créneaux
              </h2>
              <div className="flex gap-1.5">
                {JOURS.map((j) => (
                  <button key={j.id} onClick={() => setJourPlanning(j.id)}
                    className={`text-[11px] font-mono px-3 py-1.5 rounded-full ring-1 ${jourPlanning === j.id ? "ring-cyan-400/50 bg-cyan-400/10 text-cyan-300" : "ring-white/15 text-slate-400"}`}>
                    {j.label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              // Tous les creneaux du jour choisi, tries par heure de debut
              const lignes = [];
              benevoles.forEach((b) => {
                (b.creneaux || []).forEach((c) => {
                  if (c.jour === jourPlanning) lignes.push({ ...c, nom: b.nom, role: b.role, tel: b.tel, id: b.id });
                });
              });
              lignes.sort((a, b) => (hm2min(a.debut) || 0) - (hm2min(b.debut) || 0));
              if (lignes.length === 0) {
                return <div className="text-xs text-slate-500 text-center py-6">Aucun créneau saisi pour {JOURS.find((j) => j.id === jourPlanning).label}.</div>;
              }
              return (
                <div className="space-y-1">
                  {lignes.map((l, i) => (
                    <div key={l.id + i} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded px-3 py-2 bg-white/[0.02] ring-1 ring-white/5 text-xs">
                      <span className="font-mono text-cyan-300 w-24">{l.debut}–{l.fin}</span>
                      <span className="min-w-0"><span className="text-slate-100">{l.nom}</span> <span className="text-slate-500">· {l.poste || l.role}</span></span>
                      {l.tel && <a href={`tel:${l.tel.replace(/\s/g, "")}`} className="font-mono text-emerald-300 shrink-0">{l.tel}</a>}
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="text-[10px] font-mono text-slate-600 mt-3">
              Festival de nuit : les créneaux après minuit (ex. 01:00–03:00) sont gérés automatiquement.
            </div>
          </section>
        )}

        {/* ============ VUE ANNUAIRE ============ */}
        {vue === "annuaire" && (
          <>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Rechercher un bénévole, un poste, un rôle..."
                className="w-full bg-black/40 border border-white/10 rounded pl-8 pr-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div className="text-[11px] font-mono text-slate-500">{benevoles.length} bénévole(s) · {totalCreneaux} créneau(x)</div>
            {loading ? (
              <div className="text-xs text-slate-500 text-center py-6">Chargement...</div>
            ) : visibles.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8 rounded-lg ring-1 ring-white/10 bg-[#141a22]">
                Aucun bénévole. Cliquez « Ajouter » pour commencer.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {visibles.map((b) => (
                  <button key={b.id} onClick={() => setEdite(b)}
                    className="text-left bg-[#141a22] rounded-lg ring-1 ring-white/10 hover:ring-cyan-400/30 p-3 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-100 font-medium">{b.nom || "(sans nom)"}</span>
                      {b.tel && <span className="font-mono text-[11px] text-emerald-300">{b.tel}</span>}
                    </div>
                    <div className="text-[11px] text-cyan-300 mt-0.5">{b.role}</div>
                    {b.creneaux && b.creneaux.length > 0 ? (
                      <div className="text-[10px] font-mono text-slate-500 mt-1.5 space-y-0.5">
                        {b.creneaux.map((c, i) => {
                          const j = JOURS.find((x) => x.id === c.jour);
                          return <div key={i}>{j ? j.label : c.jour} · {c.debut}–{c.fin} · {c.poste || "—"}</div>;
                        })}
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-amber-300/70 mt-1.5">aucun créneau</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {edite && (
        <EditeurBenevole
          initial={edite}
          onFermer={() => setEdite(null)}
          onSauver={sauver}
          onSupprimer={edite.id ? () => supprimer(edite.id) : null}
        />
      )}
    </div>
  );
}

/* --------------------- Editeur de fiche benevole --------------------- */
function EditeurBenevole({ initial, onFermer, onSauver, onSupprimer }) {
  const [nom, setNom] = useState(initial.nom || "");
  const [role, setRole] = useState(initial.role || ROLES[0]);
  const [tel, setTel] = useState(initial.tel || "");
  const [creneaux, setCreneaux] = useState(initial.creneaux || []);

  const inputCls = "bg-black/40 border border-white/10 rounded px-2.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-full";

  function ajouterCreneau() {
    setCreneaux([...creneaux, { jour: JOURS[0].id, debut: "", fin: "", poste: "" }]);
  }
  function majCreneau(i, champ, val) {
    setCreneaux(creneaux.map((c, idx) => (idx === i ? { ...c, [champ]: val } : c)));
  }
  function retirerCreneau(i) {
    setCreneaux(creneaux.filter((_, idx) => idx !== i));
  }
  function valider() {
    if (!nom.trim()) return;
    // On garde les creneaux au moins partiellement remplis
    const propres = creneaux.filter((c) => c.debut && c.fin);
    onSauver({ id: initial.id, nom: nom.trim(), role, tel: tel.trim(), creneaux: propres });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onFermer}>
      <div className="bg-[#151b23] rounded-lg ring-1 ring-white/10 w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-display text-white text-base">{initial.id ? "Modifier le bénévole" : "Nouveau bénévole"}</h3>
          <button onClick={onFermer} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Nom *</div>
            <input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Prénom Nom" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Rôle</div>
              <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Téléphone</div>
              <input className={inputCls} value={tel} onChange={(e) => setTel(e.target.value)} placeholder="0470 12 34 56" inputMode="tel" />
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Créneaux</div>
              <button onClick={ajouterCreneau} className="text-[11px] font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1">
                <UserPlus className="w-3 h-3" /> ajouter un créneau
              </button>
            </div>
            {creneaux.length === 0 && <div className="text-[11px] text-slate-500 py-1">Aucun créneau. Ajoutez-en un si le bénévole a un horaire défini.</div>}
            <div className="space-y-2">
              {creneaux.map((c, i) => (
                <div key={i} className="flex flex-wrap gap-1.5 items-center bg-black/30 rounded p-2">
                  <select className="bg-black/40 border border-white/10 rounded px-1.5 py-1.5 text-[11px] text-white" value={c.jour} onChange={(e) => majCreneau(i, "jour", e.target.value)}>
                    {JOURS.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
                  </select>
                  <input
                    type="time"
                    className="bg-black/40 border border-white/10 rounded px-1.5 py-1.5 text-[11px] text-white w-[5.5rem] [color-scheme:dark]"
                    value={c.debut}
                    onChange={(e) => majCreneau(i, "debut", e.target.value)}
                    aria-label="Heure de début"
                  />
                  <input
                    type="time"
                    className="bg-black/40 border border-white/10 rounded px-1.5 py-1.5 text-[11px] text-white w-[5.5rem] [color-scheme:dark]"
                    value={c.fin}
                    onChange={(e) => majCreneau(i, "fin", e.target.value)}
                    aria-label="Heure de fin"
                  />
                  <input className="bg-black/40 border border-white/10 rounded px-1.5 py-1.5 text-[11px] text-white flex-1 min-w-[7rem]" value={c.poste} onChange={(e) => majCreneau(i, "poste", e.target.value)} placeholder="Poste / lieu" />
                  <button onClick={() => retirerCreneau(i)} className="text-slate-500 hover:text-red-400 shrink-0 ml-auto" aria-label="Retirer ce créneau"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="text-[10px] font-mono text-slate-600 mt-1.5">Créneau après minuit : mettre une fin inférieure au début (ex. 23:00 → 02:00), la garde est comptée correctement.</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 p-4 border-t border-white/10">
          {onSupprimer ? (
            <button onClick={onSupprimer} className="flex items-center gap-1.5 text-xs font-mono text-red-400 hover:text-red-300">
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onFermer} className="text-xs font-mono text-slate-400 hover:text-slate-200 px-3 py-2">Annuler</button>
            <button onClick={valider} disabled={!nom.trim()}
              className={`text-xs font-mono px-4 py-2 rounded transition-colors ${nom.trim() ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "bg-white/5 text-slate-600 cursor-not-allowed"}`}>
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}