-- ============================================================================
-- AVYORA — Schéma multi-tenant Postgres (Supabase) — Phase 0/1
-- À exécuter dans Supabase (SQL editor ou `supabase db push`).
-- Auth gérée par Supabase (auth.users). La tenancy est imposée par la RLS :
-- une ligne projet n'est visible que par son propriétaire OU un membre du projet.
-- Les tables de RÉFÉRENCE (kb_*, form_*) sont GLOBALES (référentiel partagé).
-- ============================================================================

-- ── Profil applicatif (1:1 avec auth.users) ──
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nom         text,
  avatar_url  text,
  prefs       jsonb not null default '{}',   -- région par défaut, unités, notifications…
  created_at  timestamptz not null default now()
);

-- Crée automatiquement le profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nom) values (new.id, new.raw_user_meta_data->>'nom');
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Projets (racine de tenancy) ──
create table if not exists projects (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  nom                 text not null,
  type_bien           text not null,
  surface             real not null,
  code_postal         text not null,
  adresse             text,
  reponses            jsonb not null default '{}',
  statut              text not null default 'en_cours',   -- brouillon|en_cours|termine|archive
  archived            boolean not null default false,
  derniere_activite_at timestamptz not null default now(),
  last_viewed_at      timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists idx_projects_owner on projects(owner_id);

-- ── Membres & invitations (collaboration : conjoint / architecte / artisan / investisseur) ──
create table if not exists project_members (
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'viewer',   -- owner|editor|viewer
  status      text not null default 'active',   -- active|pending
  invited_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  primary key (project_id, user_id)
);
create table if not exists project_invitations (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  email       text not null,
  role        text not null default 'viewer',
  token       text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- ── Tables enfants (héritent de la tenancy via project_id) ──
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  nom text not null, type_piece text not null default 'autre',
  longueur real not null, largeur real not null, hauteur real not null default 2.5,
  portes int not null default 1, fenetres int not null default 1,
  carrelage_sol boolean not null default false, faience boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null default 'photo', fichier text not null, nom text not null,
  note_ia text, created_at timestamptz not null default now()
);
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  corps_etat text not null, libelle text not null, montant real not null,
  created_at timestamptz not null default now()
);
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  corps_etat text not null, titre text not null,
  statut text not null default 'a_faire', ordre int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  nom text not null, fichier text, texte text not null,
  analyse_json jsonb not null, note int, created_at timestamptz not null default now()
);
create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  params jsonb not null, resultats jsonb not null, created_at timestamptz not null default now()
);

-- ── Carnet artisans (personnel) ──
create table if not exists artisans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nom text not null, corps_etat text not null default 'divers',
  telephone text, email text, ville text, note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_artisans_owner on artisans(owner_id);

-- ── Historique / activité + notifications ──
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type text not null, payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_project on activity_log(project_id, created_at desc);
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, titre text not null, corps text, cible_url text,
  lu boolean not null default false, created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW-LEVEL SECURITY — le cœur de la tenancy
-- ============================================================================
alter table profiles            enable row level security;
alter table projects            enable row level security;
alter table project_members     enable row level security;
alter table project_invitations enable row level security;
alter table rooms enable row level security;
alter table documents enable row level security;
alter table expenses enable row level security;
alter table tasks enable row level security;
alter table quotes enable row level security;
alter table scenarios enable row level security;
alter table artisans enable row level security;
alter table activity_log enable row level security;
alter table notifications enable row level security;

-- Un utilisateur "accède" à un projet s'il en est propriétaire ou membre actif.
create or replace function public.peut_acceder_projet(pid uuid)
returns boolean language sql stable security definer as $$
  select exists(select 1 from projects p where p.id = pid and p.owner_id = auth.uid())
      or exists(select 1 from project_members m where m.project_id = pid and m.user_id = auth.uid() and m.status = 'active');
$$;

-- profiles : chacun voit/édite le sien
create policy profiles_self on profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- projects : propriétaire (tous droits) + membres (lecture ; l'édition détaillée se gère applicativement selon role)
create policy projects_access on projects for select using (public.peut_acceder_projet(id));
create policy projects_owner_write on projects for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- membres & invitations : visibles par les accédants au projet ; gérés par le propriétaire
create policy pm_access on project_members for select using (public.peut_acceder_projet(project_id));
create policy pm_owner on project_members for all
  using (exists(select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists(select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy pi_owner on project_invitations for all
  using (exists(select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists(select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));

-- tables enfants : accès si on accède au projet parent
create policy rooms_access     on rooms     for all using (public.peut_acceder_projet(project_id)) with check (public.peut_acceder_projet(project_id));
create policy documents_access on documents for all using (public.peut_acceder_projet(project_id)) with check (public.peut_acceder_projet(project_id));
create policy expenses_access  on expenses  for all using (public.peut_acceder_projet(project_id)) with check (public.peut_acceder_projet(project_id));
create policy tasks_access     on tasks     for all using (public.peut_acceder_projet(project_id)) with check (public.peut_acceder_projet(project_id));
create policy quotes_access    on quotes    for all using (public.peut_acceder_projet(project_id)) with check (public.peut_acceder_projet(project_id));
create policy scenarios_access on scenarios for all using (public.peut_acceder_projet(project_id)) with check (public.peut_acceder_projet(project_id));
create policy activity_access  on activity_log for select using (public.peut_acceder_projet(project_id));

-- artisans & notifications : personnels
create policy artisans_self      on artisans      for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy notifications_self on notifications for all using (user_id = auth.uid())  with check (user_id = auth.uid());

-- NB : kb_* et form_* (référentiel + questionnaire) = tables GLOBALES, ajoutées par une
-- migration compagnon (traduction mécanique du schéma SQLite), avec lecture pour tout
-- utilisateur authentifié et écriture réservée au rôle service (admin). Non soumises à la tenancy.
