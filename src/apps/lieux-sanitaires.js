// Catalogue des points sanitaires equipes d'un QR code.
// L'ID est encode dans l'URL du QR : https://votre-site/#signaler/ID
export const LIEUX = [
  { id: "wc-p0-a", nom: "WC Point 0 — bloc A", zone: "Point 0", equip: "wc" },
  { id: "wc-p0-b", nom: "WC Point 0 — bloc B", zone: "Point 0", equip: "wc" },
  { id: "lm-p0", nom: "Lave-mains Point 0", zone: "Point 0", equip: "lave-mains" },
  { id: "pb-p0", nom: "Poubelles Point 0 / accueil", zone: "Point 0", equip: "poubelle" },
  { id: "wc-e1", nom: "WC Etape 1", zone: "Etape 1", equip: "wc" },
  { id: "pb-e1", nom: "Poubelles Etape 1", zone: "Etape 1", equip: "poubelle" },
  { id: "wc-e2", nom: "WC Etape 2", zone: "Etape 2", equip: "wc" },
  { id: "lm-e2", nom: "Lave-mains Etape 2", zone: "Etape 2", equip: "lave-mains" },
  { id: "pb-e2", nom: "Poubelles Etape 2", zone: "Etape 2", equip: "poubelle" },
  { id: "wc-e3", nom: "WC Etape 3", zone: "Etape 3", equip: "wc" },
  { id: "pb-e3", nom: "Poubelles Etape 3", zone: "Etape 3", equip: "poubelle" },
  { id: "wc-sc1", nom: "WC Scene 1", zone: "Site festival", equip: "wc" },
  { id: "wc-sc2", nom: "WC Scene 2", zone: "Site festival", equip: "wc" },
  { id: "lm-food", nom: "Lave-mains Foodtrucks", zone: "Site festival", equip: "lave-mains" },
  { id: "pb-food", nom: "Poubelles Foodtrucks", zone: "Site festival", equip: "poubelle" },
  { id: "pb-park", nom: "Poubelles Parking", zone: "Parking", equip: "poubelle" },
];

export const TYPES_SIGNALEMENT = [
  { id: "papier", label: "Plus de papier toilette", equip: ["wc"] },
  { id: "eau", label: "Lave-mains sans eau / savon", equip: ["lave-mains", "wc"] },
  { id: "poubelle", label: "Poubelle qui deborde", equip: ["poubelle", "wc", "lave-mains"] },
  { id: "bouche", label: "WC bouche / hors service", equip: ["wc"] },
  { id: "proprete", label: "Proprete a revoir", equip: ["wc", "lave-mains", "poubelle"] },
  { id: "autre", label: "Autre probleme", equip: ["wc", "lave-mains", "poubelle"] },
];

export const KEY_SANITAIRE = "bfmf2026-sanitaire";
