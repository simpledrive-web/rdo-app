import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

type Project = {
  id: string;
  name: string;
  client_name: string | null;
  address: string | null;
};

export default function Projects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setMessage("");

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        setMessage("Erro ao buscar usuário.");
        setLoading(false);
        return;
      }

      if (!userData.user) {
        setMessage("Usuário não encontrado.");
        setLoading(false);
        return;
      }

      const { data: member, error: memberError } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (memberError) {
        setMessage(`Erro ao buscar workspace: ${memberError.message}`);
        setLoading(false);
        return;
      }

      if (!member) {
        setMessage("Nenhum workspace encontrado para este usuário.");
        setLoading(false);
        return;
      }

      setWorkspaceId(member.workspace_id);

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, client_name, address")
        .eq("workspace_id", member.workspace_id)
        .order("created_at", { ascending: false });

      if (projectsError) {
        setMessage(`Erro ao buscar obras: ${projectsError.message}`);
        setLoading(false);
        return;
      }

      setProjects(projectsData ?? []);
      setLoading(false);
    };

    init();
  }, []);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!workspaceId) {
      setMessage("Workspace não encontrado.");
      return;
    }

    if (!name.trim()) {
      setMessage("Digite o nome da obra.");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        client_name: client.trim() || null,
        address: address.trim() || null,
      })
      .select("id, name, client_name, address")
      .single();

    if (error) {
      setMessage(`Erro ao criar obra: ${error.message}`);
      return;
    }

    setProjects((prev) => [data, ...prev]);
    setName("");
    setClient("");
    setAddress("");
  };

  if (loading) {
    return (
      <div className="page-center">
        <div className="card">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-center">
      <div className="card">
        <h1 className="title">Obras</h1>

        <form onSubmit={createProject}>
          <input
            className="input"
            placeholder="Nome da obra"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="input"
            placeholder="Cliente"
            value={client}
            onChange={(e) => setClient(e.target.value)}
          />

          <input
            className="input"
            placeholder="Endereço"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <button className="button" type="submit">
            Criar obra
          </button>
        </form>

        {message && (
          <p className="error" style={{ marginTop: "12px" }}>
            {message}
          </p>
        )}

        <hr style={{ margin: "20px 0" }} />

        <h2>Lista de Obras</h2>

        {projects.length === 0 && <p>Nenhuma obra cadastrada.</p>}

        {projects.map((project) => (
          <div
            key={project.id}
            style={{
              marginTop: "12px",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "12px",
              cursor: "pointer",
            }}
            onClick={() => navigate(`/obra/${project.id}`)}
          >
            <strong>{project.name}</strong>

            {project.client_name && <p>Cliente: {project.client_name}</p>}

            {project.address && <p>Endereço: {project.address}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}