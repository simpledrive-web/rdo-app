import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

type ProjectRow = {
  id: string;
  name: string;
  client_name: string | null;
  address: string | null;
  user_id: string | null;
  created_at?: string | null;
};

type DailyLogRow = {
  id: string;
  project_id: string;
  log_date: string;
};

type SharedProjectMemberRow = {
  project_id: string;
  role: "viewer" | "editor" | "admin";
};

type Obra = {
  id: string;
  nome: string;
  cliente: string;
  endereco: string;
  registros: number;
  ultimaDataRegistro: string | null;
  accessRole: "owner" | "viewer" | "editor" | "admin";
};

export default function ObrasPage() {
  const navigate = useNavigate();

  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nome, setNome] = useState("");
  const [cliente, setCliente] = useState("");
  const [endereco, setEndereco] = useState("");
  const [busca, setBusca] = useState("");

  const [sharingProject, setSharingProject] = useState<Obra | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"viewer" | "editor">("viewer");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  async function loadObras() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      navigate("/login");
      return;
    }

    const { data: sharedRows, error: sharedError } = await supabase
      .from("project_members")
      .select("project_id, role")
      .eq("user_id", user.id);

    if (sharedError) {
      alert(`Erro ao carregar compartilhamentos: ${sharedError.message}`);
      setLoading(false);
      return;
    }

    const sharedMembers = (sharedRows ?? []) as SharedProjectMemberRow[];
    const sharedProjectIds = sharedMembers.map((row) => row.project_id);
    const sharedRoleMap = new Map<string, "viewer" | "editor" | "admin">();

    sharedMembers.forEach((row) => {
      sharedRoleMap.set(row.project_id, row.role);
    });

    let projectsQuery = supabase
      .from("projects")
      .select("id, name, client_name, address, user_id, created_at")
      .order("created_at", { ascending: false });

    if (sharedProjectIds.length > 0) {
      projectsQuery = projectsQuery.or(
        `user_id.eq.${user.id},id.in.(${sharedProjectIds.join(",")})`
      );
    } else {
      projectsQuery = projectsQuery.eq("user_id", user.id);
    }

    const { data: projectsData, error: projectsError } = await projectsQuery;

    if (projectsError) {
      alert(`Erro ao carregar obras: ${projectsError.message}`);
      setLoading(false);
      return;
    }

    const projects = (projectsData ?? []) as ProjectRow[];
    const projectIds = projects.map((item) => item.id);

    const registrosPorProjeto = new Map<string, number>();
    const ultimaDataPorProjeto = new Map<string, string>();

    if (projectIds.length > 0) {
      const { data: logsData, error: logsError } = await supabase
        .from("daily_logs")
        .select("id, project_id, log_date")
        .in("project_id", projectIds)
        .order("log_date", { ascending: false });

      if (logsError) {
        alert(`Erro ao carregar registros: ${logsError.message}`);
        setLoading(false);
        return;
      }

      (logsData as DailyLogRow[] | null)?.forEach((log) => {
        const atual = registrosPorProjeto.get(log.project_id) ?? 0;
        registrosPorProjeto.set(log.project_id, atual + 1);

        if (!ultimaDataPorProjeto.has(log.project_id)) {
          ultimaDataPorProjeto.set(log.project_id, log.log_date);
        }
      });
    }

    const mapped: Obra[] = projects.map((item) => ({
      id: item.id,
      nome: item.name,
      cliente: item.client_name ?? "",
      endereco: item.address ?? "",
      registros: registrosPorProjeto.get(item.id) ?? 0,
      ultimaDataRegistro: ultimaDataPorProjeto.get(item.id) ?? null,
      accessRole:
        item.user_id === user.id
          ? "owner"
          : sharedRoleMap.get(item.id) ?? "viewer",
    }));

    setObras(mapped);
    setLoading(false);
  }

  useEffect(() => {
    loadObras();
  }, []);

  const obrasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return obras;

    return obras.filter((obra) => {
      return (
        obra.nome.toLowerCase().includes(termo) ||
        obra.cliente.toLowerCase().includes(termo) ||
        obra.endereco.toLowerCase().includes(termo)
      );
    });
  }, [obras, busca]);

  function handleOpen(id: string) {
    navigate(`/obra/${id}`);
  }

  async function handleEdit(id: string) {
    const obra = obras.find((item) => item.id === id);
    if (!obra) return;

    if (obra.accessRole === "viewer") {
      alert("Você tem acesso apenas de visualização nesta obra.");
      return;
    }

    const novoNome = window.prompt("Nome da obra:", obra.nome);
    if (novoNome === null) return;

    const novoCliente = window.prompt("Cliente:", obra.cliente);
    if (novoCliente === null) return;

    const novoEndereco = window.prompt("Endereço:", obra.endereco);
    if (novoEndereco === null) return;

    const { error } = await supabase
      .from("projects")
      .update({
        name: novoNome.trim(),
        client_name: novoCliente.trim() || null,
        address: novoEndereco.trim() || null,
      })
      .eq("id", id);

    if (error) {
      alert(`Erro ao editar obra: ${error.message}`);
      return;
    }

    await loadObras();
  }

  async function handleDelete(id: string) {
    const obra = obras.find((item) => item.id === id);
    if (!obra) return;

    if (obra.accessRole !== "owner") {
      alert("Somente o dono da obra pode excluir.");
      return;
    }

    const confirmDelete = window.confirm("Deseja realmente excluir esta obra?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      alert(`Erro ao excluir obra: ${error.message}`);
      return;
    }

    await loadObras();
  }

  async function handleCreateObra(e: React.FormEvent) {
    e.preventDefault();

    if (!nome.trim()) {
      alert("Informe o nome da obra.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("projects").insert({
      name: nome.trim(),
      client_name: cliente.trim() || null,
      address: endereco.trim() || null,
      user_id: user.id,
    });

    if (error) {
      alert(`Erro ao criar obra: ${error.message}`);
      setSaving(false);
      return;
    }

    setNome("");
    setCliente("");
    setEndereco("");
    setShowCreateForm(false);
    setSaving(false);

    await loadObras();
  }

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

  function openShareModal(obra: Obra) {
    if (obra.accessRole !== "owner") {
      alert("Somente o dono da obra pode compartilhar.");
      return;
    }

    setSharingProject(obra);
    setShareEmail("");
    setShareRole("viewer");
    setShareMessage("");
  }

  function closeShareModal() {
    setSharingProject(null);
    setShareEmail("");
    setShareRole("viewer");
    setShareMessage("");
  }

  async function handleShareProject(e: React.FormEvent) {
    e.preventDefault();

    if (!sharingProject) return;

    if (!shareEmail.trim()) {
      setShareMessage("Digite o e-mail do usuário.");
      return;
    }

    try {
      setShareLoading(true);
      setShareMessage("");

      const { data: foundUser, error: lookupError } = await supabase.rpc(
        "lookup_profile_by_email",
        {
          target_email: shareEmail.trim(),
        }
      );

      if (lookupError) {
        setShareMessage(`Erro ao buscar usuário: ${lookupError.message}`);
        return;
      }

      if (!foundUser || foundUser.length === 0) {
        setShareMessage("Nenhum usuário encontrado com esse e-mail.");
        return;
      }

      const targetUser = foundUser[0];

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id === targetUser.id) {
        setShareMessage("Você já é o dono desta obra.");
        return;
      }

      const { error } = await supabase.from("project_members").upsert(
        {
          project_id: sharingProject.id,
          user_id: targetUser.id,
          role: shareRole,
        },
        {
          onConflict: "project_id,user_id",
        }
      );

      if (error) {
        setShareMessage(`Erro ao compartilhar: ${error.message}`);
        return;
      }

      setShareMessage("Obra compartilhada com sucesso.");
      setTimeout(() => {
        closeShareModal();
      }, 1200);
    } finally {
      setShareLoading(false);
    }
  }

  function renderAccessBadge(role: Obra["accessRole"]) {
    const config = {
      owner: {
        label: "Dono",
        style: {
          border: "1px solid #dbeafe",
          background: "#eff6ff",
          color: "#1d4ed8",
        },
      },
      admin: {
        label: "Admin",
        style: {
          border: "1px solid #ede9fe",
          background: "#f5f3ff",
          color: "#6d28d9",
        },
      },
      editor: {
        label: "Editor",
        style: {
          border: "1px solid #dcfce7",
          background: "#f0fdf4",
          color: "#15803d",
        },
      },
      viewer: {
        label: "Visualização",
        style: {
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
          color: "#374151",
        },
      },
    } as const;

    const current = config[role];

    return (
      <span
        style={{
          ...current.style,
          borderRadius: 999,
          padding: "7px 12px",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {current.label}
      </span>
    );
  }

  return (
    <div className="rdo-page">
      <div className="rdo-container">
        <div className="rdo-header">
          <div>
            <h1 className="rdo-title">Obras</h1>
            <p className="rdo-subtitle">
              Gerencie suas obras e acompanhe os registros diários finalizados.
            </p>
          </div>

          <div
            className="rdo-header-actions"
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          >
            <button
              type="button"
              className="rdo-btn rdo-btn-secondary"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="rdo-btn rdo-btn-primary"
              onClick={() => setShowCreateForm((prev) => !prev)}
            >
              {showCreateForm ? "Fechar" : "+ Nova obra"}
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

        <div className="rdo-card rdo-section rdo-top-gap">
          <div className="rdo-field">
            <label className="rdo-label">Buscar obra</label>
            <input
              className="rdo-input"
              type="text"
              placeholder="Digite nome da obra, cliente ou endereço"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {showCreateForm && (
          <div className="rdo-card rdo-section rdo-top-gap">
            <h2 className="rdo-form-title">Nova obra</h2>
            <p className="rdo-form-subtitle">
              Preencha os dados para cadastrar uma nova obra.
            </p>

            <form className="rdo-form-grid" onSubmit={handleCreateObra}>
              <div className="rdo-field">
                <label className="rdo-label">Nome da obra</label>
                <input
                  className="rdo-input"
                  type="text"
                  placeholder="Ex: Obra residencial - Rua das Flores"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="rdo-form-grid-2">
                <div className="rdo-field">
                  <label className="rdo-label">Cliente</label>
                  <input
                    className="rdo-input"
                    type="text"
                    placeholder="Nome do cliente"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                  />
                </div>

                <div className="rdo-field">
                  <label className="rdo-label">Endereço</label>
                  <input
                    className="rdo-input"
                    type="text"
                    placeholder="Endereço da obra"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                  />
                </div>
              </div>

              <div className="rdo-actions">
                <div className="rdo-actions-left">
                  <button
                    type="button"
                    className="rdo-btn rdo-btn-secondary"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNome("");
                      setCliente("");
                      setEndereco("");
                    }}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                </div>

                <div className="rdo-actions-right">
                  <button
                    type="submit"
                    className="rdo-btn rdo-btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar obra"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {loading && (
          <div className="rdo-card rdo-section rdo-top-gap">
            <p className="rdo-empty-state">Carregando obras...</p>
          </div>
        )}

        {!loading && obras.length === 0 && (
          <div className="rdo-card rdo-section rdo-top-gap">
            <p className="rdo-empty-state">Nenhuma obra cadastrada ainda.</p>
          </div>
        )}

        {!loading && obras.length > 0 && obrasFiltradas.length === 0 && (
          <div className="rdo-card rdo-section rdo-top-gap">
            <p className="rdo-empty-state">
              Nenhuma obra encontrada para essa busca.
            </p>
          </div>
        )}

        {!loading &&
          obrasFiltradas.map((obra) => (
            <div
              key={obra.id}
              className="rdo-card rdo-section rdo-top-gap"
              style={{ padding: 20 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: 22 }}>{obra.nome}</h2>
                    {renderAccessBadge(obra.accessRole)}
                  </div>

                  <div style={{ marginTop: 10, color: "#4b5563", lineHeight: 1.6 }}>
                    <div>
                      <strong>Cliente:</strong> {obra.cliente || "-"}
                    </div>
                    <div>
                      <strong>Endereço:</strong> {obra.endereco || "-"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    <span
                      style={{
                        border: "1px solid #dbeafe",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        borderRadius: 999,
                        padding: "7px 12px",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {obra.registros} registro(s)
                    </span>

                    <span
                      style={{
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        color: "#374151",
                        borderRadius: 999,
                        padding: "7px 12px",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Último registro:{" "}
                      {obra.ultimaDataRegistro
                        ? new Date(obra.ultimaDataRegistro).toLocaleDateString("pt-BR")
                        : "Nenhum"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    className="rdo-btn rdo-btn-primary"
                    onClick={() => handleOpen(obra.id)}
                  >
                    Abrir obra
                  </button>

                  {(obra.accessRole === "owner" || obra.accessRole === "editor") && (
                    <button
                      type="button"
                      className="rdo-btn rdo-btn-secondary"
                      onClick={() => handleEdit(obra.id)}
                    >
                      Editar
                    </button>
                  )}

                  {obra.accessRole === "owner" && (
                    <>
                      <button
                        type="button"
                        className="rdo-btn rdo-btn-secondary"
                        onClick={() => openShareModal(obra)}
                      >
                        Compartilhar
                      </button>

                      <button
                        type="button"
                        className="rdo-btn rdo-btn-danger"
                        onClick={() => handleDelete(obra.id)}
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      {sharingProject && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 999,
          }}
          onClick={closeShareModal}
        >
          <div
            className="rdo-card"
            style={{
              width: "100%",
              maxWidth: 560,
              padding: 24,
              borderRadius: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Compartilhar obra</h2>
                <p style={{ margin: "8px 0 0", color: "#6b7280" }}>
                  {sharingProject.nome}
                </p>
              </div>

              <button
                type="button"
                className="rdo-btn rdo-btn-secondary"
                onClick={closeShareModal}
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleShareProject}>
              <div className="rdo-field">
                <label className="rdo-label">E-mail do usuário</label>
                <input
                  className="rdo-input"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
              </div>

              <div className="rdo-field">
                <label className="rdo-label">Permissão</label>
                <select
                  className="rdo-select"
                  value={shareRole}
                  onChange={(e) =>
                    setShareRole(e.target.value as "viewer" | "editor")
                  }
                >
                  <option value="viewer">Visualização</option>
                  <option value="editor">Editor</option>
                </select>
              </div>

              <p
                style={{
                  marginTop: 6,
                  marginBottom: 16,
                  color: "#6b7280",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Visualização: pode ver registros, fotos, NF's e gerar PDF. <br />
                Editor: pode visualizar e também editar a obra e criar registros.
              </p>

              {shareMessage && (
                <div
                  className={
                    shareMessage.includes("sucesso")
                      ? "auth-success"
                      : "auth-error"
                  }
                  style={{ marginBottom: 16 }}
                >
                  {shareMessage}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="rdo-btn rdo-btn-secondary"
                  onClick={closeShareModal}
                  disabled={shareLoading}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rdo-btn rdo-btn-primary"
                  disabled={shareLoading}
                >
                  {shareLoading ? "Compartilhando..." : "Compartilhar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}