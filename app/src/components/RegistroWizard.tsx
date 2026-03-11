import { useMemo, useState, type ChangeEvent } from "react";
import { supabase } from "../supabase/client";
import StepIndicator from "./StepIndicator";

type Funcionario = {
  nome: string;
  funcao: string;
};

type Servico = {
  descricao: string;
  status: string;
};

type FotoItem = {
  arquivo: File;
  legenda: string;
};

type NFItem = {
  estabelecimento: string;
  numero: string;
  descricao: string;
  arquivo: File | null;
};

type ProjectInfo = {
  id: string;
  nome: string;
  cliente: string;
  endereco: string;
};

type RegistroWizardProps = {
  project: ProjectInfo;
  onSaved?: () => Promise<void> | void;
};

const STATUS_SERVICO = [
  "Não iniciado",
  "Iniciado",
  "Em andamento",
  "Paralisado",
  "Concluído",
];

const OPCOES_CLIMA = ["Sol", "Nublado", "Chuvoso"];

function extractInvoiceNumberFromFileName(fileName: string) {
  const cleaned = fileName.replace(/\.[^/.]+$/, "");
  const patterns = [
    /(?:nf|nfe|nota)[^\d]{0,5}(\d{3,})/i,
    /\b(\d{4,})\b/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

export default function RegistroWizard({
  project,
  onSaved,
}: RegistroWizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState("");
  const [climaManha, setClimaManha] = useState("");
  const [climaTarde, setClimaTarde] = useState("");
  const [resumo, setResumo] = useState("");
  const [ocorrencias, setOcorrencias] = useState("");

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([
    { nome: "", funcao: "" },
  ]);

  const [servicos, setServicos] = useState<Servico[]>([
    { descricao: "", status: "" },
  ]);

  const [fotos, setFotos] = useState<FotoItem[]>([]);

  const [nfs, setNfs] = useState<NFItem[]>([
    { estabelecimento: "", numero: "", descricao: "", arquivo: null },
  ]);

  function nextStep() {
    if (step < 5) setStep((prev) => prev + 1);
  }

  function prevStep() {
    if (step > 1) setStep((prev) => prev - 1);
  }

  function updateFuncionario(
    index: number,
    field: keyof Funcionario,
    value: string
  ) {
    const updated = [...funcionarios];
    updated[index][field] = value;
    setFuncionarios(updated);
  }

  function addFuncionario() {
    setFuncionarios((prev) => [...prev, { nome: "", funcao: "" }]);
  }

  function removeFuncionario(index: number) {
    setFuncionarios((prev) => prev.filter((_, i) => i !== index));
  }

  function updateServico(index: number, field: keyof Servico, value: string) {
    const updated = [...servicos];
    updated[index][field] = value;
    setServicos(updated);
  }

  function addServico() {
    setServicos((prev) => [...prev, { descricao: "", status: "" }]);
  }

  function removeServico(index: number) {
    setServicos((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;

    const novosItens: FotoItem[] = Array.from(files).map((file) => ({
      arquivo: file,
      legenda: "",
    }));

    setFotos((prev) => [...prev, ...novosItens]);
  }

  function updatePhotoCaption(index: number, legenda: string) {
    setFotos((prev) =>
      prev.map((item, i) => (i === index ? { ...item, legenda } : item))
    );
  }

  function removePhoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  function updateNF(index: number, field: keyof NFItem, value: string | File | null) {
    const updated = [...nfs];

    if (field === "arquivo") {
      const file = value as File | null;
      updated[index].arquivo = file;

      if (file && !updated[index].numero.trim()) {
        const detectedNumber = extractInvoiceNumberFromFileName(file.name);
        if (detectedNumber) {
          updated[index].numero = detectedNumber;
        }
      }
    } else {
      (updated[index][field] as string) = value as string;
    }

    setNfs(updated);
  }

  function addNF() {
    setNfs((prev) => [
      ...prev,
      { estabelecimento: "", numero: "", descricao: "", arquivo: null },
    ]);
  }

  function removeNF(index: number) {
    setNfs((prev) => prev.filter((_, i) => i !== index));
  }

  const photoUrls = useMemo(() => {
    return fotos.map((item) => URL.createObjectURL(item.arquivo));
  }, [fotos]);

  function resetForm() {
    setStep(1);
    setData("");
    setClimaManha("");
    setClimaTarde("");
    setResumo("");
    setOcorrencias("");
    setFuncionarios([{ nome: "", funcao: "" }]);
    setServicos([{ descricao: "", status: "" }]);
    setFotos([]);
    setNfs([{ estabelecimento: "", numero: "", descricao: "", arquivo: null }]);
  }

  async function persistRegistro() {
    if (!project.id) {
      throw new Error("Obra inválida.");
    }

    if (!data) {
      throw new Error("Preencha a data antes de finalizar.");
    }

    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      throw new Error("Usuário não autenticado.");
    }

    const { data: existingDailyLog, error: existingDailyLogError } =
      await supabase
        .from("daily_logs")
        .select("id")
        .eq("project_id", project.id)
        .eq("log_date", data)
        .maybeSingle();

    if (existingDailyLogError) {
      throw new Error(
        existingDailyLogError.message ||
          "Erro ao verificar registro existente."
      );
    }

    let dailyLogId = existingDailyLog?.id;

    if (!dailyLogId) {
      const { data: newDailyLog, error: dailyLogError } = await supabase
        .from("daily_logs")
        .insert({
          project_id: project.id,
          log_date: data,
          weather: null,
          weather_morning: climaManha || null,
          weather_afternoon: climaTarde || null,
          summary: resumo.trim() || null,
          issues: ocorrencias.trim() || null,
          next_steps: null,
          created_by: authData.user.id,
        })
        .select("id")
        .single();

      if (dailyLogError || !newDailyLog) {
        throw new Error(dailyLogError?.message || "Erro ao salvar registro.");
      }

      dailyLogId = newDailyLog.id;
    } else {
      const { error: updateDailyLogError } = await supabase
        .from("daily_logs")
        .update({
          weather: null,
          weather_morning: climaManha || null,
          weather_afternoon: climaTarde || null,
          summary: resumo.trim() || null,
          issues: ocorrencias.trim() || null,
        })
        .eq("id", dailyLogId);

      if (updateDailyLogError) {
        throw new Error(
          updateDailyLogError.message ||
            "Erro ao atualizar registro existente."
        );
      }
    }

    await supabase.from("crew_entries").delete().eq("daily_log_id", dailyLogId);

    const crewPayload = funcionarios
      .filter((item) => item.nome.trim())
      .map((item) => ({
        daily_log_id: dailyLogId,
        name: item.nome.trim(),
        role: item.funcao.trim() || null,
        hours: null,
      }));

    if (crewPayload.length > 0) {
      const { error } = await supabase.from("crew_entries").insert(crewPayload);
      if (error) {
        throw new Error(`Erro ao salvar funcionários: ${error.message}`);
      }
    }

    const serviceSummary = servicos
      .filter((item) => item.descricao.trim())
      .map((item) => {
        const descricao = item.descricao.trim();
        const status = item.status.trim();
        return status ? `${descricao} (${status})` : descricao;
      })
      .join(" | ");

    const { error: updateServiceError } = await supabase
      .from("daily_logs")
      .update({
        next_steps: serviceSummary || null,
      })
      .eq("id", dailyLogId);

    if (updateServiceError) {
      throw new Error(`Erro ao salvar serviços: ${updateServiceError.message}`);
    }

    for (const fotoItem of fotos) {
      const foto = fotoItem.arquivo;
      const ext = foto.name.split(".").pop();
      const fileName = `${dailyLogId}/fotos/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(fileName, foto, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro no upload da foto: ${uploadError.message}`);
      }

      const { error: photoInsertError } = await supabase.from("photos").insert({
        daily_log_id: dailyLogId,
        storage_path: fileName,
        caption: fotoItem.legenda.trim() || null,
        taken_at: new Date().toISOString(),
      });

      if (photoInsertError) {
        throw new Error(`Erro ao salvar foto: ${photoInsertError.message}`);
      }
    }

    for (const nf of nfs) {
      if (!nf.arquivo) continue;

      const ext = nf.arquivo.name.split(".").pop();
      const fileName = `${dailyLogId}/nfs/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("nota-fiscais")
        .upload(fileName, nf.arquivo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro no upload da NF: ${uploadError.message}`);
      }

      const { error: nfInsertError } = await supabase.from("invoice_files").insert({
        project_id: project.id,
        daily_log_id: dailyLogId,
        establishment_name: nf.estabelecimento.trim() || null,
        invoice_number: nf.numero.trim() || null,
        description: nf.descricao.trim() || null,
        original_file_name: nf.arquivo.name,
        storage_path: fileName,
        mime_type: nf.arquivo.type || null,
        file_size: nf.arquivo.size,
        uploaded_by: authData.user.id,
      });

      if (nfInsertError) {
        throw new Error(`Erro ao salvar NF: ${nfInsertError.message}`);
      }
    }

    return dailyLogId;
  }

  function buildPrintableHtml() {
    const funcionariosHtml = funcionarios
      .filter((f) => f.nome.trim())
      .map((f) => `<li><strong>${f.nome}</strong> - ${f.funcao || "-"}</li>`)
      .join("");

    const servicosHtml = servicos
      .filter((s) => s.descricao.trim())
      .map(
        (s) =>
          `<li><strong>${s.descricao}</strong>${
            s.status ? ` - ${s.status}` : ""
          }</li>`
      )
      .join("");

    const nfsHtml = nfs
      .filter(
        (n) =>
          n.estabelecimento.trim() ||
          n.numero.trim() ||
          n.descricao.trim() ||
          n.arquivo
      )
      .map(
        (n) =>
          `<li>
            <strong>Estabelecimento:</strong> ${n.estabelecimento || "-"}<br />
            <strong>Número da NF:</strong> ${n.numero || "-"}<br />
            <strong>Descrição:</strong> ${n.descricao || "-"}<br />
            <strong>Arquivo:</strong> ${n.arquivo?.name || "-"}
          </li>`
      )
      .join("");

    const fotosHtml = fotos
      .map((item, index) => {
        const url = photoUrls[index];
        return `<div style="break-inside: avoid; margin-bottom: 16px;">
            <img src="${url}" style="width: 100%; max-width: 320px; border-radius: 10px; border: 1px solid #ddd;" />
            <p style="margin-top: 8px;"><strong>Legenda:</strong> ${
              item.legenda || "-"
            }</p>
          </div>`;
      })
      .join("");

    return `
      <html>
        <head>
          <title>RDO - ${project.nome}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #111827;
            }
            h1, h2, h3 {
              margin-bottom: 8px;
            }
            .box {
              border: 1px solid #ddd;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 18px;
            }
            ul {
              padding-left: 18px;
            }
          </style>
        </head>
        <body>
          <h1>Registro Diário de Obra</h1>

          <div class="box">
            <h2>${project.nome}</h2>
            <p><strong>Cliente:</strong> ${project.cliente || "-"}</p>
            <p><strong>Endereço:</strong> ${project.endereco || "-"}</p>
            <p><strong>Data:</strong> ${data || "-"}</p>
            <p><strong>Clima manhã:</strong> ${climaManha || "-"}</p>
            <p><strong>Clima tarde:</strong> ${climaTarde || "-"}</p>
          </div>

          <div class="box">
            <h3>Resumo do dia</h3>
            <p>${resumo || "-"}</p>
          </div>

          <div class="box">
            <h3>Ocorrências</h3>
            <p>${ocorrencias || "-"}</p>
          </div>

          <div class="box">
            <h3>Funcionários</h3>
            <ul>${funcionariosHtml || "<li>Nenhum</li>"}</ul>
          </div>

          <div class="box">
            <h3>Serviços</h3>
            <ul>${servicosHtml || "<li>Nenhum</li>"}</ul>
          </div>

          <div class="box">
            <h3>Fotos</h3>
            ${fotosHtml || "<p>Nenhuma foto adicionada.</p>"}
          </div>

          <div class="box">
            <h3>NF's</h3>
            <ul>${nfsHtml || "<li>Nenhuma</li>"}</ul>
          </div>
        </body>
      </html>
    `;
  }

  async function handleFinish() {
    try {
      setSaving(true);
      await persistRegistro();
      alert("Registro finalizado com sucesso.");
      resetForm();
      await onSaved?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao finalizar.");
    } finally {
      setSaving(false);
    }
  }

  function handleGeneratePdf() {
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Não foi possível abrir a janela de impressão.");
        return;
      }

      printWindow.document.write(buildPrintableHtml());
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao gerar PDF.");
    }
  }

  return (
    <div className="rdo-card rdo-section">
      <StepIndicator currentStep={step} />

      <h2 className="rdo-form-title">Etapa {step} de 5</h2>
      <p className="rdo-form-subtitle">
        Preencha as informações do registro diário da obra.
      </p>

      {step === 1 && (
        <div className="rdo-form-grid">
          <div className="rdo-form-grid-3">
            <div className="rdo-field">
              <label className="rdo-label">Data</label>
              <input
                className="rdo-input"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>

            <div className="rdo-field">
              <label className="rdo-label">Clima (manhã)</label>
              <select
                className="rdo-select"
                value={climaManha}
                onChange={(e) => setClimaManha(e.target.value)}
              >
                <option value="">Selecione</option>
                {OPCOES_CLIMA.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </div>

            <div className="rdo-field">
              <label className="rdo-label">Clima (tarde)</label>
              <select
                className="rdo-select"
                value={climaTarde}
                onChange={(e) => setClimaTarde(e.target.value)}
              >
                <option value="">Selecione</option>
                {OPCOES_CLIMA.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rdo-field">
            <label className="rdo-label">Resumo do que foi feito no dia</label>
            <textarea
              className="rdo-textarea"
              placeholder="Descreva o andamento da obra"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
            />
          </div>

          <div className="rdo-field">
            <label className="rdo-label">Ocorrências / problemas</label>
            <textarea
              className="rdo-textarea"
              placeholder="Informe intercorrências, atrasos, falta de material..."
              value={ocorrencias}
              onChange={(e) => setOcorrencias(e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          <div className="rdo-add-row">
            <button
              type="button"
              className="rdo-btn rdo-btn-secondary"
              onClick={addFuncionario}
            >
              + Adicionar funcionário
            </button>
          </div>

          <div className="rdo-repeat-list">
            {funcionarios.map((funcionario, index) => (
              <div className="rdo-repeat-item" key={index}>
                <div className="rdo-repeat-fields-2">
                  <div className="rdo-field">
                    <label className="rdo-label">Nome</label>
                    <input
                      className="rdo-input"
                      value={funcionario.nome}
                      onChange={(e) =>
                        updateFuncionario(index, "nome", e.target.value)
                      }
                    />
                  </div>

                  <div className="rdo-field">
                    <label className="rdo-label">Função</label>
                    <input
                      className="rdo-input"
                      value={funcionario.funcao}
                      onChange={(e) =>
                        updateFuncionario(index, "funcao", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="rdo-repeat-actions">
                  <button
                    type="button"
                    className="rdo-btn rdo-btn-danger rdo-remove-btn"
                    onClick={() => removeFuncionario(index)}
                    disabled={funcionarios.length === 1}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="rdo-add-row">
            <button
              type="button"
              className="rdo-btn rdo-btn-secondary"
              onClick={addServico}
            >
              + Adicionar serviço
            </button>
          </div>

          <div className="rdo-repeat-list">
            {servicos.map((servico, index) => (
              <div className="rdo-repeat-item" key={index}>
                <div className="rdo-repeat-fields-2">
                  <div className="rdo-field">
                    <label className="rdo-label">Descrição do serviço</label>
                    <input
                      className="rdo-input"
                      value={servico.descricao}
                      onChange={(e) =>
                        updateServico(index, "descricao", e.target.value)
                      }
                    />
                  </div>

                  <div className="rdo-field">
                    <label className="rdo-label">Status</label>
                    <select
                      className="rdo-select"
                      value={servico.status}
                      onChange={(e) =>
                        updateServico(index, "status", e.target.value)
                      }
                    >
                      <option value="">Selecione</option>
                      {STATUS_SERVICO.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rdo-repeat-actions">
                  <button
                    type="button"
                    className="rdo-btn rdo-btn-danger rdo-remove-btn"
                    onClick={() => removeServico(index)}
                    disabled={servicos.length === 1}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div className="rdo-photo-upload-box">
            <div className="rdo-field">
              <label className="rdo-label">Adicionar fotos</label>
              <input
                className="rdo-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotosChange}
              />
            </div>

            <p className="rdo-form-subtitle" style={{ marginBottom: 0 }}>
              Adicione as imagens do andamento da obra e escreva uma legenda para
              cada foto.
            </p>
          </div>

          <div className="rdo-photo-grid">
            {fotos.length === 0 && (
              <p className="rdo-empty-state">Nenhuma foto adicionada ainda.</p>
            )}

            {photoUrls.map((url, index) => (
              <div className="rdo-photo-item" key={index}>
                <img src={url} alt={`Foto ${index + 1}`} />

                <div style={{ padding: 12 }}>
                  <div className="rdo-field">
                    <label className="rdo-label">Legenda</label>
                    <textarea
                      className="rdo-textarea"
                      placeholder="Descreva a foto"
                      value={fotos[index].legenda}
                      onChange={(e) =>
                        updatePhotoCaption(index, e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="rdo-photo-item-footer">
                  <button
                    type="button"
                    className="rdo-btn rdo-btn-danger"
                    onClick={() => removePhoto(index)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <div className="rdo-add-row">
            <button
              type="button"
              className="rdo-btn rdo-btn-secondary"
              onClick={addNF}
            >
              + Adicionar NF
            </button>
          </div>

          <div className="rdo-repeat-list">
            {nfs.map((nf, index) => (
              <div className="rdo-repeat-item" key={index}>
                <div className="rdo-form-grid">
                  <div className="rdo-repeat-fields-2">
                    <div className="rdo-field">
                      <label className="rdo-label">Nome do estabelecimento</label>
                      <input
                        className="rdo-input"
                        value={nf.estabelecimento}
                        onChange={(e) =>
                          updateNF(index, "estabelecimento", e.target.value)
                        }
                      />
                    </div>

                    <div className="rdo-field">
                      <label className="rdo-label">Número da NF</label>
                      <input
                        className="rdo-input"
                        value={nf.numero}
                        onChange={(e) =>
                          updateNF(index, "numero", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="rdo-field">
                    <label className="rdo-label">Descrição</label>
                    <textarea
                      className="rdo-textarea"
                      placeholder="Descreva a NF"
                      value={nf.descricao}
                      onChange={(e) =>
                        updateNF(index, "descricao", e.target.value)
                      }
                    />
                  </div>

                  <div className="rdo-field">
                    <label className="rdo-label">Arquivo da NF</label>
                    <input
                      className="rdo-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,.txt,.doc,.docx"
                      onChange={(e) =>
                        updateNF(index, "arquivo", e.target.files?.[0] ?? null)
                      }
                    />
                  </div>

                  {nf.arquivo && (
                    <p className="rdo-form-subtitle" style={{ marginBottom: 0 }}>
                      Arquivo selecionado: <strong>{nf.arquivo.name}</strong>
                    </p>
                  )}
                </div>

                <div className="rdo-repeat-actions">
                  <button
                    type="button"
                    className="rdo-btn rdo-btn-danger rdo-remove-btn"
                    onClick={() => removeNF(index)}
                    disabled={nfs.length === 1}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="rdo-actions">
        <div className="rdo-actions-left">
          {step > 1 && (
            <button
              type="button"
              className="rdo-btn rdo-btn-secondary"
              onClick={prevStep}
              disabled={saving}
            >
              Voltar
            </button>
          )}
        </div>

        <div className="rdo-actions-right">
          {step < 5 && (
            <button
              type="button"
              className="rdo-btn rdo-btn-primary"
              onClick={nextStep}
              disabled={saving}
            >
              Próximo
            </button>
          )}

          {step === 5 && (
            <>
              <button
                type="button"
                className="rdo-btn rdo-btn-secondary"
                onClick={handleGeneratePdf}
                disabled={saving}
              >
                Gerar PDF
              </button>

              <button
                type="button"
                className="rdo-btn rdo-btn-primary"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Finalizar"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}