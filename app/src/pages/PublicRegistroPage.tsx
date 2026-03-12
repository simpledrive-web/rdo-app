import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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

type PublicLog = {
  id: string;
  log_date: string;
  weather_morning: string | null;
  weather_afternoon: string | null;
  summary: string | null;
  issues: string | null;
  next_steps: string | null;
  register_number: number | null;
  responsible_name: string | null;
  project_id: string;
};

type PublicProject = {
  id: string;
  name: string;
  client_name: string | null;
  address: string | null;
};

type PublicCrew = {
  id: string;
  name: string;
  role: string | null;
};

type PublicInvoice = {
  id: string;
  establishment_name: string | null;
  invoice_number: string | null;
  description: string | null;
  original_file_name: string;
};

type PublicPhoto = {
  id: string;
  storage_path: string;
  caption: string | null;
  signed_url?: string | null;
};

export default function PublicRegistroPage() {
  const { logId } = useParams();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [log, setLog] = useState<PublicLog | null>(null);
  const [project, setProject] = useState<PublicProject | null>(null);
  const [crew, setCrew] = useState<PublicCrew[]>([]);
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [invoices, setInvoices] = useState<PublicInvoice[]>([]);

  async function loadData() {
    if (!logId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    const { data: logData, error: logError } = await supabase
      .from("daily_logs")
      .select(
        "id, log_date, weather_morning, weather_afternoon, summary, issues, next_steps, register_number, responsible_name, project_id"
      )
      .eq("id", logId)
      .maybeSingle();

    if (logError || !logData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLog(logData);

    const { data: projectData } = await supabase
      .from("projects")
      .select("id, name, client_name, address")
      .eq("id", logData.project_id)
      .maybeSingle();

    setProject(projectData ?? null);

    const { data: crewData } = await supabase
      .from("crew_entries")
      .select("id, name, role")
      .eq("daily_log_id", logId)
      .order("name", { ascending: true });

    setCrew(crewData ?? []);

    const { data: photosData } = await supabase
      .from("photos")
      .select("id, storage_path, caption")
      .eq("daily_log_id", logId)
      .order("taken_at", { ascending: false });

    const signedPhotos = await Promise.all(
      (photosData ?? []).map(async (photo) => {
        const { data } = await supabase.storage
          .from("project-photos")
          .createSignedUrl(photo.storage_path, 3600);

        return {
          ...photo,
          signed_url: data?.signedUrl ?? null,
        };
      })
    );

    setPhotos(signedPhotos);

    const { data: invoicesData } = await supabase
      .from("invoice_files")
      .select(
        "id, establishment_name, invoice_number, description, original_file_name"
      )
      .eq("daily_log_id", logId)
      .order("created_at", { ascending: false });

    setInvoices(invoicesData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [logId]);

  if (loading) {
    return (
      <div className="rdo-page">
        <div className="rdo-container">
          <div className="rdo-card rdo-section">
            <h1 className="rdo-title" style={{ fontSize: 32 }}>
              Validando registro...
            </h1>
            <p className="rdo-subtitle">
              Aguarde enquanto carregamos as informações do RDO.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !log || !project) {
    return (
      <div className="rdo-page">
        <div className="rdo-container">
          <div className="rdo-card rdo-section">
            <h1 className="rdo-title" style={{ fontSize: 32 }}>
              Registro não encontrado
            </h1>
            <p className="rdo-subtitle">
              Esse QR Code não corresponde a um registro válido ou o conteúdo não
              está disponível.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rdo-page">
      <div className="rdo-container">
        <div className="rdo-card rdo-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#16a34a",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  fontSize: 13,
                }}
              >
                Registro verificado
              </p>

              <h1 className="rdo-title" style={{ fontSize: 34, marginTop: 8 }}>
                {formatRdoNumber(log.register_number)}
              </h1>

              <p className="rdo-subtitle" style={{ marginTop: 10 }}>
                Documento validado com sucesso pelo QR Code.
              </p>
            </div>

            <div
              style={{
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                color: "#15803d",
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 700,
              }}
            >
              Autêntico
            </div>
          </div>

          <div className="rdo-top-gap">
            <h3>Obra</h3>
            <div className="rdo-card" style={{ padding: 16 }}>
              <p style={{ margin: "0 0 8px" }}>
                <strong>Nome:</strong> {project.name}
              </p>
              <p style={{ margin: "0 0 8px" }}>
                <strong>Cliente:</strong> {project.client_name || "-"}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Endereço:</strong> {project.address || "-"}
              </p>
            </div>
          </div>

          <div className="rdo-top-gap">
            <h3>Informações do registro</h3>
            <div className="rdo-card" style={{ padding: 16 }}>
              <p style={{ margin: "0 0 8px" }}>
                <strong>Data:</strong> {formatDateBR(log.log_date)}
              </p>
              <p style={{ margin: "0 0 8px" }}>
                <strong>Clima manhã:</strong> {log.weather_morning || "-"}
              </p>
              <p style={{ margin: "0 0 8px" }}>
                <strong>Clima tarde:</strong> {log.weather_afternoon || "-"}
              </p>
              <p style={{ margin: "0 0 8px" }}>
                <strong>Responsável:</strong> {log.responsible_name || "-"}
              </p>
              <p style={{ margin: "0 0 8px" }}>
                <strong>Resumo:</strong> {log.summary || "-"}
              </p>
              <p style={{ margin: "0 0 8px" }}>
                <strong>Ocorrências:</strong> {log.issues || "-"}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Serviços:</strong> {log.next_steps || "-"}
              </p>
            </div>
          </div>

          <div className="rdo-top-gap">
            <h3>Funcionários</h3>
            <div className="rdo-card" style={{ padding: 16 }}>
              {crew.length === 0 ? (
                <p style={{ margin: 0 }}>Nenhum funcionário informado.</p>
              ) : (
                <ul style={{ margin: 0 }}>
                  {crew.map((item) => (
                    <li key={item.id}>
                      <strong>{item.name}</strong> - {item.role || "-"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rdo-top-gap">
            <h3>Fotos</h3>
            <div className="rdo-card" style={{ padding: 16 }}>
              {photos.length === 0 ? (
                <p style={{ margin: 0 }}>Nenhuma foto cadastrada.</p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  {photos.map((photo) => (
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rdo-top-gap">
            <h3>Notas fiscais</h3>
            <div className="rdo-card" style={{ padding: 16 }}>
              {invoices.length === 0 ? (
                <p style={{ margin: 0 }}>Nenhuma NF cadastrada.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {invoices.map((item) => (
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
                      <p style={{ margin: 0 }}>
                        <strong>Arquivo:</strong> {item.original_file_name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}