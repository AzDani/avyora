-- Retour de 0015 : retire la fonction. La salle des serveurs affiche alors « migration 0015 à appliquer » pour la base.
drop function if exists public.avyora_taille_base();
