import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import MenuApps from "./apps/MenuApps";
import BandeauGeneral from "./apps/bandeau-general";

// Importations de l'ensemble des modules du dossier apps
import DashboardQG from "./apps/dashboard";
import ConsoleCM from "./apps/Console-CM";
import PCOps from "./apps/pcops";
import MainCourante from "./apps/maincourante";
import FicheReflexe from "./apps/fichereflexe";
import AppLogistique from "./apps/logistique";
import StocksBar from "./apps/StocksBar";
import Jauge from "./apps/jauge";
import GestionRadios from "./apps/radios";
import AppVolante from "./apps/volante";
import Sanitaire from "./apps/sanitaire";
import Balade from "./apps/balade";
import EnfantPerdu from "./apps/enfantperdu";
import Sos from "./apps/sos";
import Signaler from "./apps/signaler";

/* ------------------------------------------------------------------
   NAVIGATION : le hash (#dashboard, #volante, #signaler/ID...) reste
   la source de verite -> liens partageables, bouton retour, et
   surtout QR CODES publics fonctionnels (#sos et #signaler/ID).
   Le menu lateral ne fait que changer le hash.
   Les routes PUBLIQUES s'affichent PLEIN ECRAN, sans menu interne
   ni bandeau equipe (un festivalier ne voit jamais les outils QG).
------------------------------------------------------------------ */

const COMPOSANTS = {
  dashboard: DashboardQG,
  "console-cm": ConsoleCM,
  pcops: PCOps,
  maincourante: MainCourante,
  fichereflexe: FicheReflexe,
  logistique: AppLogistique,
  stocks: StocksBar,
  jauge: Jauge,
  radios: GestionRadios,
  volante: AppVolante,
  sanitaire: Sanitaire,
  balade: Balade,
  recherche: EnfantPerdu,
  sos: Sos,
  signaler: Signaler,
};
const ROUTES_PUBLIQUES = ["sos", "signaler", "pcops"];

function parseHash() {
  const h = (window.location.hash || "").slice(1);
  if (h.startsWith("signaler")) return "signaler"; // supporte #signaler/ID (QR)
  return COMPOSANTS[h] ? h : "dashboard";
}

export default function App() {
  const [currentApp, setCurrentApp] = useState(parseHash);
  const [menuMobile, setMenuMobile] = useState(false);

  useEffect(() => {
    const onHash = () => { setCurrentApp(parseHash()); setMenuMobile(false); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const changerApp = (id) => {
    window.location.hash = id; // le hashchange fait le reste
    setMenuMobile(false);
  };

  const Comp = COMPOSANTS[currentApp] || DashboardQG;
  const estPublique = ROUTES_PUBLIQUES.includes(currentApp);

  // Routes publiques : plein ecran, aucun element interne visible
  if (estPublique) {
    return <Comp />;
  }

  return (
    <div className="flex w-screen h-screen bg-[#0f1319] overflow-hidden">
      {/* Menu lateral : fixe sur grand ecran, overlay sur mobile */}
      <div className="hidden lg:block h-full shrink-0">
        <MenuApps currentApp={currentApp} onChangeApp={changerApp} />
      </div>
      {menuMobile && (
        <div className="lg:hidden fixed inset-0 z-[70] flex">
          <MenuApps currentApp={currentApp} onChangeApp={changerApp} onClose={() => setMenuMobile(false)} />
          <div className="flex-1 bg-black/60" onClick={() => setMenuMobile(false)} />
        </div>
      )}

      {/* Zone applicative */}
      <div className="flex-1 h-full overflow-y-auto bg-[#0f1319] relative">
        {/* Bouton menu (mobile uniquement) */}
        <button
          onClick={() => setMenuMobile(true)}
          className="lg:hidden fixed bottom-4 left-4 z-[65] w-12 h-12 rounded-full bg-[#1a212b] ring-1 ring-white/20 shadow-xl flex items-center justify-center text-slate-200 active:scale-95"
          title="Menu des applications"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Bandeaux crise + recherches : toutes les apps EQUIPES */}
        <BandeauGeneral />
        <Comp />
      </div>
    </div>
  );
}
