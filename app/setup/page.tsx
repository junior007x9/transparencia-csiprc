"use client";

import { useState } from "react";
import { criarUsuario } from "../actions";

export default function SetupPage() {
  const [mensagem, setMensagem] = useState("");

  const gerarAdmin = async () => {
    setMensagem("A criar conta na nuvem...");
    const res = await criarUsuario("Diretor CSIPRC", "admin@csiprc.com", "admin123", true);
    
    if (res.error) setMensagem(res.error);
    else setMensagem("✅ Administrador criado com sucesso! Já pode apagar este arquivo.");
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white text-center p-6">
      <h1 className="text-3xl font-black mb-4">Instalação Inicial do Sistema</h1>
      <button onClick={gerarAdmin} className="bg-emerald-600 px-6 py-3 rounded-xl font-bold uppercase tracking-widest mb-4">
        Gerar Conta Administrador
      </button>
      <p className="text-amber-400 font-mono">{mensagem}</p>
    </div>
  );
}