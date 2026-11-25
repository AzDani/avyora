-- ============================================================================
-- AVYORA — RETOUR ARRIÈRE de 0010_budget_reel.sql. Idempotent.
-- Efface la nature des dépenses (les montants restent) ; le budget matériel déjà enregistré reste dans
-- projects.reponses mais ne peut plus être modifié clé par clé.
-- ============================================================================
alter table public.expenses drop constraint if exists expenses_nature;
alter table public.expenses drop column if exists nature;

create or replace function public.projet_reponses_cle_maj(p_projet uuid, p_cle text, p_valeur jsonb)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  n int;
begin
  if p_cle is null or p_cle not in ('invest') then
    raise exception 'cle de reponses non autorisee' using errcode = '22023';
  end if;
  if p_valeur is null or octet_length(p_valeur::text) > 20000 then
    raise exception 'valeur trop volumineuse' using errcode = '22023';
  end if;

  update projects p
     set reponses = jsonb_set(coalesce(p.reponses, '{}'::jsonb), array[p_cle], p_valeur, true)
   where p.id = p_projet;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.projet_reponses_cle_maj(uuid, text, jsonb) from public, anon;
grant execute on function public.projet_reponses_cle_maj(uuid, text, jsonb) to authenticated;
