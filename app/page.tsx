"use client";

import { useEffect, useState } from "react";
import { getDadosCompletos, getRelatorioViagens } from "./actions";

const formatarParaBR = (dataString: string | null) => {
  if (!dataString) return "";
  if (dataString.includes("/")) return dataString; 
  const [ano, mes, dia] = dataString.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

export default function Home() {
  const [plantoes, setPlantoes] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [relatorioGeral, setRelatorioGeral] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [plantaoExpandido, setPlantaoExpandido] = useState<number | null>(null);
  const [modalHistorico, setModalHistorico] = useState<any | null>(null);
  const [modalHistoricoGeral, setModalHistoricoGeral] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { plantoes, motoristas } = await getDadosCompletos();
      const relatorio = await getRelatorioViagens(); // Busca o histórico REAL completo
      setPlantoes(plantoes);
      setMotoristas(motoristas);
      setRelatorioGeral(relatorio);
      setLoading(false);
    }
    carregar();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
        <p className="font-black text-slate-500 uppercase tracking-[0.3em] text-xs animate-pulse">Carregando Portal...</p>
      </div>
    );
  }

  // Viagens de Hoje (Baseadas no histórico real)
  const hojeIso = new Date().toISOString().split('T')[0];
  const viagensHoje = relatorioGeral
    .filter(viagem => viagem.data_viagem === hojeIso)
    .slice(0, 3); // Limita a 3 para não quebrar o layout

  const hojeObj = new Date();
  const diaHoje = hojeObj.getDate().toString().padStart(2, '0');
  const diaHojeSimples = hojeObj.getDate().toString();

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-16 font-sans relative overflow-hidden">
      
      {/* MODAL HISTÓRICO GERAL (AGORA USANDO O HISTÓRICO REAL COMPLETO) */}
      {modalHistoricoGeral && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden border border-white flex flex-col">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div>
                <h3 className="font-black uppercase tracking-widest text-sm">📜 Histórico Geral de Viagens</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Todas as equipas e motoristas</p>
              </div>
              <button onClick={() => setModalHistoricoGeral(false)} className="bg-slate-800 hover:bg-red-500 text-white transition-all p-2 rounded-xl">
                <span className="text-xl">✕</span>
              </button>
            </div>
            <div className="p-4 overflow-y-auto bg-slate-50 flex-1">
              <div className="space-y-3">
                {relatorioGeral.map((viagem, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm hover:border-indigo-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{viagem.papel === 'Motorista' ? '🚗' : '🛡️'}</span>
                      <div>
                        <p className="font-black text-slate-800 leading-none mb-1">{viagem.nome_pessoa}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{viagem.equipe}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 font-black text-[11px]">
                        📅 {formatarParaBR(viagem.data_viagem)}
                      </span>
                      {viagem.destino && (
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${viagem.destino === 'Interior' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                          📍 {viagem.destino} ({viagem.destino === 'Interior' ? 'R$ 320' : 'R$ 640'})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {relatorioGeral.length === 0 && (
                   <p className="text-center text-slate-400 py-10 font-bold uppercase text-xs tracking-widest">Nenhuma viagem registrada no sistema.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE HISTÓRICO POR PLANTÃO */}
      {modalHistorico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 flex justify-between items-center text-white">
              <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                📜 Histórico: {modalHistorico.nome}
              </h3>
              <button onClick={() => setModalHistorico(null)} className="text-slate-400 hover:text-white transition-colors p-1 bg-slate-800 rounded-lg">
                ✕
              </button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
               {modalHistorico.servidores
                  .filter((s: any) => s.ultima_viagem)
                  .sort((a: any, b: any) => new Date(b.ultima_viagem).getTime() - new Date(a.ultima_viagem).getTime())
                  .map((s: any, idx: number) => (
                     <div key={s.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors rounded-xl">
                        <div className="flex items-center gap-3 mb-2 sm:mb-0">
                          <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs">
                            {idx + 1}º
                          </span>
                          <span className="font-black text-slate-700">{s.nome}</span>
                        </div>
                        <div className="flex flex-col items-end ml-11 sm:ml-0 gap-1">
                          <span className="text-[11px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                            <span>⏱️</span> {formatarParaBR(s.ultima_viagem)}
                          </span>
                          {s.destino_viagem && (
                            <span className={`text-[9px] font-bold uppercase ${s.destino_viagem === 'Interior' ? 'text-amber-500' : 'text-blue-500'}`}>
                               📍 {s.destino_viagem} ({s.destino_viagem === 'Interior' ? 'R$ 320' : 'R$ 640'})
                            </span>
                          )}
                        </div>
                     </div>
                  ))
               }
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-16 pb-28 px-4 text-center rounded-b-[4rem] shadow-2xl relative z-10 border-b-4 border-emerald-500/50">
        <div className="max-w-3xl mx-auto">
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 inline-block shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            🛡️ Sistema de Escalas
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-4 tracking-tighter drop-shadow-md">
            Portal da Transparência
          </h1>
          <p className="text-slate-400 font-medium md:text-xl max-w-2xl mx-auto leading-relaxed">
            Acompanhe a fila de viagens, controlo de diárias e folgas do CSIPRC em tempo real.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-20 mt-[-4rem] space-y-10">
        
        <section className="space-y-4">
          <div className="flex justify-center">
            <button 
              onClick={() => setModalHistoricoGeral(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 py-4 rounded-2xl shadow-xl transition-all hover:-translate-y-1 flex items-center gap-3 border border-slate-700"
            >
              <span>📜 Ver Histórico Geral</span>
            </button>
          </div>

          {viagensHoje.length > 0 && (
            <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-indigo-900/10 border border-white overflow-hidden transform transition duration-500 hover:shadow-indigo-900/20">
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-5 text-white flex items-center justify-center gap-3">
                <span className="text-3xl animate-bounce">✈️</span>
                <h3 className="font-black uppercase tracking-widest text-sm drop-shadow-md">Última Viagem Registrada</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 p-2">
                {viagensHoje.map((viagem: any, idx: number) => (
                  <div key={idx} className="p-5 flex flex-col items-center text-center hover:bg-slate-50 transition-colors rounded-2xl">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                      Viajou Hoje
                    </span>
                    <p className="font-black text-lg text-slate-800 leading-tight mb-1">{viagem.nome_pessoa}</p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <span className="text-lg">{viagem.papel === 'Motorista' ? '🚗' : '🛡️'}</span> {viagem.equipe}
                    </p>
                    {viagem.destino && (
                      <span className={`inline-block px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${viagem.destino === 'Interior' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                        📍 {viagem.destino} ({viagem.destino === 'Interior' ? 'R$ 320' : 'R$ 640'})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {motoristas && motoristas.length > 0 && (
          <section className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-amber-900/5 border border-white overflow-hidden transform transition duration-500 hover:shadow-2xl">
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 text-white flex items-center justify-center gap-3">
              <span className="text-3xl">🚗</span>
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
                      <div className="flex flex-col gap-0.5 mt-2">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <span>⏱️</span> Última: {m.ultima_viagem ? formatarParaBR(m.ultima_viagem) : 'Sem registo'}
                        </p>
                        {m.destino_viagem && (
                           <span className={`text-[10px] font-black uppercase tracking-wider ${m.destino_viagem === 'Interior' ? 'text-amber-500' : 'text-blue-500'}`}>
                             📍 {m.destino_viagem}
                           </span>
                        )}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plantoes.map((plantao: any) => {
            const ePortaria = plantao.nome.toLowerCase().includes('portaria');
            const diasEscala = plantao.dias_plantao || "";
            const deServicoHoje = diasEscala.includes(diaHoje) || diasEscala.includes(diaHojeSimples);
            const isExpandido = plantaoExpandido === plantao.id;

            return (
              <div key={plantao.id} className={`bg-white/90 backdrop-blur-lg rounded-[2rem] shadow-xl overflow-hidden border transform transition duration-500 hover:shadow-2xl group ${deServicoHoje ? 'shadow-emerald-200/50 border-emerald-100' : 'shadow-slate-200/50 border-white'}`}>
                
                <div className={`p-7 text-white relative overflow-hidden ${ePortaria ? 'bg-gradient-to-br from-blue-600 to-blue-800' : (deServicoHoje ? 'bg-gradient-to-br from-emerald-800 to-slate-900' : 'bg-gradient-to-br from-slate-800 to-slate-950')}`}>
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="relative z-10 flex flex-col items-start gap-2">
                    <h2 className="text-2xl font-black uppercase tracking-wide drop-shadow-lg flex items-center gap-3">
                      <span className="text-3xl">{ePortaria ? '🚪' : '🛡️'}</span> {plantao.nome}
                    </h2>
                    
                    {!ePortaria && (
                      <div className={`mt-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${deServicoHoje ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-amber-500 text-white border-amber-400'}`}>
                        {deServicoHoje ? '🟢 De Serviço Hoje' : '🌴 De Folga Hoje'}
                      </div>
                    )}

                    <div className="inline-flex items-center gap-2 mt-2 bg-black/30 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">📅 Escala:</span>
                      <span className="text-[11px] font-black text-white">{plantao.dias_plantao || 'A definir'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border-b border-slate-100 flex gap-2">
                  <button onClick={() => setPlantaoExpandido(isExpandido ? null : plantao.id)} className="flex-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black text-[9px] uppercase tracking-widest py-3 rounded-xl transition-colors shadow-sm">
                    {isExpandido ? '▲ Ocultar Fila' : '▼ Ver Fila'}
                  </button>
                  <button onClick={() => setModalHistorico(plantao)} className="flex-1 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-black text-[9px] uppercase tracking-widest py-3 rounded-xl transition-colors shadow-sm">
                    📜 Histórico
                  </button>
                </div>
                
                {isExpandido && (
                  <ul className="divide-y divide-slate-100/80">
                    {plantao.servidores.map((s: any, idx: number) => {
                      const proximo = (idx === 0 || idx === 1) && !ePortaria;
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
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100/50">
                                    <span>🌴</span> <span className="mt-0.5">{s.data_folga || '--/--'}</span>
                                  </span>
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}