import React, { useState, useEffect } from "react";
import {
  LifeBuoy, PhoneCall, MapPin, ChevronUp, ChevronDown, ExternalLink,
  TriangleAlert, Flame, HeartPulse, UserSearch, CloudLightning, Footprints,
  Send, Check, X,
} from "lucide-react";
import { ANNUAIRE, PRV, QUE_FAIRE, REGLE_OR } from "./referentiels";
import { envoyer as envoyerAvecFile } from "./file-attente";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

/* ------------------------------------------------------------------
   BANDEAU URGENCE — composant partage, affiche en bas des apps terrain.
   Replie par defaut (discret), depliable en un tap.
   Ordre voulu : NUMEROS -> QUE FAIRE SI -> PRV. (Pas de plan radio :
   les equipes l'ont sur leur poste, il encombrait pour rien.)
   Source unique : referentiels.js — aucune donnee en dur ici, donc
   aucune divergence possible avec la fiche reflexe.
   Lecture seule : aucune navigation vers le reste de la plateforme.
------------------------------------------------------------------ */

// Les conduites portent leur icone en CHAINE dans le referentiel.
const ICONES = { TriangleAlert, Flame, HeartPulse, UserSearch, CloudLightning, Footprints, LifeBuoy };

// Liste commune des interventions : ce SOS terrain alimente le Moniteur
// securite du QG (et de la le bilan PC-Ops), exactement comme l'alerte balade.
const KEY_INTERVENTIONS = "bfmf2026-sos-participants";
const PROFILE_KEY = "bfmf2026-profil";

// Motifs proposes a une equipe de poste fixe (parking, sanitaire, bar, entrees).
const MOTIFS_TERRAIN = [
  "Malaise / blessure",
  "Bagarre / tension",
  "Personne perdue",
  "Foule / mouvement dangereux",
  "Besoin de renfort",
  "Autre",
];

