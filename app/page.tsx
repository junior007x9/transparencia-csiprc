"use client";

import { useEffect, useState } from "react";
import { getDadosCompletos, getRelatorioViagens } from "./actions";

const formatarParaBR = (dataString: string | null) => {
  if (!dataString) return "";
  if (dataString.includes("/")) return dataString; 
  const [ano, mes, dia] = dataString.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

// FUNÇÃO DOS ÍCONES INTELIGENTES
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
  if (p.includes('educador') || p.includes('servidor')) return '🛡️';
  return '🛠️'; // default tecnico
};

// AGRUPAMENTO INTELIGENTE (Agrupa apenas por Data, Destino e Cidade)
const agruparViagens = (viagens: any[]) => {
  const grupos: Record<string, any> = {};
  
  viagens.forEach(viagem => {
    // Agora o sistema ignora a "hora" ou "observação" para forçar a junção de todo mundo que viajou no mesmo dia para o mesmo lugar
    const cidadeFormatada = viagem.cidade ? viagem.cidade.toLowerCase().trim() : '';
    const key = `${viagem.data_viagem}_${viagem.destino}_${cidadeFormatada}`;
    
    if (!grupos[key]) {
      grupos[key] = {
        id: viagem.id, 
        data_viagem: viagem.data_viagem,
        destino: viagem.destino,
        cidade: viagem.cidade,
        horario: viagem.horario,
        adolescente: viagem.adolescente,
        observacoes: viagem.observacoes,
        motorista: null,
        educadores: [],
        valorTotal: 0
      };
    }
    
    if (viagem.papel === 'Motorista') {
      grupos[key].motorista = viagem;
    } else {
      // Evita duplicar a mesma pessoa sem querer
      if (!grupos[key].educadores.find((e: any) => e.nome_pessoa === viagem.nome_pessoa)) {
        grupos[key].educadores.push(viagem);
      }
    }
    
    grupos[key].valorTotal += (viagem.valor || 0);
    
    // Aproveita as informações adicionais se alguém do grupo tiver preenchido
    if (viagem.adolescente && !grupos[key].adolescente) grupos[key].adolescente = viagem.adolescente;
    if (viagem.observacoes && !grupos[key].observacoes) grupos[key].observacoes = viagem.observacoes;
    if (viagem.horario && !grupos[key].horario) grupos[key].horario = viagem.horario;
    if (viagem.cidade && !grupos[key].cidade) grupos[key].cidade = viagem.cidade;
  });
  
  return Object.values(grupos).sort((a: any, b: any) => {
    const dateA = new Date(a.data_viagem).getTime();
    const dateB = new Date(b.data_viagem).getTime();
    if (dateA !== dateB) return dateB - dateA;
    return b.id - a.id; 
  });
};

