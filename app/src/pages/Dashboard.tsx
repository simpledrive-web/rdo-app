import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

type UserInfo = {
  name: string;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "",
  });

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const firstName = user.user_metadata?.first_name ?? "";
      const lastName = user.user_metadata?.last_name ?? "";
      const fullName =
        user.user_metadata?.full_name?.trim() ||
        `${firstName} ${lastName}`.trim() ||
        user.email ||
        "Usuário";

      setUserInfo({
        name: fullName,
      });
    }

    loadUser();
  }, [navigate]);

  async function handleLogout() {
    const confirmLogout = window.confirm("Deseja sair da conta?");
    if (!confirmLogout) return;

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(`Erro ao sair: ${error.message}`);
      return;
    }

    navigate("/login");
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <div className="dashboard-hero">
          <div className="dashboard-hero-top">
            <div>
              <p className="dashboard-kicker">RDO APP</p>

              <h1 className="dashboard-title">Registro Diário de Obras</h1>

              <p className="dashboard-welcome">
                Bem-vindo(a), <strong>{userInfo.name || "Usuário"}</strong>
              </p>

              <p className="dashboard-subtitle">
                Organize registros diários, acompanhe o andamento das obras,
                adicione funcionários, notas fiscais, serviços e fotos em um só
                lugar.
              </p>
            </div>

            <div className="dashboard-actions">
              <button
                type="button"
                className="rdo-btn rdo-btn-primary"
                onClick={() => navigate("/obras")}
              >
                Ir para Obras
              </button>

              <button
                type="button"
                className="rdo-btn rdo-btn-secondary"
                onClick={() => navigate("/usuarios")}
              >
                Ver Usuários
              </button>

              <button
                type="button"
                className="rdo-btn rdo-btn-logout"
                onClick={handleLogout}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}