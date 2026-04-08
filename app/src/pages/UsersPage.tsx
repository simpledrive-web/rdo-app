import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  created_at: string;
};

export default function UsersPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProfiles() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, first_name, last_name, full_name, avatar_url, provider, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Erro ao carregar usuários: ${error.message}`);
      setLoading(false);
      return;
    }

    setProfiles(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  return (
    <div className="rdo-page">
      <div className="rdo-container">
        <div className="rdo-header">
          <div>
            <h1 className="rdo-title">Usuários</h1>
            <p className="rdo-subtitle">Pessoas cadastradas no sistema.</p>
          </div>

          <button
            className="rdo-btn rdo-btn-secondary"
            onClick={() => navigate("/dashboard")}
          >
            Voltar
          </button>
        </div>

        <div className="rdo-card rdo-section rdo-top-gap">
          {loading && <p className="rdo-empty-state">Carregando usuários...</p>}

          {!loading && profiles.length === 0 && (
            <p className="rdo-empty-state">Nenhum usuário encontrado.</p>
          )}

          {!loading &&
            profiles.map((profile) => (
              <div
                key={profile.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || "Usuário"}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background: "#e5e7eb",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 700,
                        color: "#374151",
                      }}
                    >
                      {(profile.full_name || profile.email || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {profile.full_name || "Usuário sem nome"}
                    </div>
                    <div style={{ color: "#6b7280", marginTop: 4 }}>
                      {profile.email || "-"}
                    </div>
                    <div style={{ color: "#6b7280", marginTop: 4, fontSize: 14 }}>
                      Cadastro:{" "}
                      {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #dbeafe",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    borderRadius: 999,
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {profile.provider === "google" ? "Google" : "E-mail"}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}