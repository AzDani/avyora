-- Retour de 0016 : supprime les deux tables ET leur contenu (charges saisies, rendez-vous). Les pages /admin/compta et
-- /admin/planning affichent alors « migration 0016 à appliquer ».
drop table if exists public.admin_rendez_vous;
drop table if exists public.admin_charges;
