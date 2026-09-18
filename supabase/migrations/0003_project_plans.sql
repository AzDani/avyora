-- Le plan dessiné d'un projet, dans sa propre table.
--
-- Pourquoi pas dans `reponses` : ce champ est plafonné à 40 000 caractères sérialisés
-- (lib/validation.ts), à la création comme à la modification, et il porte déjà ctx + sel +
-- custom + statuts. Une géométrie sur deux niveaux dépasse le plafond, et le 400 renvoyé dit
-- seulement « Données invalides. » — l'utilisateur ne pourrait pas comprendre que c'est un
-- problème de volume. `reponses` ne gagne donc qu'un pointeur minuscule : { plan: { id, at } }.
--
-- Trois colonnes de contenu, pas une :
--   contrat        ce que la maquette a émis, tel quel, avec son numéro de version ;
--   contributions  ce que la table de correspondance en a tiré (poste, quantité, provenance) ;
--   rapport        ce que l'injection a rapporté, pour rouvrir l'écran de validation sans
--                  tout recalculer, et pour savoir ce qui avait été montré à l'utilisateur.
-- Les trois sont figés à l'import : si la table de correspondance change, un projet déjà validé
-- ne bouge pas tout seul — c'est ce qui permet de rejouer et de comparer.

create table if not exists public.project_plans (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  contrat      jsonb not null,
  contributions jsonb,
  rapport      jsonb,
  version      text not null,                       -- numéro de contrat du plan (ex. « 1.4.0 »)
  nom          text,                                -- nom du plan tel que l'utilisateur l'a saisi
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Un projet n'a qu'un plan courant : le ré-import remplace.
create unique index if not exists project_plans_project_key on public.project_plans(project_id);

alter table public.project_plans enable row level security;

-- Exactement le motif des six tables filles de 0001_tenancy.sql : on accède au plan si on accède
-- au projet. Aucun concept de tenancy nouveau.
-- Réserve assumée, identique aux autres tables : `peut_acceder_projet` = propriétaire OU membre
-- actif, sans distinction de rôle. La restriction d'écriture par rôle reste applicative.
drop policy if exists project_plans_access on public.project_plans;
create policy project_plans_access on public.project_plans for all
  using (public.peut_acceder_projet(project_id))
  with check (public.peut_acceder_projet(project_id));

create index if not exists project_plans_updated_idx on public.project_plans(updated_at desc);
