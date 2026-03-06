import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import RegistroWizard from "../components/RegistroWizard"
import { supabase } from "../supabase/client"

type Project = {
  id: string
  name: string
  client_name: string | null
  address: string | null
}

type DailyLog = {
  id: string
  log_date: string
  weather: string | null
  summary: string | null
}

export default function ObraDetalhePage() {

  const { id } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {

    if (!id) return

    setLoading(true)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      navigate("/login")
      return
    }

    // Carregar obra
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("id, name, client_name, address, user_id")
      .eq("id", id)
      .single()

    if (projectError) {
      alert("Erro ao carregar obra")
      navigate("/obras")
      return
    }

    // Segurança extra
    if (projectData.user_id !== user.id) {
      alert("Acesso não permitido")
      navigate("/obras")
      return
    }

    setProject(projectData)

    // Carregar registros
    const { data: logsData } = await supabase
      .from("daily_logs")
      .select("id, log_date, weather, summary")
      .eq("project_id", id)
      .order("log_date", { ascending: false })

    setLogs(logsData ?? [])

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [id])

  function handleBack() {
    navigate("/obras")
  }

  if (loading) {
    return (
      <div className="rdo-page">
        <div className="rdo-container">
          <div className="rdo-card rdo-section">
            Carregando obra...
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <div className="rdo-page">

      <div className="rdo-container">

        {/* Header */}

        <div className="rdo-header">

          <div>
            <h1 className="rdo-title">{project.name}</h1>

            <p className="rdo-subtitle">
              {project.client_name && <>Cliente: {project.client_name} • </>}
              {project.address}
            </p>
          </div>

          <button
            className="rdo-btn rdo-btn-secondary"
            onClick={handleBack}
          >
            Voltar para Obras
          </button>

        </div>

        {/* Histórico */}

        <div className="rdo-card rdo-section rdo-top-gap">

          <div className="rdo-section-header">

            <h2>Histórico da Obra</h2>

            <div className="rdo-badge">
              {logs.length} registro(s)
            </div>

          </div>

          {logs.length === 0 && (
            <p className="rdo-empty-state">
              Nenhum registro diário cadastrado.
            </p>
          )}

          {logs.map((log) => (

            <div key={log.id} className="rdo-log-item">

              <div className="rdo-log-date">
                {new Date(log.log_date).toLocaleDateString("pt-BR")}
              </div>

              <div className="rdo-log-content">

                {log.weather && (
                  <div className="rdo-log-weather">
                    Clima: {log.weather}
                  </div>
                )}

                {log.summary && (
                  <div className="rdo-log-summary">
                    {log.summary}
                  </div>
                )}

              </div>

            </div>

          ))}

        </div>

        {/* Wizard */}

        <div className="rdo-top-gap">

          <RegistroWizard
            project={{
              id: project.id,
              nome: project.name,
              cliente: project.client_name ?? "",
              endereco: project.address ?? ""
            }}
            onSaved={loadData}
          />

        </div>

      </div>

    </div>
  )
}