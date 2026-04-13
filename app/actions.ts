"use server";

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
});

export async function getDadosCompletos() {
  const pRes = await client.execute("SELECT * FROM plantoes ORDER BY id");
  const sRes = await client.execute("SELECT * FROM servidores ORDER BY plantao_id, posicao_fila");
  
  let motoristas = [];
  try {
    const mRes = await client.execute("SELECT * FROM motoristas ORDER BY posicao_fila");
    motoristas = mRes.rows;
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
  const diasArr = [];

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const ePar = dia % 2 === 0;
    if (tipo === 'par' && ePar) diasArr.push(dia < 10 ? `0${dia}` : `${dia}`);
    if (tipo === 'impar' && !ePar) diasArr.push(dia < 10 ? `0${dia}` : `${dia}`);
  }

  const diasString = diasArr.join(", ");
  
  await client.execute({
    sql: "UPDATE plantoes SET dias_plantao = ? WHERE id = ?",
    args: [diasString, plantaoId]
  });

  return { success: true, dias: diasString };
}

export async function registrarViagemMotorista(idViajou: number) {
  const hoje = new Date().toISOString().split('T')[0];
  await client.execute({
    sql: "UPDATE motoristas SET posicao_fila = 2, ultima_viagem = ? WHERE id = ?",
    args: [hoje, idViajou]
  });
  await client.execute({
    sql: "UPDATE motoristas SET posicao_fila = 1 WHERE id != ?",
    args: [idViajou]
  });
  return { success: true };
}

export async function registrarViagem(servidorId: number, plantaoId: number) {
  const maxPosResult = await client.execute({
    sql: "SELECT MAX(posicao_fila) as max_pos FROM servidores WHERE plantao_id = ?",
    args: [plantaoId]
  });
  const maxPos = (maxPosResult.rows[0].max_pos as number) || 1;
  const hoje = new Date().toISOString().split('T')[0];

  await client.execute({
    sql: "UPDATE servidores SET posicao_fila = ?, ultima_viagem = ? WHERE id = ?",
    args: [maxPos + 1, hoje, servidorId]
  });

  await client.execute({
    sql: "UPDATE servidores SET posicao_fila = posicao_fila - 1 WHERE plantao_id = ? AND id != ?",
    args: [plantaoId, servidorId]
  });
  return { success: true };
}

export async function atualizarServidor(id: number, dados: any) {
  if (dados.plantao_id) {
    const maxPosResult = await client.execute({
      sql: "SELECT MAX(posicao_fila) as max_pos FROM servidores WHERE plantao_id = ?",
      args: [dados.plantao_id]
    });
    const maxPos = (maxPosResult.rows[0].max_pos as number) || 0;
    dados.posicao_fila = maxPos + 1;
  }
  const fields = Object.keys(dados).map(key => `${key} = ?`).join(", ");
  const values = Object.values(dados);
  await client.execute({
    sql: `UPDATE servidores SET ${fields} WHERE id = ?`,
    args: [...values, id]
  });
  return { success: true };
}

export async function atualizarMotorista(id: number, dados: any) {
  const fields = Object.keys(dados).map(key => `${key} = ?`).join(", ");
  const values = Object.values(dados);
  await client.execute({
    sql: `UPDATE motoristas SET ${fields} WHERE id = ?`,
    args: [...values, id]
  });
  return { success: true };
}

export async function atualizarDiasPlantao(id: number, novosDias: string) {
  await client.execute({
    sql: "UPDATE plantoes SET dias_plantao = ? WHERE id = ?",
    args: [novosDias, id]
  });
  return { success: true };
}

// NOVA FUNÇÃO: Repara as posições (1º, 2º, 3º) fechando os buracos se você apagou alguém
export async function corrigirNumeracaoFilas() {
  // 1. Arrumar Motoristas
  const mRes = await client.execute("SELECT id FROM motoristas ORDER BY posicao_fila ASC, id ASC");
  for (let i = 0; i < mRes.rows.length; i++) {
    await client.execute({ sql: "UPDATE motoristas SET posicao_fila = ? WHERE id = ?", args: [i + 1, mRes.rows[i].id] });
  }

  // 2. Arrumar Servidores equipa por equipa
  const pRes = await client.execute("SELECT id FROM plantoes");
  for (const p of pRes.rows) {
    const sRes = await client.execute({ sql: "SELECT id FROM servidores WHERE plantao_id = ? ORDER BY posicao_fila ASC, id ASC", args: [p.id] });
    for (let i = 0; i < sRes.rows.length; i++) {
      await client.execute({ sql: "UPDATE servidores SET posicao_fila = ? WHERE id = ?", args: [i + 1, sRes.rows[i].id] });
    }
  }
  return { success: true };
}