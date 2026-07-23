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
  "Coordination sécurité",
  "Opérateur QG",
 
  // --- Parcours / balade ---
  "Accompagnateur Balade",
  "Responsable Étape 1",
  "Adjoint Étape 1",
  "Responsable Étape 2",
  "Adjoint Étape 2",
  "Responsable Étape 3",
  "Adjoint Étape 3",
 
  // --- Site / plaine ---
  "Responsable grande scène",
  "Responsable petite scène",
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
 "PRV#4": { lat: 50.38219, lon: 5.63600, km: 0.9, segment: "Accès Étape 1 / Scène 1" },
 "Etape 1": { lat: 50.37858, lon: 5.6279, km: 0.9, segment: "Ravitaillement 1" },
 "Parcours Balade secteur B": { lat: 50.3756, lon: 5.6441, km: 1.8, segment: "Tracé Sud - Vers Étape 2" },
 "PRV#5": { lat: 50.37568, lon: 5.64412, km: 2.3, segment: "Balisage Secours #5" },
 "Etape 2": { lat: 50.37828, lon: 5.64549, km: 2.53, segment: "Ravitaillement 2" },
 "Parcours Balade secteur C": { lat: 50.3823, lon: 5.6457, km: 3.5, segment: "Tracé Est Crête" },
 "PRV#6": { lat: 50.38239, lon: 5.64584, km: 3.0, segment: "Balisage Secours #6" },
 "Etape 3": { lat: 50.38817, lon: 5.62891, km: 5.06, segment: "Ravitaillement 3" },
 "Parcours Balade secteur D": { lat: 50.3886, lon: 5.6269, km: 5.8, segment: "Secteur Nord Retour P0" },
 "PRV#7": { lat: 50.38865, lon: 5.62692, km: 5.2, segment: "Balisage Secours #7" }
};

/* ------------------------- ANNUAIRE DE CRISE -------------------------
  Source unique des contacts d'urgence. Importe par la fiche reflexe, le
  PC-Ops et l'onglet Intervention. Ordre = ordre d'appel : le vital en tete.
  >>> Mettre a jour ICI uniquement. Verifie / complete le 18/07.
--------------------------------------------------------------------- */
export const ANNUAIRE = [
 { nom: "URGENCE VITALE", num: "112", note: "médical / incendie — TOUJOURS en premier", urgent: true },
 { nom: "Police", num: "101", note: "" },
 { nom: "Directeur d'événement", num: "0477 99 48 42", note: "Jérôme Grosjean", mail: "jerome.grosjean@bucolique.be" },
 { nom: "Coordinateur sécurité", num: "0494 22 29 33", note: "Renaud Lesage", mail: "renaud.lesage@bucolique.be" },
 { nom: "Bourgmestre", num: "0477 63 81 88", note: "Ch. Verdin" },
 { nom: "Coordinatrice PlanU Ferrières", num: "086 400 90 51", note: "C. Seynaeve" },
 { nom: "Dispatching IILE/Hemeco (en intervention)", num: "04 279 13 52", note: "Hemeco" },
 { nom: "Back-up 112 (en cas de panne)", num: "0471 51 31 56", note: "" },
 { nom: "Centre antipoison", num: "070 245 245", note: "" },
];

