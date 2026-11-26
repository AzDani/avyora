-- 0014 · Photo de profil (26/11/2026, décision de Dani).
-- Chaque compte peut ajouter une photo (ou, pour un artisan, son logo). Elle est recadrée en carré, réduite et réencodée
-- en JPEG dans le navigateur (sans métadonnées, donc sans position GPS) avant l'envoi.
-- * Le dossier `avatars` est PUBLIC en lecture : la photo s'affiche dans l'en-tête et, pour un artisan, sur sa fiche vue
--   par les membres Pro. Le nom du fichier est `<compte>/<identifiant aléatoire>.jpg`, impossible à deviner.
-- * Personne n'y écrit directement : le serveur délivre une URL d'envoi signée (clé service_role) pour un chemin qu'il
--   choisit, puis enregistre le chemin dans `app_metadata.photo` (que seul le serveur peut écrire).
-- * `reseau_artisans.photo` recopie le chemin pour afficher la photo d'un artisan sans lire son compte ; l'admin peut la
--   retirer.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

alter table public.reseau_artisans add column if not exists photo text;

comment on column public.reseau_artisans.photo is
  'Photo ou logo de l''artisan : chemin dans le dossier public avatars (<compte>/<id>.jpg), recopié de app_metadata.photo.';
