"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDadosCompletos, getRelatorioViagens, obterSessaoAtual, fazerLogout } from "./actions";

const formatarParaBR = (dataString: string | null) => {
  if (!dataString) return "";
  if (dataString.includes("/")) return dataString; 
  const [ano, mes, dia] = dataString.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

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
  if (!papel) return 'bg-slate-100 text-slate-600';
  const p = papel.toLowerCase();
  if (p.includes('motorista')) return 'bg-amber-100 text-amber-700';
  if (p.includes('social') || p.includes('assistente')) return 'bg-blue-100 text-blue-700';
  if (p.includes('psic')) return 'bg-purple-100 text-purple-700';
  if (p.includes('enferm') || p.includes('saúde') || p.includes('med')) return 'bg-rose-100 text-rose-700';
  if (p.includes('pedagog')) return 'bg-emerald-100 text-emerald-700';
  if (p.includes('segurança') || p.includes('educador') || p.includes('servidor')) return 'bg-slate-800 text-white'; 
  return 'bg-indigo-100 text-indigo-700'; 
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
  const router = useRouter();
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);
  
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
    const verificarSessao = async () => {
      const sessao = await obterSessaoAtual();
      if (!sessao) {
        router.push("/login");
        return;
      }
      setUsuarioAtual(sessao);
    };
    verificarSessao();
  }, [router]);

  useEffect(() => {
    if (!usuarioAtual) return;

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
  }, [usuarioAtual]);

  if (!usuarioAtual || loadingInicial) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Carregando Sistema...</p>
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

  const lidarComLogout = async () => {
    await fazerLogout();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 flex flex-col">
      
      {/* MODAL HISTÓRICO GERAL */}
      {modalHistoricoGeral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">Pesquisar Histórico</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Busque por viagens, motoristas, educadores ou adolescentes.</p>
              </div>
              <button onClick={() => { setModalHistoricoGeral(false); setFiltroNome(""); setFiltroData(""); }} className="w-10 h-10 bg-white hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors border border-slate-200 shadow-sm">✕</button>
            </div>
            
            <div className="bg-white p-6 flex flex-col sm:flex-row gap-4 border-b border-slate-100">
              <input type="text" placeholder="Nome do servidor ou adolescente..." value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium" />
              <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="w-full sm:w-48 bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium" />
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-4">
              {relatorioFiltrado.map((grupo, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-wrap items-center justify-between mb-4 gap-4 border-b border-slate-100 pb-4">
                     <div className="flex items-center gap-3">
                        <span className="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg text-sm shadow-sm">
                          📅 {formatarParaBR(grupo.data_viagem)} {grupo.horario && <span className="opacity-80 ml-1">- {grupo.horario}</span>}
                        </span>
                        {grupo.destino && (
                          <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-slate-200">
                            📍 {grupo.cidade ? `${grupo.cidade} (${grupo.destino})` : grupo.destino}
                          </span>
                        )}
                     </div>
                     {grupo.adolescente && (
                       <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200">
                         👤 Adolescente: {grupo.adolescente}
                       </span>
                     )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Motorista</h4>
                       <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                         <span className="text-lg">🚗</span> {grupo.motorista ? grupo.motorista.nome_pessoa : <span className="text-slate-400 italic">Não registrado</span>}
                       </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Equipe Integrante</h4>
                       {grupo.educadores.length > 0 ? (
                         <div className="flex flex-col gap-3">
                           {grupo.educadores.map((ed: any, i: number) => (
                             <p key={i} className="text-sm font-bold text-slate-800 flex items-center gap-2">
                               <span className={`w-7 h-7 flex items-center justify-center rounded-lg border ${getCorFundoIcone(ed.equipe === 'Equipe Técnica' ? ed.papel : 'Segurança')}`}>
                                  {getIconePorPapel(ed.equipe === 'Equipe Técnica' ? ed.papel : 'Segurança')}
                               </span> 
                               {ed.nome_pessoa}
                             </p>
                           ))}
                         </div>
                       ) : <p className="text-sm text-slate-400 italic font-medium">Nenhum servidor vinculado</p>}
                    </div>
                  </div>
                </div>
              ))}
              
              {relatorioFiltrado.length === 0 && (
                 <div className="text-center py-12 text-slate-500">
                    <span className="text-5xl block mb-4 opacity-50">🔍</span>
                    <p className="font-bold text-lg">Nenhum registro encontrado.</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTÓRICO INDIVIDUAL (FILA) */}
      {modalHistorico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div>
                <h3 className="font-black text-lg tracking-tight">Histórico da Fila</h3>
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-0.5">{modalHistorico.nome}</p>
              </div>
              <button onClick={() => setModalHistorico(null)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors font-bold">✕</button>
            </div>
            
            <div className="p-4 max-h-[60vh] overflow-y-auto bg-slate-50">
               <ul className="space-y-3">
                 {modalHistorico.servidores
                    .filter((s: any) => s.ultima_viagem)
                    .sort((a: any, b: any) => new Date(b.ultima_viagem).getTime() - new Date(a.ultima_viagem).getTime())
                    .map((s: any, idx: number) => (
                       <li key={s.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 flex items-center justify-center bg-indigo-50 border border-indigo-100 rounded-lg text-sm font-black text-indigo-600">{idx + 1}</span>
                            <span className="font-bold text-slate-800 text-sm">{s.nome}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded inline-block mb-1">{formatarParaBR(s.ultima_viagem)}</p>
                            {s.destino_viagem && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[100px]">📍 {s.destino_viagem}</p>}
                          </div>
                       </li>
                    ))
                 }
               </ul>
               {modalHistorico.servidores.filter((s: any) => s.ultima_viagem).length === 0 && (
                 <div className="text-center py-10">
                   <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Nenhuma viagem registrada.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER PRINCIPAL (DARK THEME) */}
      <header className="bg-slate-900 border-b border-slate-800 pt-6 pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-[-50%] left-[-10%] w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[80px] mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-[-50%] right-[-10%] w-[300px] h-[300px] bg-purple-600/20 rounded-full blur-[80px] mix-blend-screen pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                Sessão Ativa: {usuarioAtual?.nome}
              </span>
            </div>
            {/* NOVO TÍTULO AQUI */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase tracking-tight leading-tight">
              CONTROLE DA ORDEM<br />DE VIAGENS CSIPRC
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setModalHistoricoGeral(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all backdrop-blur-md active:scale-95">
              <span className="text-lg">🔍</span> Histórico
            </button>
            
            {usuarioAtual?.isAdmin && (
              <button onClick={() => router.push('/admin')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/30 border border-indigo-500 active:scale-95">
                <span className="text-lg">⚙️</span> Gestão
              </button>
            )}
            
            <button onClick={lidarComLogout} className="flex items-center gap-2 bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 hover:text-red-400 text-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95">
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (SOBREPONDO O HEADER) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-12 relative z-20 flex-1 w-full flex flex-col gap-10">
        
        {/* VIAGENS RECENTES (CARDS MODERNOS) */}
        {ultimasViagensAgrupadas.length > 0 && (
          <section>
            <div className="flex gap-4 overflow-x-auto pb-6 snap-x hide-scrollbar px-1">
              {ultimasViagensAgrupadas.map((grupo: any, idx: number) => (
                <div key={idx} className="min-w-[300px] w-[300px] bg-white border border-slate-200 p-5 rounded-2xl shadow-xl shadow-slate-200/40 snap-start shrink-0 hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded uppercase tracking-widest">
                      {formatarParaBR(grupo.data_viagem)}
                    </span>
                    {grupo.destino && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[120px]">📍 {grupo.destino}</span>}
                  </div>
                  
                  <div className="flex flex-col gap-2.5">
                    {grupo.motorista && (
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-3 truncate">
                        <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-sm border border-amber-100 shadow-sm">🚗</span> 
                        {grupo.motorista.nome_pessoa}
                      </p>
                    )}
                    {grupo.educadores.slice(0, 2).map((ed: any, i: number) => {
                      const func = ed.equipe === 'Equipe Técnica' ? ed.papel : 'Segurança';
                      return (
                        <p key={i} className="text-sm font-bold text-slate-800 flex items-center gap-3 truncate">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border shadow-sm ${getCorFundoIcone(func)}`}>
                            {getIconePorPapel(func)}
                          </span> 
                          {ed.nome_pessoa}
                        </p>
                      )
                    })}
                    {grupo.educadores.length > 2 && (
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 pl-11">
                        + {grupo.educadores.length - 2} acompanhantes
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NAVEGAÇÃO DE ABAS TIPO PÍLULA */}
        <div className="flex justify-start">
          <div className="bg-white border border-slate-200 p-1.5 rounded-2xl inline-flex gap-1.5 overflow-x-auto max-w-full hide-scrollbar shadow-sm">
            <button 
              onClick={() => setAbaAtiva('plantoes')} 
              className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${abaAtiva === 'plantoes' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              <span className="mr-1">🛡️</span> Plantões
            </button>
            <button 
              onClick={() => setAbaAtiva('motoristas')} 
              className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${abaAtiva === 'motoristas' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              <span className="mr-1">🚗</span> Motoristas
            </button>
            <button 
              onClick={() => setAbaAtiva('tecnica')} 
              className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${abaAtiva === 'tecnica' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              <span className="mr-1">🛠️</span> Técnica
            </button>
          </div>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="pb-12">
          
          {/* ABA 1: PLANTÕES */}
          {abaAtiva === 'plantoes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
              {plantoes.map((plantao: any) => {
                const ePortaria = plantao.nome.toLowerCase().includes('portaria');
                const deServicoHoje = (plantao.dias_plantao || "").includes(diaHoje) || (plantao.dias_plantao || "").includes(diaHojeSimples);
                const isExpandido = plantaoExpandido === plantao.id;

                return (
                  <div key={plantao.id} className={`bg-white rounded-2xl border ${deServicoHoje ? 'border-indigo-400 shadow-lg shadow-indigo-100' : 'border-slate-200 shadow-sm'} overflow-hidden flex flex-col`}>
                    
                    {/* Cabeçalho do Card de Plantão */}
                    <div className={`p-5 sm:p-6 flex justify-between items-start border-b border-slate-100 ${deServicoHoje ? 'bg-indigo-50/30' : ''}`}>
                      <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2 tracking-tight">
                          {ePortaria ? '🚪' : '🛡️'} {plantao.nome}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2">
                           <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded uppercase tracking-widest border border-slate-200">
                             Escala: {plantao.dias_plantao || 'A def.'}
                           </span>
                           {deServicoHoje && !ePortaria && (
                             <span className="text-[10px] font-black text-white bg-emerald-500 px-2 py-1 rounded uppercase tracking-widest shadow-sm flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> Hoje
                             </span>
                           )}
                        </div>
                      </div>
                      <button onClick={() => setModalHistorico(plantao)} className="text-indigo-500 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm" title="Ver Histórico">
                        📜
                      </button>
                    </div>

                    {/* Fila Interna do Plantão (Visual Melhorado) */}
                    <div className="flex-1 p-4 bg-slate-50/50">
                       <div className="space-y-3">
                         {plantao.servidores.slice(0, isExpandido ? undefined : 3).map((s: any, idx: number) => {
                           const proximo = (idx === 0 || idx === 1) && !ePortaria;
                           return (
                             <div key={s.id} className={`p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border ${proximo ? 'border-emerald-200 shadow-sm relative overflow-hidden' : 'border-slate-200'}`}>
                               {proximo && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400"></div>}
                               
                               <div className="flex items-center gap-3">
                                 <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm ${proximo ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                   {s.posicao_fila}º
                                 </span>
                                 <div>
                                   <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                     {s.nome}
                                     {s.is_supervisor === 1 && <span className="text-[9px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-black uppercase">Sup</span>}
                                   </p>
                                   {s.data_folga ? (
                                     <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-1">🌴 Folga: {s.data_folga}</p>
                                   ) : (
                                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{proximo ? '🟢 Pronto para viagem' : '⏳ Aguardando'}</p>
                                   )}
                                 </div>
                               </div>
                               <div className="sm:text-right ml-11 sm:ml-0 bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Última: {s.ultima_viagem ? formatarParaBR(s.ultima_viagem) : 'N/A'}</p>
                                 {s.destino_viagem && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate max-w-[120px]">📍 {s.destino_viagem}</p>}
                               </div>
                             </div>
                           );
                         })}
                       </div>
                       {plantao.servidores.length === 0 && <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest py-6">Fila Vazia</p>}
                    </div>
                    
                    {/* Botão Expandir */}
                    {plantao.servidores.length > 3 && (
                      <div className="p-3 bg-white border-t border-slate-100 text-center">
                        <button onClick={() => setPlantaoExpandido(isExpandido ? null : plantao.id)} className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-lg transition-colors w-full sm:w-auto inline-block">
                          {isExpandido ? '▲ Ocultar Fila' : `▼ Ver todos (${plantao.servidores.length})`}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ABA 2: MOTORISTAS (Grid de Cards) */}
          {abaAtiva === 'motoristas' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in duration-300">
              {motoristas.length === 0 && <p className="col-span-full text-center text-slate-500 py-10 font-bold uppercase tracking-widest text-sm">Nenhum motorista cadastrado.</p>}
              
              {motoristas.map((m: any, idx: number) => (
                <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all relative overflow-hidden flex flex-col">
                  {idx === 0 && <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>}
                  
                  <div className="flex justify-between items-start mb-4 mt-1">
                    <span className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-sm ${idx === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                      {idx + 1}º
                    </span>
                    {idx === 0 && <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest shadow-sm">Na Vez</span>}
                  </div>
                  
                  <h3 className="font-black text-slate-800 text-lg leading-tight mb-2 truncate">{m.nome}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">🚗 Motorista</p>
                  
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-auto">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Viagem</p>
                    <p className="text-sm font-bold text-slate-700">{m.ultima_viagem ? formatarParaBR(m.ultima_viagem) : 'Sem registro'}</p>
                    {m.destino_viagem && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 truncate">📍 {m.destino_viagem}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ABA 3: EQUIPE TÉCNICA (Grid de Cards) */}
          {abaAtiva === 'tecnica' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in duration-300">
              {equipeTecnica.length === 0 && <p className="col-span-full text-center text-slate-500 py-10 font-bold uppercase tracking-widest text-sm">Nenhuma equipe técnica cadastrada.</p>}
              
              {equipeTecnica.map((t: any, idx: number) => {
                const corFundo = getCorFundoIcone(t.funcao);
                return (
                  <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all relative overflow-hidden flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <span className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-sm bg-slate-50 text-slate-500 border border-slate-200">
                        {t.posicao_fila}º
                      </span>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm border ${corFundo}`}>
                         {getIconePorPapel(t.funcao)}
                      </div>
                    </div>
                    
                    <h3 className="font-black text-slate-800 text-lg leading-tight mb-2 truncate">{t.nome}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 inline-block bg-slate-100 border border-slate-200 px-2 py-1 rounded w-max">
                      {t.funcao}
                    </p>
                    
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-auto">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Viagem SEI</p>
                      <p className="text-sm font-bold text-slate-700">{t.ultima_viagem ? formatarParaBR(t.ultima_viagem) : 'Sem registro'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* NOVO RODAPÉ */}
      <footer className="w-full py-6 sm:py-8 text-center bg-slate-900 border-t border-slate-800 mt-auto relative z-10 px-4">
        <p className="text-[10px] sm:text-xs font-black text-slate-400 tracking-[0.2em] uppercase">
          DESENVOLVIDO POR JUNIOR <span className="text-indigo-500 mx-1.5 sm:mx-2 text-base align-middle">•</span> PROGRAMADOR DE SISTEMAS FASE MA
        </p>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}