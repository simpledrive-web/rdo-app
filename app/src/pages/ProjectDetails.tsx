import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabase/client";

type Project = {
  id: string;
  name: string;
  client_name: string | null;
  address: string | null;
};

type DailyLog = {
  id: string;
  log_date: string;
  weather: string | null;
  summary: string | null;
  issues: string | null;
  next_steps: string | null;
};

type Photo = {
  id: string;
  daily_log_id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string | null;
  public_url?: string;
};

type CrewEntry = {
  id: string;
  daily_log_id: string;
  name: string;
  role: string | null;
  hours: number | null;
};

type MaterialEntry = {
  id: string;
  daily_log_id: string;
  material: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
};

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [crewEntries, setCrewEntries] = useState<CrewEntry[]>([]);
  const [materialEntries, setMaterialEntries] = useState<MaterialEntry[]>([]);

  const [logDate, setLogDate] = useState("");
  const [weather, setWeather] = useState("");
  const [summary, setSummary] = useState("");
  const [issues, setIssues] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [openLogMenuId, setOpenLogMenuId] = useState<string | null>(null);

  const [selectedLogId, setSelectedLogId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");

  const [crewLogId, setCrewLogId] = useState("");
  const [crewName, setCrewName] = useState("");
  const [crewRole, setCrewRole] = useState("");
  const [crewHours, setCrewHours] = useState("");
  const [editingCrewId, setEditingCrewId] = useState<string | null>(null);
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);
  const [openCrewMenuId, setOpenCrewMenuId] = useState<string | null>(null);

  const [materialLogId, setMaterialLogId] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState("");
  const [materialUnit, setMaterialUnit] = useState("");
  const [materialNotes, setMaterialNotes] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [openMaterialMenuId, setOpenMaterialMenuId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const logsCount = useMemo(() => logs.length, [logs]);
  const crewCount = useMemo(() => crewEntries.length, [crewEntries]);
  const materialsCount = useMemo(() => materialEntries.length, [materialEntries]);

  const showMessage = (text: string, type: "success" | "error" = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const clearLogForm = () => {
    setLogDate("");
    setWeather("");
    setSummary("");
    setIssues("");
    setNextSteps("");
    setEditingLogId(null);
  };

  const clearCrewForm = () => {
    setCrewLogId("");
    setCrewName("");
    setCrewRole("");
    setCrewHours("");
    setEditingCrewId(null);
  };

  const clearMaterialForm = () => {
    setMaterialLogId("");
    setMaterialName("");
    setMaterialQuantity("");
    setMaterialUnit("");
    setMaterialNotes("");
    setEditingMaterialId(null);
  };

  const loadProjectData = async () => {
    if (!id) return;

    setLoading(true);
    setMessage("");

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("id, name, client_name, address")
      .eq("id", id)
      .single();

    if (projectError) {
      showMessage(`Erro ao carregar obra: ${projectError.message}`, "error");
      setLoading(false);
      return;
    }

    setProject(projectData);

    const { data: logsData, error: logsError } = await supabase
      .from("daily_logs")
      .select("id, log_date, weather, summary, issues, next_steps")
      .eq("project_id", id)
      .order("log_date", { ascending: false });

    if (logsError) {
      showMessage(`Erro ao carregar registros: ${logsError.message}`, "error");
      setLoading(false);
      return;
    }

    const logsList = logsData ?? [];
    setLogs(logsList);

    const logIds = logsList.map((log) => log.id);

    if (logIds.length > 0) {
      const { data: photosData, error: photosError } = await supabase
        .from("photos")
        .select("id, daily_log_id, storage_path, caption, taken_at")
        .in("daily_log_id", logIds)
        .order("created_at", { ascending: false });

      if (photosError) {
        showMessage(`Erro ao carregar fotos: ${photosError.message}`, "error");
        setLoading(false);
        return;
      }

      const photosWithUrls =
        photosData?.map((photo) => {
          const { data } = supabase.storage
            .from("project-photos")
            .getPublicUrl(photo.storage_path);

          return {
            ...photo,
            public_url: data.publicUrl,
          };
        }) ?? [];

      setPhotos(photosWithUrls);

      const { data: crewData, error: crewError } = await supabase
        .from("crew_entries")
        .select("id, daily_log_id, name, role, hours")
        .in("daily_log_id", logIds)
        .order("created_at", { ascending: false });

      if (crewError) {
        showMessage(`Erro ao carregar equipe: ${crewError.message}`, "error");
        setLoading(false);
        return;
      }

      setCrewEntries(crewData ?? []);

      const { data: materialsData, error: materialsError } = await supabase
        .from("materials_used")
        .select("id, daily_log_id, material, quantity, unit, notes")
        .in("daily_log_id", logIds)
        .order("created_at", { ascending: false });

      if (materialsError) {
        showMessage(`Erro ao carregar materiais: ${materialsError.message}`, "error");
        setLoading(false);
        return;
      }

      setMaterialEntries(materialsData ?? []);
    } else {
      setPhotos([]);
      setCrewEntries([]);
      setMaterialEntries([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProjectData();
  }, [id]);

  const createOrUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!id) {
      showMessage("Obra não encontrada.", "error");
      return;
    }

    if (!logDate) {
      showMessage("Informe a data do registro.", "error");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      showMessage("Usuário não autenticado.", "error");
      return;
    }

    if (editingLogId) {
      const { data, error } = await supabase
        .from("daily_logs")
        .update({
          log_date: logDate,
          weather: weather.trim() || null,
          summary: summary.trim() || null,
          issues: issues.trim() || null,
          next_steps: nextSteps.trim() || null,
        })
        .eq("id", editingLogId)
        .select("id, log_date, weather, summary, issues, next_steps")
        .single();

      if (error) {
        showMessage(`Erro ao atualizar registro: ${error.message}`, "error");
        return;
      }

      setLogs((prev) => prev.map((item) => (item.id === editingLogId ? data : item)));
      clearLogForm();
      setOpenLogMenuId(null);
      showMessage("Registro atualizado com sucesso.", "success");
      return;
    }

    const { data, error } = await supabase
      .from("daily_logs")
      .insert({
        project_id: id,
        log_date: logDate,
        weather: weather.trim() || null,
        summary: summary.trim() || null,
        issues: issues.trim() || null,
        next_steps: nextSteps.trim() || null,
        created_by: userData.user.id,
      })
      .select("id, log_date, weather, summary, issues, next_steps")
      .single();

    if (error) {
      showMessage(`Erro ao criar registro: ${error.message}`, "error");
      return;
    }

    setLogs((prev) => [data, ...prev]);
    clearLogForm();
    showMessage("Registro diário salvo com sucesso.", "success");
  };

  const startEditLog = (log: DailyLog) => {
    setEditingLogId(log.id);
    setLogDate(log.log_date);
    setWeather(log.weather ?? "");
    setSummary(log.summary ?? "");
    setIssues(log.issues ?? "");
    setNextSteps(log.next_steps ?? "");
    setOpenLogMenuId(null);
    showMessage("Modo de edição ativado para o registro.", "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteLog = async (logId: string) => {
    const confirmar = window.confirm("Deseja excluir este registro diário?");
    if (!confirmar) return;

    const { error } = await supabase.from("daily_logs").delete().eq("id", logId);

    if (error) {
      showMessage(`Erro ao excluir registro: ${error.message}`, "error");
      return;
    }

    setLogs((prev) => prev.filter((log) => log.id !== logId));
    setPhotos((prev) => prev.filter((photo) => photo.daily_log_id !== logId));
    setCrewEntries((prev) => prev.filter((crew) => crew.daily_log_id !== logId));
    setMaterialEntries((prev) =>
      prev.filter((material) => material.daily_log_id !== logId)
    );

    if (editingLogId === logId) clearLogForm();
    setOpenLogMenuId(null);
    showMessage("Registro excluído com sucesso.", "success");
  };

  const createOrUpdateCrewEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!crewLogId) {
      showMessage("Selecione um registro diário para vincular a equipe.", "error");
      return;
    }

    if (!crewName.trim()) {
      showMessage("Informe o nome do colaborador.", "error");
      return;
    }

    const parsedHours = crewHours.trim() ? Number(crewHours) : null;

    if (crewHours.trim() && Number.isNaN(parsedHours)) {
      showMessage("Horas inválidas.", "error");
      return;
    }

    if (editingCrewId) {
      const { data, error } = await supabase
        .from("crew_entries")
        .update({
          daily_log_id: crewLogId,
          name: crewName.trim(),
          role: crewRole.trim() || null,
          hours: parsedHours,
        })
        .eq("id", editingCrewId)
        .select("id, daily_log_id, name, role, hours")
        .single();

      if (error) {
        showMessage(`Erro ao atualizar equipe: ${error.message}`, "error");
        return;
      }

      setCrewEntries((prev) =>
        prev.map((item) => (item.id === editingCrewId ? data : item))
      );

      clearCrewForm();
      setSelectedCrewIds([]);
      setOpenCrewMenuId(null);
      showMessage("Membro da equipe atualizado com sucesso.", "success");
      return;
    }

    const { data, error } = await supabase
      .from("crew_entries")
      .insert({
        daily_log_id: crewLogId,
        name: crewName.trim(),
        role: crewRole.trim() || null,
        hours: parsedHours,
      })
      .select("id, daily_log_id, name, role, hours")
      .single();

    if (error) {
      showMessage(`Erro ao salvar equipe: ${error.message}`, "error");
      return;
    }

    setCrewEntries((prev) => [data, ...prev]);
    clearCrewForm();
    showMessage("Membro da equipe adicionado com sucesso.", "success");
  };

  const startEditCrewEntry = (crew: CrewEntry) => {
    setEditingCrewId(crew.id);
    setCrewLogId(crew.daily_log_id);
    setCrewName(crew.name);
    setCrewRole(crew.role ?? "");
    setCrewHours(crew.hours !== null ? String(crew.hours) : "");
    setOpenCrewMenuId(null);
    showMessage("Modo de edição ativado para a equipe.", "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleCrewSelection = (crewId: string) => {
    setSelectedCrewIds((prev) =>
      prev.includes(crewId)
        ? prev.filter((id) => id !== crewId)
        : [...prev, crewId]
    );
  };

  const deleteSelectedCrewEntries = async () => {
    if (selectedCrewIds.length === 0) return;

    const confirmar = window.confirm(
      `Deseja excluir ${selectedCrewIds.length} membro(s) da equipe?`
    );
    if (!confirmar) return;

    const { error } = await supabase
      .from("crew_entries")
      .delete()
      .in("id", selectedCrewIds);

    if (error) {
      showMessage(`Erro ao excluir membros da equipe: ${error.message}`, "error");
      return;
    }

    setCrewEntries((prev) => prev.filter((item) => !selectedCrewIds.includes(item.id)));
    setSelectedCrewIds([]);
    setOpenCrewMenuId(null);

    if (editingCrewId && selectedCrewIds.includes(editingCrewId)) {
      clearCrewForm();
    }

    showMessage("Membros da equipe excluídos com sucesso.", "success");
  };

  const deleteSingleCrewEntry = async (crewId: string) => {
    const confirmar = window.confirm("Deseja excluir este membro da equipe?");
    if (!confirmar) return;

    const { error } = await supabase.from("crew_entries").delete().eq("id", crewId);

    if (error) {
      showMessage(`Erro ao excluir membro da equipe: ${error.message}`, "error");
      return;
    }

    setCrewEntries((prev) => prev.filter((item) => item.id !== crewId));
    setSelectedCrewIds((prev) => prev.filter((id) => id !== crewId));
    setOpenCrewMenuId(null);

    if (editingCrewId === crewId) {
      clearCrewForm();
    }

    showMessage("Membro da equipe excluído com sucesso.", "success");
  };

  const createOrUpdateMaterialEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!materialLogId) {
      showMessage("Selecione um registro diário para vincular o material.", "error");
      return;
    }

    if (!materialName.trim()) {
      showMessage("Informe o nome do material.", "error");
      return;
    }

    const parsedQuantity = materialQuantity.trim() ? Number(materialQuantity) : null;

    if (materialQuantity.trim() && Number.isNaN(parsedQuantity)) {
      showMessage("Quantidade inválida.", "error");
      return;
    }

    if (editingMaterialId) {
      const { data, error } = await supabase
        .from("materials_used")
        .update({
          daily_log_id: materialLogId,
          material: materialName.trim(),
          quantity: parsedQuantity,
          unit: materialUnit.trim() || null,
          notes: materialNotes.trim() || null,
        })
        .eq("id", editingMaterialId)
        .select("id, daily_log_id, material, quantity, unit, notes")
        .single();

      if (error) {
        showMessage(`Erro ao atualizar material: ${error.message}`, "error");
        return;
      }

      setMaterialEntries((prev) =>
        prev.map((item) => (item.id === editingMaterialId ? data : item))
      );

      clearMaterialForm();
      setSelectedMaterialIds([]);
      setOpenMaterialMenuId(null);
      showMessage("Material atualizado com sucesso.", "success");
      return;
    }

    const { data, error } = await supabase
      .from("materials_used")
      .insert({
        daily_log_id: materialLogId,
        material: materialName.trim(),
        quantity: parsedQuantity,
        unit: materialUnit.trim() || null,
        notes: materialNotes.trim() || null,
      })
      .select("id, daily_log_id, material, quantity, unit, notes")
      .single();

    if (error) {
      showMessage(`Erro ao salvar material: ${error.message}`, "error");
      return;
    }

    setMaterialEntries((prev) => [data, ...prev]);
    clearMaterialForm();
    showMessage("Material adicionado com sucesso.", "success");
  };

  const startEditMaterialEntry = (material: MaterialEntry) => {
    setEditingMaterialId(material.id);
    setMaterialLogId(material.daily_log_id);
    setMaterialName(material.material);
    setMaterialQuantity(material.quantity !== null ? String(material.quantity) : "");
    setMaterialUnit(material.unit ?? "");
    setMaterialNotes(material.notes ?? "");
    setOpenMaterialMenuId(null);
    showMessage("Modo de edição ativado para o material.", "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleMaterialSelection = (materialId: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(materialId)
        ? prev.filter((id) => id !== materialId)
        : [...prev, materialId]
    );
  };

  const deleteSelectedMaterialEntries = async () => {
    if (selectedMaterialIds.length === 0) return;

    const confirmar = window.confirm(
      `Deseja excluir ${selectedMaterialIds.length} material(is)?`
    );
    if (!confirmar) return;

    const { error } = await supabase
      .from("materials_used")
      .delete()
      .in("id", selectedMaterialIds);

    if (error) {
      showMessage(`Erro ao excluir materiais: ${error.message}`, "error");
      return;
    }

    setMaterialEntries((prev) =>
      prev.filter((item) => !selectedMaterialIds.includes(item.id))
    );
    setSelectedMaterialIds([]);
    setOpenMaterialMenuId(null);

    if (editingMaterialId && selectedMaterialIds.includes(editingMaterialId)) {
      clearMaterialForm();
    }

    showMessage("Materiais excluídos com sucesso.", "success");
  };

  const deleteSingleMaterialEntry = async (materialId: string) => {
    const confirmar = window.confirm("Deseja excluir este material?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("materials_used")
      .delete()
      .eq("id", materialId);

    if (error) {
      showMessage(`Erro ao excluir material: ${error.message}`, "error");
      return;
    }

    setMaterialEntries((prev) => prev.filter((item) => item.id !== materialId));
    setSelectedMaterialIds((prev) => prev.filter((id) => id !== materialId));
    setOpenMaterialMenuId(null);

    if (editingMaterialId === materialId) {
      clearMaterialForm();
    }

    showMessage("Material excluído com sucesso.", "success");
  };

  const uploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!selectedLogId) {
      showMessage("Selecione um registro diário para vincular a foto.", "error");
      return;
    }

    if (!selectedFile) {
      showMessage("Selecione uma foto.", "error");
      return;
    }

    const fileExt = selectedFile.name.split(".").pop();
    const fileName = `${selectedLogId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("project-photos")
      .upload(fileName, selectedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      showMessage(`Erro no upload da foto: ${uploadError.message}`, "error");
      return;
    }

    const { data: photoData, error: photoError } = await supabase
      .from("photos")
      .insert({
        daily_log_id: selectedLogId,
        storage_path: fileName,
        caption: photoCaption.trim() || null,
        taken_at: new Date().toISOString(),
      })
      .select("id, daily_log_id, storage_path, caption, taken_at")
      .single();

    if (photoError) {
      showMessage(`Erro ao salvar foto no banco: ${photoError.message}`, "error");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("project-photos")
      .getPublicUrl(photoData.storage_path);

    const photoWithUrl: Photo = {
      ...photoData,
      public_url: publicUrlData.publicUrl,
    };

    setPhotos((prev) => [photoWithUrl, ...prev]);
    setSelectedFile(null);
    setPhotoCaption("");
    setSelectedLogId("");
    showMessage("Foto enviada com sucesso.", "success");
  };

  if (loading) {
    return (
      <div className="page-center">
        <div className="panel">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-center">
      <div className="project-shell">
        <section className="project-hero">
          <div className="project-hero-head">
            <div>
              <h1 className="title">{project?.name}</h1>
              <p className="text-muted">Gerencie os registros diários da obra.</p>
            </div>

            <div className="project-actions">
              <button
                className="button ghost"
                onClick={() => navigate("/obras")}
                type="button"
              >
                Voltar para Obras
              </button>
            </div>
          </div>

          <div className="project-stats">
            {project?.client_name && (
              <div className="stat-card">
                <strong>Cliente</strong>
                <span>{project.client_name}</span>
              </div>
            )}

            {project?.address && (
              <div className="stat-card">
                <strong>Endereço</strong>
                <span>{project.address}</span>
              </div>
            )}

            <div className="stat-card">
              <strong>Registros</strong>
              <span>{logsCount}</span>
            </div>
          </div>

          <div className="rdo-counts">
            <span>Total de funcionários: {crewCount}</span>
            <span>Total de materiais: {materialsCount}</span>
            <span>Total de registros: {logsCount}</span>
          </div>
        </section>

        <div className="project-body">
          <div className="project-left">
            <section className="panel">
              <div className="panel-header">
                <h2 className="section-title">Histórico da Obra</h2>
                <span className="tag">{logsCount} registro(s)</span>
              </div>

              {logs.length === 0 && (
                <p className="empty-state">Nenhum registro diário cadastrado.</p>
              )}

              <div className="log-list">
                {logs.map((log) => {
                  const logPhotos = photos.filter((photo) => photo.daily_log_id === log.id);
                  const logCrew = crewEntries.filter((crew) => crew.daily_log_id === log.id);
                  const logMaterials = materialEntries.filter(
                    (material) => material.daily_log_id === log.id
                  );

                  const selectedCrewCountInThisLog = selectedCrewIds.filter((crewId) =>
                    logCrew.some((crew) => crew.id === crewId)
                  ).length;

                  const selectedMaterialCountInThisLog = selectedMaterialIds.filter(
                    (materialId) =>
                      logMaterials.some((material) => material.id === materialId)
                  ).length;

                  return (
                    <article key={log.id} className="log-card">
                      <div className="log-header">
                        <div>
                          <div className="log-date">{log.log_date}</div>
                          {log.weather && (
                            <p className="text-muted">Clima: {log.weather}</p>
                          )}
                        </div>

                        <div className="menu-wrapper">
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() =>
                              setOpenLogMenuId((prev) => (prev === log.id ? null : log.id))
                            }
                          >
                            ⋮
                          </button>

                          {openLogMenuId === log.id && (
                            <div className="dropdown-menu">
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => startEditLog(log)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => deleteLog(log.id)}
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="log-summary">
                        {log.summary && <p><strong>Resumo:</strong> {log.summary}</p>}
                        {log.issues && <p><strong>Ocorrências:</strong> {log.issues}</p>}
                        {log.next_steps && <p><strong>Próximos passos:</strong> {log.next_steps}</p>}
                      </div>

                      {logCrew.length > 0 && (
                        <div className="log-block">
                          <div className="log-block-title">Equipe do dia</div>

                          {selectedCrewCountInThisLog > 0 && (
                            <div className="bulk-action-box">
                              <p>{selectedCrewCountInThisLog} item(ns) selecionado(s)</p>
                              <button
                                className="button danger"
                                type="button"
                                onClick={deleteSelectedCrewEntries}
                              >
                                Excluir selecionados
                              </button>
                            </div>
                          )}

                          <div className="item-list">
                            {logCrew.map((crew) => (
                              <div key={crew.id} className="item-card">
                                <div className="item-topbar">
                                  <label className="checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={selectedCrewIds.includes(crew.id)}
                                      onChange={() => toggleCrewSelection(crew.id)}
                                    />
                                    Selecionar
                                  </label>

                                  <div className="menu-wrapper">
                                    <button
                                      type="button"
                                      className="icon-button"
                                      onClick={() =>
                                        setOpenCrewMenuId((prev) =>
                                          prev === crew.id ? null : crew.id
                                        )
                                      }
                                    >
                                      ⋮
                                    </button>

                                    {openCrewMenuId === crew.id && (
                                      <div className="dropdown-menu">
                                        <button
                                          type="button"
                                          className="dropdown-item"
                                          onClick={() => startEditCrewEntry(crew)}
                                        >
                                          Editar
                                        </button>
                                        <button
                                          type="button"
                                          className="dropdown-item"
                                          onClick={() => deleteSingleCrewEntry(crew.id)}
                                        >
                                          Excluir
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <p><strong>Nome:</strong> {crew.name}</p>
                                {crew.role && <p><strong>Função:</strong> {crew.role}</p>}
                                {crew.hours !== null && (
                                  <p><strong>Horas:</strong> {crew.hours}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {logMaterials.length > 0 && (
                        <div className="log-block">
                          <div className="log-block-title">Materiais usados</div>

                          {selectedMaterialCountInThisLog > 0 && (
                            <div className="bulk-action-box">
                              <p>{selectedMaterialCountInThisLog} item(ns) selecionado(s)</p>
                              <button
                                className="button danger"
                                type="button"
                                onClick={deleteSelectedMaterialEntries}
                              >
                                Excluir selecionados
                              </button>
                            </div>
                          )}

                          <div className="item-list">
                            {logMaterials.map((material) => (
                              <div key={material.id} className="item-card">
                                <div className="item-topbar">
                                  <label className="checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={selectedMaterialIds.includes(material.id)}
                                      onChange={() => toggleMaterialSelection(material.id)}
                                    />
                                    Selecionar
                                  </label>

                                  <div className="menu-wrapper">
                                    <button
                                      type="button"
                                      className="icon-button"
                                      onClick={() =>
                                        setOpenMaterialMenuId((prev) =>
                                          prev === material.id ? null : material.id
                                        )
                                      }
                                    >
                                      ⋮
                                    </button>

                                    {openMaterialMenuId === material.id && (
                                      <div className="dropdown-menu">
                                        <button
                                          type="button"
                                          className="dropdown-item"
                                          onClick={() => startEditMaterialEntry(material)}
                                        >
                                          Editar
                                        </button>
                                        <button
                                          type="button"
                                          className="dropdown-item"
                                          onClick={() => deleteSingleMaterialEntry(material.id)}
                                        >
                                          Excluir
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <p><strong>Material:</strong> {material.material}</p>
                                {material.quantity !== null && (
                                  <p><strong>Quantidade:</strong> {material.quantity}</p>
                                )}
                                {material.unit && (
                                  <p><strong>Unidade:</strong> {material.unit}</p>
                                )}
                                {material.notes && (
                                  <p><strong>Observações:</strong> {material.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {logPhotos.length > 0 && (
                        <div className="log-block">
                          <div className="log-block-title">Fotos</div>

                          <div className="photo-grid">
                            {logPhotos.map((photo) => (
                              <div key={photo.id} className="photo-card">
                                <img
                                  src={photo.public_url}
                                  alt={photo.caption ?? "Foto da obra"}
                                />
                                {photo.caption && (
                                  <p className="photo-caption">{photo.caption}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="project-right">
            <div className="sticky-side">
              <div className="action-grid">
                <section className="panel">
                  <div className="panel-header">
                    <h2 className="section-title">
                      {editingLogId ? "Editar Registro" : "Novo Registro"}
                    </h2>
                  </div>

                  <form onSubmit={createOrUpdateLog} className="form-stack">
                    <input
                      className="input"
                      type="date"
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                    />

                    <input
                      className="input"
                      placeholder="Clima (ex: Sol, Nublado, Chuva)"
                      value={weather}
                      onChange={(e) => setWeather(e.target.value)}
                    />

                    <textarea
                      className="input"
                      placeholder="Resumo do que foi feito no dia"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={4}
                    />

                    <textarea
                      className="input"
                      placeholder="Ocorrências / problemas"
                      value={issues}
                      onChange={(e) => setIssues(e.target.value)}
                      rows={3}
                    />

                    <textarea
                      className="input"
                      placeholder="Próximos passos"
                      value={nextSteps}
                      onChange={(e) => setNextSteps(e.target.value)}
                      rows={3}
                    />

                    <button className="button" type="submit">
                      {editingLogId ? "Salvar alterações" : "Salvar registro diário"}
                    </button>

                    {editingLogId && (
                      <button
                        className="button secondary"
                        type="button"
                        onClick={clearLogForm}
                      >
                        Cancelar edição
                      </button>
                    )}
                  </form>
                </section>

                <section className="panel">
                  <div className="panel-header">
                    <h2 className="section-title">Equipe do Dia</h2>
                  </div>

                  <form onSubmit={createOrUpdateCrewEntry} className="form-stack">
                    <select
                      className="input"
                      value={crewLogId}
                      onChange={(e) => setCrewLogId(e.target.value)}
                    >
                      <option value="">Selecione o registro diário</option>
                      {logs.map((log) => (
                        <option key={log.id} value={log.id}>
                          {log.log_date} {log.weather ? `- ${log.weather}` : ""}
                        </option>
                      ))}
                    </select>

                    <input
                      className="input"
                      placeholder="Nome do colaborador"
                      value={crewName}
                      onChange={(e) => setCrewName(e.target.value)}
                    />

                    <input
                      className="input"
                      placeholder="Função (ex: Pedreiro, Servente, Eletricista)"
                      value={crewRole}
                      onChange={(e) => setCrewRole(e.target.value)}
                    />

                    <input
                      className="input"
                      type="number"
                      step="0.5"
                      placeholder="Horas trabalhadas"
                      value={crewHours}
                      onChange={(e) => setCrewHours(e.target.value)}
                    />

                    <button className="button" type="submit">
                      {editingCrewId ? "Salvar alterações" : "Adicionar à equipe"}
                    </button>

                    {editingCrewId && (
                      <button
                        className="button secondary"
                        type="button"
                        onClick={clearCrewForm}
                      >
                        Cancelar edição
                      </button>
                    )}
                  </form>
                </section>

                <section className="panel">
                  <div className="panel-header">
                    <h2 className="section-title">Materiais do Dia</h2>
                  </div>

                  <form onSubmit={createOrUpdateMaterialEntry} className="form-stack">
                    <select
                      className="input"
                      value={materialLogId}
                      onChange={(e) => setMaterialLogId(e.target.value)}
                    >
                      <option value="">Selecione o registro diário</option>
                      {logs.map((log) => (
                        <option key={log.id} value={log.id}>
                          {log.log_date} {log.weather ? `- ${log.weather}` : ""}
                        </option>
                      ))}
                    </select>

                    <input
                      className="input"
                      placeholder="Material (ex: Cimento, Areia, Brita)"
                      value={materialName}
                      onChange={(e) => setMaterialName(e.target.value)}
                    />

                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      placeholder="Quantidade"
                      value={materialQuantity}
                      onChange={(e) => setMaterialQuantity(e.target.value)}
                    />

                    <input
                      className="input"
                      placeholder="Unidade (ex: sacos, m³, barras)"
                      value={materialUnit}
                      onChange={(e) => setMaterialUnit(e.target.value)}
                    />

                    <textarea
                      className="input"
                      placeholder="Observações do material"
                      value={materialNotes}
                      onChange={(e) => setMaterialNotes(e.target.value)}
                      rows={3}
                    />

                    <button className="button" type="submit">
                      {editingMaterialId ? "Salvar alterações" : "Adicionar material"}
                    </button>

                    {editingMaterialId && (
                      <button
                        className="button secondary"
                        type="button"
                        onClick={clearMaterialForm}
                      >
                        Cancelar edição
                      </button>
                    )}
                  </form>
                </section>

                <section className="panel">
                  <div className="panel-header">
                    <h2 className="section-title">Adicionar Foto</h2>
                  </div>

                  <form onSubmit={uploadPhoto} className="form-stack">
                    <select
                      className="input"
                      value={selectedLogId}
                      onChange={(e) => setSelectedLogId(e.target.value)}
                    >
                      <option value="">Selecione o registro diário</option>
                      {logs.map((log) => (
                        <option key={log.id} value={log.id}>
                          {log.log_date} {log.weather ? `- ${log.weather}` : ""}
                        </option>
                      ))}
                    </select>

                    <input
                      className="input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />

                    <input
                      className="input"
                      placeholder="Legenda da foto"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                    />

                    <button className="button" type="submit">
                      Enviar foto
                    </button>
                  </form>
                </section>

                {message && (
                  <section className="panel">
                    <div className="message-box">
                      <p className={messageType === "error" ? "error" : "success"}>
                        {message}
                      </p>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}