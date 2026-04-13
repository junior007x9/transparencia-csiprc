"use server";

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
});

export async function getDadosCompletos() {
  const pRes = await client.execute("SELECT * FROM plantoes ORDER BY id");
  const sRes = await client.execute("SELECT * FROM servidores ORDER BY plantao_id, posicao_fila");
  
  let motoristas: any[] = [];
  try {
    const mRes = await client.execute("SELECT * FROM motoristas ORDER BY posicao_fila");
    motoristas = mRes.rows as any[];
  } catch (e) {
    console.log("Tabela de motoristas não encontrada.");
  }

  return {
    plantoes: pRes.rows.map((p: any) => ({
      ...p,
      servidores: sRes.rows.filter((s: any) => s.plantao_id === p.id)
    })),
    motoristas: motoristas
  };
}

export async function configurarEscalaAutomatica(plantaoId: number, mes: number, ano: number, tipo: 'par' | 'impar') {
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const diasArr: string[] = [];

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const ePar = dia % 2 === 0;
    if (tipo === 'par' && ePar) diasArr.push(dia < 10 ? `0${dia}` : `${dia}`);
    if (tipo === 'impar' && !ePar) diasArr.push(dia < 10 ? `0${dia}` : `${dia}`);
  }

  const diasString = diasArr.join(", ");
  
  await client.execute({
    sql: "UPDATE plantoes SET dias_plantao = ? WHERE id = ?",
    args: [diasString, plantaoId] as any[]
  });

  return { success: true, dias: diasString };
}

export async function registrarViagemMotorista(idViajou: number) {
  const hoje = new Date().toISOString().split('T')[0];
  await client.execute({
    sql: "UPDATE motoristas SET posicao_fila = 2, ultima_viagem = ? WHERE id = ?",
    args: [hoje, idViajou] as any[]
  });
  await client.execute({
    sql: "UPDATE motoristas SET posicao_fila = 1 WHERE id != ?",
    args: [idViajou] as any[]
  });
  return { success: true };
}

// NOVA FUNÇÃO: Roda a fila de 2 em 2 educadores
export async function registrarViagemDupla(plantaoId: number) {
  const hoje = new Date().toISOString().split('T')[0];
  
  const sRes = await client.execute({
    sql: "SELECT id, posicao_fila FROM servidores WHERE plantao_id = ? ORDER BY posicao_fila ASC",
    args: [plantaoId] as any[]
  });
  
  const servidores = sRes.rows;
  if (servidores.length === 0) return { success: false };
  
  // Se por acaso só tiver 1 pessoa na equipa, roda só 1
  if (servidores.length === 1) {
     await client.execute({ sql: "UPDATE servidores SET ultima_viagem = ? WHERE id = ?", args: [hoje, servidores[0].id] as any[] });
     return { success: true };
  }

  const id1 = servidores[0].id;
  const id2 = servidores[1].id;
  const total = servidores.length;

  // Atualiza a data dos 2 e joga-os para o fim da fila
  await client.execute({ sql: "UPDATE servidores SET ultima_viagem = ?, posicao_fila = ? WHERE id = ?", args: [hoje, total - 1, id1] as any[] });
  await client.execute({ sql: "UPDATE servidores SET ultima_viagem = ?, posicao_fila = ? WHERE id = ?", args: [hoje, total, id2] as any[] });

  // Puxa todos os outros 2 posições para cima (ex: o 3º vira 1º)
  for (let i = 2; i < total; i++) {
     await client.execute({ sql: "UPDATE servidores SET posicao_fila = ? WHERE id = ?", args: [i - 1, servidores[i].id] as any[] });
  }

  return { success: true };
}

export async function atualizarServidor(id: number, dados: any) {
  if (dados.plantao_id) {
    const maxPosResult = await client.execute({
      sql: "SELECT MAX(posicao_fila) as max_pos FROM servidores WHERE plantao_id = ?",
      args: [dados.plantao_id] as any[]
    });
    const maxPos = (maxPosResult.rows[0].max_pos as number) || 0;
    dados.posicao_fila = maxPos + 1;
  }
  const fields = Object.keys(dados).map(key => `${key} = ?`).join(", ");
  const values = Object.values(dados);
  
  await client.execute({
    sql: `UPDATE servidores SET ${fields} WHERE id = ?`,
    args: [...values, id] as any[]
  });
  return { success: true };
}

export async function atualizarMotorista(id: number, dados: any) {
  const fields = Object.keys(dados).map(key => `${key} = ?`).join(", ");
  const values = Object.values(dados);
  
  await client.execute({
    sql: `UPDATE motoristas SET ${fields} WHERE id = ?`,
    args: [...values, id] as any[]
  });
  return { success: true };
}

export async function atualizarDiasPlantao(id: number, novosDias: string) {
  await client.execute({
    sql: "UPDATE plantoes SET dias_plantao = ? WHERE id = ?",
    args: [novosDias, id] as any[]
  });
  return { success: true };
}

export async function corrigirNumeracaoFilas() {
  const mRes = await client.execute("SELECT id FROM motoristas ORDER BY posicao_fila ASC, id ASC");
  for (let i = 0; i < mRes.rows.length; i++) {
    await client.execute({ sql: "UPDATE motoristas SET posicao_fila = ? WHERE id = ?", args: [i + 1, mRes.rows[i].id] as any[] });
  }

  const pRes = await client.execute("SELECT id FROM plantoes");
  for (const p of pRes.rows) {
    const sRes = await client.execute({ sql: "SELECT id FROM servidores WHERE plantao_id = ? ORDER BY posicao_fila ASC, id ASC", args: [p.id as number] as any[] });
    for (let i = 0; i < sRes.rows.length; i++) {
      await client.execute({ sql: "UPDATE servidores SET posicao_fila = ? WHERE id = ?", args: [i + 1, sRes.rows[i].id] as any[] });
    }
  }
  return { success: true };
}

export async function adicionarServidor(plantaoId: number, nome: string) {
  const maxPosResult = await client.execute({
    sql: "SELECT MAX(posicao_fila) as max_pos FROM servidores WHERE plantao_id = ?",
    args: [plantaoId] as any[]
  });
  const maxPos = (maxPosResult.rows[0].max_pos as number) || 0;

  await client.execute({
    sql: "INSERT INTO servidores (nome, plantao_id, posicao_fila, is_supervisor) VALUES (?, ?, ?, 0)",
    args: [nome, plantaoId, maxPos + 1] as any[]
  });
  return { success: true };
}

export async function removerServidor(id: number) {
  await client.execute({
    sql: "DELETE FROM servidores WHERE id = ?",
    args: [id] as any[]
  });
  await corrigirNumeracaoFilas();
  return { success: true };
}

// NOVA FUNÇÃO: Zerar o histórico de todo mundo
export async function zerarHistoricoViagens() {
  await client.execute("UPDATE servidores SET ultima_viagem = NULL");
  await client.execute("UPDATE motoristas SET ultima_viagem = NULL");
  return { success: true };
}