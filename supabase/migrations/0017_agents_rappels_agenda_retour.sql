-- Retour de 0017 : retire ce que les agents ont produit (fiches, notes, comptes rendus). Les rendez-vous eux-mêmes restent.
alter table public.admin_rendez_vous
  drop column if exists email, drop column if exists fiche, drop column if exists fiche_le, drop column if exists notes,
  drop column if exists compte_rendu_texte, drop column if exists compte_rendu_le, drop column if exists compte_rendu_envoye_le,
  drop column if exists rappel_envoye_le;
