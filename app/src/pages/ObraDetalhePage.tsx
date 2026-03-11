import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
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
  weather_morning: string | null;
  weather_afternoon: string | null;
  summary: string | null;
  issues: string | null;
  next_steps: string | null;
  register_number: number | null;
  responsible_name: string | null;
  signature_data: string | null;
};

type CrewEntry = {
  id: string;
  name: string;
  role: string | null;
  hours: number | null;
};

type InvoiceFile = {
  id: string;
  establishment_name: string | null;
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

export default function ObraDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

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

    if (projectData.user_id !== user.id) {
      const { data: sharedAccess } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!sharedAccess) {
        alert("Acesso não permitido");
        navigate("/obras");
        return;
      }
    }

    setProject(projectData);

    const { data: logsData, error: logsError } = await supabase
      .from("daily_logs")
      .select(
        "id, log_date, weather_morning, weather_afternoon, summary, issues, next_steps, register_number, responsible_name, signature_data"
      )
      .eq("project_id", id)
      .order("log_date", { ascending: false });

    if (logsError) {
      alert(`Erro ao carregar registros: ${logsError.message}`);
      setLoading(false);
      return;
    }

    setLogs(logsData ?? []);
    setLoading(false);
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
      establishment_name: string | null;
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
      .select(
        "id, establishment_name, invoice_number, description, original_file_name, storage_path"
      )
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

    const crew = crewData ?? [];
    const invoices = await getSignedInvoiceUrls(invoicesData ?? []);
    const photos = await getSignedPhotoUrls(photosData ?? []);

    return {
      crew,
      invoices,
      photos,
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

  async function buildLogPdfHtml(log: DailyLog, details: LogDetails) {
    if (!project) return "";

    const qrText = `RDO ${log.register_number ?? "-"} | Obra: ${project.name} | Data: ${new Date(
      log.log_date
    ).toLocaleDateString("pt-BR")} | Responsável: ${
      log.responsible_name || "-"
    }`;

    const qrCodeDataUrl = await QRCode.toDataURL(qrText, {
      width: 160,
      margin: 1,
    });

    const crewHtml = details.crew
      .map(
        (item) =>
          `<tr>
            <td>${item.name}</td>
            <td>${item.role || "-"}</td>
          </tr>`
      )
      .join("");

    const photosHtml = details.photos
      .map((item) =>
        item.signed_url
          ? `<div class="photo">
               <img src="${item.signed_url}" />
               <p>${item.caption || ""}</p>
             </div>`
          : ""
      )
      .join("");

    const invoicesHtml = details.invoices
      .map(
        (item) =>
          `<tr>
            <td>${item.establishment_name || "-"}</td>
            <td>${item.invoice_number || "-"}</td>
            <td>${item.description || "-"}</td>
          </tr>`
      )
      .join("");

    return `
      <html>
        <head>
          <title>Registro Diário de Obra</title>

          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 40px;
              color: #1f2937;
            }

            h1 {
              margin-bottom: 4px;
            }

            h3 {
              margin-bottom: 10px;
            }

            .header {
              border-bottom: 3px solid #2563eb;
              padding-bottom: 12px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              gap: 20px;
              align-items: flex-start;
            }

            .header-right {
              text-align: right;
            }

            .header-right img {
              width: 120px;
              height: 120px;
            }

            .section {
              margin-bottom: 22px;
            }

            .box {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 14px;
              margin-top: 8px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th {
              text-align: left;
              background: #f3f4f6;
              padding: 8px;
              border: 1px solid #e5e7eb;
            }

            td {
              padding: 8px;
              border: 1px solid #e5e7eb;
            }

            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }

            .photos {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 12px;
            }

            .photo img {
              width: 100%;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }

            .photo p {
              font-size: 12px;
              margin-top: 6px;
            }

            .signature {
              margin-top: 10px;
              max-width: 260px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
            }

            .footer {
              margin-top: 40px;
              font-size: 12px;
              color: #6b7280;
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div>
              <h1>Registro Diário de Obra</h1>
              <strong>${project.name}</strong>
              <div>Cliente: ${project.client_name || "-"}</div>
              <div>Endereço: ${project.address || "-"}</div>
              <div><strong>RDO nº:</strong> ${log.register_number ?? "-"}</div>
            </div>

            <div class="header-right">
              <img src="${qrCodeDataUrl}" />
              <div>Validação do registro</div>
            </div>
          </div>

          <div class="section">
            <h3>Informações do Registro</h3>

            <div class="box grid">
              <div><strong>Data:</strong> ${new Date(log.log_date).toLocaleDateString(
                "pt-BR"
              )}</div>
              <div><strong>Clima manhã:</strong> ${log.weather_morning || "-"}</div>
              <div><strong>Clima tarde:</strong> ${log.weather_afternoon || "-"}</div>
              <div><strong>Responsável:</strong> ${log.responsible_name || "-"}</div>
            </div>

            ${
              log.signature_data
                ? `<div class="box">
                    <strong>Assinatura</strong><br />
                    <img class="signature" src="${log.signature_data}" />
                  </div>`
                : ""
            }
          </div>

          <div class="section">
            <h3>Resumo do dia</h3>
            <div class="box">${log.summary || "-"}</div>
          </div>

          <div class="section">
            <h3>Ocorrências</h3>
            <div class="box">${log.issues || "-"}</div>
          </div>

          <div class="section">
            <h3>Funcionários</h3>

            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Função</th>
                </tr>
              </thead>

              <tbody>
                ${crewHtml || `<tr><td colspan="2">Nenhum</td></tr>`}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>Serviços</h3>
            <div class="box">${log.next_steps || "-"}</div>
          </div>

          <div class="section">
            <h3>Fotos da obra</h3>

            <div class="photos">
              ${photosHtml || "<p>Nenhuma foto registrada.</p>"}
            </div>
          </div>

          <div class="section">
            <h3>Notas fiscais</h3>

            <table>
              <thead>
                <tr>
                  <th>Estabelecimento</th>
                  <th>Número NF</th>
                  <th>Descrição</th>
                </tr>
              </thead>

              <tbody>
                ${invoicesHtml || `<tr><td colspan="3">Nenhuma</td></tr>`}
              </tbody>
            </table>
          </div>

          <div class="footer">
            Documento gerado automaticamente pelo sistema RDO • ${new Date().toLocaleString(
              "pt-BR"
            )}
          </div>
        </body>
      </html>
    `;
  }

  async function handleGenerateLogPdf(log: DailyLog) {
    try {
      setPdfLoadingId(log.id);
      const details = await loadLogDetails(log);
      const html = await buildLogPdfHtml(log, details);

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

  if (loading) {
    return (
      <div className="rdo-page">
        <div className="rdo-container">
          <div className="rdo-card rdo-section">Carregando obra...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

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

          {logs.map((log) => (
            <div key={log.id} className="rdo-log-item">
              <div className="rdo-log-date">
                RDO #{log.register_number ?? "-"} •{" "}
                {new Date(log.log_date).toLocaleDateString("pt-BR")}
              </div>

              <div className="rdo-log-content">
                <div className="rdo-log-weather">
                  Manhã: {log.weather_morning || "-"} | Tarde:{" "}
                  {log.weather_afternoon || "-"}
                </div>

                {log.summary && (
                  <div className="rdo-log-summary">{log.summary}</div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 14,
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
            </div>
          ))}
        </div>

        <div className="rdo-top-gap">
          <RegistroWizard
            project={{
              id: project.id,
              nome: project.name,
              cliente: project.client_name ?? "",
              endereco: project.address ?? "",
            }}
            onSaved={loadData}
          />
        </div>
      </div>

      {selectedLog && selectedLogDetails && (
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
          onClick={closeModal}
        >
          <div
            className="rdo-card"
            style={{
              width: "100%",
              maxWidth: 900,
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
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  RDO #{selectedLog.register_number ?? "-"} •{" "}
                  {new Date(selectedLog.log_date).toLocaleDateString("pt-BR")}
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

            <div className="rdo-section" style={{ padding: 0 }}>
              <p>
                <strong>Clima manhã:</strong> {selectedLog.weather_morning || "-"}
              </p>
              <p>
                <strong>Clima tarde:</strong> {selectedLog.weather_afternoon || "-"}
              </p>
              <p>
                <strong>Responsável:</strong> {selectedLog.responsible_name || "-"}
              </p>
              <p>
                <strong>Resumo:</strong> {selectedLog.summary || "-"}
              </p>
              <p>
                <strong>Ocorrências:</strong> {selectedLog.issues || "-"}
              </p>
              <p>
                <strong>Serviços:</strong> {selectedLog.next_steps || "-"}
              </p>
            </div>

            {selectedLog.signature_data && (
              <div className="rdo-top-gap">
                <h3>Assinatura</h3>
                <img
                  src={selectedLog.signature_data}
                  alt="Assinatura"
                  style={{
                    maxWidth: 260,
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    background: "#fff",
                  }}
                />
              </div>
            )}

            <div className="rdo-top-gap">
              <h3>Funcionários</h3>
              {selectedLogDetails.crew.length === 0 ? (
                <p>Nenhum funcionário informado.</p>
              ) : (
                <ul>
                  {selectedLogDetails.crew.map((item) => (
                    <li key={item.id}>
                      <strong>{item.name}</strong> - {item.role || "-"}
                    </li>
                  ))}
                </ul>
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
                        borderRadius: 12,
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
                        <p style={{ marginTop: 0, marginBottom: 10 }}>
                          <strong>Legenda:</strong> {photo.caption || "-"}
                        </p>

                        {photo.signed_url && (
                          <a
                            href={photo.signed_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir foto
                          </a>
                        )}
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
                <div style={{ display: "grid", gap: 12 }}>
                  {selectedLogDetails.invoices.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 14,
                        background: "#fff",
                      }}
                    >
                      <p style={{ margin: "0 0 8px" }}>
                        <strong>Nome do estabelecimento:</strong>{" "}
                        {item.establishment_name || "-"}
                      </p>
                      <p style={{ margin: "0 0 8px" }}>
                        <strong>Número da NF:</strong> {item.invoice_number || "-"}
                      </p>
                      <p style={{ margin: "0 0 8px" }}>
                        <strong>Descrição:</strong> {item.description || "-"}
                      </p>
                      <p style={{ margin: "0 0 10px" }}>
                        <strong>Arquivo:</strong> {item.original_file_name}
                      </p>

                      {item.signed_url && (
                        <a
                          href={item.signed_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir arquivo
                        </a>
                      )}
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