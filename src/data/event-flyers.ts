import { createClient } from "../lib/supabase/browser";
import { EVENT_FLYERS_BUCKET, managedFlyerPath } from "../domain/event-image";
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_FLYER_BYTES = 600 * 1024;

function webpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob && blob.type === "image/webp"
          ? resolve(blob)
          : reject(
              new Error("Este navegador no pudo convertir la imagen a WebP."),
            ),
      "image/webp",
      quality,
    );
  });
}

export async function optimizeFlyer(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/"))
    throw new Error("Selecciona una imagen válida.");
  if (file.size > MAX_SOURCE_BYTES)
    throw new Error("La imagen original debe pesar menos de 15 MB.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("No se pudo abrir esa imagen. Prueba con JPG, PNG o WebP.");
  }
  try {
    if (!bitmap.width || !bitmap.height)
      throw new Error("La imagen está vacía o dañada.");
    for (const width of [1080, 864, 720]) {
      const height = Math.round((width * 5) / 4);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo preparar la imagen.");
      context.fillStyle = "#192733";
      context.fillRect(0, 0, width, height);
      const scale = Math.min(width / bitmap.width, height / bitmap.height);
      const drawWidth = bitmap.width * scale;
      const drawHeight = bitmap.height * scale;
      context.drawImage(
        bitmap,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
      for (const quality of [0.82, 0.72, 0.6, 0.48]) {
        const blob = await webpBlob(canvas, quality);
        if (blob.size <= MAX_FLYER_BYTES) return blob;
      }
    }
    throw new Error("No se pudo reducir el flyer a menos de 600 KB.");
  } finally {
    bitmap.close();
  }
}

export async function uploadEventFlyer(file: File) {
  const blob = await optimizeFlyer(file);
  const supabase = createClient();
  const path = `flyers/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(EVENT_FLYERS_BUCKET)
    .upload(path, blob, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw new Error(`No se pudo subir el flyer: ${error.message}`);
  return supabase.storage.from(EVENT_FLYERS_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

export async function removeEventFlyer(url: string) {
  const path = managedFlyerPath(url);
  if (!path) return;
  const { error } = await createClient()
    .storage.from(EVENT_FLYERS_BUCKET)
    .remove([path]);
  if (error) throw new Error(`No se pudo eliminar el flyer: ${error.message}`);
}