/* ------------------- POINTS DE RENDEZ-VOUS SECOURS -------------------
  PRV verifies le 18/07. Coordonnees cliquables (Google Maps) pour guider
  les disciplines. Importe par la fiche reflexe et le PC-Ops.
--------------------------------------------------------------------- */
export const PRV = [
 { nom: "PRV#1 — Entrée site / Départ", gps: "50.38242, 5.61624", adresse: "Croisement rue Le Raumont – Chemin de l'Épine, 4190 Ferrières" },
 { nom: "PRV#2 — Entrée arrière site", gps: "50.38304, 5.61816", adresse: "Mon Legrand, 4190 Ferrières — entrée secondaire, contrôle d'accès" },
 { nom: "PRV#3 — Parking public", gps: "50.38212, 5.61673", adresse: "Rue Le Raumont, 4190 Ferrières" },
 { nom: "PRV#4 — Accès Étape 1 / Scène 1", gps: "50.38219, 5.63600", adresse: "Carrefour La Picherotte – Fosse du Loup – Rue de la Chapelle – Mon Lecomte" },
 { nom: "PRV#5 — Accès Étape 2 / Scène 2", gps: "50.37568, 5.64412", adresse: "Rue de Jehonhé 6, 4190 Burnontige" },
 { nom: "PRV#6 — Accès Étape 2 / Scène 2", gps: "50.38239, 5.64584", adresse: "Lesfanges, 4190 Burnontige" },
 { nom: "PRV#7 — Accès Étape 3 / Scène 3", gps: "50.38865, 5.62692", adresse: "Rue de la Chapelle 23, 4190 Le Trou" },
 { nom: "Étape 1 / Scène 1 (km 0,9)", gps: "50.37858, 5.62790", adresse: "Rue Sainte-Barbe, 4190 Burnontige" },
 { nom: "Étape 2 / Scène 2 (km 2,5)", gps: "50.37828, 5.64549", adresse: "Rue de Jehonhé 7, 4190 Burnontige" },
 { nom: "Étape 3 / Scène 3 (km 5,1)", gps: "50.38817, 5.62891", adresse: "Rue de la Chapelle, 4190 Ferrières" },
];

/* --------------------------- PLAN RADIO ----------------------------- */
export const RADIO_PLAN = [
 { canal: "PMR4.1", usage: "Coordination générale (QG, scènes, volante)" },
 { canal: "PMR5", usage: "Bénévoles parking et sanitaires" },
 { canal: "PMR15", usage: "Sécurité privée" },
 { canal: "PMR333", usage: "URGENCE — exclusivement réservé", urgent: true },
];


/* --------------------------- QUE FAIRE SI... ---------------------------
  Conduites a tenir, reprises de la fiche reflexe. Source unique : lues
  par la fiche reflexe ET le bandeau urgence des apps terrain.
  >>> A ajuster selon le dossier de securite / PPUI. Icone = nom lucide.
----------------------------------------------------------------------- */
export const QUE_FAIRE = [
 {
   id: "malaise", titre: "Malaise / blessure", icone: "HeartPulse",
   etapes: [
     "Proteger : ecarter le public, securiser la zone.",
     "Alerter : gravite ? -> 112 D'ABORD si doute vital. Puis PMR333 : qui, quoi, ou (PRV le plus proche), combien.",
     "Ne pas deplacer la victime sauf danger immediat.",
     "Envoyer quelqu'un au PRV pour guider les secours.",
     "Rester aupres, couvrir, parler, surveiller la conscience.",
   ],
 },
 {
   id: "enfant", titre: "Enfant perdu / trouve", icone: "UserSearch",
   etapes: [
     "Enfant TROUVE : rester avec lui, NE PAS le promener seul -> accompagner a deux vers l'ACCUEIL POINT 0. Annoncer sur PMR4.1.",
     "Enfant PERDU (parent) : conduire le parent a l'accueil, lancer la recherche dans l'app (#recherche) + PMR4.1.",
     "Description precise : age, vetements, cheveux, dernier lieu vu.",
     "Non retrouve apres 15 min ou circonstance inquietante : 112/101.",
     "Jamais de nom d'enfant diffuse en sono publique (attire les mal intentionnes) : description uniquement.",
   ],
 },
 {
   id: "feu", titre: "Debut d'incendie", icone: "Flame",
   etapes: [
     "Alerter IMMEDIATEMENT : 112 puis PMR333 (lieu exact, ampleur, vent).",
     "Eloigner le public (perimetre large), couper la sono locale si scene.",
     "Attaquer UNIQUEMENT si feu naissant + extincteur + sans risque.",
     "Liberer les acces secours (vehicules, PRV).",
     "Ne jamais rester dans la fumee.",
   ],
 },
 {
   id: "meteo", titre: "Orage / mise a l'abri", icone: "CloudLightning",
   etapes: [
     "Sur consigne QG (ou eclair < 10 s du tonnerre) : suspension des activites exposees.",
     "Plaine : diriger le public vers les batiments/chapiteaux durs designes.",
     "Parcours : groupes a l'abri (eviter arbres isoles, clotures) au point dur le plus proche, encadrants comptent leur groupe.",
     "Attendre la levee de consigne QG avant reprise.",
   ],
 },
 {
   id: "balade", titre: "Incident sur le parcours", icone: "Footprints",
   etapes: [
     "Encadrant tete : stopper le groupe en lieu sur, serre-file compte.",
     "Alerter : PMR4.1 (ou 112 si vital) avec le km / segment / PRV.",
     "Un encadrant reste avec la personne, le groupe continue avec les autres si consigne QG.",
     "Utiliser l'app Suivi balade pour ajuster effectif/position.",
   ],
 },
 {
   id: "evac", titre: "Evacuation (consigne QG uniquement)", icone: "TriangleAlert",
   etapes: [
     "Ne JAMAIS lancer une evacuation de sa propre initiative (sauf peril immediat local).",
     "Relayer calmement la consigne exacte du QG, sans crier 'evacuation'.",
     "Diriger vers les sorties/PRV designes, prioriser PMR et enfants.",
     "Benevoles aux points de passage, comptage si demande.",
     "Rendre compte au QG : zone videe / personnes restantes.",
   ],
 },
];