export default function Home() {
  const [plantoes, setPlantoes] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [equipeTecnica, setEquipeTecnica] = useState<any[]>([]);
  const [relatorioGeral, setRelatorioGeral] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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
      setLoading(false);
    }
    carregar();
    // Atualiza automaticamente a cada 30 segundos
    const intervalo = setInterval(carregar, 30000);
    return () => clearInterval(intervalo);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
        <p className="font-black text-slate-500 uppercase tracking-[0.3em] text-xs animate-pulse">Carregando Portal...</p>
      </div>
    );
  }

  const viagensAgrupadasGeral = agruparViagens(relatorioGeral);
  const ultimasViagensAgrupadas = viagensAgrupadasGeral.slice(0, 3); 

  const hojeObj = new Date();
  const diaHoje = hojeObj.getDate().toString().padStart(2, '0');
  const diaHojeSimples = hojeObj.getDate().toString();

  const relatorioFiltrado = viagensAgrupadasGeral.filter(grupo => {
    const termoBusca = filtroNome.toLowerCase();
    
    const matchMotorista = grupo.motorista && grupo.motorista.nome_pessoa.toLowerCase().includes(termoBusca);
    const matchEducador = grupo.educadores.some((ed: any) => 
      ed.nome_pessoa.toLowerCase().includes(termoBusca) || ed.equipe.toLowerCase().includes(termoBusca)
    );
    const matchAdolescente = grupo.adolescente && grupo.adolescente.toLowerCase().includes(termoBusca);

    const matchNome = termoBusca === "" || matchMotorista || matchEducador || matchAdolescente;
    const matchData = filtroData === "" || grupo.data_viagem === filtroData;

    return matchNome && matchData;
  });

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-16 font-sans relative overflow-hidden">
      
      {/* MODAL HISTÓRICO GERAL COM FILTROS */}
      {modalHistoricoGeral && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] shadow-2xl overflow-hidden border border-white flex flex-col">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div>
                <h3 className="font-black uppercase tracking-widest text-sm">📜 Histórico Geral de Viagens</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Viagens Completas Agrupadas</p>
              </div>
              <button onClick={() => { setModalHistoricoGeral(false); setFiltroNome(""); setFiltroData(""); }} className="bg-slate-800 hover:bg-red-500 text-white transition-all p-2 rounded-xl">
                <span className="text-xl">✕</span>
              </button>
            </div>
            
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 shadow-inner">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Buscar por Nome / Equipa / Adolescente</label>
                <input type="text" placeholder="Digite para buscar..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} className="w-full mt-1 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm font-medium shadow-sm" />
              </div>
              <div className="sm:w-48">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Filtrar por Data</label>
                <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="w-full mt-1 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm font-medium shadow-sm" />
              </div>
              {(filtroNome || filtroData) && (
                <div className="flex items-end">
                  <button onClick={() => { setFiltroNome(""); setFiltroData(""); }} className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors">Limpar</button>
                </div>
              )}
            </div>

            <div className="p-4 overflow-y-auto bg-slate-50 flex-1">
              <div className="space-y-4">
                {relatorioFiltrado.map((grupo, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                       <div className="flex flex-col gap-2">
                          <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 font-black text-[11px] flex items-center gap-1 w-max">
                            📅 {formatarParaBR(grupo.data_viagem)} {grupo.horario && <span className="opacity-70 ml-1">{grupo.horario}</span>}
                          </span>
                          {grupo.destino && (
                            <span className={`px-2 py-1 rounded w-max text-[9px] font-black uppercase tracking-widest border ${
                              grupo.destino === 'Interior' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                              grupo.destino === 'Viagem SEI' ? 'bg-purple-50 text-purple-600 border-purple-200' : 
                              'bg-blue-50 text-blue-600 border-blue-200'
                            }`}>
                              📍 {grupo.cidade ? `${grupo.cidade} (${grupo.destino})` : grupo.destino}
                            </span>
                          )}
                       </div>
                       {grupo.adolescente && (
                         <span className="text-[10px] font-bold text-indigo-500 uppercase bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center h-max">
                           👤 Adolescente: {grupo.adolescente}
                         </span>
                       )}
                    </div>
                    
                    {/* BLOCO ÚNICO MOSTRANDO MOTORISTA E EQUIPE LADO A LADO */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-100">
                         <span className="text-[10px] font-black uppercase text-amber-600 mb-1 flex items-center gap-1">🚗 Motorista Responsável</span>
                         <p className="font-black text-slate-800 text-[15px]">{grupo.motorista ? grupo.motorista.nome_pessoa : <span className="text-slate-400 italic font-normal text-xs">Sem motorista vinculado</span>}</p>
                      </div>
                      
                      <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100">
                         <span className="text-[10px] font-black uppercase text-blue-600 mb-2 flex items-center gap-1">👥 Equipe Escalada</span>
                         {grupo.educadores.length > 0 ? (
                           <div className="flex flex-col gap-2 mt-1">
                             {grupo.educadores.map((ed: any, i: number) => {
                               const funcao = ed.equipe === 'Equipe Técnica' ? ed.papel : 'Educador';
                               return (
                                 <div key={i} className="flex items-center gap-2">
                                   <span className="text-xl">{getIconePorPapel(funcao)}</span>
                                   <div>
                                     <p className="font-black text-slate-800 text-[15px] leading-none">{ed.nome_pessoa}</p>
                                     <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{funcao}</span>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         ) : (
                           <span className="text-slate-400 italic text-xs">Sem equipe vinculada</span>
                         )}
                      </div>
                    </div>

                    {grupo.observacoes && (
                       <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                         <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">📝 Observações</span>
                         <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap">{grupo.observacoes}</p>
                       </div>
                    )}
                  </div>
                ))}
                
                {viagensAgrupadasGeral.length > 0 && relatorioFiltrado.length === 0 && (
                   <p className="text-center text-slate-400 py-10 font-bold uppercase text-xs tracking-widest bg-white rounded-2xl border border-slate-200 border-dashed">Nenhum resultado encontrado para estes filtros.</p>
                )}
                
                {viagensAgrupadasGeral.length === 0 && (
                   <p className="text-center text-slate-400 py-10 font-bold uppercase text-xs tracking-widest bg-white rounded-2xl border border-slate-200 border-dashed">O histórico está vazio.</p>
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
              <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">📜 Histórico: {modalHistorico.nome}</h3>
              <button onClick={() => setModalHistorico(null)} className="text-slate-400 hover:text-white transition-colors p-1 bg-slate-800 rounded-lg">✕</button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
               {modalHistorico.servidores
                  .filter((s: any) => s.ultima_viagem)
                  .sort((a: any, b: any) => new Date(b.ultima_viagem).getTime() - new Date(a.ultima_viagem).getTime())
                  .map((s: any, idx: number) => (
                     <div key={s.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors rounded-xl">
                        <div className="flex items-center gap-3 mb-2 sm:mb-0">
                          <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs">{idx + 1}º</span>
                          <span className="font-black text-slate-700">{s.nome}</span>
                        </div>
                        <div className="flex flex-col items-end ml-11 sm:ml-0 gap-1">
                          <span className="text-[11px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                            <span>⏱️</span> {formatarParaBR(s.ultima_viagem)}
                          </span>
                          {s.destino_viagem && (
                            <span className={`text-[9px] font-bold uppercase ${s.destino_viagem === 'Interior' ? 'text-amber-500' : s.destino_viagem === 'Viagem SEI' ? 'text-purple-500' : 'text-blue-500'}`}>📍 {s.destino_viagem}</span>
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
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 inline-block shadow-[0_0_15px_rgba(16,185,129,0.2)]">🛡️ Sistema de Escalas</span>
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-4 tracking-tighter drop-shadow-md">Portal da Transparência</h1>
          <p className="text-slate-400 font-medium md:text-xl max-w-2xl mx-auto leading-relaxed">Acompanhe a fila de viagens, controlo de diárias e folgas do CSIPRC em tempo real.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-20 mt-[-4rem] space-y-10">
        
        <section className="space-y-4">
          <div className="flex justify-center">
            <button onClick={() => setModalHistoricoGeral(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 py-4 rounded-2xl shadow-xl transition-all hover:-translate-y-1 flex items-center gap-3 border border-slate-700">
              <span>📜 Ver Histórico Geral / Buscar</span>
            </button>
          </div>

          {/* TELA DE PREVISÃO COM O VISUAL UNIFICADO (Card Único) */}
          {ultimasViagensAgrupadas.length > 0 && (
            <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-indigo-900/10 border border-white overflow-hidden transform transition duration-500 hover:shadow-indigo-900/20">
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-5 text-white flex items-center justify-center gap-3">
                <span className="text-3xl animate-bounce">✈️</span>
                <h3 className="font-black uppercase tracking-widest text-sm drop-shadow-md">Últimas Viagens Registadas</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 p-2">
                {ultimasViagensAgrupadas.map((grupo: any, idx: number) => (
                  <div key={idx} className="p-5 flex flex-col hover:bg-slate-50 transition-colors rounded-2xl text-left">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 w-max flex items-center gap-1.5">
                      📅 {formatarParaBR(grupo.data_viagem)} {grupo.horario && `- ${grupo.horario}`}
                    </span>
                    
                    <div className="flex flex-col gap-3 mb-4 flex-1">
                      <div className="flex items-center gap-2 bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                        <span className="text-lg">🚗</span>
                        <p className="font-black text-sm text-slate-800">{grupo.motorista ? grupo.motorista.nome_pessoa : <span className="italic text-slate-400 font-normal">S/ Motorista</span>}</p>
                      </div>
                      
                      <div className="flex items-start gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                        <div className="flex flex-col gap-2">
                           {grupo.educadores.map((ed: any, i: number) => {
                             const funcao = ed.equipe === 'Equipe Técnica' ? ed.papel : 'Educador';
                             return (
                               <div key={i} className="flex items-center gap-2">
                                 <span className="text-lg">{getIconePorPapel(funcao)}</span>
                                 <div className="flex flex-col">
                                   <p className="font-black text-sm text-slate-800 leading-none">{ed.nome_pessoa}</p>
                                   <span className="text-[8px] text-slate-500 uppercase">{funcao}</span>
                                 </div>
                               </div>
                             );
                           })}
                           {grupo.educadores.length === 0 && <p className="text-xs text-slate-400 italic">S/ Equipe vinculada</p>}
                        </div>
                      </div>
                    </div>

                    {grupo.destino && (
                      <span className={`inline-block px-3 py-1.5 rounded-lg w-max text-[10px] font-black uppercase tracking-widest border ${
                        grupo.destino === 'Interior' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                        grupo.destino === 'Viagem SEI' ? 'bg-purple-50 text-purple-600 border-purple-200' : 
                        'bg-blue-50 text-blue-600 border-blue-200'
                      }`}>
                        📍 {grupo.cidade ? grupo.cidade : grupo.destino}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* EQUIPE TÉCNICA */}
        {equipeTecnica && equipeTecnica.length > 0 && (
          <section className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-purple-900/5 border border-white overflow-hidden transform transition duration-500 hover:shadow-2xl">
            <div className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-600 p-5 text-white flex items-center justify-center gap-3">
              <span className="text-3xl">🛠️</span>
              <h3 className="font-black uppercase tracking-widest text-sm drop-shadow-md">Equipe Técnica (Viagens via SEI)</h3>
            </div>
            
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100 uppercase font-black text-[10px] tracking-widest bg-slate-50">
                    <th className="p-4 w-10 text-center">Pos</th>
                    <th className="p-4">Servidor / Função</th>
                    <th className="p-4 text-center pr-8">Última Viagem (SEI)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipeTecnica.map((t: any, idx: number) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm shadow-sm ${idx === 0 ? 'bg-purple-100 text-purple-600 border border-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white text-slate-400 border border-slate-200'}`}>
                          {t.posicao_fila}º
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                           <span className="text-2xl drop-shadow-sm">{getIconePorPapel(t.funcao)}</span>
                           <div>
                              <span className="font-black text-[15px] text-slate-800 block">{t.nome}</span>
                              <span className="text-[10px] text-purple-500 uppercase font-black tracking-widest block mt-0.5">{t.funcao}</span>
                           </div>
                        </div>
                      </td>
                      <td className="p-4 text-center pr-8">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-500">⏱️ {t.ultima_viagem ? formatarParaBR(t.ultima_viagem) : '--/--/----'}</span>
                          {t.destino_viagem && <span className="text-[9px] font-black uppercase text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 mt-1">📍 {t.destino_viagem}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* MOTORISTAS */}
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
                           <span className={`text-[10px] font-black uppercase tracking-wider ${
                             m.destino_viagem === 'Interior' ? 'text-amber-500' : 
                             m.destino_viagem === 'Viagem SEI' ? 'text-purple-500' : 
                             'text-blue-500'
                           }`}>📍 {m.destino_viagem}</span>
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
                  <button onClick={() => setPlantaoExpandido(isExpandido ? null : plantao.id)} className="flex-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black text-[9px] uppercase tracking-widest py-3 rounded-xl transition-colors shadow-sm">{isExpandido ? '▲ Ocultar Fila' : '▼ Ver Fila'}</button>
                  <button onClick={() => setModalHistorico(plantao)} className="flex-1 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-black text-[9px] uppercase tracking-widest py-3 rounded-xl transition-colors shadow-sm">📜 Histórico</button>
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
                                  <span className={`relative w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-sm border ${proximo ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-emerald-500/50 shadow-emerald-500/40' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{s.posicao_fila}º</span>
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className={`font-black text-[15px] md:text-lg tracking-tight flex items-center gap-2 ${proximo ? 'text-emerald-950' : 'text-slate-800'}`}>
                                    <span className="text-xl">{getIconePorPapel('Educador')}</span>
                                    {s.nome}
                                  </p>
                                  {s.is_supervisor === 1 && <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase border border-blue-200">Sup</span>}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100/50"><span>🌴</span> <span className="mt-0.5">{s.data_folga || '--/--'}</span></span>
                                </div>
                              </div>
                            </div>
                            {proximo && (
                              <div className="flex-shrink-0 ml-2">
                                <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span></span>
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