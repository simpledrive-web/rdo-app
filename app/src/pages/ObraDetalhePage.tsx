import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RegistroWizard from "../components/RegistroWizard";
import { supabase } from "../supabase/client";

type Project = {
  id: string;
  name: string;
  client_name: string | null;
  address: string | null;
};

type DailyLog = {
  id: string;
  log_date: string;
  register_number: number | null;
  weather_morning: string | null;
  weather_afternoon: string | null;
  summary: string | null;
  responsible_name: string | null;
};

function formatRdoNumber(value: number | null) {
  if (!value) return "RDO-000";
  return `RDO-${String(value).padStart(3, "0")}`;
}

export default function ObraDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"registro" | "historico">("registro");

  async function loadData() {
    if (!id) return;

    setLoading(true);

    const { data: projectData } = await supabase
      .from("projects")
      .select("id,name,client_name,address")
      .eq("id", id)
      .single();

    setProject(projectData);

    const { data: logsData } = await supabase
      .from("daily_logs")
      .select(
        "id,log_date,register_number,weather_morning,weather_afternoon,summary,responsible_name"
      )
      .eq("project_id", id)
      .order("log_date", { ascending: false });

    setLogs(logsData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return <div className="rdo-page">Carregando...</div>;
  }

  if (!project) return null;

  return (
    <div className="rdo-page">
      <div className="rdo-container">

        {/* HEADER */}

        <div className="rdo-header">
          <div>
            <h1 className="rdo-title">{project.name}</h1>
            <p className="rdo-subtitle">
              {project.client_name} • {project.address}
            </p>
          </div>

          <button
            className="rdo-btn rdo-btn-secondary"
            onClick={() => navigate("/obras")}
          >
            Voltar
          </button>
        </div>

        {/* ABAS */}

        <div className="rdo-tabs">

          <button
            className={`rdo-tab ${activeTab === "registro" ? "active" : ""}`}
            onClick={() => setActiveTab("registro")}
          >
            Novo Registro
          </button>

          <button
            className={`rdo-tab ${activeTab === "historico" ? "active" : ""}`}
            onClick={() => setActiveTab("historico")}
          >
            Histórico ({logs.length})
          </button>

        </div>

        {/* CONTEÚDO DAS ABAS */}

        {activeTab === "registro" && (
          <RegistroWizard
            project={{
              id: project.id,
              nome: project.name,
              cliente: project.client_name ?? "",
              endereco: project.address ?? "",
            }}
            onSaved={loadData}
          />
        )}

        {activeTab === "historico" && (
          <div className="rdo-card rdo-section rdo-top-gap">

            {logs.length === 0 && (
              <p className="rdo-empty-state">
                Nenhum registro criado ainda.
              </p>
            )}

            {logs.map((log) => (
              <div key={log.id} className="rdo-log-item">

                <div className="rdo-log-date">
                  {formatRdoNumber(log.register_number)} •{" "}
                  {new Date(log.log_date).toLocaleDateString("pt-BR")}
                </div>

                <div className="rdo-log-content">

                  <div className="rdo-log-weather">
                    Manhã: {log.weather_morning || "-"} |
                    Tarde: {log.weather_afternoon || "-"}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <span className="rdo-badge">
                      Responsável: {log.responsible_name || "-"}
                    </span>
                  </div>

                  {log.summary && (
                    <div className="rdo-log-summary">
                      {log.summary}
                    </div>
                  )}

                </div>
              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}