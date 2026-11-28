-- 0019 · L'Agent Prospection (28/11/2026) : les e-mails de prospection B2B envoyés depuis contact@getavyora.fr aux pros du
-- bâtiment (artisans, agences, architectes, sociétés). Les e-mails partent d'une tâche Claude Code sur le Mac de Daniel
-- (scripts/prospection.mjs), JAMAIS du site : le site lit la table (salle Marketing des bureaux 3D, page /admin/marketing)
-- et permet seulement de changer le statut d'un prospect et sa note.
-- Une seule table, que SEUL le serveur lit et écrit (clé service_role) : la RLS est activée sans aucune règle.
-- * Un prospect par adresse e-mail (unique, en minuscules) : on n'écrit jamais deux fois à la même personne par erreur,
--   et un import ne remplace jamais une ligne existante (surtout pas son statut).
-- * statut « stop » : la personne a répondu STOP. On ne lui écrit PLUS JAMAIS (obligation légale) ; le script refuse de la
--   repasser en « envoye » ou « relance ».
-- * envoye_le / relance_le / reponse_le : posées une seule fois, au premier passage dans le statut correspondant.

create table if not exists public.admin_prospects (
  id uuid primary key default gen_random_uuid(),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  email text not null unique check (email = lower(email) and position('@' in email) > 1 and char_length(email) <= 254),
  entreprise text not null check (char_length(entreprise) between 1 and 200),
  contact text check (contact is null or char_length(contact) <= 120),
  cible text not null check (cible in ('artisan', 'agence', 'architecte', 'societe')),
  metier text check (metier is null or char_length(metier) <= 80),
  commune text check (commune is null or char_length(commune) <= 80),
  ville text check (ville is null or char_length(ville) <= 80),
  siren text check (siren is null or siren ~ '^[0-9]{9}$'),
  source text check (source is null or char_length(source) <= 120),
  objet text check (objet is null or char_length(objet) <= 250),
  lot text check (lot is null or char_length(lot) <= 20),
  envoye_le timestamptz,
  relance_le timestamptz,
  reponse_le timestamptz,
  statut text not null default 'a_envoyer'
    check (statut in ('a_envoyer', 'envoye', 'relance', 'repondu', 'interesse', 'rdv', 'inscrit', 'refus', 'stop', 'erreur')),
  note text check (note is null or char_length(note) <= 1000)
);
alter table public.admin_prospects enable row level security;
create index if not exists admin_prospects_statut on public.admin_prospects (statut);
create index if not exists admin_prospects_envoye_le on public.admin_prospects (envoye_le desc);

comment on table public.admin_prospects is 'Prospects B2B de l''Agent Prospection (e-mails envoyés depuis le Mac de Daniel). « stop » = ne plus jamais écrire. Réservée à service_role.';
