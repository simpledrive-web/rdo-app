// atualizarFotosPublicas.ts
import { supabase } from "./supabase/client";

async function atualizarFotos() {
  try {
    // 1. Pegar todas as fotos do banco
    const { data: fotos, error } = await supabase
      .from("photos")
      .select("id, storage_path");

    if (error) {
      console.error("Erro ao buscar fotos:", error);
      return;
    }

    if (!fotos || fotos.length === 0) {
      console.log("Nenhuma foto encontrada.");
      return;
    }

    console.log(`Encontradas ${fotos.length} fotos. Atualizando URLs...`);

    // 2. Atualizar cada foto com a URL pública
    for (const foto of fotos) {
      const { publicUrl, error: urlError } = supabase.storage
        .from("project-photos")
        .getPublicUrl(foto.storage_path);

      if (urlError) {
        console.error(`Erro ao gerar URL da foto ${foto.id}:`, urlError);
        continue;
      }

      // 3. Atualizar o campo signed_url (ou crie outro campo se quiser)
      const { error: updateError } = await supabase
        .from("photos")
        .update({ signed_url: publicUrl })
        .eq("id", foto.id);

      if (updateError) {
        console.error(`Erro ao atualizar foto ${foto.id}:`, updateError);
      } else {
        console.log(`Foto ${foto.id} atualizada com sucesso.`);
      }
    }

    console.log("Todas as fotos foram processadas.");
  } catch (err) {
    console.error("Erro inesperado:", err);
  }
}

atualizarFotos();