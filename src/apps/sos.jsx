import React, { useState } from "react";
import { AlertTriangle, MapPin, Phone, User, Send } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

const KEY_SOS_PART = "bfmf2026-sos-participants";

const POINTS_GPS = {
  "Site grande scène": { km: 0, segment: "Plaine centrale — Grande Scène" },
  "Site petite scène": { km: 0, segment: "Plaine centrale — Petite Scène" },
  "Site plaine": { km: 0, segment: "Zone Public / Pelouse" },
  "Point 0": { km: 0, segment: "Secteur Départ" },
  "Etape 1": { km: 0.9, segment: "Ravitaillement 1" },
  "Etape 2": { km: 2.53, segment: "Ravitaillement 2" },
  "Etape 3": { km: 5.06, segment: "Ravitaillement 3" },
};

export default function ModuleSosParticipant() {
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [motif, setMotif] = useState("Problème Médical / Blessure");
  const [lieu, setLieu] = useState("Site grande scène");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const d = new Date();
    const heureFmt = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    
    const mappingGeoloc = POINTS_GPS[lieu] || { km: 0, segment: "Zone Inconnue" };

    try {
      // 1. Récupération des SOS en cours
      const rGet = await fetch(`${SUPABASE_URL}/rest/v1/app_store?key=eq.${encodeURIComponent(KEY_SOS_PART)}&select=value`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      });
      
      let currentList = [];
      if (rGet.ok) {
        const json = await rGet.json();
        if (json.length && Array.isArray(json[0].value)) {
          currentList = json[0].value;
        }
      }

      // 2. Formatage strict de l'objet pour la console QG et l'Équipe Volante
      const nouveauSos = {
        id: "part-" + Date.now(),
        heure: heureFmt,
        nom: nom.trim() || "Anonyme",
        tel: tel.trim() || "Non renseigné",
        motif: motif,
        details: details.trim(),
        statut: "nouveau", // Strictement en minuscules
        surTrace: {
          km: mappingGeoloc.km,
          segment: mappingGeoloc.segment
        }
      };

      const updatedList = [nouveauSos, ...currentList];

      // 3. Mutation
      const rSet = await fetch(`${SUPABASE_URL}/rest/v1/app_store`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          key: KEY_SOS_PART,
          value: updatedList,
          updated_at: new Date().toISOString()
        })
      });

      if (rSet.ok) {
        setSuccess(true);
        setDetails("");
      }
    } catch (err) {
      console.error("Erreur émission SOS:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111622] rounded-2xl border border-red-500/30 p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide uppercase font-mono">Bucolique · Signalement Secours</h1>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Liaison directe cryptée PC de Sécurité</p>
          </div>
        </div>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center space-y-2">
            <p className="text-xs font-bold text-emerald-400 font-mono">⚠️ SIGNAL TRANSMIS AU QG</p>
            <p className="text-[11px] text-slate-300 leading-relaxed">Les secours et les équipes mobiles radio-guidées ont reçu votre position. Restez sur place.</p>
            <button onClick={() => setSuccess(false)} className="mt-2 text-xxs text-slate-400 underline font-mono">Émettre une autre alerte</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-mono text-[11px] flex items-center gap-1"><User className="w-3 h-3" /> Nom ou Dossard</label>
              <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Jean Dupont" required />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-mono text-[11px] flex items-center gap-1"><Phone className="w-3 h-3" /> Numéro de téléphone</label>
              <input type="tel" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="Ex: 0475..." required />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-mono text-[11px] flex items-center gap-1">Nature de la détresse</label>
              <select className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none" value={motif} onChange={(e) => setMotif(e.target.value)}>
                <option value="Problème Médical / Blessure">Médical / Traumatisme / Malaise</option>
                <option value="Agression / Sûreté">Sûreté / Comportement Dangereux</option>
                <option value="Départ de feu / Risque technique">Départ de feu / Fumée suspecte</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-mono text-[11px] flex items-center gap-1"><MapPin className="w-3 h-3" /> Localisation estimée</label>
              <select className="w-full bg-[#1b2234] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none" value={lieu} onChange={(e) => setLieu(e.target.value)}>
                {Object.keys(POINTS_GPS).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-mono text-[11px]">Précisions / Symptômes / Environnement</label>
              <textarea rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none font-mono text-[11px]" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Ex: Inconscient, saigne à la jambe gauche..." required />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-500 font-bold py-3 rounded-xl text-white font-mono shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
              <Send className="w-4 h-4" /> {loading ? "TRANSMISSION..." : "DECLENCHER SECOURS (SOS)"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}