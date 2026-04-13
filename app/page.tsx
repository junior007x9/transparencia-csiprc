"use client";

import { useEffect, useState } from "react";
// Olha a função atualizarDiasPlantao aqui no final da lista 👇
import { getDadosCompletos, registrarViagem, registrarViagemMotorista, atualizarServidor, atualizarMotorista, configurarEscalaAutomatica, atualizarDiasPlantao } from "./actions";

const formatarParaBR = (dataString: string | null) => {
  if (!dataString) return "";
  if (dataString.includes("/")) return dataString; 
  const [ano, mes, dia] = dataString.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

const formatarParaDB = (dataBR: string) => {
  if (!dataBR) return "";
  if (dataBR.includes("-")) return dataBR; 
  const partes = dataBR.split("/");
  if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
  return dataBR;
};

export default function AdminPage() {
  const [plantoes, setPlantoes] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const { plantoes, motoristas } = await getDadosCompletos();
    setPlantoes(plantoes);
    setMotoristas(motoristas);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const handleConfiguracaoInteligente = async () => {
    const mes = prompt("Qual o número do MÊS? (ex: 4 para Abril)");
    const ano = prompt("Qual o ANO? (ex: 2026)");
    const plantaoId = prompt(`Para qual plantão aplicar?\n\n${plantoes.map(p => `${p.id}: ${p.nome}`).join("\n")}`);
    const tipo = confirm("Deseja aplicar dias ÍMPARES? (Clique OK para ÍMPARES, Cancelar para PARES)");

    if (mes && ano && plantaoId) {
      const res = await configurarEscalaAutomatica(parseInt(plantaoId), parseInt(mes), parseInt(ano), tipo ? 'impar' : 'par');
      alert(`✅ Escala gerada com sucesso!\n\nDias definidos: ${res.dias}`);
      carregar();
    }
  };

  const editDataViagemMotorista = async (id: number, atual: string) => {
    const dataAtualBR = formatarParaBR(atual);
    const nova = prompt("Corrigir data da viagem do MOTORISTA (DD/MM/AAAA):", dataAtualBR);
    if (nova !== null) { 
      await atualizarMotorista(id, { ultima_viagem: nova === "" ? null : formatarParaDB(nova) }); 
      carregar(); 
    }
  };

  const limparDataMotorista = async (id: number) => {
    if (confirm("Tem certeza que deseja APAGAR a data da última viagem deste motorista?")) {
      await atualizarMotorista(id, { ultima_viagem: null });
      carregar();
    }
  };

  const editDataViagem = async (id: number, atual: string) => {
    const dataAtualBR = formatarParaBR(atual);
    const nova = prompt("Corrigir data da última viagem (DD/MM/AAAA):", dataAtualBR);
    if (nova !== null) { 
      await atualizarServidor(id, { ultima_viagem: nova === "" ? null : formatarParaDB(nova) }); 
      carregar(); 
    }
  };

  const limparDataServidor = async (id: number) => {
    if (confirm("Tem certeza que deseja APAGAR a data da última viagem deste servidor?")) {
      await atualizarServidor(id, { ultima_viagem: null });
      carregar();
    }
  };

  const handleEditNome = async (id: number, atual: string) => {
    const novo = prompt("Corrigir nome do servidor:", atual);
    if (novo) { await atualizarServidor(id, { nome: novo }); carregar(); }
  };

  const handleEditFolga = async (id: number, atual: string) => {
    const nova = prompt("Corrigir data da folga (ex: 15/04):", atual || "");
    if (nova !== null) { await atualizarServidor(id, { data_folga: nova === "" ? null : nova }); carregar(); }
  };

  const handleTrocarPlantao = async (id: number, atualId: number) => {
    const lista = plantoes.map(p => `${p.id}: ${p.nome}`).join("\n");
    const novoId = prompt(`Mover servidor para qual ID de equipa?\n\n${lista}`, atualId.toString());
    
    if (novoId && parseInt(novoId) !== atualId) {
      await atualizarServidor(id, { plantao_id: parseInt(novoId) });
      carregar();
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
      <div className="w-16 h-16 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin mb-6 relative z-10 shadow-[0_0_30px_rgba(16,185,129,0.3)]"></div>
      <p className="font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 uppercase tracking-[0.3em] text-xs relative z-10 animate-pulse">Sincronizando Central</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 font-sans pb-24 relative selection:bg-emerald-500/30 selection:text-emerald-200">
      
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]"></span>
              </span>
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded">Sistema Online</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter drop-shadow-md">
              Central de Comando
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button 
              onClick={handleConfiguracaoInteligente}
              className="group relative px-6 py-3 font-black text-white rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -translate-x-full skew-x-12"></div>
              <span>⚡ Gerar Escala Mês</span>
            </button>
            <button onClick={carregar} className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2">
              ↻ Sincronizar
            </button>
          </div>
        </header>

        {/* MOTORISTAS */}
        {motoristas && motoristas.length > 0 && (
          <section className="mb-12 bg-slate-900/50 backdrop-blur-xl rounded-[2rem] border border-slate-800/80 overflow-hidden shadow-2xl">
            <div className="p-5 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-amber-500/20 flex items-center gap-3">
              <span className="text-amber-500 text-xl">🚗</span>
              <h3 className="text-amber-500 font-black uppercase text-xs tracking-widest">Revezamento de Motoristas</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800/50">
              {motoristas.map((m: any, idx: number) => (
                <div key={m.id} className="p-6 lg:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-5 w-full">
                    <span className={`w-10 h-10 rounded-xl flex flex-shrink-0 items-center justify-center font-black shadow-inner ${idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-amber-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>{idx + 1}º</span>
                    <div className="w-full">
                      <input 
                        className="w-full bg-transparent border-b border-slate-700 hover:border-slate-500 focus:border-amber-500 font-black text-lg text-white focus:outline-none transition-colors pb-1 placeholder-slate-600" 
                        defaultValue={m.nome} 
                        onBlur={(e) => { atualizarMotorista(m.id, { nome: e.target.value }); carregar(); }} 
                      />
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <p className="text-[11px] text-slate-300 uppercase font-bold flex items-center gap-1 mr-2">
                          ⏱️ Última: <span className="text-slate-400 font-normal">{m.ultima_viagem ? formatarParaBR(m.ultima_viagem) : 'Sem registo'}</span>
                        </p>
                        <button onClick={() => editDataViagemMotorista(m.id, m.ultima_viagem)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 px-2 py-1 rounded text-[9px] uppercase font-black transition-all shadow-sm">
                          ✏️ Corrigir
                        </button>
                        {m.ultima_viagem && (
                          <button onClick={() => limparDataMotorista(m.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-2 py-1 rounded text-[9px] uppercase font-black transition-all shadow-sm" title="Apagar data">
                            🗑️ Apagar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {idx === 0 && (
                    <button onClick={() => registrarViagemMotorista(m.id).then(carregar)} className="w-full xl:w-auto flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-amber-950 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all transform hover:-translate-y-0.5">
                      Confirmar Viagem
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PLANTOES */}
        <div className="space-y-10">
          {plantoes.map((plantao: any) => {
            const ePortaria = plantao.nome.toLowerCase().includes('portaria');
            return (
              <div key={plantao.id} className="bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-slate-800/80 overflow-hidden shadow-2xl">
                
                <div className="p-6 lg:p-8 bg-slate-800/20 flex flex-col md:flex-row md:justify-between md:items-center gap-5 border-b border-slate-800/80 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <div>
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 uppercase tracking-wide flex items-center gap-3">
                      {ePortaria ? '🚪' : '🛡️'} {plantao.nome}
                    </h2>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-2 inline-block">ID Sistema: #{plantao.id}</span>
                  </div>
                  
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-1 flex items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black px-3">Escala:</span>
                    <button onClick={() => {
                      const dias = prompt("Novos dias de escala:", plantao.dias_plantao);
                      if (dias) { atualizarDiasPlantao(plantao.id, dias); carregar(); }
                    }} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold px-4 py-2 rounded-lg text-xs transition-colors border border-slate-700/50">
                      ✏️ {plantao.dias_plantao || 'A definir'}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800/80 uppercase font-black text-[10px] tracking-widest bg-slate-950/30">
                        {!ePortaria && <th className="p-5 lg:p-6 w-16 text-center">Fila</th>}
                        <th className="p-5 lg:p-6">Nome do Servidor</th>
                        <th className="p-5 lg:p-6 text-center">Gestão de Folga</th>
                        {!ePortaria && <th className="p-5 lg:p-6 text-center">Data Última Viagem</th>}
                        {!ePortaria && <th className="p-5 lg:p-6 text-right pr-8">Ação Principal</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {plantao.servidores.map((s: any, idx: number) => {
                        const proximo = idx === 0 && !ePortaria;
                        return (
                          <tr key={s.id} className={`hover:bg-white/[0.02] transition-colors ${proximo ? 'bg-emerald-900/10' : ''}`}>
                            
                            {!ePortaria && (
                              <td className="p-5 lg:p-6 text-center">
                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm shadow-inner ${proximo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700/50'}`}>
                                  {s.posicao_fila}º
                                </span>
                              </td>
                            )}
                            
                            <td className="p-5 lg:p-6">
                              <div className="flex items-center gap-2">
                                <span className={`font-black text-[15px] block transition-colors ${proximo ? 'text-white' : 'text-slate-300'}`}>
                                  {s.nome}
                                </span>
                                <button onClick={() => handleEditNome(s.id, s.nome)} className="text-slate-500 hover:text-emerald-400 transition-colors" title="Corrigir Nome">
                                  ✏️
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {s.is_supervisor === 1 && <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest inline-block">Supervisor</span>}
                                <button onClick={() => handleTrocarPlantao(s.id, plantao.id)} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 px-2 py-0.5 rounded uppercase tracking-widest transition-colors flex items-center gap-1" title="Mover para outra equipa">
                                  🔄 Mover Equipa
                                </button>
                              </div>
                            </td>
                            
                            <td className="p-5 lg:p-6 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <span className={`text-[11px] font-black ${s.data_folga ? "text-red-400" : "text-slate-500"}`}>
                                  🌴 {s.data_folga || 'Não definida'}
                                </span>
                                <div className="flex gap-1">
                                  <button onClick={() => handleEditFolga(s.id, s.data_folga)} className="bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700 px-2 py-1 rounded-lg text-[9px] uppercase tracking-widest transition-colors flex items-center gap-1">
                                    ✏️ Corrigir
                                  </button>
                                  {s.data_folga && (
                                    <button onClick={() => handleEditFolga(s.id, "")} className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 px-2 py-1 rounded-lg text-[9px] uppercase tracking-widest transition-colors" title="Apagar Folga">
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            {!ePortaria && (
                              <td className="p-5 lg:p-6 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-300">
                                    ⏱️ {s.ultima_viagem ? formatarParaBR(s.ultima_viagem) : 'Sem registo'}
                                  </span>
                                  <div className="flex gap-1">
                                    <button onClick={() => editDataViagem(s.id, s.ultima_viagem)} className="bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700 px-2 py-1 rounded-lg text-[9px] uppercase tracking-widest transition-colors flex items-center gap-1">
                                      ✏️ Corrigir
                                    </button>
                                    {s.ultima_viagem && (
                                      <button onClick={() => limparDataServidor(s.id)} className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 px-2 py-1 rounded-lg text-[9px] uppercase tracking-widest transition-colors" title="Apagar Data da Viagem">
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            )}
                            
                            {!ePortaria && (
                              <td className="p-5 lg:p-6 text-right pr-8">
                                {proximo ? (
                                  <button onClick={() => registrarViagem(s.id, plantao.id).then(carregar)} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5 transition-all">
                                    Finalizar Vez
                                  </button>
                                ) : (
                                  <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">Aguardando</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}