export const REGLE_OR = "PROTEGER -> ALERTER (112 puis PMR333 si vital) -> SECOURIR. L'app complete la radio, elle ne la remplace pas.";


/* ============ DONNEES ISSUES DE LA CARTE OFFICIELLE MyMaps ============
  Extraites du KML "Buco 2026" (calques Disciplines 1/2/3 et
  Multidisciplinaire). Ces informations sont celles que partagent les
  services de secours : ne les modifier QUE si la carte change.
  >>> Verifie et aligne sur la carte officielle le 23/07/2026.
======================================================================= */

/* --- Ressources en eau (Discipline 1 - Pompiers) --------------------
  Champ "eau" du dossier d'intervention. Distance indicative au repere
  le plus proche, pour guider une reconnaissance rapide.
-------------------------------------------------------------------- */
export const RESSOURCES_EAU = [
 { type: "Tridivision",     gps: "50.38257, 5.61757", repere: "Site — 96 m de l'entrée" },
 { type: "Bouche incendie", gps: "50.38281, 5.61920", repere: "Site — 214 m" },
 { type: "Bouche incendie", gps: "50.38385, 5.61412", repere: "Site — 219 m" },
 { type: "Bouche incendie", gps: "50.38391, 5.61419", repere: "Site — 220 m" },
 { type: "Bouche incendie", gps: "50.38388, 5.61408", repere: "Site — 223 m" },
 { type: "Bouche incendie", gps: "50.38205, 5.62006", repere: "Site — 274 m" },
 { type: "Bouche incendie", gps: "50.38214, 5.62095", repere: "Site — 336 m" },
 { type: "Bouche incendie", gps: "50.38203, 5.62149", repere: "Site — 375 m" },
 { type: "Bouche incendie", gps: "50.38093, 5.62632", repere: "Scène 1 — 283 m" },
 { type: "Bouche incendie", gps: "50.38136, 5.63157", repere: "Scène 1 — 403 m" },
 { type: "Bouche incendie", gps: "50.38161, 5.63509", repere: "Scène 1 — 610 m" },
 { type: "Bouche incendie", gps: "50.38219, 5.63582", repere: "Près du PRV#4" },
 { type: "Bouche incendie", gps: "50.37529, 5.64392", repere: "Scène 2 — 352 m" },
 { type: "Bouche incendie", gps: "50.38240, 5.64572", repere: "Scène 2 — 457 m" },
 { type: "Bouche incendie", gps: "50.38932, 5.62584", repere: "Scène 3 — 253 m" },
 { type: "Bouche incendie", gps: "50.38454, 5.62371", repere: "Scène 3 — 548 m" },
 { type: "Pompe à eau",     gps: "50.38118, 5.64877", repere: "Scène 2 — 397 m" },
 { type: "Pompe à eau",     gps: "50.38182, 5.59513", repere: "Site — 1,5 km" },
 { type: "Pompe à eau",     gps: "50.39887, 5.61386", repere: "Nord — 1,6 km" },
];

