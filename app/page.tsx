"use client";

import { useEffect, useState } from "react";
import { getDadosCompletos, getRelatorioViagens } from "./actions";

const formatarParaBR = (dataString: string | null) => {
  if (!dataString) return "";
  if (dataString.includes("/")) return dataString; 
  const [ano, mes, dia] = dataString.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

// ÍCONES REVERTIDOS PARA O ESCUDO (Mais compatível com todos os ecrãs)
const getIconePorPapel = (papel: string) => {
  if (!papel) return '🛡️';
  const p = papel.toLowerCase();
  if (p.includes('motorista')) return '🚗';
  if (p.includes('social') || p.includes('assistente')) return '🤝';
  if (p.includes('psic')) return '🧠';
  if (p.includes('enferm') || p.includes('saúde') || p.includes('med')) return '💉';
  if (p.includes('pedagog')) return '📚';
  if (p.includes('coord') || p.includes('diret') || p.includes('gest')) return '👔';
  if (p.includes('admin')) return '💻';
  if (p.includes('segurança') || p.includes('educador') || p.includes('servidor')) return '🛡️';
  return '🛠️';
};

const getCorFundoIcone = (papel: string) => {
  if (!papel) return 'bg-slate-100 border-slate-200 text-slate-700';
  const p = papel.toLowerCase();
  if (p.includes('motorista')) return 'bg-amber-100 border-amber-200 text-amber-700';
  if (p.includes('social') || p.includes('assistente')) return 'bg-blue-100 border-blue-200 text-blue-700';
  if (p.includes('psic')) return 'bg-purple-100 border-purple-200 text-purple-700';
  if (p.includes('enferm') || p.includes('saúde') || p.includes('med')) return 'bg-rose-100 border-rose-200 text-rose-700';
  if (p.includes('pedagog')) return 'bg-emerald-100 border-emerald-200 text-emerald-700';
  if (p.includes('segurança') || p.includes('educador') || p.includes('servidor')) return 'bg-slate-800 border-slate-700 text-white'; 
  return 'bg-indigo-100 border-indigo-200 text-indigo-700'; 
};

const agruparViagens = (viagens: any[]) => {
  const grupos: Record<string, any> = {};
  viagens.forEach(viagem => {
    const key = `${viagem.data_viagem}_${viagem.destino}_${viagem.cidade || ''}`;
    if (!grupos[key]) {
      grupos[key] = { id: viagem.id, data_viagem: viagem.data_viagem, destino: viagem.destino, cidade: viagem.cidade, horario: viagem.horario, adolescente: viagem.adolescente, observacoes: viagem.observacoes, motorista: null, educadores: [], valorTotal: 0 };
    }
    if (viagem.papel === 'Motorista') grupos[key].motorista = viagem;
    else if (!grupos[key].educadores.find((e: any) => e.nome_pessoa === viagem.nome_pessoa)) grupos[key].educadores.push(viagem);
  });
  return Object.values(grupos).sort((a: any, b: any) => new Date(b.data_viagem).getTime() - new Date(a.data_viagem).getTime() || b.id - a.id);
};

export default function Home() {
  const [plantoes, setPlantoes] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [equipeTecnica, setEquipeTecnica] = useState<any[]>([]);
  const [relatorioGeral, setRelatorioGeral] = useState<any[]>([]);
  
  const [loadingInicial, setLoadingInicial] = useState(true);
  
  const [abaAtiva, setAbaAtiva] = useState<'plantoes' | 'motoristas' | 'tecnica'>('plantoes');
  const [plantaoExpandido, setPlantaoExpandido] = useState<number | null>(null);
  
  const [modalHistorico, setModalHistorico] = useState<any | null>(null);
  const [modalHistoricoGeral, setModalHistoricoGeral] = useState(false);

  const [filtroNome, setFiltroNome] = useState("");
  const [filtroData, setFiltroData] = useState("");

  useEffect(() => {
    async function carregar() {
      const { plantoes, motoristas, equipeTecnica } = await getDadosCompletos();
      const relatorio = await getRelatorioViagens(); 
      setPlantoes(plantoes);
      setMotoristas(motoristas);
      setEquipeTecnica(equipeTecnica || []);
      setRelatorioGeral(relatorio);
      setLoadingInicial(false);
    }
    carregar();
    const intervalo = setInterval(carregar, 30000);
    return () => clearInterval(intervalo);
  }, []);

  if (loadingInicial) {
    return (
      <div className="min-h-screen bg-[#F4F7F9] p-6 animate-pulse overflow-hidden flex flex-col items-center">
        <div className="w-full h-64 bg-slate-200 rounded-[3rem] mb-10 max-w-4xl mx-auto mt-10"></div>
        <div className="flex gap-4 max-w-5xl mx-auto mb-10 w-full">
          <div className="w-full sm:w-72 h-40 bg-slate-200 rounded-[2rem]"></div>
          <div className="w-72 h-40 bg-slate-200 rounded-[2rem] hidden sm:block"></div>
        </div>
        <div className="w-full max-w-xl mx-auto h-16 bg-slate-200 rounded-full mb-10"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full mx-auto">
          <div className="h-48 bg-slate-200 rounded-[2.5rem]"></div>
          <div className="h-48 bg-slate-200 rounded-[2.5rem]"></div>
          <div className="h-48 bg-slate-200 rounded-[2.5rem]"></div>
        </div>
      </div>
    );
  }

  const viagensAgrupadasGeral = agruparViagens(relatorioGeral);
  const ultimasViagensAgrupadas = viagensAgrupadasGeral.slice(0, 5); 

  const hojeObj = new Date();
  const diaHoje = hojeObj.getDate().toString().padStart(2, '0');
  const diaHojeSimples = hojeObj.getDate().toString();

  const relatorioFiltrado = viagensAgrupadasGeral.filter(grupo => {
    const termoBusca = filtroNome.toLowerCase();
    const matchMotorista = grupo.motorista && grupo.motorista.nome_pessoa.toLowerCase().includes(termoBusca);
    const matchEducador = grupo.educadores.some((ed: any) => ed.nome_pessoa.toLowerCase().includes(termoBusca) || ed.equipe.toLowerCase().includes(termoBusca));
    const matchAdolescente = grupo.adolescente && grupo.adolescente.toLowerCase().includes(termoBusca);
    const matchNome = termoBusca === "" || matchMotorista || matchEducador || matchAdolescente;
    const matchData = filtroData === "" || grupo.data_viagem === filtroData;
    return matchNome && matchData;
  });

  return (
    <main className="min-h-screen bg-[#F4F7F9] font-sans pb-24 text-slate-800 overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* MODAL HISTÓRICO GERAL */}
      {modalHistoricoGeral && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-white/50 transform scale-100 animate-in zoom-in-95">
            
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-sm">🔍</span>
                  <h3 className="font-black text-slate-900 text-2xl tracking-tight">Pesquisar Histórico</h3>
                </div>
                <p className="text-sm text-slate-500 font-medium ml-13">Encontre viagens, motoristas ou adolescentes rapidamente.</p>
              </div>
              <button onClick={() => { setModalHistoricoGeral(false); setFiltroNome(""); setFiltroData(""); }} className="w-12 h-12 bg-white border border-slate-200 hover:bg-slate-100 hover:text-red-500 text-slate-500 rounded-full flex items-center justify-center transition-all font-black text-lg shadow-sm active:scale-95">✕</button>
            </div>
            
            <div className="bg-white p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <input type="text" placeholder="Digite um nome para buscar..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-5 py-4 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-base font-medium shadow-inner placeholder:text-slate-400" />
              </div>
              <div className="sm:w-56">
                <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-5 py-4 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-base font-medium shadow-inner" />
              </div>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-50">
              <div className="space-y-5 max-w-4xl mx-auto">
                {relatorioFiltrado.map((grupo, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300 flex flex-col gap-5 group">
                    <div className="flex flex-col sm:flex-row justify-between border-b border-slate-100 pb-4 gap-3">
                       <div className="flex flex-wrap items-center gap-3">
                          <span className="text-slate-700 font-black text-sm flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                            <span className="text-lg">📅</span> {formatarParaBR(grupo.data_viagem)} {grupo.horario && <span className="opacity-60 font-medium ml-1">às {grupo.horario}</span>}
                          </span>
                          {grupo.destino && (
                            <span className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest border bg-white text-indigo-700 border-indigo-200 shadow-sm flex items-center gap-1">
                              <span>📍</span> {grupo.cidade ? `${grupo.cidade} (${grupo.destino})` : grupo.destino}
                            </span>
                          )}
                       </div>
                       {grupo.adolescente && (
                         <span className="text-[11px] font-black text-emerald-700 uppercase bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-max flex items-center gap-2 shadow-sm">
                           <span className="text-base">👤</span> Adolescente: {grupo.adolescente}
                         </span>
                       )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group-hover:border-indigo-100 transition-colors">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Motorista Escalonado</span>
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-xl shadow-sm">🚗</div>
                           <p className="font-black text-slate-800 text-base">{grupo.motorista ? grupo.motorista.nome_pessoa : <span className="text-slate-400 font-medium italic">Sem motorista</span>}</p>
                         </div>
                      </div>
                      
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group-hover:border-indigo-100 transition-colors">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Equipe Integrante</span>
                         {grupo.educadores.length > 0 ? (
                           <div className="flex flex-col gap-3">
                             {grupo.educadores.map((ed: any, i: number) => {
                               const funcao = ed.equipe === 'Equipe Técnica' ? ed.papel : 'Segurança';
                               return (
                                 <div key={i} className="flex items-center gap-3">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm border ${getCorFundoIcone(funcao)}`}>
                                     {getIconePorPapel(funcao)}
                                   </div>
                                   <div className="flex flex-col">
                                     <p className="font-black text-slate-800 text-sm leading-tight">{ed.nome_pessoa}</p>
                                     <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{funcao}</span>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         ) : (
                           <span className="text-slate-400 font-medium text-sm">Nenhuma equipe vinculada</span>
                         )}
                      </div>
                    </div>

                    {grupo.observacoes && (
                       <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 mt-1">
                         <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block mb-1">📝 Observações Adicionais</span>
                         <p className="text-sm text-slate-700 font-medium leading-relaxed">{grupo.observacoes}</p>
                       </div>
                    )}
                  </div>
                ))}
                
                {viagensAgrupadasGeral.length > 0 && relatorioFiltrado.length === 0 && (
                   <div className="text-center py-20 flex flex-col items-center">
                      <span className="text-6xl mb-4 opacity-50">🔍</span>
                      <p className="text-slate-500 font-bold text-lg">Nenhum resultado encontrado.</p>
                      <p className="text-slate-400 text-sm mt-1">Tente buscar por outro nome ou data.</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTÓRICO DE FILA INDIVIDUAL */}
      {modalHistorico && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
              <div>
                <h3 className="font-black text-xl tracking-tight">Histórico da Fila</h3>
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">{modalHistorico.nome}</p>
              </div>
              <button onClick={() => setModalHistorico(null)} className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors font-black active:scale-95">✕</button>
            </div>
            
            <div className="p-4 max-h-[60vh] overflow-y-auto bg-slate-50">
               {modalHistorico.servidores
                  .filter((s: any) => s.ultima_viagem)
                  .sort((a: any, b: any) => new Date(b.ultima_viagem).getTime() - new Date(a.ultima_viagem).getTime())
                  .map((s: any, idx: number) => (
                     <div key={s.id} className="mb-3 last:mb-0 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center font-black text-xs shadow-sm">{idx + 1}</span>
                          <span className="font-black text-slate-800 text-sm">{s.nome}</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <p className="text-[11px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">⏱️ {formatarParaBR(s.ultima_viagem)}</p>
                          {s.destino_viagem && <p className="text-[9px] font-bold uppercase text-indigo-500 mt-1.5 tracking-widest">📍 {s.destino_viagem}</p>}
                        </div>
                     </div>
                  ))
               }
               {modalHistorico.servidores.filter((s: any) => s.ultima_viagem).length === 0 && (
                 <div className="text-center py-10">
                   <p className="text-slate-400 font-bold text-sm">Nenhuma viagem registada ainda.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}


      {/* HEADER PRINCIPAL (HERO SECTION) */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 pt-16 pb-36 px-6 text-center overflow-hidden border-b-4 border-indigo-500">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[80px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-purple-500/20 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 shadow-xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            Sincronizado em Tempo Real
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-slate-300 tracking-tighter mb-4 drop-shadow-lg">
            Portal Transparência
          </h1>
          
          <p className="text-indigo-200/80 text-sm md:text-lg max-w-2xl leading-relaxed mb-10 font-medium">
            O centro de comando unificado para acompanhamento de escalas, plantões e fila de viagens do CSIPRC.
          </p>
          
          <button 
            onClick={() => setModalHistoricoGeral(true)} 
            className="group relative inline-flex items-center justify-center gap-3 bg-white text-indigo-900 font-black text-sm md:text-base px-8 py-4 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all duration-300 hover:-translate-y-1 active:scale-95 border border-white/50 overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative z-10 text-xl">🔍</span>
            <span className="relative z-10 uppercase tracking-widest">Pesquisar Histórico Completo</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-20 -mt-16 space-y-10">
        
        {/* ÚLTIMAS VIAGENS (CARROSSEL) */}
        {ultimasViagensAgrupadas.length > 0 && (
          <section className="mb-14">
            <h3 className="font-black text-white/90 text-xs uppercase tracking-[0.2em] mb-4 pl-4 drop-shadow-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Viagens Recentes
            </h3>
            
            <div className="flex gap-5 overflow-x-auto pb-6 snap-x hide-scrollbar px-2">
              {ultimasViagensAgrupadas.map((grupo: any, idx: number) => (
                <div key={idx} className="min-w-[300px] w-[300px] bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] border border-white shadow-xl shadow-indigo-900/10 snap-start flex-shrink-0 flex flex-col justify-between hover:shadow-2xl hover:shadow-indigo-900/20 transition-all duration-300 hover:-translate-y-2 group">
                  
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg shadow-sm">
                        📅 {formatarParaBR(grupo.data_viagem)}
                      </span>
                      {grupo.destino && (
                        <span className="inline-block bg-slate-50 text-slate-500 border border-slate-200 px-2 py-1 rounded-md text-[9px] font-black uppercase truncate max-w-[100px] shadow-sm">
                          📍 {grupo.cidade ? grupo.cidade : grupo.destino}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-3 mb-2">
                      {grupo.motorista && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shadow-sm">🚗</div>
                          <p className="font-black text-sm text-slate-800 truncate flex-1">{grupo.motorista.nome_pessoa}</p>
                        </div>
                      )}
                      
                      {grupo.educadores.slice(0, 2).map((ed: any, i: number) => {
                        const func = ed.equipe === 'Equipe Técnica' ? ed.papel : 'Segurança';
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border ${getCorFundoIcone(func)}`}>
                              {getIconePorPapel(func)}
                            </div>
                            <p className="font-black text-sm text-slate-800 truncate flex-1">{ed.nome_pessoa}</p>
                          </div>
                        )
                      })}
                      {grupo.educadores.length > 2 && (
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-11 pt-1">
                          + {grupo.educadores.length - 2} acompanhante(s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NAVEGAÇÃO POR ABAS FLUTUANTES */}
        <div className="flex justify-center md:justify-start mb-8 sticky top-4 z-50">
          <div className="bg-white/80 backdrop-blur-2xl p-2 rounded-[2rem] flex gap-2 overflow-x-auto w-full md:w-auto hide-scrollbar shadow-xl shadow-slate-200/50 border border-white">
            <button 
              onClick={() => setAbaAtiva('plantoes')} 
              className={`flex-1 md:flex-none whitespace-nowrap px-6 py-3.5 rounded-2xl text-xs md:text-sm font-black uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${abaAtiva === 'plantoes' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
            >
              <span className="text-lg">🛡️</span> Plantões
            </button>
            <button 
              onClick={() => setAbaAtiva('motoristas')} 
              className={`flex-1 md:flex-none whitespace-nowrap px-6 py-3.5 rounded-2xl text-xs md:text-sm font-black uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${abaAtiva === 'motoristas' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
            >
              <span className="text-lg">🚗</span> Motoristas
            </button>
            <button 
              onClick={() => setAbaAtiva('tecnica')} 
              className={`flex-1 md:flex-none whitespace-nowrap px-6 py-3.5 rounded-2xl text-xs md:text-sm font-black uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${abaAtiva === 'tecnica' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
            >
              <span className="text-lg">🛠️</span> Técnica
            </button>
          </div>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="min-h-[50vh] pb-10">
          
          {/* ABA 1: PLANTÕES (Segurança) */}
          {abaAtiva === 'plantoes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {plantoes.map((plantao: any) => {
                const ePortaria = plantao.nome.toLowerCase().includes('portaria');
                const deServicoHoje = (plantao.dias_plantao || "").includes(diaHoje) || (plantao.dias_plantao || "").includes(diaHojeSimples);
                const isExpandido = plantaoExpandido === plantao.id;

                return (
                  <div key={plantao.id} className={`bg-white rounded-[2.5rem] overflow-hidden transition-all duration-300 border-2 ${deServicoHoje ? 'border-emerald-400 shadow-2xl shadow-emerald-900/10 transform hover:-translate-y-1' : 'border-slate-100 shadow-xl shadow-slate-200/40 hover:border-indigo-100 hover:shadow-indigo-900/5'}`}>
                    
                    <div className={`p-6 md:p-8 flex justify-between items-start ${deServicoHoje ? 'bg-gradient-to-br from-emerald-50 to-white' : 'bg-white'}`}>
                      <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-2 tracking-tight">
                          <span className="text-3xl drop-shadow-sm">{ePortaria ? '🚪' : '🛡️'}</span> {plantao.nome}
                        </h2>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className="text-[10px] font-black text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-widest shadow-sm">
                            🗓️ Escala: {plantao.dias_plantao || 'A def.'}
                          </span>
                          {!ePortaria && deServicoHoje && (
                            <span className="text-[10px] font-black text-white bg-emerald-500 px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-sm shadow-emerald-500/40 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> No Plantão
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button onClick={() => setModalHistorico(plantao)} className="text-indigo-400 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm active:scale-90" title="Ver Histórico">
                        <span className="text-xl">📜</span>
                      </button>
                    </div>

                    <div className="px-6 pb-6">
                      <button 
                        onClick={() => setPlantaoExpandido(isExpandido ? null : plantao.id)} 
                        className={`w-full font-black text-xs py-3.5 rounded-xl transition-colors uppercase tracking-widest active:scale-95 border ${isExpandido ? 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200' : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800 shadow-md'}`}
                      >
                        {isExpandido ? '▲ Recolher Fila' : '▼ Ver Fila de Viagem'}
                      </button>
                    </div>
                    
                    {isExpandido && (
                      <div className="bg-slate-50 p-4 border-t border-slate-100 rounded-b-[2.5rem]">
                        {plantao.servidores.map((s: any, idx: number) => {
                          const proximo = (idx === 0 || idx === 1) && !ePortaria;
                          return (
                            <div key={s.id} className={`p-4 mb-3 last:mb-0 rounded-[1.5rem] flex items-center justify-between transition-all bg-white border ${proximo ? 'border-emerald-300 shadow-md shadow-emerald-100 transform scale-[1.02] relative z-10' : 'border-slate-100 shadow-sm hover:border-indigo-100'}`}>
                              
                              <div className="flex items-center gap-4 w-full">
                                <span className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm shadow-inner ${proximo ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-600/50' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                  {s.posicao_fila}º
                                </span>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className={`font-black text-base tracking-tight truncate ${proximo ? 'text-emerald-900' : 'text-slate-800'}`}>{s.nome}</p>
                                    {s.is_supervisor === 1 && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-black uppercase border border-indigo-200 shadow-sm">Sup</span>}
                                  </div>
                                  
                                  <div className="flex flex-col gap-1.5 mt-1.5">
                                    {s.data_folga ? (
                                      <span className="inline-flex items-center gap-1 w-max text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 uppercase tracking-widest">
                                        🌴 Folga: {s.data_folga}
                                      </span>
                                    ) : (
                                      <span className="inline-block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {proximo ? '🟢 Pronto para viagem' : '⏳ Aguardando vez'}
                                      </span>
                                    )}
                                    
                                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest mt-0.5">
                                      ⏱️ Última: <span className="text-slate-600">{s.ultima_viagem ? formatarParaBR(s.ultima_viagem) : 'Sem registo'}</span>
                                      {s.destino_viagem && <span className="ml-1 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md truncate max-w-[80px]">📍 {s.destino_viagem}</span>}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {plantao.servidores.length === 0 && <p className="text-center text-xs font-bold text-slate-400 py-4 uppercase tracking-widest">Fila Vazia</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ABA 2: MOTORISTAS */}
          {abaAtiva === 'motoristas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {motoristas.length === 0 && <p className="col-span-full text-center font-bold text-slate-400 uppercase tracking-widest py-10">Nenhum motorista cadastrado.</p>}
              
              {motoristas.map((m: any, idx: number) => (
                <div key={m.id} className={`bg-white p-6 md:p-8 rounded-[2.5rem] border-2 flex items-center gap-5 transition-all duration-300 ${idx === 0 ? 'border-amber-400 shadow-2xl shadow-amber-900/10 bg-gradient-to-br from-amber-50/50 to-white transform hover:-translate-y-1' : 'border-slate-100 shadow-xl shadow-slate-200/40 hover:border-indigo-100'}`}>
                  <div className="relative">
                    {idx === 0 && <div className="absolute inset-0 bg-amber-400 rounded-[1.5rem] animate-ping opacity-25"></div>}
                    <span className={`relative w-16 h-16 flex items-center justify-center rounded-[1.5rem] font-black text-2xl shadow-sm ${idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-amber-500/40' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                      {idx + 1}º
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1 items-start mb-2">
                      {idx === 0 && <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-md uppercase font-black tracking-widest shadow-sm">Na Vez</span>}
                      <p className={`font-black text-xl truncate w-full tracking-tight ${idx === 0 ? 'text-amber-950' : 'text-slate-800'}`}>{m.nome}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 opacity-80"><span>⏱️</span> {m.ultima_viagem ? formatarParaBR(m.ultima_viagem) : 'Sem registo'}</span>
                      {m.destino_viagem && <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-slate-600 w-max truncate max-w-full">📍 {m.destino_viagem}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ABA 3: EQUIPE TÉCNICA */}
          {abaAtiva === 'tecnica' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {equipeTecnica.length === 0 && <p className="col-span-full text-center font-bold text-slate-400 uppercase tracking-widest py-10">Nenhum servidor técnico cadastrado.</p>}
              
              {equipeTecnica.map((t: any, idx: number) => {
                const corFundo = getCorFundoIcone(t.funcao);
                return (
                  <div key={t.id} className={`bg-white p-6 md:p-8 rounded-[2.5rem] border-2 flex items-center gap-5 transition-all duration-300 ${idx === 0 ? 'border-purple-400 shadow-2xl shadow-purple-900/10 bg-gradient-to-br from-purple-50/50 to-white transform hover:-translate-y-1' : 'border-slate-100 shadow-xl shadow-slate-200/40 hover:border-indigo-100'}`}>
                    <span className={`flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-[1.5rem] font-black text-2xl shadow-sm ${idx === 0 ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-purple-500/40' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                      {t.posicao_fila}º
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm border ${corFundo}`}>
                          {getIconePorPapel(t.funcao)}
                        </div>
                        <p className="font-black text-slate-800 text-lg truncate flex-1 tracking-tight">{t.nome}</p>
                      </div>
                      <div className="flex flex-col gap-2 items-start mt-3">
                        <span className="text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">
                          {t.funcao}
                        </span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          SEI: {t.ultima_viagem ? formatarParaBR(t.ultima_viagem) : 'Sem registo'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Estilo Global Anti-Scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}