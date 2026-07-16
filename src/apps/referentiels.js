/* ---------------------------------------------------------------------
   REFERENTIELS PARTAGES -- BFMF 2026
   Source de verite unique, importee par les apps. Le profil utilisateur
   (cle localStorage bfmf2026-profil) est COMMUN a toutes les apps :
   la liste des roles doit donc l'etre aussi, sinon un role choisi dans
   une app n'existe pas dans une autre.
   >>> Pour ajouter un role : ici, et nulle part ailleurs.
--------------------------------------------------------------------- */

export const ROLES = [
  // --- Direction & QG ---
  "Directeur d'événement",
  "Coordination générale",
  "QG",

  // --- Parcours / balade ---
  "Encadrant tête",
  "Encadrant serre-file",
  "Encadrant",
  "Responsable Étape 1",
  "Responsable Étape 2",
  "Responsable Étape 3",

  // --- Site / plaine ---
  "Responsable scène 1",
  "Responsable scène 2",
  "Responsable bar site",
  "Responsable backstage",
  "Team parking",
  "Team sanitaires",
  "Technique",
  "Logistique",

  // --- Secours & sûreté ---
  "Volante",
  "Sécurité privée",
  "Médical / secouriste",

  "Autre",
];
