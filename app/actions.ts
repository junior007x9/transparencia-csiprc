"use server";

import { createClient } from "@libsql/client";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
});

// ============================================================================
// GESTÃO DE AUTENTICAÇÃO E USUÁRIOS
// ============================================================================

export async function fazerLogin(email: string, senhaPlana: string) {
  try {
    const res = await client.execute({
      sql: "SELECT * FROM usuarios WHERE email = ?",
      args: [email]
    });

    if (res.rows.length === 0) return { error: "E-mail ou senha incorretos!" };

    const usuario = res.rows[0];
    const senhaValida = await bcrypt.compare(senhaPlana, usuario.senha as string);

    if (!senhaValida) return { error: "E-mail ou senha incorretos!" };

    const sessaoData = JSON.stringify({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      isAdmin: usuario.is_admin === 1
    });
    
    const cookieStore = await cookies();
    cookieStore.set("csiprc_session", sessaoData, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, 
      path: "/" 
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Erro interno no servidor." };
  }
}

export async function fazerLogout() {
  const cookieStore = await cookies();
  cookieStore.delete("csiprc_session");
  return { success: true };
}

export async function obterSessaoAtual() {
  const cookieStore = await cookies();
  const session = cookieStore.get("csiprc_session");
  if (!session) return null;
  return JSON.parse(session.value);
}

export async function listarUsuarios() {
  try {
    const res = await client.execute("SELECT id, nome, email, is_admin FROM usuarios ORDER BY nome ASC");
    return res.rows;
  } catch (e) {
    return [];
  }
}

export async function criarUsuario(nome: string, email: string, senhaPlana: string, isAdmin: boolean) {
  try {
    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(senhaPlana, salt);
    
    await client.execute({
      sql: "INSERT INTO usuarios (nome, email, senha, is_admin) VALUES (?, ?, ?, ?)",
      args: [nome, email, senhaCriptografada, isAdmin ? 1 : 0]
    });
    return { success: true };
  } catch (error) {
    return { error: "Erro ao criar utilizador. O e-mail já pode estar em uso." };
  }
}

export async function removerUsuario(id: number) {
  try {
    await client.execute({ sql: "DELETE FROM usuarios WHERE id = ?", args: [id] });
    return { success: true };
  } catch (e) {
    return { error: "Erro ao remover utilizador." };
  }
}

// ============================================================================
// FUNÇÕES ORIGINAIS DO SISTEMA DE ESCALAS E VIAGENS
// ============================================================================

export async function verificarSenhaAdmin(senha: string) {
  const senhaReal = process.env.ADMIN_PASSWORD || "admin123";
  return senha === senhaReal;
}

export async function getDadosCompletos() {
  const pRes = await client.execute("SELECT * FROM plantoes ORDER BY id");
  const sRes = await client.execute("SELECT * FROM servidores ORDER BY plantao_id, posicao_fila");
  
  let motoristas: any[] = [];
  try {
    const mRes = await client.execute("SELECT * FROM motoristas ORDER BY posicao_fila");
    motoristas = mRes.rows as any[];
  } catch (e) {}

  let equipeTecnica: any[] = [];
  try {
    const eqRes = await client.execute("SELECT * FROM equipe_tecnica ORDER BY posicao_fila");
    equipeTecnica = eqRes.rows as any[];
  } catch (e) {}

  const dadosLimpados = {
    plantoes: pRes.rows.map((p: any) => ({
      ...p,
      servidores: sRes.rows.filter((s: any) => s.plantao_id === p.id)
    })),
    motoristas: motoristas,
    equipeTecnica: equipeTecnica
  };
  return JSON.parse(JSON.stringify(dadosLimpados));
}

export async function getRelatorioViagens() {
  const res = await client.execute("SELECT * FROM viagens_realizadas ORDER BY data_viagem DESC, id DESC");
  return JSON.parse(JSON.stringify(res.rows));
}

export async function excluirViagemHistorico(id: number) {
  await client.execute({ sql: "DELETE FROM viagens_realizadas WHERE id = ?", args: [id] as any[] });
  return { success: true };
}

export async function limparTodoHistorico() {
  await client.execute("DELETE FROM viagens_realizadas");
  return { success: true };
}

export async function editarViagemHistorico(id: number, dados: any) {
  const fields = Object.keys(dados).map(key => `${key} = ?`).join(", ");
  await client.execute({ 
    sql: `UPDATE viagens_realizadas SET ${fields} WHERE id = ?`, 
    args: [...Object.values(dados), id] as any[] 
  });
  return { success: true };
}

export async function reordenarFila(tabela: 'servidores' | 'motoristas' | 'equipe_tecnica', idsOrdenados: number[]) {
  for (let i = 0; i < idsOrdenados.length; i++) {
    await client.execute({
      sql: `UPDATE ${tabela} SET posicao_fila = ? WHERE id = ?`,
      args: [i + 1, idsOrdenados[i]] as any[]
    });
  }
  return { success: true };
}

async function salvarNoHistorico(nome: string, papel: string, equipe: string, data: string, destino: string, adolescente?: string, cidade?: string, observacoes?: string, horario?: string) {
  const isSei = observacoes?.includes('Processo SEI:');
  const isInterna = destino === 'Atividade Interna';
  
  // Validação de Segurança para Baixa Interna
  if (isInterna && (!observacoes || observacoes.trim() === '')) {
    throw new Error("A Baixa Interna exige uma justificativa nas observações.");
  }

  // Atividade Interna ou SEI não geram custos de diária
  const valor = (destino === 'Interior' && !isSei && !isInterna) ? 320.00 : (destino === 'São Luís' && !isSei && !isInterna) ? 640.00 : 0.00;
  
  await client.execute({
    sql: "INSERT INTO viagens_realizadas (nome_pessoa, papel, equipe, data_viagem, destino, valor, adolescente, cidade, observacoes, horario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [nome, papel, equipe, data, destino, valor, adolescente || null, cidade || null, observacoes || null, horario || null] as any[]
  });
}

export async function registrarViagemMotorista(idViajou: number, destino: string, dataViagem?: string, adolescente?: string, cidade?: string, observacoes?: string, horario?: string) {
  try {
    const dataDb = dataViagem || new Date().toISOString().split('T')[0];
    const mRes = await client.execute({ sql: "SELECT nome, posicao_fila FROM motoristas WHERE id = ?", args: [idViajou] as any[] });
    if (mRes.rows.length === 0) return { success: false, error: "Motorista não encontrado." };
    const nome = mRes.rows[0].nome as string;
    const posAtual = mRes.rows[0].posicao_fila as number;
    
    await salvarNoHistorico(nome, 'Motorista', 'Revezamento', dataDb, destino, adolescente, cidade, observacoes, horario);
    
    const maxPosResult = await client.execute("SELECT MAX(posicao_fila) as max_pos FROM motoristas");
    const maxPos = (maxPosResult.rows[0].max_pos as number) || 1;
    await client.execute({ sql: "UPDATE motoristas SET posicao_fila = posicao_fila - 1 WHERE posicao_fila > ?", args: [posAtual] as any[] });
    await client.execute({ sql: "UPDATE motoristas SET posicao_fila = ?, ultima_viagem = ?, destino_viagem = ? WHERE id = ?", args: [maxPos, dataDb, destino, idViajou] as any[] });
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
}

export async function registrarViagemDupla(plantaoId: number, destino: string, dataViagem?: string, adolescente?: string, cidade?: string, observacoes?: string, horario?: string) {
  try {
    const dataDb = dataViagem || new Date().toISOString().split('T')[0];
    const pRes = await client.execute({ sql: "SELECT nome FROM plantoes WHERE id = ?", args: [plantaoId] as any[] });
    const nomeEquipe = pRes.rows.length > 0 ? pRes.rows[0].nome as string : 'Desconhecida';
    const sRes = await client.execute({ sql: "SELECT id, nome, posicao_fila FROM servidores WHERE plantao_id = ? ORDER BY posicao_fila ASC", args: [plantaoId] as any[] });
    const servidores = sRes.rows;
    
    if (servidores.length === 0) return { success: false, error: "Nenhum servidor encontrado." };
    if (servidores.length === 1) {
       await client.execute({ sql: "UPDATE servidores SET ultima_viagem = ?, destino_viagem = ? WHERE id = ?", args: [dataDb, destino, servidores[0].id] as any[] });
       await salvarNoHistorico(servidores[0].nome as string, 'Servidor', nomeEquipe, dataDb, destino, adolescente, cidade, observacoes, horario);
       return { success: true };
    }
    
    const s1 = servidores[0]; const s2 = servidores[1]; const total = servidores.length;
    await salvarNoHistorico(s1.nome as string, 'Servidor', nomeEquipe, dataDb, destino, adolescente, cidade, observacoes, horario);
    await salvarNoHistorico(s2.nome as string, 'Servidor', nomeEquipe, dataDb, destino, adolescente, cidade, observacoes, horario);
    
    await client.execute({ sql: "UPDATE servidores SET posicao_fila = posicao_fila - 2 WHERE plantao_id = ? AND posicao_fila > 2", args: [plantaoId] as any[] });
    await client.execute({ sql: "UPDATE servidores SET ultima_viagem = ?, destino_viagem = ?, posicao_fila = ? WHERE id = ?", args: [dataDb, destino, total - 1, s1.id] as any[] });
    await client.execute({ sql: "UPDATE servidores SET ultima_viagem = ?, destino_viagem = ?, posicao_fila = ? WHERE id = ?", args: [dataDb, destino, total, s2.id] as any[] });
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
}

export async function registrarViagem(servidorId: number, plantaoId: number, destino: string, dataViagem?: string, adolescente?: string, cidade?: string, observacoes?: string, horario?: string) {
  try {
    const dataDb = dataViagem || new Date().toISOString().split('T')[0];
    const sRes = await client.execute({ sql: "SELECT s.posicao_fila, s.nome, p.nome as equipe FROM servidores s JOIN plantoes p ON s.plantao_id = p.id WHERE s.id = ?", args: [servidorId] as any[] });
    if (sRes.rows.length === 0) return { success: false, error: "Servidor não encontrado." };
    
    const posAtual = sRes.rows[0].posicao_fila as number; const nome = sRes.rows[0].nome as string; const equipe = sRes.rows[0].equipe as string;
    await salvarNoHistorico(nome, 'Servidor', equipe, dataDb, destino, adolescente, cidade, observacoes, horario);
    
    const maxPosResult = await client.execute({ sql: "SELECT MAX(posicao_fila) as max_pos FROM servidores WHERE plantao_id = ?", args: [plantaoId] as any[] });
    const maxPos = (maxPosResult.rows[0].max_pos as number) || 1;
    
    await client.execute({ sql: "UPDATE servidores SET posicao_fila = posicao_fila - 1 WHERE plantao_id = ? AND posicao_fila > ?", args: [plantaoId, posAtual] as any[] });
    await client.execute({ sql: "UPDATE servidores SET posicao_fila = ?, ultima_viagem = ?, destino_viagem = ? WHERE id = ?", args: [maxPos, dataDb, destino, servidorId] as any[] });
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
}

export async function adicionarEquipeTecnica(nome: string, funcao: string) {
  const maxPosResult = await client.execute("SELECT MAX(posicao_fila) as max_pos FROM equipe_tecnica");
  const pos = (maxPosResult.rows[0].max_pos as number || 0) + 1;
  await client.execute({ sql: "INSERT INTO equipe_tecnica (nome, funcao, posicao_fila) VALUES (?, ?, ?)", args: [nome, funcao, pos] as any[] });
  return { success: true };
}

export async function removerEquipeTecnica(id: number) {
  await client.execute({ sql: "DELETE FROM equipe_tecnica WHERE id = ?", args: [id] as any[] });
  return { success: true };
}

export async function atualizarEquipeTecnica(id: number, dados: any) {
  const fields = Object.keys(dados).map(key => `${key} = ?`).join(", ");
  await client.execute({ sql: `UPDATE equipe_tecnica SET ${fields} WHERE id = ?`, args: [...Object.values(dados), id] as any[] });
  return { success: true };
}

export async function registrarViagemEquipeTecnica(idViajou: number, destino: string, dataViagem?: string, cidade?: string, adolescente?: string, observacoes?: string, horario?: string) {
  try {
    const dataDb = dataViagem || new Date().toISOString().split('T')[0];
    const tRes = await client.execute({ sql: "SELECT nome, funcao, posicao_fila FROM equipe_tecnica WHERE id = ?", args: [idViajou] as any[] });
    if (tRes.rows.length === 0) return { success: false, error: "Membro não encontrado." };
    
    const nome = tRes.rows[0].nome as string; const funcao = tRes.rows[0].funcao as string; const posAtual = tRes.rows[0].posicao_fila as number;
    await salvarNoHistorico(nome, funcao, 'Equipe Técnica', dataDb, destino, adolescente, cidade, observacoes, horario);
    
    const maxPosResult = await client.execute("SELECT MAX(posicao_fila) as max_pos FROM equipe_tecnica");
    const maxPos = (maxPosResult.rows[0].max_pos as number) || 1;
    
    await client.execute({ sql: "UPDATE equipe_tecnica SET posicao_fila = posicao_fila - 1 WHERE posicao_fila > ?", args: [posAtual] as any[] });
    await client.execute({ sql: "UPDATE equipe_tecnica SET posicao_fila = ?, ultima_viagem = ?, destino_viagem = ? WHERE id = ?", args: [maxPos, dataDb, destino, idViajou] as any[] });
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
}

export async function configurarEscalaAutomatica(plantaoId: number, mes: number, ano: number, tipo: 'par' | 'impar') {
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const diasArr: string[] = [];
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const ePar = dia % 2 === 0;
    if (tipo === 'par' && ePar) diasArr.push(dia < 10 ? `0${dia}` : `${dia}`);
    if (tipo === 'impar' && !ePar) diasArr.push(dia < 10 ? `0${dia}` : `${dia}`);
  }
  await client.execute({ sql: "UPDATE plantoes SET dias_plantao = ? WHERE id = ?", args: [diasArr.join(", "), plantaoId] as any[] });
  return { success: true, dias: diasArr.join(", ") };
}

export async function atualizarServidor(id: number, dados: any) {
  // 1. Injetar Ano Atual automaticamente se receber formato DD/MM nas folgas/férias
  if (dados.data_folga && typeof dados.data_folga === 'string') {
    const regexDDMM = /(\d{2}\/\d{2})$/;
    if (regexDDMM.test(dados.data_folga)) {
      const anoAtual = new Date().getFullYear();
      dados.data_folga = dados.data_folga + `/${anoAtual}`;
    }
    
    // 2. Reordenação Automática: Atestados e Férias vão para o fim da fila
    if (dados.data_folga.includes('Férias') || dados.data_folga.includes('Atestado')) {
      const sRes = await client.execute({ sql: "SELECT plantao_id FROM servidores WHERE id = ?", args: [id] });
      if (sRes.rows.length > 0) {
         const pId = sRes.rows[0].plantao_id;
         const maxPosResult = await client.execute({ sql: "SELECT MAX(posicao_fila) as max_pos FROM servidores WHERE plantao_id = ?", args: [pId] as any[] });
         dados.posicao_fila = (maxPosResult.rows[0].max_pos as number || 0) + 1;
      }
    }
  }

  // 3. Permuta Segura: Ao mudar de plantão, joga para o final da nova fila
  let mudouDeEquipe = false;
  if (dados.plantao_id) {
    const atualRes = await client.execute({ sql: "SELECT plantao_id FROM servidores WHERE id = ?", args: [id] });
    
    // Verifica se a equipe está REALMENTE sendo alterada
    if (atualRes.rows.length > 0 && atualRes.rows[0].plantao_id !== dados.plantao_id) {
      const maxPosResult = await client.execute({ sql: "SELECT MAX(posicao_fila) as max_pos FROM servidores WHERE plantao_id = ?", args: [dados.plantao_id] as any[] });
      dados.posicao_fila = (maxPosResult.rows[0].max_pos as number || 0) + 1;
      mudouDeEquipe = true;
      
      // PROTEÇÃO: Deleta chaves do payload para garantir que o front-end não zere o histórico acidentalmente na permuta
      delete dados.ultima_viagem;
      delete dados.destino_viagem;
    } else {
      // Se a equipe for a mesma, removemos o id do payload para não reordenar atoa
      delete dados.plantao_id;
    }
  }

  const fields = Object.keys(dados).map(key => `${key} = ?`).join(", ");
  
  // Só executa o banco se restar algum campo a ser atualizado
  if (fields.length > 0) {
    await client.execute({ sql: `UPDATE servidores SET ${fields} WHERE id = ?`, args: [...Object.values(dados), id] as any[] });
  }
  
  // 4. Corrigir buracos deixados na fila antiga ou na fila atual após reordenação
  if (mudouDeEquipe || (dados.data_folga && (dados.data_folga.includes('Férias') || dados.data_folga.includes('Atestado')))) {
     await corrigirNumeracaoFilas();
  }

  return { success: true };
}

export async function atualizarMotorista(id: number, dados: any) {
  const fields = Object.keys(dados).map(key => `${key} = ?`).join(", ");
  await client.execute({ sql: `UPDATE motoristas SET ${fields} WHERE id = ?`, args: [...Object.values(dados), id] as any[] });
  return { success: true };
}

export async function atualizarDiasPlantao(id: number, novosDias: string) {
  await client.execute({ sql: "UPDATE plantoes SET dias_plantao = ? WHERE id = ?", args: [novosDias, id] as any[] });
  return { success: true };
}

export async function corrigirNumeracaoFilas() {
  const mRes = await client.execute("SELECT id FROM motoristas ORDER BY posicao_fila ASC, id ASC");
  for (let i = 0; i < mRes.rows.length; i++) { await client.execute({ sql: "UPDATE motoristas SET posicao_fila = ? WHERE id = ?", args: [i + 1, mRes.rows[i].id] as any[] }); }
  
  const pRes = await client.execute("SELECT id FROM plantoes");
  for (const p of pRes.rows) {
    const sRes = await client.execute({ sql: "SELECT id FROM servidores WHERE plantao_id = ? ORDER BY posicao_fila ASC, id ASC", args: [p.id as number] as any[] });
    for (let i = 0; i < sRes.rows.length; i++) { await client.execute({ sql: "UPDATE servidores SET posicao_fila = ? WHERE id = ?", args: [i + 1, sRes.rows[i].id] as any[] }); }
  }
  
  try {
    const tRes = await client.execute("SELECT id FROM equipe_tecnica ORDER BY posicao_fila ASC, id ASC");
    for (let i = 0; i < tRes.rows.length; i++) { await client.execute({ sql: "UPDATE equipe_tecnica SET posicao_fila = ? WHERE id = ?", args: [i + 1, tRes.rows[i].id] as any[] }); }
  } catch (e) {}
  
  return { success: true };
}

export async function adicionarServidor(plantaoId: number, nome: string) {
  const maxPosResult = await client.execute({ sql: "SELECT MAX(posicao_fila) as max_pos FROM servidores WHERE plantao_id = ?", args: [plantaoId] as any[] });
  await client.execute({ sql: "INSERT INTO servidores (nome, plantao_id, posicao_fila, is_supervisor) VALUES (?, ?, ?, 0)", args: [nome, plantaoId, (maxPosResult.rows[0].max_pos as number || 0) + 1] as any[] });
  return { success: true };
}

export async function removerServidor(id: number) {
  await client.execute({ sql: "DELETE FROM servidores WHERE id = ?", args: [id] as any[] });
  await corrigirNumeracaoFilas();
  return { success: true };
}

export async function zerarHistoricoViagens() {
  await client.execute("UPDATE servidores SET ultima_viagem = NULL, destino_viagem = NULL");
  await client.execute("UPDATE motoristas SET ultima_viagem = NULL, destino_viagem = NULL");
  try { await client.execute("UPDATE equipe_tecnica SET ultima_viagem = NULL, destino_viagem = NULL"); } catch(e) {}
  return { success: true };
}