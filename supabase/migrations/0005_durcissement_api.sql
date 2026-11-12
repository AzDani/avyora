-- ============================================================================
-- AVYORA — Durcissement de la base (revue sécurité du 12/11/2026).
-- À coller UNE fois dans Supabase › SQL editor. Idempotent : le rejouer ne change rien.
-- Aucune donnée n'est modifiée ni supprimée. Retour arrière : 0005_durcissement_api_retour.sql.
--
--   1. projects / expenses : les bornes des routes Next (taille de `reponses`, longueurs, 500 dépenses
--      par projet, nombre de projets par compte) tenues AUSSI par la base. La session (clé anon + jeton)
--      peut écrire ces tables en direct via PostgREST (policies FOR ALL de 0001) : sans ces bornes, un
--      seul compte pouvait remplir la base en contournant l'API.
--   2. Tables héritées kb_*, form_*, settings : plus lues par aucun code (vérifié le 12/11/2026), elles
--      ne sont plus lisibles en anonyme. Les tables restent (aucune suppression).
--   3. search_path figé (public, pg_temp) sur toutes les fonctions SECURITY DEFINER.
--   4. stripe_events : les événements Stripe déjà traités (idempotence du webhook).
--
-- Les CHECK sont posés NOT VALID : les lignes existantes ne sont pas contrôlées (une vieille ligne hors
-- borne ne fait pas échouer la migration), toute NOUVELLE écriture l'est.
-- ============================================================================

-- ── 1a. Tailles et longueurs ──────────────────────────────────────────────
-- `reponses` : la route borne JSON.stringify à 40 000 caractères (80 000 pour le neuf). Le texte d'un
-- jsonb est plus long (espaces après « : » et « , », UTF-8 jusqu'à 3 octets par caractère) : 400 000
-- octets laisse une marge large à tout usage légitime et arrête une ligne de plusieurs Mo.
alter table public.projects drop constraint if exists projects_reponses_taille;
alter table public.projects add constraint projects_reponses_taille
  check (jsonb_typeof(reponses) = 'object' and octet_length(reponses::text) <= 400000) not valid;
alter table public.projects drop constraint if exists projects_longueurs;
alter table public.projects add constraint projects_longueurs check (
  char_length(nom) between 1 and 200
  and char_length(type_bien) <= 40
  and char_length(code_postal) <= 10
  and (adresse is null or char_length(adresse) <= 500)
  and char_length(statut) <= 20) not valid;

alter table public.expenses drop constraint if exists expenses_longueurs;
alter table public.expenses add constraint expenses_longueurs check (
  char_length(corps_etat) between 1 and 100
  and char_length(libelle) between 1 and 300
  and montant > 0 and montant <= 5000000) not valid;

-- ── 1b. Plafonds de nombre ────────────────────────────────────────────────
-- Projets par compte : MAX_PROJETS (lib/data/projects.ts), 200, archivés compris. Dépenses par projet :
-- MAX_DEPENSES (lib/data/depenses.ts), 500. Le verrou consultatif sérialise deux insertions simultanées
-- du même compte (ou du même projet), comme floor_plans_creer (0004). Les messages `plafond_projets` et
-- `plafond_depenses` sont lus par le code (lib/data/projects.ts) ; ils ne partent jamais au client.
create or replace function public.projects_plafond()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_n int;
begin
  if tg_op = 'UPDATE' then
    if new.owner_id is not distinct from old.owner_id then return new; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('projects:' || new.owner_id::text, 0));
  select count(*) into v_n from public.projects p where p.owner_id = new.owner_id;
  if v_n >= 200 then raise exception 'plafond_projets' using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function public.projects_plafond() from public, anon, authenticated;
drop trigger if exists projects_plafond on public.projects;
create trigger projects_plafond before insert or update of owner_id on public.projects
  for each row execute procedure public.projects_plafond();

create or replace function public.expenses_plafond()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_n int;
begin
  if tg_op = 'UPDATE' then
    if new.project_id is not distinct from old.project_id then return new; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('expenses:' || new.project_id::text, 0));
  select count(*) into v_n from public.expenses e where e.project_id = new.project_id;
  if v_n >= 500 then raise exception 'plafond_depenses' using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function public.expenses_plafond() from public, anon, authenticated;
drop trigger if exists expenses_plafond on public.expenses;
create trigger expenses_plafond before insert or update of project_id on public.expenses
  for each row execute procedure public.expenses_plafond();

-- ── 1c. Droits par défaut ─────────────────────────────────────────────────
-- TRUNCATE n'est pas soumis à la RLS ; un anonyme n'a rien à écrire dans ces tables (auth.uid() est nul).
-- La LECTURE anonyme reste permise (la RLS rend zéro ligne) : par prudence, un code qui lirait `projects`
-- sans session continue de recevoir une liste vide plutôt qu'une erreur de droits.
revoke insert, update, delete, truncate, references, trigger on public.projects, public.expenses from anon;
revoke truncate, references, trigger on public.projects, public.expenses from authenticated;

-- ── 2. Référentiel hérité : plus de lecture publique ──────────────────────
-- 0002_referentiel_global posait `<table>_read … using (true)` pour l'ancien funnel. Le catalogue actuel
-- est un import statique (lib/estimateur/catalog.ts) : ni la clé anon ni une session ne lisent ces
-- tables. Le service role (admin, scripts) y garde tous ses droits.
do $$
declare t text;
begin
  foreach t in array array[
    'kb_categories','kb_postes','kb_coefficients','kb_dependances','kb_regles',
    'form_parcours','form_steps','form_groups','form_questions','form_options','form_rules','settings'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_read', t);
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

-- ── 3. search_path figé sur les fonctions SECURITY DEFINER ─────────────────
-- Sans lui, une fonction qui tourne avec les droits de son propriétaire résout ses noms dans le
-- search_path de l'appelant (alerte « function_search_path_mutable » du linter Supabase).
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.peut_acceder_projet(uuid) set search_path = public, pg_temp;
do $$
begin
  if to_regprocedure('public.floor_plans_creer(uuid, int, text, text, jsonb, jsonb, jsonb, jsonb, int, text)') is not null then
    alter function public.floor_plans_creer(uuid, int, text, text, jsonb, jsonb, jsonb, jsonb, int, text)
      set search_path = public, pg_temp;
  end if;
end $$;

-- ── 4. Webhook Stripe : événements déjà traités ───────────────────────────
-- Le webhook (app/api/stripe/webhook/route.ts, service role) y inscrit event.id AVANT de traiter :
-- une relivraison de Stripe tombe sur la clé primaire et repart en 200 sans rien refaire (ni Pro
-- réattribué, ni e-mail renvoyé). Un traitement en échec retire sa ligne pour que Stripe puisse réessayer.
create table if not exists public.stripe_events (
  id       text primary key,
  type     text not null,
  recu_le  timestamptz not null default now(),
  constraint stripe_events_id   check (char_length(id) between 1 and 255),
  constraint stripe_events_type check (char_length(type) <= 255)
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;
grant select, insert, delete on public.stripe_events to service_role;
