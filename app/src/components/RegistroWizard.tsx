import { useMemo, useState, type ChangeEvent } from "react";
import { supabase } from "../supabase/client";
import StepIndicator from "./StepIndicator";

type Funcionario = {
  nome: string;
  funcao: string;
  horas: string;
};

type NotaFiscal = {
  numero: string;
  descricao: string;
  arquivo: File | null;
};

type Servico = {
  descricao: string;
  status: string;
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

const NF_BUCKET = "nota-fiscais";
const NF_TABLE = "invoice_files";
const NF_ACCEPT =
  ".jpg,.jpeg,.png,.pdf,.txt,.doc,.doc,.docx,application/pdf,image/jpeg,image/png,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function RegistroWizard({
  project,
  onSaved,
}: RegistroWizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState("");
  const [clima, setClima] = useState("");
  const [resumo, setResumo] = useState("");
  const [ocorrencias, setOcorrencias] = useState("");

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([
    { nome: "", funcao: "", horas: "" },
  ]);

  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([
    { numero: "", descricao: "", arquivo: null },
  ]);

  const [servicos, setServicos] = useState<Servico[]>([
    { descricao: "", status: "" },
  ]);

  const [fotos, setFotos] = useState<File[]>([]);

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
    setFuncionarios((prev) => [...prev, { nome: "", funcao: "", horas: "" }]);
  }

  function removeFuncionario(index: number) {
    setFuncionarios((prev) => prev.filter((_, i) => i !== index));
  }

  function updateNotaFiscal(
    index: number,
    field: keyof Omit<NotaFiscal, "arquivo">,
    value: string
  ) {
    const updated = [...notasFiscais];
    updated[index][field] = value;
    setNotasFiscais(updated);
  }

  function updateNotaFiscalArquivo(index: number, file: File | null) {
    const updated = [...notasFiscais];
    updated[index].arquivo = file;
    setNotasFiscais(updated);
  }

  function addNotaFiscal() {
    setNotasFiscais((prev) => [
      ...prev,
      { numero: "", descricao: "", arquivo: null },
    ]);
  }

  function removeNotaFiscal(index: number) {
    setNotasFiscais((prev) => prev.filter((_, i) => i !== index));
  }

  function handleNotaFiscalFileChange(
    index: number,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null;
    updateNotaFiscalArquivo(index, file);
  }

  function updateServico(
    index: number,
    field: keyof Servico,
    value: string
  ) {
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

    setFotos((prev) => [...prev, ...Array.from(files)]);
  }

  function removePhoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  const photoUrls = useMemo(() => {
    return fotos.map((file) => URL.createObjectURL(file));
  }, [fotos]);

  function resetForm() {
    setStep(1);
    setData("");
    setClima("");
    setResumo("");
    setOcorrencias("");
    setFuncionarios([{ nome: "", funcao: "", horas: "" }]);
    setNotasFiscais([{ numero: "", descricao: "", arquivo: null }]);
    setServicos([{ descricao: "", status: "" }]);
    setFotos([]);
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

    const { data: dailyLog, error: dailyLogError } = await supabase
      .from("daily_logs")
      .insert({
        project_id: project.id,
        log_date: data,
        weather: clima.trim() || null,
        summary: resumo.trim() || null,
        issues: ocorrencias.trim() || null,
        next_steps: null,
        created_by: authData.user.id,
      })
      .select("id")
      .single();

    if (dailyLogError || !dailyLog) {
      throw new Error(dailyLogError?.message || "Erro ao salvar registro.");
    }

    const dailyLogId = dailyLog.id;

    const crewPayload = funcionarios
      .filter((item) => item.nome.trim())
      .map((item) => ({
        daily_log_id: dailyLogId,
        name: item.nome.trim(),
        role: item.funcao.trim() || null,
        hours: item.horas.trim() ? Number(item.horas) : null,
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

    if (serviceSummary) {
      const { error } = await supabase
        .from("daily_logs")
        .update({
          next_steps: serviceSummary,
        })
        .eq("id", dailyLogId);

      if (error) {
        throw new Error(`Erro ao salvar serviços: ${error.message}`);
      }
    }

    const notasValidas = notasFiscais.filter(
      (item) =>
        item.numero.trim() || item.descricao.trim() || item.arquivo !== null
    );

    for (const nf of notasValidas) {
      if (!nf.arquivo) {
        throw new Error(
          `Selecione o arquivo da NF "${nf.numero || nf.descricao || "sem identificação"}".`
        );
      }

      const ext = nf.arquivo.name.split(".").pop()?.toLowerCase() || "file";
      const safeNumber = (nf.numero || "sem-numero")
        .trim()
        .replace(/[^\w\-]+/g, "_");
      const fileName = `${project.id}/${dailyLogId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}-${safeNumber}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(NF_BUCKET)
        .upload(fileName, nf.arquivo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro no upload da NF: ${uploadError.message}`);
      }

      const { error: nfInsertError } = await supabase.from(NF_TABLE).insert({
        project_id: project.id,
        daily_log_id: dailyLogId,
        invoice_number: nf.numero.trim() || null,
        description: nf.descricao.trim() || null,
        original_file_name: nf.arquivo.name,
        storage_path: fileName,
        mime_type: nf.arquivo.type || null,
        file_size: nf.arquivo.size,
        uploaded_by: authData.user.id,
      });

      if (nfInsertError) {
        throw new Error(`Erro ao salvar nota fiscal: ${nfInsertError.message}`);
      }
    }

    for (const foto of fotos) {
      const ext = foto.name.split(".").pop();
      const fileName = `${dailyLogId}/${Date.now()}-${Math.random()
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
        caption: null,
        taken_at: new Date().toISOString(),
      });

      if (photoInsertError) {
        throw new Error(`Erro ao salvar foto: ${photoInsertError.message}`);
      }
    }

    return dailyLogId;
  }

  function buildPrintableHtml() {
    const funcionariosHtml = funcionarios
      .filter((f) => f.nome.trim())
      .map(
        (f) =>
          `<li><strong>${f.nome}</strong> - ${f.funcao || "-"} - ${f.horas || "-"}h</li>`
      )
      .join("");

    const notasFiscaisHtml = notasFiscais
      .filter((nf) => nf.numero.trim() || nf.descricao.trim() || nf.arquivo)
      .map((nf) => {
        const partes = [
          nf.numero.trim() ? `<strong>Nº:</strong> ${nf.numero.trim()}` : "",
          nf.descricao.trim()
            ? `<strong>Descrição:</strong> ${nf.descricao.trim()}`
            : "",
          nf.arquivo ? `<strong>Arquivo:</strong> ${nf.arquivo.name}` : "",
        ].filter(Boolean);

        return `<li>${partes.join(" | ")}</li>`;
      })
      .join("");

    const servicosHtml = servicos
      .filter((s) => s.descricao.trim())
      .map(
        (s) =>
          `<li><strong>${s.descricao}</strong>${s.status ? ` - ${s.status}` : ""}</li>`
      )
      .join("");

    const fotosHtml = photoUrls
      .map(
        (url) =>
          `<div style="break-inside: avoid; margin-bottom: 12px;">
            <img src="${url}" style="width: 100%; max-width: 320px; border-radius: 10px; border: 1px solid #ddd;" />
          </div>`
      )
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
            <p><strong>Clima:</strong> ${clima || "-"}</p>
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
            <h3>NF's</h3>
            <ul>${notasFiscaisHtml || "<li>Nenhuma</li>"}</ul>
          </div>

          <div class="box">
            <h3>Serviços</h3>
            <ul>${servicosHtml || "<li>Nenhum</li>"}</ul>
          </div>

          <div class="box">
            <h3>Fotos</h3>
            ${fotosHtml || "<p>Nenhuma foto adicionada.</p>"}
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
          <div className="rdo-form-grid-2">
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
              <label className="rdo-label">Clima</label>
              <input
                className="rdo-input"
                placeholder="Ex: Sol, Nublado, Chuva"
                value={clima}
                onChange={(e) => setClima(e.target.value)}
              />
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
                <div className="rdo-repeat-fields-3">
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

                  <div className="rdo-field">
                    <label className="rdo-label">Horas</label>
                    <input
                      className="rdo-input"
                      value={funcionario.horas}
                      onChange={(e) =>
                        updateFuncionario(index, "horas", e.target.value)
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
              onClick={addNotaFiscal}
            >
              + Adicionar NF
            </button>
          </div>

          <div className="rdo-repeat-list">
            {notasFiscais.map((nf, index) => (
              <div className="rdo-repeat-item" key={index}>
                <div className="rdo-form-grid">
                  <div className="rdo-repeat-fields-2">
                    <div className="rdo-field">
                      <label className="rdo-label">Número da NF</label>
                      <input
                        className="rdo-input"
                        value={nf.numero}
                        onChange={(e) =>
                          updateNotaFiscal(index, "numero", e.target.value)
                        }
                      />
                    </div>

                    <div className="rdo-field">
                      <label className="rdo-label">Descrição</label>
                      <input
                        className="rdo-input"
                        placeholder="Ex: Compra de cimento, areia, ferragem..."
                        value={nf.descricao}
                        onChange={(e) =>
                          updateNotaFiscal(index, "descricao", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="rdo-field">
                    <label className="rdo-label">Arquivo da NF</label>
                    <input
                      className="rdo-input"
                      type="file"
                      accept={NF_ACCEPT}
                      onChange={(e) => handleNotaFiscalFileChange(index, e)}
                    />
                    <p className="rdo-form-subtitle" style={{ marginTop: 8 }}>
                      Formatos aceitos: JPG, JPEG, PNG, PDF, TXT, DOC e DOCX.
                    </p>

                    {nf.arquivo && (
                      <p className="rdo-form-subtitle" style={{ marginTop: 8 }}>
                        Arquivo selecionado: <strong>{nf.arquivo.name}</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="rdo-repeat-actions">
                  <button
                    type="button"
                    className="rdo-btn rdo-btn-danger rdo-remove-btn"
                    onClick={() => removeNotaFiscal(index)}
                    disabled={notasFiscais.length === 1}
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
                      <option value="Não iniciado">Não iniciado</option>
                      <option value="Em andamento">Em andamento</option>
                      <option value="Concluído">Concluído</option>
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

      {step === 5 && (
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
              Adicione as imagens do andamento da obra. Essa será a última etapa.
            </p>
          </div>

          <div className="rdo-photo-grid">
            {fotos.length === 0 && (
              <p className="rdo-empty-state">Nenhuma foto adicionada ainda.</p>
            )}

            {photoUrls.map((url, index) => (
              <div className="rdo-photo-item" key={index}>
                <img src={url} alt={`Foto ${index + 1}`} />
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