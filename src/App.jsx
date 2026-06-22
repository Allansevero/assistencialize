import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import Onboarding from './Onboarding';
import './App.css';

function TabWebview({ profileId, tab, isActive, preloadPath, onUnreadChange, onTitleChange, onUrlChange }) {
  const webviewRef = useRef(null);
  const [initialUrl] = useState(tab.url); // Use initial URL for the src attribute

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleTitleUpdated = (e) => {
      const title = e.title || '';
      
      // Update title in state
      if (onTitleChange) {
        onTitleChange(profileId, tab.id, title);
      }

      // Special WhatsApp logic
      if (tab.isFixed) {
        const hasUnread = title.startsWith('(') && title.includes(')');
        if (onUnreadChange) onUnreadChange(profileId, hasUnread);
      }
    };

    const handleDidNavigate = (e) => {
      if (onUrlChange) {
        onUrlChange(profileId, tab.id, e.url);
      }
    };

    webview.addEventListener('page-title-updated', handleTitleUpdated);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigate);
    
    return () => {
      webview.removeEventListener('page-title-updated', handleTitleUpdated);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('did-navigate-in-page', handleDidNavigate);
    };
  }, [profileId, tab.id, tab.isFixed, onUnreadChange, onTitleChange, onUrlChange]);

  // Update src only if explicitly forced or initially
  useEffect(() => {
    const webview = webviewRef.current;
    if (webview && tab.forceNavigateUrl) {
      webview.loadURL(tab.forceNavigateUrl);
    }
  }, [tab.forceNavigateUrl]);

  return (
    <webview
      ref={webviewRef}
      src={initialUrl}
      partition={`persist:wp_${profileId}`}
      preload={preloadPath}
      style={{ display: isActive ? 'flex' : 'none', width: '100%', height: '100%' }}
      allowpopups="true"
      nodeintegration="false"
      contextisolation="true"
      useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    />
  );
}

const DEFAULT_TAB = { id: 'whatsapp', title: 'WhatsApp', url: 'https://web.whatsapp.com/', isFixed: true };

