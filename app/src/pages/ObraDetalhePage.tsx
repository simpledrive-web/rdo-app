import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import RegistroWizard from "../components/RegistroWizard";
import { supabase } from "../supabase/client";

/* ===============================
   Função segura para data BR
================================ */
function formatDateBR(dateString: string | null) {
  if (!dateString) return "-";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

/* ===============================
   Tipagens
================================ */

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
};

type LogDetails = {
  crew: any[];
  invoices: any[];
  photos: any[];
};

/* ===============================
   Formatação do número do RDO
================================ */

function formatRdoNumber(value: number | null | undefined) {
  if (!value) return "RDO-000";
  return `RDO-${String(value).padStart(3, "0")}`;
}

/* ===============================
   Página principal
================================ */

export default function ObraDetalhePage() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"registro" | "historico">("registro");

  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [selectedLogDetails, setSelectedLogDetails] = useState<LogDetails | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  /* ===============================
     Carregar dados
  ================================= */

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

    const { data: projectData } = await supabase
      .from("projects")
      .select("id,name,client_name,address,user_id")
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

  /* ===============================
     Fechar menu ao clicar fora
  ================================= */

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

  /* ===============================
     Compartilhar
  ================================= */

  async function handleShareLog(log: DailyLog) {

    const shareUrl = `https://rdo-app-sigma.vercel.app/rdo/${log.id}`;

    try {

      await navigator.clipboard.writeText(shareUrl);

      alert("Link copiado!");

    } catch {

      prompt("Copie o link:", shareUrl);

    }

  }

  /* ===============================
     Gerar PDF
  ================================= */

  async function buildPdf(log: DailyLog) {

    const qr = await QRCode.toDataURL(
      `https://rdo-app-sigma.vercel.app/rdo/${log.id}`
    );

    return `
    <html>
      <body style="font-family:Arial;padding:30px">

      <h2>Registro Diário de Obra</h2>

      <p><b>Obra:</b> ${project?.name}</p>
      <p><b>Cliente:</b> ${project?.client_name ?? "-"}</p>
      <p><b>Endereço:</b> ${project?.address ?? "-"}</p>

      <hr>

      <p><b>Registro:</b> ${formatRdoNumber(log.register_number)}</p>

      <p><b>Data:</b> ${formatDateBR(log.log_date)}</p>

      <p><b>Clima manhã:</b> ${log.weather_morning ?? "-"}</p>
      <p><b>Clima tarde:</b> ${log.weather_afternoon ?? "-"}</p>

      <p><b>Resumo:</b> ${log.summary ?? "-"}</p>

      <p><b>Ocorrências:</b> ${log.issues ?? "-"}</p>

      <p><b>Serviços:</b> ${log.next_steps ?? "-"}</p>

      <br>

      <img src="${qr}" width="120"/>

      </body>
    </html>
    `;
  }

  async function handleGenerateLogPdf(log: DailyLog) {

    const html = await buildPdf(log);

    const printWindow = window.open("", "_blank");

    if (!printWindow) return;

    printWindow.document.write(html);

    printWindow.document.close();

    printWindow.print();
  }

  /* ===============================
     Layout
  ================================= */

  if (loading) {

    return (
      <div className="rdo-page">
        <div className="rdo-container">
          Carregando obra...
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
            <h1>{project.name}</h1>

            <p>
              {project.client_name && <>Cliente: {project.client_name} • </>}
              {project.address}
            </p>
          </div>

          <button onClick={handleBack}>
            Voltar
          </button>

        </div>

        {/* TABS */}

        <div className="rdo-tabs">

          <button
            onClick={() => setActiveTab("registro")}
          >
            Novo Registro
          </button>

          <button
            onClick={() => setActiveTab("historico")}
          >
            Histórico ({logs.length})
          </button>

        </div>

        {/* REGISTRO */}

        {activeTab === "registro" && (

          <RegistroWizard
            project={{
              id: project.id,
              nome: project.name,
              cliente: project.client_name ?? "",
              endereco: project.address ?? ""
            }}
            onSaved={loadData}
          />

        )}

        {/* HISTÓRICO */}

        {activeTab === "historico" && (

          <div>

            {logs.map((log) => (

              <div key={log.id} className="rdo-log-item">

                <div>

                  <strong>
                    {formatRdoNumber(log.register_number)}
                  </strong>

                  {" • "}

                  {formatDateBR(log.log_date)}

                </div>

                <div>

                  <button onClick={() => handleGenerateLogPdf(log)}>
                    PDF
                  </button>

                  <button onClick={() => handleShareLog(log)}>
                    Compartilhar
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}