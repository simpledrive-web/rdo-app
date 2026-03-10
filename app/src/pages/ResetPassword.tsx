import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setSuccess(true);
      setMessage("Senha atualizada com sucesso. Agora você já pode entrar.");

      setTimeout(() => {
        navigate("/login");
      }, 1800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-badge">RDO</div>
          <div className="auth-brand-text">
            <span className="auth-brand-title">Registro Diário de Obra</span>
            <span className="auth-brand-subtitle">Redefinir senha</span>
          </div>
        </div>

        <h1 className="auth-title">Criar nova senha</h1>
        <p className="auth-subtitle">
          Digite sua nova senha para recuperar o acesso à sua conta.
        </p>

        <form className="auth-form" onSubmit={handleResetPassword}>
          <div className="rdo-field">
            <label className="rdo-label">Nova senha</label>
            <input
              className="rdo-input"
              type={showPassword ? "text" : "password"}
              placeholder="Digite a nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              cursor: "pointer",
              fontSize: 14,
              color: "#374151",
            }}
          >
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword((prev) => !prev)}
            />
            Mostrar senha
          </label>

          <div className="rdo-field">
            <label className="rdo-label">Confirmar nova senha</label>
            <input
              className="rdo-input"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              cursor: "pointer",
              fontSize: 14,
              color: "#374151",
            }}
          >
            <input
              type="checkbox"
              checked={showConfirmPassword}
              onChange={() => setShowConfirmPassword((prev) => !prev)}
            />
            Mostrar confirmação de senha
          </label>

          <button
            type="submit"
            className="rdo-btn rdo-btn-primary"
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>

        {message && (
          <div className={success ? "auth-success" : "auth-error"}>
            {message}
          </div>
        )}

        <p className="auth-footer">
          Voltar para{" "}
          <Link className="auth-link" to="/login">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}