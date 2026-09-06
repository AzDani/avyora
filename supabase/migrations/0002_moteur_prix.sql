-- Surcharges de prix du moteur d'estimation v2 (éditées via /admin/moteur).
-- La bibliothèque par défaut vit dans lib/moteur/bibliotheque.json ; cette table ne stocke
-- que les postes dont un admin a modifié le prix. Le moteur fusionne défauts + surcharges.

create table if not exists public.moteur_prix (
  poste_id   text primary key,
  pm_bas     numeric not null,
  pm_moy     numeric not null,
  pm_haut    numeric not null,
  mo_bas     numeric not null,
  mo_moy     numeric not null,
  mo_haut    numeric not null,
  updated_at timestamptz not null default now()
);

-- Accès réservé au service-role (API admin + moteur côté serveur). Aucune politique
-- publique : les clients anon/auth ne lisent ni n'écrivent directement.
alter table public.moteur_prix enable row level security;