/* --- Defibrillateurs (Discipline 2 - Aide medicale urgente) ---------- */
export const DEA = [
 { nom: "DEA organisation (sur site)", gps: "50.38244, 5.61735", note: "80 m de l'entrée — le plus proche" },
 { nom: "DEA", gps: "50.37334, 5.64180", note: "2,1 km du site" },
 { nom: "DEA", gps: "50.40015, 5.60618", note: "2,1 km du site" },
 { nom: "DEA", gps: "50.36520, 5.64429", note: "2,8 km du site" },
 { nom: "DEA", gps: "50.38262, 5.67998", note: "4,5 km du site" },
];

/* --- Zones d'atterrissage helicoptere medical (CMH) ------------------
  Une zone suggeree par scene : information vitale pour une evacuation
  heliportee. Les zones "nocturnes" sont les seules utilisables de nuit.
-------------------------------------------------------------------- */
export const ZONES_HELICO = [
 { nom: "Zone suggérée — Site / entrée",  gps: "50.38348, 5.61791", nuit: false },
 { nom: "Zone suggérée — Scène 1",        gps: "50.37874, 5.62980", nuit: false },
 { nom: "Zone suggérée — Scène 2",        gps: "50.37764, 5.64536", nuit: false },
 { nom: "Zone suggérée — Scène 3",        gps: "50.38812, 5.62980", nuit: false },
 { nom: "Zone NOCTURNE — Ferrières",      gps: "50.39922, 5.60764", nuit: true },
 { nom: "Zone NOCTURNE — Izier",          gps: "50.38038, 5.58456", nuit: true },
];

/* --- Bornes kilometriques du parcours (balisage terrain) -------------
  Reperes physiques poses sur le parcours. Un participant ou un
  encadrant peut dire "je suis a la BK3" : c'est plus fiable qu'un GPS.
  Positions verifiees sur la trace : ecart max 22 m.
-------------------------------------------------------------------- */
export const BORNES_KM = [
 { nom: "BK1", km: 1.0, gps: "50.37768, 5.62877" },
 { nom: "BK2", km: 2.0, gps: "50.37670, 5.64154" },
 { nom: "BK3", km: 3.0, gps: "50.38233, 5.64580" },
 { nom: "BK4", km: 4.0, gps: "50.38631, 5.64100" },
 { nom: "BK5", km: 5.0, gps: "50.38827, 5.63010" },
 { nom: "BK6", km: 6.0, gps: "50.38451, 5.62366" },
];

/* --- Decoupage du parcours en secteurs (carte officielle) ------------ */
export const SECTEURS_PARCOURS = [
 { nom: "Secteur A", debutKm: 0.0, finKm: 0.83, note: "Départ → avant Scène 1" },
 { nom: "Secteur B", debutKm: 0.83, finKm: 2.47, note: "Scène 1 → Scène 2" },
 { nom: "Secteur C", debutKm: 2.47, finKm: 5.03, note: "Scène 2 → Scène 3" },
 { nom: "Secteur D", debutKm: 5.03, finKm: 6.50, note: "Scène 3 → retour Point 0" },
];

// Autre ressource medicale a proximite
export const CABINET_MEDICAL = {
 nom: "Cabinet médical Sneessens Nicolas",
 gps: "50.39875, 5.60932",
 note: "≈ 2 km du site — hors urgence vitale (112 en priorité)",
};

/* --- Voies d'acces secours (Multidisciplinaire) ----------------------
  Itineraire que doivent emprunter les vehicules de secours depuis le
  PRV jusqu'a la scene. La longueur explique pourquoi un PRV peut
  sembler eloigne de la scene qu'il dessert.
-------------------------------------------------------------------- */
export const VOIES_ACCES = [
 {
   nom: "Voie d'accès secours — Scène 1",
   depuis: "PRV#4", vers: "Scène 1 / Étape 1",
   longueurM: 721,
   depart: "50.38219, 5.63605", arrivee: "50.37892, 5.62807",
 },
 {
   nom: "Voie d'accès secours — Scène 2",
   depuis: "PRV#5", vers: "Scène 2 / Étape 2 (ressort au PRV#6)",
   longueurM: 752,
   depart: "50.37575, 5.64411", arrivee: "50.38240, 5.64578",
 },
 {
   nom: "Voie d'accès secours — Scène 3",
   depuis: "PRV#7", vers: "Scène 3 / Étape 3",
   longueurM: 131,
   depart: "50.38860, 5.62698", arrivee: "50.38834, 5.62851",
 },
];


