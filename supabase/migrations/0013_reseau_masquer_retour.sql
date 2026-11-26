-- Retour de 0013 : retire la colonne « masqué du réseau » (les artisans masqués redeviennent visibles).
alter table public.reseau_artisans drop column if exists masque_le;
