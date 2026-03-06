import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/dashboard");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-badge">RDO</div>
          <div className="auth-brand-text">
            <span className="auth-brand-title">Registro Diário de Obra</span>
            <span className="auth-brand-subtitle">Acesse sua conta</span>
          </div>
        </div>

        <h1 className="auth-title">Entrar</h1>
        <p className="auth-subtitle">
          Faça login para acessar suas obras, registros diários e fotos.
        </p>

        <form className="auth-form" onSubmit={handleLogin}>
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
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="rdo-btn rdo-btn-primary"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {message && <div className="auth-error">{message}</div>}

        <p className="auth-footer">
          Não tem conta?{" "}
          <Link className="auth-link" to="/register">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}