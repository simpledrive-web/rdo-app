import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { supabase } from "../supabase/client";

const appUrl = import.meta.env.VITE_APP_URL;
const nativeAppScheme = "com.isaias.rdoapp";

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const redirectTo = Capacitor.isNativePlatform()
      ? `${nativeAppScheme}://login`
      : appUrl
        ? `${appUrl}/login`
        : `${window.location.origin}/login`;

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
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
    setSuccessMessage(
      "Conta criada com sucesso. Verifique seu e-mail para confirmar a conta."
    );

    setTimeout(() => {
      navigate("/login");
    }, 1800);
  }

  async function handleGoogleRegister() {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      setGoogleLoading(true);

      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative
        ? `${nativeAppScheme}://auth/callback`
        : appUrl
          ? `${appUrl}/dashboard`
          : `${window.location.origin}/dashboard`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: isNative,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (isNative && data?.url) {
        await Browser.open({ url: data.url });
      }
    } finally {
      setGoogleLoading(false);
    }
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

        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="rdo-btn rdo-btn-secondary"
            onClick={handleGoogleRegister}
            disabled={googleLoading || loading}
            style={{ width: "100%" }}
          >
            {googleLoading ? "Redirecionando..." : "Continuar com Google"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          <span style={{ fontSize: 14, color: "#6b7280" }}>ou</span>
          <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
        </div>

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
              type={showPassword ? "text" : "password"}
              placeholder="Crie uma senha"
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
            <label className="rdo-label">Confirmar senha</label>
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
            disabled={loading || googleLoading}
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