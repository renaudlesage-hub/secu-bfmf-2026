import React, { useState, useEffect, useCallback } from "react";
import {
  Share2,
  Image,
  Plus,
  X,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Instagram,
  Facebook,
  Twitter,
  Globe,
  Radio,
  FileText,
  UserCheck
} from "lucide-react";

/* ---------------------------------------------------------------------
   CONSOLE COMMUNITY MANAGER — MULTI-POST & MÉDIAS (BFMF 2026)
--------------------------------------------------------------------- */

const STORAGE_KEY_MEDIAS = "bfmf2026-medias-live";
const PROFILE_KEY = "bfmf2026-profil";

const ROLES_CM = [
  "Community Manager",
  "Responsable Communication",
  "Photographe Officiel",
  "Créateur de contenu",
  "QG / Communication",
];

const PLATFORMES_DISPONIBLES = [
  { id: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-400", border: "border-blue-500/30" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-400", border: "border-pink-500/30" },
  { id: "twitter", label: "X / Twitter", icon: Twitter, color: "text-slate-300", border: "border-slate-500/30" },
  { id: "site_live", label: "Flux Live Site Web", icon: Globe, color: "text-emerald-400", border: "border-emerald-500/30" },
];

const inputCls =
  "w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-2.5 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

async function kvGet(key) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(key)}&select=value`, { headers: SB_HEADERS });
  if (!r.ok) throw new Error(`Supabase GET ${r.status}`);
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

function pad(n) { return n.toString().padStart(2, "0"); }
function nowHM() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CommunityManagerConsole() {
  const [historiquePublications, setHistoriquePublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [now, setNow] = useState(new Date());
  
  // Login State
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Form States
  const [textePublication, setTextePublication] = useState("");
  const [platformesChoisies, setPlatformesChoisies] = useState(["facebook", "instagram", "site_live"]);
  const [urlsMedias, setUrlsMedias] = useState([]);
  const [currentUrlMedia, setCurrentUrlMedia] = useState("");
  const [ambianceGlobale, setAmbianceGlobale] = useState("bonne");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      const s = localStorage.getItem(PROFILE_KEY);
      if (s) setProfile(JSON.parse(s));
    } catch (e) {}
    setProfileLoaded(true);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const data = await kvGet(STORAGE_KEY_MEDIAS);
      if (data && data.publications) {
        setHistoriquePublications(data.publications);
        setAmbianceGlobale(data.ambiance || "bonne");
      }
    } catch (err) {
      console.error("Erreur Supabase CM App:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
    const t = setInterval(refreshData, 15000);
    return () => clearInterval(t);
  }, [refreshData]);

  const togglePlatforme = (id) => {
    setPlatformesChoisies(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const ajouterMediaUrl = (e) => {
    e.preventDefault();
    if (currentUrlMedia.trim() && !urlsMedias.includes(currentUrlMedia.trim())) {
      setUrlsMedias([...urlsMedias, currentUrlMedia.trim()]);
      setCurrentUrlMedia("");
    }
  };

  const retirerMediaUrl = (index) => {
    setUrlsMedias(urlsMedias.filter((_, i) => i !== index));
  };

  const publierMessage = async (e) => {
    e.preventDefault();
    if (!textePublication.trim() || platformesChoisies.length === 0) return;

    const auteurSignature = profile ? `${profile.nom} (${profile.role})` : "CM Extérieur";

    const nouvellePublication = {
      id: `pub-${Date.now()}`,
      timestamp: new Date().toISOString(),
      heure: nowHM(),
      texte: textePublication.trim(),
      auteur: auteurSignature,
      platformes: platformesChoisies,
      medias: urlsMedias,
      statutEnvoi: "En attente de propagation API" // Sera traité par votre fonction de service externe
    };

    const nouvelHistorique = [nouvellePublication, ...historiquePublications];
    setHistoriquePublications(nouvelHistorique);

    // Payload global synchronisé avec le schéma attendu par le QG
    const payloadSupabase = {
      ambiance: ambianceGlobale,
      maj: `Dernier post à ${nowHM()}`,
      publications: nouvelHistorique,
      // Maintien de la compatibilité avec l'ancien panneau "canaux" du dashboard
      canaux: [
        { name: "Réseaux Sociaux", statut: "ok", note: textePublication.trim().slice(0, 60) + "..." }
      ]
    };

    const ok = await kvSet(STORAGE_KEY_MEDIAS, payloadSupabase);
    setSaveError(!ok);

    if (ok) {
      // Reset du formulaire après succès
      setTextePublication("");
      setUrlsMedias([]);
    }
  };

  if (profileLoaded && !profile) {
    return (
      <ProfilCMSetup
        onSave={(p) => {
          setProfile(p);
          try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch(e){}
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-[#151b23]/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-pink-500/10 ring-1 ring-pink-500/30 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5 text-pink-400" />
            </div>
            <div className="min-w-0">
              <div className="font-display tracking-wide text-[15px] leading-none uppercase">Console Diffusion Médias</div>
              <div className="text-[11px] text-slate-400 font-mono tracking-wider mt-1">BFMF 2026 · ÉQUIPE COM</div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-1 text-xs font-mono text-slate-400 bg-white/5 px-2 py-1 rounded">
              <UserCheck className="w-3.5 h-3.5 text-pink-400" /> {profile?.nom}
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm">
              <Clock className="w-4 h-4 text-slate-500" />
              {pad(now.getHours())}:{pad(now.getMinutes())}
            </div>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* FORMULAIRE DE PUBLICATION UNIQUE (2 COLONNES SUR LARGE ÉCRAN) */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10 shadow-md">
            <h2 className="text-sm font-mono text-amber-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Radio className="w-4 h-4 text-pink-400" /> Publier un message simultané
            </h2>

            <form onSubmit={publierMessage} className="space-y-4 text-sm">
              
              {/* SÉLECTEUR DE PLATEFORMES GRID */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-2">1. Sélectionner les canaux de diffusion</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMES_DISPONIBLES.map((p) => {
                    const PlaceIcon = p.icon;
                    const actif = platformesChoisies.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => togglePlatforme(p.id)}
                        className={`flex items-center gap-2 p-2.5 rounded border text-left transition-all ${
                          actif 
                            ? "bg-[#1f293d] border-amber-400/50 text-white font-medium shadow-sm" 
                            : "bg-[#181e26] border-white/5 text-slate-400 hover:border-white/10"
                        }`}
                      >
                        <PlaceIcon className={`w-4 h-4 ${p.color}`} />
                        <span className="text-xs truncate">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
                {platformesChoisies.length === 0 && (
                  <p className="text-red-400 text-xs font-mono mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Choisissez au moins une plate-forme.</p>
                )}
              </div>

              {/* CORPS DU TEXTE */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">2. Contenu de la publication (Texte ou Événement)</label>
                <textarea
                  className={`${inputCls} h-28 resize-none`}
                  placeholder="Écrivez le flash com ici (ex: La grande scène ouvre ses portes ! Préparez vos bracelets...)"
                  value={textePublication}
                  onChange={(e) => setTextePublication(e.target.value)}
                  maxLength={500}
                  required
                />
                <div className="text-[10px] font-mono text-slate-500 text-right mt-1">
                  {textePublication.length} / 500 caractères
                </div>
              </div>

              {/* LIENS MÉDIAS ASSOCIÉS */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">3. Ajouter des médias (URLs de photos / CDN ou stockage interne)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    className={inputCls}
                    placeholder="https://cdn-festival.be/photos/live-04.jpg"
                    value={currentUrlMedia}
                    onChange={(e) => setCurrentUrlMedia(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={ajouterMediaUrl}
                    className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded font-mono"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* VISUALISATION DES ATTRIBUTS MÉDIAS INJECTÉS */}
                {urlsMedias.length > 0 && (
                  <div className="mt-2 space-y-1 bg-black/20 p-2 rounded border border-white/5">
                    {urlsMedias.map((url, index) => (
                      <div key={index} className="flex items-center justify-between text-xs font-mono text-slate-300 bg-white/[0.02] p-1.5 rounded">
                        <span className="truncate flex-1 pr-2 flex items-center gap-1.5">
                          <Image className="w-3.5 h-3.5 text-sky-400 shrink-0" /> {url}
                        </span>
                        <button type="button" onClick={() => retirerMediaUrl(index)} className="text-red-400 hover:text-red-300">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TON DU FESTIVAL (Pour remonter au QG sur le Dashboard d'accueil) */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">4. Ambiance Générale constatée sur la plaine</label>
                <select className={inputCls} value={ambianceGlobale} onChange={(e) => setAmbianceGlobale(e.target.value)}>
                  <option value="excellente">🔥 Excellente ambiance / Fréquentation record</option>
                  <option value="bonne">✨ Calme / Bonne ambiance générale</option>
                  <option value="neutre">😐 Neutre / Attente d'artistes</option>
                  <option value="tendu">⚠️ Mouvements de foule légers / Attention requise</option>
                </select>
              </div>

              {saveError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Échec de synchronisation Supabase (Vérifiez la connexion réseau)
                </div>
              )}

              {/* BOUTON D'ACTION PRINCIPAL */}
              <button
                type="submit"
                disabled={!textePublication.trim() || platformesChoisies.length === 0}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-mono font-bold rounded shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 select-none"
              >
                <Send className="w-4 h-4" /> PROPAGER SUR TOUS LES CANAUX
              </button>

            </form>
          </div>
        </div>

        {/* FEED / HISTORIQUE DU FLUX DE DROITE */}
        <div className="space-y-4">
          <div className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10 shadow-md">
            <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-500" /> Flux Sortant ({historiquePublications.length})
            </h3>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {historiquePublications.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-8 text-center border border-dashed border-white/5 rounded">
                  Aucun historique de diffusion disponible.
                </div>
              ) : (
                historiquePublications.map((pub) => (
                  <div key={pub.id} className="p-3 bg-black/20 rounded border border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>🕒 {pub.heure || "Terrain"} · {pub.auteur}</span>
                    </div>
                    <p className="text-slate-200 font-normal leading-snug break-words">"{pub.texte}"</p>
                    
                    {/* Visualisation des puces de réseaux ciblés */}
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-white/5">
                      {pub.platformes?.map((pId) => {
                        const plat = PLATFORMES_DISPONIBLES.find(x => x.id === pId);
                        return (
                          <span key={pId} className="text-[9px] font-mono bg-white/5 text-slate-400 px-1.5 py-0.2 rounded border border-white/5">
                            {plat ? plat.label : pId}
                          </span>
                        );
                      })}
                    </div>

                    {/* Badge média associé */}
                    {pub.medias && pub.medias.length > 0 && (
                      <div className="text-[9px] font-mono text-sky-400 bg-sky-500/5 px-2 py-0.5 rounded border border-sky-500/10 flex items-center gap-1">
                        <Image className="w-3 h-3" /> {pub.medias.length} média(s) attaché(s)
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

{/* CONFIGURATION INDIVIDUELLE DU PROFIL DES COMMUNICANTS */}
function ProfilCMSetup({ onSave }) {
  const [nom, setNom] = useState("");
  const [role, setRole] = useState(ROLES_CM[0]);
  return (
    <div className="min-h-screen bg-[#11151b] flex items-center justify-center p-4">
      <div className="bg-[#1a212b] p-6 rounded-lg max-w-sm w-full space-y-4 border border-white/5">
        <div>
          <h3 className="font-display text-white text-lg tracking-wide uppercase">BFMF Multi-Diffusion</h3>
          <p className="text-xs text-slate-400 mt-1">Configurez votre identifiant CM avant d'accéder au transmetteur.</p>
        </div>
        <input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de communicant (Ex : Antoine_Com)" />
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES_CM.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={() => nom.trim() && onSave({ nom: nom.trim(), role })} className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-mono font-bold rounded">
          ACTIVER LA CONSOLE
        </button>
      </div>
    </div>
  );
}