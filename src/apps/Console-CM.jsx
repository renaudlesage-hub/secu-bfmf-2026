import React, { useState, useEffect, useCallback } from "react";
import {
  Share2,
  Image as ImageIcon,
  Plus,
  X,
  Clock,
  Send,
  AlertCircle,
  Globe,
  Radio,
  FileText,
  UserCheck,
  MessageSquare,
  Upload
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
  { id: "facebook", label: "Facebook", prefix: "FB", icon: MessageSquare, color: "text-blue-400", bgBadge: "bg-blue-500/20 text-blue-300" },
  { id: "instagram", label: "Instagram", prefix: "IG", icon: ImageIcon, color: "text-pink-400", bgBadge: "bg-pink-500/20 text-pink-300" },
  { id: "twitter", label: "X / Twitter", prefix: "X ", icon: Share2, color: "text-slate-300", bgBadge: "bg-slate-500/20 text-slate-300" },
  { id: "site_live", label: "Flux Live Web", prefix: "🌐", icon: Globe, color: "text-emerald-400", bgBadge: "bg-emerald-500/20 text-emerald-300" },
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
  const [urlsMedias, setUrlsMedias] = useState([]); // Contient les chaînes de caractères Base64 des images
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

  // NOUVELLE FONCTION : Gestionnaire de téléversement et conversion Base64 automatique
  const gererUploadPhoto = (e) => {
    const fichiers = e.target.files;
    if (!fichiers || fichiers.length === 0) return;

    Array.from(fichiers).forEach((fichier) => {
      // Limite de sécurité optionnelle pour le réseau mobile du festival (ex: 5 Mo)
      if (fichier.size > 5 * 1024 * 1024) {
        alert(`Le fichier ${fichier.name} est trop lourd. Max 5 Mo en zone festival.`);
        return;
      }

      const lecteur = new FileReader();
      lecteur.onloadend = () => {
        if (lecteur.result) {
          setUrlsMedias((prev) => [...prev, lecteur.result]);
        }
      };
      lecteur.readAsDataURL(fichier);
    });

    // Reset du input pour permettre de re-sélectionner le même fichier au besoin
    e.target.value = "";
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
      statutEnvoi: "En attente de propagation API"
    };

    const nouvelHistorique = [nouvellePublication, ...historiquePublications];
    setHistoriquePublications(nouvelHistorique);

    const payloadSupabase = {
      ambiance: ambianceGlobale,
      maj: `Dernier post à ${nowHM()}`,
      publications: nouvelHistorique,
      canaux: [
        { name: "Réseaux Sociaux", statut: "ok", note: textePublication.trim().slice(0, 60) + "..." }
      ]
    };

    const ok = await kvSet(STORAGE_KEY_MEDIAS, payloadSupabase);
    setSaveError(!ok);

    if (ok) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#11151b] flex items-center justify-center font-mono text-slate-400 text-xs">
        Connexion au flux des réseaux sociaux Supabase...
      </div>
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
        
        {/* FORMULAIRE DE PUBLICATION */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10 shadow-md">
            <h2 className="text-sm font-mono text-amber-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Radio className="w-4 h-4 text-pink-400" /> Publier un message simultané
            </h2>

            <form onSubmit={publierMessage} className="space-y-4 text-sm">
              
              {/* SÉLECTEUR DE PLATEFORMES */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-2">1. Sélectionner les canaux de diffusion</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMES_DISPONIBLES.map((p) => {
                    const actif = platformesChoisies.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => togglePlatforme(p.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded border text-left transition-all ${
                          actif 
                            ? "bg-[#1f293d] border-amber-400/50 text-white font-medium shadow-sm" 
                            : "bg-[#181e26] border-white/5 text-slate-400 hover:border-white/10"
                        }`}
                      >
                        <span className="font-mono text-xs font-bold px-1 rounded bg-black/40 text-center min-w-[24px]">
                          {p.prefix}
                        </span>
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

              {/* LIENS MÉDIAS ASSOCIÉS INTERACTIFS SANS URLS */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">3. Joindre des Photos / Médias terrain</label>
                
                {/* Boîte de dépôt et sélection de fichier */}
                <div className="relative group flex flex-col items-center justify-center border border-dashed border-white/20 hover:border-pink-500/50 bg-[#181e26] rounded-lg p-5 transition-all text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={gererUploadPhoto}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-pink-400 mb-1.5 transition-colors" />
                  <span className="text-xs text-slate-300 font-medium">Sélectionner ou glisser des photos</span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">Fichiers JPEG / PNG (Max 5 Mo)</span>
                </div>

                {/* Galerie de prévisualisation avec option de suppression */}
                {urlsMedias.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2 bg-black/20 p-2 rounded border border-white/5">
                    {urlsMedias.map((base64Data, index) => (
                      <div key={index} className="relative aspect-square rounded border border-white/10 overflow-hidden bg-slate-900 group">
                        <img src={base64Data} alt="Miniature terrain" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => retirerMediaUrl(index)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white p-1 rounded-full shadow opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          title="Retirer cette photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TON DU FESTIVAL */}
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
                  <AlertCircle className="w-4 h-4" /> Échec de synchronisation Supabase
                </div>
              )}

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

        {/* FEED / HISTORIQUE */}
        <div className="space-y-4">
          <div className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10 shadow-md">
            <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-500" /> Flux Sortant ({historiquePublications.length})
            </h3>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {historiquePublications.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-8 text-center border border-dashed border-white/5 rounded">
                  Aucun historique de diffusion.
                </div>
              ) : (
                historiquePublications.map((pub) => (
                  <div key={pub.id} className="p-3 bg-black/20 rounded border border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>🕒 {pub.heure || "Terrain"} · {pub.auteur}</span>
                    </div>
                    <p className="text-slate-200 font-normal leading-snug break-words">"{pub.texte}"</p>
                    
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-white/5">
                      {pub.platformes?.map((pId) => {
                        const plat = PLATFORMES_DISPONIBLES.find(x => x.id === pId);
                        return (
                          <span key={pId} className={`text-[9px] font-mono px-1.5 py-0.2 rounded border border-white/5 ${plat ? plat.bgBadge : 'bg-white/5 text-slate-400'}`}>
                            {plat ? plat.label : pId}
                          </span>
                        );
                      })}
                    </div>

                    {pub.medias && pub.medias.length > 0 && (
                      <div className="text-[9px] font-mono text-sky-400 bg-sky-500/5 px-2 py-0.5 rounded border border-sky-500/10 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> {pub.medias.length} photo(s) intégrée(s)
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

{/* CONFIGURATION DU PROFIL */}
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