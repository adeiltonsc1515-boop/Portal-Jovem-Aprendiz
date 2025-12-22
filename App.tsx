
import React, { useState, useEffect } from 'react';
import { UserRole, ProtocolData, Company, User } from './types.ts';
import { refineReportDescription } from './geminiService.ts';

// Componente de Notificação (Toast)
const Notification: React.FC<{ message: string; type: 'error' | 'success' | 'warning'; onClose: () => void }> = ({ message, type, onClose }) => {
  const bgColors = {
    error: 'bg-red-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-500'
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-24 right-6 ${bgColors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-right-full font-bold border-b-4 border-black/20`}>
      <span className="text-xl">
        {type === 'error' && '❌'}
        {type === 'success' && '✅'}
        {type === 'warning' && '⚠️'}
      </span>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase opacity-70 font-black tracking-widest">
          {type === 'error' ? 'Falha' : (type === 'success' ? 'Sucesso' : 'Sistema')}
        </span>
        <span className="text-sm">{message}</span>
      </div>
      <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">✕</button>
    </div>
  );
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('aprendiz');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [protocol, setProtocol] = useState<ProtocolData | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' | 'warning' } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userProfile, setUserProfile] = useState<User | null>(null);

  const [authForm, setAuthForm] = useState({
    nome: '',
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

  // Carregamento inicial de dados salvos
  useEffect(() => {
    const loadData = () => {
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
    };
    loadData();
  }, [isRegistering, isLoggedIn]); // Recarrega ao mudar estado de auth para garantir sincronia

  const showMsg = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setNotification({ message, type });
  };

  const validatePassword = (password: string) => {
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const isAlphanumericOnly = /^[a-zA-Z0-9]+$/.test(password);
    const hasMinLength = password.length >= 8;
    return hasLetters && hasNumbers && isAlphanumericOnly && hasMinLength;
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (isRegistering) {
      if (role === 'ministerio') {
        showMsg("Cadastros de auditores são realizados apenas via Intranet Federal.", "warning");
        return;
      }
      
      if (!authForm.nome || authForm.nome.length < 3) errors.nome = "Informe seu nome completo.";
      if (!validatePassword(authForm.senha)) errors.senha = "A senha deve conter no mínimo 8 caracteres, sendo letras e números e sem símbolos.";
      if (authForm.senha !== authForm.confirmarSenha) errors.confirmarSenha = "As senhas não são iguais.";
      if (!authForm.empresa) errors.empresa = "Selecione a empresa onde você trabalha.";

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        if (errors.confirmarSenha) showMsg(errors.confirmarSenha);
        else if (errors.senha) showMsg(errors.senha);
        else showMsg("Verifique os campos obrigatórios.");
        return;
      }

      const userExists = users.find(u => u.identificacao === authForm.identificacao);
      if (userExists) {
        showMsg("Este usuário já possui cadastro ativo.");
        return;
      }

      const newUser: User = {
        nome: authForm.nome,
        identificacao: authForm.identificacao,
        senha: authForm.senha,
        role: role,
        empresa: authForm.empresa
      };

      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem('pja_users', JSON.stringify(updatedUsers));
      
      setUserProfile(newUser);
      if (role === 'aprendiz') setFormData(prev => ({ ...prev, empresa: authForm.empresa }));
      setIsLoggedIn(true);
      showMsg("Conta criada com sucesso!", "success");
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
        showMsg(`Bem-vindo, ${user.nome}!`, "success");
      } else {
        showMsg("Acesso negado. Dados incorretos.");
      }
    }
    setFieldErrors({});
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setProtocol(null);
    setUserProfile(null);
    setIsRegistering(false);
    showMsg("Sessão encerrada.", "warning");
  };

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const newCompany: Company = { ...companyForm, id: Date.now().toString() };
    const updated = [...companies, newCompany];
    setCompanies(updated);
    localStorage.setItem('pja_companies', JSON.stringify(updated));
    setCompanyForm({ nomeFantasia: '', cnpj: '', unidade: '', endereco: '', cidade: '' });
    showMsg("Unidade corporativa registrada!", "success");
  };

  const handleRefineWithIA = async () => {
    if (!formData.descricao) return;
    setLoadingAI(true);
    try {
      const refined = await refineReportDescription(formData.descricao);
      setFormData({ ...formData, descricao: refined });
      showMsg("Texto refinado!", "success");
    } catch (error) { 
      showMsg("Erro na IA.", "error");
    } finally { 
      setLoadingAI(false); 
    }
  };

  const handleSubmitProtocol = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.descricao.length < 20) {
      showMsg("Dê mais detalhes no relato.");
      return;
    }
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
            <h2 className="text-3xl font-black text-slate-800 tracking-tight italic">Relato Enviado!</h2>
            <p className="text-slate-500 mt-3 mb-10 font-medium">Sua manifestação está salva e em análise.</p>
          <div className="bg-slate-50 rounded-3xl p-10 border-2 border-slate-100 mb-10 font-mono text-left shadow-sm">
            <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">PROTOCOLO GERADO</p>
            <p className="text-5xl font-black text-blue-700 tracking-tighter">#{protocol.id}</p>
          </div>
          <button onClick={() => { setProtocol(null); setIsLoggedIn(false); }} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-2xl active:scale-95 italic uppercase tracking-widest">Sair do Portal</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative pb-20">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
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
                    <div className="w-10 h-10 rounded-full bg-white text-blue-700 flex items-center justify-center font-black text-lg shadow-inner border-2 border-blue-400/30 overflow-hidden uppercase">
                        {userProfile.nome.charAt(0)}
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className="text-sm font-black leading-none">{userProfile.nome}</p>
                        <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest mt-1.5">
                            {userProfile.role === 'empresa' ? 'Corporativo' : (userProfile.role === 'ministerio' ? 'Auditoria' : 'Aprendiz')}
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

      <main className="max-w-5xl mx-auto py-12 px-8">
        {!isLoggedIn && (
          <div className="max-w-lg mx-auto animate-in">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic mb-3 uppercase">PJA Federal</h2>
              <p className="text-slate-500 font-bold text-sm">Acesso Seguro • Proteção LGPD</p>
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="flex bg-slate-50 p-2 border-b border-slate-100">
                {[
                  { id: 'aprendiz', label: 'Aprendiz', icon: '🎓' },
                  { id: 'empresa', label: 'Empresa', icon: '🏢' },
                  { id: 'ministerio', label: 'Auditor', icon: '⚖️' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setRole(p.id as UserRole); setIsRegistering(false); setFieldErrors({}); }}
                    className={`flex-1 py-4 px-2 rounded-2xl flex flex-col items-center gap-1 transition-all ${role === p.id ? 'bg-white shadow-lg text-blue-700' : 'text-slate-400 grayscale opacity-60 hover:opacity-100'}`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{p.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-10 pt-12">
                <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tighter italic">
                    {isRegistering ? 'Criar Cadastro' : 'Acessar Conta'}
                </h3>
                <p className="text-blue-600 text-[11px] mb-10 uppercase font-black tracking-[0.4em] flex items-center gap-3">
                    <span className="w-10 h-[3px] bg-blue-600 rounded-full"></span>
                    Módulo de {role === 'empresa' ? 'Corporativo' : (role === 'aprendiz' ? 'Estudante' : 'Federal')}
                </p>
                
                <form onSubmit={handleAuthSubmit} className="space-y-6">
                  {isRegistering && (
                    <div className="animate-in space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic">
                                Nome Completo
                            </label>
                            <input 
                              type="text" 
                              value={authForm.nome} 
                              onChange={(e) => {setAuthForm({...authForm, nome: e.target.value}); setFieldErrors({...fieldErrors, nome: ''})}} 
                              placeholder="Digite seu nome completo" 
                              className={`w-full p-5 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold text-slate-700 shadow-sm ${fieldErrors.nome ? 'border-red-400 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`} 
                              required 
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic">
                                {role === 'aprendiz' ? 'Empresa de Atuação' : 'Nome Fantasia da Empresa'}
                            </label>
                            {role === 'aprendiz' ? (
                              <div className="relative">
                                <select 
                                  value={authForm.empresa} 
                                  onChange={(e) => {setAuthForm({...authForm, empresa: e.target.value}); setFieldErrors({...fieldErrors, empresa: ''})}} 
                                  className={`w-full p-5 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold text-slate-800 shadow-sm appearance-none cursor-pointer ${fieldErrors.empresa ? 'border-red-400 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`} 
                                  required
                                >
                                  <option value="" className="text-slate-400">Selecione a empresa...</option>
                                  {companies.map(c => (
                                    <option key={c.id} value={`${c.nomeFantasia} (${c.unidade || 'Unidade Única'})`} className="text-slate-900 font-bold py-2">
                                      {c.nomeFantasia} — {c.unidade || 'Geral'}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-blue-600">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                              </div>
                            ) : (
                              <input 
                                type="text" 
                                value={authForm.empresa} 
                                onChange={(e) => {setAuthForm({...authForm, empresa: e.target.value}); setFieldErrors({...fieldErrors, empresa: ''})}} 
                                placeholder="Ex: Empresa Exemplo LTDA" 
                                className={`w-full p-5 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold text-slate-700 shadow-sm ${fieldErrors.empresa ? 'border-red-400 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`} 
                                required 
                              />
                            )}
                            {fieldErrors.empresa && <p className="text-red-500 text-[10px] font-black mt-2 uppercase animate-in">⚠️ {fieldErrors.empresa}</p>}
                        </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic">
                        {role === 'aprendiz' ? 'Matrícula Escolar' : (role === 'ministerio' ? 'ID Auditor' : 'CNPJ Corporativo')}
                    </label>
                    <input type="text" value={authForm.identificacao} onChange={(e) => setAuthForm({...authForm, identificacao: e.target.value})} placeholder={role === 'aprendiz' ? 'Sua Matrícula' : 'Identificação Oficial'} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm" required />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block italic">Senha</label>
                    </div>
                    <input 
                      type="password" 
                      value={authForm.senha} 
                      onChange={(e) => {setAuthForm({...authForm, senha: e.target.value}); setFieldErrors({...fieldErrors, senha: ''})}} 
                      placeholder="8+ Letras e Números" 
                      className={`w-full p-5 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold text-slate-700 shadow-sm ${fieldErrors.senha ? 'border-red-400 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`} 
                      required 
                    />
                  </div>

                  {isRegistering && (
                    <div className="animate-in">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic">Confirmar Senha</label>
                        <input 
                          type="password" 
                          value={authForm.confirmarSenha} 
                          onChange={(e) => {setAuthForm({...authForm, confirmarSenha: e.target.value}); setFieldErrors({...fieldErrors, confirmarSenha: ''})}} 
                          placeholder="Repita a senha" 
                          className={`w-full p-5 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold text-slate-700 shadow-sm ${fieldErrors.confirmarSenha ? 'border-red-400 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`} 
                          required 
                        />
                    </div>
                  )}

                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-2xl transition-all active:scale-[0.98] mt-6 uppercase tracking-tighter italic border-b-4 border-blue-800">
                    {isRegistering ? 'Cadastrar Dados' : 'Acessar Portal'}
                  </button>
                </form>
                
                <div className="mt-10 pt-10 border-t-2 border-slate-50 text-center">
                    <p className="text-sm font-bold text-slate-500">
                        {isRegistering ? 'Já possui conta?' : 'Novo aqui?'}
                        <button onClick={() => { setIsRegistering(!isRegistering); setAuthForm({ nome: '', identificacao: '', senha: '', confirmarSenha: '', empresa: '' }); setFieldErrors({}); }} className="ml-2 text-blue-600 font-black hover:underline underline-offset-8 decoration-2 italic">
                            {isRegistering ? 'Entrar Agora' : 'Criar Cadastro'}
                        </button>
                    </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoggedIn && role === 'empresa' && (
          <div className="space-y-12 animate-in">
            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-900 p-12 text-white relative">
                <div className="absolute top-0 right-0 p-12 opacity-10 text-8xl">🏢</div>
                <h2 className="text-4xl font-black tracking-tighter italic">Painel da Empresa</h2>
                <p className="text-slate-400 text-sm mt-3 font-bold uppercase tracking-[0.2em]">Gestão de Unidades</p>
              </div>
              
              <div className="p-12 space-y-16">
                <form onSubmit={handleAddCompany} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="md:col-span-2">
                    <p className="text-slate-800 font-black text-2xl mb-2 italic">Nova Unidade</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Nome Fantasia</label>
                    <input type="text" value={companyForm.nomeFantasia} onChange={(e) => setCompanyForm({...companyForm, nomeFantasia: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold shadow-sm" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Identificação (Unidade/Filial)</label>
                    <input type="text" value={companyForm.unidade} onChange={(e) => setCompanyForm({...companyForm, unidade: e.target.value})} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold shadow-sm" placeholder="Ex: Matriz Administrativa" required />
                  </div>
                  <div className="md:col-span-2">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-2xl border-b-4 border-blue-800">Salvar Unidade</button>
                  </div>
                </form>

                <div className="pt-16 border-t border-slate-100">
                   <h3 className="text-2xl font-black text-slate-800 mb-8 italic">Suas Unidades ({companies.length})</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {companies.map((c) => (
                        <div key={c.id} className="p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] shadow-sm">
                           <div className="flex items-center gap-4 mb-4">
                             <div className="bg-white p-3 rounded-2xl shadow-sm text-2xl">🏢</div>
                             <div>
                               <p className="text-lg font-black text-slate-800 leading-tight">{c.nomeFantasia}</p>
                               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{c.unidade}</p>
                             </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoggedIn && role === 'aprendiz' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in">
            <div className="bg-slate-900 p-12 text-white relative">
              <div className="absolute top-0 right-0 p-12 opacity-10 text-8xl">📄</div>
              <h2 className="text-4xl font-black tracking-tighter italic">Sua Ouvidoria</h2>
              <p className="text-slate-400 text-sm mt-3 font-bold uppercase tracking-[0.2em]">Registro Seguro</p>
            </div>
            <form onSubmit={handleSubmitProtocol} className="p-12 space-y-12">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Vínculo de Trabalho</label>
                <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-3xl text-blue-900 font-black flex items-center gap-4 shadow-inner italic">
                    <div className="bg-white p-3 rounded-2xl shadow-sm text-2xl">🏢</div>
                    <p className="text-lg">{userProfile?.empresa}</p>
                </div>
              </div>
              <textarea rows={8} value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none font-bold text-slate-700 focus:bg-white focus:border-blue-400 transition-all shadow-inner" required placeholder="Relate o que aconteceu com detalhes..."></textarea>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-7 rounded-[2rem] font-black text-2xl shadow-2xl border-b-8 border-blue-800 uppercase italic">ENVIAR RELATO</button>
            </form>
          </div>
        )}
      </main>

      <footer className="max-w-4xl mx-auto py-16 text-center text-slate-400 text-[10px] font-black tracking-[0.5em] uppercase opacity-30 mt-20 border-t border-slate-200">
        PJA • Brasil • Proteção de Dados Ativa
      </footer>
    </div>
  );
};

export default App;
