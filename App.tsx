
import React, { useState, useEffect } from 'react';
import { UserRole, ProtocolData, Company, User } from './types';
import { refineReportDescription } from './geminiService';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [protocol, setProtocol] = useState<ProtocolData | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  const [authForm, setAuthForm] = useState({
    identificacao: '',
    senha: '',
    confirmarSenha: '',
    empresa: ''
  });

  const [formData, setFormData] = useState({
    tipo: 'Denúncia',
    motivo: 'Desvio de função',
    local: '',
    horario: '12:00',
    empresa: '',
    descricao: ''
  });

  const [companyForm, setCompanyForm] = useState({
    nomeFantasia: '',
    cnpj: '',
    unidade: '',
    endereco: '',
    cidade: ''
  });

  useEffect(() => {
    const savedUsers = localStorage.getItem('pja_users');
    const savedCompanies = localStorage.getItem('pja_companies');
    
    if (savedUsers) setUsers(JSON.parse(savedUsers));
    if (savedCompanies) {
      setCompanies(JSON.parse(savedCompanies));
    } else {
      const initialComp = [
        { id: '1', nomeFantasia: 'Tech Soluções LTDA', cnpj: '12.345.678/0001-90', unidade: 'Matriz São Paulo', endereco: 'Av. Paulista, 1000', cidade: 'São Paulo' }
      ];
      setCompanies(initialComp);
      localStorage.setItem('pja_companies', JSON.stringify(initialComp));
    }
  }, []);

  const validatePassword = (password: string) => {
    const regex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
      if (!validatePassword(authForm.senha)) {
        alert("A senha deve ter no mínimo 8 caracteres e conter letras e números.");
        return;
      }
      if (authForm.senha !== authForm.confirmarSenha) {
        alert("As senhas não coincidem!");
        return;
      }
      if (!authForm.empresa) {
        alert(role === 'aprendiz' ? "Selecione sua empresa de trabalho." : "Informe o nome da sua empresa.");
        return;
      }

      const userExists = users.find(u => u.identificacao === authForm.identificacao);
      if (userExists) {
        alert("Esta identificação já está cadastrada!");
        return;
      }

      const newUser: User = {
        nome: authForm.empresa, // Usamos o nome da empresa como identificador visual principal
        identificacao: authForm.identificacao,
        senha: authForm.senha,
        role: role,
        empresa: authForm.empresa
      };

      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem('pja_users', JSON.stringify(updatedUsers));
      
      setUserProfile(newUser);
      if (role === 'aprendiz') {
        setFormData(prev => ({ ...prev, empresa: authForm.empresa }));
      }
      setIsLoggedIn(true);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } else {
      const user = users.find(u => 
        u.identificacao === authForm.identificacao && 
        u.senha === authForm.senha &&
        u.role === role
      );
      if (user) {
        setUserProfile(user);
        if (user.role === 'aprendiz' && user.empresa) {
          setFormData(prev => ({ ...prev, empresa: user.empresa || '' }));
        }
        setIsLoggedIn(true);
      } else {
        alert("Acesso negado! Verifique seus dados.");
      }
    }
    setAuthForm({ identificacao: '', senha: '', confirmarSenha: '', empresa: '' });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setRole(null);
    setProtocol(null);
    setUserProfile(null);
    setIsRegistering(false);
  };

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const newCompany: Company = { ...companyForm, id: Date.now().toString() };
    const updated = [...companies, newCompany];
    setCompanies(updated);
    localStorage.setItem('pja_companies', JSON.stringify(updated));
    setCompanyForm({ nomeFantasia: '', cnpj: '', unidade: '', endereco: '', cidade: '' });
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleRefineWithIA = async () => {
    if (!formData.descricao) return;
    setLoadingAI(true);
    try {
      const refined = await refineReportDescription(formData.descricao);
      setFormData({ ...formData, descricao: refined });
    } catch (error) { console.error(error); } finally { setLoadingAI(false); }
  };

  const handleSubmitProtocol = (e: React.FormEvent) => {
    e.preventDefault();
    setProtocol({
      ...formData,
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      dataCriacao: new Date()
    });
  };

  if (protocol) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-[2rem] shadow-2xl max-w-lg w-full border-t-[12px] border-emerald-500 animate-in text-center">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight italic">Protocolo Registrado!</h2>
            <p className="text-slate-500 mt-3 mb-10 font-medium">Sua manifestação foi enviada com sucesso.</p>
          <div className="bg-slate-50 rounded-3xl p-10 border-2 border-slate-100 mb-10 font-mono text-left shadow-sm">
            <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">CÓDIGO DE ACOMPANHAMENTO</p>
            <p className="text-5xl font-black text-blue-700 tracking-tighter">#{protocol.id}</p>
          </div>
          <button onClick={handleLogout} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-2xl active:scale-95">Finalizar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative pb-20">
      {showSuccessToast && (
        <div className="fixed top-24 right-6 bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-right-full font-bold">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          <span>Acesso liberado!</span>
        </div>
      )}

      <header className="bg-blue-700 text-white py-6 px-8 shadow-2xl sticky top-0 z-40 border-b border-white/10 backdrop-blur-md bg-blue-700/90">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="bg-white text-blue-700 h-14 w-14 flex items-center justify-center rounded-2xl font-black text-3xl shadow-2xl transform -rotate-6 border-b-4 border-blue-200">PJA</div>
            <div>
              <h1 className="font-black text-2xl leading-none tracking-tighter italic text-white shadow-sm">Portal Jovem Aprendiz</h1>
              <p className="text-[10px] uppercase font-black opacity-60 tracking-[0.3em] mt-1.5">Ouvidoria Federal • Proteção de Dados</p>
            </div>
          </div>
          
          {isLoggedIn && userProfile && (
            <div className="flex items-center gap-4 animate-in">
                <div className="flex items-center gap-4 bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-[1.5rem] border border-white/30 shadow-2xl transition-all">
                    <div className="w-10 h-10 rounded-full bg-white text-blue-700 flex items-center justify-center font-black text-lg shadow-inner border-2 border-blue-400/30">
                        {userProfile.identificacao.charAt(0)}
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className="text-sm font-black leading-none">{userProfile.empresa || userProfile.identificacao}</p>
                        <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest mt-1.5">
                            {userProfile.role === 'empresa' ? 'Recursos Humanos' : 'Aprendiz Ativo'}
                        </p>
                    </div>
                    <button onClick={handleLogout} className="ml-2 p-2.5 bg-black/30 hover:bg-red-500 rounded-xl transition-all text-white shadow-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-16 px-8">
        {!role && (
          <div className="text-center">
            <h2 className="text-5xl font-black text-slate-800 mb-6 tracking-tighter italic">Bem-vindo à Ouvidoria Oficial</h2>
            <p className="text-slate-500 mb-16 font-semibold text-lg max-w-2xl mx-auto">Protegendo o futuro profissional do Brasil com transparência e segurança jurídica.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { id: 'aprendiz', title: 'Jovem Aprendiz', desc: 'Relate irregularidades no contrato ou ambiente de trabalho.', icon: '🎓' },
                { id: 'empresa', title: 'Empresa (RH)', desc: 'Gestão de unidades e conformidade com a Lei.', icon: '🏢' },
                { id: 'ministerio', title: 'Auditores', desc: 'Fiscalização de protocolos e auditoria.', icon: '⚖️' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setRole(item.id as UserRole)}
                  className="bg-white p-12 rounded-[2.5rem] border-2 border-slate-100 hover:border-blue-500 hover:shadow-2xl transition-all group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                  <div className="text-6xl mb-8 group-hover:scale-110 transition-transform origin-left drop-shadow-md">{item.icon}</div>
                  <h3 className="font-black text-2xl text-slate-800 mb-4 tracking-tight italic">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-bold opacity-80">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {role && !isLoggedIn && (
          <div className="max-w-md mx-auto bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-in">
            <button onClick={() => { setRole(null); setIsRegistering(false); }} className="text-slate-400 hover:text-blue-600 mb-10 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
              Voltar ao Início
            </button>
            <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tighter italic">
                {isRegistering ? 'Criar Conta' : 'Acessar Portal'}
            </h2>
            <p className="text-blue-600 text-[11px] mb-10 uppercase font-black tracking-[0.4em] flex items-center gap-3">
                <span className="w-10 h-[3px] bg-blue-600 rounded-full"></span>
                Portal do {role === 'empresa' ? 'RH' : (role === 'aprendiz' ? 'Aprendiz' : 'Ministério')}
            </p>
            
            <form onSubmit={handleAuthSubmit} className="space-y-6">
              {isRegistering && (
                <div className="animate-in">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic">
                        {role === 'aprendiz' ? 'Onde você trabalha?' : 'Nome da Empresa/Instituição'}
                    </label>
                    {role === 'aprendiz' ? (
                      <select value={authForm.empresa} onChange={(e) => setAuthForm({...authForm, empresa: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-600 appearance-none shadow-sm" required>
                        <option value="">Selecione sua empresa...</option>
                        {companies.map(c => <option key={c.id} value={`${c.nomeFantasia} (${c.unidade})`}>{c.nomeFantasia} — {c.unidade}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={authForm.empresa} onChange={(e) => setAuthForm({...authForm, empresa: e.target.value})} placeholder="Ex: Tech Solutions LTDA" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm" required />
                    )}
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic">
                    Identificação ({role === 'aprendiz' ? 'Matrícula' : 'CNPJ'})
                </label>
                <input type="text" value={authForm.identificacao} onChange={(e) => setAuthForm({...authForm, identificacao: e.target.value})} placeholder={role === 'aprendiz' ? 'Número da Matrícula' : '00.000.000/0000-00'} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm" required />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block italic">Senha de Acesso</label>
                    {isRegistering && (
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded-full">8+ Chars / Letras + Números</span>
                    )}
                </div>
                <input type="password" value={authForm.senha} onChange={(e) => setAuthForm({...authForm, senha: e.target.value})} placeholder="••••••••" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm" required />
              </div>

              {isRegistering && (
                <div className="animate-in">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic">Confirmar Senha</label>
                    <input type="password" value={authForm.confirmarSenha} onChange={(e) => setAuthForm({...authForm, confirmarSenha: e.target.value})} placeholder="••••••••" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm" required />
                </div>
              )}

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] mt-6 uppercase tracking-tighter italic border-b-4 border-blue-800">
                {isRegistering ? 'Criar Acesso' : 'Entrar no Portal'}
              </button>
            </form>
            
            <div className="mt-10 pt-10 border-t-2 border-slate-50 text-center">
                <p className="text-sm font-bold text-slate-500">
                    {isRegistering ? 'Já tem acesso?' : 'Ainda não é cadastrado?'}
                    <button onClick={() => setIsRegistering(!isRegistering)} className="ml-2 text-blue-600 font-black hover:underline underline-offset-8 decoration-2 italic">
                        {isRegistering ? 'Faça login' : 'Crie sua conta'}
                    </button>
                </p>
            </div>
          </div>
        )}

        {isLoggedIn && role === 'empresa' && (
          <div className="space-y-12 animate-in">
            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-900 p-12 text-white relative">
                <div className="absolute top-0 right-0 p-12 opacity-10 text-8xl">🏢</div>
                <h2 className="text-4xl font-black tracking-tighter italic">Painel Corporativo</h2>
                <p className="text-slate-400 text-sm mt-3 font-bold uppercase tracking-[0.2em]">Gestão de Unidades Operacionais</p>
              </div>
              <form onSubmit={handleAddCompany} className="p-12 grid grid-cols-1 md:grid-cols-2 gap-10 bg-white">
                <div className="md:col-span-2">
                   <p className="text-slate-800 font-black text-xl mb-4 italic">Nova Unidade</p>
                   <div className="h-[2px] w-12 bg-blue-600 rounded-full mb-8"></div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Nome Fantasia da Unidade</label>
                  <input type="text" value={companyForm.nomeFantasia} onChange={(e) => setCompanyForm({...companyForm, nomeFantasia: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold shadow-sm" placeholder="Ex: Matriz Administrativa" required />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">CNPJ da Unidade</label>
                  <input type="text" value={companyForm.cnpj} onChange={(e) => setCompanyForm({...companyForm, cnpj: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold shadow-sm" placeholder="00.000.000/0000-00" required />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Identificação Interna</label>
                  <input type="text" value={companyForm.unidade} onChange={(e) => setCompanyForm({...companyForm, unidade: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold shadow-sm" placeholder="Ex: Polo Industrial Sul" required />
                </div>
                <div className="md:col-span-2 pt-8">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-2xl transition-all uppercase tracking-tighter italic border-b-4 border-blue-800">Salvar Nova Unidade</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isLoggedIn && role === 'aprendiz' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in">
            <div className="bg-slate-900 p-12 text-white relative">
              <div className="absolute top-0 right-0 p-12 opacity-10 text-8xl">📄</div>
              <h2 className="text-4xl font-black tracking-tighter italic">Sua Ouvidoria</h2>
              <p className="text-slate-400 text-sm mt-3 font-bold uppercase tracking-[0.2em]">Relato anônimo e seguro</p>
            </div>
            <form onSubmit={handleSubmitProtocol} className="p-12 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Sua Empresa Vinculada</label>
                  <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-3xl text-blue-900 font-black flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-sm text-2xl">🏢</div>
                        <div>
                            <p className="text-lg leading-none">{userProfile?.empresa}</p>
                            <p className="text-[10px] text-blue-500 uppercase font-bold mt-1 tracking-widest italic">Empresa Confirmada</p>
                        </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block italic">Natureza da Manifestação</label>
                  <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none font-black text-slate-700 appearance-none cursor-pointer focus:border-blue-400 transition-all shadow-sm">
                    <option>Denúncia</option>
                    <option>Reclamação</option>
                    <option>Sugestão</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block italic">Motivo do Relato</label>
                  <select value={formData.motivo} onChange={(e) => setFormData({...formData, motivo: e.target.value})} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none font-black text-slate-700 appearance-none cursor-pointer focus:border-blue-400 transition-all shadow-sm">
                    <option>Desvio de função</option>
                    <option>Assédio moral ou físico</option>
                    <option>Carga horária excessiva</option>
                    <option>Outro motivo</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block italic">Descrição Detalhada</label>
                    <button type="button" onClick={handleRefineWithIA} disabled={loadingAI || !formData.descricao} className="flex items-center gap-3 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 text-[10px] font-black uppercase tracking-[0.1em] shadow-lg shadow-indigo-100 italic">
                      {loadingAI ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : '✨ Polir com IA'}
                    </button>
                  </div>
                  <textarea rows={8} value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none resize-none leading-relaxed font-bold text-slate-700 focus:bg-white focus:border-blue-400 transition-all shadow-inner" required placeholder="Relate o ocorrido com detalhes..."></textarea>
                </div>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-7 rounded-[2rem] font-black text-2xl shadow-2xl shadow-blue-200 transition-all uppercase tracking-tighter italic border-b-8 border-blue-800 active:translate-y-1">ENVIAR PROTOCOLO FEDERAL</button>
            </form>
          </div>
        )}

        {isLoggedIn && role === 'ministerio' && (
          <div className="bg-white p-24 rounded-[3.5rem] border-4 border-dashed border-slate-200 text-center animate-in shadow-inner">
            <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-10 text-7xl shadow-2xl border-4 border-white">⚖️</div>
            <h3 className="text-4xl font-black text-slate-800 tracking-tighter italic">Painel do Auditor Fiscal</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-6 font-bold opacity-80 leading-relaxed uppercase text-[11px] tracking-widest">Identidade Confirmada via Sistema Federal.</p>
          </div>
        )}
      </main>

      <footer className="max-w-4xl mx-auto py-16 px-8 text-center text-slate-400 text-[10px] font-black tracking-[0.5em] uppercase opacity-30 mt-20 border-t border-slate-200">
        PJA • Brasil • Segurança Criptografada • Proteção LGPD
      </footer>
    </div>
  );
};

export default App;
