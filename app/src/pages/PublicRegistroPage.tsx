import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase/client";

export default function PublicRegistroPage() {

  const { logId } = useParams()

  const [loading, setLoading] = useState(true)
  const [log, setLog] = useState<any>(null)
  const [project, setProject] = useState<any>(null)

  async function loadData(){

    if(!logId) return

    const { data: logData } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("id", logId)
      .single()

    if(!logData){
      setLoading(false)
      return
    }

    setLog(logData)

    const { data: projectData } = await supabase
      .from("projects")
      .select("*")
      .eq("id", logData.project_id)
      .single()

    setProject(projectData)

    setLoading(false)
  }

  useEffect(()=>{
    loadData()
  },[logId])

  if(loading){
    return (
      <div className="rdo-page">
        <div className="rdo-container">
          <div className="rdo-card rdo-section">
            Carregando registro...
          </div>
        </div>
      </div>
    )
  }

  if(!log){
    return (
      <div className="rdo-page">
        <div className="rdo-container">
          <div className="rdo-card rdo-section">
            Registro não encontrado
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rdo-page">

      <div className="rdo-container">

        <div className="rdo-card rdo-section">

          <h1 className="rdo-title">
            Registro verificado
          </h1>

          <p className="rdo-subtitle">
            Documento validado via QR Code
          </p>

          <div className="rdo-top-gap">

            <p>
              <strong>RDO nº:</strong> {log.register_number}
            </p>

            <p>
              <strong>Obra:</strong> {project?.name}
            </p>

            <p>
              <strong>Data:</strong>{" "}
              {new Date(log.log_date).toLocaleDateString("pt-BR")}
            </p>

            <p>
              <strong>Clima manhã:</strong> {log.weather_morning}
            </p>

            <p>
              <strong>Clima tarde:</strong> {log.weather_afternoon}
            </p>

            <p>
              <strong>Responsável:</strong> {log.responsible_name}
            </p>

            <p>
              <strong>Resumo:</strong> {log.summary}
            </p>

          </div>

        </div>

      </div>

    </div>
  )
}