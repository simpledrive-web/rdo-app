import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import StepIndicator from "./StepIndicator";

type Props = {
  project: {
    id: string;
    nome: string;
    cliente: string;
    endereco: string;
  };
  editingLog?: any;
  onSaved: () => void;
};

export default function RegistroWizard({ project, editingLog, onSaved }: Props) {

  const [step, setStep] = useState(1);

  const [logDate, setLogDate] = useState("");
  const [weatherMorning, setWeatherMorning] = useState("");
  const [weatherAfternoon, setWeatherAfternoon] = useState("");
  const [summary, setSummary] = useState("");
  const [issues, setIssues] = useState("");
  const [responsibleName, setResponsibleName] = useState("");

  const [saving, setSaving] = useState(false);

  // carregar dados quando editar
  useEffect(() => {

    if (!editingLog) return;

    setLogDate(editingLog.log_date ?? "");
    setWeatherMorning(editingLog.weather_morning ?? "");
    setWeatherAfternoon(editingLog.weather_afternoon ?? "");
    setSummary(editingLog.summary ?? "");
    setIssues(editingLog.issues ?? "");
    setResponsibleName(editingLog.responsible_name ?? "");

  }, [editingLog]);

  async function handleSave() {

    setSaving(true);

    if (editingLog) {

      await supabase
        .from("daily_logs")
        .update({
          log_date: logDate,
          weather_morning: weatherMorning,
          weather_afternoon: weatherAfternoon,
          summary: summary,
          issues: issues,
          responsible_name: responsibleName
        })
        .eq("id", editingLog.id);

    } else {

      const { data: last } = await supabase
        .from("daily_logs")
        .select("register_number")
        .eq("project_id", project.id)
        .order("register_number", { ascending: false })
        .limit(1);

      const nextNumber = (last?.[0]?.register_number ?? 0) + 1;

      await supabase
        .from("daily_logs")
        .insert({
          project_id: project.id,
          register_number: nextNumber,
          log_date: logDate,
          weather_morning: weatherMorning,
          weather_afternoon: weatherAfternoon,
          summary: summary,
          issues: issues,
          responsible_name: responsibleName
        });

    }

    setSaving(false);

    onSaved();

  }

  return (

    <div className="rdo-card">

      <StepIndicator step={step} />

      {step === 1 && (

        <div className="rdo-form">

          <h3>Etapa 1 de 5</h3>

          <div className="grid-3">

            <div>

              <label>Data</label>

              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />

            </div>

            <div>

              <label>Clima manhã</label>

              <select
                value={weatherMorning}
                onChange={(e) => setWeatherMorning(e.target.value)}
              >
                <option value="">Selecione</option>
                <option value="Sol">Sol</option>
                <option value="Nublado">Nublado</option>
                <option value="Chuvoso">Chuvoso</option>
              </select>

            </div>

            <div>

              <label>Clima tarde</label>

              <select
                value={weatherAfternoon}
                onChange={(e) => setWeatherAfternoon(e.target.value)}
              >
                <option value="">Selecione</option>
                <option value="Sol">Sol</option>
                <option value="Nublado">Nublado</option>
                <option value="Chuvoso">Chuvoso</option>
              </select>

            </div>

          </div>

          <label>Resumo do que foi feito no dia</label>

          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />

          <label>Ocorrências / problemas</label>

          <textarea
            value={issues}
            onChange={(e) => setIssues(e.target.value)}
          />

          <label>Responsável</label>

          <input
            value={responsibleName}
            onChange={(e) => setResponsibleName(e.target.value)}
          />

          <div style={{ marginTop: 20 }}>

            <button onClick={() => setStep(2)}>
              Próximo
            </button>

          </div>

        </div>

      )}

      {step > 1 && (

        <div style={{ marginTop: 20 }}>

          <button onClick={() => setStep(step - 1)}>
            Voltar
          </button>

        </div>

      )}

      {step === 5 && (

        <div style={{ marginTop: 20 }}>

          <button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Finalizar Registro"}
          </button>

        </div>

      )}

    </div>

  );

}