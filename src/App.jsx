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
   ROUTEUR PRINCIPAL FULL-MOBILE RESPONSIVE — Bucolique Ferrières 2026
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
            className="fixed bottom-4 right-4 z-50 text-xs font-mono font-medium text-slate-300 hover:text-white bg-[#1a222d] ring-1 ring-white/25 rounded-lg px-4 py-2 shadow-xl select-none transition-colors"
          >
            ← menu
          </a>
        )}
        {typeof Comp === "function" ? (
          <Comp />
        ) : (
          <div className="flex items-center justify-center min-h-screen text-red-400 font-mono text-xs p-4">
            ⚠️ Erreur d'initialisation du module.
          </div>
        )}
      </div>
    );
  }

  return (
    // Rendu en conteneur pleine largeur max-w-xl pour étaler proprement les boutons sur mobile
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans flex flex-col items-center justify-start py-6 px-4 overflow-y-auto">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=500;600;700&family=Inter:wght=400;500;600;700&family=JetBrains+Mono:wght=400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>
      
      <div className="w-full max-w-xl space-y-5">
        
        {/* En-tête élargi et plus aéré */}
        <div className="flex items-center gap-4 bg-[#151b23] p-4 rounded-xl ring-1 ring-white/10 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-amber-300" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display tracking-wide text-lg leading-tight uppercase font-bold text-slate-100">PLATEFORME NUMÉRIQUE QG</h1>
            <p className="text-[11px] text-slate-400 font-mono tracking-wider mt-0.5 uppercase">Bucolique Ferrières · Sécurité & Logistique · 2026</p>
          </div>
        </div>

        {/* Grille ou liste aérée à 100% de largeur */}
        <div className="space-y-3">
          {Object.entries(ROUTES).map(([key, item]) => {
            const Icon = item.icon;
            return (
              <a
                key={key}
                href={`#${key}`}
                className={`flex items-center gap-4 rounded-xl ring-1 p-4 transition-all bg-[#151b23] active:bg-[#1d2633] md:hover:bg-[#1a212b] shadow-sm ${
                  item.public ? "ring-red-500/30 bg-gradient-to-r from-[#151b23] to-red-950/20" : "ring-white/10"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${item.public ? 'bg-red-500/10' : 'bg-white/[0.04]'}`}>
                  <Icon className={`w-5 h-5 ${item.public ? "text-red-400" : "text-amber-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold tracking-wide text-slate-100">{item.titre}</div>
                  <div className="text-xs text-slate-400 leading-snug mt-0.5 truncate-2-lines">{item.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </a>
            );
          })}
        </div>
        
        <div className="text-[10px] text-slate-600 font-mono text-center pt-4 leading-relaxed border-t border-white/5">
          Infrastructure opérationnelle : Supabase Live Synchronization<br />
          #sos est la seule interface accessible hors réseau interne festival
        </div>
      </div>
    </div>
  );
}