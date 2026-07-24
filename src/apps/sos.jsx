import React, { useState } from "react";
import { TriangleAlert, PhoneCall, MapPin, CheckCircle2, X, LocateFixed, Footprints } from "lucide-react";

/* ---------------------------------------------------------------------
   SOS PARTICIPANTS -- Balade en harmonie, BFMF 2026 (parcours 6,5 km)
   App publique destinee aux festivaliers sur le parcours.
   Localise l'emetteur par rapport a la trace GPX officielle et transmet
   l'alerte au QG (Supabase). NE REMPLACE PAS LE 112.
--------------------------------------------------------------------- */

/* ------------------------------ Supabase ------------------------------ */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";
import { envoyer as envoyerAvecFile, demarrerRejeu } from "./file-attente";
import { localiser } from "./referentiels";
const SOS_KEY = "bfmf2026-sos-participants";

const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

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
  return r.ok;
}

/* --------------------- Trace GPX officielle (6,5 km) --------------------- */
// [lat, lon, distance cumulee en metres] -- 207 points issus du GPX

// Reperes officiels (dossier de securite) : [nom, km sur la trace]

/* ------------------------------ Geometrie ------------------------------ */


// Localise une position par rapport a la trace

function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ------------------------------ App ------------------------------ */

const MOTIFS = [
  "Urgence médicale / Malaise",
  "Personne blessée / chute",
  "Personne perdue / désorientée",
  "Sûreté / comportement dangereux",
  "Départ de feu / fumée suspecte",
  "Autre urgence",
];

// Repli SANS GPS : lieux connus -> position approximative sur le parcours
const LIEUX_MANUELS = {
  "Plaine du festival (scènes/bars)": { km: 0, segment: "Plaine centrale" },
  "Point 0 / Départ balade": { km: 0, segment: "Secteur Départ" },
  "Entre Point 0 et Étape 1": { km: 0.45, segment: "Point 0 → Étape 1" },
  "Étape 1 (Rue Sainte-Barbe)": { km: 0.9, segment: "Étape 1" },
  "Entre Étape 1 et Étape 2": { km: 1.7, segment: "Étape 1 → Étape 2" },
  "Étape 2 (Rue de Jehonhé)": { km: 2.53, segment: "Étape 2" },
  "Entre Étape 2 et Étape 3": { km: 3.8, segment: "Étape 2 → Étape 3" },
  "Étape 3 (Rue de la Chapelle)": { km: 5.06, segment: "Étape 3" },
  "Entre Étape 3 et l'arrivée": { km: 5.8, segment: "Étape 3 → Retour" },
};

