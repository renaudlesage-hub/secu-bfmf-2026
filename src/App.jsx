import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  ClipboardList, 
  Footprints, 
  TriangleAlert, 
  Zap, 
  ChevronRight, 
  Landmark, 
  Droplets,
  Beer,
  Share2 
} from "lucide-react";

// Imports des modules applicatifs opérationnels
import Dashboard from "./apps/dashboard.jsx";
import Logistique from "./apps/logistique.jsx";
import Balade from "./apps/balade.jsx";
import Sos from "./apps/sos.jsx";
import Volante from "./apps/volante.jsx";
import PcOps from "./apps/pcops.jsx";
import Sanitaire from "./apps/sanitaire.jsx"; 
import StocksBar from "./apps/StocksBar.jsx"; 
import CommunityManagerConsole from "./apps/Console-CM.jsx";

/* ---------------------------------------------------------------------
   ROUTEUR PRINCIPAL OPTIMISÉ SMARTPHONE — Bucolique Ferrières 2026
--------------------------------------------------------------------- */

const ROUTES = {
  dashboard: { titre: "Dashboard QG", desc: "Synthèse : alertes, logistique, balade, météo, sanitaire", icon: ShieldAlert, comp: Dashboard, public: false },
  logistique: { titre: "Missions logistiques", desc: "Saisie, attribution et suivi des demandes", icon: ClipboardList, comp: Logistique, public: false },
  community: { titre: "Console Community Manager", desc: "Multi-post simultané et photos Base64", icon: Share2, comp: CommunityManagerConsole, public: false },
  stocksbar: { titre: "Comptabilité Bars", desc: "Inventaires, réassorts et débits en direct", icon: Beer, comp: StocksBar, public: false },
  balade: { titre: "Suivi balade", desc: "Crowd management du parcours 6,5 km", icon: Footprints, comp: Balade, public: false },
  volante: { titre: "App Volante", desc: "Engagements, guidage GPS, missions terrain", icon: Zap, comp: Volante, public: false },
  sanitaire: { titre: "Suivi Sanitaire", desc: "Gestion et résolution des blocs WC", icon: Droplets, comp: Sanitaire, public: false },
  pcops: { titre: "PC-Ops / Autorité", desc: "Vue de situation en lecture seule", icon: Landmark, comp: PcOps, public: false },
  sos: { titre: "SOS Participants", desc: "App publique — lien/QR à diffuser aux festivaliers", icon: TriangleAlert, comp: Sos, public: true },
};

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || "");

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || "");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const currentRoute = ROUTES[route];

  if (currentRoute) {
    const Comp = currentRoute.comp;
    return (
      <div className="min-h-screen bg-[#11151b]">
        {!currentRoute.public && (
          <a 
            href="#" 
            className="fixed bottom-3 right-3 z-50 text-[11px] font-mono font-medium text-slate-300 hover:text-white bg-[#1a222d] ring-1 ring-white/20 rounded-md px-3 py-1.5 shadow-lg select-none transition-colors"
          >
            ← menu
          </a>
        )}
        {typeof Comp === "function" ? (
          <Comp />
        ) : (
          <div className="flex items-center justify-center min-h-screen text-red-400 font-mono text-xs p-4">
            ⚠️ Erreur d'initialisation : Le module n'exporte pas un composant valide.
          </div>
        )}
      </div>
    );
  }

  return (
    // CORRECTIF : Remplacement de items-center par py-6 pour permettre le défilement fluide sur les petits écrans
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans flex flex-col items-center justify-start py-6 px-4 overflow-y-auto">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=500;600;700&family=Inter:wght=400;500;600;700&family=JetBrains+Mono:wght=400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>
      
      <div className="w-full max-w-md space-y-4">
        {/* En-tête plus compact sur mobile */}
        <div className="flex items-center gap-3 mb-4 bg-[#151b23] p-3 rounded-xl ring-1 ring-white/5">
          <div className="w-10 h-10 rounded-lg bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="font-display tracking-wide text-md leading-none uppercase">Plateforme Numérique QG</div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-1 uppercase truncate">BFMF 2026 · Sécurité & Log</div>
          </div>
        </div>

        {/* Liste des boutons d'applications optimisée en taille */}
        <div className="space-y-2">
          {Object.entries(ROUTES).map(([key, item]) => {
            const Icon = item.icon;
            return (
              <a
                key={key}
                href={`#${key}`}
                className={`flex items-center gap-3 rounded-xl ring-1 p-3.5 transition-all bg-[#151b23] active:bg-[#1f2632] md:hover:bg-[#1a212b] ${
                  item.public ? "ring-red-500/20 bg-gradient-to-r from-[#151b23] to-red-950/10" : "ring-white/5"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.public ? 'bg-red-500/10' : 'bg-white/[0.03]'}`}>
                  <Icon className={`w-4 h-4 ${item.public ? "text-red-400" : "text-amber-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-slate-100 font-semibold tracking-wide">{item.titre}</div>
                  <div className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">{item.desc}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              </a>
            );
          })}
        </div>
        
        <div className="text-[9px] text-slate-600 font-mono text-center pt-2 leading-relaxed">
          Infrastructure : Supabase Live Database<br />
          #sos est le seul accès public ouvert aux terminaux festivaliers
        </div>
      </div>
    </div>
  );
}