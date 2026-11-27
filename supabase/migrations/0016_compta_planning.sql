-- 0016 · Comptabilité et planning de l'admin (27/11/2026, décision de Dani : « go étape 2, compta et planning »).
-- Deux tables que SEUL le serveur lit et écrit (clé service_role, pages /admin/compta et /admin/planning) : la RLS est
-- activée sans aucune règle, donc ni les visiteurs ni les comptes connectés n'y ont accès.
-- * admin_charges : les charges fixes saisies par Daniel (abonnements, nom de domaine…). Les montants viennent de lui,
--   jamais d'une estimation. Montant en centimes, dans la devise payée (EUR ou USD : aucune conversion inventée).
-- * admin_rendez_vous : les rendez-vous d'accompagnement calés par Daniel, affichés dans la salle de réunion des
--   bureaux virtuels. L'heure est enregistrée en instant exact (timestamptz) ; l'admin l'affiche en heure de France.

create table if not exists public.admin_charges (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(nom) between 1 and 80),
  montant_centimes integer not null check (montant_centimes between 0 and 100000000),
  devise text not null default 'EUR' check (devise in ('EUR', 'USD')),
  frequence text not null check (frequence in ('mois', 'an')),
  echeance date,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.admin_charges enable row level security;

create table if not exists public.admin_rendez_vous (
  id uuid primary key default gen_random_uuid(),
  debut timestamptz not null,
  duree_min integer not null default 45 check (duree_min between 10 and 240),
  client text not null check (char_length(client) between 1 and 80),
  sujet text check (sujet is null or char_length(sujet) <= 300),
  type text not null check (type in ('avis_achat', 'relecture_devis', 'point_projet', 'autre')),
  mode text not null check (mode in ('telephone', 'visio')),
  statut text not null default 'a_confirmer' check (statut in ('a_confirmer', 'confirme', 'fait', 'annule')),
  compte_rendu text not null default 'aucun' check (compte_rendu in ('aucun', 'a_relire', 'envoye')),
  demande_id uuid,
  created_at timestamptz not null default now()
);
alter table public.admin_rendez_vous enable row level security;
create index if not exists admin_rendez_vous_debut on public.admin_rendez_vous (debut);

comment on table public.admin_charges is 'Charges fixes saisies par l''admin (/admin/compta). Réservée à service_role.';
comment on table public.admin_rendez_vous is 'Rendez-vous d''accompagnement (/admin/planning, salle de réunion des bureaux). Réservée à service_role.';
