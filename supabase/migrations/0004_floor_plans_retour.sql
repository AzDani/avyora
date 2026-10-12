-- ============================================================================
-- AVYORA — RETOUR ARRIÈRE de 0004_floor_plans.sql.
-- À n'utiliser QUE si on abandonne « Mes plans ». IL EFFACE TOUS LES PLANS ENREGISTRÉS.
-- Idempotent. Ne touche ni à `projects` ni aux tables de 0001/0002.
--
-- project_plans reste en place (elle ne perd que la colonne plan_id) : ses lignes de rénovation
-- (contrat, contributions, rapport) restent lisibles par la fiche projet. Ses politiques restent
-- celles de 0004 (les membres lisent, le propriétaire écrit), plus sûres que celles de 0003.
--
-- La politique d'écriture lit plan_id et floor_plans : Postgres refuse de supprimer l'une ou
-- l'autre tant qu'elle existe. On la remplace d'abord par la même règle, sans le plan.
-- ============================================================================
do $$
begin
  if to_regclass('public.project_plans') is not null then
    drop policy if exists project_plans_ecriture on public.project_plans;
    create policy project_plans_ecriture on public.project_plans for all to authenticated
      using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
      with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
  end if;
end $$;
drop function if exists public.floor_plans_creer(uuid, int, text, text, jsonb, jsonb, jsonb, jsonb, int, text);
alter table if exists public.project_plans drop column if exists plan_id;
drop table if exists public.floor_plans;
drop function if exists public.floor_plans_touch();
