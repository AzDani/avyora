/**
 * Prépare une photo dans le NAVIGATEUR avant son envoi au stockage : elle est redessinée dans un canvas puis
 * réencodée en JPEG. Toutes ses métadonnées disparaissent au passage, dont la POSITION GPS qu'un téléphone y écrit
 * (une photo de la salle de bain d'un client, vue par des artisans avant qu'ils acceptent, ne doit pas donner
 * l'adresse du domicile). La plus grande dimension est ramenée à 2400 px au plus (un envoi plus léger).
 * En cas d'échec, l'envoi est refusé : jamais le fichier d'origine, qui garderait ses métadonnées.
 */
export async function nettoyerImage(f: File): Promise<File> {
  const MAX = 2400;
  const source = await createImageBitmap(f, { imageOrientation: "from-image" });
  const echelle = Math.min(1, MAX / Math.max(source.width, source.height));
  const l = Math.max(1, Math.round(source.width * echelle));
  const h = Math.max(1, Math.round(source.height * echelle));
  const canvas = document.createElement("canvas");
  canvas.width = l;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff"; // un PNG transparent ne devient pas noir en JPEG
  ctx.fillRect(0, 0, l, h);
  ctx.drawImage(source, 0, 0, l, h);
  source.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!blob) throw new Error("encodage");
  const nom = f.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], nom, { type: "image/jpeg" });
}
