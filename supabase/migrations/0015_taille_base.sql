-- 0015 · Taille de la base pour la salle des serveurs des bureaux virtuels (27/11/2026, décision de Dani).
-- Les bureaux (/admin/bureaux) montrent où en est AVYORA face aux limites de Supabase. La taille de la base ne se lit
-- qu'en SQL : cette fonction la rend, en octets. Elle ne lit aucune donnée, seulement la taille totale.
-- * Réservée au serveur : seule la clé service_role peut l'appeler (ni les visiteurs, ni les comptes connectés).
-- * Sans cette migration, la salle des serveurs affiche « taille de la base : migration 0015 à appliquer ».

create or replace function public.avyora_taille_base()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select pg_catalog.pg_database_size(pg_catalog.current_database());
$$;

revoke all on function public.avyora_taille_base() from public, anon, authenticated;
grant execute on function public.avyora_taille_base() to service_role;

comment on function public.avyora_taille_base() is
  'Taille de la base en octets, pour la salle des serveurs de /admin/bureaux. Réservée à service_role.';
