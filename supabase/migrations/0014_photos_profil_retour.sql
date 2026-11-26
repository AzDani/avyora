-- Retour de 0014 : retire la colonne recopiée chez les artisans. Le dossier `avatars` et ses fichiers restent (à vider
-- et supprimer à la main dans Storage si besoin) ; app_metadata.photo reste sur les comptes, sans effet.
alter table public.reseau_artisans drop column if exists photo;
