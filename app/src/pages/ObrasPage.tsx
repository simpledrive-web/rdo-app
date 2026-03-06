import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ObraCard from "../components/ObraCard";
import { supabase } from "../supabase/client";

type ProjectRow = {
  id: string;
  name: string;
  client_name: string | null;
  address: string | null;
  user_id: string | null;
};

type DailyLogCountRow = {
  project_id: string;
};

type Obra = {
  id: string;
  nome: string;
  cliente: string;
  endereco: string;
  registros: number;
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

    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, client_name, address, user_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (projectsError) {
      alert(`Erro ao carregar obras: ${projectsError.message}`);
      setLoading(false);
      return;
    }

    const projects = (projectsData ?? []) as ProjectRow[];
    const projectIds = projects.map((item) => item.id);
    const logsByProject = new Map<string, number>();

    if (projectIds.length > 0) {
      const { data: logsData, error: logsError } = await supabase
        .from("daily_logs")
        .select("project_id")
        .in("project_id", projectIds);

      if (logsError) {
        alert(`Erro ao carregar contagem de registros: ${logsError.message}`);
        setLoading(false);
        return;
      }

      (logsData as DailyLogCountRow[] | null)?.forEach((log) => {
        const current = logsByProject.get(log.project_id) ?? 0;
        logsByProject.set(log.project_id, current + 1);
      });
    }

    const mapped: Obra[] = projects.map((item) => ({
      id: item.id,
      nome: item.name,
      cliente: item.client_name ?? "",
      endereco: item.address ?? "",
      registros: logsByProject.get(item.id) ?? 0,
    }));

    setObras(mapped);
    setLoading(false);
  }

  useEffect(() => {
    loadObras();
  }, []);

  function handleOpen(id: string) {
    navigate(`/obra/${id}`);
  }

  async function handleEdit(id: string) {
    const obra = obras.find((item) => item.id === id);
    if (!obra) return;

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

  return (
    <div className="rdo-page">
      <div className="rdo-container">
        <div className="rdo-header">
          <div>
            <h1 className="rdo-title">Obras</h1>
            <p className="rdo-subtitle">
              Gerencie suas obras e acesse os registros diários.
            </p>
          </div>

          <div className="rdo-header-actions">
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

        {!loading &&
          obras.map((obra) => (
            <ObraCard
              key={obra.id}
              obra={obra}
              onOpen={handleOpen}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
      </div>
    </div>
  );
}