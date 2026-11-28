-- Retour de 0019 : supprime la table des prospects ET son contenu (dont la liste des STOP : à exporter avant si besoin,
-- pour ne jamais réécrire à quelqu'un qui a dit STOP). La salle Marketing affiche alors « migration 0019 à appliquer ».
drop table if exists public.admin_prospects;
