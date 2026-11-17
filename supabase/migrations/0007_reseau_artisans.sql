-- ============================================================================
-- AVYORA — Réseau AVYORA, phase 1 : candidatures des artisans (17/11/2026).
-- À coller UNE fois dans Supabase › SQL editor. Idempotent : le rejouer ne change rien.
-- Ne touche à aucune table existante. Retour arrière : 0007_reseau_artisans_retour.sql.
--
-- La table `artisans` qui existe déjà (0001 : le carnet d'artisans PERSONNEL de chaque utilisateur) n'est pas
-- concernée : le réseau a ses propres tables, préfixées reseau_.
--
--   1. reseau_artisans : une candidature par compte (statut, entreprise, SIRET vérifié, métiers, départements,
--      assurance décennale, suivi par l'admin).
--   2. reseau_documents : les fichiers déposés (attestation décennale, RC pro, photos de chantiers).
--   3. Le stockage privé « reseau-artisans » : 10 Mo par fichier, PDF et images seulement.
--
-- Accès : RLS activée SANS AUCUNE policy, et aucun droit pour anon/authenticated. Personne ne lit ni n'écrit
-- ces tables avec la clé publique : tout passe par le serveur (clé service_role), APRÈS vérification de la
-- session (l'artisan ne touche que sa ligne, l'admin passe par ADMIN_EMAILS). Idem pour le stockage :
-- aucune policy sur storage.objects pour ce bucket ; l'envoi se fait par une URL signée à usage unique
-- que le serveur délivre, la lecture par des URL signées de 10 minutes délivrées à l'admin.
-- ============================================================================

-- ── 1. Les candidatures ───────────────────────────────────────────────────
create table if not exists public.reseau_artisans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  -- en_attente : à examiner · a_completer : complément demandé · valide : dans le réseau
  -- refuse · suspendu : sorti du réseau par l'admin
  statut text not null default 'en_attente',
  siret text not null,
  raison_sociale text not null,
  nom_commercial text,
  siret_verif jsonb not null default '{}'::jsonb,
  contact_nom text not null,
  telephone text not null,
  email text not null,
  metiers text[] not null,
  departements text[] not null,
  presentation text,
  site_web text,
  lien_avis text,
  rge boolean not null default false,
  decennale_assureur text not null,
  decennale_police text not null,
  decennale_fin date not null,
  conditions_acceptees_le timestamptz not null,
  soumise_le timestamptz not null default now(),
  appel_le timestamptz,
  valide_le timestamptz,
  -- Le message de l'admin, MONTRÉ à l'artisan (complément demandé, motif de refus ou de suspension).
  message_admin text,
  -- Les notes internes de l'admin, jamais montrées à l'artisan.
  notes_admin text,
  -- Phase 2 : combien de demandes de clients lui ont été transmises (pour la future offre payante).
  contacts_envoyes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reseau_artisans drop constraint if exists reseau_artisans_valeurs;
alter table public.reseau_artisans add constraint reseau_artisans_valeurs check (
  statut in ('en_attente', 'a_completer', 'valide', 'refuse', 'suspendu')
  and siret ~ '^[0-9]{14}$'
  and char_length(raison_sociale) between 1 and 200
  and (nom_commercial is null or char_length(nom_commercial) <= 200)
  and jsonb_typeof(siret_verif) = 'object' and octet_length(siret_verif::text) <= 4000
  and char_length(contact_nom) between 1 and 120
  and char_length(telephone) between 6 and 20
  and char_length(email) between 3 and 320
  and cardinality(metiers) between 1 and 20
  and cardinality(departements) between 1 and 101
  and (presentation is null or char_length(presentation) <= 2000)
  and (site_web is null or char_length(site_web) <= 300)
  and (lien_avis is null or char_length(lien_avis) <= 500)
  and char_length(decennale_assureur) between 1 and 120
  and char_length(decennale_police) between 1 and 80
  and (message_admin is null or char_length(message_admin) <= 2000)
  and (notes_admin is null or char_length(notes_admin) <= 5000)
  and contacts_envoyes >= 0
);

create index if not exists idx_reseau_artisans_statut on public.reseau_artisans(statut, soumise_le desc);
-- Phase 2 : retrouver les artisans validés d'un département et d'un métier.
create index if not exists idx_reseau_artisans_departements on public.reseau_artisans using gin (departements);
create index if not exists idx_reseau_artisans_metiers on public.reseau_artisans using gin (metiers);

-- ── 2. Les documents ──────────────────────────────────────────────────────
create table if not exists public.reseau_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  chemin text not null unique,
  nom text not null,
  taille integer not null,
  mime text not null,
  created_at timestamptz not null default now()
);

alter table public.reseau_documents drop constraint if exists reseau_documents_valeurs;
alter table public.reseau_documents add constraint reseau_documents_valeurs check (
  type in ('decennale', 'rc_pro', 'photo')
  and char_length(chemin) between 1 and 300
  and char_length(nom) between 1 and 200
  and taille between 1 and 10485760
  and mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
);
create index if not exists idx_reseau_documents_user on public.reseau_documents(user_id, type);

-- Le plafond de fichiers par compte et par type (3 attestations décennales, 3 RC pro, 12 photos) tenu AUSSI par la
-- base : le serveur compte avant d'insérer, mais deux envois simultanés pourraient passer entre les deux. Le verrou
-- consultatif par compte sérialise les insertions d'un même compte.
create or replace function public.reseau_documents_plafond() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare
  n integer;
  maxi integer := case new.type when 'photo' then 12 else 3 end;
begin
  perform pg_advisory_xact_lock(hashtext('reseau_documents:' || new.user_id::text));
  select count(*) into n from public.reseau_documents where user_id = new.user_id and type = new.type;
  if n >= maxi then
    raise exception 'plafond de fichiers atteint (%)', new.type using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists reseau_documents_plafond on public.reseau_documents;
create trigger reseau_documents_plafond before insert on public.reseau_documents
  for each row execute function public.reseau_documents_plafond();

-- ── Accès : serveur seulement ─────────────────────────────────────────────
alter table public.reseau_artisans enable row level security;
alter table public.reseau_documents enable row level security;
revoke all on public.reseau_artisans from anon, authenticated;
revoke all on public.reseau_documents from anon, authenticated;

-- ── 3. Le stockage privé ──────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reseau-artisans', 'reseau-artisans', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
