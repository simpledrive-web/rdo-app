import { supabase } from "./client";

export async function atualizarFotosPublicas() {
  const { data: photos } = await supabase
    .from("photos")
    .select("id, storage_path");

  if (!photos) return;

  const updated = photos.map((photo) => {
    const { data } = supabase.storage
      .from("project-photos")
      .getPublicUrl(photo.storage_path);

    const publicUrl = data?.publicUrl ?? null;

    return {
      id: photo.id,
      signed_url: publicUrl,
    };
  });

  console.log("Fotos públicas atualizadas:", updated);
}