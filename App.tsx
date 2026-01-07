
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserRole, ProtocolData, Company, User, ProtocolStatus } from './types.ts';
import { analyzeReportWithIA } from './geminiService.ts';
import { supabase, checkSupabaseConnection } from './supabaseClient.ts';

// --- UI Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge: React.FC<{ status?: ProtocolStatus; type?: string }> = ({ status, type }) => {
  const isElogio = type === 'Elogio' || type === 'Elogio / Reconhecimento';
  const styles = {
    'Recebido': isElogio ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100',
    'Em Análise': 'bg-amber-50 text-amber-700 border-amber-100',
    'Concluído': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Arquivado': 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${styles[status || 'Recebido']}`}>
      {status || 'Recebido'}
    </span>
  );
};

const StatCard: React.FC<{ label: string; value: number | string; icon: string; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg flex flex-col gap-2 transition-transform hover:scale-105">
    <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-xl mb-2`}>{icon}</div>
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <span className="text-4xl font-black text-slate-900 italic tracking-tighter">{value}</span>
  </div>
);

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-blue-100 last:border-0 py-4">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left flex justify-between items-center group transition-all">
        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isOpen ? 'text-blue-600' : 'text-blue-800 group-hover:text-blue-600'}`}>
          • {question}
        </span>
        <span className="text-blue-400 font-black text-lg leading-none">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <p className="mt-3 text-[10px] font-medium text-blue-600/70 italic leading-relaxed animate-in">{answer}</p>}
    </div>
  );
};

