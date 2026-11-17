-- ============================================================================
-- AVYORA — Réseau AVYORA, phase 2 : les demandes de devis des clients (17/11/2026).
-- À coller UNE fois dans Supabase › SQL editor, APRÈS 0007. Idempotent : le rejouer ne change rien.
-- Ne touche à aucune table existante. Retour arrière : 0008_reseau_demandes_retour.sql.
--
--   1. reseau_demandes : la demande d'un client (travaux, lieu, détails facultatifs, photos, estimation
--      AVYORA jointe s'il le veut).
--   2. reseau_mises_en_relation : un artisan choisi par le client pour une demande (3 au plus), et sa
--      réponse. Les coordonnées du client ne sont montrées à l'artisan qu'une fois la demande ACCEPTÉE.
--
-- Accès : comme 0007, RLS activée SANS AUCUNE policy et aucun droit pour anon/authenticated : tout passe
-- par le serveur (clé service_role) après vérification de la session. Les photos des demandes vont dans le
-- stockage privé « reseau-artisans » de 0007, sous demandes/<compte>/.
-- ============================================================================

-- ── 1. Les demandes ───────────────────────────────────────────────────────
create table if not exists public.reseau_demandes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  projet_id uuid references public.projects(id) on delete set null,
  metiers text[] not null,
  code_postal text not null,
  departement text not null,
  ville text,
  description text,
  quantites text,
  delai text,
  photos text[] not null default '{}',
  -- L'estimation AVYORA jointe (total, surface, postes par lot), si le client l'a voulu.
  estimation jsonb,
  prenom text not null,
  telephone text not null,
  email text not null,
  consentement_le timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.reseau_demandes drop constraint if exists reseau_demandes_valeurs;
alter table public.reseau_demandes add constraint reseau_demandes_valeurs check (
  cardinality(metiers) between 1 and 20
  and code_postal ~ '^[0-9]{5}$'
  and char_length(departement) between 2 and 3
  and (ville is null or char_length(ville) <= 120)
  and (description is null or char_length(description) <= 3000)
  and (quantites is null or char_length(quantites) <= 1500)
  and (delai is null or delai in ('urgent', 'trois_mois', 'six_mois', 'plus_tard', 'nsp'))
  and cardinality(photos) <= 6
  and (estimation is null or (jsonb_typeof(estimation) = 'object' and octet_length(estimation::text) <= 8000))
  and char_length(prenom) between 1 and 60
  and char_length(telephone) between 6 and 20
  and char_length(email) between 3 and 320
);
create index if not exists idx_reseau_demandes_client on public.reseau_demandes(client_id, created_at desc);
create index if not exists idx_reseau_demandes_date on public.reseau_demandes(created_at desc);

-- ── 2. Les mises en relation ──────────────────────────────────────────────
create table if not exists public.reseau_mises_en_relation (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null references public.reseau_demandes(id) on delete cascade,
  artisan_id uuid not null references public.reseau_artisans(id) on delete cascade,
  -- envoyee : en attente de réponse · acceptee : coordonnées échangées · refusee
  statut text not null default 'envoyee',
  envoyee_le timestamptz not null default now(),
  repondu_le timestamptz,
  unique (demande_id, artisan_id)
);

alter table public.reseau_mises_en_relation drop constraint if exists reseau_mises_en_relation_valeurs;
alter table public.reseau_mises_en_relation add constraint reseau_mises_en_relation_valeurs check (
  statut in ('envoyee', 'acceptee', 'refusee')
);
create index if not exists idx_reseau_mer_artisan on public.reseau_mises_en_relation(artisan_id, envoyee_le desc);
create index if not exists idx_reseau_mer_demande on public.reseau_mises_en_relation(demande_id);

-- Trois artisans au plus par demande, tenu AUSSI par la base (le serveur le vérifie avant).
create or replace function public.reseau_mer_plafond() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare
  n integer;
begin
  perform pg_advisory_xact_lock(hashtext('reseau_mer:' || new.demande_id::text));
  select count(*) into n from public.reseau_mises_en_relation where demande_id = new.demande_id;
  if n >= 3 then
    raise exception 'trois artisans au plus par demande' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists reseau_mer_plafond on public.reseau_mises_en_relation;
create trigger reseau_mer_plafond before insert on public.reseau_mises_en_relation
  for each row execute function public.reseau_mer_plafond();

-- Combien de demandes chaque artisan a reçues (l'ordre équitable de la liste montrée au client). Une fonction : un
-- comptage par lecture de lignes serait tronqué à 1 000 lignes par l'API. Appelée par le serveur seulement.
create or replace function public.reseau_compte_demandes(ids uuid[]) returns table (artisan_id uuid, n bigint)
language sql stable set search_path = public, pg_temp as $$
  select m.artisan_id, count(*) from public.reseau_mises_en_relation m where m.artisan_id = any(ids) group by m.artisan_id
$$;
revoke all on function public.reseau_compte_demandes(uuid[]) from public, anon, authenticated;
grant execute on function public.reseau_compte_demandes(uuid[]) to service_role;

-- ── Accès : serveur seulement ─────────────────────────────────────────────
alter table public.reseau_demandes enable row level security;
alter table public.reseau_mises_en_relation enable row level security;
revoke all on public.reseau_demandes from anon, authenticated;
revoke all on public.reseau_mises_en_relation from anon, authenticated;
