import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccessMessage("Conta criada com sucesso. Agora você já pode entrar.");

    setTimeout(() => {
      navigate("/login");
    }, 1400);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-badge">RDO</div>
          <div className="auth-brand-text">
            <span className="auth-brand-title">Registro Diário de Obra</span>
            <span className="auth-brand-subtitle">Crie sua conta</span>
          </div>
        </div>

        <h1 className="auth-title">Criar conta</h1>
        <p className="auth-subtitle">
          Cadastre-se para começar a gerenciar suas obras com mais organização.
        </p>

        <form className="auth-form" onSubmit={handleRegister}>
          <div className="auth-grid-2">
            <div className="rdo-field">
              <label className="rdo-label">Nome</label>
              <input
                className="rdo-input"
                type="text"
                placeholder="Seu nome"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="rdo-field">
              <label className="rdo-label">Sobrenome</label>
              <input
                className="rdo-input"
                type="text"
                placeholder="Seu sobrenome"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

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
              placeholder="Crie uma senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="rdo-btn rdo-btn-primary"
            disabled={loading}
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        {errorMessage && <div className="auth-error">{errorMessage}</div>}
        {successMessage && <div className="auth-success">{successMessage}</div>}

        <p className="auth-footer">
          Já tem conta?{" "}
          <Link className="auth-link" to="/login">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}