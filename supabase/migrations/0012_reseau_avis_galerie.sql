-- ============================================================================
-- AVYORA — Réseau AVYORA : avis publics validés par Daniel, réponse de l'artisan, galerie de réalisations
-- (décisions de Dani du 25/11/2026). À coller UNE fois dans Supabase › SQL editor, APRÈS 0009.
-- Idempotent : le rejouer ne change rien. N'efface aucune donnée. Retour arrière : 0012_reseau_avis_galerie_retour.sql.
--
--   1. reseau_mises_en_relation : l'avis du client devient publiable. Il passe « en_attente » à l'envoi, Daniel le
--      « publie » ou le « refuse » avec un motif (envoyé à l'auteur) ; « retire » s'il le retire après coup. Le mois des
--      travaux, jusqu'à 6 photos, le nom affiché (prénom + initiale). Les avis d'avant (statut vide) restent privés :
--      leurs auteurs n'ont pas accepté de publication.
--      L'artisan peut répondre publiquement (réponse validée par Daniel aussi) et signaler un avis.
--   2. Un avis PUBLIÉ est figé : la base refuse toute modification de sa note, de son texte, de ses photos, de son mois
--      ou de son auteur, et son retour « en attente ». Seul le retrait reste possible.
--   3. reseau_realisations : la galerie de l'artisan (titre, description, ville, mois, 1 à 10 photos), publiée sans
--      validation ; Daniel peut retirer une réalisation (retiree_le, motif).
--   4. reseau_artisans.maj_demandee : la mise à jour demandée par un artisan validé (nouvelle décennale, métiers, zone).
-- Accès inchangé : RLS activée SANS policy, aucun droit pour anon/authenticated, serveur seulement (clé service_role).
-- ============================================================================

-- ── 1. Les avis publics ───────────────────────────────────────────────────
alter table public.reseau_mises_en_relation add column if not exists avis_statut text;
alter table public.reseau_mises_en_relation add column if not exists avis_mois date;
alter table public.reseau_mises_en_relation add column if not exists avis_photos text[] not null default '{}';
alter table public.reseau_mises_en_relation add column if not exists avis_auteur text;
alter table public.reseau_mises_en_relation add column if not exists avis_motif text;
alter table public.reseau_mises_en_relation add column if not exists avis_modere_le timestamptz;
alter table public.reseau_mises_en_relation add column if not exists avis_publie_le timestamptz;
alter table public.reseau_mises_en_relation add column if not exists avis_signale_le timestamptz;
alter table public.reseau_mises_en_relation add column if not exists avis_signalement text;
alter table public.reseau_mises_en_relation add column if not exists reponse_texte text;
alter table public.reseau_mises_en_relation add column if not exists reponse_statut text;
alter table public.reseau_mises_en_relation add column if not exists reponse_le timestamptz;
alter table public.reseau_mises_en_relation add column if not exists reponse_motif text;
alter table public.reseau_mises_en_relation add column if not exists reponse_modere_le timestamptz;

alter table public.reseau_mises_en_relation drop constraint if exists reseau_mer_avis_publics;
alter table public.reseau_mises_en_relation add constraint reseau_mer_avis_publics check (
  (avis_statut is null or avis_statut in ('en_attente', 'publie', 'refuse', 'retire'))
  and (reponse_statut is null or reponse_statut in ('en_attente', 'publie', 'refuse'))
  and cardinality(avis_photos) <= 6
  and (avis_auteur is null or char_length(avis_auteur) <= 60)
  and (avis_motif is null or char_length(avis_motif) <= 300)
  and (avis_signalement is null or char_length(avis_signalement) <= 1000)
  and (reponse_texte is null or char_length(reponse_texte) <= 1000)
  and (reponse_motif is null or char_length(reponse_motif) <= 300)
);
-- Les avis à valider (admin) et les avis publiés d'un artisan (fiche, liste).
create index if not exists idx_reseau_mer_avis_statut on public.reseau_mises_en_relation(avis_statut) where avis_statut is not null;
create index if not exists idx_reseau_mer_artisan_avis on public.reseau_mises_en_relation(artisan_id, avis_statut);

-- ── 2. Un avis publié est figé ────────────────────────────────────────────
create or replace function public.reseau_avis_fige() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if old.avis_statut = 'publie' then
    if new.avis_statut is distinct from 'publie' and new.avis_statut is distinct from 'retire' then
      raise exception 'avis publié : il ne peut que rester publié ou être retiré' using errcode = 'check_violation';
    end if;
    if new.avis_note is distinct from old.avis_note
      or new.avis_commentaire is distinct from old.avis_commentaire
      or new.avis_photos is distinct from old.avis_photos
      or new.avis_mois is distinct from old.avis_mois
      or new.avis_auteur is distinct from old.avis_auteur then
      raise exception 'avis publié : il ne peut plus être modifié' using errcode = 'check_violation';
    end if;
  end if;
  if old.avis_statut = 'retire' and new.avis_statut is distinct from 'retire' then
    raise exception 'avis retiré : il ne revient pas' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists trg_reseau_avis_fige on public.reseau_mises_en_relation;
create trigger trg_reseau_avis_fige before update on public.reseau_mises_en_relation
  for each row execute function public.reseau_avis_fige();

-- ── 3. La galerie ─────────────────────────────────────────────────────────
create table if not exists public.reseau_realisations (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.reseau_artisans(id) on delete cascade,
  titre text not null,
  description text not null,
  ville text,
  mois date,
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retiree_le timestamptz,
  retiree_motif text
);
alter table public.reseau_realisations drop constraint if exists reseau_realisations_valeurs;
alter table public.reseau_realisations add constraint reseau_realisations_valeurs check (
  char_length(titre) between 3 and 120
  and char_length(description) between 10 and 1000
  and (ville is null or char_length(ville) <= 80)
  and cardinality(photos) between 1 and 10
  and (retiree_motif is null or char_length(retiree_motif) <= 300)
);
create index if not exists idx_reseau_realisations_artisan on public.reseau_realisations(artisan_id, created_at desc);

alter table public.reseau_realisations enable row level security;
revoke all on public.reseau_realisations from anon, authenticated;

-- ── 4. Les mises à jour demandées par un artisan validé ───────────────────
-- Nouvelle décennale (assureur, contrat, date de fin) ou changement de métiers / zone : l'artisan le demande depuis
-- son espace, Daniel l'applique (ou le traite) depuis la fiche admin. null = rien en attente.
alter table public.reseau_artisans add column if not exists maj_demandee jsonb;
