-- 0018 · La salle Claude Code des bureaux virtuels (27/11/2026, demande de Dani : « je veux tout suivre, je veux pas de
-- débordement »). Deux tables que SEUL le serveur lit et écrit (clé service_role) : la RLS est activée sans aucune règle.
-- * admin_claude_releves : les limites d'utilisation de Claude Code (fenêtre de 5 h, semaine tous modèles, semaine Fable),
--   relevées depuis une session Claude sur le Mac de Daniel par une tâche planifiée (outils/releve-claude.mjs). Elles ne se
--   lisent nulle part ailleurs : la salle affiche l'heure du dernier relevé. Les parts sont des pourcentages (0 à 100).
-- * admin_agents_appels : chaque appel des agents du site à l'API Claude (jetons réels renvoyés par l'API, coût calculé au
--   tarif officiel du modèle, en millionièmes de dollar). C'est ainsi qu'on suit les 100 $ de crédits du mois : la clé du
--   site ne donne pas accès au solde.

create table if not exists public.admin_claude_releves (
  id uuid primary key default gen_random_uuid(),
  releve_le timestamptz not null default now(),
  cinq_heures numeric check (cinq_heures is null or cinq_heures between 0 and 100),
  cinq_heures_fin timestamptz,
  semaine numeric check (semaine is null or semaine between 0 and 100),
  semaine_fin timestamptz,
  semaine_fable numeric check (semaine_fable is null or semaine_fable between 0 and 100),
  semaine_fable_fin timestamptz,
  extra_actif boolean,
  extra_depense numeric check (extra_depense is null or extra_depense >= 0),
  extra_limite numeric check (extra_limite is null or extra_limite >= 0),
  extra_devise text check (extra_devise is null or char_length(extra_devise) <= 8)
);
alter table public.admin_claude_releves enable row level security;
create index if not exists admin_claude_releves_le on public.admin_claude_releves (releve_le desc);

create table if not exists public.admin_agents_appels (
  id uuid primary key default gen_random_uuid(),
  le timestamptz not null default now(),
  tache text not null check (char_length(tache) between 1 and 40),
  modele text not null check (char_length(modele) between 1 and 60),
  entree integer not null default 0 check (entree >= 0),
  sortie integer not null default 0 check (sortie >= 0),
  cache_ecriture integer not null default 0 check (cache_ecriture >= 0),
  cache_lecture integer not null default 0 check (cache_lecture >= 0),
  cout_micro bigint check (cout_micro is null or cout_micro >= 0)
);
alter table public.admin_agents_appels enable row level security;
create index if not exists admin_agents_appels_le on public.admin_agents_appels (le desc);

comment on table public.admin_claude_releves is 'Limites Claude Code relevées depuis une session Claude (salle Claude Code des bureaux). Réservée à service_role.';
comment on table public.admin_agents_appels is 'Appels des agents du site à l''API Claude : jetons et coût calculé. Réservée à service_role.';