export default function SosParticipants() {
  const [etape, setEtape] = useState("accueil"); // accueil | form | envoi | envoye | attente | erreur
  const [enAttente, setEnAttente] = useState(0);

  // Rejeu automatique des messages non transmis (zones sans 4G du parcours).
  // Des que le reseau revient, le SOS part tout seul et l'ecran se met a jour.
  React.useEffect(() => {
    const arreter = demarrerRejeu(({ enAttente: n }) => {
      setEnAttente(n);
      // Le message en attente vient de partir : on bascule sur l'ecran de
      // confirmation, l'utilisateur voit que c'est reellement transmis.
      if (n === 0) setEtape((e) => (e === "attente" ? "envoye" : e));
    });
    return arreter;
  }, []);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [motif, setMotif] = useState(MOTIFS[0]);
  const [details, setDetails] = useState("");
  const [loc, setLoc] = useState(null);
  const [geoStatus, setGeoStatus] = useState("");
  const [lieuManuel, setLieuManuel] = useState("");
  const [sosEnvoye, setSosEnvoye] = useState(null);
  const [suiviQG, setSuiviQG] = useState(null); // statut vu cote QG

  // Apres envoi : suivre le statut du SOS pour informer le participant
  // de la prise en compte par le poste de securite
  React.useEffect(() => {
    if (etape !== "envoye" || !sosEnvoye) return;
    let stop = false;
    async function verifier() {
      try {
        const brut = await kvGet(SOS_KEY);
        const liste = Array.isArray(brut) ? brut : [];
        const monSos = liste.find((s) => s.id === sosEnvoye.id);
        if (!stop && monSos && monSos.statut !== "nouveau") {
          setSuiviQG(monSos);
        }
      } catch (e) {
        // reseau instable : on reessaie au prochain tick
      }
    }
    verifier();
    const t = setInterval(verifier, 8000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [etape, sosEnvoye]);

  function lancerGeoloc() {
    setGeoStatus("recherche");
    if (!navigator.geolocation) {
      setGeoStatus("indisponible");
      return;
    }
    // watchPosition 20 s : on garde la MEILLEURE precision recue.
    // Indispensable sous couvert forestier ou le premier fix est lent/grossier.
    let meilleure = null;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!meilleure || pos.coords.accuracy < meilleure.coords.accuracy) {
          meilleure = pos;
          const l = localiser(pos.coords.latitude, pos.coords.longitude);
          l.precision = Math.round(pos.coords.accuracy || 0);
          setLoc(l);
          setGeoStatus("ok");
        }
      },
      (err) => {
        if (!meilleure) setGeoStatus(err.code === 1 ? "refuse" : "indisponible");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
    setTimeout(() => navigator.geolocation.clearWatch(watchId), 20000);
  }

  function demarrer() {
    setEtape("form");
    lancerGeoloc();
  }

  async function envoyer() {
    setEtape("envoi");
    const sos = {
      id: "sos" + Date.now(),
      heure: nowHM(),
      date: new Date().toISOString(),
      nom: nom.trim() || "Anonyme",
      tel: tel.trim(),
      motif,
      details: details.trim(),
      gps: loc ? { lat: loc.lat, lon: loc.lon, precision: loc.precision } : null,
      surTrace: loc
        ? {
            km: Number(loc.kmTrace.toFixed(2)),
            ecartMetres: loc.distTrace,
            segment: `${loc.avant.nom} -> ${loc.apres.nom}`,
            reperePlusProche: loc.plusProche.nom,
          }
        : lieuManuel
        ? {
            km: LIEUX_MANUELS[lieuManuel].km,
            ecartMetres: null,
            segment: LIEUX_MANUELS[lieuManuel].segment,
            reperePlusProche: lieuManuel + " (déclaré, sans GPS)",
          }
        : null,
      statut: "nouveau",
    };
    // Envoi via la file d'attente : si le reseau est absent (vallees du
    // parcours), le message est conserve et rejoue automatiquement.
    const resultat = await envoyerAvecFile(SOS_KEY, sos, "ajout-liste");
    setSosEnvoye(sos);
    if (resultat === "transmis") setEtape("envoye");
    else if (resultat === "en_attente") setEtape("attente");
    else setEtape("erreur");
  }

  return (
    <div className="min-h-screen bg-[#11151b] text-slate-100 font-sans flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Oswald', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes pulseSlow { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .pulse-slow { animation: pulseSlow 1.6s ease-in-out infinite; }
      `}</style>

      <header className="border-b border-white/10 bg-[#151b23] px-4 py-3 flex items-center gap-3">
        <Footprints className="w-5 h-5 text-amber-300" />
        <div>
          <div className="font-display tracking-wide text-sm">BALADE EN HARMONIE — SOS</div>
          <div className="text-[10px] text-slate-400 font-mono">BFMF 2026 · PARCOURS 6,5 KM</div>
        </div>
      </header>

      {/* Bandeau 112 permanent */}
      <a
        href="tel:112"
        className="bg-red-500/20 ring-1 ring-red-400/40 text-red-200 text-center text-sm font-semibold py-2.5 px-4 flex items-center justify-center gap-2"
      >
        <PhoneCall className="w-4 h-4" /> Urgence vitale ? Appelez d'abord le 112
      </a>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        {etape === "accueil" && (
          <div className="text-center w-full">
            <button
              onClick={demarrer}
              className="w-52 h-52 rounded-full ring-4 ring-red-400/60 bg-red-500/25 hover:bg-red-500/40 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 mx-auto"
            >
              <TriangleAlert className="w-14 h-14 text-red-200" />
              <span className="font-display text-3xl text-red-100 tracking-wider">SOS</span>
            </button>
            <p className="text-sm text-slate-400 mt-6 leading-relaxed">
              Appuyez pour alerter l'organisation du festival.
              <br />
              Votre position sur le parcours sera transmise au poste de securite.
            </p>
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
              Cet outil complete les secours officiels, il ne les remplace pas.
              <br />
              En cas de danger vital : <span className="text-red-300 font-semibold">112 d'abord</span>.
            </p>
          </div>
        )}

        {etape === "form" && (
          <div className="w-full space-y-4">
            {/* Localisation */}
            <div className="rounded-lg ring-1 ring-white/15 bg-[#1a212b] p-4">
              <div className="flex items-center gap-2 text-sm text-slate-200 mb-2">
                <LocateFixed className={`w-4 h-4 ${geoStatus === "recherche" ? "text-amber-300 pulse-slow" : geoStatus === "ok" ? "text-emerald-300" : "text-red-300"}`} />
                {geoStatus === "recherche" && "Localisation en cours..."}
                {geoStatus === "ok" && "Position trouvee"}
                {geoStatus === "refuse" && "Localisation refusee"}
                {geoStatus === "indisponible" && "Localisation indisponible"}
              </div>
              {loc && (
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                    <span>
                      Km <span className="font-mono text-amber-200">{loc.kmTrace.toFixed(1)}</span> du parcours, segment{" "}
                      <span className="text-slate-100">{loc.avant.nom.split(" (")[0]} → {loc.apres.nom.split(" (")[0]}</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 pl-5">
                    Repere le plus proche : {loc.plusProche.nom}
                    {loc.distTrace > 100 && (
                      <span className="text-amber-300"> · a ~{loc.distTrace} m du sentier</span>
                    )}
                    {loc.precision > 0 && <span> · precision GPS ±{loc.precision} m</span>}
                  </div>
                </div>
              )}
              {(geoStatus === "refuse" || geoStatus === "indisponible") && (
                <button onClick={lancerGeoloc} className="text-[11px] font-mono text-sky-300 underline mr-2">Reessayer la localisation</button>
              )}
              {(geoStatus === "refuse" || geoStatus === "indisponible") && (
                <div className="mt-2">
                  <div className="text-[11px] text-amber-300/90 mb-1.5">
                    Pas de GPS : indiquez où vous êtes (dernier repère passé) —
                  </div>
                  <select
                    className="w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-3 text-[16px] text-white focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                    value={lieuManuel}
                    onChange={(e) => setLieuManuel(e.target.value)}
                  >
                    <option value="">Choisissez le lieu le plus proche...</option>
                    {Object.keys(LIEUX_MANUELS).map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div>
              <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide mb-1.5">Que se passe-t-il ? *</div>
              <select
                className="w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-3 text-[16px] text-white focus:outline-none focus:ring-2 focus:ring-red-400/60"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
              >
                {MOTIFS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide mb-1.5">Precisions (situation, reperes visibles)</div>
              <textarea
                className="w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-3 text-[16px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400/60"
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Ex: personne inconsciente, on est pres du bois apres l'etape 2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide mb-1.5">Votre nom</div>
                <input
                  className="w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-3 text-[16px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400/60"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Facultatif"
                />
              </div>
              <div>
                <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wide mb-1.5">Votre GSM</div>
                <input
                  type="tel"
                  className="w-full bg-[#232b36] ring-1 ring-white/25 rounded px-3 py-3 text-[16px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400/60"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  placeholder="Pour vous rappeler"
                />
              </div>
            </div>

            <button
              onClick={envoyer}
              className="w-full py-4 rounded-lg ring-2 ring-red-400/70 bg-red-500/30 text-red-100 font-display text-xl tracking-wider hover:bg-red-500/45 active:scale-[0.98] transition-all"
            >
              ENVOYER LE SOS
            </button>
            <button onClick={() => setEtape("accueil")} className="w-full text-xs font-mono text-slate-500 hover:text-slate-300 py-1 flex items-center justify-center gap-1">
              <X className="w-3.5 h-3.5" /> Annuler
            </button>
          </div>
        )}

        {etape === "envoi" && (
          <div className="text-center">
            <TriangleAlert className="w-12 h-12 text-red-300 pulse-slow mx-auto mb-3" />
            <div className="text-sm text-slate-300">Envoi de l'alerte...</div>
          </div>
        )}

        {etape === "envoye" && sosEnvoye && (
          <div className="w-full text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-300 mx-auto" />
            <div className="font-display text-xl text-emerald-200">SOS TRANSMIS AU POSTE DE SECURITE</div>

            {suiviQG ? (
              <div className="rounded-lg ring-2 ring-emerald-400/50 bg-emerald-400/10 p-4">
                <div className="font-display text-emerald-200 text-sm tracking-wide flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> PRIS EN COMPTE PAR LE QG
                  {suiviQG.heurePriseEnCompte ? ` A ${suiviQG.heurePriseEnCompte}` : ""}
                </div>
                <div className="text-xs text-emerald-100/80 mt-1.5">
                  Le poste de securite a vu votre alerte et organise l'intervention.
                </div>
              </div>
            ) : (
              <div className="rounded-lg ring-1 ring-amber-400/30 bg-amber-400/5 p-3">
                <div className="text-xs text-amber-200/90 flex items-center justify-center gap-2">
                  <LocateFixed className="w-3.5 h-3.5 pulse-slow" />
                  En attente de prise en compte par le poste de securite...
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Cet ecran se met a jour automatiquement. Gardez-le ouvert.</div>
              </div>
            )}

            <div className="rounded-lg ring-1 ring-white/15 bg-[#1a212b] p-4 text-left text-xs text-slate-300 space-y-1">
              <div><span className="text-slate-500">Heure :</span> {sosEnvoye.heure}</div>
              <div><span className="text-slate-500">Motif :</span> {sosEnvoye.motif}</div>
              {sosEnvoye.surTrace && (
                <div><span className="text-slate-500">Position :</span> km {sosEnvoye.surTrace.km} · {sosEnvoye.surTrace.segment}</div>
              )}
            </div>
            <div className="text-sm text-slate-300 leading-relaxed">
              <span className="text-slate-100 font-semibold">Restez ou vous etes</span> si c'est sans danger.
              Rendez-vous visible. Une equipe va etre orientee vers vous.
            </div>
            <a href="tel:112" className="flex items-center justify-center gap-2 text-red-200 text-sm font-semibold py-3 rounded-lg ring-1 ring-red-400/40 bg-red-500/15">
              <PhoneCall className="w-4 h-4" /> Situation vitale ? Appelez le 112
            </a>
          </div>
        )}

        {etape === "attente" && (
          <div className="w-full text-center space-y-4">
            <TriangleAlert className="w-14 h-14 text-amber-300 mx-auto pulse-slow" />
            <div className="font-display text-xl text-amber-200">PAS DE RESEAU ICI</div>
            <div className="text-sm text-slate-100 leading-relaxed font-semibold">
              Votre message n'est PAS encore parti.
            </div>
            <div className="text-sm text-slate-300 leading-relaxed">
              Il est enregistre et sera transmis automatiquement des le retour du reseau.
              <br />
              <span className="text-red-200 font-semibold">Si c'est urgent, n'attendez pas :</span>
            </div>
            <a href="tel:112" className="flex items-center justify-center gap-2 text-red-100 text-lg font-semibold py-4 rounded-lg ring-2 ring-red-400/60 bg-red-500/25">
              <PhoneCall className="w-5 h-5" /> Appeler le 112
            </a>
            <div className="text-xs text-slate-300 leading-relaxed">
              Cherchez aussi un benevole ou remontez vers un point haut : le reseau y passe mieux.
            </div>
            {sosEnvoye && sosEnvoye.surTrace && (
              <div className="text-xs text-slate-400">
                A indiquer au telephone : km {sosEnvoye.surTrace.km} du parcours, {sosEnvoye.surTrace.segment}
              </div>
            )}
            <div className="text-[11px] font-mono text-amber-300/70">
              {enAttente > 0 ? `${enAttente} message(s) en attente d'envoi` : "Message transmis !"}
            </div>
            <button onClick={envoyer} className="text-xs font-mono text-slate-400 hover:text-slate-200 underline">
              Reessayer maintenant
            </button>
          </div>
        )}

        {etape === "erreur" && (
          <div className="w-full text-center space-y-4">
            <TriangleAlert className="w-14 h-14 text-amber-300 mx-auto" />
            <div className="font-display text-xl text-amber-200">ENVOI IMPOSSIBLE (RESEAU)</div>
            <div className="text-sm text-slate-300 leading-relaxed">
              L'alerte n'a pas pu etre transmise. <span className="text-slate-100 font-semibold">Appelez directement :</span>
            </div>
            <a href="tel:112" className="flex items-center justify-center gap-2 text-red-100 text-lg font-semibold py-4 rounded-lg ring-2 ring-red-400/60 bg-red-500/25">
              <PhoneCall className="w-5 h-5" /> 112
            </a>
            {sosEnvoye && sosEnvoye.surTrace && (
              <div className="text-xs text-slate-400">
                Indiquez au telephone : km {sosEnvoye.surTrace.km} du parcours, {sosEnvoye.surTrace.segment}
              </div>
            )}
            <button onClick={envoyer} className="text-xs font-mono text-slate-400 hover:text-slate-200 underline">
              Reessayer l'envoi
            </button>
          </div>
        )}
      </main>

      <footer className="text-center text-[10px] text-slate-600 font-mono px-4 py-3">
        Bucolique Ferrieres Musique Festival 2026 · Trace officielle 6,5 km · Cet outil ne remplace pas le 112
      </footer>
    </div>
  );
}