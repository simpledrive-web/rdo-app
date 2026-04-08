import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !senha.trim()) {
      alert("Preencha e-mail e senha.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    setLoading(false);

    if (error) {
      alert(`Erro ao entrar: ${error.message}`);
      return;
    }

    navigate("/dashboard");
  }

  async function handleGoogleLogin() {
    setLoading(true);

    const redirectTo = `${window.location.origin}/dashboard`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    setLoading(false);

    if (error) {
      alert(`Erro ao entrar com Google: ${error.message}`);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-brand-badge">RDO</div>
            <div>
              <h1 className="auth-title">Entrar</h1>
              <p className="auth-subtitle">
                Faça login para acessar suas obras, registros diários, fotos e
                notas fiscais.
              </p>
            </div>
          </div>

          <div className="auth-divider-wrap">
            <button
              type="button"
              className="rdo-btn rdo-btn-primary auth-google-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              Entrar com Google
            </button>

            <div className="auth-divider">
              <span>ou</span>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleEmailLogin}>
            <div className="rdo-field">
              <label className="rdo-label">E-mail</label>
              <input
                className="rdo-input"
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="rdo-field">
              <label className="rdo-label">Senha</label>
              <input
                className="rdo-input"
                type={mostrarSenha ? "text" : "password"}
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            <label className="auth-checkbox">
              <input
                type="checkbox"
                checked={mostrarSenha}
                onChange={(e) => setMostrarSenha(e.target.checked)}
              />
              <span>Mostrar senha</span>
            </label>

            <div className="auth-links-row">
              <Link to="/reset-password" className="auth-link">
                Recuperar acesso
              </Link>
            </div>

            <button
              type="submit"
              className="rdo-btn rdo-btn-primary auth-submit"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="auth-footer">
            <span>Não tem conta?</span>{" "}
            <Link to="/register" className="auth-link">
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}