import { useEffect, useMemo, useRef, useState } from "react";
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

type CrewEntry = {
  id: string;
  daily_log_id: string;
  name: string;
  role: string | null;
};

type PhotoEntry = {
  id: string;
  daily_log_id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string | null;
  signed_url?: string | null;
};

type InvoiceFile = {
  id: string;
  daily_log_id: string;
  establishment_name: string | null;
  invoice_number: string | null;
  description: string | null;
  original_file_name: string;
  storage_path: string;
  mime_type: string | null;
  signed_url?: string | null;
};

type LogWithCounts = DailyLog & {
  crewCount: number;
  photoCount: number;
  invoiceCount: number;
};

type SelectedLogDetails = {
  crew: CrewEntry[];
  photos: PhotoEntry[];
  invoices: InvoiceFile[];
};

function getBadgeStyle(type: "crew" | "photo" | "invoice"): React.CSSProperties {
  if (type === "crew") {
    return {
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
  }

  if (type === "invoice") {
    return {
      background: "#f0fdf4",
      color: "#15803d",
      border: "1px solid #bbf7d0",
    };
  }

  return {
    background: "#faf5ff",
    color: "#9333ea",
    border: "1px solid #e9d5ff",
  };
}

export default function ObraDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<LogWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"registro" | "historico">("registro");
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [selectedLog, setSelectedLog] = useState<LogWithCounts | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<SelectedLogDetails | null>(
    null
  );
  const [loadingSelected, setLoadingSelected] = useState(false);

  const [historicoBusca, setHistoricoBusca] = useState("");
  const [historicoData, setHistoricoData] = useState("");

  async function loadData() {
    if (!id) return;

    setLoading(true);

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("id,name,client_name,address")
      .eq("id", id)
      .single();

    if (projectError) {
      alert(projectError.message);
      setLoading(false);
      return;
    }

    setProject(projectData);

    const { data: logsData, error: logsError } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("project_id", id)
      .order("log_date", { ascending: false });

    if (logsError) {
      alert(logsError.message);
      setLoading(false);
      return;
    }

    const baseLogs = (logsData ?? []) as DailyLog[];
    const logIds = baseLogs.map((item) => item.id);

    const crewCounts = new Map<string, number>();
    const photoCounts = new Map<string, number>();
    const invoiceCounts = new Map<string, number>();

    if (logIds.length > 0) {
      const [{ data: crewData }, { data: photosData }, { data: invoicesData }] =
        await Promise.all([
          supabase.from("crew_entries").select("daily_log_id").in("daily_log_id", logIds),
          supabase.from("photos").select("daily_log_id").in("daily_log_id", logIds),
          supabase.from("invoice_files").select("daily_log_id").in("daily_log_id", logIds),
        ]);

      (crewData ?? []).forEach((item: { daily_log_id: string }) => {
        crewCounts.set(item.daily_log_id, (crewCounts.get(item.daily_log_id) ?? 0) + 1);
      });

      (photosData ?? []).forEach((item: { daily_log_id: string }) => {
        photoCounts.set(item.daily_log_id, (photoCounts.get(item.daily_log_id) ?? 0) + 1);
      });

      (invoicesData ?? []).forEach((item: { daily_log_id: string }) => {
        invoiceCounts.set(
          item.daily_log_id,
          (invoiceCounts.get(item.daily_log_id) ?? 0) + 1
        );
      });
    }

    const enriched: LogWithCounts[] = baseLogs.map((log) => ({
      ...log,
      crewCount: crewCounts.get(log.id) ?? 0,
      photoCount: photoCounts.get(log.id) ?? 0,
      invoiceCount: invoiceCounts.get(log.id) ?? 0,
    }));

    setLogs(enriched);
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

  async function createSignedPhotoUrls(items: PhotoEntry[]): Promise<PhotoEntry[]> {
    return Promise.all(
      items.map(async (photo) => {
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

  async function createSignedInvoiceUrls(
    items: InvoiceFile[]
  ): Promise<InvoiceFile[]> {
    return Promise.all(
      items.map(async (invoice) => {
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

  async function loadSelectedDetails(logId: string): Promise<SelectedLogDetails> {
    const [{ data: crewData }, { data: photosData }, { data: invoicesData }] =
      await Promise.all([
        supabase
          .from("crew_entries")
          .select("id,daily_log_id,name,role")
          .eq("daily_log_id", logId)
          .order("name", { ascending: true }),
        supabase
          .from("photos")
          .select("id,daily_log_id,storage_path,caption,taken_at")
          .eq("daily_log_id", logId)
          .order("taken_at", { ascending: false }),
        supabase
          .from("invoice_files")
          .select(
            "id,daily_log_id,establishment_name,invoice_number,description,original_file_name,storage_path,mime_type"
          )
          .eq("daily_log_id", logId),
      ]);

    const signedPhotos = await createSignedPhotoUrls((photosData ?? []) as PhotoEntry[]);
    const signedInvoices = await createSignedInvoiceUrls(
      (invoicesData ?? []) as InvoiceFile[]
    );

    return {
      crew: (crewData ?? []) as CrewEntry[],
      photos: signedPhotos,
      invoices: signedInvoices,
    };
  }

  async function handleOpenLog(log: LogWithCounts) {
    setLoadingSelected(true);
    setSelectedLog(log);
    setSelectedDetails(null);
    setOpenMenuId(null);

    try {
      const details = await loadSelectedDetails(log.id);
      setSelectedDetails(details);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao abrir registro.");
      setSelectedLog(null);
      setSelectedDetails(null);
    } finally {
      setLoadingSelected(false);
    }
  }

  function handleEdit(log: DailyLog) {
    setEditingLog(log);
    setActiveTab("registro");
    setOpenMenuId(null);
  }

  function handleCancelEdit() {
    setEditingLog(null);
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
    const confirmDelete = window.confirm(
      `Deseja excluir ${formatRdoNumber(log.register_number)} de ${formatDateBR(
        log.log_date
      )}?`
    );
    if (!confirmDelete) return;

    const { data: photosData } = await supabase
      .from("photos")
      .select("storage_path")
      .eq("daily_log_id", log.id);

    const { data: invoicesData } = await supabase
      .from("invoice_files")
      .select("storage_path")
      .eq("daily_log_id", log.id);

    const photoPaths = (photosData ?? []).map((item) => item.storage_path);
    const invoicePaths = (invoicesData ?? []).map((item) => item.storage_path);

    if (photoPaths.length > 0) {
      await supabase.storage.from("project-photos").remove(photoPaths);
    }

    if (invoicePaths.length > 0) {
      await supabase.storage.from("nota-fiscais").remove(invoicePaths);
    }

    await supabase.from("crew_entries").delete().eq("daily_log_id", log.id);
    await supabase.from("photos").delete().eq("daily_log_id", log.id);
    await supabase.from("invoice_files").delete().eq("daily_log_id", log.id);
    await supabase.from("daily_logs").delete().eq("id", log.id);

    setOpenMenuId(null);

    if (selectedLog?.id === log.id) {
      setSelectedLog(null);
      setSelectedDetails(null);
    }

    await loadData();
  }

  async function buildPdf(log: LogWithCounts) {
    const details = await loadSelectedDetails(log.id);

    const qr = await QRCode.toDataURL(
      `https://rdo-app-sigma.vercel.app/rdo/${log.id}`
    );

    const crewHtml =
      details.crew.length > 0
        ? details.crew
            .map(
              (item) =>
                `<li><strong>${item.name}</strong>${item.role ? ` - ${item.role}` : ""}</li>`
            )
            .join("")
        : "<li>Nenhum funcionário registrado.</li>";

    const photosHtml =
      details.photos.length > 0
        ? details.photos
            .map(
              (photo) => `
                <div style="margin-bottom:18px; break-inside: avoid;">
                  ${
                    photo.signed_url
                      ? `<img src="${photo.signed_url}" style="width:100%; max-width:320px; border-radius:10px; border:1px solid #dbe3ef;" />`
                      : ""
                  }
                  <div style="margin-top:8px;"><strong>Legenda:</strong> ${
                    photo.caption || "-"
                  }</div>
                </div>
              `
            )
            .join("")
        : "<p>Nenhuma foto registrada.</p>";

    const invoicesHtml =
      details.invoices.length > 0
        ? details.invoices
            .map(
              (invoice) => `
                <div style="border:1px solid #dbe3ef; border-radius:12px; padding:12px; margin-bottom:14px; break-inside: avoid;">
                  <p><strong>Estabelecimento:</strong> ${
                    invoice.establishment_name || "-"
                  }</p>
                  <p><strong>Número da NF:</strong> ${
                    invoice.invoice_number || "-"
                  }</p>
                  <p><strong>Descrição:</strong> ${invoice.description || "-"}</p>
                  <p><strong>Arquivo:</strong> ${invoice.original_file_name}</p>
                  ${
                    invoice.signed_url &&
                    invoice.mime_type &&
                    invoice.mime_type.startsWith("image/")
                      ? `<img src="${invoice.signed_url}" style="width:100%; max-width:320px; border-radius:10px; border:1px solid #dbe3ef;" />`
                      : ""
                  }
                </div>
              `
            )
            .join("")
        : "<p>Nenhuma NF registrada.</p>";

    return `
      <html>
        <body style="font-family:Arial, sans-serif;padding:34px;color:#0f172a;">
          <div style="display:flex; justify-content:space-between; gap:16px; border-bottom:3px solid #2563eb; padding-bottom:14px; margin-bottom:20px;">
            <div>
              <h1 style="margin:0 0 8px;">Registro Diário de Obra</h1>
              <p style="margin:4px 0;"><strong>Obra:</strong> ${project?.name || "-"}</p>
              <p style="margin:4px 0;"><strong>Cliente:</strong> ${project?.client_name || "-"}</p>
              <p style="margin:4px 0;"><strong>Endereço:</strong> ${project?.address || "-"}</p>
              <p style="margin:8px 0 0;"><strong>Registro:</strong> ${formatRdoNumber(
                log.register_number
              )}</p>
            </div>
            <div style="text-align:right;">
              <img src="${qr}" width="110" />
              <div style="font-size:12px;color:#64748b;">Validação do registro</div>
            </div>
          </div>

          <div style="border:1px solid #dbe3ef; border-radius:12px; padding:14px; margin-bottom:18px;">
            <p><strong>Data:</strong> ${formatDateBR(log.log_date)}</p>
            <p><strong>Clima manhã:</strong> ${log.weather_morning || "-"}</p>
            <p><strong>Clima tarde:</strong> ${log.weather_afternoon || "-"}</p>
            <p><strong>Responsável:</strong> ${log.responsible_name || "-"}</p>
            <p><strong>Resumo:</strong> ${log.summary || "-"}</p>
            <p><strong>Ocorrências:</strong> ${log.issues || "-"}</p>
            <p><strong>Serviços:</strong> ${log.next_steps || "-"}</p>
          </div>

          <div style="margin-bottom:18px;">
            <span style="display:inline-block; padding:8px 12px; border-radius:999px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; margin-right:8px;">Funcionários (${details.crew.length})</span>
            <span style="display:inline-block; padding:8px 12px; border-radius:999px; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; margin-right:8px;">NF's (${details.invoices.length})</span>
            <span style="display:inline-block; padding:8px 12px; border-radius:999px; background:#faf5ff; color:#9333ea; border:1px solid #e9d5ff;">Fotos (${details.photos.length})</span>
          </div>

          <h3>Funcionários</h3>
          <ul>${crewHtml}</ul>

          <h3>Fotos (${details.photos.length})</h3>
          ${photosHtml}

          <h3>NF's (${details.invoices.length})</h3>
          ${invoicesHtml}

          <div style="margin-top:24px; color:#64748b; font-size:12px;">
            Documento gerado em ${new Date().toLocaleString("pt-BR")}
          </div>
        </body>
      </html>
    `;
  }

  async function handleGeneratePdf(log: LogWithCounts) {
    const html = await buildPdf(log);
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(html);
    win.document.close();
    win.print();

    setOpenMenuId(null);
  }

  const logsFiltrados = useMemo(() => {
    return logs.filter((log) => {
      const texto = [
        formatRdoNumber(log.register_number),
        formatDateBR(log.log_date),
        log.summary || "",
        log.responsible_name || "",
        log.weather_morning || "",
        log.weather_afternoon || "",
      ]
        .join(" ")
        .toLowerCase();

      const buscaOk = historicoBusca.trim()
        ? texto.includes(historicoBusca.trim().toLowerCase())
        : true;

      const dataOk = historicoData ? log.log_date === historicoData : true;

      return buscaOk && dataOk;
    });
  }, [logs, historicoBusca, historicoData]);

  const selectedSummary = useMemo(() => {
    if (!selectedLog || !selectedDetails) return null;

    return {
      ...selectedLog,
      crewCount: selectedDetails.crew.length,
      photoCount: selectedDetails.photos.length,
      invoiceCount: selectedDetails.invoices.length,
    };
  }, [selectedLog, selectedDetails]);

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
            {editingLog && (
              <div className="rdo-card rdo-section" style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>
                      Editando {formatRdoNumber(editingLog.register_number)} •{" "}
                      {formatDateBR(editingLog.log_date)}
                    </strong>
                    <div style={{ color: "#64748b", marginTop: 6 }}>
                      Atualize as informações do registro selecionado.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rdo-btn rdo-btn-secondary"
                    onClick={handleCancelEdit}
                  >
                    Cancelar edição
                  </button>
                </div>
              </div>
            )}

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
          <div className="rdo-top-gap">
            <div className="rdo-card rdo-section" style={{ marginBottom: 16 }}>
              <div className="rdo-form-grid-2">
                <div className="rdo-field">
                  <label className="rdo-label">Buscar no histórico</label>
                  <input
                    className="rdo-input"
                    placeholder="Ex: RDO-001, responsável, resumo..."
                    value={historicoBusca}
                    onChange={(e) => setHistoricoBusca(e.target.value)}
                  />
                </div>

                <div className="rdo-field">
                  <label className="rdo-label">Filtrar por data</label>
                  <input
                    className="rdo-input"
                    type="date"
                    value={historicoData}
                    onChange={(e) => setHistoricoData(e.target.value)}
                  />
                </div>
              </div>

              {(historicoBusca || historicoData) && (
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="rdo-btn rdo-btn-secondary"
                    onClick={() => {
                      setHistoricoBusca("");
                      setHistoricoData("");
                    }}
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>

            <div className="rdo-card rdo-section">
              {logsFiltrados.length === 0 && (
                <p className="rdo-empty-state">Nenhum registro encontrado.</p>
              )}

              {logsFiltrados.map((log) => (
                <div key={log.id} className="rdo-log-item">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div className="rdo-log-content" style={{ flex: 1, minWidth: 0 }}>
                      <div className="rdo-log-date">
                        {formatRdoNumber(log.register_number)} •{" "}
                        {formatDateBR(log.log_date)}
                      </div>

                      <div className="rdo-log-weather">
                        Manhã: {log.weather_morning || "-"} | Tarde:{" "}
                        {log.weather_afternoon || "-"}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          marginTop: 12,
                        }}
                      >
                        <span className="rdo-badge" style={getBadgeStyle("crew")}>
                          Funcionários ({log.crewCount})
                        </span>

                        <span className="rdo-badge" style={getBadgeStyle("invoice")}>
                          NF's ({log.invoiceCount})
                        </span>

                        <span className="rdo-badge" style={getBadgeStyle("photo")}>
                          Fotos ({log.photoCount})
                        </span>
                      </div>

                      {log.responsible_name && (
                        <div style={{ marginTop: 10, color: "#475569" }}>
                          <strong>Responsável:</strong> {log.responsible_name}
                        </div>
                      )}

                      {log.summary && (
                        <div className="rdo-log-summary" style={{ marginTop: 12 }}>
                          {log.summary}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        className="rdo-btn rdo-btn-primary"
                        onClick={() => handleOpenLog(log)}
                      >
                        Abrir
                      </button>

                      <div
                        ref={openMenuId === log.id ? menuRef : null}
                        style={{ position: "relative" }}
                      >
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
                              minWidth: 180,
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedLog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
          onClick={() => {
            setSelectedLog(null);
            setSelectedDetails(null);
          }}
        >
          <div
            className="rdo-card"
            style={{
              width: "100%",
              maxWidth: 980,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  {formatRdoNumber(selectedLog.register_number)} •{" "}
                  {formatDateBR(selectedLog.log_date)}
                </h2>
                <p style={{ margin: "8px 0 0", color: "#64748b" }}>
                  Visualização completa do registro.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="rdo-btn rdo-btn-secondary"
                  onClick={() => handleShareLog(selectedLog)}
                >
                  Compartilhar
                </button>

                <button
                  type="button"
                  className="rdo-btn rdo-btn-primary"
                  onClick={() => handleGeneratePdf(selectedLog)}
                >
                  Gerar PDF
                </button>

                <button
                  type="button"
                  className="rdo-btn rdo-btn-secondary"
                  onClick={() => {
                    setSelectedLog(null);
                    setSelectedDetails(null);
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>

            {loadingSelected && <p>Carregando detalhes do registro...</p>}

            {!loadingSelected && selectedDetails && selectedSummary && (
              <>
                <div className="rdo-form-grid">
                  <div className="rdo-form-grid-2">
                    <div className="rdo-field">
                      <label className="rdo-label">Data</label>
                      <div className="rdo-input">{formatDateBR(selectedLog.log_date)}</div>
                    </div>

                    <div className="rdo-field">
                      <label className="rdo-label">Responsável</label>
                      <div className="rdo-input">{selectedLog.responsible_name || "-"}</div>
                    </div>
                  </div>

                  <div className="rdo-form-grid-2">
                    <div className="rdo-field">
                      <label className="rdo-label">Clima (manhã)</label>
                      <div className="rdo-input">{selectedLog.weather_morning || "-"}</div>
                    </div>

                    <div className="rdo-field">
                      <label className="rdo-label">Clima (tarde)</label>
                      <div className="rdo-input">{selectedLog.weather_afternoon || "-"}</div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="rdo-badge" style={getBadgeStyle("crew")}>
                      Funcionários ({selectedSummary.crewCount})
                    </span>

                    <span className="rdo-badge" style={getBadgeStyle("invoice")}>
                      NF's ({selectedSummary.invoiceCount})
                    </span>

                    <span className="rdo-badge" style={getBadgeStyle("photo")}>
                      Fotos ({selectedSummary.photoCount})
                    </span>
                  </div>

                  <div className="rdo-field">
                    <label className="rdo-label">Resumo</label>
                    <div className="rdo-textarea">{selectedLog.summary || "-"}</div>
                  </div>

                  <div className="rdo-field">
                    <label className="rdo-label">Ocorrências</label>
                    <div className="rdo-textarea">{selectedLog.issues || "-"}</div>
                  </div>

                  <div className="rdo-field">
                    <label className="rdo-label">Serviços</label>
                    <div className="rdo-textarea">{selectedLog.next_steps || "-"}</div>
                  </div>
                </div>

                <div className="rdo-top-gap">
                  <h3>Funcionários</h3>
                  {selectedDetails.crew.length === 0 ? (
                    <p className="rdo-empty-state">Nenhum funcionário registrado.</p>
                  ) : (
                    <div className="rdo-repeat-list">
                      {selectedDetails.crew.map((item) => (
                        <div key={item.id} className="rdo-repeat-item">
                          <strong>{item.name}</strong>
                          <div style={{ color: "#64748b", marginTop: 6 }}>
                            {item.role || "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rdo-top-gap">
                  <h3>Fotos</h3>
                  {selectedDetails.photos.length === 0 ? (
                    <p className="rdo-empty-state">Nenhuma foto registrada.</p>
                  ) : (
                    <div className="rdo-photo-grid">
                      {selectedDetails.photos.map((photo) => (
                        <div key={photo.id} className="rdo-photo-item">
                          {photo.signed_url ? (
                            <img src={photo.signed_url} alt="Foto do registro" />
                          ) : null}

                          <div style={{ padding: 12 }}>
                            <strong>Legenda:</strong>
                            <div style={{ marginTop: 6, color: "#475569" }}>
                              {photo.caption || "-"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rdo-top-gap">
                  <h3>NF's</h3>
                  {selectedDetails.invoices.length === 0 ? (
                    <p className="rdo-empty-state">Nenhuma NF registrada.</p>
                  ) : (
                    <div className="rdo-repeat-list">
                      {selectedDetails.invoices.map((invoice) => (
                        <div key={invoice.id} className="rdo-repeat-item">
                          <p style={{ margin: "0 0 8px" }}>
                            <strong>Estabelecimento:</strong>{" "}
                            {invoice.establishment_name || "-"}
                          </p>
                          <p style={{ margin: "0 0 8px" }}>
                            <strong>Número:</strong> {invoice.invoice_number || "-"}
                          </p>
                          <p style={{ margin: "0 0 8px" }}>
                            <strong>Descrição:</strong> {invoice.description || "-"}
                          </p>
                          <p style={{ margin: "0 0 8px" }}>
                            <strong>Arquivo:</strong> {invoice.original_file_name}
                          </p>

                          {invoice.signed_url &&
                            invoice.mime_type &&
                            invoice.mime_type.startsWith("image/") && (
                              <img
                                src={invoice.signed_url}
                                alt="NF"
                                style={{
                                  maxWidth: 280,
                                  borderRadius: 12,
                                  border: "1px solid #dbe3ef",
                                  marginTop: 8,
                                }}
                              />
                            )}

                          {invoice.signed_url && (
                            <div style={{ marginTop: 10 }}>
                              <a
                                href={invoice.signed_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Abrir arquivo
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}