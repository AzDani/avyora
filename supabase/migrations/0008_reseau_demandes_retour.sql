-- ============================================================================
-- Retour arrière de 0008_reseau_demandes.sql. SUPPRIME les demandes de devis des clients et leurs mises en
-- relation : à n'utiliser que pour revenir en arrière.
-- Les photos des demandes (stockage « reseau-artisans », dossier demandes/) se suppriment depuis Supabase › Storage.
-- ============================================================================
drop table if exists public.reseau_mises_en_relation;
drop function if exists public.reseau_mer_plafond();
drop function if exists public.reseau_compte_demandes(uuid[]);
drop table if exists public.reseau_demandes;
