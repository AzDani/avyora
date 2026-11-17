-- ============================================================================
-- Retour arrière de 0007_reseau_artisans.sql. SUPPRIME les candidatures des artisans et la liste de leurs
-- documents : à n'utiliser que pour revenir en arrière, après avoir prévenu les artisans concernés.
--
-- Les FICHIERS du stockage « reseau-artisans » ne se suppriment pas en SQL (Supabase l'interdit) : vide d'abord le
-- bucket depuis Supabase › Storage › reseau-artisans, puis supprime le bucket au même endroit.
-- ============================================================================
drop table if exists public.reseau_documents;
drop function if exists public.reseau_documents_plafond();
drop table if exists public.reseau_artisans;
