-- ============================================================================
-- AVYORA — RETOUR ARRIÈRE de 0005_durcissement_api.sql.
-- Idempotent. N'efface aucune donnée de projet ni de dépense. Supprime la table stripe_events
-- (l'historique des événements Stripe déjà traités : le webhook redevient non idempotent).
-- Le search_path figé des fonctions et les droits d'écriture retirés à anon sur projects/expenses (sans
-- usage : auth.uid() y est nul) restent en place.
-- ============================================================================
alter table public.projects drop constraint if exists projects_reponses_taille;
alter table public.projects drop constraint if exists projects_longueurs;
alter table public.expenses drop constraint if exists expenses_longueurs;

drop trigger if exists projects_plafond on public.projects;
drop function if exists public.projects_plafond();
drop trigger if exists expenses_plafond on public.expenses;
drop function if exists public.expenses_plafond();

-- Lecture publique du référentiel hérité, comme 0002_referentiel_global.
do $$
declare t text;
begin
  foreach t in array array[
    'kb_categories','kb_postes','kb_coefficients','kb_dependances','kb_regles',
    'form_parcours','form_steps','form_groups','form_questions','form_options','form_rules','settings'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select on public.%I to anon, authenticated', t);
      execute format('drop policy if exists %I on public.%I', t || '_read', t);
      execute format('create policy %I on public.%I for select using (true)', t || '_read', t);
    end if;
  end loop;
end $$;

drop table if exists public.stripe_events;
