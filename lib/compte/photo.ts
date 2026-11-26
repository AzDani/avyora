/**
 * La photo de profil (décision de Dani du 26/11/2026). Module pur, partagé par le serveur et le navigateur.
 * Le fichier vit dans le dossier public `avatars` (migration 0014) sous `<compte>/<uuid>.jpg` ; son chemin est écrit
 * dans `app_metadata.photo` par le serveur seul (un utilisateur ne peut pas y mettre l'adresse d'une autre image), et
 * recopié dans `reseau_artisans.photo` pour un artisan.
 */
export const BUCKET_PHOTOS = "avatars";
/** Le côté du carré envoyé (la photo s'affiche au plus en 96 px ; 320 px reste net sur un écran Retina). */
export const COTE_PHOTO = 320;
/** Taille maximale d'un envoi (la photo réduite pèse quelques dizaines de Ko). */
export const TAILLE_MAX_PHOTO = 2 * 1024 * 1024;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const CHEMIN = new RegExp(`^(${UUID})/(${UUID})\\.jpg$`, "i");

/** Un chemin de photo bien formé, et (si `compte` est donné) rangé dans le dossier de CE compte. */
export function cheminPhotoValide(chemin: unknown, compte?: string): chemin is string {
  if (typeof chemin !== "string") return false;
  const m = CHEMIN.exec(chemin);
  return !!m && (compte === undefined || m[1].toLowerCase() === compte.toLowerCase());
}

/** L'adresse publique d'une photo (null si le chemin n'est pas valide ou si l'URL du projet manque). */
export function urlPhoto(chemin: unknown, base: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  if (!cheminPhotoValide(chemin) || !base) return null;
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET_PHOTOS}/${chemin}`;
}

/** La photo d'un compte (app_metadata, écrit par le serveur seul), ou null. */
export function photoDuCompte(user: { id?: string; app_metadata?: Record<string, unknown> | null } | null | undefined): string | null {
  const c = user?.app_metadata?.photo;
  return cheminPhotoValide(c, user?.id) ? urlPhoto(c) : null;
}

/** L'initiale affichée quand il n'y a pas de photo. */
export const initialeDe = (nom: string) => (nom.trim()[0] ?? "?").toUpperCase();

/* ─── L'outil de cadrage (26/11/2026) : la géométrie, pure ─────────────────────────────────────────────────────── */

/** L'état du cadrage : `zoom` ≥ 1 (1 = l'image couvre juste le cadre), décalage du centre en px affichés. */
export type Cadrage = { zoom: number; dx: number; dy: number };
export const ZOOM_MAX = 4;

/** L'échelle d'affichage : l'image (l × h) couvre un cadre de `cadre` px à zoom 1. */
export const echelleCadrage = (l: number, h: number, cadre: number, zoom: number) => (cadre / Math.min(l, h)) * zoom;

/** Le décalage ramené dans les limites : l'image couvre toujours tout le cadre. */
export function bornerCadrage(c: Cadrage, l: number, h: number, cadre: number): Cadrage {
  const zoom = Math.min(ZOOM_MAX, Math.max(1, c.zoom));
  const s = echelleCadrage(l, h, cadre, zoom);
  const mx = Math.max(0, (l * s - cadre) / 2);
  const my = Math.max(0, (h * s - cadre) / 2);
  return { zoom, dx: Math.min(mx, Math.max(-mx, c.dx)), dy: Math.min(my, Math.max(-my, c.dy)) };
}

/** La zone carrée gardée, en pixels de l'image d'origine. */
export function zoneCadrage(c: Cadrage, l: number, h: number, cadre: number): { x: number; y: number; cote: number } {
  const b = bornerCadrage(c, l, h, cadre);
  const s = echelleCadrage(l, h, cadre, b.zoom);
  const cote = cadre / s;
  // Le centre du cadre, dans l'image : son milieu moins le décalage (déplacer l'image vers la droite montre sa gauche).
  const cx = l / 2 - b.dx / s;
  const cy = h / 2 - b.dy / s;
  return { x: Math.round(cx - cote / 2), y: Math.round(cy - cote / 2), cote: Math.round(cote) };
}
