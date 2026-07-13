import React, { useState } from "react";
import MenuApps from "./apps/MenuApps";
import DashboardQG from "./apps/dashboard";
import AppVolante from "./apps/volante";
import AppLogistique from "./apps/logistique";

// Importez vos autres applications au besoin :
// import ConsoleCM from "./apps/Console-CM";
// import SanitaireMoniteur from "./apps/sanitaire";
// import StocksBar from "./apps/StocksBar";

export default function App() {
  // L'application par défaut au démarrage (ex: le tableau de bord QG)
  const [currentApp, setCurrentApp] = useState("dashboard");

  // Fonction de routage dynamique qui renvoie le bon composant selon l'ID sélectionné
  const renderSelectedApp = () => {
    switch (currentApp) {
      case "dashboard":
        return <DashboardQG />;
      case "volante":
        return <AppVolante />;
      case "logistique":
        return <AppLogistique />;
      
      /* Activez vos autres routes ici au fur et à mesure :
      case "pcops":
        return <ConsoleCM />;
      case "sanitaire":
        return <SanitaireMoniteur />;
      case "stocks":
        return <StocksBar />;
      */
      
      default:
        return <DashboardQG />;
    }
  };

  return (
    <div className="flex w-screen h-screen bg-[#0f1319] overflow-hidden">
      {/* 1. Barre latérale de navigation optimisée (hauteur fixe, défilement interne) */}
      <MenuApps currentApp={currentApp} onChangeApp={setCurrentApp} />

      {/* 2. Zone d'affichage principale de l'application active */}
      <div className="flex-1 h-full overflow-y-auto bg-[#0f1319]">
        {renderSelectedApp()}
      </div>
    </div>
  );
}