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
  "QG / PCE",

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


/* --------------------------- MISSIONS LOGISTIQUES ---------------------------
   Priorites et statuts partages entre l'app Logistique (saisie et traitement),
   le Dashboard QG (injection de mission) et le PC-Ops (consolidation).
   Chaque valeur est une CHAINE EXACTE stockee en base : ne la modifier ici
   qu'en connaissance de cause (les missions deja enregistrees gardent
   l'ancienne valeur). "libelle" sert a l'affichage, "court" au badge.
--------------------------------------------------------------------------- */

export const PRIORITES = {
  "P1 - immediat / critique": {
    rang: 1, court: "P1", libelle: "P1 — Immédiat / critique",
    dot: "bg-red-400", text: "text-red-300", ring: "ring-red-400/30", bg: "bg-red-400/10",
    badge: "bg-red-500/20 text-red-400 border border-red-500/20",
  },
  "P2 - urgent": {
    rang: 2, court: "P2", libelle: "P2 — Urgent",
    dot: "bg-amber-400", text: "text-amber-300", ring: "ring-amber-400/30", bg: "bg-amber-400/10",
    badge: "bg-amber-500/20 text-amber-400 border border-amber-500/20",
  },
  "P3 - important non bloquant": {
    rang: 3, court: "P3", libelle: "P3 — Important non bloquant",
    dot: "bg-sky-400", text: "text-sky-300", ring: "ring-sky-400/30", bg: "bg-sky-400/10",
    badge: "bg-sky-500/20 text-sky-400 border border-sky-500/20",
  },
  "P4 - amelioration / des que possible": {
    rang: 4, court: "P4", libelle: "P4 — Amélioration / dès que possible",
    dot: "bg-emerald-400", text: "text-emerald-300", ring: "ring-emerald-400/30", bg: "bg-emerald-400/10",
    badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
  },
};

export const PRIORITE_DEFAUT = "P3 - important non bloquant";

export const STATUTS = ["A traiter", "Attribuee", "En cours", "Resolue"];
export const STATUT_INITIAL = "A traiter";     // toute mission creee, quelle que soit l'app
export const STATUT_ATTRIBUEE = "Attribuee";
export const STATUT_EN_COURS = "En cours";
export const STATUT_RESOLU = "Resolue";

// Retourne toujours un objet exploitable, meme pour une valeur inconnue
// (mission ancienne ou saisie hors app) -> jamais de plantage ni de style vide.
export function priorite(p) {
  return PRIORITES[p] || PRIORITES[PRIORITE_DEFAUT];
}
// P1/P2 = a traiter tout de suite (utilise par le PC-Ops et le dashboard)
export function estUrgente(p) {
  return priorite(p).rang <= 2;
}