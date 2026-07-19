import React, { useState } from "react";
import {
  Shield, Truck, HeartPulse, Search, ChevronDown, ChevronRight,
  LayoutDashboard, X, Globe, ShieldAlert, Users,
} from "lucide-react";

/* ------------------------------------------------------------------
   MENU DES APPLICATIONS -- BFMF 2026
   4 poles internes + acces publics separes visuellement (rouge).
   Les IDs correspondent aux hash (#dashboard, #volante...).
------------------------------------------------------------------ */

const CATEGORIES = {
  qg: { label: "Commandement & QG", icon: Shield, color: "text-amber-400" },
  logistique: { label: "Logistique & Regulation", icon: Truck, color: "text-sky-400" },
  rh: { label: "Ressources humaines", icon: Users, color: "text-violet-400" },
  terrain: { label: "Secours & Terrain", icon: HeartPulse, color: "text-cyan-400" },
  benevoles: { label: "Benevoles — lien direct (sans menu)", icon: HeartPulse, color: "text-teal-400" },
  public: { label: "Acces publics (QR / liens)", icon: Globe, color: "text-red-400" },
};

const APPS_LIST = [
  // Pole Commandement & QG
  { id: "dashboard", name: "Tableau de bord QG", cat: "qg" },
  { id: "maincourante", name: "Main courante QG", cat: "qg" },
  { id: "console-cm", name: "Console medias (CM)", cat: "qg" },
  { id: "fichereflexe", name: "Fiche reflexe secu", cat: "qg" },
  { id: "radios", name: "Parc & attributions radio", cat: "qg" },

  // Pole Logistique & Regulation
  { id: "logistique", name: "Missions logistiques", cat: "logistique" },
  { id: "stocks", name: "Stocks bar (plaine + etapes)", cat: "logistique" },
  { id: "jauge", name: "Jauge plaine / acces", cat: "logistique" },

  // Pole Ressources humaines
  { id: "equipe-benevoles", name: "Benevoles (planning / contacts)", cat: "rh" },

  // Pole Secours & Terrain
  { id: "volante", name: "Equipe volante", cat: "terrain" },
  { id: "recherche", name: "Personne recherchee", cat: "terrain", alerte: true },

  // Benevoles : ouvertes par lien direct, sans menu (bandeaux conserves).
  // Depuis le QG, le bouton RETOUR du navigateur ramene au menu.
  { id: "balade", name: "Suivi balade & parcours", cat: "benevoles" },
  { id: "sanitaire", name: "Equipe sanitaire (QR blocs)", cat: "benevoles" },

  // Acces publics — a diffuser aux festivaliers uniquement
  { id: "pcops", name: "PC-Ops / Autorité (lien direct)", cat: "public" },
  { id: "sos", name: "SOS participant (public)", cat: "public" },
  { id: "signaler", name: "Signalement sanitaire (public)", cat: "public" },
];

export default function MenuApps({ currentApp, onChangeApp, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [openCats, setOpenCats] = useState({ qg: true, logistique: true, rh: true, terrain: true, benevoles: true, public: false });

  const toggleCat = (cat) => setOpenCats((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const filteredApps = APPS_LIST.filter((app) =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-64 bg-[#11151d] border-r border-white/5 h-screen p-4 flex flex-col gap-4 shrink-0">
      <div className="flex items-center gap-2 px-1">
        <ShieldAlert className="w-4 h-4 text-amber-300" />
        <span className="font-mono text-xs font-bold tracking-wider text-slate-300 flex-1">SECU BFMF 2026</span>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-white" title="Fermer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
        <input
          type="text"
          placeholder="Filtrer les modules..."
          className="w-full bg-black/40 border border-white/10 rounded pl-8 pr-3 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-sky-500/50 font-mono"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {Object.entries(CATEGORIES).map(([catKey, catMeta]) => {
          const catApps = filteredApps.filter((a) => a.cat === catKey);
          if (catApps.length === 0) return null;

          const Icon = catMeta.icon;
          const isOpen = openCats[catKey] || searchTerm.length > 0;
          const estPublic = catKey === "public";

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
                <div className={`pl-3 space-y-1 border-l ml-1.5 ${estPublic ? "border-red-400/20" : "border-white/5"}`}>
                  {estPublic && (
                    <div className="text-[9px] text-red-300/70 leading-snug pb-1">
                      Pages festivaliers : s'ouvrent SANS le menu interne. Liens/QR a diffuser.
                    </div>
                  )}
                  {catApps.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => onChangeApp(app.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all tracking-wide ${
                        currentApp === app.id
                          ? "bg-sky-500/10 text-sky-400 font-medium border border-sky-500/20 shadow-sm"
                          : estPublic
                          ? "text-red-300/80 hover:bg-red-500/5 hover:text-red-200"
                          : "text-slate-400 hover:bg-white/[0.02] hover:text-slate-200"
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

      <div className="text-[9px] font-mono text-slate-600 leading-snug px-1">
        Navigation par lien : #dashboard, #volante...<br />
        Publics : #sos · #signaler/ID (QR)
      </div>
    </div>
  );
}