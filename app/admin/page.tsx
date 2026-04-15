"use client";

import { useEffect, useState } from "react";
import { 
  getDadosCompletos, registrarViagem, registrarViagemDupla, registrarViagemMotorista, 
  atualizarServidor, atualizarMotorista, configurarEscalaAutomatica, atualizarDiasPlantao, 
  corrigirNumeracaoFilas, adicionarServidor, removerServidor, zerarHistoricoViagens, 
  getRelatorioViagens, excluirViagemHistorico, verificarSenhaAdmin, reordenarFila, limparTodoHistorico 
} from "../actions";

const formatarParaBR = (dataString: string | null) => {
  if (!dataString) return "";
  if (dataString.includes("/")) return dataString; 
  const [ano, mes, dia] = dataString.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [plantoes, setPlantoes] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [relatorio, setRelatorio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalViagem, setModalViagem] = useState<any | null>(null);
  const [modalRelatorio, setModalRelatorio] = useState(false);
  const [modalFolga, setModalFolga] = useState<any | null>(null);

  // Campos do Modal de Viagem
  const [viagemData, setViagemData] = useState("");
  const [viagemHora, setViagemHora] = useState("");
  const [viagemAdolescente, setViagemAdolescente] = useState("");
  const [viagemCidade, setViagemCidade] = useState("");
  const [viagemObservacoes, setViagemObservacoes] = useState("");
  
  const [salvandoViagem, setSalvandoViagem] = useState(false);
  const [relatorioGerado, setRelatorioGerado] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { plantoes, motoristas } = await getDadosCompletos();
    const rel = await getRelatorioViagens();
    setPlantoes(plantoes);
    setMotoristas(motoristas);
    setRelatorio(rel);
    setLoading(false);
  };

  useEffect(() => { if (autenticado) carregar(); }, [autenticado]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await verificarSenhaAdmin(senhaInput);
    if (isValid) {
      setAutenticado(true);
      setLoginError("");
    } else {
      setLoginError("Senha incorreta! Tente novamente.");
    }
  };

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center transform transition-all hover:scale-105">
          <div className="text-5xl mb-4 animate-bounce">🔐</div>
          <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Acesso Restrito</h1>
          <p className="text-slate-500 text-xs mb-6 uppercase tracking-widest">Central de Gestão CSIPRC</p>
          <input 
            type="password" 
            placeholder="Digite a senha" 
            className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-4 rounded-xl mb-3 text-center focus:border-emerald-500 focus:outline-none tracking-widest"
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
          />
          {loginError && <p className="text-red-400 text-xs font-bold mb-4 animate-pulse">{loginError}</p>}
          <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/50">
            Entrar no Sistema
          </button>
        </form>
      </div>
    );
  }

  const onDragStart = (e: any, index: number, itemType: string, groupId: number | string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("itemIndex", index);
    e.dataTransfer.setData("itemType", itemType);
    e.dataTransfer.setData("groupId", groupId);
    e.target.style.opacity = "0.4";
  };
  const onDragEnd = (e: any) => { e.target.style.opacity = "1"; };
  const onDragOver = (e: any) => { e.preventDefault(); e.currentTarget.classList.add('bg-slate-800/80'); };
  const onDragLeave = (e: any) => { e.currentTarget.classList.remove('bg-slate-800/80'); };
  const onDrop = async (e: any, dropIndex: number, itemType: string, groupId: number | string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-slate-800/80');
    const dragIndex = Number(e.dataTransfer.getData("itemIndex"));
    const draggedType = e.dataTransfer.getData("itemType");
    const draggedGroup = e.dataTransfer.getData("groupId");

    if (draggedType !== itemType || draggedGroup !== String(groupId) || dragIndex === dropIndex) return;

    if (itemType === 'motorista') {
      const newList = [...motoristas];
      const [removed] = newList.splice(dragIndex, 1);
      newList.splice(dropIndex, 0, removed);
      setMotoristas(newList);
      await reordenarFila('motoristas', newList.map(m => m.id));
    } else {
      const plantoesCopia = [...plantoes];
      const pIndex = plantoesCopia.findIndex(p => p.id === groupId);
      const newList = [...plantoesCopia[pIndex].servidores];
      const [removed] = newList.splice(dragIndex, 1);
      newList.splice(dropIndex, 0, removed);
      plantoesCopia[pIndex].servidores = newList;
      setPlantoes(plantoesCopia);
      await reordenarFila('servidores', newList.map(s => s.id));
    }
    carregar();
  };

  const handleEditTelefone = async (id: number, tipo: 'servidor' | 'motorista', atual: string, nome: string) => {
    const novo = prompt(`Digite o número de WhatsApp de ${nome} (Apenas números com DDD, ex: 99988887777):`, atual || "");
    if (novo !== null) {
      if (tipo === 'servidor') await atualizarServidor(id, { telefone: novo });
      else await atualizarMotorista(id, { telefone: novo });
      carregar();
    }
  };

  const abrirWhatsApp = (telefone: string, nome: string) => {
    const numeroLimpo = telefone.replace(/\D/g, ''); 
    const mensagem = `Olá ${nome}, a sua viagem pelo CSIPRC foi confirmada! Por favor, esteja pronto. 🚀`;
    const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const abrirModalViagem = (tipo: string, id: number, plantaoId?: number, nomeAlvo?: string) => { 
    setModalViagem({ tipo, id, plantaoId, nomeAlvo });
    setViagemData(new Date().toISOString().split('T')[0]);
    setViagemHora(""); 
    setViagemAdolescente(""); 
    setViagemCidade("");
    setViagemObservacoes("");
  };

  const confirmarViagem = async (destino: string) => {
    if (!modalViagem || salvandoViagem) return;
    setSalvandoViagem(true);

    try {
      let result;

      if (modalViagem.tipo === 'motorista') {
        result = await registrarViagemMotorista(modalViagem.id, destino, viagemData, viagemAdolescente, viagemCidade, viagemObservacoes, viagemHora);
      } else if (modalViagem.tipo === 'dupla') {
        result = await registrarViagemDupla(modalViagem.plantaoId!, destino, viagemData, viagemAdolescente, viagemCidade, viagemObservacoes, viagemHora);
      } else if (modalViagem.tipo === 'individual') {
        result = await registrarViagem(modalViagem.id, modalViagem.plantaoId!, destino, viagemData, viagemAdolescente, viagemCidade, viagemObservacoes, viagemHora);
      }
      
      if (result && result.success === false) {
        alert(`❌ ERRO NO BANCO DE DADOS:\n\n${result.error}\n\n⚠️ Provavelmente falta adicionar a coluna 'ultima_viagem' ou 'destino_viagem' no Turso.`);
        setSalvandoViagem(false);
        return;
      }
      
      const [ano, mes, dia] = viagemData.split('-');
      const dataFormatada = `${dia}/${mes}/${ano}`;
      const horaTexto = viagemHora ? ` às ${viagemHora}hs` : '';
      const local = viagemCidade ? `${viagemCidade} (${destino})` : destino;
      
      let msg = `🚐 *COMUNICADO DE VIAGEM - CSIPRC* 🚐\n\n`;
      msg += `📍 *Destino:* ${local}\n`;
      msg += `🗓️ *Data:* ${dataFormatada}${horaTexto}\n`;
      if (viagemAdolescente) msg += `👤 *Adolescente:* ${viagemAdolescente}\n`;
      
      msg += `\n👥 *Equipe Escalonada:*\n↳ ${modalViagem.nomeAlvo}\n`;
      
      if (viagemObservacoes) msg += `\n📝 *Observações:* ${viagemObservacoes}\n`;
      
      // Ajuste de mensagem caso seja Gestão
      msg += `\n💰 *Status:* ${destino === 'Gestão' ? 'Viagem sem custo (Gestão).' : 'Diárias para folha suplementar.'}`;

      setRelatorioGerado(msg);
      setModalViagem(null); 
      await carregar();
    } catch (error) {
      alert("❌ Ocorreu um erro crítico na aplicação. Tente novamente.");
    } finally {
      setSalvandoViagem(false);
    }
  };

  const handleVerRelatorioHistorico = (viagemSelecionada: any) => {
    const companheiros = relatorio.filter(item => 
      item.data_viagem === viagemSelecionada.data_viagem && 
      item.destino === viagemSelecionada.destino && 
      item.cidade === viagemSelecionada.cidade &&
      item.horario === viagemSelecionada.horario
    ).map(item => item.nome_pessoa);

    const nomesEquipe = Array.from(new Set(companheiros)).join(" e ");

    const [ano, mes, dia] = (viagemSelecionada.data_viagem || "").split('T')[0].split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;
    const horaTexto = viagemSelecionada.horario ? ` às ${viagemSelecionada.horario}hs` : '';
    const local = viagemSelecionada.cidade ? `${viagemSelecionada.cidade} (${viagemSelecionada.destino})` : viagemSelecionada.destino;
    
    let msg = `🚐 *COMUNICADO DE VIAGEM - CSIPRC* 🚐\n\n`;
    msg += `📍 *Destino:* ${local}\n`;
    msg += `🗓️ *Data:* ${dataFormatada}${horaTexto}\n`;
    if (viagemSelecionada.adolescente) msg += `👤 *Adolescente:* ${viagemSelecionada.adolescente}\n`;
    
    msg += `\n👥 *Equipe Escalonada:*\n↳ ${nomesEquipe}\n`;
    
    if (viagemSelecionada.observacoes) msg += `\n📝 *Observações:* ${viagemSelecionada.observacoes}\n`;
    
    msg += `\n💰 *Status:* ${viagemSelecionada.destino === 'Gestão' ? 'Viagem sem custo (Gestão).' : 'Diárias para folha suplementar.'}`;

    setRelatorioGerado(msg);
  };

  const handleExcluirRelatorio = async (id: number) => {
    if (confirm("Deseja APAGAR este registo permanentemente do histórico financeiro?")) { await excluirViagemHistorico(id); carregar(); }
  };

  const handleLimparTodoHistorico = async () => {
    if (confirm("⚠️ TEM A CERTEZA ABSOLUTA? Isto vai apagar TODAS as viagens guardadas no histórico permanentemente. Não há como reverter!")) {
      await limparTodoHistorico();
      carregar();
    }
  };

  const salvarNovaFolga = async () => {
    if (!modalFolga || !modalFolga.data) return;
    const [ano, mes, dia] = modalFolga.data.split('-');
    await atualizarServidor(modalFolga.id, { data_folga: `${dia}/${mes}` });
    setModalFolga(null); carregar();
  };

  const limparFolga = async (id: number) => { await atualizarServidor(id, { data_folga: null }); carregar(); };
  const handleZerarHistorico = async () => { if (confirm("⚠️ Isso apaga a fila inteira. Certeza?")) { await zerarHistoricoViagens(); carregar(); } };
  const handleRepararFilas = async () => { await corrigirNumeracaoFilas(); alert("✅ Fila Reparada!"); carregar(); };
  const handleAdicionarMembro = async (plantaoId: number, plantaoNome: string) => { const nome = prompt(`NOVO EDUCADOR para a equipa ${plantaoNome}:`); if (nome) { await adicionarServidor(plantaoId, nome); carregar(); } };
  const handleRemoverMembro = async (id: number, nome: string) => { if (confirm(`⚠️ REMOVER "${nome}"?`)) { await removerServidor(id); carregar(); } };
  const handleTrocarPlantao = async (id: number, atualId: number) => {
    const lista = plantoes.map(p => `${p.id}: ${p.nome}`).join("\n");
    const novoId = prompt(`ID da nova equipa:\n\n${lista}`, atualId.toString());
    if (novoId && parseInt(novoId) !== atualId) { await atualizarServidor(id, { plantao_id: parseInt(novoId) }); carregar(); }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex justify-center items-center"><div className="w-16 h-16 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div></div>;

  const totalGasto = relatorio.reduce((acc, r) => acc + (r.valor || 0), 0);
  const qtdInterior = relatorio.filter(r => r.destino === 'Interior').length;
  const qtdSLZ = relatorio.filter(r => r.destino === 'São Luís').length;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 font-sans pb-24 relative">
      
      {/* MODAL DE SUCESSO E RESUMO DA DIRETORA */}
      {relatorioGerado && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(16,185,129,0.15)] p-8 text-center transform animate-in zoom-in-95 duration-200">
            <div className="text-6xl mb-4 animate-bounce">📋</div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">Mensagem Pronta!</h3>
            <p className="text-slate-400 text-sm mb-6">Abaixo está o resumo da viagem gerado para você copiar e enviar à direção.</p>
            
            <textarea 
              readOnly
              value={relatorioGerado} 
              className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs sm:text-sm p-4 rounded-xl focus:outline-none min-h-[220px] mb-6 resize-none shadow-inner" 
            />

            <div className="flex gap-3">
              <button onClick={() => setRelatorioGerado(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors">Fechar</button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(relatorioGerado);
                  alert("📋 Mensagem copiada com sucesso! Abra o WhatsApp e cole.");
                  setRelatorioGerado(null);
                }} 
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2"
              >
                📋 Copiar Mensagem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VIAGEM */}
      {modalViagem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-6 text-center">
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Registrar Viagem {modalViagem.nomeAlvo ? `- ${modalViagem.nomeAlvo}` : ''}</h3>
            <p className="text-slate-400 text-sm mb-4">Preencha os dados (pode escolher datas futuras para pré-aviso).</p>
            
            <div className="flex flex-col gap-3 mb-5 text-left max-h-[50vh] overflow-y-auto px-1">
              <div className="flex gap-3">
                <div className="flex-[2]">
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Data</label>
                  <input type="date" value={viagemData} onChange={(e) => setViagemData(e.target.value)} disabled={salvandoViagem} className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-3 rounded-xl focus:border-emerald-500 focus:outline-none disabled:opacity-50" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Hora (Opc.)</label>
                  <input type="time" value={viagemHora} onChange={(e) => setViagemHora(e.target.value)} disabled={salvandoViagem} className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-3 rounded-xl focus:border-emerald-500 focus:outline-none disabled:opacity-50" />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Nome do Adolescente (Opcional)</label>
                <input type="text" placeholder="Ex: João da Silva" value={viagemAdolescente} onChange={(e) => setViagemAdolescente(e.target.value)} disabled={salvandoViagem} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl focus:border-emerald-500 focus:outline-none disabled:opacity-50" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Cidade Destino (Opcional)</label>
                <input type="text" placeholder="Ex: Coelho Neto" value={viagemCidade} onChange={(e) => setViagemCidade(e.target.value)} disabled={salvandoViagem} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl focus:border-emerald-500 focus:outline-none disabled:opacity-50" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Observações (Opcional)</label>
                <textarea placeholder="Alguma informação extra ou nota..." value={viagemObservacoes} onChange={(e) => setViagemObservacoes(e.target.value)} disabled={salvandoViagem} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl focus:border-emerald-500 focus:outline-none min-h-[80px] disabled:opacity-50" />
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-6 mt-2">
              <button onClick={() => confirmarViagem('Interior')} disabled={salvandoViagem} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${salvandoViagem ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 text-amber-400'}`}>
                {salvandoViagem ? '⏳ SALVANDO...' : <>📍 Interior <span className="text-xs ml-2 opacity-70">(R$ 320,00)</span></>}
              </button>
              
              <button onClick={() => confirmarViagem('São Luís')} disabled={salvandoViagem} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${salvandoViagem ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/50 text-blue-400'}`}>
                {salvandoViagem ? '⏳ SALVANDO...' : <>📍 São Luís <span className="text-xs ml-2 opacity-70">(R$ 640,00)</span></>}
              </button>

              {/* NOVO BOTÃO DE GESTÃO (ROXO) */}
              <button onClick={() => confirmarViagem('Gestão')} disabled={salvandoViagem} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${salvandoViagem ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/50 text-purple-400'}`}>
                {salvandoViagem ? '⏳ SALVANDO...' : <>🏢 Viagem de Gestão <span className="text-xs ml-2 opacity-70">(Sem custo)</span></>}
              </button>
            </div>
            <button onClick={() => setModalViagem(null)} disabled={salvandoViagem} className="text-slate-500 hover:text-white uppercase font-bold text-xs tracking-widest disabled:opacity-50">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL DE FOLGA */}
      {modalFolga && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center">
            <h3 className="text-xl font-black text-white mb-4 uppercase tracking-wide">📅 Selecionar Folga</h3>
            <input type="date" className="w-full bg-slate-800 border border-slate-600 text-white p-3 rounded-xl mb-6" value={modalFolga.data || ""} onChange={(e) => setModalFolga({...modalFolga, data: e.target.value})} />
            <div className="flex gap-3">
              <button onClick={() => setModalFolga(null)} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Cancelar</button>
              <button onClick={salvarNovaFolga} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO RELATÓRIO DE GASTOS */}
      {modalRelatorio && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-7xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-slate-950 p-6 flex flex-col sm:flex-row justify-between items-center border-b border-slate-800 gap-4">
              <h3 className="font-black text-xl text-white uppercase tracking-widest">📊 Dashboard Financeiro</h3>
              <div className="flex items-center gap-3">
                <button onClick={handleLimparTodoHistorico} className="bg-red-900/40 hover:bg-red-600 border border-red-500/50 text-red-100 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                  🗑️ Apagar Tudo
                </button>
                <button onClick={() => setModalRelatorio(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors">
                  ✕ Fechar
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-slate-900 border-b border-slate-800">
              <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-2xl flex flex-col justify-center text-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Gasto Total Global</span>
                <span className="text-3xl font-black text-emerald-400">R$ {totalGasto.toFixed(2)}</span>
              </div>
              <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-2xl flex flex-col justify-center text-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Viagens Interior</span>
                <span className="text-3xl font-black text-amber-400">{qtdInterior} <span className="text-sm">viagens</span></span>
                <span className="text-xs text-amber-500/70 mt-1">Gasto: R$ {(qtdInterior * 320).toFixed(2)}</span>
              </div>
              <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-2xl flex flex-col justify-center text-center">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Viagens São Luís</span>
                <span className="text-3xl font-black text-blue-400">{qtdSLZ} <span className="text-sm">viagens</span></span>
                <span className="text-xs text-blue-500/70 mt-1">Gasto: R$ {(qtdSLZ * 640).toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800 uppercase font-black text-[10px] tracking-widest">
                    <th className="p-4">Data/Hora</th>
                    <th className="p-4">Nome</th>
                    <th className="p-4">Adolescente</th>
                    <th className="p-4">Cidade</th>
                    <th className="p-4">Observações</th>
                    <th className="p-4">Equipa/Papel</th>
                    <th className="p-4">Destino</th>
                    <th className="p-4 text-right">Valor Pago</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {relatorio.map((r, i) => (
                    <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 text-slate-400">
                        {formatarParaBR(r.data_viagem)}
                        {r.horario && <span className="text-xs block text-slate-500">{r.horario}</span>}
                      </td>
                      <td className="p-4 text-white font-bold">{r.nome_pessoa}</td>
                      <td className="p-4 text-slate-300">{r.adolescente || '-'}</td>
                      <td className="p-4 text-slate-300">{r.cidade || '-'}</td>
                      <td className="p-4 text-slate-400 text-[10px] max-w-[120px] truncate" title={r.observacoes}>{r.observacoes || '-'}</td>
                      <td className="p-4 text-slate-500 text-xs">{r.equipe} ({r.papel})</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                          r.destino === 'Interior' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 
                          r.destino === 'Gestão' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 
                          'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          {r.destino}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-emerald-400">R$ {r.valor?.toFixed(2)}</td>
                      <td className="p-4 flex items-center justify-center gap-2">
                        <button onClick={() => handleVerRelatorioHistorico(r)} className="bg-blue-900/30 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-xs transition-colors" title="Ver Mensagem Pronta">👁️ Ver</button>
                        <button onClick={() => handleExcluirRelatorio(r.id)} className="bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-lg text-xs transition-colors" title="Apagar erro">🗑️ Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {relatorio.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-500">Nenhuma viagem registada no histórico.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded">Acesso Seguro</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter drop-shadow-md">Central de Comando</h1>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button onClick={() => setModalRelatorio(true)} className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/50 text-indigo-300 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">📊 Ver Dashboard</button>
            <button onClick={handleZerarHistorico} className="bg-red-900/40 hover:bg-red-600/60 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">⚠️ Zerar Tudo</button>
            <button onClick={handleRepararFilas} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all">🛠️ Organizar Fila</button>
            <button onClick={() => {setAutenticado(false); setSenhaInput("");}} className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all">🚪 Sair</button>
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
                      <p className="font-black text-lg text-white block">{m.nome}</p>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <button onClick={() => handleEditTelefone(m.id, 'motorista', m.telefone, m.nome)} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 px-2 py-1.5 rounded uppercase font-bold transition-colors">
                          {m.telefone ? '📱 Editar Tel' : '📱 Add Tel'}
                        </button>
                        {m.telefone && (
                          <button onClick={() => abrirWhatsApp(m.telefone, m.nome)} className="text-[9px] bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 px-3 py-1.5 rounded uppercase font-black hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 shadow-sm">
                            💬 WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {idx === 0 && (
                    <button onClick={() => abrirModalViagem('motorista', m.id, undefined, m.nome)} className="w-full xl:w-auto flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-amber-950 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all">
                      Confirmar Viagem / Pré-aviso
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-slate-500 mb-6 uppercase tracking-widest flex items-center gap-2">💡 Dica: Pode segurar e arrastar <span className="text-slate-300 text-base">☰</span> qualquer membro para reordenar a fila manualmente.</p>

        {/* EQUIPAS (PLANTOES) COM ARRASTAR E SOLTAR */}
        <div className="grid grid-cols-1 gap-8">
          {plantoes.map((plantao: any) => {
            const ePortaria = plantao.nome.toLowerCase().includes('portaria');
            const nomeDupla = plantao.servidores.length >= 2 ? `${plantao.servidores[0].nome} e ${plantao.servidores[1].nome}` : 'Dupla Atual';

            return (
              <div key={plantao.id} className="bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-slate-800/80 overflow-hidden shadow-2xl mb-4">
                <div className="p-6 lg:p-8 bg-slate-800/20 flex flex-col md:flex-row md:justify-between md:items-center gap-5 border-b border-slate-800/80 relative">
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 uppercase tracking-wide flex items-center gap-3">
                    {ePortaria ? '🚪' : '🛡️'} {plantao.nome}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => handleAdicionarMembro(plantao.id, plantao.nome)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all">➕ Add Membro</button>
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800/80 uppercase font-black text-[10px] tracking-widest bg-slate-950/30">
                        <th className="p-4 w-10 text-center">Pos</th>
                        <th className="p-4">Nome do Servidor</th>
                        <th className="p-4 text-center">Folga</th>
                        <th className="p-4 text-center">Último Destino/Aviso</th>
                        <th className="p-4 text-right pr-8">
                          {!ePortaria && plantao.servidores.length >= 2 && (
                            <button onClick={() => abrirModalViagem('dupla', 0, plantao.id, nomeDupla)} className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 text-white px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.4)]">✈️ Viagem da Dupla</button>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {plantao.servidores.map((s: any, idx: number) => (
                        <tr 
                          key={s.id} 
                          draggable 
                          onDragStart={(e) => onDragStart(e, idx, 'servidor', plantao.id)}
                          onDragEnd={onDragEnd}
                          onDragOver={onDragOver}
                          onDragLeave={onDragLeave}
                          onDrop={(e) => onDrop(e, idx, 'servidor', plantao.id)}
                          className={`hover:bg-white/[0.05] transition-colors cursor-grab active:cursor-grabbing ${idx === 0 || idx === 1 ? (!ePortaria ? 'bg-blue-900/10' : '') : ''}`}
                        >
                          <td className="p-4 text-center flex items-center justify-center gap-2">
                            <span className="text-slate-600 text-lg cursor-grab hover:text-white transition-colors">☰</span>
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm bg-slate-800 text-slate-500 border border-slate-700/50">{s.posicao_fila}º</span>
                          </td>
                          <td className="p-4">
                            <span className="font-black text-[15px] text-white block">{s.nome}</span>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <button onClick={() => handleEditTelefone(s.id, 'servidor', s.telefone, s.nome)} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 px-2 py-1 rounded uppercase font-bold transition-colors">
                                {s.telefone ? '📱 Editar Tel' : '📱 Add Tel'}
                              </button>
                              {s.telefone && (
                                <button onClick={() => abrirWhatsApp(s.telefone, s.nome)} className="text-[9px] bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 px-2 py-1 rounded uppercase font-black hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 shadow-sm">
                                  💬 WhatsApp
                                </button>
                              )}
                              <span className="w-px h-3 bg-slate-700 mx-1"></span>
                              <button onClick={() => handleTrocarPlantao(s.id, plantao.id)} className="text-[9px] text-slate-500 hover:text-slate-300 uppercase font-bold">🔄 Mover</button>
                              <button onClick={() => handleRemoverMembro(s.id, s.nome)} className="text-[9px] text-red-500/70 hover:text-red-400 uppercase font-bold">🗑️ Apagar</button>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-[11px] font-black px-2 py-0.5 rounded ${s.data_folga ? "text-emerald-400" : "text-slate-500"}`}>🌴 {s.data_folga || 'Não def'}</span>
                              <div className="flex gap-1">
                                <button onClick={() => setModalFolga({id: s.id, data: ''})} className="text-slate-500 hover:text-white text-[9px] uppercase tracking-widest font-bold">📅 Definir</button>
                                {s.data_folga && <button onClick={() => limparFolga(s.id)} className="text-red-500 hover:text-red-400 text-[9px] font-bold">🗑️</button>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {!ePortaria && (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[11px] font-bold text-slate-300">⏱️ {s.ultima_viagem ? formatarParaBR(s.ultima_viagem) : '--/--/----'}</span>
                                {s.destino_viagem && (
                                  <span className={`text-[9px] font-black uppercase ${
                                    s.destino_viagem === 'Interior' ? 'text-amber-400' : 
                                    s.destino_viagem === 'Gestão' ? 'text-purple-400' : 
                                    'text-blue-400'
                                  }`}>📍 {s.destino_viagem}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right pr-8">
                            {!ePortaria && <button onClick={() => abrirModalViagem('individual', s.id, plantao.id, s.nome)} className="bg-emerald-900/40 hover:bg-emerald-600/60 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-sm transition-all">✈️ Pre-aviso / Viagem</button>}
                          </td>
                        </tr>
                      ))}
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