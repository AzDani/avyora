-- ============================================================================
-- Retour arrière de 0012_reseau_avis_galerie.sql : retire la galerie (ses lignes sont perdues ; les photos restent
-- dans le stockage), le verrou des avis publiés et les colonnes des avis publics (statut, photos, réponses : perdus).
-- La note et le commentaire de 0009 restent.
-- ============================================================================
drop table if exists public.reseau_realisations;
alter table public.reseau_artisans drop column if exists maj_demandee;
drop trigger if exists trg_reseau_avis_fige on public.reseau_mises_en_relation;
drop function if exists public.reseau_avis_fige();
drop index if exists public.idx_reseau_mer_avis_statut;
drop index if exists public.idx_reseau_mer_artisan_avis;
alter table public.reseau_mises_en_relation drop constraint if exists reseau_mer_avis_publics;
alter table public.reseau_mises_en_relation
  drop column if exists avis_statut, drop column if exists avis_mois, drop column if exists avis_photos,
  drop column if exists avis_auteur, drop column if exists avis_motif, drop column if exists avis_modere_le,
  drop column if exists avis_publie_le, drop column if exists avis_signale_le, drop column if exists avis_signalement,
  drop column if exists reponse_texte, drop column if exists reponse_statut, drop column if exists reponse_le,
  drop column if exists reponse_motif, drop column if exists reponse_modere_le;
