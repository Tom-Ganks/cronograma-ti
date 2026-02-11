import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabaseClient from '../../services/supabase';
import '../../styles/loginpage.css';

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [showResend, setShowResend] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: senha,
      });

      setLoading(false);

      if (error) {
        console.error('Supabase login error:', error);
        const msg = error.message || 'Email ou senha inválidos';
        setErro(msg);
        // handle email not confirmed: auto-send magic link and show resend option
        if (typeof msg === 'string' && msg.toLowerCase().includes('email not confirmed')) {
          setShowResend(true);
          try {
            setLoading(true);
            const { error: sendErr } = await supabaseClient.auth.signInWithOtp({ email });
            setLoading(false);
            if (sendErr) {
              console.error('Error sending magic link after unconfirmed error:', sendErr);
              setErro('Email não confirmado. Não foi possível enviar link automaticamente. Use reenviar.');
            } else {
              setErro('Email não confirmado. Enviamos um link para seu email. Verifique sua caixa de entrada.');
            }
          } catch (e) {
            setLoading(false);
            console.error('Unexpected error sending magic link:', e);
            setErro('Email não confirmado. Erro ao reenviar link. Tente reenviar manualmente.');
          }
        }
        return;
      }

      console.debug('Supabase login success:', data);
    } catch (err) {
      setLoading(false);
      console.error('Unexpected login error:', err);
      setErro('Erro ao tentar entrar. Tente novamente.');
      return;
    }

    // login OK → home
    navigate('/home');
  }

  async function handleResetSenha() {
    if (!email) {
      setErro('Informe o email para redefinir a senha');
      return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email);

    if (error) {
      setErro('Erro ao enviar email de redefinição');
    } else {
      alert('Email de redefinição enviado!');
    }
  }

  async function handleSendMagicLink() {
    if (!email) {
      setErro('Informe o email para reenviar o link');
      return;
    }

    setErro('');
    setLoading(true);

    try {
      const { data, error } = await supabaseClient.auth.signInWithOtp({ email });
      setLoading(false);
      if (error) {
        console.error('Error sending magic link:', error);
        setErro(error.message || 'Erro ao enviar email');
        return;
      }
      alert('Email enviado! Verifique sua caixa de entrada para entrar.');
      setShowResend(false);
    } catch (err) {
      setLoading(false);
      console.error('Unexpected error sending magic link:', err);
      setErro('Erro ao enviar email. Tente novamente.');
    }
  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleLogin}>
        <h2>Entrar</h2>

        {erro && <p className="login-error">{erro}</p>}
        {showResend && (
          <div style={{ marginTop: 8 }}>
            <button type="button" className="link-button" onClick={handleSendMagicLink} disabled={loading}>
              {loading ? 'Enviando...' : 'Reenviar email de confirmação / link de entrada'}
            </button>
          </div>
        )}

        <label>Email</label>
        <input
          type="email"
          placeholder="Digite seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Senha</label>
        <input
          type="password"
          placeholder="Digite sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <div className="login-links">
          <button
            type="button"
            className="link-button"
            onClick={handleResetSenha}
          >
            Esqueci minha senha
          </button>
        </div>
      </form>
    </div>
  );
}