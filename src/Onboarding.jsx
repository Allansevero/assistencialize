import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import './Onboarding.css';

import imgRemota from '../assets/6546510.png';
import imgPresencial from '../assets/25465015.png';
import imgClinica from '../assets/123651056.png';

// ── Ícones SVG embutidos ──────────────────────────────────────────────────────
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconWhatsApp = () => (
  <svg viewBox="0 0 32 32" fill="currentColor">
    <path d="M16.002 2C8.271 2 2 8.269 2 16c0 2.498.65 4.847 1.79 6.887L2 30l7.32-1.762A13.944 13.944 0 0016.002 30C23.731 30 30 23.731 30 16S23.731 2 16.002 2zm0 25.417a11.937 11.937 0 01-6.08-1.659l-.435-.259-4.343 1.044 1.077-4.237-.283-.448A11.937 11.937 0 014.01 16c0-6.614 5.38-11.992 11.992-11.992S27.99 9.386 27.99 16 22.614 27.417 16.002 27.417zm6.563-8.965c-.36-.18-2.126-1.048-2.456-1.168-.33-.12-.57-.18-.81.18-.24.36-.929 1.168-1.138 1.407-.21.24-.42.27-.78.09-.36-.18-1.52-.56-2.896-1.787-1.07-.957-1.793-2.138-2.003-2.498-.21-.36-.023-.555.158-.733.162-.16.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.81-1.953-1.11-2.674-.292-.702-.59-.607-.81-.618-.21-.01-.45-.012-.69-.012s-.63.09-.96.45c-.33.36-1.26 1.23-1.26 2.997s1.29 3.476 1.47 3.716c.18.24 2.534 3.872 6.14 5.43.859.371 1.529.592 2.051.757.861.274 1.645.235 2.265.143.691-.103 2.126-.869 2.426-1.71.3-.84.3-1.56.21-1.71-.09-.15-.33-.24-.69-.42z"/>
  </svg>
);

const IconSecretaria = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="20" r="12" fill="#fce7f3" stroke="#db2777" strokeWidth="2"/>
    <path d="M8 52c0-13.255 10.745-24 24-24s24 10.745 24 24" stroke="#db2777" strokeWidth="2" strokeLinecap="round" fill="#fce7f3"/>
    <rect x="18" y="38" width="28" height="6" rx="3" fill="#db2777" opacity="0.3"/>
    <rect x="22" y="46" width="20" height="4" rx="2" fill="#db2777" opacity="0.2"/>
  </svg>
);

const IconClinica = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="16" width="48" height="36" rx="4" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2"/>
    <rect x="26" y="8" width="12" height="12" rx="2" fill="#0284c7" opacity="0.4"/>
    <line x1="32" y1="27" x2="32" y2="41" stroke="#0284c7" strokeWidth="3" strokeLinecap="round"/>
    <line x1="25" y1="34" x2="39" y2="34" stroke="#0284c7" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const IconRemota = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="14" width="40" height="28" rx="4" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2"/>
    <rect x="10" y="16" width="36" height="22" rx="2" fill="#dcfce7"/>
    <rect x="20" y="42" width="20" height="4" rx="2" fill="#16a34a" opacity="0.4"/>
    <circle cx="50" cy="18" r="8" fill="#16a34a"/>
    <path d="M47 18l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSuporte = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="28" r="14" fill="#fef3c7" stroke="#d97706" strokeWidth="2"/>
    <path d="M20 28c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/>
    <rect x="18" y="26" width="6" height="10" rx="3" fill="#d97706" opacity="0.5"/>
    <rect x="40" y="26" width="6" height="10" rx="3" fill="#d97706" opacity="0.5"/>
    <path d="M32 42v4M26 46h12" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ── Constantes ────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 5;

const ROLE_OPTIONS = [
  {
    id: 'secretaria_remota',
    label: 'Secretária Remota',
    image: imgRemota,
  },
  {
    id: 'secretaria_presencial',
    label: 'Secretária Presencial',
    image: imgPresencial,
  },
  {
    id: 'clinica_suporte',
    label: 'Clínica / Suporte',
    image: imgClinica,
  },
];

