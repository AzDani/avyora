-- Retour de 0020 : supprime les relevés et les rapports de l'Agent SEO (l'historique Search Console se relit dans Google :
-- rien d'irremplaçable). La salle Marketing affiche alors « migration 0020 à appliquer ».
drop table if exists public.admin_seo_rapports;
drop table if exists public.admin_seo_releves;
