import React, { useState } from "react";
import MenuApps from "./apps/MenuApps";

// Importations exactes de l'ensemble des modules du dossier apps
import DashboardQG from "./apps/dashboard";
import ConsoleCM from "./apps/Console-CM";
import PCOps from "./apps/pcops";
import MainCourante from "./apps/maincourante";
import FicheReflexe from "./apps/fichereflexe";
import AppLogistique from "./apps/logistique";
import StocksBar from "./apps/StocksBar";
import Jauge from "./apps/jauge";
import AppVolante from "./apps/volante";
import Sanitaire from "./apps/sanitaire";
import Balade from "./apps/balade";
import Sos from "./apps/sos";
import Signaler from "./apps/signaler";

export default function App() {
  const [currentApp, setCurrentApp] = useState("dashboard");

  // Table de routage sans omission
  const renderSelectedApp = () => {
    switch (currentApp) {
      // QG & Commandement
      case "dashboard":
        return <DashboardQG />;
      case "console-cm":
        return <ConsoleCM />;
      case "pcops":
        return <PCOps />;
      case "maincourante":
        return <MainCourante />;
      case "fichereflexe":
        return <FicheReflexe />;

      // Logistique
      case "logistique":
        return <AppLogistique />;
      case "stocks":
        return <StocksBar />;
      case "jauge":
        return <Jauge />;

      // Secours & Terrain
      case "volante":
        return <AppVolante />;
      case "sanitaire":
        return <Sanitaire />;
      case "balade":
        return <Balade />;
      case "sos":
        return <Sos />;
      case "signaler":
        return <Signaler />;

      default:
        return <DashboardQG />;
    }
  };

  return (
    <div className="flex w-screen h-screen bg-[#0f1319] overflow-hidden">
      {/* Menu à gauche avec transfert d'états */}
      <MenuApps currentApp={currentApp} onChangeApp={setCurrentApp} />

      {/* Zone applicative autonome */}
      <div className="flex-1 h-full overflow-y-auto bg-[#0f1319]">
        {renderSelectedApp()}
      </div>
    </div>
  );
}