import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import RegistroWizard from "../components/RegistroWizard";
import { supabase } from "../supabase/client";

function formatDateBR(dateString: string | null) {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function formatRdoNumber(value: number | null | undefined) {
  if (!value) return "RDO-000";
  return `RDO-${String(value).padStart(3, "0")}`;
}

type Project = {
  id: string;
  name: string;
  client_name: string | null;
  address: string | null;
};

type DailyLog = {
  id: string;
  log_date: string;
  weather_morning: string | null;
  weather_afternoon: string | null;
  summary: string | null;
  issues: string | null;
  next_steps: string | null;
  register_number: number | null;
  responsible_name: string | null;
};

export default function ObraDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"registro" | "historico">("registro");
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

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
      .select("*")
      .eq("project_id", id)
      .order("log_date", { ascending: false });

    setLogs(logsData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleBack() {
    navigate("/obras");
  }

  function handleEdit(log: DailyLog) {
    setEditingLog(log);
    setActiveTab("registro");
    setOpenMenuId(null);
  }

  async function handleShareLog(log: DailyLog) {
    const url = `https://rdo-app-sigma.vercel.app/rdo/${log.id}`;

    try {
      await navigator.clipboard.writeText(url);
      alert("Link copiado!");
    } catch {
      prompt("Copie o link:", url);
    }

    setOpenMenuId(null);
  }

  async function handleDelete(log: DailyLog) {
    const confirmDelete = window.confirm("Excluir este registro?");
    if (!confirmDelete) return;

    await supabase.from("crew_entries").delete().eq("daily_log_id", log.id);
    await supabase.from("photos").delete().eq("daily_log_id", log.id);
    await supabase.from("invoice_files").delete().eq("daily_log_id", log.id);
    await supabase.from("daily_logs").delete().eq("id", log.id);

    setOpenMenuId(null);
    loadData();
  }

  async function buildPdf(log: DailyLog) {
    const qr = await QRCode.toDataURL(
      `https://rdo-app-sigma.vercel.app/rdo/${log.id}`
    );

    return `
      <html>
        <body style="font-family:Arial;padding:40px">
          <h2>Registro Diário de Obra</h2>

          <p><b>Obra:</b> ${project?.name}</p>
          <p><b>Cliente:</b> ${project?.client_name ?? "-"}</p>
          <p><b>Endereço:</b> ${project?.address ?? "-"}</p>

          <hr>

          <p><b>Registro:</b> ${formatRdoNumber(log.register_number)}</p>
          <p><b>Data:</b> ${formatDateBR(log.log_date)}</p>
          <p><b>Clima manhã:</b> ${log.weather_morning ?? "-"}</p>
          <p><b>Clima tarde:</b> ${log.weather_afternoon ?? "-"}</p>
          <p><b>Responsável:</b> ${log.responsible_name ?? "-"}</p>
          <p><b>Resumo:</b> ${log.summary ?? "-"}</p>
          <p><b>Ocorrências:</b> ${log.issues ?? "-"}</p>
          <p><b>Serviços:</b> ${log.next_steps ?? "-"}</p>

          <br><br>
          <img src="${qr}" width="120"/>
        </body>
      </html>
    `;
  }

  async function handleGeneratePdf(log: DailyLog) {
    const html = await buildPdf(log);
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(html);
    win.document.close();
    win.print();

    setOpenMenuId(null);
  }

  if (loading) {
    return (
      <div className="rdo-page">
        <div className="rdo-container">
          <div className="rdo-card rdo-section">Carregando obra...</div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="rdo-page">
      <div className="rdo-container">
        <div className="rdo-header">
          <div>
            <h1 className="rdo-title">{project.name}</h1>
            <p className="rdo-subtitle">
              {project.client_name && <>Cliente: {project.client_name} • </>}
              {project.address}
            </p>
          </div>

          <button
            type="button"
            className="rdo-btn rdo-btn-secondary"
            onClick={handleBack}
          >
            Voltar
          </button>
        </div>

        <div className="rdo-tabs">
          <button
            type="button"
            className={`rdo-tab ${activeTab === "registro" ? "active" : ""}`}
            onClick={() => setActiveTab("registro")}
          >
            Novo Registro
          </button>

          <button
            type="button"
            className={`rdo-tab ${activeTab === "historico" ? "active" : ""}`}
            onClick={() => setActiveTab("historico")}
          >
            Histórico ({logs.length})
          </button>
        </div>

        {activeTab === "registro" && (
          <div className="rdo-top-gap">
            <RegistroWizard
              project={{
                id: project.id,
                nome: project.name,
                cliente: project.client_name ?? "",
                endereco: project.address ?? "",
              }}
              editingLog={editingLog}
              onSaved={() => {
                setEditingLog(null);
                loadData();
                setActiveTab("historico");
              }}
            />
          </div>
        )}

        {activeTab === "historico" && (
          <div className="rdo-card rdo-section rdo-top-gap">
            {logs.length === 0 && (
              <p className="rdo-empty-state">Nenhum registro ainda.</p>
            )}

            {logs.map((log) => (
              <div key={log.id} className="rdo-log-item">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div className="rdo-log-content">
                    <div className="rdo-log-date">
                      {formatRdoNumber(log.register_number)} •{" "}
                      {formatDateBR(log.log_date)}
                    </div>

                    <div className="rdo-log-weather">
                      Manhã: {log.weather_morning || "-"} | Tarde:{" "}
                      {log.weather_afternoon || "-"}
                    </div>

                    {log.summary && (
                      <div className="rdo-log-summary">{log.summary}</div>
                    )}
                  </div>

                  <div ref={menuRef} style={{ position: "relative" }}>
                    <button
                      type="button"
                      className="rdo-btn rdo-btn-secondary"
                      onClick={() =>
                        setOpenMenuId(openMenuId === log.id ? null : log.id)
                      }
                    >
                      ⋮
                    </button>

                    {openMenuId === log.id && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 8px)",
                          right: 0,
                          minWidth: 170,
                          background: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
                          padding: 8,
                          zIndex: 50,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          className="rdo-btn rdo-btn-secondary"
                          onClick={() => handleEdit(log)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="rdo-btn rdo-btn-secondary"
                          onClick={() => handleGeneratePdf(log)}
                        >
                          Gerar PDF
                        </button>

                        <button
                          type="button"
                          className="rdo-btn rdo-btn-secondary"
                          onClick={() => handleShareLog(log)}
                        >
                          Compartilhar
                        </button>

                        <button
                          type="button"
                          className="rdo-btn rdo-btn-danger"
                          onClick={() => handleDelete(log)}
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}