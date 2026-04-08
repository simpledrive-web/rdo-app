import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase/client";

type PublicLog = {
  id: string;
  log_date: string;
  weather_morning: string | null;
  weather_afternoon: string | null;
  summary: string | null;
  issues: string | null;
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
  signed_url: string | null;
};

export default function PublicRegistroPage() {
  const { logId } = useParams<{ logId: string }>();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [log, setLog] = useState<PublicLog | null>(null);
  const [project, setProject] = useState<PublicProject | null>(null);
  const [crew, setCrew] = useState<PublicCrew[]>([]);
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [invoices, setInvoices] = useState<PublicInvoice[]>([]);

  const formatDateBR = (dateString: string | null) => {
    if (!dateString) return "-";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const formatRdoNumber = (value: number | null | undefined) => {
    if (!value) return "RDO-000";
    return `RDO-${String(value).padStart(3, "0")}`;
  };

  async function loadData() {
    if (!logId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    // Log
    const { data: logData, error: logError } = await supabase
      .from("daily_logs")
      .select(
        "id, log_date, weather_morning, weather_afternoon, summary, issues, register_number, responsible_name, project_id"
      )
      .eq("id", logId)
      .maybeSingle();

    if (logError || !logData) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLog(logData);

    // Projeto
    const { data: projectData } = await supabase
      .from("projects")
      .select("id, name, client_name, address")
      .eq("id", logData.project_id)
      .maybeSingle();
    setProject(projectData ?? null);

    // Equipe
    const { data: crewData } = await supabase
      .from("crew_entries")
      .select("id, name, role")
      .eq("daily_log_id", logId)
      .order("name", { ascending: true });
    setCrew(crewData ?? []);

    // Fotos
    const { data: photosData } = await supabase
      .from("photos")
      .select("id, storage_path, caption")
      .eq("daily_log_id", logId)
      .order("taken_at", { ascending: false });

    const publicPhotos: PublicPhoto[] = (photosData ?? []).map((photo) => {
      const publicUrl = supabase.storage
        .from("project-photos")
        .getPublicUrl(photo.storage_path).data.publicUrl;

      return {
        ...photo,
        signed_url: publicUrl,
      };
    });
    setPhotos(publicPhotos);

    // Notas fiscais
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

  if (loading)
    return (
      <div className="rdo-page">
        <p>Carregando registro...</p>
      </div>
    );

  if (notFound || !log || !project)
    return (
      <div className="rdo-page">
        <p>Registro não encontrado</p>
      </div>
    );

  return (
    <div className="rdo-page">
      <div className="rdo-container">
        <div className="rdo-card rdo-section">
          <h1>{formatRdoNumber(log.register_number)}</h1>
          <p>{formatDateBR(log.log_date)}</p>

          <div className="rdo-top-gap">
            <h3>Obra</h3>
            <div className="rdo-card" style={{ padding: 16 }}>
              <p>
                <strong>Nome:</strong> {project.name}
              </p>
              <p>
                <strong>Cliente:</strong> {project.client_name || "-"}
              </p>
              <p>
                <strong>Endereço:</strong> {project.address || "-"}
              </p>
            </div>
          </div>

          <div className="rdo-top-gap">
            <h3>Responsável e clima</h3>
            <div className="rdo-card" style={{ padding: 16 }}>
              <p>
                <strong>Responsável:</strong> {log.responsible_name || "-"}
              </p>
              <p>
                <strong>Clima manhã:</strong> {log.weather_morning || "-"}
              </p>
              <p>
                <strong>Clima tarde:</strong> {log.weather_afternoon || "-"}
              </p>
              <p>
                <strong>Resumo:</strong> {log.summary || "-"}
              </p>
              <p>
                <strong>Ocorrências:</strong> {log.issues || "-"}
              </p>
            </div>
          </div>

          <div className="rdo-top-gap">
            <h3>Funcionários</h3>
            <div className="rdo-card" style={{ padding: 16 }}>
              {crew.length === 0 ? (
                <p>Nenhum funcionário informado.</p>
              ) : (
                <ul>
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
                <p>Nenhuma foto cadastrada.</p>
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
                          alt={photo.caption || "Foto do registro"}
                          style={{
                            width: "100%",
                            height: 180,
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div style={{ padding: 16 }}>Imagem indisponível</div>
                      )}

                      <div style={{ padding: 12 }}>
                        <p>
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
                <p>Nenhuma NF cadastrada.</p>
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
                      <p>
                        <strong>Nome do estabelecimento:</strong>{" "}
                        {item.establishment_name || "-"}
                      </p>
                      <p>
                        <strong>Número da NF:</strong> {item.invoice_number || "-"}
                      </p>
                      <p>
                        <strong>Descrição:</strong> {item.description || "-"}
                      </p>
                      <p>
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