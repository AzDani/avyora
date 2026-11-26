/**
 * La photo de profil (décision de Dani du 26/11/2026, migration 0014) : un dossier public `avatars`, des noms
 * impossibles à deviner, un chemin écrit par le serveur seul (app_metadata), recopié chez l'artisan, retiré par l'admin,
 * supprimé avec le compte.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { cheminPhotoValide, urlPhoto, photoDuCompte, initialeDe, BUCKET_PHOTOS } from "@/lib/compte/photo";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const U = "11111111-2222-4333-8444-555555555555";
const F = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("photo de profil : règles pures", () => {
  it("un chemin `<compte>/<uuid>.jpg`, rangé dans le dossier du compte", () => {
    expect(cheminPhotoValide(`${U}/${F}.jpg`)).toBe(true);
    expect(cheminPhotoValide(`${U}/${F}.jpg`, U)).toBe(true);
    expect(cheminPhotoValide(`${U}/${F}.jpg`, F)).toBe(false);
    for (const faux of [`${U}/${F}.png`, `../${U}/${F}.jpg`, `${U}/x.jpg`, `https://ailleurs.com/${U}/${F}.jpg`, 42, null]) expect(cheminPhotoValide(faux)).toBe(false);
  });
  it("l'adresse publique, seulement pour un chemin valide", () => {
    expect(urlPhoto(`${U}/${F}.jpg`, "https://x.supabase.co/")).toBe(`https://x.supabase.co/storage/v1/object/public/${BUCKET_PHOTOS}/${U}/${F}.jpg`);
    expect(urlPhoto("javascript:alert(1)", "https://x.supabase.co")).toBeNull();
    expect(urlPhoto(`${U}/${F}.jpg`, undefined)).toBeNull();
  });
  it("la photo d'un compte vient d'app_metadata (le serveur seul l'écrit), jamais d'user_metadata", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://x.supabase.co";
    expect(photoDuCompte({ id: U, app_metadata: { photo: `${U}/${F}.jpg` } })).toContain(`/${U}/${F}.jpg`);
    expect(photoDuCompte({ id: U, app_metadata: { photo: `${F}/${F}.jpg` } })).toBeNull(); // la photo d'un autre compte
    expect(photoDuCompte({ id: U, app_metadata: {}, user_metadata: { photo: `${U}/${F}.jpg` } } as never)).toBeNull();
    expect(initialeDe(" daniel")).toBe("D");
  });
});

describe("photo de profil : serveur, stockage et affichage", () => {
  it("la migration crée le dossier public (JPEG, 2 Mo) et la copie chez l'artisan ; le retour retire la colonne", () => {
    const m = lire("supabase/migrations/0014_photos_profil.sql");
    expect(m).toMatch(/values \('avatars', 'avatars', true, 2097152, array\['image\/jpeg'\]\)/);
    expect(m).toMatch(/add column if not exists photo text/);
    expect(lire("supabase/migrations/0014_photos_profil_retour.sql")).toMatch(/drop column if exists photo/);
  });
  it("les actions : JPEG seulement, chemin choisi par le serveur, vérifié avant d'être écrit dans app_metadata", () => {
    const a = lire("lib/actions/photo.ts");
    expect(a).toContain('if (f?.mime !== "image/jpeg")');
    expect(a).toContain("const chemin = `${user.id}/${randomUUID()}.jpg`;");
    expect(a).toContain("if (!cheminPhotoValide(chemin, user.id))");
    expect(a).toContain("updateUserById(userId, { app_metadata: { photo: chemin } })");
    expect(a).toContain('.update({ photo: chemin }).eq("user_id", userId)');
    expect(a).toMatch(/export async function retirerPhotoArtisan[\s\S]*?const admin = await getAdmin\(\);/);
    // Jamais une action exportée qui efface le dossier d'un compte quelconque : elle vit hors des actions serveur.
    expect(a).not.toContain("supprimerPhotosCompte");
    expect(lire("lib/compte/photo-serveur.ts")).toContain('import "server-only";');
    expect(lire("lib/actions/compte.ts")).toContain("await supprimerPhotosCompte(user.id);");
  });
  it("affichée dans « Mon espace », Mon compte, Mon dossier, la fiche publique, la liste, l'espace et l'admin", () => {
    expect(lire("components/auth/AuthNav.tsx")).toContain("const photo = photoDuCompte(user);");
    expect(lire("app/mon-espace/compte/page.tsx")).toContain("<PhotoProfil url={photoDuCompte(user)}");
    expect(lire("app/espace-artisan/dossier/page.tsx")).toContain("artisan />");
    expect(lire("app/avis-artisans/[id]/page.tsx")).toContain("{a.photo ? (");
    expect(lire("app/avis-artisans/page.tsx")).toContain("{a.photo ? (");
    expect(lire("app/admin/artisans/[id]/page.tsx")).toContain("<BoutonRetirerPhoto id={a.id} />");
    expect(lire("lib/reseau/image.ts")).toContain("export async function preparerPortrait");
    expect(lire("app/(legal)/confidentialite/page.tsx")).toContain("Photo de profil (facultative)");
  });
});
