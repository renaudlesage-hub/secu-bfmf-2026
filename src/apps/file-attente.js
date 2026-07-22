import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/* ------------------------------------------------------------------
   FILE D'ATTENTE HORS LIGNE — BFMF 2026
   Le parcours traverse des zones sans 4G (vallees). Sans filet, un SOS
   ou une alerte emis a ce moment-la est simplement PERDU.

   Principe : si l'envoi echoue (reseau), le message est stocke sur
   l'appareil et rejoue automatiquement des le retour du reseau.

   REGLE DE SECURITE ABSOLUE : un message en attente n'est PAS transmis.
   L'interface doit le dire clairement et renvoyer vers le 112 / la radio.
   On ne rassure jamais a tort quelqu'un qui attend des secours.
------------------------------------------------------------------ */

const FILE_KEY = "bfmf2026-file-attente";
const MAX_FILE = 50;          // garde-fou : evite de saturer le stockage
const INTERVALLE_REJEU = 15000; // 15 s entre deux tentatives

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

/* ------------------------- Stockage local ------------------------- */

function lireFile() {
  try {
    const brut = JSON.parse(localStorage.getItem(FILE_KEY) || "[]");
    return Array.isArray(brut) ? brut : []; // blindage anti-corruption
  } catch (e) {
    return [];
  }
}

function ecrireFile(liste) {
  try {
    localStorage.setItem(FILE_KEY, JSON.stringify(liste.slice(0, MAX_FILE)));
    return true;
  } catch (e) {
    return false; // stockage plein ou navigation privee
  }
}

/** Nombre de messages encore non transmis. */
export function nbEnAttente() {
  return lireFile().length;
}

/** Le navigateur se croit-il en ligne ? (indicatif, pas une garantie) */
export function estEnLigne() {
  try {
    return navigator.onLine !== false;
  } catch (e) {
    return true;
  }
}

/* --------------------------- Envoi direct -------------------------- */

async function kvGet(key) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: SB_HEADERS, credentials: "omit" }
  );
  if (!r.ok) throw new Error("GET " + r.status);
  const j = await r.json();
  return j.length ? j[0].value : null;
}

async function kvSet(key, value) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_store`, {
    method: "POST",
    headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates" },
    credentials: "omit",
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error("POST " + r.status);
  return true;
}

/**
 * Execute reellement une entree de file.
 * - type "ajout-liste" : relit la liste distante et y prepend l'element
 *   (evite d'ecraser ce que d'autres ont ecrit entre-temps)
 * - type "ecriture"    : ecrit la valeur telle quelle
 */
async function executer(entree) {
  if (entree.type === "ajout-liste") {
    const brut = await kvGet(entree.key);
    const liste = Array.isArray(brut) ? brut : [];
    // Anti-doublon : si l'id est deja distant, l'envoi avait reussi.
    if (entree.payload?.id && liste.some((x) => x && x.id === entree.payload.id)) {
      return true;
    }
    return await kvSet(entree.key, [entree.payload, ...liste].slice(0, 100));
  }
  return await kvSet(entree.key, entree.payload);
}

/* ----------------------- API principale ---------------------------- */

/**
 * Tente d'envoyer immediatement. En cas d'echec, met en file d'attente.
 * @returns {"transmis"|"en_attente"|"perdu"}
 *   "transmis"    : ecrit cote serveur, c'est bon
 *   "en_attente"  : stocke localement, sera rejoue -- PAS transmis
 *   "perdu"       : impossible meme de stocker (dire d'appeler le 112)
 */
export async function envoyer(key, payload, type = "ajout-liste") {
  const entree = {
    idFile: "f" + Date.now() + Math.random().toString(36).slice(2, 6),
    key,
    payload,
    type,
    heure: new Date().toISOString(),
    tentatives: 0,
  };
  try {
    await executer(entree);
    return "transmis";
  } catch (e) {
    const file = lireFile();
    file.push(entree);
    return ecrireFile(file) ? "en_attente" : "perdu";
  }
}

/**
 * Rejoue la file. A appeler au retour du reseau ou periodiquement.
 * @returns {{restants:number, transmis:number}}
 */
export async function rejouerFile() {
  const file = lireFile();
  if (file.length === 0) return { restants: 0, transmis: 0 };

  const restants = [];
  let transmis = 0;

  for (const entree of file) {
    try {
      await executer(entree);
      transmis++;
    } catch (e) {
      entree.tentatives = (entree.tentatives || 0) + 1;
      restants.push(entree); // on garde : jamais de message jete en silence
    }
  }
  ecrireFile(restants);
  return { restants: restants.length, transmis };
}

/**
 * Démarre la surveillance : rejeu au retour du reseau + toutes les 15 s.
 * @param {(etat:{enAttente:number, enLigne:boolean}) => void} onChange
 * @returns {() => void} fonction d'arret (a appeler au demontage)
 */
export function demarrerRejeu(onChange) {
  let actif = true;

  const notifier = () => {
    if (actif && typeof onChange === "function") {
      onChange({ enAttente: nbEnAttente(), enLigne: estEnLigne() });
    }
  };

  const tenter = async () => {
    if (!actif) return;
    if (nbEnAttente() > 0 && estEnLigne()) {
      await rejouerFile();
    }
    notifier();
  };

  const timer = setInterval(tenter, INTERVALLE_REJEU);
  window.addEventListener("online", tenter);
  window.addEventListener("offline", notifier);
  notifier();

  return () => {
    actif = false;
    clearInterval(timer);
    window.removeEventListener("online", tenter);
    window.removeEventListener("offline", notifier);
  };
}
