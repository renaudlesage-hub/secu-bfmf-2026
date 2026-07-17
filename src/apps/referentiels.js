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


/* ------------------------- LOCALISATIONS DU SITE -------------------------
   Points de reference partages : formulaire de demande logistique, injection
   de SOS terrain depuis le QG, etiquettes QR, pre-remplissage au scan.
   Chaque cle est une CHAINE EXACTE stockee en base (champ "zone" des
   missions). lat/lon servent au lien Maps ; km/segment situent le point sur
   le parcours de 6,5 km.
   >>> Pour ajouter ou renommer un lieu : ici, et nulle part ailleurs.
------------------------------------------------------------------------- */

export const POINTS_GPS = {
  "Site grande scène": { lat: 50.3838, lon: 5.6212, km: 0, segment: "Plaine centrale — Grande Scène" },
  "Site petite scène": { lat: 50.3832, lon: 5.6219, km: 0, segment: "Plaine centrale — Petite Scène" },
  "Site plaine": { lat: 50.3835, lon: 5.6215, km: 0, segment: "Zone Public / Pelouse" },
  "Site bar": { lat: 50.3836, lon: 5.6222, km: 0, segment: "Zone Débit de Boissons" },
  "Site foodtrucks": { lat: 50.3831, lon: 5.6208, km: 0, segment: "Allée Restauration" },
  "Site sanitaires": { lat: 50.3841, lon: 5.6211, km: 0, segment: "Blocs WC Publics" },
  "Site backstage": { lat: 50.3842, lon: 5.6201, km: 0, segment: "Coulisses / Loges" },
  "Site zone logistique": { lat: 50.3845, lon: 5.6195, km: 0, segment: "Stockage technique / Énergie" },
  "Parking public": { lat: 50.3815, lon: 5.6182, km: 0, segment: "Zone Stationnement Public" },
  "Parking artistes": { lat: 50.3848, lon: 5.6198, km: 0, segment: "Zone Accès Contrôlé Artistes" },
  "Point 0": { lat: 50.3835, lon: 5.6215, km: 0, segment: "Secteur Départ" },
  "Parcours Balade secteur A": { lat: 50.3821, lon: 5.6167, km: 0.5, segment: "Sentier départ forêt" },
  "PRV#4": { lat: 50.38212, lon: 5.61673, km: 0.5, segment: "Balisage Secours #4" },
  "Etape 1": { lat: 50.37858, lon: 5.6279, km: 0.9, segment: "Ravitaillement 1" },
  "Parcours Balade secteur B": { lat: 50.3756, lon: 5.6441, km: 1.8, segment: "Tracé Sud - Vers Étape 2" },
  "PRV#5": { lat: 50.37568, lon: 5.64412, km: 2.5, segment: "Balisage Secours #5" },
  "Etape 2": { lat: 50.37828, lon: 5.64549, km: 2.53, segment: "Ravitaillement 2" },
  "Parcours Balade secteur C": { lat: 50.3823, lon: 5.6457, km: 3.5, segment: "Tracé Est Crête" },
  "PRV#6": { lat: 50.38236, lon: 5.64579, km: 3.8, segment: "Balisage Secours #6" },
  "Etape 3": { lat: 50.38817, lon: 5.62891, km: 5.06, segment: "Ravitaillement 3" },
  "Parcours Balade secteur D": { lat: 50.3886, lon: 5.6269, km: 5.8, segment: "Secteur Nord Retour P0" },
  "PRV#7": { lat: 50.38865, lon: 5.62692, km: 5.5, segment: "Balisage Secours #7" }
};