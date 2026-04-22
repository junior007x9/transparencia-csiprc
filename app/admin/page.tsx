"use client";

import { useEffect, useState } from "react";
import { 
  getDadosCompletos, registrarViagem, registrarViagemDupla, registrarViagemMotorista, 
  atualizarServidor, atualizarMotorista, configurarEscalaAutomatica, atualizarDiasPlantao, 
  corrigirNumeracaoFilas, adicionarServidor, removerServidor, zerarHistoricoViagens, 
  getRelatorioViagens, excluirViagemHistorico, verificarSenhaAdmin, reordenarFila, limparTodoHistorico,
  adicionarEquipeTecnica, removerEquipeTecnica, atualizarEquipeTecnica, registrarViagemEquipeTecnica,
  editarViagemHistorico
} from "../actions";

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

const agruparViagens = (viagens: any[]) => {
  const grupos: Record<string, any> = {};
  
  viagens.forEach(viagem => {
    const cidadeFormatada = viagem.cidade ? viagem.cidade.toLowerCase().trim() : '';
    const key = `${viagem.data_viagem}_${viagem.destino}_${cidadeFormatada}`;
    
    if (!grupos[key]) {
      grupos[key] = {
        id_referencia: viagem.id, 
        ids_para_excluir: [], 
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
    
    grupos[key].ids_para_excluir.push(viagem.id);
    
    if (viagem.papel === 'Motorista') {
      grupos[key].motorista = viagem;
    } else {
      if (!grupos[key].educadores.find((e: any) => e.nome_pessoa === viagem.nome_pessoa)) {
        grupos[key].educadores.push(viagem);
      }
    }
    
    grupos[key].valorTotal += (viagem.valor || 0);
    
    if (viagem.adolescente && !grupos[key].adolescente) grupos[key].adolescente = viagem.adolescente;
    if (viagem.observacoes && !grupos[key].observacoes) grupos[key].observacoes = viagem.observacoes;
    if (viagem.horario && !grupos[key].horario) grupos[key].horario = viagem.horario;
    if (viagem.cidade && !grupos[key].cidade) grupos[key].cidade = viagem.cidade;
  });
  
  return Object.values(grupos).sort((a: any, b: any) => {
    const dateA = new Date(a.data_viagem).getTime();
    const dateB = new Date(b.data_viagem).getTime();
    if (dateA !== dateB) return dateB - dateA;
    return b.id_referencia - a.id_referencia; 
  });
};

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [plantoes, setPlantoes] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [equipeTecnica, setEquipeTecnica] = useState<any[]>([]);
  const [relatorio, setRelatorio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const hoje = new Date();
  const [filtroMes, setFiltroMes] = useState((hoje.getMonth() + 1).toString().padStart(2, '0'));
  const [filtroAno, setFiltroAno] = useState(hoje.getFullYear().toString());

  const [modalViagem, setModalViagem] = useState<any | null>(null);
  const [modalRelatorio, setModalRelatorio] = useState(false);
  const [modalFolga, setModalFolga] = useState<any | null>(null);
  const [modalEditar, setModalEditar] = useState<any | null>(null);

  const [editDados, setEditDados] = useState({ data_viagem: '', horario: '', cidade: '', adolescente: '', observacoes: '' });

  const [viagemData, setViagemData] = useState("");
  const [viagemHora, setViagemHora] = useState("");
  const [viagemAdolescente, setViagemAdolescente] = useState("");
  const [viagemCidade, setViagemCidade] = useState("");
  const [viagemObservacoes, setViagemObservacoes] = useState("");
  const [viagemSei, setViagemSei] = useState("");
  
  const [motoristaVinculado, setMotoristaVinculado] = useState<string>("");
  const [plantaoVinculado, setPlantaoVinculado] = useState<string>("");
  const [tecnicosVinculados, setTecnicosVinculados] = useState<number[]>([]);

  const [salvandoViagem, setSalvandoViagem] = useState(false);
  const [relatorioGerado, setRelatorioGerado] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { plantoes, motoristas, equipeTecnica } = await getDadosCompletos();
    const rel = await getRelatorioViagens();
    setPlantoes(plantoes);
    setMotoristas(motoristas);
    setEquipeTecnica(equipeTecnica || []);
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
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <form onSubmit={handleLogin} className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center transform transition-all hover:scale-105 relative z-10">
          <div className="text-6xl mb-6 animate-bounce drop-shadow-lg">🔐</div>
          <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Acesso Restrito</h1>
          <p className="text-emerald-400 text-xs mb-8 uppercase tracking-widest font-bold">Central de Gestão CSIPRC</p>
          <input type="password" placeholder="Digite a senha" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)} className="w-full bg-slate-950/50 border border-slate-700 text-white px-5 py-4 rounded-2xl mb-4 text-center focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none tracking-widest font-medium transition-all" />
          {loginError && <p className="text-red-400 text-xs font-bold mb-4 animate-pulse">{loginError}</p>}
          <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-emerald-900/50 active:scale-95 mt-2">Entrar no Sistema</button>
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
    } else if (itemType === 'tecnica') {
      const newList = [...equipeTecnica];
      const [removed] = newList.splice(dragIndex, 1);
      newList.splice(dropIndex, 0, removed);
      setEquipeTecnica(newList);
      await reordenarFila('equipe_tecnica', newList.map(t => t.id));
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

  const handleEditTelefone = async (id: number, tipo: 'servidor' | 'motorista' | 'tecnica', atual: string, nome: string) => {
    const novo = prompt(`Digite o número de WhatsApp de ${nome} (Apenas números com DDD, ex: 99988887777):`, atual || "");
    if (novo !== null) {
      if (tipo === 'servidor') await atualizarServidor(id, { telefone: novo });
      else if (tipo === 'motorista') await atualizarMotorista(id, { telefone: novo });
      else await atualizarEquipeTecnica(id, { telefone: novo });
      carregar();
    }
  };

  const handleEditarFuncao = async (id: number, nome: string, atual: string) => {
    const novaFuncao = prompt(`Editar função/cargo de ${nome}:`, atual || "");
    if (novaFuncao !== null && novaFuncao.trim() !== "") {
      await atualizarEquipeTecnica(id, { funcao: novaFuncao });
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
    setViagemHora(""); setViagemAdolescente(""); setViagemCidade("");
    setViagemObservacoes(""); setViagemSei("");
    setMotoristaVinculado(""); setPlantaoVinculado(""); setTecnicosVinculados([]); 
  };

  const confirmarViagem = async (destino: string) => {
    if (!modalViagem || salvandoViagem) return;
    setSalvandoViagem(true);

    try {
      let obsFinal = viagemObservacoes;
      if (viagemSei.trim() !== '') {
        obsFinal = obsFinal ? `Processo SEI: ${viagemSei} | ${obsFinal}` : `Processo SEI: ${viagemSei}`;
      }

      const nomesEquipeMensagem: string[] = [];

      let motoristaIdToSave = null;
      if (modalViagem.tipo === 'motorista') motoristaIdToSave = modalViagem.id;
      else if (motoristaVinculado) motoristaIdToSave = Number(motoristaVinculado);

      if (motoristaIdToSave) {
         await registrarViagemMotorista(motoristaIdToSave, destino, viagemData, viagemAdolescente, viagemCidade, obsFinal, viagemHora);
         const mObj = motoristas.find(m => m.id === motoristaIdToSave);
         const mNome = mObj ? mObj.nome : modalViagem.nomeAlvo;
         nomesEquipeMensagem.push(`🚗 ${mNome} (Motorista)`);
      }

      let duplaIdToSave = null;
      let individualIdToSave = null;

      if (modalViagem.tipo === 'dupla') duplaIdToSave = modalViagem.plantaoId;
      else if (plantaoVinculado) duplaIdToSave = Number(plantaoVinculado);
      else if (modalViagem.tipo === 'individual') individualIdToSave = modalViagem.id;

      if (duplaIdToSave) {
         await registrarViagemDupla(duplaIdToSave, destino, viagemData, viagemAdolescente, viagemCidade, obsFinal, viagemHora);
         const pObj = plantoes.find(p => p.id === duplaIdToSave);
         if (pObj) {
            const nomes = pObj.servidores.slice(0, 2).map((s:any) => s.nome).join(" e ");
            nomesEquipeMensagem.push(`🛡️ ${nomes} (Segurança)`);
         } else if (modalViagem.tipo === 'dupla') {
            nomesEquipeMensagem.push(`🛡️ ${modalViagem.nomeAlvo} (Segurança)`);
         }
      } else if (individualIdToSave) {
         await registrarViagem(individualIdToSave, modalViagem.plantaoId!, destino, viagemData, viagemAdolescente, viagemCidade, obsFinal, viagemHora);
         nomesEquipeMensagem.push(`🛡️ ${modalViagem.nomeAlvo} (Segurança)`);
      }

      const tecnicosToSave = [...tecnicosVinculados];
      if (modalViagem.tipo === 'tecnica' && !tecnicosToSave.includes(modalViagem.id)) {
          tecnicosToSave.push(modalViagem.id);
      }

      for (const tId of tecnicosToSave) {
         await registrarViagemEquipeTecnica(tId, destino, viagemData, viagemCidade, viagemAdolescente, obsFinal, viagemHora);
         const tObj = equipeTecnica.find(t => t.id === tId);
         const tNome = tObj ? tObj.nome : modalViagem.nomeAlvo;
         const tFunc = tObj ? tObj.funcao : 'Técnico';
         const iconeT = getIconePorPapel(tFunc);
         nomesEquipeMensagem.push(`${iconeT} ${tNome} (${tFunc})`);
      }

      const [ano, mes, dia] = viagemData.split('-');
      const dataFormatada = `${dia}/${mes}/${ano}`;
      const horaTexto = viagemHora ? ` às ${viagemHora}hs` : '';
      const local = viagemCidade ? `${viagemCidade} (${destino})` : destino;
      
      let msg = `🚐 *COMUNICADO DE VIAGEM - CSIPRC* 🚐\n\n`;
      msg += `📍 *Destino:* ${local}\n`;
      msg += `🗓️ *Data:* ${dataFormatada}${horaTexto}\n`;
      if (viagemAdolescente) msg += `👤 *Adolescente:* ${viagemAdolescente}\n`;
      
      const equipeFormatada = nomesEquipeMensagem.map(n => `↳ ${n}`).join('\n');
      msg += `\n👥 *Equipe Escalonada:*\n${equipeFormatada}\n`;
      
      if (obsFinal) msg += `\n📝 *Observações:* ${obsFinal}\n`;
      
      let statusTexto = 'Diárias para folha suplementar.';
      if (destino === 'Viagem SEI' || obsFinal?.includes('Processo SEI:')) {
          statusTexto = 'Viagem sem custo (Registro via SEI).';
      }
      
      msg += `\n💰 *Status:* ${statusTexto}`;

      setRelatorioGerado(msg);
      setModalViagem(null); 
      await carregar();
    } catch (error) {
      alert("❌ Ocorreu um erro crítico na aplicação. Tente novamente.");
    } finally {
      setSalvandoViagem(false);
    }
  };

  const handleVerRelatorioHistorico = (grupoSelecionado: any) => {
    const nomesEquipe = [
      ...(grupoSelecionado.motorista ? [`🚗 ${grupoSelecionado.motorista.nome_pessoa} (Motorista)`] : []),
      ...(grupoSelecionado.educadores.length > 0 ? grupoSelecionado.educadores.map((e: any) => {
        const funcaoCargo = e.equipe === 'Equipe Técnica' ? e.papel : 'Segurança';
        const icone = getIconePorPapel(funcaoCargo);
        return `${icone} ${e.nome_pessoa} (${funcaoCargo})`;
      }) : [])
    ].join("\n↳ ");

    const [ano, mes, dia] = (grupoSelecionado.data_viagem || "").split('T')[0].split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;
    const horaTexto = grupoSelecionado.horario ? ` às ${grupoSelecionado.horario}hs` : '';
    const local = grupoSelecionado.cidade ? `${grupoSelecionado.cidade} (${grupoSelecionado.destino})` : grupoSelecionado.destino;
    
    let msg = `🚐 *COMUNICADO DE VIAGEM - CSIPRC* 🚐\n\n`;
    msg += `📍 *Destino:* ${local}\n`;
    msg += `🗓️ *Data:* ${dataFormatada}${horaTexto}\n`;
    if (grupoSelecionado.adolescente) msg += `👤 *Adolescente:* ${grupoSelecionado.adolescente}\n`;
    
    msg += `\n👥 *Equipe Escalonada:*\n↳ ${nomesEquipe}\n`;
    
    if (grupoSelecionado.observacoes) msg += `\n📝 *Observações:* ${grupoSelecionado.observacoes}\n`;
    
    let statusTexto = 'Diárias para folha suplementar.';
    if (grupoSelecionado.destino === 'Viagem SEI' || grupoSelecionado.observacoes?.includes('Processo SEI:')) {
        statusTexto = 'Viagem sem custo (Registro via SEI).';
    }

    msg += `\n💰 *Status:* ${statusTexto}`;

    setRelatorioGerado(msg);
  };

  // EXPORTAR EXCEL, EDIÇÃO E FUNÇÕES FALTANTES
  const handleSalvarEdicao = async () => {
    if (!modalEditar) return;
    for (const id of modalEditar.ids_para_excluir) {
      await editarViagemHistorico(id, editDados);
    }
    setModalEditar(null);
    carregar();
  };

  const exportarCSV = (historicoFiltrado: any[]) => {
    let csv = "Data;Horario;Destino;Cidade;Adolescente;Motorista;Equipe;Observacoes;Valor(R$)\n";
    historicoFiltrado.forEach(g => {
       const mot = g.motorista ? g.motorista.nome_pessoa : "Nenhum";
       const eqp = g.educadores.map((e:any) => `${e.nome_pessoa} (${e.papel})`).join(" e ");
       const valorFormat = (g.valorTotal || 0).toFixed(2).replace('.', ',');
       const obs = (g.observacoes || "").replace(/"/g, '""').replace(/\n/g, ' ');
       csv += `"${formatarParaBR(g.data_viagem)}";"${g.horario || ""}";"${g.destino}";"${g.cidade || ""}";"${g.adolescente || ""}";"${mot}";"${eqp}";"${obs}";"${valorFormat}"\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); 
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_CSIPRC_${filtroMes}_${filtroAno}.csv`;
    link.click();
  };

  const handleExcluirViagemCompleta = async (ids: number[]) => {
    if (confirm("Deseja APAGAR permanentemente TODO ESSE GRUPO (esta viagem inteira) do histórico?")) { 
      for(const id of ids) { await excluirViagemHistorico(id); }
      carregar(); 
    }
  };

  const handleRemoverPessoaDaViagem = async (idViagem: number, nome: string) => {
    if (confirm(`Deseja remover APENAS "${nome}" deste lançamento de viagem?`)) {
      await excluirViagemHistorico(idViagem);
      carregar();
    }
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
    setModalFolga(null); 
    carregar();
  };

  const limparFolga = async (id: number) => { 
    await atualizarServidor(id, { data_folga: null }); 
    carregar(); 
  };
  
  const handleZerarHistorico = async () => { 
    if (confirm("⚠️ Isso apaga as posições das viagens recentes, zerando a fila. Tem certeza?")) { 
      await zerarHistoricoViagens(); 
      carregar(); 
    } 
  };
  
  const handleRepararFilas = async () => { 
    await corrigirNumeracaoFilas(); 
    alert("✅ Fila Reparada!"); 
    carregar(); 
  };
  
  const handleAdicionarMembro = async (plantaoId: number, plantaoNome: string) => { 
    const nome = prompt(`NOVO AGENTE para a equipa ${plantaoNome}:`); 
    if (nome) { await adicionarServidor(plantaoId, nome); carregar(); } 
  };
  
  const handleRemoverMembro = async (id: number, nome: string) => { 
    if (confirm(`⚠️ REMOVER "${nome}"?`)) { await removerServidor(id); carregar(); } 
  };
  
  const handleTrocarPlantao = async (id: number, atualId: number) => {
    const lista = plantoes.map(p => `${p.id}: ${p.nome}`).join("\n");
    const novoId = prompt(`ID da nova equipa:\n\n${lista}`, atualId.toString());
    if (novoId && parseInt(novoId) !== atualId) { await atualizarServidor(id, { plantao_id: parseInt(novoId) }); carregar(); }
  };

  const handleAdicionarEquipeTecnica = async () => {
    const nome = prompt("Nome do Servidor Técnico:");
    if (!nome) return;
    const funcao = prompt("Função (ex: Assistente Social, Psicólogo, etc):");
    if (!funcao) return;
    await adicionarEquipeTecnica(nome, funcao);
    carregar();
  };
  
  const handleRemoverEquipeTecnica = async (id: number, nome: string) => {
    if (confirm(`⚠️ Remover "${nome}" da Equipe Técnica?`)) {
      await removerEquipeTecnica(id);
      carregar();
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex justify-center items-center"><div className="w-16 h-16 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div></div>;

  const historicoAgrupado = agruparViagens(relatorio);
  
  const historicoFiltrado = historicoAgrupado.filter(grupo => {
    if (!grupo.data_viagem) return false;
    const [anoV, mesV] = grupo.data_viagem.split('-');
    return (filtroMes === 'Todos' || mesV === filtroMes) && (filtroAno === 'Todos' || anoV === filtroAno);
  });

  const totalGasto = historicoFiltrado.reduce((acc, r) => acc + (r.valorTotal || 0), 0);
  const qtdInterior = historicoFiltrado.filter(r => r.destino === 'Interior').length;
  const qtdSLZ = historicoFiltrado.filter(r => r.destino === 'São Luís').length;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 font-sans pb-24 relative overflow-x-hidden selection:bg-emerald-500/30">
      
      {/* EFEITOS DE FUNDO */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-900/20 to-transparent pointer-events-none"></div>
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* MODAL DE SUCESSO E RESUMO */}
      {relatorioGerado && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-[2rem] w-full max-w-md shadow-[0_0_50px_rgba(16,185,129,0.15)] p-8 text-center transform animate-in zoom-in-95 duration-200">
            <div className="text-6xl mb-4 animate-bounce">📋</div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">Mensagem Pronta!</h3>
            <p className="text-slate-400 text-sm mb-6">Abaixo está o resumo da viagem gerado para você copiar e enviar à direção.</p>
            
            <textarea readOnly value={relatorioGerado} className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs sm:text-sm p-4 rounded-xl focus:outline-none min-h-[220px] mb-6 resize-none shadow-inner" />

            <div className="flex gap-3">
              <button onClick={() => setRelatorioGerado(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors">Fechar</button>
              <button onClick={() => { navigator.clipboard.writeText(relatorioGerado); alert("📋 Mensagem copiada com sucesso! Abra o WhatsApp e cole."); setRelatorioGerado(null); }} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2">📋 Copiar Mensagem</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE VIAGEM */}
      {modalEditar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-[2rem] w-full max-w-md shadow-2xl p-6 md:p-8 transform scale-100 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-white mb-1 uppercase tracking-wider flex items-center gap-2"><span className="text-2xl">✏️</span> Editar Viagem</h3>
            <p className="text-xs text-slate-400 mb-6 font-medium">Altere os dados abaixo. As mudanças aplicar-se-ão a todos os membros desta viagem.</p>
            
            <div className="space-y-4 mb-8">
              <div className="flex gap-3">
                <div className="flex-[2]">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Data</label>
                  <input type="date" value={editDados.data_viagem} onChange={e => setEditDados({...editDados, data_viagem: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-inner" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Hora</label>
                  <input type="time" value={editDados.horario} onChange={e => setEditDados({...editDados, horario: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-inner" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Cidade Destino</label>
                <input type="text" value={editDados.cidade} onChange={e => setEditDados({...editDados, cidade: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-inner" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Adolescente</label>
                <input type="text" value={editDados.adolescente} onChange={e => setEditDados({...editDados, adolescente: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-inner" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Observações (SEI etc)</label>
                <textarea value={editDados.observacoes} onChange={e => setEditDados({...editDados, observacoes: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all min-h-[100px] shadow-inner" />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setModalEditar(null)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl uppercase text-xs tracking-widest transition-colors">Cancelar</button>
              <button onClick={handleSalvarEdicao} className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-emerald-900/50 active:scale-95 transition-all">Guardar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VIAGEM UNIFICADO E MELHORADO */}
      {modalViagem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-[2rem] w-full max-w-md shadow-2xl p-6 md:p-8 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">Registrar Viagem</h3>
            <p className="text-emerald-400/80 font-bold text-xs mb-6 uppercase tracking-widest">
              Lançamento: <span className="text-white">{modalViagem.nomeAlvo}</span>
            </p>
            
            <div className="flex flex-col gap-4 mb-6 text-left max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
              
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800 pb-2">1. Composição da Equipe</h4>
                
                {modalViagem.tipo !== 'motorista' && (
                  <div>
                    <label className="text-[10px] uppercase font-black text-amber-500 ml-1">🚗 Incluir Motorista?</label>
                    <select value={motoristaVinculado} onChange={e => setMotoristaVinculado(e.target.value)} disabled={salvandoViagem} className="w-full bg-slate-900 border border-amber-900/30 text-white px-4 py-3 rounded-xl focus:border-amber-500 focus:outline-none mt-1 text-sm font-bold">
                      <option value="">Apenas equipe viaja</option>
                      {motoristas.map((m, idx) => (
                        <option key={m.id} value={m.id}>{m.nome} (Na vez: {idx + 1}º)</option>
                      ))}
                    </select>
                  </div>
                )}

                {modalViagem.tipo !== 'dupla' && modalViagem.tipo !== 'individual' && (
                  <div>
                    <label className="text-[10px] uppercase font-black text-indigo-400 ml-1">🛡️ Incluir Segurança?</label>
                    <select value={plantaoVinculado} onChange={e => setPlantaoVinculado(e.target.value)} disabled={salvandoViagem} className="w-full bg-slate-900 border border-indigo-900/30 text-white px-4 py-3 rounded-xl focus:border-indigo-500 focus:outline-none mt-1 text-sm font-bold">
                      <option value="">Sem plantão</option>
                      {plantoes.map(p => !p.nome.toLowerCase().includes('portaria') && (
                        <option key={p.id} value={p.id}>Equipe: {p.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] uppercase font-black text-purple-400 ml-1">🛠️ Incluir Equipe Técnica?</label>
                  <div className="mt-1 max-h-32 overflow-y-auto space-y-1.5 bg-slate-900 p-3 rounded-xl border border-purple-900/30 shadow-inner">
                    {equipeTecnica.map((t) => {
                      const isPrincipal = modalViagem.tipo === 'tecnica' && modalViagem.id === t.id;
                      return (
                        <label key={t.id} className={`flex items-center gap-3 text-sm cursor-pointer p-1.5 rounded-lg transition-colors ${isPrincipal ? 'text-purple-300 opacity-70 bg-purple-900/20' : 'text-slate-300 hover:bg-slate-800'}`}>
                          <input 
                             type="checkbox" 
                             checked={isPrincipal || tecnicosVinculados.includes(t.id)} 
                             onChange={(e) => {
                                if (isPrincipal) return; 
                                if (e.target.checked) setTecnicosVinculados([...tecnicosVinculados, t.id]);
                                else setTecnicosVinculados(tecnicosVinculados.filter(id => id !== t.id));
                             }}
                             disabled={salvandoViagem || isPrincipal}
                             className="w-4 h-4 rounded border-purple-500 bg-slate-950 text-purple-500" 
                          />
                          <span className="font-bold">{t.nome} {isPrincipal && <span className="text-[9px] uppercase bg-purple-500/20 px-1.5 py-0.5 rounded ml-1">Atual</span>}</span>
                        </label>
                      )
                    })}
                    {equipeTecnica.length === 0 && <span className="text-xs font-bold text-slate-600 block p-2 text-center uppercase tracking-widest">Vazio</span>}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800 pb-2">2. Detalhes</h4>
                
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Nº do Processo SEI (Opcional)</label>
                  <input type="text" placeholder="Ex: 00000.000000/2024-00" value={viagemSei} onChange={(e) => setViagemSei(e.target.value)} disabled={salvandoViagem} className="w-full mt-1 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl focus:border-emerald-500 focus:outline-none" />
                </div>

                <div className="flex gap-3">
                  <div className="flex-[2]">
                    <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Data</label>
                    <input type="date" value={viagemData} onChange={(e) => setViagemData(e.target.value)} disabled={salvandoViagem} className="w-full mt-1 bg-slate-900 border border-slate-700 text-white px-3 py-3 rounded-xl focus:border-emerald-500 focus:outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Hora</label>
                    <input type="time" value={viagemHora} onChange={(e) => setViagemHora(e.target.value)} disabled={salvandoViagem} className="w-full mt-1 bg-slate-900 border border-slate-700 text-white px-3 py-3 rounded-xl focus:border-emerald-500 focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Cidade Destino</label>
                  <input type="text" placeholder="Ex: Coelho Neto" value={viagemCidade} onChange={(e) => setViagemCidade(e.target.value)} disabled={salvandoViagem} className="w-full mt-1 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Adolescente</label>
                  <input type="text" placeholder="Ex: João da Silva" value={viagemAdolescente} onChange={(e) => setViagemAdolescente(e.target.value)} disabled={salvandoViagem} className="w-full mt-1 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 ml-1">Observações</label>
                  <textarea placeholder="Alguma informação extra ou nota..." value={viagemObservacoes} onChange={(e) => setViagemObservacoes(e.target.value)} disabled={salvandoViagem} className="w-full mt-1 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl focus:border-emerald-500 focus:outline-none min-h-[70px]" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mb-5 mt-2">
              <button onClick={() => confirmarViagem('Interior')} disabled={salvandoViagem} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 ${salvandoViagem ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 text-amber-400 shadow-lg shadow-amber-900/20'}`}>
                {salvandoViagem ? '⏳ SALVANDO...' : <>📍 Interior <span className="text-[10px] ml-2 opacity-70 bg-amber-900/50 px-2 py-0.5 rounded">R$ 320,00</span></>}
              </button>
              <button onClick={() => confirmarViagem('São Luís')} disabled={salvandoViagem} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 ${salvandoViagem ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/50 text-blue-400 shadow-lg shadow-blue-900/20'}`}>
                {salvandoViagem ? '⏳ SALVANDO...' : <>📍 São Luís <span className="text-[10px] ml-2 opacity-70 bg-blue-900/50 px-2 py-0.5 rounded">R$ 640,00</span></>}
              </button>
              <button onClick={() => confirmarViagem('Viagem SEI')} disabled={salvandoViagem} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 ${salvandoViagem ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/50 text-purple-400 shadow-lg shadow-purple-900/20'}`}>
                {salvandoViagem ? '⏳ SALVANDO...' : <>📄 Viagem SEI <span className="text-[10px] ml-2 opacity-70 bg-purple-900/50 px-2 py-0.5 rounded">Sem custo</span></>}
              </button>
            </div>
            
            <button onClick={() => setModalViagem(null)} disabled={salvandoViagem} className="w-full text-slate-500 hover:text-white uppercase font-black text-xs tracking-widest py-2 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL DE FOLGA */}
      {modalFolga && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-[2rem] w-full max-w-sm shadow-2xl p-8 text-center animate-in zoom-in-95">
            <h3 className="text-xl font-black text-white mb-6 uppercase tracking-widest">📅 Definir Folga</h3>
            <input type="date" className="w-full bg-slate-950 border border-slate-700 text-white p-4 rounded-xl mb-6 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold" value={modalFolga.data || ""} onChange={(e) => setModalFolga({...modalFolga, data: e.target.value})} />
            <div className="flex gap-3">
              <button onClick={() => setModalFolga(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors">Cancelar</button>
              <button onClick={salvarNovaFolga} className="flex-[1.5] bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD FINANCEIRO E EXPORTAÇÃO */}
      {modalRelatorio && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-[2.5rem] w-full max-w-7xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            
            <div className="bg-slate-950 p-6 md:p-8 border-b border-slate-800 flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center text-xl border border-indigo-500/30">📊</span>
                  <h3 className="font-black text-2xl text-white uppercase tracking-widest">Painel Financeiro</h3>
                </div>
                <p className="text-slate-500 text-sm ml-13 font-medium">Controlo de despesas e exportação de dados.</p>
                
                <div className="flex flex-wrap gap-3 mt-5 ml-13">
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-1 flex items-center">
                    <span className="pl-3 pr-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Mês:</span>
                    <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="bg-transparent text-white pl-1 pr-4 py-2 text-sm font-bold outline-none cursor-pointer">
                      <option value="Todos">Todos</option>
                      <option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option>
                      <option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option>
                      <option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option>
                      <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
                    </select>
                  </div>
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-1 flex items-center">
                    <span className="pl-3 pr-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Ano:</span>
                    <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="bg-transparent text-white pl-1 pr-4 py-2 text-sm font-bold outline-none cursor-pointer">
                      <option value="Todos">Todos</option>
                      <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <button onClick={() => exportarCSV(historicoFiltrado)} className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 active:scale-95">
                  <span className="text-base">📥</span> Exportar Excel
                </button>
                <button onClick={() => setModalRelatorio(false)} className="flex-1 lg:flex-none bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">✕ Fechar</button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 md:p-8 bg-slate-900 border-b border-slate-800">
              <div className="bg-emerald-900/10 border border-emerald-500/20 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-inner">
                <span className="text-emerald-500/70 text-xs font-black uppercase tracking-[0.2em] mb-2">Gasto Total (Filtro)</span>
                <span className="text-4xl font-black text-emerald-400 drop-shadow-md">R$ {totalGasto.toFixed(2)}</span>
              </div>
              <div className="bg-amber-900/10 border border-amber-500/20 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-inner">
                <span className="text-amber-500/70 text-xs font-black uppercase tracking-[0.2em] mb-2">Viagens Interior</span>
                <span className="text-4xl font-black text-amber-400 drop-shadow-md">{qtdInterior} <span className="text-lg opacity-50">vgs</span></span>
              </div>
              <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-2xl flex flex-col justify-center items-center text-center shadow-inner">
                <span className="text-blue-500/70 text-xs font-black uppercase tracking-[0.2em] mb-2">Viagens São Luís</span>
                <span className="text-4xl font-black text-blue-400 drop-shadow-md">{qtdSLZ} <span className="text-lg opacity-50">vgs</span></span>
              </div>
            </div>

            <div className="p-4 md:p-8 overflow-y-auto flex-1 bg-slate-950/50">
              <div className="space-y-4 max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h4 className="text-slate-500 font-bold uppercase tracking-widest text-xs">Listagem Detalhada ({historicoFiltrado.length})</h4>
                  <button onClick={handleLimparTodoHistorico} className="text-red-500/70 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                    <span>⚠️</span> Apagar Tudo
                  </button>
                </div>

                {historicoFiltrado.map((grupo, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-700/50 hover:border-slate-600 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-colors shadow-sm group">
                    
                    <div className="flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-widest shadow-inner border border-slate-700">
                          📅 {formatarParaBR(grupo.data_viagem)} {grupo.horario && <span className="opacity-50 ml-1 font-medium">{grupo.horario}</span>}
                        </span>
                        <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg tracking-widest">
                          📍 {grupo.cidade || grupo.destino}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">🚗 Motorista</span>
                          <p className="text-sm text-slate-200 font-bold">{grupo.motorista ? grupo.motorista.nome_pessoa : <span className="italic text-slate-500">Nenhum</span>}</p>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">👥 Equipe</span>
                          <p className="text-sm text-slate-200 font-bold">{grupo.educadores.map((e:any)=>e.nome_pessoa).join(', ') || <span className="italic text-slate-500">Nenhuma</span>}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-3 w-full md:w-auto border-t border-slate-800 md:border-0 pt-4 md:pt-0">
                      <span className="text-emerald-400 font-black text-2xl bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/10 w-full text-center md:text-right">
                        R$ {grupo.valorTotal?.toFixed(2)}
                      </span>
                      
                      <div className="flex gap-2 w-full">
                        <button onClick={() => handleVerRelatorioHistorico(grupo)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg active:scale-95 flex justify-center items-center">
                          👁️ MSG
                        </button>
                        
                        <button onClick={() => {
                          setEditDados({
                            data_viagem: grupo.data_viagem ? grupo.data_viagem.split('T')[0] : '',
                            horario: grupo.horario || '', cidade: grupo.cidade || '', adolescente: grupo.adolescente || '', observacoes: grupo.observacoes || ''
                          });
                          setModalEditar(grupo);
                        }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg active:scale-95 flex justify-center items-center border border-slate-600">
                          ✏️ Editar
                        </button>
                        
                        <button onClick={async () => {
                          if(confirm("Apagar toda esta viagem do histórico?")){
                            for(const id of grupo.ids_para_excluir) await excluirViagemHistorico(id);
                            carregar();
                          }
                        }} className="flex-none bg-red-900/40 hover:bg-red-600 text-red-200 hover:text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-colors border border-red-500/30 active:scale-95">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {historicoFiltrado.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <span className="text-6xl mb-4">📭</span>
                    <p className="text-xl font-black uppercase tracking-widest text-slate-400">Nenhum Registo</p>
                    <p className="text-sm font-bold text-slate-500 mt-2">Altere os filtros de mês/ano para procurar novamente.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CABEÇALHO DO ADMIN E GRID PRINCIPAL */}
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12 border-b border-slate-800/80 pb-8 pt-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span></span>
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 rounded-md shadow-sm">Modo Gestão Seguro</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter drop-shadow-md">Central CSIPRC</h1>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button onClick={() => setModalRelatorio(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/50 flex items-center gap-2 active:scale-95"><span>📊</span> Dashboard Financeiro</button>
            <button onClick={handleZerarHistorico} className="bg-red-900/40 hover:bg-red-600/80 border border-red-500/50 text-red-100 px-5 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">⚠️ Zerar Listas</button>
            <button onClick={handleRepararFilas} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95">🛠️ Reparar Fila</button>
            <button onClick={() => {setAutenticado(false); setSenhaInput("");}} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95">🚪 Sair</button>
          </div>
        </header>

        {/* EQUIPE TÉCNICA */}
        <section className="mb-12 bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-slate-800/80 overflow-hidden shadow-2xl">
          <div className="p-6 md:p-8 bg-gradient-to-r from-purple-500/10 to-transparent border-b border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/30 rounded-2xl flex items-center justify-center text-2xl shadow-sm">🛠️</div>
              <div>
                <h3 className="text-white font-black uppercase text-lg tracking-wide">Equipe Técnica</h3>
                <p className="text-purple-400 text-[10px] font-bold uppercase tracking-widest mt-1">Registo de Viagens via SEI</p>
              </div>
            </div>
            <button onClick={handleAdicionarEquipeTecnica} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all shadow-lg shadow-purple-900/30 active:scale-95 flex items-center gap-2 w-max"><span>➕</span> Add Servidor</button>
          </div>
          
          <div className="overflow-x-auto w-full p-2">
            <table className="w-full text-left text-sm whitespace-nowrap border-separate border-spacing-y-2">
              <tbody className="">
                {equipeTecnica.length === 0 && (
                  <tr><td colSpan={4} className="p-10 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">Nenhum servidor técnico cadastrado.</td></tr>
                )}
                {equipeTecnica.map((t: any, idx: number) => (
                  <tr 
                    key={t.id} draggable onDragStart={(e) => onDragStart(e, idx, 'tecnica', 'tecnica')}
                    onDragEnd={onDragEnd} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, idx, 'tecnica', 'tecnica')}
                    className="bg-slate-950/50 hover:bg-slate-800 transition-colors cursor-grab active:cursor-grabbing group rounded-2xl"
                  >
                    <td className="p-4 pl-6 text-center flex items-center justify-center gap-3 rounded-l-2xl">
                      <span className="text-slate-600 text-lg cursor-grab hover:text-white transition-colors opacity-50 group-hover:opacity-100">☰</span>
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm shadow-inner ${idx === 0 ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-purple-900/50' : 'bg-slate-900 text-slate-500 border border-slate-700/50'}`}>{t.posicao_fila}º</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-xl shadow-sm">{getIconePorPapel(t.funcao)}</div>
                         <div>
                            <span className="font-black text-base text-white block tracking-tight">{t.nome}</span>
                            <span className="text-[9px] text-purple-400 uppercase font-black tracking-widest bg-purple-500/10 px-2 py-0.5 rounded mt-1 inline-block">{t.funcao}</span>
                         </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3 ml-13">
                        <button onClick={() => handleEditTelefone(t.id, 'tecnica', t.telefone, t.nome)} className="text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1.5 rounded uppercase font-bold transition-colors shadow-sm">{t.telefone ? '📱 Editar Tel' : '📱 Add Tel'}</button>
                        <button onClick={() => handleEditarFuncao(t.id, t.nome, t.funcao)} className="text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1.5 rounded uppercase font-bold transition-colors shadow-sm">✏️ Editar Função</button>
                        {t.telefone && <button onClick={() => abrirWhatsApp(t.telefone, t.nome)} className="text-[9px] bg-emerald-900/20 text-emerald-400 border border-emerald-900/30 px-2.5 py-1.5 rounded uppercase font-black hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 shadow-sm">💬 WhatsApp</button>}
                        <span className="w-px h-4 bg-slate-800 mx-1"></span>
                        <button onClick={() => handleRemoverEquipeTecnica(t.id, t.nome)} className="text-[9px] text-red-500/50 hover:text-red-400 uppercase font-bold transition-colors">🗑️ Apagar</button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1.5 bg-slate-900 py-2 px-4 rounded-xl border border-slate-800 w-max mx-auto">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">⏱️ Última Viagem</span>
                        <span className="text-xs font-bold text-white">{t.ultima_viagem ? formatarParaBR(t.ultima_viagem) : '--/--/----'}</span>
                        {t.destino_viagem && <span className="text-[9px] font-black uppercase text-purple-400 tracking-widest mt-0.5">📍 {t.destino_viagem}</span>}
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right rounded-r-2xl">
                      <button onClick={() => abrirModalViagem('tecnica', t.id, undefined, t.nome)} className="bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-sm transition-all active:scale-95 border border-white/10">📄 Lançar SEI</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* MOTORISTAS */}
        {motoristas && motoristas.length > 0 && (
          <section className="mb-12 bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-slate-800/80 overflow-hidden shadow-2xl">
            <div className="p-6 md:p-8 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-amber-500/20 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center text-2xl shadow-sm">🚗</div>
              <div>
                <h3 className="text-white font-black uppercase text-lg tracking-wide">Motoristas</h3>
                <p className="text-amber-500 text-[10px] font-bold uppercase tracking-widest mt-1">Fila de Revezamento</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800/50">
              {motoristas.map((m: any, idx: number) => (
                <div key={m.id} className="p-6 lg:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-5 w-full">
                    <div className="relative">
                      {idx === 0 && <div className="absolute inset-0 bg-amber-500 rounded-2xl animate-ping opacity-20"></div>}
                      <span className={`relative w-14 h-14 rounded-2xl flex flex-shrink-0 items-center justify-center font-black text-xl shadow-inner ${idx === 0 ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-900/50' : 'bg-slate-900 text-slate-500 border border-slate-700'}`}>{idx + 1}º</span>
                    </div>
                    <div className="w-full">
                      <div className="flex items-center gap-3 mb-1">
                        <p className={`font-black text-xl tracking-tight block ${idx === 0 ? 'text-amber-100' : 'text-white'}`}>{m.nome}</p>
                        {idx === 0 && <span className="text-[8px] bg-amber-500 text-white px-2 py-0.5 rounded-md font-black uppercase tracking-widest shadow-sm">Na Vez</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <button onClick={() => handleEditTelefone(m.id, 'motorista', m.telefone, m.nome)} className="text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1.5 rounded-lg uppercase font-bold transition-colors shadow-sm">{m.telefone ? '📱 Editar Tel' : '📱 Add Tel'}</button>
                        {m.telefone && <button onClick={() => abrirWhatsApp(m.telefone, m.nome)} className="text-[9px] bg-emerald-900/20 text-emerald-400 border border-emerald-900/30 px-3 py-1.5 rounded-lg uppercase font-black hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 shadow-sm">💬 WhatsApp</button>}
                      </div>
                    </div>
                  </div>
                  {idx === 0 && <button onClick={() => abrirModalViagem('motorista', m.id, undefined, m.nome)} className="w-full xl:w-auto flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-amber-950 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-900/30 transition-all active:scale-95">Lançar Viagem</button>}
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-[10px] text-slate-500 mb-6 uppercase tracking-widest flex items-center gap-2 font-bold bg-slate-900/50 w-max px-4 py-2 rounded-xl border border-slate-800">
          💡 Dica: Arraste pelo ícone <span className="text-slate-300 text-sm mx-1">☰</span> para reordenar as filas manualmente.
        </p>

        {/* EQUIPAS (PLANTOES) */}
        <div className="grid grid-cols-1 gap-8">
          {plantoes.map((plantao: any) => {
            const ePortaria = plantao.nome.toLowerCase().includes('portaria');
            const nomeDupla = plantao.servidores.length >= 2 ? `${plantao.servidores[0].nome} e ${plantao.servidores[1].nome}` : 'Dupla Atual';

            return (
              <div key={plantao.id} className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-slate-800/80 overflow-hidden shadow-2xl mb-4">
                
                <div className={`p-6 lg:p-8 flex flex-col md:flex-row md:justify-between md:items-center gap-5 border-b border-slate-800/80 relative ${ePortaria ? 'bg-gradient-to-r from-blue-900/20 to-transparent' : 'bg-gradient-to-r from-emerald-900/10 to-transparent'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm border ${ePortaria ? 'bg-blue-500/20 border-blue-500/30' : 'bg-emerald-500/20 border-emerald-500/30'}`}>
                      {ePortaria ? '🚪' : '🛡️'}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">{plantao.nome}</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Escala: {plantao.dias_plantao || 'Não def.'}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => handleAdicionarMembro(plantao.id, plantao.nome)} className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-5 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all active:scale-95">➕ Add Educador</button>
                    {!ePortaria && plantao.servidores.length >= 2 && (
                      <button onClick={() => abrirModalViagem('dupla', 0, plantao.id, nomeDupla)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-900/50 active:scale-95 flex items-center gap-2"><span>✈️</span> Lançar Dupla</button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto w-full p-2">
                  <table className="w-full text-left text-sm whitespace-nowrap border-separate border-spacing-y-2">
                    <tbody className="">
                      {plantao.servidores.map((s: any, idx: number) => {
                        const proximo = (idx === 0 || idx === 1) && !ePortaria;
                        return (
                          <tr 
                            key={s.id} draggable 
                            onDragStart={(e) => onDragStart(e, idx, 'servidor', plantao.id)}
                            onDragEnd={onDragEnd} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, idx, 'servidor', plantao.id)}
                            className={`transition-colors cursor-grab active:cursor-grabbing group rounded-2xl ${proximo ? 'bg-emerald-900/10 border border-emerald-900/30' : 'bg-slate-950/50 hover:bg-slate-800'}`}
                          >
                            <td className="p-4 pl-6 text-center flex items-center justify-center gap-3 rounded-l-2xl">
                              <span className="text-slate-600 text-lg cursor-grab hover:text-white transition-colors opacity-50 group-hover:opacity-100">☰</span>
                              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm shadow-inner ${proximo ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-900/50' : 'bg-slate-900 text-slate-500 border border-slate-700/50'}`}>{s.posicao_fila}º</span>
                            </td>
                            
                            <td className="p-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-black text-base tracking-tight block ${proximo ? 'text-emerald-100' : 'text-white'}`}>{s.nome}</span>
                                {s.is_supervisor === 1 && <span className="text-[8px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-black uppercase">Sup</span>}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <button onClick={() => handleEditTelefone(s.id, 'servidor', s.telefone, s.nome)} className="text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1.5 rounded uppercase font-bold transition-colors shadow-sm">{s.telefone ? '📱 Editar Tel' : '📱 Add Tel'}</button>
                                {s.telefone && <button onClick={() => abrirWhatsApp(s.telefone, s.nome)} className="text-[9px] bg-emerald-900/20 text-emerald-400 border border-emerald-900/30 px-2.5 py-1.5 rounded uppercase font-black hover:bg-emerald-600 hover:text-white transition-all shadow-sm">💬 WhatsApp</button>}
                                <span className="w-px h-4 bg-slate-800 mx-1"></span>
                                <button onClick={() => handleTrocarPlantao(s.id, plantao.id)} className="text-[9px] text-slate-500 hover:text-slate-300 uppercase font-bold transition-colors">🔄 Mover</button>
                                <button onClick={() => handleRemoverMembro(s.id, s.nome)} className="text-[9px] text-red-500/50 hover:text-red-400 uppercase font-bold transition-colors">🗑️ Apagar</button>
                              </div>
                            </td>
                            
                            <td className="p-4 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border shadow-inner ${s.data_folga ? "bg-amber-900/20 text-amber-400 border-amber-900/30" : "bg-slate-900 text-slate-500 border-slate-800"}`}>
                                  🌴 {s.data_folga || 'Sem folga'}
                                </span>
                                <div className="flex gap-2">
                                  <button onClick={() => setModalFolga({id: s.id, data: ''})} className="text-slate-400 hover:text-white text-[9px] uppercase tracking-widest font-bold transition-colors bg-slate-800 px-2 py-1 rounded">Definir</button>
                                  {s.data_folga && <button onClick={() => limparFolga(s.id)} className="text-red-400 hover:text-white text-[9px] font-bold bg-red-900/30 px-2 py-1 rounded">X</button>}
                                </div>
                              </div>
                            </td>
                            
                            <td className="p-4 text-center">
                              {!ePortaria && (
                                <div className="flex flex-col items-center gap-1.5 bg-slate-900 py-2 px-4 rounded-xl border border-slate-800 w-max mx-auto shadow-inner">
                                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">⏱️ Última Viagem</span>
                                  <span className="text-xs font-bold text-white">{s.ultima_viagem ? formatarParaBR(s.ultima_viagem) : '--/--/----'}</span>
                                  {s.destino_viagem && <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${s.destino_viagem === 'Interior' ? 'text-amber-500' : s.destino_viagem === 'Viagem SEI' ? 'text-purple-500' : 'text-blue-500'}`}>📍 {s.destino_viagem}</span>}
                                </div>
                              )}
                            </td>
                            
                            <td className="p-4 pr-6 text-right rounded-r-2xl">
                              {!ePortaria && (
                                <button onClick={() => abrirModalViagem('individual', s.id, plantao.id, s.nome)} className="bg-white/5 hover:bg-white/10 text-white px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-sm transition-all active:scale-95 border border-white/5">
                                  ✈️ Lançamento Inv.
                                </button>
                              )}
                            </td>
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
      
      {/* CSS Customizado Scrollbar */}
      <style dangerouslySetContent={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(51, 65, 85, 1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(71, 85, 105, 1); }
      `}} />
    </main>
  );
}