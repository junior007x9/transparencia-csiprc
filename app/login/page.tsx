"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fazerLogin } from "../actions";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro("");

    const res = await fazerLogin(email, senha);
    
    if (res.error) {
      setErro(res.error);
      setLoading(false);
    } else {
      // Vai para a tela inicial (Portal) em vez de ir direto para o Admin
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <form onSubmit={handleLogin} className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center transform transition-all hover:scale-105 relative z-10">
        <div className="text-6xl mb-6 animate-bounce drop-shadow-lg">🔐</div>
        <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Acesso Restrito</h1>
        <p className="text-emerald-400 text-xs mb-8 uppercase tracking-widest font-bold">Central de Gestão CSIPRC</p>
        
        <input 
          type="email" 
          placeholder="E-mail Cadastrado" 
          required
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          className="w-full bg-slate-950/50 border border-slate-700 text-white px-5 py-4 rounded-2xl mb-4 text-center focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-medium transition-all text-sm" 
        />
        
        <input 
          type="password" 
          placeholder="Digite a Senha" 
          required
          value={senha} 
          onChange={(e) => setSenha(e.target.value)} 
          className="w-full bg-slate-950/50 border border-slate-700 text-white px-5 py-4 rounded-2xl mb-4 text-center focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none tracking-widest font-medium transition-all text-sm" 
        />
        
        {erro && <p className="text-red-400 text-xs font-bold mb-4 animate-pulse">{erro}</p>}
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-emerald-900/50 active:scale-95 mt-2 disabled:opacity-50"
        >
          {loading ? 'Autenticando...' : 'Entrar no Sistema'}
        </button>
      </form>
    </div>
  );
}