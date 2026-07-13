import React, { useState } from 'react';
import { 
  Shield, Truck, HeartPulse, Search, ChevronDown, ChevronRight, 
  LayoutDashboard, Wrench, BarChart3, AlertOctagon, ClipboardList, 
  Map, Signal, ShieldAlert 
} from 'lucide-react';

const CATEGORIES = {
  qg: { label: "Commandement & QG", icon: Shield, color: "text-amber-400" },
  logistique: { label: "Logistique & Régulation", icon: Truck, color: "text-sky-400" },
  sanitaire: { label: "Secours & Sanitaire", icon: HeartPulse, color: "text-cyan-400" }
};

const APPS_LIST = [
  // Pôle Commandement & QG
  { id: 'dashboard', name: 'Tableau de Bord QG', cat: 'qg' },
  { id: 'console-cm', name: 'Console CM / Crise', cat: 'qg' },
  { id: 'pcops', name: 'Console PC Ops', cat: 'qg' },
  { id: 'maincourante', name: 'Main Courante Ops', cat: 'qg' },
  { id: 'fichereflexe', name: 'Fiches Réflexes Sécu', cat: 'qg' },
  
  // Pôle Logistique & Régulation
  { id: 'logistique', name: 'Moniteur Logistique', cat: 'logistique' },
  { id: 'stocks', name: 'Gestion des Stocks Bar', cat: 'logistique' },
  { id: 'jauge', name: 'Indicateurs Jauge Site', cat: 'logistique' },
  
  // Pôle Secours & Territoire
  { id: 'volante', name: 'Application Équipe Volante', cat: 'sanitaire' },
  { id: 'sanitaire', name: 'Moniteur Sanitaire Blocs', cat: 'sanitaire' },
  { id: 'balade', name: 'Suivi Balade & Parcours', cat: 'sanitaire' },
  { id: 'sos', name: 'Module SOS Participant', cat: 'sanitaire' },
  { id: 'signaler', name: 'Interface Signalement', cat: 'sanitaire' }
];

export default function MenuApps({ currentApp, onChangeApp }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [openCats, setOpenCats] = useState({ qg: true, logistique: true, sanitaire: true });

  const toggleCat = (cat) => setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }));

  const filteredApps = APPS_LIST.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-64 bg-[#11151d] border-r border-white/5 h-screen p-4 flex flex-col gap-4 shrink-0">
      <div className="flex items-center gap-2 px-1">
        <LayoutDashboard className="w-4 h-4 text-slate-400" />
        <span className="font-mono text-xs font-bold tracking-wider text-slate-300">HUB APPLICATIONS (V2)</span>
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
        <input 
          type="text" 
          placeholder="Filtrer les modules..." 
          className="w-full bg-black/40 border border-white/10 rounded pl-8 pr-3 py-1.5 text-xxs text-slate-300 focus:outline-none focus:border-sky-500/50 font-mono"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {Object.entries(CATEGORIES).map(([catKey, catMeta]) => {
          const catApps = filteredApps.filter(a => a.cat === catKey);
          if (catApps.length === 0) return null;
          
          const Icon = catMeta.icon;
          const isOpen = openCats[catKey];

          return (
            <div key={catKey} className="space-y-1.5">
              <button 
                onClick={() => toggleCat(catKey)}
                className="w-full flex items-center justify-between text-[10px] font-mono tracking-wider uppercase text-slate-500 hover:text-slate-300 py-1 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${catMeta.color}`} />
                  <span>{catMeta.label}</span>
                </div>
                {isOpen ? <ChevronDown className="w-3 h-3 text-slate-600" /> : <ChevronRight className="w-3 h-3 text-slate-600" />}
              </button>

              {isOpen && (
                <div className="pl-3 space-y-1 border-l border-white/5 ml-1.5 transition-all">
                  {catApps.map(app => (
                    <button
                      key={app.id}
                      onClick={() => onChangeApp(app.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all tracking-wide ${
                        currentApp === app.id 
                          ? 'bg-sky-500/10 text-sky-400 font-medium border border-sky-500/20 shadow-sm' 
                          : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200'
                      }`}
                    >
                      {app.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}