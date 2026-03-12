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

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  function handleBack() {
    navigate("/obras");
  }

  async function handleShareLog(log: DailyLog) {

    const url = `https://rdo-app-sigma.vercel.app/rdo/${log.id}`;

    try {

      await navigator.clipboard.writeText(url);

      alert("Link copiado!");

    } catch {

      prompt("Copie o link:", url);

    }

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

  }

  async function handleDelete(log: DailyLog) {

    const confirmDelete = window.confirm("Excluir este registro?");

    if (!confirmDelete) return;

    await supabase
      .from("daily_logs")
      .delete()
      .eq("id", log.id);

    loadData();

  }

  function handleEdit(log: DailyLog) {

    setEditingLog(log);
    setActiveTab("registro");

  }

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

        <div className="rdo-tabs">

          <button
            className={activeTab === "registro" ? "active" : ""}
            onClick={() => setActiveTab("registro")}
          >
            Novo Registro
          </button>

          <button
            className={activeTab === "historico" ? "active" : ""}
            onClick={() => setActiveTab("historico")}
          >
            Histórico ({logs.length})
          </button>

        </div>

        {activeTab === "registro" && (

          <RegistroWizard
            project={{
              id: project.id,
              nome: project.name,
              cliente: project.client_name ?? "",
              endereco: project.address ?? ""
            }}
            editingLog={editingLog}
            onSaved={() => {
              setEditingLog(null);
              loadData();
            }}
          />

        )}

        {activeTab === "historico" && (

          <div style={{marginTop:20}}>

            {logs.map((log) => (

              <div
                key={log.id}
                style={{
                  border:"1px solid #ddd",
                  borderRadius:10,
                  padding:16,
                  marginBottom:12,
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"center"
                }}
              >

                <div>

                  <strong>
                    {formatRdoNumber(log.register_number)}
                  </strong>

                  {" • "}

                  {formatDateBR(log.log_date)}

                </div>

                <div ref={menuRef} style={{position:"relative"}}>

                  <button
                    onClick={() =>
                      setOpenMenuId(openMenuId === log.id ? null : log.id)
                    }
                  >
                    ⋮
                  </button>

                  {openMenuId === log.id && (

                    <div
                      style={{
                        position:"absolute",
                        right:0,
                        top:30,
                        background:"#fff",
                        border:"1px solid #ddd",
                        borderRadius:8,
                        padding:10,
                        display:"flex",
                        flexDirection:"column",
                        gap:8
                      }}
                    >

                      <button onClick={() => handleEdit(log)}>
                        Editar
                      </button>

                      <button onClick={() => handleGeneratePdf(log)}>
                        Gerar PDF
                      </button>

                      <button onClick={() => handleShareLog(log)}>
                        Compartilhar
                      </button>

                      <button onClick={() => handleDelete(log)}>
                        Excluir
                      </button>

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