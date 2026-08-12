import React, { useState } from "react";
import {
  Shield, Truck, HeartPulse, Search, ChevronDown, ChevronRight,
  LayoutDashboard, X, Globe, ShieldAlert, Users, ClipboardList,
  BookText, MapPin, Footprints, UserSearch, Radio, KeyRound, CalendarDays,
  Car, Package, Boxes, Gauge, Bike, Landmark, LifeBuoy, Droplets,
  Map, Stethoscope, Lightbulb,
} from "lucide-react";

/* ------------------------------------------------------------------
   MENU DES APPLICATIONS -- BFMF 2026
   4 poles internes + acces publics separes visuellement (rouge).
   Les IDs correspondent aux hash (#dashboard, #volante...).
------------------------------------------------------------------ */

const CATEGORIES = {
  qg: { label: "Commandement & Sécurité", icon: Shield, color: "text-amber-400" },
  gestion: { label: "Gestion QG", icon: ClipboardList, color: "text-indigo-400" },
  logistique: { label: "Logistique & Regulation", icon: Truck, color: "text-sky-400" },
  rh: { label: "Ressources humaines", icon: Users, color: "text-violet-400" },
  terrain: { label: "Secours & Terrain", icon: HeartPulse, color: "text-cyan-400" },
  liendirect: { label: "Accès directs (liens / QR)", icon: Globe, color: "text-teal-400" },
};

const APPS_LIST = [
  // Pole Commandement & QG
  { id: "dashboard", name: "Tableau de bord QG", cat: "qg", icon: LayoutDashboard },
  { id: "maincourante", name: "Main courante QG", cat: "qg", icon: BookText },
  { id: "cartographie", name: "Map Ops — cartographie", cat: "qg", icon: MapPin },
  // { id: "console-cm", name: "Console medias (CM)", cat: "qg", icon: Globe }, // masquée — non utilisée pour BFMF 2026
  { id: "fichereflexe", name: "Fiche reflexe secu", cat: "qg", icon: LifeBuoy },
  { id: "balade", name: "Suivi balade & parcours (QG)", cat: "qg", icon: Footprints },
  { id: "recherche", name: "Personne recherchee", cat: "qg", alerte: true, icon: UserSearch },

  { id: "radios", name: "Parc & attributions radio", cat: "gestion", icon: Radio },
  { id: "cles", name: "Clefier — clés & emprunts", cat: "gestion", icon: KeyRound },
  { id: "planning", name: "Planning du week-end", cat: "gestion", icon: CalendarDays },
  { id: "transport", name: "Transport de personnes", cat: "gestion", icon: Car },
  { id: "rex", name: "Retours d'expérience (REX)", cat: "gestion", icon: Lightbulb },

  // Pole Logistique & Regulation
  { id: "logistique", name: "Missions logistiques", cat: "logistique", icon: Truck },
  { id: "stocks", name: "Stocks bar (plaine + etapes)", cat: "logistique", icon: Boxes },
  { id: "jauge", name: "Jauge plaine / acces", cat: "logistique", icon: Gauge },

  // Pole Ressources humaines
  { id: "equipe-benevoles", name: "Benevoles (planning / contacts)", cat: "rh", icon: Users },

  // Pole Secours & Terrain
  { id: "volante", name: "Equipe volante", cat: "terrain", icon: Bike },

  // Acces directs : ouverts par lien ou QR, sans menu (bandeaux conserves).
  // Depuis le QG, le bouton RETOUR du navigateur ramene au menu.
  { id: "balade-light", name: "Balade — accompagnateur", cat: "liendirect", icon: Footprints },
  { id: "chauffeur", name: "Chauffeur — mes courses", cat: "liendirect", icon: Car },
  { id: "sanitaire", name: "Equipe sanitaire (QR blocs)", cat: "liendirect", icon: Droplets },
  { id: "pcops", name: "PC-Ops / Autorité (lien direct)", cat: "liendirect", icon: Landmark },
  { id: "sos", name: "SOS participant (public)", cat: "liendirect", icon: ShieldAlert },
  { id: "signaler", name: "Signalement sanitaire (public)", cat: "liendirect", icon: Droplets },
];

export default function MenuApps({ currentApp, onChangeApp, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [openCats, setOpenCats] = useState({ qg: true, gestion: true, logistique: true, rh: true, terrain: true, liendirect: false });

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
          const estLienDirect = catKey === "liendirect";

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
                <div className={`pl-3 space-y-1 border-l ml-1.5 ${estLienDirect ? "border-teal-400/20" : "border-white/5"}`}>
                  {estLienDirect && (
                    <div className="text-[9px] text-teal-300/70 leading-snug pb-1">
                      S'ouvrent SANS le menu interne. Liens directs / QR à diffuser aux équipes et festivaliers.
                    </div>
                  )}
                  {catApps.map((app) => {
                    const AppIcon = app.icon;
                    return (
                    <button
                      key={app.id}
                      onClick={() => onChangeApp(app.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all tracking-wide flex items-center gap-2 ${
                        currentApp === app.id
                          ? "bg-sky-500/10 text-sky-400 font-medium border border-sky-500/20 shadow-sm"
                          : estLienDirect
                          ? "text-teal-300/80 hover:bg-teal-500/5 hover:text-teal-200"
                          : "text-slate-400 hover:bg-white/[0.02] hover:text-slate-200"
                      }`}
                    >
                      {AppIcon && <AppIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />}
                      <span className="truncate">{app.name}</span>
                    </button>
                    );
                  })}
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