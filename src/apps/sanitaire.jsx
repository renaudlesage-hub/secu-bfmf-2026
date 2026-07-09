import React, { useState, useEffect, useCallback } from "react";
import {
  Droplets, Clock, RefreshCw, CheckCircle2, CircleDot, MapPin,
  TriangleAlert, QrCode, Printer, X, Trash2,
} from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";
import { LIEUX, KEY_SANITAIRE } from "./lieux-sanitaires";

/* ---------------------------------------------------------------------
   EQUIPE SANITAIRE -- BFMF 2026
   Recoit les signalements des festivaliers (QR codes places sur les WC,
   lave-mains, poubelles), permet la prise en charge et la cloture.
   Onglet "Affiches QR" : genere les affiches a imprimer pour chaque lieu.
--------------------------------------------------------------------- */

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};
const PROFILE_KEY = "bfmf2026-profil";

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

let profilMemoire = null;
async function loadProfile() {
  try {
    const s = localStorage.getItem(PROFILE_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {}
  return profilMemoire;
}
async function saveProfile(p) {
  profilMemoire = p;
  try {
    if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROFILE_KEY);
  } catch (e) {}
}

function pad(n) { return String(n).padStart(2, "0"); }
function nowHM() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

const TYPE_URGENCE = { papier: 1, eau: 2, poubelle: 1, bouche: 2, proprete: 1, autre: 1 };

export default function Sanitaire() {
  const [signalements, setSignalements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sbError, setSbError] = useState(false);
  const [vue, setVue] = useState("liste"); // liste | qr
  const [filtre, setFiltre] = useState("actifs");
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    loadProfile().then((p) => { setProfile(p); setProfileLoaded(true); });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await kvGet(KEY_SANITAIRE);
      setSignalements(Array.isArray(data) ? data : []);
      setSbError(false);
    } catch (e) { setSbError(true); }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [refresh]);

  const signature = profile ? `${profile.nom}` : "?";

  async function maj(id, changes) {
    const next = signalements.map((s) => (s.id === id ? { ...s, ...changes } : s));
    setSignalements(next);
    const ok = await kvSet(KEY_SANITAIRE, next);
    if (!ok) setSbError(true);
  }
  const prendre = (s) => maj(s.id, { statut: "en cours", prisPar: signature, heurePrise: nowHM() });
  const resoudre = (s) => maj(s.id, { statut: "resolu", heureResolution: nowHM(), resoluPar: signature });

  async function purgerResolus() {
    const next = signalements.filter((s) => s.statut !== "resolu");
    setSignalements(next);
    await kvSet(KEY_SANITAIRE, next);
  }

  const nouveaux = signalements.filter((s) => s.statut === "nouveau");
  const enCours = signalements.filter((s) => s.statut === "en cours");
  const resolus = signalements.filter((s) => s.statut === "resolu");
  const affiches =
    filtre === "actifs" ? [...nouveaux, ...enCours]
    : filtre === "resolus" ? resolus
    : signalements;

  // Lieux les plus signales (actifs)
  const parLieu = {};
  [...nouveaux, ...enCours].forEach((s) => {
    parLieu[s.locNom] = (parLieu[s.locNom] || 0) + (s.count || 1);
  });
  const topLieux = Object.entries(parLieu).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // URL de base pour les QR (fonctionne en preview et en production)
  const baseUrl = window.location.origin + window.location.pathname;
  const qrImg = (id) =>
    "https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=" +
    encodeURIComponent(`${baseUrl}#signaler/${id}`);

  if (profileLoaded && !profile) {
    return (
      <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans flex items-center justify-center p-4">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');.font-display{font-family:'Oswald',sans-serif;}`}</style>
        <div className="bg-[#1a212b] ring-1 ring-white/15 rounded-lg w-full max-w-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Droplets className="w-6 h-6 text-sky-300" />
            <div className="font-display tracking-wide text-white">EQUIPE SANITAIRE BFMF 2026</div>
          </div>
          <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide mb-1.5">Votre nom *</div>
          <input
            id="san-nom"
            className="w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-2.5 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
            placeholder="Ex: M. Peeters"
          />
          <button
            onClick={async () => {
              const nom = document.getElementById("san-nom").value.trim();
              if (nom.length < 2) return;
              const p = { nom, role: "Benevole sanitaire" };
              setProfile(p);
              await saveProfile(p);
            }}
            className="w-full mt-4 text-sm font-mono px-4 py-2.5 rounded ring-1 ring-emerald-400/60 bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30"
          >
            Commencer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes pulseSlow { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .pulse-slow { animation: pulseSlow 1.6s ease-in-out infinite; }
        @media print {
          .no-print { display: none !important; }
          .qr-card { break-inside: avoid; page-break-inside: avoid; }
          body, .print-root { background: white !important; }
        }
      `}</style>

      <header className="border-b border-white/10 bg-[#151b23]/90 backdrop-blur sticky top-0 z-20 no-print">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-sky-400/10 ring-1 ring-sky-400/30 flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="font-display tracking-wide text-[15px] leading-none">SANITAIRE</div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · SIGNALEMENTS QR</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setVue(vue === "qr" ? "liste" : "qr")}
              className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded ring-1 transition-colors ${
                vue === "qr" ? "ring-sky-400/50 bg-sky-400/15 text-sky-200" : "ring-white/20 text-slate-400 hover:text-slate-200"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" /> Affiches
            </button>
            <button onClick={refresh} className="text-slate-500 hover:text-slate-200" title="Rafraichir">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />
              {pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
      </header>

      {vue === "qr" ? (
        <main className="max-w-3xl mx-auto p-4 print-root">
          <div className="flex items-center justify-between mb-4 no-print">
            <div className="text-sm text-slate-300">
              Une affiche par lieu — imprimez cette page (Ctrl+P) et plastifiez.
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded ring-1 ring-white/20 text-slate-300 hover:text-white"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimer
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LIEUX.map((l) => (
              <div key={l.id} className="qr-card rounded-lg bg-white text-slate-900 p-5 text-center">
                <div className="font-display text-lg tracking-wide">UN SOUCI ICI ?</div>
                <div className="text-xs text-slate-600 mb-3">Papier, eau, poubelle... Scannez, on arrive !</div>
                <img src={qrImg(l.id)} alt={`QR ${l.nom}`} className="mx-auto w-44 h-44" />
                <div className="mt-3 text-sm font-semibold">{l.nom}</div>
                <div className="text-[10px] text-slate-500 mt-1">Bucolique Ferrieres Musique Festival 2026 · anonyme</div>
              </div>
            ))}
          </div>
        </main>
      ) : (
        <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {sbError && (
            <div className="rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-300 text-xs px-3 py-2">
              Reseau instable — donnees possiblement obsoletes.
            </div>
          )}

          {/* KPI */}
          <section className="grid grid-cols-3 gap-3">
            <div className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-3">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Nouveaux</div>
              <div className={`font-display text-2xl ${nouveaux.length ? "text-red-300" : "text-emerald-300"}`}>{nouveaux.length}</div>
            </div>
            <div className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-3">
              <div className="text-[10px] font-mono text-slate-500 uppercase">En cours</div>
              <div className="font-display text-2xl text-amber-300">{enCours.length}</div>
            </div>
            <div className="bg-[#151b23] rounded-lg ring-1 ring-white/10 p-3">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Resolus</div>
              <div className="font-display text-2xl text-slate-300">{resolus.length}</div>
            </div>
          </section>

          {topLieux.length > 0 && (
            <div className="rounded-md ring-1 ring-sky-400/30 bg-sky-400/5 px-3 py-2 text-xs text-sky-200">
              Points chauds : {topLieux.map(([n, c]) => `${n} (${c})`).join(" · ")}
            </div>
          )}

          {/* Filtres */}
          <div className="flex items-center gap-1.5">
            {[["actifs", `Actifs (${nouveaux.length + enCours.length})`], ["resolus", `Resolus (${resolus.length})`], ["tous", "Tous"]].map(([k, lab]) => (
              <button
                key={k}
                onClick={() => setFiltre(k)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-full ring-1 transition-colors ${
                  filtre === k ? "ring-sky-400/40 bg-sky-400/10 text-sky-300" : "ring-white/15 text-slate-400 hover:text-slate-200"
                }`}
              >
                {lab}
              </button>
            ))}
            {resolus.length > 5 && filtre === "resolus" && (
              <button onClick={purgerResolus} className="ml-auto flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-red-300">
                <Trash2 className="w-3 h-3" /> Purger
              </button>
            )}
          </div>

          {/* Liste */}
          <section className="space-y-2">
            {loading && <div className="text-sm text-slate-500 text-center py-6">Chargement...</div>}
            {!loading && affiches.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-8 rounded-lg ring-1 ring-white/10 bg-[#151b23]">
                <CheckCircle2 className="w-6 h-6 text-emerald-300 mx-auto mb-2" />
                Rien a signaler. Tout est propre !
              </div>
            )}
            {affiches.map((s) => {
              const urgent = (TYPE_URGENCE[s.type] || 1) >= 2 || (s.count || 1) >= 3;
              return (
                <div
                  key={s.id}
                  className={`rounded-lg p-3.5 ring-1 ${
                    s.statut === "nouveau"
                      ? urgent ? "ring-red-400/40 bg-red-400/10" : "ring-sky-400/30 bg-sky-400/5"
                      : s.statut === "en cours" ? "ring-amber-400/30 bg-amber-400/5"
                      : "ring-white/10 bg-white/[0.02] opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      s.statut === "nouveau" ? (urgent ? "bg-red-400 pulse-slow" : "bg-sky-400") : s.statut === "en cours" ? "bg-amber-400" : "bg-slate-500"
                    }`} />
                    <span className="font-mono text-[11px] text-slate-400">{s.heure}</span>
                    <span className="text-sm text-slate-100 font-medium">{s.typeLabel}</span>
                    {(s.count || 1) > 1 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full ring-1 ring-red-400/40 bg-red-400/10 text-red-300">
                        x{s.count}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 mt-1 flex items-center gap-1 pl-3.5">
                    <MapPin className="w-3 h-3 text-slate-500" /> {s.locNom}
                  </div>
                  {s.commentaire && (
                    <div className="text-[11px] text-slate-400 italic mt-0.5 pl-3.5">"{s.commentaire}"</div>
                  )}
                  <div className="flex items-center gap-2 mt-2 pl-3.5">
                    {s.statut === "nouveau" && (
                      <button
                        onClick={() => prendre(s)}
                        className="flex-1 text-[11px] font-mono px-2.5 py-2 rounded ring-1 ring-amber-400/40 bg-amber-400/10 text-amber-200"
                      >
                        Je m'en occupe
                      </button>
                    )}
                    {s.statut === "en cours" && (
                      <>
                        <span className="text-[11px] font-mono text-amber-300/80 flex items-center gap-1">
                          <CircleDot className="w-3 h-3" /> {s.prisPar} ({s.heurePrise})
                        </span>
                        <button
                          onClick={() => resoudre(s)}
                          className="ml-auto text-[11px] font-mono px-2.5 py-2 rounded ring-1 ring-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                        >
                          Resolu
                        </button>
                      </>
                    )}
                    {s.statut === "resolu" && (
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> resolu a {s.heureResolution}{s.resoluPar ? ` par ${s.resoluPar}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          <div className="text-[10px] text-slate-600 font-mono text-center pb-2">
            Rafraichissement auto 10 s · signalements anonymes des festivaliers via QR codes
          </div>
        </main>
      )}
    </div>
  );
}