// Desativar logs em produção
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userPlan, setUserPlan] = useState(null);

  // ── Onboarding ─────────────────────────────────────────────
  // "needsOnboarding" = usuário logado mas ainda não fez onboarding
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Modal de cadastro — multi-step
  const [showRegister, setShowRegister] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    whatsapp: '',
    password: '',
  });

  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [unreadStates, setUnreadStates] = useState({});
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [webviewPreloadPath, setWebviewPreloadPath] = useState('');

  useEffect(() => {
    // Buscar o caminho do preload do webview
    if (window.electronAPI && window.electronAPI.getWebviewPreloadPath) {
      window.electronAPI.getWebviewPreloadPath().then(path => {
        setWebviewPreloadPath(`file://${path}`);
      });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkOnboarding(session.user.id);
        fetchUserData(session.user.id);
      } else {
        setOnboardingChecked(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkOnboarding(session.user.id);
        fetchUserData(session.user.id);
      } else {
        setProfiles([]);
        setUserPlan(null);
        setNeedsOnboarding(false);
        setOnboardingChecked(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboarding = async (userId) => {
    // Verifica se o usuário já completou o onboarding
    // Critério: tem pelo menos 1 perfil criado OR flag onboarding_done no user_profile
    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('onboarding_done')
        .eq('id', userId)
        .maybeSingle();

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      const isDone = profileData?.onboarding_done === true || (profiles && profiles.length > 0);
      setNeedsOnboarding(!isDone);
    } catch {
      setNeedsOnboarding(false); // em caso de erro, não bloqueia
    } finally {
      setOnboardingChecked(true);
    }
  };

  const handleOnboardingComplete = async () => {
    // Marca onboarding como concluído
    try {
      await supabase
        .from('user_profiles')
        .update({ onboarding_done: true })
        .eq('id', session.user.id);
    } catch {
      // silencioso
    }
    setNeedsOnboarding(false);
    fetchUserData(session.user.id);
  };

  const fetchUserData = async (userId) => {
    setLoading(true);
    try {
      // 1. Fetch Subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (subError) throw subError;
      
      if (subData) {
        setUserPlan({
          name: subData.plan_type === 'paid' ? 'Profissional' : 'Gratuito',
          plan_type: subData.plan_type,
          max_instances: subData.plan_type === 'paid' ? 9999 : 2
        });
      } else {
        // Default to Free if no entry exists
        setUserPlan({ name: 'Gratuito', plan_type: 'free', max_instances: 2 });
      }

      // 2. Fetch Profiles
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (profError) throw profError;
      
      const fetchedProfiles = profData || [];
      setProfiles(fetchedProfiles);

      // Garantir que cada perfil tenha pelo menos a aba do WhatsApp inicializada localmente
      setTabsData(prev => {
        const newTabs = { ...prev };
        fetchedProfiles.forEach(p => {
          if (!newTabs[p.id]) {
            newTabs[p.id] = [DEFAULT_TAB];
          }
        });
        return newTabs;
      });

      setActiveTabs(prev => {
        const newActive = { ...prev };
        fetchedProfiles.forEach(p => {
          if (!newActive[p.id]) {
            newActive[p.id] = 'whatsapp';
          }
        });
        return newActive;
      });

      if (fetchedProfiles.length > 0) {
        setActiveProfileId(current => {
          // Se já existe um perfil ativo e ele ainda está na lista, mantém ele.
          if (current && fetchedProfiles.some(p => p.id === current)) {
            return current;
          }
          // Caso contrário, pega o primeiro da lista.
          return fetchedProfiles[0].id;
        });
      }
    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError(null);

    // Etapa 1 → 2: valida e-mail e senha
    if (registerStep === 1) {
      if (!registerForm.email || !registerForm.password) return;
      if (registerForm.password.length < 6) {
        setRegisterError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      setRegisterStep(2);
      return;
    }

    // Etapa 2 → 3: valida nome
    if (registerStep === 2) {
      if (!registerForm.firstName || !registerForm.lastName) return;
      setRegisterStep(3);
      return;
    }

    // Etapa 3: finaliza e cria conta
    setRegisterLoading(true);
    try {
      // 1. Cria usuário no Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            first_name: registerForm.firstName,
            last_name: registerForm.lastName,
            whatsapp: registerForm.whatsapp,
            full_name: `${registerForm.firstName} ${registerForm.lastName}`,
          }
        }
      });
      if (signUpError) throw signUpError;

      const userId = signUpData?.user?.id;

      if (userId) {
        // 2. Cria perfil do usuário na tabela user_profiles
        await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            first_name: registerForm.firstName,
            last_name: registerForm.lastName,
            email: registerForm.email,
            whatsapp: registerForm.whatsapp,
          })
          .then(({ error }) => {
            if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
              console.warn('Aviso ao criar perfil:', error.message);
            }
          });

        // 3. Cria assinatura free
        await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: 'free',
            status: 'active',
          })
          .then(({ error }) => {
            if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
              console.warn('Aviso ao criar assinatura:', error.message);
            }
          });
      }

      setRegisterSuccess(true);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setRegisterError('Este e-mail ja esta cadastrado. Tente fazer login.');
      } else if (msg.includes('Password should be')) {
        setRegisterError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setRegisterError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleRegisterChange = (field, value) => {
    setRegisterForm(prev => ({ ...prev, [field]: value }));
  };

  const openRegister = () => {
    setShowRegister(true);
    setRegisterStep(1);
    setRegisterError(null);
    setRegisterSuccess(false);
    setRegisterForm({ firstName: '', lastName: '', email: '', whatsapp: '', password: '' });
  };

  const [tabsData, setTabsData] = useState(() => {
    const saved = localStorage.getItem('whatsapp-tabs');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeTabs, setActiveTabs] = useState(() => {
    const saved = localStorage.getItem('whatsapp-active-tabs');
    return saved ? JSON.parse(saved) : {};
  });

  const [addressBarValues, setAddressBarValues] = useState({});

  useEffect(() => {
    localStorage.setItem('whatsapp-tabs', JSON.stringify(tabsData));
  }, [tabsData]);

  useEffect(() => {
    localStorage.setItem('whatsapp-active-tabs', JSON.stringify(activeTabs));
  }, [activeTabs]);

  const addProfile = async (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) {
      setIsAddingProfile(false);
      return;
    }

    // Check plan limit
    const max = userPlan?.max_instances || 2;
    if (profiles.length >= max) {
      alert(`Limite atingido! Seu plano ${userPlan?.name} permite apenas ${max === 9999 ? 'ilimitados' : max} perfis. Faça upgrade para ter acesso ilimitado.`);
      setIsAddingProfile(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert([{ name: newProfileName, user_id: session.user.id }])
      .select()
      .single();

    if (error) {
      alert('Erro ao criar perfil: ' + error.message);
      return;
    }

    const newProfile = data;
    setProfiles([...profiles, newProfile]);
    setTabsData(prev => ({ ...prev, [newProfile.id]: [DEFAULT_TAB] }));
    setActiveTabs(prev => ({ ...prev, [newProfile.id]: 'whatsapp' }));
    setNewProfileName('');
    setIsAddingProfile(false);
    setActiveProfileId(newProfile.id);
  };

  const removeProfile = async (id) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao remover perfil: ' + error.message);
      return;
    }

    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    if (activeProfileId === id && updated.length > 0) {
      setActiveProfileId(updated[0].id);
    }
  };


  const handleUnreadChange = useCallback((profileId, hasUnread) => {
    setUnreadStates(prev => {
      if (prev[profileId] === hasUnread) return prev;
      return { ...prev, [profileId]: hasUnread };
    });
  }, []);

  const handleTitleChange = useCallback((profileId, tabId, newTitle) => {
    setTabsData(prev => {
      const pTabs = prev[profileId] || [];
      return {
        ...prev,
        [profileId]: pTabs.map(t => t.id === tabId ? { ...t, title: newTitle } : t)
      };
    });
  }, []);

  const handleUrlChange = useCallback((profileId, tabId, newUrl) => {
    setAddressBarValues(prev => ({ ...prev, [`${profileId}_${tabId}`]: newUrl }));
    setTabsData(prev => {
      const pTabs = prev[profileId] || [];
      return {
        ...prev,
        [profileId]: pTabs.map(t => t.id === tabId ? { ...t, url: newUrl, forceNavigateUrl: null } : t)
      };
    });
  }, []);

  useEffect(() => {
    if (unreadStates[activeProfileId]) {
      setUnreadStates(prev => ({ ...prev, [activeProfileId]: false }));
    }
  }, [activeProfileId, unreadStates]);

  const handleAddTab = (profileId) => {
    const newTabId = `t_${Date.now()}`;
    const newTab = { id: newTabId, title: 'Nova Guia', url: 'https://www.google.com', isFixed: false };
    setTabsData(prev => ({
      ...prev,
      [profileId]: [...(prev[profileId] || []), newTab]
    }));
    setActiveTabs(prev => ({ ...prev, [profileId]: newTabId }));
  };

  const handleCloseTab = (profileId, tabId, e) => {
    e.stopPropagation();
    setTabsData(prev => {
      const pTabs = prev[profileId] || [];
      return { ...prev, [profileId]: pTabs.filter(t => t.id !== tabId) };
    });
    
    setActiveTabs(prev => {
      if (prev[profileId] === tabId) {
        const pTabs = tabsData[profileId] || [];
        const idx = pTabs.findIndex(t => t.id === tabId);
        const nextTab = pTabs[idx - 1] || pTabs[0]; 
        return { ...prev, [profileId]: nextTab ? nextTab.id : 'whatsapp' };
      }
      return prev;
    });
  };

  const handleAddressSubmit = (e, profileId, activeTabId) => {
    e.preventDefault();
    let val = addressBarValues[`${profileId}_${activeTabId}`] || '';
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      if (val.includes('.') && !val.includes(' ')) {
        val = 'https://' + val;
      } else {
        val = 'https://www.google.com/search?q=' + encodeURIComponent(val);
      }
    }
    
    setTabsData(prev => {
      const pTabs = prev[profileId] || [];
      return {
        ...prev,
        [profileId]: pTabs.map(t => t.id === activeTabId ? { ...t, forceNavigateUrl: val } : t)
      };
    });
  };

  const handleNavigation = (action) => {
    const webviews = document.querySelectorAll('webview');
    const activeWebview = Array.from(webviews).find(w => w.style.display !== 'none');
    
    if (activeWebview) {
      if (action === 'back' && activeWebview.canGoBack()) activeWebview.goBack();
      if (action === 'forward' && activeWebview.canGoForward()) activeWebview.goForward();
      if (action === 'reload') activeWebview.reload();
    }
  };

  const currentTabs = tabsData[activeProfileId] || [DEFAULT_TAB];
  const activeTabId = activeTabs[activeProfileId] || 'whatsapp';
  const activeTab = currentTabs.find(t => t.id === activeTabId);

  // ── Mostrar onboarding se necessário ─────────────────────
  if (session && onboardingChecked && needsOnboarding) {
    return (
      <Onboarding
        session={session}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Top Title Bar (Tabs) */}
      <div className="top-title-bar">
        <div className="app-logo-title-bar">
          <img src="app-logo.png" alt="Assistencialize" />
        </div>
        {!session ? (
          <div className="tab-bar">
            <div className="tab active">
              <div className="tab-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>home</span>
              </div>
              <span className="tab-title">Bem vinda</span>
            </div>
          </div>
        ) : profiles.length > 0 ? (
          <div className="tab-bar">
            {currentTabs.map(tab => {
              const domain = new URL(tab.url).hostname;
              const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
              
              return (
                <div 
                  key={tab.id} 
                  className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTabs(prev => ({ ...prev, [activeProfileId]: tab.id }))}
                >
                  <div className="tab-icon">
                    <img src={faviconUrl} alt="" />
                  </div>
                  <span className="tab-title" title={tab.title}>{tab.title}</span>
                  {!tab.isFixed && (
                    <span 
                      className="material-symbols-outlined close-tab-btn" 
                      onClick={(e) => handleCloseTab(activeProfileId, tab.id, e)}
                    >
                      close
                    </span>
                  )}
                </div>
              );
            })}
            <button className="add-tab-btn" onClick={() => handleAddTab(activeProfileId)}>
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        ) : (
          <div className="tab-bar-empty"></div>
        )}
      </div>

      {!session ? (
        <div className="login-screen">
          {/* Fundo: cobre toda a tela */}
          <div className="login-left">
            <img src="login-bg.png" alt="Assistencialize" className="login-bg-img" />
          </div>

          {/* Card sobreposto à direita */}
          <div className="login-right">
            <div className="login-card">
              <div className="login-brand">
                <img src="app-logo.png" alt="Logo" className="login-logo" />
                <span className="login-brand-name">Assistencialize</span>
              </div>

              <h2 className="login-title">Bem-vindo de volta!</h2>
              <p className="login-subtitle">Acesse sua conta e continue transformando atendimentos em experiências incríveis.</p>

              <form onSubmit={handleLogin}>
                <div className="input-group">
                  <label>E-mail</label>
                  <div className="input-with-icon">
                    <span className="material-symbols-outlined">mail</span>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <div className="label-row">
                    <label>Senha</label>
                    <a href="#" className="forgot-password">Esqueceu sua senha?</a>
                  </div>
                  <div className="input-with-icon">
                    <span className="material-symbols-outlined">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <span
                      className="material-symbols-outlined eye-icon"
                      onClick={() => setShowPassword(p => !p)}
                    >
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </div>
                </div>

                {error && <div className="login-error">{error}</div>}

                <button type="submit" className="login-submit-btn" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar na minha conta'}
                </button>

                <p className="login-footer-text">
                  Ainda não tem uma conta?{' '}
                  <button
                    type="button"
                    className="login-contact-link"
                    onClick={() => openRegister()}
                  >
                    Crie sua conta
                  </button>
                </p>
              </form>
            </div>
          </div>

          {/* Modal de Cadastro — Multi-step */}
          {showRegister && (
            <div className="register-overlay" onClick={() => setShowRegister(false)}>
              <div className="register-modal" onClick={e => e.stopPropagation()}>
                <button className="register-close" onClick={() => setShowRegister(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>

                {/* Header */}
                <div className="register-header">
                  <img src="app-logo.png" alt="Logo" className="login-logo" />
                  <span className="login-brand-name">Assistencialize</span>
                </div>

                {registerSuccess ? (
                  <div className="register-success">
                    <span className="material-symbols-outlined" style={{fontSize: '52px', color: '#0d7377'}}>check_circle</span>
                    <h3>Conta criada com sucesso!</h3>
                    <p>Verifique seu e-mail para confirmar o cadastro e depois faça login.</p>
                    <button className="login-submit-btn" onClick={() => setShowRegister(false)} style={{marginTop: '8px'}}>
                      Ir para o login
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Barra de progresso */}
                    <div className="register-progress">
                      {[1, 2, 3].map(s => (
                        <div key={s} className={`register-step-dot ${registerStep >= s ? 'active' : ''}`} />
                      ))}
                    </div>

                    {/* Etapa 1: E-mail + Senha */}
                    {registerStep === 1 && (
                      <form onSubmit={handleRegister} className="register-form">
                        <h2 className="register-title">Crie sua conta</h2>
                        <p className="register-subtitle">Comece com seu e-mail e uma senha segura.</p>

                        <div className="input-group">
                          <label>E-mail</label>
                          <div className="input-with-icon">
                            <span className="material-symbols-outlined">mail</span>
                            <input
                              type="email"
                              placeholder="seu@email.com"
                              value={registerForm.email}
                              onChange={e => handleRegisterChange('email', e.target.value)}
                              required
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="input-group">
                          <label>Senha de acesso</label>
                          <div className="input-with-icon">
                            <span className="material-symbols-outlined">lock</span>
                            <input
                              type={showRegisterPassword ? 'text' : 'password'}
                              placeholder="Mínimo 6 caracteres"
                              value={registerForm.password}
                              onChange={e => handleRegisterChange('password', e.target.value)}
                              minLength={6}
                              required
                            />
                            <span
                              className="material-symbols-outlined eye-icon"
                              onClick={() => setShowRegisterPassword(p => !p)}
                            >
                              {showRegisterPassword ? 'visibility_off' : 'visibility'}
                            </span>
                          </div>
                        </div>

                        {registerError && <div className="login-error">{registerError}</div>}

                        <button type="submit" className="login-submit-btn">
                          Criar conta
                        </button>
                      </form>
                    )}

                    {/* Etapa 2: Nome + Sobrenome */}
                    {registerStep === 2 && (
                      <form onSubmit={handleRegister} className="register-form">
                        <h2 className="register-title">Como chamamos você?</h2>
                        <p className="register-subtitle">Nos diga seu nome para personalizar sua experiência.</p>

                        <div className="register-row">
                          <div className="input-group">
                            <label>Nome</label>
                            <input
                              type="text"
                              placeholder="Seu nome"
                              value={registerForm.firstName}
                              onChange={e => handleRegisterChange('firstName', e.target.value)}
                              required
                              autoFocus
                            />
                          </div>
                          <div className="input-group">
                            <label>Sobrenome</label>
                            <input
                              type="text"
                              placeholder="Seu sobrenome"
                              value={registerForm.lastName}
                              onChange={e => handleRegisterChange('lastName', e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        {registerError && <div className="login-error">{registerError}</div>}

                        <div className="register-nav">
                          <button type="button" className="register-back-btn" onClick={() => setRegisterStep(1)}>
                            <span className="material-symbols-outlined">arrow_back</span>
                            Voltar
                          </button>
                          <button type="submit" className="login-submit-btn register-next-btn">
                            Continuar
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Etapa 3: WhatsApp */}
                    {registerStep === 3 && (
                      <form onSubmit={handleRegister} className="register-form">
                        <h2 className="register-title">Seu WhatsApp</h2>
                        <p className="register-subtitle">Informe seu número para que nossa equipe possa entrar em contato.</p>

                        <div className="input-group">
                          <label>WhatsApp</label>
                          <div className="input-with-icon">
                            <span className="material-symbols-outlined">phone</span>
                            <input
                              type="tel"
                              placeholder="(51) 99999-9999"
                              value={registerForm.whatsapp}
                              onChange={e => handleRegisterChange('whatsapp', e.target.value)}
                              required
                              autoFocus
                            />
                          </div>
                        </div>

                        {registerError && <div className="login-error">{registerError}</div>}

                        <div className="register-nav">
                          <button type="button" className="register-back-btn" onClick={() => setRegisterStep(2)}>
                            <span className="material-symbols-outlined">arrow_back</span>
                            Voltar
                          </button>
                          <button type="submit" className="login-submit-btn register-next-btn" disabled={registerLoading}>
                            {registerLoading ? 'Finalizando...' : 'Finalizar cadastro'}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Address Bar (Full width) */}
          {profiles.length > 0 && (
            <div className="address-bar-container">
              <div className="address-bar-actions">
                <button className="icon-btn" onClick={() => handleNavigation('back')} title="Voltar">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: "'wght' 300", display: 'block' }}>arrow_back</span>
                </button>
                <button className="icon-btn" onClick={() => handleNavigation('forward')} title="Avançar">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: "'wght' 300", display: 'block' }}>arrow_forward</span>
                </button>
                <button className="icon-btn" onClick={() => handleNavigation('reload')} title="Recarregar">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: "'wght' 300", display: 'block' }}>refresh</span>
                </button>
              </div>

              <div className="address-form-wrap">
                <form onSubmit={(e) => handleAddressSubmit(e, activeProfileId, activeTabId)} className="address-form">
                  <span className="material-symbols-outlined form-icon">lock</span>
                  <input 
                    type="text" 
                    value={addressBarValues[`${activeProfileId}_${activeTabId}`] ?? (activeTab ? activeTab.url : '')}
                    onChange={(e) => setAddressBarValues(prev => ({ ...prev, [`${activeProfileId}_${activeTabId}`]: e.target.value }))}
                    disabled={activeTab?.isFixed}
                    placeholder="Pesquisar no Google ou digitar um URL"
                  />
                  <span className="material-symbols-outlined form-icon star">star</span>
                </form>
              </div>

                <div className="address-bar-right">
                  {userPlan && (
                    <div className={`plan-badge-mini ${userPlan.plan_type === 'paid' ? 'mini-paid' : ''}`}>
                      <div className="mini-selo-icon">
                        <img 
                          src="profile_creation_illustration.png" 
                          alt="Selo" 
                        />
                      </div>
                      <span className="mini-plan-name">
                        {userPlan.plan_type === 'paid' ? 'Secretária Profissional' : 'Selo Desbravadora'}
                      </span>
                      {userPlan.plan_type !== 'paid' ? (
                        profiles.some(p => p.whatsapp_connected) ? (
                          <>
                            <div className="mini-progress-wrap">
                              <div 
                                className="mini-progress-fill" 
                                style={{ width: `${(profiles.length / userPlan.max_instances) * 100}%` }}
                              ></div>
                            </div>
                            <span className="mini-plan-count">{profiles.length}/{userPlan.max_instances}</span>
                            <button className="mini-upgrade-btn">Obter Pro</button>
                          </>
                        ) : (
                          <span className="mini-plan-count" style={{ fontWeight: 500, color: '#898d91', marginLeft: '8px' }}>
                            Aguardando Conexão
                          </span>
                        )
                      ) : (
                        <span className="mini-plan-count" style={{ fontWeight: 800, color: '#066dfe' }}>PRO</span>
                      )}
                    </div>
                  )}

                  <div className="top-divider"></div>

                  <div className="user-profile-container">
                    <button 
                      className="avatar-btn" 
                      onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                      <img 
                        src={`https://ui-avatars.com/api/?name=${session.user.email}&background=random&color=fff`} 
                        alt="User" 
                      />
                    </button>




                    {showUserMenu && (
                      <>
                        <div className="menu-overlay" onClick={() => setShowUserMenu(false)}></div>
                        <div className="user-dropdown">
                          <button className="dropdown-item">
                            <span className="material-symbols-outlined">person</span>
                            Perfil
                            <span className="building-badge">Construindo</span>
                          </button>
                          <button className="dropdown-item">
                            <span className="material-symbols-outlined">group</span>
                            Comunidade
                            <span className="building-badge">Construindo</span>
                          </button>
                          <button className="dropdown-item">
                            <span className="material-symbols-outlined">payments</span>
                            Assinatura
                            <span className="pro-badge">
                              <span className="material-symbols-outlined">bolt</span> PRO
                            </span>
                          </button>
                          <button className="dropdown-item">
                            <span className="material-symbols-outlined">settings</span>
                            Configurações
                            <span className="building-badge">Construindo</span>
                          </button>
                          <div className="dropdown-divider"></div>
                          <button className="dropdown-item" onClick={() => window.open('https://wa.me/5551993527271?text=Preciso%20de%20ajuda%20com%20o%20Assistencialize', '_blank')}>
                            <span className="material-symbols-outlined">info</span>
                            Ajuda
                          </button>
                          <button className="dropdown-item logout-item" onClick={handleLogout}>
                            <span className="material-symbols-outlined">logout</span>
                            Sair
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
            </div>
          )}

          {/* Main App Body */}
          <div className="app-body">
            <aside className="sidebar">
              <div className="sidebar-header">
                <h2>MEUS PERFIS</h2>
                <button className="expand-add-btn" onClick={() => setIsAddingProfile(true)}>
                  <span className="material-symbols-outlined">add</span>
                  <span className="expand-text">Adicionar perfil</span>
                </button>
              </div>
              <div className="profile-list">
                {profiles.map((profile) => {
                  const isActive = activeProfileId === profile.id;
                  const hasUnread = !isActive && unreadStates[profile.id];
                  
                  return (
                    <button 
                      key={profile.id} 
                      className={`profile-item ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveProfileId(profile.id)}
                    >
                      <div className="profile-avatar-wrap">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                          <span className="profile-initials">
                            {(() => {
                              const name = profile.name || "";
                              const parts = name.trim().split(/\s+/);
                              if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                              return parts[0][0]?.toUpperCase() || "?";
                            })()}
                          </span>
                        )}
                      </div>
                      <div className="profile-text">
                        <span className="profile-name">{profile.name}</span>
                        <span className="profile-status" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {(profile.business_start && profile.business_end) ? (
                            <>
                              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule</span>
                              {profile.business_start} às {profile.business_end}
                            </>
                          ) : (
                            isActive ? 'Ativo' : (hasUnread ? 'Nova Mensagem' : 'Inativo')
                          )}
                        </span>
                      </div>
                      {isActive ? (
                        <span className="material-symbols-outlined active-check">check_circle</span>
                      ) : (
                        <span 
                          className="material-symbols-outlined delete-btn"
                          onClick={(e) => { e.stopPropagation(); removeProfile(profile.id); }}
                        >
                          close
                        </span>
                      )}
                      {hasUnread && <span className="unread-dot"></span>}
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="main-content">
              {/* Modal de Novo Perfil */}
              {isAddingProfile && (
                <div className="modal-overlay">
                  <div className="modal-content profile-modal">
                    <button className="modal-close-top" onClick={() => setIsAddingProfile(false)}>
                      <span className="material-symbols-outlined">close</span>
                    </button>
                    
                    <div className="modal-header-image">
                      <img src="profile_creation_illustration.png" alt="Crie um novo perfil" />
                    </div>

                    <div className="modal-body">
                      <h2>Crie um novo perfil</h2>
                      <p>Dê um nome ao seu novo espaço de trabalho para começar a gerenciar suas contas.</p>
                      
                      <div className="modal-input-group">
                        <label>Nome do perfil</label>
                        <div className="input-with-icon">
                          <span className="material-symbols-outlined">person_add</span>
                          <input 
                            type="text" 
                            placeholder="Ex: Vendas, Suporte, Pessoal..." 
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                            autoFocus
                          />
                        </div>
                      </div>

                      <button className="modal-submit-btn" onClick={addProfile}>
                        Adicionar perfil
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {profiles.length === 0 ? (
                <div className="empty-state">
                  Crie um perfil para começar.
                </div>
              ) : (
                <div className="browser-container">
                  {/* Webviews */}
                  <div className="webviews-container">
                    {profiles.map(profile => {
                      const pTabs = tabsData[profile.id] || [DEFAULT_TAB];
                      const pActiveTabId = activeTabs[profile.id] || 'whatsapp';
                      
                      return pTabs.map(tab => (
                        <TabWebview 
                          key={`${profile.id}_${tab.id}`}
                          profileId={profile.id}
                          tab={tab}
                          isActive={activeProfileId === profile.id && pActiveTabId === tab.id}
                          preloadPath={webviewPreloadPath}
                          onUnreadChange={handleUnreadChange}
                          onTitleChange={handleTitleChange}
                          onUrlChange={handleUrlChange}
                        />
                      ));
                    })}
                  </div>
                </div>
              )}
            </main>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
