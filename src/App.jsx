import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  ClipboardList, 
  Footprints, 
  TriangleAlert, 
  Zap, 
  ChevronRight, 
  Landmark, 
  Droplets 
} from "lucide-react";
import Dashboard from "./apps/dashboard.jsx";
import Logistique from "./apps/logistique.jsx";
import Balade from "./apps/balade.jsx";
import Sos from "./apps/sos.jsx";
import Volante from "./apps/volante.jsx";
import PcOps from "./apps/pcops.jsx";
import Sanitaire from "./apps/sanitaire.jsx"; // Import de la nouvelle application sanitaire

// Navigation par hash : chaque app garde sa propre URL partageable
const ROUTES = {
  dashboard: { titre: "Dashboard QG", desc: "Synthèse : alertes, logistique, balade, météo, sanitaire", icon: ShieldAlert, comp: Dashboard, public: false },
  logistique: { titre: "Missions logistiques", desc: "Saisie, attribution et suivi des demandes", icon: ClipboardList, comp: Logistique, public: false },
  balade: { titre: "Suivi balade", desc: "Crowd management du parcours 6,5 km", icon: Footprints, comp: Balade, public: false },
  volante: { titre: "App Volante", desc: "Engagements, guidage GPS, missions terrain", icon: Zap, comp: Volante, public: false },
  sanitaire: { titre: "Suivi Sanitaire", desc: "Gestion et résolution des signalements blocs WC", icon: Droplets, comp: Sanitaire, public: false },
  pcops: { titre: "PC-Ops / Autorité", desc: "Vue de situation en lecture seule (commune, disciplines)", icon: Landmark, comp: PcOps, public: false },
  sos: { titre: "SOS Participants", desc: "App publique — lien/QR à diffuser aux festivaliers", icon: TriangleAlert, comp: Sos, public: true },
};

export default function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1));

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const r = ROUTES[route];
  if (r) {
    const Comp = r.comp;
    return (
      <div>
        {/* Lien retour discret, absent de l'app SOS publique */}
        {!r.public && (
          <a href="#" className="fixed bottom-3 right-3 z-50 text-[10px] font-mono text-slate-500 hover:text-slate-200 bg-[#151b23]/90 ring-1 ring-white/10 rounded px-2 py-1">
            ← menu
          </a>
        )}
        <Comp />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans flex items-center justify-center p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght=500;600;700&family=Inter:wght=400;500;600;700&family=JetBrains+Mono:wght=400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="font-display tracking-wide text-lg leading-none">PLATEFORME SÉCURITÉ</div>
            <div className="text-[11px] text-slate-400 font-mono tracking-wider mt-1">BUCO_LOGIQUE FERRIÈRES MUSIQUE FESTIVAL · 15-16 AOÛT 2026</div>
          </div>
        </div>
        <div className="space-y-2">
          {Object.entries(ROUTES).map(([key, r]) => {
            const Icon = r.icon;
            return (
              <a
                key={key}
                href={`#${key}`}
                className={`flex items-center gap-3 rounded-lg ring-1 p-4 transition-colors bg-[#151b23] hover:bg-[#1a212b] ${
                  r.public ? "ring-red-400/30" : "ring-white/10"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${r.public ? "text-red-300" : "text-amber-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-100 font-medium">{r.titre}</div>
                  <div className="text-[11px] text-slate-500">{r.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </a>
            );
          })}
        </div>
        <div className="text-[10px] text-slate-600 font-mono text-center mt-6 leading-relaxed">
          Config : src/config.js (URL + clé anon Supabase) · Schéma : supabase-setup.sql<br />
          Apps équipes à diffusion contrôlée · #sos est le seul lien public
        </div>
      </div>
    </div>
  );
}