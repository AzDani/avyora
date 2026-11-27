-- Retour de 0018 : supprime les deux tables ET leur contenu (relevés Claude Code, historique des appels des agents).
-- La salle Claude Code affiche alors « migration 0018 à appliquer » ; les agents continuent de marcher (le compteur est facultatif).
drop table if exists public.admin_agents_appels;
drop table if exists public.admin_claude_releves;
