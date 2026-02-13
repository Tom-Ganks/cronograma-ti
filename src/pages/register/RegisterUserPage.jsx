import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/RegisterUserPage.css';
import supabase from '../../services/supabase';
import { Eye, EyeOff, RefreshCw, User, CheckCircle, XCircle, Edit2, Trash2, ArrowLeft, Search, Smartphone } from 'lucide-react';

export default function RegisterUserPage({ onNavigateHome }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Estados para a lista de usuários
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');

  // Estados para edição e exclusão
  const [filtro, setFiltro] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editingPassword, setEditingPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (editingUser) {
      // Update user
      setLoading(true);
      try {
        const updates = { email: email.trim() };

        // Se estiver editando senha, adicionar ao updates
        if (editingPassword && newPassword) {
          if (newPassword !== confirmNewPassword) {
            setError('As novas senhas não coincidem');
            setLoading(false);
            return;
          }

          if (newPassword.length < 6) {
            setError('A nova senha deve ter pelo menos 6 caracteres');
            setLoading(false);
            return;
          }

          // Para atualizar senha no Supabase Auth, precisaríamos de uma API
          // Por enquanto, apenas atualizamos o email na tabela usuarios
          setSuccess('Email atualizado. Para alterar senha, use a função de reset de senha do Supabase.');
        }

        const { error } = await supabase
          .from('usuarios')
          .update(updates)
          .eq('id', editingUser.id);

        if (error) throw error;

        setSuccess(editingPassword
          ? 'Usuário atualizado. Use o link de reset de senha para alterar a senha.'
          : 'Usuário atualizado com sucesso!');

        resetForm();
        fetchUsers();
      } catch (err) {
        setError('Erro ao atualizar usuário: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validações para cadastro
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setError('Este email já está cadastrado');
        } else if (error.message.includes('invalid email')) {
          setError('Por favor, insira um email válido');
        } else if (error.message.includes('password')) {
          setError('A senha é muito fraca');
        } else {
          setError(error.message);
        }
        return;
      }

      if (data?.user) {
        if (data.user.identities?.length === 0) {
          setError('Este email já está cadastrado');
          return;
        }

        // Tentar inserir na tabela usuarios se existir
        try {
          const { error: insertError } = await supabase
            .from('usuarios')
            .insert([{
              id: data.user.id,
              email: email.trim(),
              created_at: data.user.created_at,
              confirmed_at: data.user.confirmed_at || data.user.email_confirmed_at,
              ativo: data.session ? true : false
            }]);

          if (insertError && !insertError.message.includes('duplicate key')) {
            console.warn('Aviso ao inserir na tabela usuarios:', insertError.message);
          }
        } catch (insertErr) {
          console.warn('Tabela usuarios não existe ou erro de inserção:', insertErr.message);
        }

        if (!data.session) {
          setSuccess('Cadastro realizado! Verifique seu email para confirmar a conta.');
          setShowResend(true);
        } else {
          setSuccess('Cadastro realizado com sucesso!');
        }

        resetForm();
        fetchUsers();

        setTimeout(() => {
          if (onNavigateHome) {
            onNavigateHome();
          } else {
            navigate('/home');
          }
        }, 3000);
      }
    } catch (err) {
      setError('Erro ao processar solicitação');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMagicLink() {
    if (!email) {
      setError('Informe o email para reenviar o link');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOtp({ email: email.trim() });
      setLoading(false);
      if (error) {
        console.error('Error sending magic link:', error);
        setError(error.message || 'Erro ao enviar email');
        return;
      }
      setSuccess('Email enviado! Verifique sua caixa de entrada para entrar.');
      setShowResend(false);
    } catch (err) {
      setLoading(false);
      console.error('Unexpected error sending magic link:', err);
      setError('Erro ao enviar email. Tente novamente.');
    }
  }

  const handleGoBack = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      navigate(-1);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEmail(user.email || '');
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setEditingPassword(false);
    setError('');
    setSuccess('');

    if (!isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      // Primeiro tenta deletar da tabela usuarios se existir
      try {
        const { error: tableError } = await supabase
          .from('usuarios')
          .delete()
          .eq('id', userToDelete.id);

        if (tableError && !tableError.message.includes('does not exist')) {
          console.error('Erro ao deletar da tabela usuarios:', tableError);
        }
      } catch (tableErr) {
        console.warn('Tabela usuarios não existe ou erro ao deletar:', tableErr.message);
      }

      setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
      setSuccess('Usuário removido da lista');

      setShowDeleteDialog(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      setError('Erro ao deletar usuário: ' + error.message);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setEditingPassword(false);
    setError('');
    setSuccess('');
    setShowResend(false);
  };

  // SOLUÇÃO 1: Função RPC para buscar todos os usuários do auth.users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUserError('');

    try {
      console.log('Iniciando busca de usuários via RPC...');

      // Tenta primeiro usar a função RPC
      try {
        const { data, error } = await supabase.rpc('get_all_users');

        if (error) {
          console.error('Erro na função RPC:', error);

          if (error.message.includes('function') && error.message.includes('does not exist')) {
            setUserError('Função RPC não encontrada. Por favor, execute o SQL no Supabase SQL Editor.');
          }

          throw error;
        }

        if (data) {
          console.log(`${data.length} usuários encontrados via RPC`);

          const formattedUsers = data.map(user => ({
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            confirmed_at: user.confirmed_at,
            last_sign_in_at: user.last_sign_in_at,
            isActive: user.is_active,
            last_sign_in: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR') : 'Nunca'
          }));

          setUsers(formattedUsers);
          setLoadingUsers(false);
          return;
        }
      } catch (rpcError) {
        console.log('RPC falhou, tentando tabela usuarios...');
      }

      // Fallback: Tenta buscar da tabela usuarios
      const { data: tableUsers, error: tableError } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (!tableError && tableUsers) {
        console.log(`${tableUsers.length} usuários da tabela usuarios`);
        const formattedUsers = tableUsers.map(user => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          confirmed_at: user.confirmed_at,
          last_sign_in_at: user.last_sign_in_at || user.ultimo_login,
          isActive: user.ativo || user.is_active,
          last_sign_in: (user.last_sign_in_at || user.ultimo_login)
            ? new Date(user.last_sign_in_at || user.ultimo_login).toLocaleDateString('pt-BR')
            : 'Nunca'
        }));

        setUsers(formattedUsers);
        setLoadingUsers(false);
        return;
      }

      // Se nada funcionar, mostrar mensagem
      setUserError('Configure a função RPC get_all_users() no Supabase para ver todos os usuários.');
      setUsers([]);

    } catch (err) {
      console.error('Erro completo ao buscar usuários:', err);
      setUserError(`Erro: ${err.message}. Configure a função RPC no Supabase.`);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Buscar usuários quando o componente é montado
  useEffect(() => {
    fetchUsers();
  }, []);

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';

      return isMobile
        ? date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        : date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Usuários filtrados
  const filteredUsers = users.filter(user =>
    filtro ? user.email.toLowerCase().includes(filtro.toLowerCase()) : true
  );

  // Toggle para mostrar senha
  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowNewPassword = () => setShowNewPassword(!showNewPassword);

  return (
    <div className="ucs-page">
      {/* Header */}
      <div className="ucs-header">
        <button
          type="button"
          onClick={handleGoBack}
          className="back-button"
          disabled={loading}
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="ucs-title">
          {editingUser ? 'Editar Usuário' : 'Cadastro de Usuários'}
        </h1>
      </div>

      <div className="ucs-content">
        {/* Left Column - Registration Form */}
        <div className="form-column">
          <div className="form-card">
            <div className="form-card-header">
              <h2 className="form-title">
                {editingUser ? (
                  editingPassword ? (
                    <>
                      <Eye size={20} />
                      Alterar Senha
                    </>
                  ) : (
                    <>
                      <Edit2 size={20} />
                      Editar Usuário
                    </>
                  )
                ) : (
                  <>
                    <User size={20} />
                    Cadastrar Novo Usuário
                  </>
                )}
              </h2>
              {editingUser && (
                <div className="edit-controls">
                  {!editingPassword && (
                    <button
                      onClick={() => setEditingPassword(true)}
                      className="change-password-btn"
                    >
                      Alterar Senha
                    </button>
                  )}
                  <button
                    onClick={resetForm}
                    className="cancel-edit-btn"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Status Messages */}
            {error && (
              <div className="alert alert-error">
                <svg className="alert-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="alert-message">{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                <svg className="alert-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.6667 5L7.50001 14.1667L3.33334 10"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="alert-message">{success}</span>
              </div>
            )}

            {showResend && (
              <div className="resend-link">
                <button
                  type="button"
                  className="link-button"
                  onClick={handleSendMagicLink}
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : '📧 Reenviar link de confirmação'}
                </button>
              </div>
            )}

            {/* Form */}
            <form className="registration-form" onSubmit={handleSubmit}>
              {editingUser && !editingPassword && (
                <div className="form-group">
                  <label htmlFor="edit-email" className="form-label">
                    <User size={16} />
                    Email
                    <span className="required">*</span>
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="novo@email.com"
                    required
                    disabled={loading}
                    className="form-input"
                    autoComplete="email"
                  />
                </div>
              )}

              {!editingUser && (
                <>
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      <User size={16} />
                      Email
                      <span className="required">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@email.com"
                      required
                      disabled={loading}
                      className="form-input"
                      autoComplete="email"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password" className="form-label">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path d="M14.1667 9.16667V6.66667C14.1667 4.36548 12.3012 2.5 10 2.5C7.69881 2.5 5.83334 4.36548 5.83334 6.66667V9.16667M5.5 17.5H14.5C15.9001 17.5 16.6002 17.5 17.135 17.2275C17.6054 16.9878 17.9878 16.6054 18.2275 16.135C18.5 15.6002 18.5 14.9001 18.5 13.5V12.1667C18.5 10.7665 18.5 10.0665 18.2275 9.53169C17.9878 9.06129 17.6054 8.67883 17.135 8.43914C16.6002 8.16667 15.9001 8.16667 14.5 8.16667H5.5C4.09987 8.16667 3.3998 8.16667 2.86502 8.43914C2.39462 8.67883 2.01217 9.06129 1.77248 9.53169C1.5 10.0665 1.5 10.7665 1.5 12.1667V13.5C1.5 14.9001 1.5 15.6002 1.77248 16.135C2.01217 16.6054 2.39462 16.9878 2.86502 17.2275C3.3998 17.5 4.09987 17.5 5.5 17.5Z"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Senha
                      <span className="required">*</span>
                    </label>
                    <div className="password-input-wrapper">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength="6"
                        disabled={loading}
                        className="form-input"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={toggleShowPassword}
                        className="toggle-password"
                        tabIndex="-1"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword" className="form-label">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path d="M14.1667 9.16667V6.66667C14.1667 4.36548 12.3012 2.5 10 2.5C7.69881 2.5 5.83334 4.36548 5.83334 6.66667V9.16667M5.5 17.5H14.5C15.9001 17.5 16.6002 17.5 17.135 17.2275C17.6054 16.9878 17.9878 16.6054 18.2275 16.135C18.5 15.6002 18.5 14.9001 18.5 13.5V12.1667C18.5 10.7665 18.5 10.0665 18.2275 9.53169C17.9878 9.06129 17.6054 8.67883 17.135 8.43914C16.6002 8.16667 15.9001 8.16667 14.5 8.16667H5.5C4.09987 8.16667 3.3998 8.16667 2.86502 8.43914C2.39462 8.67883 2.01217 9.06129 1.77248 9.53169C1.5 10.0665 1.5 10.7665 1.5 12.1667V13.5C1.5 14.9001 1.5 15.6002 1.77248 16.135C2.01217 16.6054 2.39462 16.9878 2.86502 17.2275C3.3998 17.5 4.09987 17.5 5.5 17.5Z"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Confirmar Senha
                      <span className="required">*</span>
                    </label>
                    <div className="password-input-wrapper">
                      <input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirme a senha"
                        required
                        minLength="6"
                        disabled={loading}
                        className="form-input"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={toggleShowPassword}
                        className="toggle-password"
                        tabIndex="-1"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {editingPassword && (
                <>
                  <div className="form-group">
                    <label htmlFor="newPassword" className="form-label">
                      <Eye size={16} />
                      Nova Senha
                      <span className="required">*</span>
                    </label>
                    <div className="password-input-wrapper">
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required={editingPassword}
                        minLength="6"
                        disabled={loading}
                        className="form-input"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={toggleShowNewPassword}
                        className="toggle-password"
                        tabIndex="-1"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmNewPassword" className="form-label">
                      <Eye size={16} />
                      Confirmar Nova Senha
                      <span className="required">*</span>
                    </label>
                    <div className="password-input-wrapper">
                      <input
                        id="confirmNewPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirme a nova senha"
                        required={editingPassword}
                        minLength="6"
                        disabled={loading}
                        className="form-input"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={toggleShowNewPassword}
                        className="toggle-password"
                        tabIndex="-1"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={loading}
                  className={`btn-primary ${loading ? 'loading' : ''}`}
                >
                  {loading ? (
                    <>
                      <span className="btn-spinner"></span>
                      Processando...
                    </>
                  ) : (
                    editingUser
                      ? (editingPassword ? 'Alterar Senha' : 'Atualizar Usuário')
                      : 'Cadastrar Usuário'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Users List */}
        <div className="list-column">
          <div className="list-card">
            <div className="list-header">
              <div className="list-title-section">
                <h2 className="list-title">
                  <Eye size={20} />
                  Usuários Cadastrados
                  <span className="users-count">{users.length} usuários</span>
                </h2>
                <button
                  onClick={fetchUsers}
                  className="refresh-button"
                  disabled={loadingUsers}
                  title="Atualizar lista"
                >
                  <RefreshCw size={18} className={loadingUsers ? 'spinning' : ''} />
                  {!isMobile && (loadingUsers ? 'Atualizando...' : 'Atualizar')}
                </button>
              </div>

              {/* Search Filter */}
              <div className="search-section">
                <div className="search-input-wrapper">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Buscar por email..."
                    className="search-input"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                  />
                  {filtro && (
                    <button
                      className="clear-search"
                      onClick={() => setFiltro('')}
                      title="Limpar busca"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="filter-info">
                  Mostrando {filteredUsers.length} de {users.length} usuários
                </div>
              </div>
            </div>

            {userError && (
              <div className="user-error-message">
                <div className="error-content">
                  <strong>⚠️ Atenção:</strong> {userError}
                  {isMobile && (
                    <div className="mobile-hint">
                      <Smartphone size={14} /> Role para o lado para ver todas as informações
                    </div>
                  )}
                </div>
              </div>
            )}

            {loadingUsers ? (
              <div className="loading-users">
                <div className="loading-spinner"></div>
                <p>Carregando lista de usuários...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="users-table-container">
                {isMobile ? (
                  // Layout mobile - cards
                  <div className="users-cards">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="user-card">
                        <div className="user-card-header">
                          <div className="user-card-email">
                            <User size={14} />
                            <strong>{user.email}</strong>
                            {editingUser?.id === user.id && (
                              <span className="editing-badge">Editando</span>
                            )}
                          </div>
                          <div className="user-card-actions">
                            <button
                              className="action-btn edit-btn"
                              onClick={() => handleEdit(user)}
                              title="Editar usuário"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="action-btn delete-btn"
                              onClick={() => handleDelete(user)}
                              title="Excluir usuário"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="user-card-details">
                          <div className="detail-item">
                            <span className="detail-label">Status:</span>
                            <span className={`user-status ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                              {user.isActive ? (
                                <>
                                  <CheckCircle size={12} />
                                  Ativo
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} />
                                  Pendente
                                </>
                              )}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Registro:</span>
                            <span>{formatDate(user.created_at)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Último acesso:</span>
                            <span>{user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Nunca'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Layout desktop - tabela
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th className="table-header">Email</th>
                        <th className="table-header">Status</th>
                        <th className="table-header">Data Registro</th>
                        <th className="table-header">Último Acesso</th>
                        <th className="table-header actions-header">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="user-row">
                          <td className="user-email-cell">
                            <div className="user-email-wrapper">
                              <User size={14} className="email-icon" />
                              <span className="user-email" title={user.email}>
                                {user.email}
                              </span>
                              {editingUser?.id === user.id && (
                                <span className="editing-badge">Editando</span>
                              )}
                            </div>
                          </td>
                          <td className="user-status-cell">
                            <span className={`user-status ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                              {user.isActive ? (
                                <>
                                  <CheckCircle size={12} />
                                  Ativo
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} />
                                  Pendente
                                </>
                              )}
                            </span>
                          </td>
                          <td className="user-date-cell">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="user-date-cell">
                            {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Nunca'}
                          </td>
                          <td className="user-actions-cell">
                            <div className="action-buttons">
                              <button
                                className="action-btn edit-btn"
                                onClick={() => handleEdit(user)}
                                title="Editar usuário"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="action-btn delete-btn"
                                onClick={() => handleDelete(user)}
                                title="Excluir usuário"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div className="no-users">
                <div className="no-users-icon">
                  <User size={48} />
                </div>
                <h3>Nenhum usuário encontrado</h3>
                <p>
                  {filtro
                    ? `Nenhum usuário encontrado para "${filtro}"`
                    : 'Nenhum usuário cadastrado. Use o formulário ao lado para cadastrar.'}
                </p>
              </div>
            )}

            {/* Summary */}
            {users.length > 0 && !loadingUsers && (
              <div className="users-summary">
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value total-count">{users.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Ativos:</span>
                    <span className="stat-value active-count">
                      {users.filter(u => u.isActive).length}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Pendentes:</span>
                    <span className="stat-value inactive-count">
                      {users.filter(u => !u.isActive).length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="dialog-overlay">
          <div className="dialog-container">
            <div className="dialog-header">
              <Trash2 size={24} className="dialog-icon delete-icon" />
              <h3 className="dialog-title">Confirmar Exclusão</h3>
            </div>
            <div className="dialog-body">
              <p>Tem certeza que deseja excluir o usuário abaixo?</p>
              <div className="user-to-delete">
                <User size={18} />
                <strong>{userToDelete?.email}</strong>
              </div>
              <p className="dialog-warning">
                ⚠️ Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="dialog-actions">
              <button
                className="dialog-btn cancel-btn"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setUserToDelete(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="dialog-btn confirm-delete-btn"
                onClick={confirmDelete}
              >
                <Trash2 size={16} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}