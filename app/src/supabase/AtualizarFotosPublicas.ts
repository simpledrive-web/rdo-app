import { supabase } from "./client";

export type PublicPhotoURL = {
  id: string;
  public_url: string | null;
};

export async function atualizarFotosPublicas(): Promise<PublicPhotoURL[]> {
  const { data: fotos } = await supabase
    .from("photos")
    .select("id, storage_path");

  if (!fotos) return [];

  const fotosAtualizadas: PublicPhotoURL[] = fotos.map((foto) => {
    // Correto: chama getPublicUrl e pega a propriedade publicUrl
    const publicUrl = supabase.storage
      .from("project-photos")
      .getPublicUrl(foto.storage_path).data.publicUrl;

    return {
      id: foto.id,
      public_url: publicUrl,
    };
  });

  return fotosAtualizadas;
}