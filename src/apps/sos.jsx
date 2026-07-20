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
const TRACE = [
[50.38212,5.61679,0],
[50.38205,5.61689,10],
[50.38191,5.61716,35],
[50.38159,5.61791,99],
[50.38123,5.61882,175],
[50.38117,5.61913,198],
[50.38117,5.61961,232],
[50.38109,5.61998,259],
[50.38101,5.62083,320],
[50.38079,5.62146,371],
[50.38066,5.62192,407],
[50.38051,5.62226,436],
[50.38032,5.62253,465],
[50.38022,5.62277,485],
[50.38011,5.62314,514],
[50.37999,5.62340,537],
[50.37982,5.62396,581],
[50.37947,5.62467,644],
[50.37905,5.62567,729],
[50.37863,5.62667,814],
[50.37821,5.62767,899],
[50.37806,5.62798,927],
[50.37787,5.62831,958],
[50.37772,5.62866,988],
[50.37755,5.62915,1028],
[50.37749,5.62956,1057],
[50.37747,5.62986,1079],
[50.37757,5.63081,1147],
[50.37772,5.63158,1204],
[50.37776,5.63190,1227],
[50.37772,5.63248,1269],
[50.37774,5.63331,1328],
[50.37770,5.63350,1342],
[50.37759,5.63374,1363],
[50.37755,5.63402,1383],
[50.37754,5.63457,1422],
[50.37748,5.63483,1442],
[50.37729,5.63526,1479],
[50.37708,5.63562,1513],
[50.37694,5.63579,1533],
[50.37691,5.63591,1542],
[50.37689,5.63612,1557],
[50.37690,5.63632,1572],
[50.37699,5.63718,1633],
[50.37699,5.63745,1652],
[50.37697,5.63767,1668],
[50.37693,5.63782,1680],
[50.37688,5.63790,1688],
[50.37672,5.63807,1709],
[50.37662,5.63827,1727],
[50.37670,5.63826,1736],
[50.37661,5.63838,1749],
[50.37656,5.63849,1759],
[50.37652,5.63864,1770],
[50.37648,5.63901,1797],
[50.37648,5.64009,1874],
[50.37651,5.64026,1886],
[50.37678,5.64080,1935],
[50.37685,5.64103,1953],
[50.37683,5.64120,1965],
[50.37675,5.64131,1977],
[50.37670,5.64151,1992],
[50.37669,5.64169,2005],
[50.37673,5.64192,2022],
[50.37671,5.64266,2074],
[50.37686,5.64357,2141],
[50.37690,5.64368,2150],
[50.37690,5.64376,2156],
[50.37689,5.64377,2157],
[50.37688,5.64382,2161],
[50.37685,5.64383,2164],
[50.37641,5.64380,2213],
[50.37628,5.64382,2228],
[50.37600,5.64395,2260],
[50.37597,5.64407,2269],
[50.37599,5.64418,2277],
[50.37601,5.64419,2280],
[50.37632,5.64431,2315],
[50.37709,5.64457,2403],
[50.37749,5.64477,2449],
[50.37820,5.64496,2530],
[50.37873,5.64513,2590],
[50.37927,5.64524,2650],
[50.37987,5.64534,2717],
[50.38041,5.64541,2777],
[50.38094,5.64548,2837],
[50.38120,5.64549,2866],
[50.38159,5.64558,2910],
[50.38237,5.64581,2998],
[50.38233,5.64592,3007],
[50.38278,5.64633,3065],
[50.38356,5.64690,3160],
[50.38391,5.64727,3207],
[50.38397,5.64708,3222],
[50.38383,5.64683,3246],
[50.38373,5.64661,3265],
[50.38367,5.64627,3290],
[50.38369,5.64595,3313],
[50.38377,5.64572,3331],
[50.38403,5.64555,3363],
[50.38413,5.64551,3374],
[50.38424,5.64551,3386],
[50.38443,5.64563,3409],
[50.38457,5.64574,3427],
[50.38509,5.64637,3500],
[50.38537,5.64630,3531],
[50.38564,5.64632,3561],
[50.38579,5.64625,3579],
[50.38592,5.64613,3595],
[50.38601,5.64602,3608],
[50.38622,5.64566,3643],
[50.38623,5.64564,3645],
[50.38638,5.64534,3672],
[50.38650,5.64497,3701],
[50.38664,5.64433,3749],
[50.38671,5.64383,3785],
[50.38672,5.64363,3799],
[50.38656,5.64291,3854],
[50.38651,5.64254,3880],
[50.38635,5.64130,3970],
[50.38618,5.64006,4060],
[50.38617,5.64011,4064],
[50.38639,5.63938,4121],
[50.38660,5.63865,4178],
[50.38674,5.63824,4211],
[50.38707,5.63783,4257],
[50.38763,5.63709,4339],
[50.38820,5.63636,4421],
[50.38876,5.63562,4502],
[50.38860,5.63558,4520],
[50.38828,5.63536,4559],
[50.38815,5.63507,4584],
[50.38824,5.63486,4602],
[50.38820,5.63472,4613],
[50.38827,5.63466,4622],
[50.38835,5.63461,4631],
[50.38853,5.63438,4657],
[50.38875,5.63399,4694],
[50.38880,5.63382,4707],
[50.38878,5.63365,4720],
[50.38872,5.63341,4738],
[50.38861,5.63316,4759],
[50.38864,5.63307,4767],
[50.38864,5.63297,4774],
[50.38859,5.63269,4794],
[50.38858,5.63246,4811],
[50.38861,5.63226,4825],
[50.38861,5.63205,4840],
[50.38856,5.63187,4854],
[50.38848,5.63167,4871],
[50.38831,5.63137,4899],
[50.38831,5.63083,4938],
[50.38826,5.63027,4978],
[50.38827,5.63005,4993],
[50.38833,5.62969,5020],
[50.38844,5.62922,5055],
[50.38858,5.62836,5118],
[50.38861,5.62831,5123],
[50.38854,5.62745,5184],
[50.38854,5.62728,5196],
[50.38857,5.62712,5208],
[50.38864,5.62699,5220],
[50.38864,5.62685,5230],
[50.38926,5.62591,5326],
[50.38938,5.62561,5351],
[50.38925,5.62554,5367],
[50.38861,5.62542,5438],
[50.38822,5.62543,5482],
[50.38805,5.62537,5501],
[50.38791,5.62536,5517],
[50.38775,5.62539,5535],
[50.38760,5.62547,5552],
[50.38722,5.62577,5599],
[50.38706,5.62583,5618],
[50.38689,5.62583,5637],
[50.38681,5.62578,5646],
[50.38675,5.62571,5655],
[50.38667,5.62552,5671],
[50.38660,5.62519,5695],
[50.38655,5.62513,5702],
[50.38648,5.62517,5711],
[50.38641,5.62531,5723],
[50.38636,5.62537,5730],
[50.38624,5.62540,5744],
[50.38590,5.62530,5782],
[50.38553,5.62526,5823],
[50.38528,5.62513,5853],
[50.38513,5.62491,5876],
[50.38470,5.62396,5958],
[50.38441,5.62351,6004],
[50.38434,5.62335,6017],
[50.38427,5.62289,6051],
[50.38427,5.62290,6052],
[50.38421,5.62273,6065],
[50.38395,5.62238,6103],
[50.38365,5.62177,6158],
[50.38349,5.62156,6181],
[50.38343,5.62141,6194],
[50.38339,5.62121,6209],
[50.38325,5.62009,6290],
[50.38315,5.61934,6344],
[50.38295,5.61868,6396],
[50.38294,5.61854,6406],
[50.38297,5.61831,6422],
[50.38303,5.61806,6441],
[50.38312,5.61787,6458],
[50.38337,5.61742,6500]
];

