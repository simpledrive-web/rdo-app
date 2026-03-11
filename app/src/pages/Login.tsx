import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { supabase } from "../supabase/client";

const appUrl = import.meta.env.VITE_APP_URL;
const nativeAppScheme = "com.isaias.rdoapp";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
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

  async function handleGoogleLogin() {
    try {
      setMessage("");
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
        setMessage(error.message);
        return;
      }

      if (isNative && data?.url) {
        await Browser.open({ url: data.url });
      }
    } catch (error) {
      console.error(error);
      setMessage("Erro ao iniciar login com Google.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleRecoverAccess() {
    if (!email.trim()) {
      setMessage("Digite seu e-mail para recuperar o acesso.");
      return;
    }

    try {
      setMessage("");
      setRecoveryLoading(true);

      const redirectTo = Capacitor.isNativePlatform()
        ? `${nativeAppScheme}://reset-password`
        : appUrl
          ? `${appUrl}/reset-password`
          : `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Enviamos um link de recuperação para o seu e-mail.");
    } finally {
      setRecoveryLoading(false);
    }
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

        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="rdo-btn rdo-btn-secondary"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading || recoveryLoading}
            style={{ width: "100%" }}
          >
            {googleLoading ? "Redirecionando..." : "Entrar com Google"}
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
              type={showPassword ? "text" : "password"}
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
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

          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              onClick={handleRecoverAccess}
              disabled={recoveryLoading || loading || googleLoading}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                color: "#2563eb",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {recoveryLoading ? "Enviando..." : "Recuperar acesso"}
            </button>
          </div>

          <button
            type="submit"
            className="rdo-btn rdo-btn-primary"
            disabled={loading || googleLoading || recoveryLoading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {message && (
          <div
            className={
              message.includes("Enviamos") ? "auth-success" : "auth-error"
            }
          >
            {message}
          </div>
        )}

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