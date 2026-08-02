import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import MenuApps from "./apps/MenuApps";
import BandeauGeneral from "./apps/bandeau-general";
import BandeauUrgence from "./apps/BandeauUrgence";
import IndicateurReseau from "./apps/IndicateurReseau";

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
import BaladeLight from "./apps/balade-light";
import Transport from "./apps/transport";
import Chauffeur from "./apps/chauffeur";
import EnfantPerdu from "./apps/enfantperdu";
import Sos from "./apps/sos";
import Signaler from "./apps/signaler";
import GestionBenevoles from "./apps/Benevoles";

/* ------------------------------------------------------------------
   NAVIGATION : le hash (#dashboard, #volante, #signaler/ID...) reste
   la source de verite -> liens partageables, bouton retour, et
   surtout QR CODES publics fonctionnels (#sos et #signaler/ID).
   Le menu lateral ne fait que changer le hash.
   TROIS NIVEAUX D'AFFICHAGE :
   - ROUTES_PUBLIQUES : plein ecran, AUCUN element interne (ni menu, ni
     bandeau). Destine aux festivaliers et aux autorites.
   - ROUTES_SANS_MENU : plein ecran SANS menu, mais AVEC les bandeaux crise
     et recherche. Pour les benevoles qui n'ont a utiliser qu'une seule app :
     ils ne doivent pas se perdre dans les outils du QG, mais ils DOIVENT
     recevoir une consigne de mise a l'abri et pouvoir en accuser reception.
     (Les encadrants de balade sont les plus isoles du dispositif : leur
     retirer le bandeau reviendrait a les rendre injoignables par l'app.)
   - le reste : menu lateral + bandeaux.

   ATTENTION : ce n'est PAS une securite. Le menu est masque, mais taper
   #dashboard dans l'URL donne quand meme acces au QG. C'est une
   simplification d'usage, pas un cloisonnement.
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
  "balade-light": BaladeLight,
  transport: Transport,
  chauffeur: Chauffeur,
  recherche: EnfantPerdu,
  sos: Sos,
  signaler: Signaler,
  "equipe-benevoles": GestionBenevoles,
};
const ROUTES_PUBLIQUES = ["sos", "signaler", "pcops"];
const ROUTES_SANS_MENU = ["sanitaire", "balade-light", "stocks", "equipe-benevoles", "chauffeur", "logistique"];
// Apps terrain qui affichent le bandeau Urgence (numeros/PRV/radio).
// Exclut les routes publiques : le SOS a deja le 112, pcops est pour les autorites.
const APPS_TERRAIN = ["volante", "balade", "balade-light", "sanitaire", "logistique", "recherche", "equipe-benevoles", "chauffeur"];

function parseHash() {
  const h = (window.location.hash || "").slice(1);
  if (h.startsWith("signaler")) return "signaler"; // supporte #signaler/ID (QR)
  return COMPOSANTS[h] ? h : "dashboard";
}

export default function App() {
  const [currentApp, setCurrentApp] = useState(parseHash);
  const [menuMobile, setMenuMobile] = useState(false);
  const [menuVisible, setMenuVisible] = useState(true);

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

  // Apps benevoles : pas de menu, mais bandeaux crise/recherche conserves
  if (ROUTES_SANS_MENU.includes(currentApp)) {
    return (
      <div className="w-screen h-screen overflow-y-auto bg-[#0f1319]">
        <IndicateurReseau />
        <BandeauGeneral />
        <Comp />
        {APPS_TERRAIN.includes(currentApp) && <BandeauUrgence />}
      </div>
    );
  }

  return (
    <div className="flex w-screen h-screen bg-[#0f1319] overflow-hidden">
      {/* Sur smartphone en PAYSAGE (écran court), on masque automatiquement le
          menu fixe pour récupérer de la hauteur. Le bouton toggle reste
          disponible pour le rouvrir en overlay. */}
      <style>{`
        @media (orientation: landscape) and (max-height: 760px) {
          .menu-fixe { display: none !important; }
        }
      `}</style>

      {/* Menu latéral fixe : affiché quand menuVisible ET sur écran md+.
          Masquable via le bouton toggle (menuVisible), et auto-masqué en
          paysage smartphone (via .menu-fixe ci-dessus). */}
      {menuVisible && (
        <div className="menu-fixe hidden md:block h-full shrink-0 relative">
          <MenuApps currentApp={currentApp} onChangeApp={changerApp} />
        </div>
      )}

      {/* Menu overlay (mobile portrait + paysage smartphone, déclenché par le bouton) */}
      {menuMobile && (
        <div className="fixed inset-0 z-[70] flex">
          <MenuApps currentApp={currentApp} onChangeApp={changerApp} onClose={() => setMenuMobile(false)} />
          <div className="flex-1 bg-black/60" onClick={() => setMenuMobile(false)} />
        </div>
      )}

      {/* Zone applicative */}
      <div className="flex-1 h-full overflow-y-auto bg-[#0f1319] relative">
        {/* Bouton toggle du menu — TOUJOURS visible.
            Sur md+ : masque/affiche le menu fixe (menuVisible).
            Sur mobile/paysage : ouvre l'overlay (menuMobile). */}
        <button
          onClick={() => {
            if (window.matchMedia("(min-width: 768px)").matches &&
                !window.matchMedia("(orientation: landscape) and (max-height: 760px)").matches) {
              setMenuVisible((v) => !v);
            } else {
              setMenuMobile(true);
            }
          }}
          className="fixed bottom-4 left-4 z-[65] w-12 h-12 rounded-full bg-[#1a212b] ring-1 ring-white/20 shadow-xl flex items-center justify-center text-slate-200 active:scale-95 hover:bg-[#222b38]"
          title={menuVisible ? "Masquer le menu" : "Afficher le menu"}
        >
          {menuVisible ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Bandeaux crise + recherches : toutes les apps EQUIPES */}
        <IndicateurReseau />
        <BandeauGeneral />
        <Comp />
        {APPS_TERRAIN.includes(currentApp) && <BandeauUrgence />}
      </div>
    </div>
  );
}