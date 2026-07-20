-- ============================================================================
-- AVYORA — Tables de RÉFÉRENCE GLOBALES (kb_* + form_* + settings) — Phase 0/1
-- Compagnon de 0001_tenancy.sql. Traduction mécanique du schéma SQLite.
-- Ces tables NE sont PAS multi-tenant : un référentiel de prix + un questionnaire
-- partagés par toute l'app. Lecture ouverte (le funnel est pré-login), écriture
-- réservée au rôle `service_role` (admin / génération de snapshot) qui bypass la RLS.
-- Types : INTEGER 0/1 → boolean ; colonnes *_json → jsonb ; settings.valeur reste text
-- (blob JSON lu tel quel par lib/customq-db).
-- ============================================================================

-- ── Base de connaissances prix (kb_*) ──
create table if not exists kb_categories (
  id     text primary key,
  nom    text not null,
  ordre  int not null default 0,
  icone  text,
  actif  boolean not null default true
);

create table if not exists kb_postes (
  id             text primary key,
  categorie_id   text not null references kb_categories(id) on delete cascade,
  nom            text not null,
  description    text,
  unite          text not null,
  prix_min       real not null,
  prix_moy       real not null,
  prix_max       real not null,
  part_mo        real,
  duree_unitaire real,
  difficulte     int not null default 3,
  finition_min   text not null default 'eco',
  confiance      text,
  ordre          int not null default 0,
  actif          boolean not null default true,
  archived       boolean not null default false
);
create index if not exists idx_kb_postes_cat on kb_postes(categorie_id);

create table if not exists kb_coefficients (
  id           text primary key,
  type         text not null,
  cle          text not null,
  scope_niveau text not null default 'national',
  cible        text,
  valeur       real not null,
  label        text,
  actif        boolean not null default true
);

create table if not exists kb_dependances (
  poste_id          text not null references kb_postes(id) on delete cascade,
  requiert_poste_id text not null references kb_postes(id) on delete cascade,
  type              text not null default 'suggere',
  primary key (poste_id, requiert_poste_id)
);

create table if not exists kb_regles (
  id             text primary key,
  nom            text not null,
  type           text not null,
  priorite       int not null default 100,
  condition_json jsonb not null,
  action_json    jsonb not null,
  actif          boolean not null default true,
  archived       boolean not null default false,
  version        int not null default 1
);

-- ── Questionnaire data-driven (form_*) ──
create table if not exists form_parcours (
  id          text primary key,
  cle         text not null,
  titre       text not null,
  type_projet text not null default 'renovation',
  actif       boolean not null default true,
  version     int not null default 1,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists form_steps (
  id          text primary key,
  parcours_id text not null references form_parcours(id) on delete cascade,
  cle         text not null,
  titre       text not null,
  description text,
  ordre       int not null default 0,
  actif       boolean not null default true,
  archived    boolean not null default false
);

create table if not exists form_groups (
  id          text primary key,
  step_id     text not null references form_steps(id) on delete cascade,
  titre       text,
  description text,
  ordre       int not null default 0,
  actif       boolean not null default true,
  archived    boolean not null default false
);

create table if not exists form_questions (
  id          text primary key,
  group_id    text not null references form_groups(id) on delete cascade,
  cle         text,
  titre       text not null,
  description text,
  aide        text,
  type        text not null default 'unique',
  obligatoire boolean not null default false,
  ordre       int not null default 0,
  binding     text,
  corps_etat  text,
  media_url   text,
  config_json jsonb,
  actif       boolean not null default true,
  archived    boolean not null default false
);
create index if not exists idx_form_questions_group on form_questions(group_id);

create table if not exists form_options (
  id          text primary key,
  question_id text not null references form_questions(id) on delete cascade,
  label       text not null,
  valeur      text,
  hint        text,
  ordre       int not null default 0,
  impact_prix real not null default 0,
  mode        text not null default 'forfait',
  actif       boolean not null default true,
  archived    boolean not null default false
);
create index if not exists idx_form_options_q on form_options(question_id);

create table if not exists form_rules (
  id             text primary key,
  question_id    text not null references form_questions(id) on delete cascade,
  condition_json jsonb not null,
  action         text not null default 'show'
);

-- ── Réglages applicatifs (blob JSON : form_customization, etc.) ──
create table if not exists settings (
  cle    text primary key,
  valeur text not null
);

-- ============================================================================
-- RLS : lecture ouverte (funnel pré-login), écriture via service_role uniquement
-- (aucune policy write → seul le service_role, qui bypass la RLS, peut écrire).
-- ============================================================================
alter table kb_categories   enable row level security;
alter table kb_postes       enable row level security;
alter table kb_coefficients enable row level security;
alter table kb_dependances  enable row level security;
alter table kb_regles       enable row level security;
alter table form_parcours   enable row level security;
alter table form_steps      enable row level security;
alter table form_groups     enable row level security;
alter table form_questions  enable row level security;
alter table form_options    enable row level security;
alter table form_rules      enable row level security;
alter table settings        enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'kb_categories','kb_postes','kb_coefficients','kb_dependances','kb_regles',
    'form_parcours','form_steps','form_groups','form_questions','form_options','form_rules','settings'
  ] loop
    execute format('drop policy if exists %I_read on %I', t, t);
    execute format('create policy %I_read on %I for select using (true)', t, t);
  end loop;
end $$;