// Reperes officiels (dossier de securite) : [nom, km sur la trace]
const REPERES = [
  { nom: "Point 0 / Depart", km: 0 },
  { nom: "Etape 1 - Rue Sainte-Barbe (PRV#4)", km: 0.90 },
  { nom: "Etape 2 - Rue de Jehonhe (PRV#5)", km: 2.53 },
  { nom: "Etape 3 - Rue de la Chapelle (PRV#7)", km: 5.06 },
  { nom: "Retour Point 0", km: 6.50 },
];

/* ------------------------------ Geometrie ------------------------------ */

function hav(la1, lo1, la2, lo2) {
  const R = 6371000, r = Math.PI / 180;
  const a =
    Math.sin(((la2 - la1) * r) / 2) ** 2 +
    Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(((lo2 - lo1) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Localise une position par rapport a la trace
function localiser(lat, lon) {
  let best = { d: Infinity, i: 0 };
  for (let i = 0; i < TRACE.length; i++) {
    const d = hav(lat, lon, TRACE[i][0], TRACE[i][1]);
    if (d < best.d) best = { d, i };
  }
  const kmTrace = TRACE[best.i][2] / 1000;
  const distTrace = Math.round(best.d);

  // Segment : entre quels reperes ?
  let avant = REPERES[0], apres = REPERES[REPERES.length - 1];
  for (let i = 0; i < REPERES.length - 1; i++) {
    if (kmTrace >= REPERES[i].km && kmTrace <= REPERES[i + 1].km) {
      avant = REPERES[i];
      apres = REPERES[i + 1];
      break;
    }
  }
  // Repere le plus proche en distance le long de la trace
  const plusProche = REPERES.reduce((a, b) =>
    Math.abs(b.km - kmTrace) < Math.abs(a.km - kmTrace) ? b : a
  );

  return { kmTrace, distTrace, avant, apres, plusProche, lat, lon };
}

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
  const [etape, setEtape] = useState("accueil"); // accueil | form | envoi | envoye | erreur
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
    try {
      const brut = await kvGet(SOS_KEY);
      const existants = Array.isArray(brut) ? brut : [];  // blindage : ignore une valeur corrompue
      const ok = await kvSet(SOS_KEY, [sos, ...existants].slice(0, 100));
      if (!ok) throw new Error();
      setSosEnvoye(sos);
      setEtape("envoye");
    } catch (e) {
      setSosEnvoye(sos);
      setEtape("erreur");
    }
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
