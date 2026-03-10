import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RegistroWizard from "../components/RegistroWizard";
import { supabase } from "../supabase/client";

type Project = {
  id: string;
  name: string;
  client_name: string | null;
  address: string | null;
  user_id: string;
};

type DailyLog = {
  id: string;
  log_date: string;
  weather: string | null;
  summary: string | null;
  issues: string | null;
  next_steps: string | null;
};

type CrewEntry = {
  id: string;
  name: string;
  role: string | null;
  hours: number | null;
};

type InvoiceFile = {
  id: string;
  invoice_number: string | null;
  description: string | null;
  original_file_name: string;
  storage_path: string;
  signed_url?: string | null;
};

type PhotoEntry = {
  id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string | null;
  signed_url?: string | null;
};

type LogDetails = {
  crew: CrewEntry[];
  invoices: InvoiceFile[];
  photos: PhotoEntry[];
};

type LogStats = {
  crewCount: number;
  invoiceCount: number;
  photoCount: number;
};

type AccessRole = "owner" | "viewer" | "editor" | "admin";

export default function ObraDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessRole, setAccessRole] = useState<AccessRole>("viewer");

  const [logStatsMap, setLogStatsMap] = useState<Record<string, LogStats>>({});

  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [selectedLogDetails, setSelectedLogDetails] = useState<LogDetails | null>(
    null
  );
  const [viewingLogId, setViewingLogId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  async function loadData() {
    if (!id) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("id, name, client_name, address, user_id")
      .eq("id", id)
      .single();

    if (projectError) {
      alert("Erro ao carregar obra");
      navigate("/obras");
      return;
    }

    let currentAccessRole: AccessRole = "viewer";

    if (projectData.user_id === user.id) {
      currentAccessRole = "owner";
    } else {
      const { data: member, error: memberError } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) {
        alert(`Erro ao verificar acesso: ${memberError.message}`);
        navigate("/obras");
        return;
      }

      if (!member) {
        alert("Acesso não permitido");
        navigate("/obras");
        return;
      }

      currentAccessRole = member.role as AccessRole;
    }

    setAccessRole(currentAccessRole);
    setProject(projectData);

    const { data: logsData, error: logsError } = await supabase
      .from("daily_logs")
      .select("id, log_date, weather, summary, issues, next_steps")
      .eq("project_id", id)
      .order("log_date", { ascending: false });

    if (logsError) {
      alert(`Erro ao carregar registros: ${logsError.message}`);
      setLoading(false);
      return;
    }

    const loadedLogs = logsData ?? [];
    setLogs(loadedLogs);

    if (loadedLogs.length > 0) {
      await loadLogStats(loadedLogs.map((log) => log.id));
    } else {
      setLogStatsMap({});
    }

    setLoading(false);
  }

  async function loadLogStats(logIds: string[]) {
    const statsMap: Record<string, LogStats> = {};

    logIds.forEach((logId) => {
      statsMap[logId] = {
        crewCount: 0,
        invoiceCount: 0,
        photoCount: 0,
      };
    });

    const [
      { data: crewData, error: crewError },
      { data: invoiceData, error: invoiceError },
      { data: photoData, error: photoError },
    ] = await Promise.all([
      supabase.from("crew_entries").select("daily_log_id").in("daily_log_id", logIds),
      supabase.from("invoice_files").select("daily_log_id").in("daily_log_id", logIds),
      supabase.from("photos").select("daily_log_id").in("daily_log_id", logIds),
    ]);

    if (crewError || invoiceError || photoError) {
      return;
    }

    (crewData ?? []).forEach((item: { daily_log_id: string }) => {
      statsMap[item.daily_log_id].crewCount += 1;
    });

    (invoiceData ?? []).forEach((item: { daily_log_id: string }) => {
      statsMap[item.daily_log_id].invoiceCount += 1;
    });

    (photoData ?? []).forEach((item: { daily_log_id: string }) => {
      statsMap[item.daily_log_id].photoCount += 1;
    });

    setLogStatsMap(statsMap);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  function handleBack() {
    navigate("/obras");
  }

  async function getSignedPhotoUrls(
    photosData: {
      id: string;
      storage_path: string;
      caption: string | null;
      taken_at: string | null;
    }[]
  ): Promise<PhotoEntry[]> {
    return Promise.all(
      photosData.map(async (photo) => {
        const { data } = await supabase.storage
          .from("project-photos")
          .createSignedUrl(photo.storage_path, 3600);

        return {
          ...photo,
          signed_url: data?.signedUrl ?? null,
        };
      })
    );
  }

  async function getSignedInvoiceUrls(
    invoicesData: {
      id: string;
      invoice_number: string | null;
      description: string | null;
      original_file_name: string;
      storage_path: string;
    }[]
  ): Promise<InvoiceFile[]> {
    return Promise.all(
      invoicesData.map(async (invoice) => {
        const { data } = await supabase.storage
          .from("nota-fiscais")
          .createSignedUrl(invoice.storage_path, 3600);

        return {
          ...invoice,
          signed_url: data?.signedUrl ?? null,
        };
      })
    );
  }

  async function loadLogDetails(log: DailyLog): Promise<LogDetails> {
    const { data: crewData, error: crewError } = await supabase
      .from("crew_entries")
      .select("id, name, role, hours")
      .eq("daily_log_id", log.id)
      .order("name", { ascending: true });

    if (crewError) {
      throw new Error(`Erro ao carregar funcionários: ${crewError.message}`);
    }

    const { data: invoicesData, error: invoicesError } = await supabase
      .from("invoice_files")
      .select("id, invoice_number, description, original_file_name, storage_path")
      .eq("daily_log_id", log.id)
      .order("created_at", { ascending: false });

    if (invoicesError) {
      throw new Error(`Erro ao carregar NF's: ${invoicesError.message}`);
    }

    const { data: photosData, error: photosError } = await supabase
      .from("photos")
      .select("id, storage_path, caption, taken_at")
      .eq("daily_log_id", log.id)
      .order("taken_at", { ascending: false });

    if (photosError) {
      throw new Error(`Erro ao carregar fotos: ${photosError.message}`);
    }

    return {
      crew: crewData ?? [],
      invoices: await getSignedInvoiceUrls(invoicesData ?? []),
      photos: await getSignedPhotoUrls(photosData ?? []),
    };
  }

  async function handleViewLog(log: DailyLog) {
    try {
      setViewingLogId(log.id);
      const details = await loadLogDetails(log);
      setSelectedLog(log);
      setSelectedLogDetails(details);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao carregar registro.");
    } finally {
      setViewingLogId(null);
    }
  }

  function closeModal() {
    setSelectedLog(null);
    setSelectedLogDetails(null);
  }

  function buildLogPdfHtml(log: DailyLog, details: LogDetails) {
    if (!project) return "";

    const crewHtml = details.crew
      .map(
        (item) =>
          `<li><strong>${item.name}</strong> - ${item.role || "-"} - ${
            item.hours ?? "-"
          }h</li>`
      )
      .join("");

    const invoicesHtml = details.invoices
      .map(
        (item) =>
          `<li><strong>${item.invoice_number || "Sem número"}</strong> - ${
            item.description || item.original_file_name
          }</li>`
      )
      .join("");

    const photosHtml = details.photos
      .map((item) =>
        item.signed_url
          ? `<div style="break-inside: avoid; margin-bottom: 12px;">
               <img src="${item.signed_url}" style="width: 100%; max-width: 320px; border-radius: 10px; border: 1px solid #ddd;" />
             </div>`
          : ""
      )
      .join("");

    return `
      <html>
        <head>
          <title>RDO - ${project.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            .box { border: 1px solid #ddd; border-radius: 12px; padding: 16px; margin-bottom: 18px; }
            ul { padding-left: 18px; }
          </style>
        </head>
        <body>
          <h1>Registro Diário de Obra</h1>

          <div class="box">
            <h2>${project.name}</h2>
            <p><strong>Cliente:</strong> ${project.client_name || "-"}</p>
            <p><strong>Endereço:</strong> ${project.address || "-"}</p>
            <p><strong>Data:</strong> ${new Date(log.log_date).toLocaleDateString(
              "pt-BR"
            )}</p>
            <p><strong>Clima:</strong> ${log.weather || "-"}</p>
          </div>

          <div class="box"><h3>Resumo do dia</h3><p>${log.summary || "-"}</p></div>
          <div class="box"><h3>Ocorrências</h3><p>${log.issues || "-"}</p></div>
          <div class="box"><h3>Funcionários</h3><ul>${crewHtml || "<li>Nenhum</li>"}</ul></div>
          <div class="box"><h3>NF's</h3><ul>${invoicesHtml || "<li>Nenhuma</li>"}</ul></div>
          <div class="box"><h3>Serviços</h3><p>${log.next_steps || "-"}</p></div>
          <div class="box"><h3>Fotos</h3>${photosHtml || "<p>Nenhuma foto adicionada.</p>"}</div>
        </body>
      </html>
    `;
  }

  async function handleGenerateLogPdf(log: DailyLog) {
    try {
      setPdfLoadingId(log.id);
      const details = await loadLogDetails(log);
      const html = buildLogPdfHtml(log, details);

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Não foi possível abrir a janela de impressão.");
        return;
      }

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao gerar PDF.");
    } finally {
      setPdfLoadingId(null);
    }
  }

  const canEdit = accessRole === "owner" || accessRole === "editor" || accessRole === "admin";

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

          <button className="rdo-btn rdo-btn-secondary" onClick={handleBack}>
            Voltar para Obras
          </button>
        </div>

        <div className="rdo-card rdo-section rdo-top-gap">
          <div className="rdo-section-header">
            <h2>Histórico da Obra</h2>
            <div className="rdo-badge">{logs.length} registro(s)</div>
          </div>

          {logs.length === 0 && (
            <p className="rdo-empty-state">Nenhum registro diário cadastrado.</p>
          )}

          {logs.map((log) => {
            const stats = logStatsMap[log.id] ?? {
              crewCount: 0,
              invoiceCount: 0,
              photoCount: 0,
            };

            return (
              <div
                key={log.id}
                className="rdo-log-item"
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div className="rdo-log-date">
                      {new Date(log.log_date).toLocaleDateString("pt-BR")}
                    </div>

                    {log.weather && (
                      <div className="rdo-log-weather" style={{ marginTop: 6 }}>
                        Clima: {log.weather}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        border: "1px solid #dbeafe",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {stats.crewCount} funcionário(s)
                    </span>

                    <span
                      style={{
                        border: "1px solid #dcfce7",
                        background: "#f0fdf4",
                        color: "#15803d",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {stats.invoiceCount} NF(s)
                    </span>

                    <span
                      style={{
                        border: "1px solid #f3e8ff",
                        background: "#faf5ff",
                        color: "#7e22ce",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {stats.photoCount} foto(s)
                    </span>
                  </div>
                </div>

                {log.summary && (
                  <div
                    className="rdo-log-summary"
                    style={{ marginTop: 12, lineHeight: 1.6 }}
                  >
                    {log.summary}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="rdo-btn rdo-btn-secondary"
                    onClick={() => handleViewLog(log)}
                    disabled={viewingLogId === log.id}
                  >
                    {viewingLogId === log.id ? "Carregando..." : "Visualizar"}
                  </button>

                  <button
                    type="button"
                    className="rdo-btn rdo-btn-primary"
                    onClick={() => handleGenerateLogPdf(log)}
                    disabled={pdfLoadingId === log.id}
                  >
                    {pdfLoadingId === log.id ? "Gerando PDF..." : "Gerar PDF"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rdo-top-gap">
          {canEdit ? (
            <RegistroWizard
              project={{
                id: project.id,
                nome: project.name,
                cliente: project.client_name ?? "",
                endereco: project.address ?? "",
              }}
              onSaved={loadData}
            />
          ) : (
            <div className="rdo-card rdo-section">
              <h2 className="rdo-form-title">Modo visualização</h2>
              <p className="rdo-form-subtitle">
                Você tem acesso apenas para visualizar esta obra, consultar registros,
                NF's, fotos e gerar PDF.
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedLog && selectedLogDetails && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 999,
          }}
          onClick={closeModal}
        >
          <div
            className="rdo-card"
            style={{
              width: "100%",
              maxWidth: 920,
              maxHeight: "90vh",
              overflowY: "auto",
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
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  Registro de {new Date(selectedLog.log_date).toLocaleDateString("pt-BR")}
                </h2>
                <p style={{ margin: "8px 0 0", color: "#6b7280" }}>
                  Visualização completa do registro finalizado.
                </p>
              </div>

              <button
                type="button"
                className="rdo-btn rdo-btn-secondary"
                onClick={closeModal}
              >
                Fechar
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#f9fafb" }}>
                <strong>Clima</strong>
                <div style={{ marginTop: 6 }}>{selectedLog.weather || "-"}</div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#f9fafb" }}>
                <strong>Funcionários</strong>
                <div style={{ marginTop: 6 }}>{selectedLogDetails.crew.length}</div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#f9fafb" }}>
                <strong>NF's</strong>
                <div style={{ marginTop: 6 }}>{selectedLogDetails.invoices.length}</div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#f9fafb" }}>
                <strong>Fotos</strong>
                <div style={{ marginTop: 6 }}>{selectedLogDetails.photos.length}</div>
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 18, background: "#fff" }}>
              <p><strong>Resumo:</strong> {selectedLog.summary || "-"}</p>
              <p><strong>Ocorrências:</strong> {selectedLog.issues || "-"}</p>
              <p><strong>Serviços:</strong> {selectedLog.next_steps || "-"}</p>
            </div>

            <div className="rdo-top-gap">
              <h3>Funcionários</h3>
              {selectedLogDetails.crew.length === 0 ? (
                <p>Nenhum funcionário informado.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {selectedLogDetails.crew.map((item) => (
                    <div key={item.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
                      <strong>{item.name}</strong>
                      <div style={{ marginTop: 6, color: "#4b5563" }}>
                        Função: {item.role || "-"} • Horas: {item.hours ?? "-"}h
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rdo-top-gap">
              <h3>NF's</h3>
              {selectedLogDetails.invoices.length === 0 ? (
                <p>Nenhuma NF cadastrada.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {selectedLogDetails.invoices.map((item) => (
                    <div key={item.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
                      <strong>{item.invoice_number || "Sem número"}</strong>
                      <div style={{ marginTop: 6, color: "#4b5563" }}>
                        {item.description || item.original_file_name}
                      </div>

                      {item.signed_url && (
                        <div style={{ marginTop: 10 }}>
                          <a href={item.signed_url} target="_blank" rel="noreferrer">
                            Abrir arquivo
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rdo-top-gap">
              <h3>Fotos</h3>
              {selectedLogDetails.photos.length === 0 ? (
                <p>Nenhuma foto cadastrada.</p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  {selectedLogDetails.photos.map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        overflow: "hidden",
                        background: "#fff",
                      }}
                    >
                      {photo.signed_url ? (
                        <img
                          src={photo.signed_url}
                          alt="Foto do registro"
                          style={{
                            width: "100%",
                            height: 180,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div style={{ padding: 16 }}>Imagem indisponível</div>
                      )}

                      <div style={{ padding: 12 }}>
                        {photo.signed_url && (
                          <a href={photo.signed_url} target="_blank" rel="noreferrer">
                            Abrir foto
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 24,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="rdo-btn rdo-btn-secondary"
                onClick={closeModal}
              >
                Fechar
              </button>

              <button
                type="button"
                className="rdo-btn rdo-btn-primary"
                onClick={() => handleGenerateLogPdf(selectedLog)}
                disabled={pdfLoadingId === selectedLog.id}
              >
                {pdfLoadingId === selectedLog.id
                  ? "Gerando PDF..."
                  : "Gerar PDF deste registro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}