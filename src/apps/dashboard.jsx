{/* SUIVI MÉTÉO IRM DÉTAILLÉ ET SÉCURISÉ */}
<section className="bg-[#151b23] rounded-lg p-4 ring-1 ring-white/10">
<div className="flex items-center justify-between mb-3">
  <h2 className="font-display tracking-wide text-sm text-slate-200 flex items-center gap-2">
    <CloudLightning className="w-4 h-4 text-slate-500" /> METEO IRM
  </h2>
  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ring-1 ${mc.ring} ${mc.bg} ${mc.text}`}>
    {mc.label}
  </span>
</div>
<div className="space-y-2">
  {METEO.timeline && METEO.timeline.map((t, i) => {
    const tc = CODE_METEO[t.code] || CODE_METEO[t.color] || CODE_METEO["vert"];
    
    // Sécurité d'extraction pour éviter l'affichage de la clé brute "phenomene"
    const intitulePhenomene = t.label || t.title || t.texte || t.phenomene || "Vigilance météo";
    const dateValidite = t.creneau || t.periode || t.validite || "Horaire en cours";

    return (
      <a 
        key={i} 
        href="https://www.meteo.be/fr/ferrieres" 
        target="_blank" 
        rel="noreferrer" 
        className="flex items-center justify-between text-xs rounded bg-white/[0.02] border border-white/5 p-2.5 hover:bg-white/[0.06] transition-all group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-2 h-2 rounded-full ${tc.dot} shrink-0`} />
          <span className="text-slate-100 font-medium group-hover:text-amber-300 truncate">
            {intitulePhenomene}
          </span>
          <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-amber-400 shrink-0" />
        </div>
        <span className="text-slate-500 font-mono text-[10px] shrink-0 ml-2">
          {dateValidite}
        </span>
      </a>
    );
  })}
</div>
</section>