/* ============ DONNEES DU DOSSIER DE SECURITE 2026 ====================
  Extraites du dossier de securite annuel (Bucolique ASBL), § 9 et 10.
  Ce sont les informations que la zone de secours demande en premier.
  >>> Toute modification du dossier doit etre reportee ICI.
======================================================================= */

/* --- Decoupage operationnel : acces, brancardage, nature des voies ----
  ATTENTION A LA LECTURE : les longueurs par type de voie sont des
  CUMULS sur l'ensemble du troncon, PAS des portions continues. Un
  troncon annonce "1250 m non carrossables" comporte plusieurs sections
  entrecoupees de chemins accessibles aux vehicules.
  -> Le seul indicateur fiable de difficulte d'acces est la DISTANCE
     MAXIMALE DE BRANCARDAGE : elle donne l'eloignement reel entre un
     point du parcours et un vehicule.
-------------------------------------------------------------------- */
export const SEGMENTS_PARCOURS = [
 {
   nom: "Départ → Étape 1",
   distanceM: 900,
   brancardageMaxM: 420,
   voies: "Chemin forestier carrossable tout-terrain (850 m)",
   arriveeNom: "Étape 1 / Scène 1",
   arriveeAdresse: "Rue Sainte-Barbe, 4190 Burnontige",
   arriveeGps: "50.37858, 5.62790",
   prv: ["PRV#4"],
 },
 {
   nom: "Étape 1 → Étape 2",
   distanceM: 1700,
   brancardageMaxM: 300,
   voies: "Forestier tout-terrain 500 m · non carrossable 600 m · carrossable 300 m · voirie 300 m",
   arriveeNom: "Étape 2 / Scène 2",
   arriveeAdresse: "Rue de Jehonhé 7, 4190 Burnontige",
   arriveeGps: "50.37828, 5.64549",
   prv: ["PRV#5", "PRV#6"],
 },
 {
   nom: "Étape 2 → Étape 3",
   distanceM: 2500,
   brancardageMaxM: 300,
   voies: "Forestier tout-terrain 250 m · non carrossable 1250 m · carrossable 1000 m",
   arriveeNom: "Étape 3 / Scène 3",
   arriveeAdresse: "Rue de la Chapelle, 4190 Ferrières",
   arriveeGps: "50.38817, 5.62891",
   prv: ["PRV#7"],
 },
 {
   nom: "Étape 3 → site principal",
   distanceM: 1600,
   brancardageMaxM: 50,
   voies: "Carrossable 200 m · voirie 1400 m",
   arriveeNom: "Site principal (entrée secondaire Mon Legrand)",
   arriveeAdresse: "Mon Legrand, 4190 Ferrières — contrôle d'accès",
   arriveeGps: "50.38304, 5.61816",
   prv: ["PRV#2"],
 },
];

/* --- Horaires de l'edition 2026 (dossier § 3) ------------------------ */
export const HORAIRES = [
 { jour: "Samedi 15/08", departs: ["13h00", "14h30", "16h00"], concerts: "17h30 → 02h00" },
 { jour: "Dimanche 16/08", departs: ["11h00", "13h00", "14h30"], concerts: "16h00 → 00h30" },
];

/* --- Fréquentation de reference (dossier § 4.1) ---------------------- */
export const FREQUENTATION = {
 groupesParJour: 3,
 personnesParGroupe: 300,
 etapeParVague: 300,
 soireeAttendue: "750 à 1200 personnes",
 capaciteMax: "À CONFIRMER par les plans, prescriptions et contrôles",
 encadrantsParGroupe: 4,
};