// ── Componente Principal ──────────────────────────────────────────────────────
export default function Onboarding({ session, onComplete }) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [animating, setAnimating] = useState(false);

  // Form states
  const [role, setRole] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null); // URL pública salva no Supabase
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [firstName, setFirstName] = useState(
    session?.user?.user_metadata?.first_name || ''
  );
  const [lastName, setLastName] = useState(
    session?.user?.user_metadata?.last_name || ''
  );
  const [clientName, setClientName] = useState('');
  const [profileName, setProfileName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [notifyOutside, setNotifyOutside] = useState(false);
  const [createdProfileId, setCreatedProfileId] = useState(null);

  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrConnected, setQrConnected] = useState(false);
  const [showTrialBanner, setShowTrialBanner] = useState(false);
  const [webviewPreloadPath, setWebviewPreloadPath] = useState('');

  // Auto show trial banner after WOW step is shown (step 4)
  useEffect(() => {
    if (step === 4) {
      const t = setTimeout(() => setShowTrialBanner(true), 3500);
      return () => clearTimeout(t);
    }
  }, [step]);

  useEffect(() => {
    // Buscar o caminho do preload do webview para usar no Onboarding
    if (window.electronAPI && window.electronAPI.getWebviewPreloadPath) {
      window.electronAPI.getWebviewPreloadPath().then(path => {
        setWebviewPreloadPath(`file://${path}`);
      });
    }
  }, []);

  const progressPercent = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goTo = (nextStep) => {
    if (animating) return;
    setDirection(nextStep > step ? 'forward' : 'backward');
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setError('');
      setAnimating(false);
    }, 220);
  };

  const next = () => goTo(step + 1);
  const back = () => goTo(step - 1);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUrl(null); // resetar URL anterior ao trocar foto
  };

  // Faz upload da foto para o bucket "Perfis" e retorna a URL pública
  const uploadAvatar = async (file) => {
    const ext = file.name.split('.').pop();
    const filePath = `${session.user.id}/avatar_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('Perfis')
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('Perfis')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleRoleSelect = (id) => {
    setRole(id);
    setTimeout(() => next(), 300);
  };

  // Avança da etapa 2 (Personalize) fazendo upload da foto se houver
  const handlePersonalizeNext = async () => {
    if (!avatarFile || avatarUrl) {
      // sem foto nova ou já fez upload — só avança
      next();
      return;
    }
    setUploadingAvatar(true);
    setError('');
    try {
      const url = await uploadAvatar(avatarFile);
      setAvatarUrl(url);

      // Já salva no user_profiles para não perder
      await supabase
        .from('user_profiles')
        .update({ avatar_url: url })
        .eq('id', session.user.id);

      next();
    } catch (err) {
      console.error('Erro ao enviar foto:', err);
      setError('Não conseguimos enviar sua foto. Você pode continuar mesmo assim.');
      next(); // não bloqueia o fluxo por causa da foto
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileCreate = async () => {
    if (!clientName.trim()) {
      setError('Preencha o nome do perfil para continuar.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Upload avatar opcional — não bloqueia criação do perfil se falhar
      let finalAvatarUrl = null;
      if (profileAvatarFile) {
        try {
          const ext = profileAvatarFile.name.split('.').pop();
          const filePath = `profiles/${session.user.id}/avatar_${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('Perfis')
            .upload(filePath, profileAvatarFile, { upsert: true, contentType: profileAvatarFile.type });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('Perfis').getPublicUrl(filePath);
            finalAvatarUrl = urlData.publicUrl;
          } else {
            console.warn('Upload do avatar falhou, continuando sem foto:', uploadError.message);
          }
        } catch (avatarErr) {
          console.warn('Upload do avatar falhou, continuando sem foto:', avatarErr);
        }
      }

      const fullName = clientName.trim();
      const { data, error: profError } = await supabase
        .from('profiles')
        .insert([{ 
          name: fullName, 
          user_id: session.user.id,
          business_start: startTime,
          business_end: endTime,
          notify_outside: notifyOutside,
          avatar_url: finalAvatarUrl
        }])
        .select()
        .single();

      if (profError) throw profError;
      setCreatedProfileId(data.id);

      // Salva nome, role e avatar_url no user_profiles
      await supabase
        .from('user_profiles')
        .update({
          first_name: firstName || session?.user?.user_metadata?.first_name,
          last_name: lastName || session?.user?.user_metadata?.last_name,
          role: role,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        })
        .eq('id', session.user.id);

      next();
    } catch (err) {
      setError('Erro ao criar perfil. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onComplete();
  };

  // ── Step Labels ─────────────────────────────────────────────────────────────
  const stepLabels = [
    'Bem-vinda',
    'Quem é você',
    'Primeiro perfil',
    'Tudo pronto!',
    'Indique e ganhe',
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="ob-root">
      {/* ── Sidebar / Progress ── */}
      <aside className="ob-sidebar">
        <div className="ob-sidebar-brand">
          <img src="app-logo.png" alt="Assistencialize" className="ob-logo" />
          <span className="ob-brand-name">Assistencialize</span>
        </div>

        <div className="ob-steps-list">
          {stepLabels.map((label, i) => {
            const s = i + 1;
            const done = step > s;
            const current = step === s;
            return (
              <div key={s} className={`ob-step-item ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                <div className="ob-step-circle">
                  {done ? <IconCheck /> : <span>{s}</span>}
                </div>
                <div className="ob-step-text">
                  <span className="ob-step-label">{label}</span>
                  {current && <span className="ob-step-sublabel">Em andamento</span>}
                  {done && <span className="ob-step-sublabel">Concluído ✓</span>}
                </div>
                {s < TOTAL_STEPS && <div className="ob-step-connector" />}
              </div>
            );
          })}
        </div>

        <div className="ob-sidebar-footer">
          <div className="ob-free-badge">
            <span className="ob-free-icon">🎁</span>
            <div>
              <p className="ob-free-title">Plano Gratuito Ativo</p>
              <p className="ob-free-desc">2 perfis inclusos, sem cartão</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="ob-main">
        {/* Progress bar top */}
        <div className="ob-progress-bar-wrap">
          <div className="ob-progress-bar" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className={`ob-step-content ${animating ? (direction === 'forward' ? 'slide-out-left' : 'slide-out-right') : 'slide-in'}`}>

          {/* ═══════════════════════════════════════════
              ETAPA 1 — Bem-vinda
          ═══════════════════════════════════════════ */}
          {step === 1 && (
            <StepWelcome
              session={session}
              firstName={firstName}
              onNext={next}
            />
          )}

          {/* ═══════════════════════════════════════════
              ETAPA 2 — Quem é você?
          ═══════════════════════════════════════════ */}
          {step === 2 && (
            <StepRole
              role={role}
              onSelect={handleRoleSelect}
              onBack={back}
            />
          )}

          {/* ═══════════════════════════════════════════
              ETAPA 3 — Criar primeiro perfil
          ═══════════════════════════════════════════ */}
          {step === 3 && (
            <StepCreateProfile
              clientName={clientName}
              setClientName={setClientName}
              profileAvatarPreview={profileAvatarPreview}
              setProfileAvatarFile={(file) => {
                setProfileAvatarFile(file);
                if (file) {
                  setProfileAvatarPreview(URL.createObjectURL(file));
                } else {
                  setProfileAvatarPreview(null);
                }
              }}
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
              notifyOutside={notifyOutside}
              setNotifyOutside={setNotifyOutside}
              loading={loading}
              error={error}
              onSubmit={handleProfileCreate}
              onBack={back}
            />
          )}

          {/* ═══════════════════════════════════════════
              ETAPA 4 — Momento WOW 🎉
          ═══════════════════════════════════════════ */}
          {step === 4 && (
            <StepWow
              firstName={firstName || session?.user?.user_metadata?.first_name || 'você'}
              clientName={clientName}
              profileName={profileName}
              showTrialBanner={showTrialBanner}
              onActivateTrial={() => setShowTrialBanner(false)}
              onFinish={handleFinish}
            />
          )}

          {/* ═══════════════════════════════════════════
              ETAPA 5 — Indicação
          ═══════════════════════════════════════════ */}
          {step === 5 && (
            <StepReferral onFinish={handleFinish} />
          )}
        </div>
      </main>
    </div>
  );
}

// ── Step Components ───────────────────────────────────────────────────────────

function StepWelcome({ session, firstName, onNext }) {
  const name = firstName || session?.user?.user_metadata?.first_name || 'por aqui';
  return (
    <div className="ob-step">
      <div className="ob-step-emoji">👋</div>
      <h1 className="ob-step-title">
        Olá, {name}!<br />
        <span className="ob-gradient-text">Seja bem-vinda!</span>
      </h1>
      <p className="ob-step-desc">
        Você está a poucos minutos de organizar todos os seus atendimentos num só lugar — sem trocar de navegador, sem confusão de clientes.
      </p>

      <div className="ob-value-cards">
        <div className="ob-value-card">
          <span className="ob-value-icon">🗂️</span>
          <div>
            <strong>Múltiplos WhatsApps</strong>
            <p>Gerencie vários números simultaneamente</p>
          </div>
        </div>
        <div className="ob-value-card">
          <span className="ob-value-icon">⚡</span>
          <div>
            <strong>Zero troca de perfil</strong>
            <p>Cada cliente no seu próprio espaço</p>
          </div>
        </div>
        <div className="ob-value-card">
          <span className="ob-value-icon">🎁</span>
          <div>
            <strong>2 perfis gratuitos</strong>
            <p>Comece sem pagar nada, hoje mesmo</p>
          </div>
        </div>
      </div>

      <p className="ob-microcopy">Configuração rápida — menos de 3 minutos ⏱️</p>

      <button className="ob-btn-primary" onClick={onNext} id="ob-start-btn">
        Vamos lá! →
      </button>
    </div>
  );
}

function StepPersonalize({ firstName, setFirstName, lastName, setLastName, avatarPreview, avatarUrl, uploadingAvatar, fileInputRef, onAvatarChange, onNext, onBack, error }) {
  const canContinue = firstName.trim().length > 0 && !uploadingAvatar;

  return (
    <div className="ob-step">
      <div className="ob-step-emoji">✨</div>
      <h1 className="ob-step-title">Vamos personalizar<br /><span className="ob-gradient-text">seu espaço de trabalho</span></h1>
      <p className="ob-step-desc">Uma identidade visual ajuda você a se orientar rapidamente entre perfis.</p>

      <div className="ob-avatar-section">
        <div
          className={`ob-avatar-upload ${uploadingAvatar ? 'uploading' : ''}`}
          onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
          title="Clique para adicionar foto"
        >
          {uploadingAvatar ? (
            <div className="ob-avatar-placeholder">
              <span className="ob-spinner ob-spinner-dark" />
              <span className="ob-avatar-hint">Enviando...</span>
            </div>
          ) : avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="ob-avatar-img" />
          ) : (
            <div className="ob-avatar-placeholder">
              <span className="ob-avatar-icon">📸</span>
              <span className="ob-avatar-hint">Adicionar foto</span>
            </div>
          )}
          {!uploadingAvatar && (
            <div className="ob-avatar-overlay">
              <span>{avatarPreview ? 'Trocar' : 'Adicionar'}</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onAvatarChange}
          id="ob-avatar-input"
        />
        {avatarUrl && (
          <span className="ob-avatar-uploaded">✓ Foto salva</span>
        )}
        {!avatarUrl && (
          <p className="ob-avatar-note">Opcional — sua foto fica visível só para você</p>
        )}
      </div>

      <div className="ob-field-row">
        <div className="ob-field">
          <label>Nome *</label>
          <input
            type="text"
            placeholder="Ex: Ana"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            autoFocus
            id="ob-first-name"
          />
        </div>
        <div className="ob-field">
          <label>Sobrenome</label>
          <input
            type="text"
            placeholder="Ex: Oliveira"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            id="ob-last-name"
          />
        </div>
      </div>

      {error && <div className="ob-error ob-error-soft">{error}</div>}

      <div className="ob-btn-row">
        <button className="ob-btn-ghost" onClick={onBack} disabled={uploadingAvatar} id="ob-back-personalize">← Voltar</button>
        <button
          className="ob-btn-primary"
          onClick={onNext}
          disabled={!canContinue}
          id="ob-next-personalize"
        >
          {uploadingAvatar ? <><span className="ob-spinner" /> Enviando foto...</> : 'Continuar →'}
        </button>
      </div>
    </div>
  );
}

function StepRole({ role, onSelect, onBack }) {
  return (
    <div className="ob-step ob-step-wide">
      <h1 className="ob-step-title" style={{ textAlign: 'center', fontSize: '32px' }}>Como você trabalha hoje?</h1>
      <p className="ob-step-desc" style={{ textAlign: 'center', marginBottom: '40px' }}>Mostraremos exatamente como o Assistencialize se encaixa<br />para um perfil como o seu.</p>

      <div className="ob-role-grid" id="ob-role-grid">
        {ROLE_OPTIONS.map(opt => (
          <button
            key={opt.id}
            id={`ob-role-${opt.id}`}
            className={`ob-role-card-image ${role === opt.id ? 'selected' : ''}`}
            onClick={() => onSelect(opt.id)}
          >
            <div className="ob-role-card-title">{opt.label}</div>
            <div className="ob-role-card-img-wrap">
              <img src={opt.image} alt={opt.label} />
            </div>
            {role === opt.id && (
              <div className="ob-role-check">
                <IconCheck />
              </div>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <button className="ob-btn-ghost" onClick={onBack} id="ob-back-role">← Voltar</button>
      </div>
    </div>
  );
}

function StepCreateProfile({ clientName, setClientName, profileAvatarPreview, setProfileAvatarFile, startTime, setStartTime, endTime, setEndTime, notifyOutside, setNotifyOutside, loading, error, onSubmit, onBack }) {
  const canSubmit = clientName.trim() && !loading;
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setProfileAvatarFile(file);
  };

  return (
    <div className="ob-step">
      <div className="ob-step-emoji">🗂️</div>
      <h1 className="ob-step-title">Crie seu<br /><span className="ob-gradient-text">primeiro perfil</span></h1>
      <p className="ob-step-desc">
        Um perfil é um espaço isolado para um cliente ou número específico de WhatsApp.
        <br />Você possui <strong>2 perfis gratuitos</strong> para começar!
      </p>

      {/* Área de foto dedicada */}
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
      
      <div className="ob-avatar-picker" onClick={() => fileInputRef.current?.click()}>
        <div className="ob-avatar-picker-img">
          {profileAvatarPreview ? (
            <img src={profileAvatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#898d91' }}>add_a_photo</span>
          )}
        </div>
        <div className="ob-avatar-picker-text">
          <span className="ob-avatar-picker-label">{profileAvatarPreview ? 'Trocar foto' : 'Adicionar foto'}</span>
          <span className="ob-avatar-picker-hint">Opcional · JPG, PNG até 5MB</span>
        </div>
      </div>

      <div className="ob-field ob-mb">
        <label>Nome do Perfil *</label>
        <input
          type="text"
          placeholder="Ex: Clínica Sorriso, Dr. Carlos, etc."
          value={clientName}
          onChange={e => setClientName(e.target.value)}
          autoFocus
          id="ob-client-name"
        />
        <span className="ob-field-hint">Pode ser o nome da pessoa ou da clínica.</span>
      </div>

      <div className="ob-config-container">
        <div className="ob-config-header">
          <div className="ob-config-title">⏰ Horário de Atendimento</div>
          <div className="ob-config-desc">
            Após o horário, o perfil para de notificar mensagens do WhatsApp, garantindo seu descanso.
          </div>
        </div>

        <div className="ob-field-row">
          <div className="ob-field">
            <label>Início</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              id="ob-start-time"
            />
          </div>
          <div className="ob-field">
            <label>Fim</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              id="ob-end-time"
            />
          </div>
        </div>
        
        <div className="ob-toggle-row">
          <div className="ob-toggle-label">
            <strong>Autorizar notificar fora do horário</strong>
          </div>
          <label className="ob-switch">
            <input 
              type="checkbox" 
              checked={notifyOutside} 
              onChange={e => setNotifyOutside(e.target.checked)} 
              id="ob-notify-outside"
            />
            <span className="ob-slider"></span>
          </label>
        </div>
      </div>

      {error && <div className="ob-error">{error}</div>}

      <div className="ob-btn-row">
        <button className="ob-btn-ghost" onClick={onBack} disabled={loading} id="ob-back-profile">← Voltar</button>
        <button
          className="ob-btn-primary"
          onClick={onSubmit}
          disabled={!canSubmit}
          id="ob-create-profile-btn"
        >
          {loading ? (
            <span className="ob-spinner" />
          ) : (
            'Criar Perfil →'
          )}
        </button>
      </div>
    </div>
  );
}

function StepConnectWhatsApp({ createdProfileId, webviewPreloadPath, qrConnected, onConnected, onSkip, onBack }) {
  const [pulse, setPulse] = useState(false);
  const webviewRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;
    
    // Auto detect se conectou pelo título do WhatsApp
    const handleTitleUpdated = (e) => {
      const title = e.title || '';
      if (title.startsWith('(') || (title !== 'WhatsApp' && title.length > 0)) {
        // Provavelmente conectou
        // onConnected(); // Podemos chamar automaticamente ou deixar o usuário clicar
      }
    };
    webview.addEventListener('page-title-updated', handleTitleUpdated);
    return () => {
      webview.removeEventListener('page-title-updated', handleTitleUpdated);
    };
  }, []);

  return (
    <div className="ob-step ob-step-wide">
      <div className="ob-step-emoji">📱</div>
      <h1 className="ob-step-title">Conecte seu<br /><span className="ob-gradient-text">primeiro WhatsApp</span></h1>
      <p className="ob-step-desc">Aponte a câmera do celular para o QR Code abaixo. A conexão será salva para o seu perfil.</p>

      <div className="ob-qr-section" style={{ flexDirection: 'column', alignItems: 'center' }}>
        
        <div style={{ width: '100%', maxWidth: '800px', height: '550px', background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #e4e7e9', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
          {createdProfileId ? (
            <webview
              ref={webviewRef}
              src="https://web.whatsapp.com/"
              partition={`persist:wp_${createdProfileId}`}
              preload={webviewPreloadPath}
              style={{ width: '100%', height: '100%' }}
              allowpopups="true"
              nodeintegration="false"
              contextisolation="true"
              useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            />
          ) : (
            <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#898d91' }}>
              Carregando WhatsApp...
            </div>
          )}
        </div>

      </div>

      <div className="ob-btn-row ob-btn-row-stacked">
        <button
          className="ob-btn-primary ob-whatsapp-btn"
          onClick={onConnected}
          id="ob-connected-btn"
        >
          <span className="ob-wapp-icon"><IconWhatsApp /></span>
          WhatsApp Conectado ✓
        </button>
        <button className="ob-btn-ghost ob-skip-btn" onClick={onSkip} id="ob-skip-qr">
          Conectar depois →
        </button>
      </div>

      <button className="ob-back-link" onClick={onBack} id="ob-back-qr">← Voltar</button>
    </div>
  );
}

function StepWow({ firstName, clientName, profileName, showTrialBanner, onActivateTrial, onFinish }) {
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    setConfetti(true);
    const t = setTimeout(() => setConfetti(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const profileLabel = clientName && profileName
    ? `${clientName} — ${profileName}`
    : 'Seu Perfil Principal';

  return (
    <div className="ob-step ob-step-wow">
      {confetti && <ConfettiEffect />}

      <div className="ob-wow-badge">🎉</div>
      <h1 className="ob-wow-title">
        Parabéns,<br />
        <span className="ob-gradient-text">{firstName}!</span>
      </h1>
      <p className="ob-wow-subtitle">Seu primeiro perfil está pronto e ativo.</p>

      <div className="ob-wow-checklist">
        <WowCheckItem delay={0} text="Perfil criado com sucesso" />
        <WowCheckItem delay={200} text={`"${profileLabel}" ativo`} />
        <WowCheckItem delay={400} text="1 perfil gratuito ainda disponível" />
        <WowCheckItem delay={600} text="Zero troca de navegador de agora em diante" />
      </div>

      <div className="ob-wow-profiles-preview">
        <div className="ob-wow-profile active">
          <div className="ob-wow-profile-dot active" />
          <span>{profileLabel}</span>
          <span className="ob-wow-profile-status">Ativo</span>
        </div>
        <div className="ob-wow-profile empty">
          <div className="ob-wow-profile-dot empty" />
          <span>Perfil 2</span>
          <span className="ob-wow-profile-status">Disponível</span>
        </div>
      </div>

      {/* Trial Banner — aparece após 3.5s */}
      {showTrialBanner && (
        <div className="ob-trial-banner" id="ob-trial-banner">
          <div className="ob-trial-content">
            <span className="ob-trial-icon">🚀</span>
            <div>
              <strong>Ganhe mais 1 perfil por 3 dias</strong>
              <p>Experimente nossa capacidade ampliada. Sem cartão. Sem burocracia.</p>
            </div>
          </div>
          <button className="ob-trial-btn" onClick={onActivateTrial} id="ob-activate-trial">
            Ativar Teste
          </button>
        </div>
      )}

      <button className="ob-btn-primary ob-btn-finish" onClick={onFinish} id="ob-enter-app">
        Entrar no Assistencialize →
      </button>
    </div>
  );
}

function StepReferral({ onFinish }) {
  const [copied, setCopied] = useState(false);
  const link = 'https://assistencialize.com/convite/sua-amiga';

  const copyLink = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="ob-step">
      <div className="ob-step-emoji">💌</div>
      <h1 className="ob-step-title">Convide uma colega,<br /><span className="ob-gradient-text">ganhe 1 perfil a mais!</span></h1>
      <p className="ob-step-desc">
        Compartilhe o Assistencialize com uma colega secretária ou de suporte.<br />
        Vocês <strong>duas ganham</strong> +1 perfil permanente — sem pagar nada.
      </p>

      <div className="ob-referral-card">
        <div className="ob-referral-split">
          <div className="ob-referral-side">
            <span className="ob-referral-icon">👩‍💼</span>
            <strong>Você ganha</strong>
            <p>+1 perfil permanente</p>
          </div>
          <div className="ob-referral-divider">+</div>
          <div className="ob-referral-side">
            <span className="ob-referral-icon">👩‍💻</span>
            <strong>Sua colega ganha</strong>
            <p>+1 perfil permanente</p>
          </div>
        </div>
      </div>

      <div className="ob-referral-link-wrap">
        <input readOnly value={link} className="ob-referral-input" id="ob-referral-link" />
        <button className="ob-copy-btn" onClick={copyLink} id="ob-copy-link">
          {copied ? '✓ Copiado!' : 'Copiar'}
        </button>
      </div>

      <button className="ob-btn-primary" onClick={onFinish} id="ob-skip-referral">
        Entrar no Assistencialize →
      </button>
      <button className="ob-btn-ghost ob-skip-link" onClick={onFinish} id="ob-skip-referral-link">
        Pular por enquanto
      </button>
    </div>
  );
}

// ── Helper Components ─────────────────────────────────────────────────────────

function WowCheckItem({ delay, text }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay + 100);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className={`ob-wow-check ${visible ? 'visible' : ''}`}>
      <div className="ob-wow-check-circle">
        <IconCheck />
      </div>
      <span>{text}</span>
    </div>
  );
}

function ConfettiEffect() {
  const pieces = Array.from({ length: 28 });
  const colors = ['#db2777', '#0d7377', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981'];
  return (
    <div className="ob-confetti-wrap" aria-hidden="true">
      {pieces.map((_, i) => (
        <div
          key={i}
          className="ob-confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 1.5}s`,
            animationDuration: `${1.5 + Math.random() * 2}s`,
            backgroundColor: colors[i % colors.length],
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}
