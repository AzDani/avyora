-- ============================================================================
-- AVYORA — budget réel (25/11/2026, demande de Dani) : la NATURE de chaque dépense et le BUDGET MATÉRIEL.
--  1. expenses.nature : 'fp' fourni-posé (matériaux + main-d'œuvre), 'mo' main-d'œuvre seule, 'mat' matériaux
--     seuls. Les dépenses déjà saisies deviennent 'fp' (ce qu'elles étaient de fait : une facture d'artisan).
--  2. projet_reponses_cle_maj accepte la clé `budgetMateriel` (le budget « Matériel et outillage » que
--     l'utilisateur fixe lui-même : achat ou location d'outils, selon son équipement).
-- Idempotent. Tant qu'elle n'est pas appliquée, le site marche quand même (lib/data/depenses.ts et
-- lib/data/reponses-projet.ts retombent sur l'ancien comportement) : la nature n'est simplement pas gardée.
-- Retour arrière : 0010_budget_reel_retour.sql.
-- ============================================================================
alter table public.expenses add column if not exists nature text not null default 'fp';
alter table public.expenses drop constraint if exists expenses_nature;
alter table public.expenses add constraint expenses_nature check (nature in ('fp', 'mo', 'mat'));

create or replace function public.projet_reponses_cle_maj(p_projet uuid, p_cle text, p_valeur jsonb)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  n int;
begin
  -- Liste fermée : l'estimation (ctx, sel…) ne s'écrit jamais clé par clé.
  if p_cle is null or p_cle not in ('invest', 'budgetMateriel') then
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
