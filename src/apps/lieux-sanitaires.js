// Catalogue des points sanitaires equipes d'un QR code.
// L'ID est encode dans l'URL du QR : https://votre-site/#signaler/ID
export const LIEUX = [
  { id: "wc-plaine", nom: "WC Plaine", zone: "Plaine", equip: "wc" },
  { id: "wc-plaine-PMR", nom: "WC Plaine - PMR", zone: "Plaine", equip: "wc" },
  { id: "Uri-plaine", nom: "Urinoir Plaine", zone: "Plaine", equip: "urinoir" },
  { id: "lm-plaine", nom: "Lave-mains sanitaires plaine", zone: "Plaine", equip: "lave-mains" },
  { id: "pb-plaine", nom: "Poubelles Plaine", zone: "Plaine", equip: "poubelle" },
  { id: "wc-e1", nom: "WC Etape 1", zone: "Etape 1", equip: "wc" },
  { id: "pb-e1", nom: "Poubelles Etape 1", zone: "Etape 1", equip: "poubelle" },
  { id: "Uri-e1", nom: "Urinoir Etape 1", zone: "Etape 1", equip: "urinoir" },
  { id: "lm-e1", nom: "Lave-mains Etape 1", zone: "Etape 1", equip: "lave-mains" },
  { id: "wc-e2", nom: "WC Etape 2", zone: "Etape 2", equip: "wc" },
  { id: "pb-e2", nom: "Poubelles Etape 2, zone: "Etape 2", equip: "poubelle" },
  { id: "Uri-e2", nom: "Urinoir Etape 2", zone: "Etape 2", equip: "urinoir" },
  { id: "lm-e2", nom: "Lave-mains Etape 2", zone: "Etape 2", equip: "lave-mains" },
  { id: "wc-e3", nom: "WC Etape 3", zone: "Etape 3", equip: "wc" },
  { id: "pb-e3", nom: "Poubelles Etape 3", zone: "Etape 3", equip: "poubelle" },
  { id: "Uri-e3", nom: "Urinoir Etape 3", zone: "Etape 3", equip: "urinoir" },
  { id: "lm-e3", nom: "Lave-mains Etape 3", zone: "Etape 3", equip: "lave-mains" },
  { id: "lm-food", nom: "Lave-mains Foodtrucks", zone: "Site festival", equip: "lave-mains" },
  { id: "pb-food", nom: "Poubelles Foodtrucks", zone: "Site festival", equip: "poubelle" },
  { id: "pb-park", nom: "Poubelles Parking", zone: "Parking", equip: "poubelle" },
];

export const TYPES_SIGNALEMENT = [
  { id: "papier", label: "Plus de papier toilette", equip: ["wc"] },
  { id: "eau", label: "Lave-mains sans eau / savon", equip: ["lave-mains"] },
  { id: "poubelle", label: "Poubelle qui deborde", equip: ["poubelle", "wc"] },
  { id: "bouche", label: "WC bouche / hors service", equip: ["wc"] },
  { id: "proprete", label: "Proprete a revoir", equip: ["wc", "lave-mains","urinoir"] },
  { id: "autre", label: "Autre probleme", equip: ["wc", "lave-mains", "urinoir", "poubelle"] },
];

export const KEY_SANITAIRE = "bfmf2026-sanitaire";