// --- Main Application ---

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('aprendiz');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'history'>('main');
  const [protocols, setProtocols] = useState<ProtocolData[]>([]);
  const [apprenticeCount, setApprenticeCount] = useState(0);
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [legalAnalysis, setLegalAnalysis] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'warning' } | null>(null);
  const [protocolResult, setProtocolResult] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'ok' | 'blocked'>('checking');

  const [authForm, setAuthForm] = useState({ nome: '', email: '', identificacao: '', senha: '', confirmarSenha: '', empresa: '', cnpj: '', logo: '' });
  const [formData, setFormData] = useState({ tipo: 'Reclamação', motivo: 'Desvio de função', descricao: '' });

  const showMsg = (message: any, type: 'error' | 'success' | 'warning' = 'error') => {
    let msg = "ERRO INESPERADO NO SISTEMA.";
    
    if (typeof message === 'string') {
      msg = message;
    } else if (message?.message) {
      msg = message.message;
      if (msg.toLowerCase().includes("column") && msg.toLowerCase().includes("cache")) {
        msg = "ATUALIZAÇÃO DE BANCO EM CURSO. RECARREGUE A PÁGINA EM 10 SEGUNDOS.";
      }
      if (msg.toLowerCase().includes("violates not-null constraint")) {
        msg = "CAMPOS OBRIGATÓRIOS FALTANDO NO BANCO. CONTATE O SUPORTE.";
      }
    } else if (typeof message === 'object') {
      try { msg = JSON.stringify(message); } catch { msg = "ERRO TÉCNICO COMPLEXO."; }
    }

    setNotification({ message: msg.toUpperCase(), type });
    setTimeout(() => setNotification(null), 8000);
  };

  useEffect(() => {
    const diagnostic = async () => {
      const result = await checkSupabaseConnection();
      setConnectionStatus(result.ok ? 'ok' : 'blocked');
    };
    diagnostic();
  }, []);

  const fetchPublicCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('users').select('nome').eq('role', 'empresa');
      if (error) throw error;
      if (data) setAvailableCompanies(data.map(u => u.nome));
    } catch (err: any) { 
      console.error("Erro ao carregar empresas:", err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!isLoggedIn || !userProfile) return;
    try {
      let query = supabase.from('protocols').select('*').order('dataCriacao', { ascending: false });
      
      if (userProfile.role === 'aprendiz') {
        query = query.eq('usuario_email', userProfile.email);
      } else if (userProfile.role === 'empresa') {
        query = query.eq('empresa', userProfile.nome);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      if (data) setProtocols(data);

      if (userProfile.role === 'empresa') {
        const { count, error: countError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'aprendiz')
          .eq('empresa', userProfile.nome);
        if (countError) throw countError;
        setApprenticeCount(count || 0);
      }
    } catch (err: any) {
      console.error("Erro no fetch:", err);
      if (!err.message?.includes("cache")) showMsg(err);
    }
  }, [isLoggedIn, userProfile]);

  useEffect(() => { if (isRegistering) fetchPublicCompanies(); }, [isRegistering, fetchPublicCompanies]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const companyElogios = protocols.filter(p => p.tipo === 'Elogio' || p.tipo === 'Elogio / Reconhecimento');
    return {
      total: protocols.length,
      pending: protocols.filter(p => p.status === 'Recebido').length,
      completed: protocols.filter(p => p.status === 'Concluído').length,
      elogios: companyElogios.length,
      filteredProtocols: userProfile?.role === 'empresa' ? companyElogios : protocols
    };
  }, [protocols, userProfile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) return showMsg("A IMAGEM DEVE TER NO MÁXIMO 1.5MB.");
      const reader = new FileReader();
      reader.onloadend = () => setAuthForm(prev => ({ ...prev, logo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistering) {
        if (authForm.senha !== authForm.confirmarSenha) throw new Error("SENHAS NÃO CONFEREM.");
        
        const payload: any = {
          nome: authForm.nome, 
          email: authForm.email,
          identificacao: authForm.identificacao, 
          senha: authForm.senha,
          role, 
          empresa: authForm.empresa || null,
          cnpj: authForm.cnpj ? authForm.cnpj.replace(/\D/g, '') : null,
          logo: authForm.logo || null
        };

        const { error } = await supabase.from('users').insert([payload]);
        if (error) throw error;
        
        showMsg("CONTA CRIADA COM SUCESSO!", "success");
        setIsRegistering(false);
      } else {
        const { data, error } = await supabase.from('users').select('*')
          .eq('identificacao', authForm.identificacao)
          .eq('senha', authForm.senha)
          .eq('role', role).maybeSingle();
        
        if (error) throw error;
        if (!data) throw new Error("MATRÍCULA OU SENHA INCORRETOS.");
        
        setUserProfile(data);
        setIsLoggedIn(true);
        showMsg(`BEM-VINDO AO PORTAL!`, "success");
      }
    } catch (err: any) {
      showMsg(err);
    } finally { setLoading(false); }
  };

  const handleCreateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const id = "PJA" + Math.floor(100000 + Math.random() * 899999).toString();
      
      const payload = {
        id, 
        tipo: formData.tipo, 
        motivo: formData.motivo,
        descricao: formData.descricao,
        empresa: userProfile?.role === 'aprendiz' ? (userProfile.empresa || 'GERAL') : 'GERAL',
        local: 'NÃO INFORMADO',
        horario: 'NÃO INFORMADO',
        usuario_email: userProfile?.email || 'anonimo@portal.com',
        dataCriacao: new Date().toISOString(),
        status: 'Recebido'
      };

      const { error } = await supabase.from('protocols').insert([payload]);
      
      if (error) throw error;
      
      setProtocolResult(id);
      fetchData();
    } catch (err: any) { 
      showMsg(err); 
    }
    finally { setLoading(false); }
  };

  const handleIA = async () => {
    if (!formData.descricao || formData.descricao.length < 15) return showMsg("DESCREVA O RELATO COM MAIS DETALHES.");
    setLoadingAI(true);
    try {
      const result = await analyzeReportWithIA(formData.descricao);
      setFormData(prev => ({ ...prev, descricao: result.refinedText }));
      setLegalAnalysis(result.legalAnalysis);
      showMsg("ANÁLISE JURÍDICA CONCLUÍDA!", "success");
    } catch (err) {
      showMsg("IA TEMPORARIAMENTE OCUPADA.");
    } finally {
      setLoadingAI(false);
    }
  };

  const goHome = () => {
    setIsLoggedIn(false);
    setIsRegistering(false);
    setActiveTab('main');
    setUserProfile(null);
  };

  if (protocolResult) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-in">
        <Card className="max-w-md w-full text-center p-16">
          <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-blue-200">
             <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase italic mb-2 tracking-tighter">Enviado com Sucesso</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-10">Use o código abaixo para consultar</p>
          <div className="bg-slate-950 p-8 rounded-[2.5rem] mb-6 shadow-inner border border-slate-800">
            <span className="text-4xl font-black text-blue-400 tracking-widest italic">{protocolResult}</span>
          </div>
          
          {/* Lembrete de e-mail solicitado pelo usuário */}
          <div className="mb-12 animate-pulse">
            <p className="text-blue-600 font-black uppercase text-[9px] tracking-[0.4em] italic">
              Fique atento ao seu e-mail para futuras atualizações
            </p>
          </div>

          <button onClick={() => setProtocolResult(null)} className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black uppercase italic tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-100">Voltar ao Início</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-blue-100">
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] max-w-sm p-6 rounded-[2.5rem] shadow-2xl animate-in border-2 flex items-center gap-5 backdrop-blur-xl ${notification.type === 'error' ? 'bg-red-50/90 border-red-100 text-red-800' : notification.type === 'warning' ? 'bg-amber-50/90 border-amber-100 text-amber-800' : 'bg-emerald-50/90 border-emerald-100 text-emerald-800'}`}>
          <div className={`shrink-0 w-3 h-3 rounded-full shadow-sm ${notification.type === 'error' ? 'bg-red-500' : notification.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest leading-relaxed italic">{notification.message}</span>
        </div>
      )}

      <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
          <button onClick={goHome} className="group flex items-center gap-6 transition-all outline-none">
            <div className="bg-blue-600 text-white px-5 h-12 flex items-center justify-center rounded-2xl font-black text-xl shadow-lg shadow-blue-100 italic tracking-tighter group-hover:rotate-3 transition-transform">PJA</div>
            <div className="flex flex-col items-start leading-none">
              <span className="font-black text-base tracking-tighter uppercase italic text-slate-900">PORTAL JOVEM APRENDIZ</span>
              <span className="text-[7px] font-black text-blue-600 uppercase tracking-[0.3em] opacity-60">Direitos & Transparência</span>
            </div>
          </button>
          {isLoggedIn ? (
            <div className="flex items-center gap-8">
              <div className="hidden md:flex flex-col items-end leading-none">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Perfil Ativo</span>
                 <span className="text-xs font-black uppercase italic text-blue-600">{userProfile?.nome.split(' ')[0]}</span>
              </div>
              <button onClick={() => setIsLoggedIn(false)} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg">Sair</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'ok' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{connectionStatus === 'ok' ? 'Rede Estável' : 'Rede Instável'}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-16">
        {!isLoggedIn ? (
          <div className="max-w-xl mx-auto animate-in space-y-6">
            <Card>
              <div className="flex bg-slate-50 border-b border-slate-100 p-2 gap-2">
                {['aprendiz', 'empresa', 'ministerio'].map((r) => (
                  <button key={r} onClick={() => { setRole(r as any); setIsRegistering(false); }} className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${role === r ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>
                    {r === 'ministerio' ? 'Órgão' : r}
                  </button>
                ))}
              </div>
              <div className="p-12">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-8">{isRegistering ? 'Novo Registro' : 'Acessar Conta'}</h2>
                <form onSubmit={handleAuth} className="space-y-4">
                  {isRegistering ? (
                    <div className="space-y-4 animate-in">
                      <input placeholder={role === 'empresa' ? "RAZÃO SOCIAL" : "NOME COMPLETO"} className="w-full p-5 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-100 outline-none focus:border-blue-600 uppercase" onChange={e => setAuthForm({...authForm, nome: e.target.value})} required />
                      <input type="email" placeholder="E-MAIL" className="w-full p-5 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-100 outline-none focus:border-blue-600 uppercase" onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
                      
                      {role === 'aprendiz' && (
                        <select className="w-full p-5 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-100 outline-none focus:border-blue-600 appearance-none" onChange={e => setAuthForm({...authForm, empresa: e.target.value})} required>
                          <option value="">-- ONDE VOCÊ TRABALHA? --</option>
                          {availableCompanies.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                        </select>
                      )}

                      {role === 'empresa' && (
                        <div className="space-y-4 border-2 border-dashed border-slate-200 p-6 rounded-[2.5rem] bg-slate-50/50">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4 text-center italic">Logo da Instituição</label>
                          <div className="flex flex-col items-center gap-6">
                            {authForm.logo ? (
                              <img src={authForm.logo} alt="Preview" className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white shadow-2xl" />
                            ) : (
                              <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-slate-200 text-3xl border border-slate-100">🏢</div>
                            )}
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="text-[9px] font-black text-slate-400 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-[8px] file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
                          </div>
                          <input placeholder="CNPJ (NUMÉRICO)" className="w-full p-5 bg-white rounded-2xl text-xs font-bold border border-slate-100 uppercase mt-4" onChange={e => setAuthForm({...authForm, cnpj: e.target.value})} required />
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-100">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-2 italic">Acesso Rápido</label>
                        <input placeholder={role === 'aprendiz' ? "MATRÍCULA OU CPF" : "CÓDIGO DE IDENTIFICAÇÃO"} className="w-full p-5 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-100 outline-none focus:border-blue-600 uppercase" onChange={e => setAuthForm({...authForm, identificacao: e.target.value})} required />
                      </div>
                    </div>
                  ) : (
                    <input placeholder={role === 'aprendiz' ? "MATRÍCULA OU CPF" : "CÓDIGO DE ACESSO"} className="w-full p-5 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-100 outline-none focus:border-blue-600 uppercase" onChange={e => setAuthForm({...authForm, identificacao: e.target.value})} required />
                  )}

                  <input type="password" placeholder="SENHA" className="w-full p-5 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-100 outline-none focus:border-blue-600 uppercase" onChange={e => setAuthForm({...authForm, senha: e.target.value})} required />
                  {isRegistering && <input type="password" placeholder="CONFIRMAR SENHA" className="w-full p-5 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-100 outline-none focus:border-blue-600 uppercase" onChange={e => setAuthForm({...authForm, confirmarSenha: e.target.value})} required />}
                  
                  <button disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-100 uppercase italic tracking-widest mt-6 hover:translate-y-[-2px] active:translate-y-[1px] transition-all disabled:opacity-50">
                    {loading ? 'AGUARDE...' : (isRegistering ? 'CRIAR MINHA CONTA' : 'ACESSAR AGORA')}
                  </button>
                </form>
                <button onClick={() => setIsRegistering(!isRegistering)} className="w-full mt-10 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600">
                  {isRegistering ? 'Voltar para o Login' : 'Ainda não tem acesso? Cadastre-se'}
                </button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="animate-in space-y-12">
            {/* DASHBOARD EMPRESA */}
            {userProfile.role === 'empresa' && (
              <div className="space-y-16">
                <div className="flex flex-col md:flex-row items-center gap-12 bg-white p-12 lg:p-20 rounded-[4rem] border border-slate-100 shadow-2xl relative overflow-hidden">
                   <div className="relative">
                      {userProfile.logo ? (
                        <img src={userProfile.logo} alt="Logo" className="w-32 h-32 md:w-56 md:h-56 rounded-[3.5rem] object-cover border-[6px] border-white shadow-2xl" />
                      ) : (
                        <div className="w-32 h-32 md:w-56 md:h-56 bg-slate-900 text-emerald-400 rounded-[3.5rem] flex items-center justify-center text-7xl font-black italic shadow-2xl">
                          {userProfile.nome.charAt(0)}
                        </div>
                      )}
                   </div>
                   <div className="text-center md:text-left space-y-5">
                      <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <span className="bg-emerald-100 text-emerald-700 px-6 py-2 rounded-full text-[10px] font-black uppercase italic tracking-widest border border-emerald-200">⭐ Empresa de Impacto</span>
                        <span className="bg-blue-100 text-blue-700 px-6 py-2 rounded-full text-[10px] font-black uppercase italic tracking-widest border border-blue-200">✅ Verificada</span>
                      </div>
                      <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-none text-slate-900">{userProfile.nome}</h2>
                      <p className="text-slate-400 font-bold text-xl italic uppercase tracking-widest opacity-60">Mural de Satisfação e Talentos</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <StatCard label="Feedbacks Positivos" value={stats.elogios} icon="🏆" color="bg-emerald-50 text-emerald-600" />
                   <StatCard label="Aprendizes no Time" value={apprenticeCount} icon="👥" color="bg-blue-50 text-blue-600" />
                   <StatCard label="Engajamento" value="A+" icon="✨" color="bg-purple-50 text-purple-600" />
                </div>

                <div className="space-y-12">
                   <h3 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter px-4">Relatos Recebidos</h3>
                   <div className="grid grid-cols-1 gap-8">
                    {stats.filteredProtocols.map(p => (
                      <Card key={p.id} className="p-10 md:p-16 bg-white hover:border-emerald-200 transition-all border-l-[12px] border-l-emerald-500 shadow-sm">
                        <div className="flex flex-col lg:flex-row gap-12 items-start">
                           <div className="flex-1 space-y-8">
                              <div className="flex flex-wrap items-center gap-6">
                                <Badge status={p.status} type={p.tipo} />
                                <span className="text-[11px] font-black text-slate-300 uppercase italic">Protocolo #{p.id}</span>
                              </div>
                              <h4 className="text-4xl font-black uppercase italic tracking-tight text-slate-900">{p.motivo}</h4>
                              <p className="text-slate-600 text-2xl font-medium leading-relaxed italic">"{p.descricao}"</p>
                           </div>
                        </div>
                      </Card>
                    ))}
                    {stats.filteredProtocols.length === 0 && (
                      <div className="text-center py-48 border-4 border-dashed border-slate-100 rounded-[5rem] bg-white/30 backdrop-blur-sm">
                         <p className="text-slate-300 font-black uppercase italic tracking-[0.3em] text-2xl">Aguardando Primeiros Feedbacks</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PAINEL APRENDIZ */}
            {userProfile.role === 'aprendiz' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <Card className="lg:col-span-7 p-12 lg:p-20 space-y-12 shadow-2xl border-slate-100">
                  <div className="space-y-3">
                    <h2 className="text-6xl font-black italic uppercase tracking-tighter text-slate-900">Nova Ouvidoria</h2>
                    <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.6em] italic opacity-70">Para: {userProfile.empresa}</p>
                  </div>
                  <form onSubmit={handleCreateProtocol} className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Classificação</label>
                        <select className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black text-xs uppercase shadow-sm outline-none focus:border-blue-500" onChange={e => setFormData({...formData, tipo: e.target.value})}>
                          <option value="Reclamação">Reclamação</option>
                          <option value="Denúncia Anônima">Denúncia Anônima</option>
                          <option value="Elogio / Reconhecimento">Elogio / Reconhecimento</option>
                        </select>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Motivo</label>
                        <select className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black text-xs uppercase shadow-sm outline-none focus:border-blue-500" onChange={e => setFormData({...formData, motivo: e.target.value})}>
                          {formData.tipo.includes('Elogio') ? (
                            <>
                              <option>Ótimo Ambiente</option>
                              <option>Mentor / Gestor</option>
                              <option>Aprendizado</option>
                            </>
                          ) : (
                            <>
                              <option>Desvio de Função</option>
                              <option>Assédio / Pressão</option>
                              <option>Atraso de Bolsa</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Sua Mensagem</label>
                         {!formData.tipo.includes('Elogio') && (
                           <button type="button" onClick={handleIA} disabled={loadingAI || !formData.descricao} className="bg-slate-950 text-white px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-30">
                             {loadingAI ? 'Processando...' : '✨ Validar com IA'}
                           </button>
                         )}
                      </div>
                      <textarea rows={8} value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className={`w-full p-10 border rounded-[3rem] font-medium text-xl outline-none transition-all shadow-sm ${formData.tipo.includes('Elogio') ? 'bg-emerald-50/30 border-emerald-100 focus:border-emerald-500' : 'bg-slate-50/50 border-slate-100 focus:border-blue-600'}`} placeholder="Escreva o que aconteceu..." required />
                    </div>
                    <button className={`w-full text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl transition-all uppercase italic tracking-widest ${formData.tipo.includes('Elogio') ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                      {formData.tipo.includes('Elogio') ? 'Enviar Elogio' : 'Enviar Manifestação'}
                    </button>
                  </form>
                </Card>
                
                <div className="lg:col-span-5 space-y-8">
                   <Card className="p-12 bg-slate-950 text-white border-none shadow-2xl">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.4em] mb-10 text-blue-400 italic">Suporte Legal</h3>
                      {legalAnalysis ? (
                        <div className="space-y-6 text-slate-300 text-lg leading-relaxed italic animate-in">
                          {legalAnalysis.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm italic">Use a IA para analisar seu relato com base na Lei do Aprendiz.</p>
                      )}
                   </Card>
                   
                   <div className="bg-blue-50/50 p-12 rounded-[4rem] border border-blue-100">
                      <h4 className="font-black text-blue-900 uppercase italic text-sm mb-8">FAQ</h4>
                      <FAQItem question="Minha denúncia é anônima?" answer="Sim. Se selecionar 'Denúncia Anônima', seus dados pessoais não serão repassados à empresa." />
                      <FAQItem question="O que é o PJA?" answer="O Portal Jovem Aprendiz é uma ponte ética entre jovens, empresas e órgãos fiscalizadores." />
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-slate-100 py-24 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em] italic">© 2025 PORTAL JOVEM APRENDIZ</p>
      </footer>
    </div>
  );
};

export default App;
