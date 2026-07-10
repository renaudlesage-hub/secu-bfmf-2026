{/* Frise linéaire d'avancement corrigée avec projection des SOS actifs */}
<div className="relative h-14 mt-4 mb-2">
  <div className="absolute top-6 left-0 right-0 h-1 bg-white/10 rounded-full" />
  
  {/* Repères kilométriques fixes (P0, E1, E2, E3) */}
  {REPERES.map((r, i) => (
    <div key={i} className="absolute top-3" style={{ left: `calc(${(r.km / LONGUEUR_KM) * 100}% - 8px)` }}>
      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mx-auto mt-2" />
      <div className="text-[8px] font-mono text-slate-500 text-center mt-0.5">{r.nom}</div>
    </div>
  ))}
  
  {/* Vagues de marcheurs actives */}
  {grpDehors.map((g, idx) => {
    const km = POS_KM[g.position] ?? 0;
    return (
      <div key={idx} className="absolute top-0" style={{ left: `calc(${(km / LONGUEUR_KM) * 100}% - 10px)` }} title={`${g.nom} : ${g.participants} pax`}>
        <div className="flex items-center bg-sky-500/20 ring-1 ring-sky-400/50 rounded px-1 py-0.5 text-[8px] font-mono text-sky-200">
          <Users className="w-2 h-2 text-sky-300 mr-0.5" />{g.participants}
        </div>
      </div>
    );
  })}
  
  {/* 🚨 CORRECTIF : Projection des symboles attention en cas de SOS participants actif sur le tracé */}
  {sosVisibles
    .filter((s) => s && s.surTrace && s.surTrace.km !== null)
    .map((s) => (
      <div 
        key={s.id} 
        className="absolute top-8 z-10" 
        style={{ left: `calc(${(Math.min(s.surTrace.km, LONGUEUR_KM) / LONGUEUR_KM) * 100}% - 7px)` }} 
        title={`SOS : ${s.motif}`}
      >
        <TriangleAlert className="w-3.5 h-3.5 text-red-400 pulse-slow" />
      </div>
    ))}
</div>