async function lireProfil() {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(PROFILE_KEY)}&select=value`,
      {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        credentials: "omit",
      }
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j.length ? j[0].value : null;
  } catch (e) { return null; }
}

export default function BandeauUrgence() {
  const [ouvert, setOuvert] = useState(false);
  const [situation, setSituation] = useState(null); // id de la conduite depliee

  // L'app balade COMPLETE a son PROPRE systeme d'alerte (dans son header) :
  // on masque le SOS du bandeau chez elle pour ne pas le doubler. En revanche
  // la version LIGHT (accompagnateur) n'a pas son propre SOS : elle s'appuie
  // sur celui du bandeau. On distingue donc "balade" de "balade-light".
  const hashCourant = (window.location.hash || "").slice(1);
  const surBalade = hashCourant === "balade" || hashCourant.startsWith("balade/");
  const sosTerrainActif = !surBalade;

  // --- SOS terrain -------------------------------------------------------
  const [sosOuvert, setSosOuvert] = useState(false);   // panneau SOS deplie
  const [motif, setMotif] = useState(MOTIFS_TERRAIN[0]);
  const [precision, setPrecision] = useState("");
  const [envoi, setEnvoi] = useState("idle");          // idle|envoi|ok|erreur
  const [profil, setProfil] = useState(null);

  // Position GPS : COMPLEMENT, jamais un prerequis. Captee en tache de fond
  // des l'ouverture du panneau. Si elle echoue, le SOS part quand meme.
  const [gps, setGps] = useState(null);
  const [etatGps, setEtatGps] = useState("recherche"); // recherche|ok|refus|indispo

  useEffect(() => {
    if (sosOuvert && !profil) lireProfil().then(setProfil);
  }, [sosOuvert, profil]);

  useEffect(() => {
    if (!sosOuvert) return;
    if (!navigator.geolocation) { setEtatGps("indispo"); return; }
    let annule = false;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (annule) return;
        setGps({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          precision: Math.round(pos.coords.accuracy || 0),
        });
        setEtatGps("ok");
      },
      () => { if (!annule) setEtatGps("refus"); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
    return () => { annule = true; navigator.geolocation.clearWatch(id); };
  }, [sosOuvert]);

  async function envoyerSos() {
    setEnvoi("envoi");
    const nom = profil && profil.nom ? profil.nom : "Équipe terrain";
    const role = profil && profil.role ? profil.role : "";
    const intervention = {
      id: "ter-" + Date.now(),
      heure: new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" }),
      nom: role ? `${nom} (${role})` : nom,
      motif,
      details: precision.trim(),
      gps: gps || null,
      statut: "nouveau",
      source: "SOS terrain",
    };
    try {
      await envoyerAvecFile(KEY_INTERVENTIONS, intervention, "ajout-liste");
      setEnvoi("ok");
      setPrecision("");
      setTimeout(() => { setEnvoi("idle"); setSosOuvert(false); }, 2500);
    } catch (e) {
      // La file d'attente rejoue au retour du reseau : le SOS n'est pas perdu.
      setEnvoi("erreur");
      setTimeout(() => setEnvoi("idle"), 4000);
    }
  }

  return (
    <>
      {/* Bouton SOS flottant, en haut à droite — visible immédiatement,
          comme le SOS du header de l'app balade. Absent sur la balade
          (qui a son propre système d'alerte). top-16 laisse la place au
          bandeau de crise quand il s'affiche en haut. */}
      {sosTerrainActif && !sosOuvert && (
        <button
          onClick={() => setSosOuvert(true)}
          className="fixed top-16 right-3 z-[55] flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-2 rounded-xl ring-2 ring-red-400/60 bg-red-500/25 text-red-100 shadow-2xl active:bg-red-500/40"
          title="Prévenir le QG"
        >
          <TriangleAlert className="w-4 h-4" /> SOS
        </button>
      )}

      {/* Panneau SOS en overlay centré (déclenché depuis le bouton flottant) */}
      {sosTerrainActif && sosOuvert && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/60" onClick={() => { setSosOuvert(false); setEnvoi("idle"); }}>
          <div className="w-full max-w-sm rounded-xl ring-1 ring-red-500/50 bg-[#141a22] shadow-2xl p-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Garde absolue : l'app ne remplace jamais le 112 */}
            <a
              href="tel:112"
              className="flex items-center justify-center gap-2 rounded-lg py-3 mb-3 ring-2 ring-red-500/60 bg-red-500/20 active:bg-red-500/35 font-bold text-red-100"
            >
              <PhoneCall className="w-5 h-5" /> URGENCE VITALE → APPELER LE 112
            </a>
            <div className="text-[10px] text-slate-400 leading-snug mb-3 text-center">
              Le bouton ci-dessous <span className="text-slate-200">prévient le QG</span> pour qu'il
              coordonne et engage la volante. Il ne remplace pas le 112 : en cas de danger vital,
              téléphonez d'abord.
            </div>

            {envoi === "ok" ? (
              <div className="flex items-center justify-center gap-2 py-4 text-emerald-300 font-semibold">
                <Check className="w-5 h-5" /> Le QG est prévenu.
              </div>
            ) : (
              <>
                {/* Etat de la position GPS : dire la verite, ne jamais laisser
                    croire qu'une position est partie si ce n'est pas le cas. */}
                <div className={`rounded px-2 py-1.5 mb-2.5 text-[10px] leading-snug ring-1 ${
                  etatGps === "ok" ? "ring-emerald-400/30 bg-emerald-400/[0.07] text-emerald-100"
                    : etatGps === "recherche" ? "ring-white/10 bg-white/[0.03] text-slate-400"
                    : "ring-amber-400/30 bg-amber-400/[0.07] text-amber-100"
                }`}>
                  {etatGps === "ok" && <>Position GPS captée — elle sera transmise au QG{gps && gps.precision ? ` (précision ~${gps.precision} m)` : ""}.</>}
                  {etatGps === "recherche" && <>Recherche de la position GPS… l'envoi reste possible tout de suite.</>}
                  {(etatGps === "refus" || etatGps === "indispo") && <>Pas de position GPS — précisez bien le lieu ci-dessous.</>}
                </div>

                <div className="text-[10px] font-mono uppercase tracking-wider text-red-300/80 mb-1.5">
                  Prévenir le QG — motif
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                  {MOTIFS_TERRAIN.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMotif(m)}
                      className={`text-[11px] rounded px-2 py-2 ring-1 text-left transition-colors ${
                        motif === m
                          ? "ring-red-400/60 bg-red-500/20 text-red-100 font-semibold"
                          : "ring-white/10 bg-white/[0.02] text-slate-300 active:bg-white/[0.06]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  value={precision}
                  onChange={(e) => setPrecision(e.target.value)}
                  placeholder="Où exactement, combien de personnes…"
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-2 text-xs text-white mb-2.5 placeholder:text-slate-600"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSosOuvert(false); setEnvoi("idle"); }}
                    className="px-3 py-2.5 rounded ring-1 ring-white/15 text-slate-400 text-xs active:bg-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={envoyerSos}
                    disabled={envoi === "envoi"}
                    className="flex-1 flex items-center justify-center gap-2 rounded py-2.5 ring-2 ring-red-400/70 bg-red-500/25 text-red-100 font-mono text-xs font-bold active:bg-red-500/40 disabled:opacity-50"
                  >
                    {envoi === "envoi" ? "ENVOI…" : <><Send className="w-4 h-4" /> PRÉVENIR LE QG</>}
                  </button>
                </div>
                {envoi === "erreur" && (
                  <div className="text-[10px] text-amber-300 mt-2 text-center leading-snug">
                    Réseau indisponible — le message est en file d'attente et partira au retour du réseau.
                    Pour une urgence vitale, appelez le 112.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

    <div className="sticky bottom-0 left-0 right-0 z-40 pointer-events-none">
      {/* pl-16 sur mobile : laisse la place au bouton menu (bas a gauche) */}
      <div className="max-w-3xl mx-auto pl-16 pr-2 md:px-2 pb-2 pointer-events-auto">
        {ouvert && (
          <div className="rounded-t-xl ring-1 ring-red-500/40 bg-[#141a22] shadow-2xl max-h-[70vh] overflow-y-auto">
            <div className="p-3 space-y-3">

              {/* 1. NUMEROS ------------------------------------------------ */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-red-300/80 mb-1.5 flex items-center gap-1.5">
                  <PhoneCall className="w-3 h-3" /> Numéros d'urgence
                </div>
                <div className="space-y-1">
                  {ANNUAIRE.map((c) => (
                    <a
                      key={c.num}
                      href={`tel:${c.num.replace(/\s/g, "")}`}
                      className={`flex items-center gap-2 rounded px-2.5 py-2 ring-1 transition-colors ${
                        c.urgent
                          ? "ring-red-500/40 bg-red-500/10 active:bg-red-500/20"
                          : "ring-white/10 bg-white/[0.02] active:bg-white/[0.06]"
                      }`}
                    >
                      <PhoneCall className={`w-3.5 h-3.5 shrink-0 ${c.urgent ? "text-red-300" : "text-slate-400"}`} />
                      <span className={`flex-1 text-xs ${c.urgent ? "text-red-100 font-semibold" : "text-slate-200"}`}>
                        {c.nom}{c.note ? <span className="text-slate-500 font-normal"> · {c.note}</span> : ""}
                      </span>
                      <span className={`font-mono text-sm ${c.urgent ? "text-red-200" : "text-slate-300"}`}>{c.num}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* 2. QUE FAIRE SI ------------------------------------------- */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300/80 mb-1.5 flex items-center gap-1.5">
                  <TriangleAlert className="w-3 h-3" /> Que faire si...
                </div>
                <div className="space-y-1">
                  {QUE_FAIRE.map((c) => {
                    const Ic = ICONES[c.icone] || LifeBuoy;
                    const depliee = situation === c.id;
                    return (
                      <div key={c.id} className="rounded ring-1 ring-white/10 bg-white/[0.02] overflow-hidden">
                        <button
                          onClick={() => setSituation(depliee ? null : c.id)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 text-left active:bg-white/[0.06]"
                        >
                          <Ic className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                          <span className="flex-1 text-xs text-slate-100">{c.titre}</span>
                          {depliee
                            ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                            : <ChevronUp className="w-3.5 h-3.5 text-slate-500 rotate-180" />}
                        </button>
                        {depliee && (
                          <ol className="px-3 pb-2.5 pt-0.5 space-y-1.5">
                            {c.etapes.map((e, i) => (
                              <li key={i} className="flex gap-2 text-[11px] text-slate-300 leading-snug">
                                <span className="font-mono text-amber-400/80 shrink-0">{i + 1}.</span>
                                <span>{e}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. PRV ---------------------------------------------------- */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300/80 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Points de rendez-vous secours
                </div>
                <div className="space-y-1">
                  {PRV.map((p) => (
                    <a
                      key={p.nom}
                      href={`https://www.google.com/maps?q=${p.gps.replace(/\s/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded px-2 py-1.5 ring-1 ring-white/10 bg-white/[0.02] active:bg-white/[0.06]"
                    >
                      <MapPin className="w-3 h-3 shrink-0 text-emerald-300" />
                      <span className="flex-1 text-[11px] text-slate-200 leading-tight">{p.nom}</span>
                      <span className="font-mono text-[10px] text-sky-300 flex items-center gap-0.5">
                        {p.gps} <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="text-[9px] font-mono text-slate-600 text-center leading-relaxed pt-1">
                {REGLE_OR}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setOuvert((v) => !v)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 font-mono text-xs font-bold tracking-wider shadow-2xl transition-colors ${
            ouvert
              ? "rounded-b-xl ring-1 ring-red-500/40 bg-red-500/20 text-red-100"
              : "rounded-xl ring-1 ring-red-500/50 bg-red-500/15 text-red-200 active:bg-red-500/25"
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          {ouvert ? "FERMER" : "URGENCE — NUMÉROS · QUE FAIRE · PRV"}
          {ouvert ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </div>
    </>
  );
}