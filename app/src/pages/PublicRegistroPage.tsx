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

    // 🔹 Fotos públicas
    const { data: photosData } = await supabase
      .from("photos")
      .select("id, storage_path, caption")
      .eq("daily_log_id", logId)
      .order("taken_at", { ascending: false });

    const publicPhotos = (photosData ?? []).map((photo) => {
      const { data } = supabase.storage
        .from("project-photos")
        .getPublicUrl(photo.storage_path);

      const publicUrl = data?.publicUrl ?? null;

      return {
        ...photo,
        signed_url: publicUrl,
      };
    });

    setPhotos(publicPhotos);

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
    return <div>Carregando registro...</div>;
  }

  if (notFound || !log || !project) {
    return <div>Registro não encontrado</div>;
  }

  return <div>Registro carregado com fotos!</div>;
}