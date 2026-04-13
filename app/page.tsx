import { getDadosCompletos } from "./actions";

export const revalidate = 0;

// Função inteligente que traduz a data para o formato Brasileiro
const formatarParaBR = (dataString: string | null) => {
  if (!dataString) return "";
  if (dataString.includes("/")) return dataString; // Se já estiver formatada
  const [ano, mes, dia] = dataString.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

export default async function Home() {
  const { plantoes, motoristas } = await getDadosCompletos();

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-16 font-sans relative overflow-hidden">
      
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      
      {/* Cabeçalho Premium */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-16 pb-28 px-4 text-center rounded-b-[4rem] shadow-2xl relative z-10 border-b-4 border-emerald-500/50">
        <div className="max-w-3xl mx-auto">
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 inline-block shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            🛡️ Sistema de Escalas
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-4 tracking-tighter drop-shadow-md">
            Portal da Transparência
          </h1>
          <p className="text-slate-400 font-medium md:text-xl max-w-2xl mx-auto leading-relaxed">
            Acompanhe a fila de viagens, folgas e escalas do CSIPRC em tempo real.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-20 mt-[-4rem] space-y-10">
        
        {/* ESCALA DE MOTORISTAS */}
        {motoristas && motoristas.length > 0 && (
          <section className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-amber-900/5 border border-white overflow-hidden transform transition duration-500 hover:shadow-2xl hover:bg-white">
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 text-white flex items-center justify-center gap-3">
              <span className="text-2xl">🚗</span>
              <h3 className="font-black uppercase tracking-widest text-sm drop-shadow-md">Escala de Motoristas (Revezamento)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {motoristas.map((m: any, idx: number) => (
                <div key={m.id} className={`p-8 flex items-center justify-between transition-all duration-300 ${idx === 0 ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      {idx === 0 && <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-20"></div>}
                      <span className={`relative w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-600/50' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                        {idx + 1}º
                      </span>
                    </div>
                    <div>
                      <p className={`font-black text-xl md:text-2xl tracking-tight uppercase ${idx === 0 ? 'text-amber-950' : 'text-slate-700'}`}>{m.nome}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-slate-400 text-xs">⏱️</span>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Última: {m.ultima_viagem ? formatarParaBR(m.ultima_viagem) : 'Sem registo'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {idx === 0 && (
                    <span className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-amber-200 to-amber-300 text-amber-900 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                      Na Vez
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* GRELHA DE EQUIPES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plantoes.map((plantao: any) => {
            const ePortaria = plantao.nome.toLowerCase().includes('portaria');
            return (
              <div key={plantao.id} className="bg-white/90 backdrop-blur-lg rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-white transform transition duration-500 hover:shadow-2xl hover:-translate-y-2 group">
                
                <div className={`p-7 text-white relative overflow-hidden ${ePortaria ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-gradient-to-br from-slate-800 to-slate-950'}`}>
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="relative z-10">
                    <h2 className="text-2xl font-black uppercase tracking-wide drop-shadow-lg flex items-center gap-3">
                      {ePortaria ? '🚪' : '🛡️'} {plantao.nome}
                    </h2>
                    <div className="inline-flex items-center gap-2 mt-3 bg-black/30 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">📅 Escala:</span>
                      <span className="text-[11px] font-black text-white">{plantao.dias_plantao || 'A definir'}</span>
                    </div>
                  </div>
                </div>
                
                <ul className="divide-y divide-slate-100/80">
                  {plantao.servidores.map((s: any, idx: number) => {
                    const proximo = idx === 0 && !ePortaria;
                    return (
                      <li key={s.id} className={`p-5 md:p-6 transition-all duration-300 ${proximo ? 'bg-gradient-to-r from-emerald-50/80 to-teal-50/30' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-start gap-4 w-full">
                            {!ePortaria && (
                              <div className="relative flex-shrink-0">
                                {proximo && <div className="absolute inset-0 bg-emerald-400 rounded-xl animate-ping opacity-20"></div>}
                                <span className={`relative w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-sm border ${proximo ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-emerald-500/50 shadow-emerald-500/40' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                  {s.posicao_fila}º
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`font-black text-[15px] md:text-lg tracking-tight ${proximo ? 'text-emerald-950' : 'text-slate-800'}`}>
                                  {s.nome}
                                </p>
                                {s.is_supervisor === 1 && <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase border border-blue-200">Sup</span>}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-600 px-2.5 py-1 rounded-lg border border-red-100/50">
                                  🌴 {s.data_folga || '--/--'}
                                </span>
                                {!ePortaria && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-200/50">
                                    ✈️ {s.ultima_viagem ? formatarParaBR(s.ultima_viagem) : 'Sem registo'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {proximo && (
                            <div className="flex-shrink-0 ml-2">
                              <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}