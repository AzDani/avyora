-- ============================================================================
-- AVYORA — « Mes plans » : le plan dessiné est un objet de l'utilisateur.
-- À coller UNE fois dans Supabase › SQL editor. Idempotent : le rejouer ne change rien.
-- Additif : aucune table existante n'est modifiée, sauf project_plans (créée ici si absente,
-- jamais utilisée en production). `projects` n'est PAS touchée.
-- Remplace 0003_project_plans.sql (déplacée dans _remplacees/, à ne jamais appliquer).
-- Procédure et vérifications : docs/plans/README.md. Retour arrière : 0004_floor_plans_retour.sql.
--
--   floor_plans    le dessin vivant (état de l'éditeur), propriétaire seul. La session n'en modifie que
--                  nom, etat, vue et resume ; vignette, type et contrat sont écrits par le serveur.
--   project_plans  « cette estimation est née de ce plan » : le lien (plan_id) et, pour la
--                  rénovation, le cliché figé de ce qui a été chiffré (contrat, contributions,
--                  rapport : D1). Un projet a au plus une ligne ; un plan peut en avoir plusieurs.
-- Le nom n'est pas « plans » : « plan » désigne déjà l'abonnement (app_metadata.plan).
-- ============================================================================

-- ── 1. Le plan dessiné ─────────────────────────────────────────────────────
create table if not exists public.floor_plans (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  nom          text not null default 'Plan sans nom',
  workflow     text not null,                        -- 'final_plan' | 'renovation' (contrat 1.18, D67)
  etat         jsonb not null,                       -- `state` de l'éditeur, sans les images de calque
  vue          jsonb,                                -- `view` (zoom, centre)
  resume       jsonb not null default '{}'::jsonb,   -- resumePlan() : la carte de « Mes plans »
  apercu       jsonb,                                -- vignette calculée PAR LE SERVEUR (nombres et codes fermés)
  schema_etat  int  not null default 0,              -- state.schema (47 au 12/10/2026)
  editeur_id   text,                                 -- id local de l'éditeur (uid) : reprise d'un plan anonyme, sans doublon
  contrat      jsonb,                                -- dernier contratPlan() envoyé pour une estimation de rénovation
  contrat_at   timestamptz,
  revision     int  not null default 1,              -- verrou optimiste, tenu par le trigger
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint floor_plans_nom           check (char_length(nom) between 1 and 120),
  constraint floor_plans_workflow      check (workflow in ('final_plan', 'renovation')),
  -- coalesce : sans clé `levels`, jsonb_typeof rend null et un CHECK à null PASSE. On veut un refus.
  constraint floor_plans_etat_forme    check (jsonb_typeof(etat) = 'object' and coalesce(jsonb_typeof(etat->'levels'), '') = 'array'),
  constraint floor_plans_etat_taille   check (octet_length(etat::text) <= 1000000),
  constraint floor_plans_vue_taille    check (vue is null or octet_length(vue::text) <= 4000),
  constraint floor_plans_resume_taille check (octet_length(resume::text) <= 4000),
  constraint floor_plans_apercu_taille check (apercu is null or octet_length(apercu::text) <= 131072),
  constraint floor_plans_editeur_id    check (editeur_id is null or editeur_id ~ '^[a-z0-9]{1,24}$'),
  constraint floor_plans_contrat_taille check (contrat is null or octet_length(contrat::text) <= 1500000)
);

create index if not exists floor_plans_owner_maj on public.floor_plans(owner_id, updated_at desc);
create unique index if not exists floor_plans_editeur_key on public.floor_plans(owner_id, editeur_id) where editeur_id is not null;

-- updated_at et révision. La révision n'avance que si le DESSIN change (état, nom, type) :
-- un zoom, une estimation préparée (contrat) ou un lien posé ne doivent pas faire croire
-- à un autre appareil qu'on a modifié le plan. Propriétaire et date de création figés.
create or replace function public.floor_plans_touch()
returns trigger language plpgsql as $$
begin
  new.owner_id   := old.owner_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  if new.etat is distinct from old.etat or new.nom is distinct from old.nom or new.workflow is distinct from old.workflow then
    new.revision := old.revision + 1;
  else
    new.revision := old.revision;
  end if;
  return new;
end $$;
drop trigger if exists floor_plans_touch on public.floor_plans;
create trigger floor_plans_touch before update on public.floor_plans
  for each row execute procedure public.floor_plans_touch();

-- Création : SEULE porte d'entrée (aucune politique INSERT). Réservée au service role : la route
-- /api/plans y passe la limite (1 en gratuit, null en Pro) calculée par estPro(), que la base ne
-- peut pas calculer (PRO_EMAILS, ADMIN_EMAILS). Le verrou sérialise deux créations simultanées
-- du même compte. Un plan local déjà repris (même editeur_id) est rendu tel quel : pas de doublon.
create or replace function public.floor_plans_creer(
  p_owner uuid, p_limite int, p_nom text, p_workflow text, p_etat jsonb, p_vue jsonb,
  p_resume jsonb, p_apercu jsonb, p_schema int, p_editeur_id text)
returns table(plan_id uuid, plan_revision int, deja boolean)
language plpgsql security definer set search_path = public as $$
declare v_n int; v_id uuid; v_rev int;
begin
  perform pg_advisory_xact_lock(hashtextextended('floor_plans:' || p_owner::text, 0));
  if p_editeur_id is not null then
    select f.id, f.revision into v_id, v_rev from public.floor_plans f
      where f.owner_id = p_owner and f.editeur_id = p_editeur_id;
    if v_id is not null then
      return query select v_id, v_rev, true;
      return;
    end if;
  end if;
  select count(*) into v_n from public.floor_plans f where f.owner_id = p_owner;
  if v_n >= 200 then raise exception 'plafond_plans' using errcode = 'P0001'; end if;      -- garde-fou anti-abus, Pro compris
  if p_limite is not null and v_n >= p_limite then raise exception 'limite_gratuite' using errcode = 'P0001'; end if;
  insert into public.floor_plans (owner_id, nom, workflow, etat, vue, resume, apercu, schema_etat, editeur_id)
    values (p_owner, coalesce(nullif(btrim(p_nom), ''), 'Plan sans nom'), p_workflow, p_etat, p_vue,
            coalesce(p_resume, '{}'::jsonb), p_apercu, coalesce(p_schema, 0), p_editeur_id)
    returning floor_plans.id, floor_plans.revision into v_id, v_rev;
  return query select v_id, v_rev, false;
end $$;
revoke all on function public.floor_plans_creer(uuid, int, text, text, jsonb, jsonb, jsonb, jsonb, int, text) from public, anon, authenticated;
grant execute on function public.floor_plans_creer(uuid, int, text, text, jsonb, jsonb, jsonb, jsonb, int, text) to service_role;

alter table public.floor_plans enable row level security;
revoke all on public.floor_plans from anon;
-- TRUNCATE n'est pas soumis à la RLS : on ne le laisse pas traîner dans les droits par défaut.
revoke insert, truncate, references, trigger on public.floor_plans from authenticated;
-- Modification par COLONNE. La session (clé anon + jeton, donc aussi un appel direct à PostgREST) n'écrit
-- que le dessin et ce qui l'accompagne : nom, etat, vue, resume. La vignette (apercu), le type
-- (workflow), la version de schéma (schema_etat) et le contrat de rénovation (contrat, contrat_at) sont
-- écrits par le SERVEUR seul (service role, après avoir vérifié que la session voit le plan) : une
-- vignette forgée finirait dans un SVG, un contrat forgé dans une estimation. Le droit UPDATE de TABLE
-- l'emporterait sur les droits de colonne : on le retire (ce qui retire aussi les droits de colonne),
-- puis on repose les quatre colonnes. Rejouer ces deux lignes donne le même résultat.
revoke update on public.floor_plans from authenticated;
grant update (nom, etat, vue, resume) on public.floor_plans to authenticated;

drop policy if exists floor_plans_select on public.floor_plans;
create policy floor_plans_select on public.floor_plans for select to authenticated using (owner_id = auth.uid());
drop policy if exists floor_plans_update on public.floor_plans;
create policy floor_plans_update on public.floor_plans for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists floor_plans_delete on public.floor_plans;
create policy floor_plans_delete on public.floor_plans for delete to authenticated using (owner_id = auth.uid());

-- ── 2. Le lien estimation → plan, et le cliché de la rénovation (reprend 0003) ──
create table if not exists public.project_plans (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  contrat       jsonb,
  contributions jsonb,
  rapport       jsonb,
  version       text not null,
  nom           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists project_plans_project_key on public.project_plans(project_id);
create index if not exists project_plans_updated_idx on public.project_plans(updated_at desc);

-- 0003 exigeait le contrat : un lien « neuf » n'en porte pas (l'extrait vit dans reponses.origine).
alter table public.project_plans alter column contrat drop not null;
alter table public.project_plans add column if not exists plan_id uuid references public.floor_plans(id) on delete set null;
create index if not exists project_plans_plan_idx on public.project_plans(plan_id) where plan_id is not null;

alter table public.project_plans drop constraint if exists project_plans_tailles;
alter table public.project_plans add constraint project_plans_tailles check (
  (contrat is null or octet_length(contrat::text) <= 1500000)
  and (contributions is null or octet_length(contributions::text) <= 500000)
  and (rapport is null or octet_length(rapport::text) <= 1000000)
  and char_length(version) <= 16 and (nom is null or char_length(nom) <= 200));

alter table public.project_plans enable row level security;
revoke all on public.project_plans from anon;
revoke truncate, references, trigger on public.project_plans from authenticated;
-- 0003 laissait ÉCRIRE tout membre du projet. Désormais : les membres LISENT, le propriétaire du
-- projet ÉCRIT, et il ne peut relier qu'un plan qui est le sien.
drop policy if exists project_plans_access on public.project_plans;
drop policy if exists project_plans_lecture on public.project_plans;
create policy project_plans_lecture on public.project_plans for select to authenticated
  using (public.peut_acceder_projet(project_id));
drop policy if exists project_plans_ecriture on public.project_plans;
create policy project_plans_ecriture on public.project_plans for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
    and (plan_id is null or exists (select 1 from public.floor_plans f where f.id = plan_id and f.owner_id = auth.uid())));
