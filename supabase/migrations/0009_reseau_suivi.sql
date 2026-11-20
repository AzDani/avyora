-- ============================================================================
-- AVYORA — Réseau AVYORA, phase 3 : relances, suivi des devis, avis, adresse du chantier (20/11/2026).
-- À coller UNE fois dans Supabase › SQL editor, APRÈS 0008. Idempotent : le rejouer ne change rien.
-- N'efface aucune donnée. Retour arrière : 0009_reseau_suivi_retour.sql.
--
--   1. reseau_mises_en_relation : un nouveau statut « expiree » (pas de réponse sous 5 jours), la date de la
--      relance, le devis envoyé (côté artisan), l'issue (côté client : devis reçu, signé, pas retenu), l'avis
--      du client (note de 1 à 5 et commentaire), la date du message qui le demande.
--   2. reseau_demandes : l'adresse du chantier, facultative, montrée seulement à l'artisan qui accepte.
--   3. Le plafond : 3 artisans EN COURS au plus par demande (en attente ou acceptés), 6 contactés au total
--      (le client peut remplacer un artisan qui a refusé ou n'a pas répondu, sans arroser tout le département).
-- Accès inchangé : aucune policy, serveur seulement.
-- ============================================================================

-- ── 1. Les mises en relation ──────────────────────────────────────────────
alter table public.reseau_mises_en_relation add column if not exists relance_le timestamptz;
alter table public.reseau_mises_en_relation add column if not exists devis_envoye_le timestamptz;
alter table public.reseau_mises_en_relation add column if not exists issue text;
alter table public.reseau_mises_en_relation add column if not exists issue_le timestamptz;
alter table public.reseau_mises_en_relation add column if not exists avis_note smallint;
alter table public.reseau_mises_en_relation add column if not exists avis_commentaire text;
alter table public.reseau_mises_en_relation add column if not exists avis_le timestamptz;
alter table public.reseau_mises_en_relation add column if not exists sondage_le timestamptz;

alter table public.reseau_mises_en_relation drop constraint if exists reseau_mises_en_relation_valeurs;
alter table public.reseau_mises_en_relation add constraint reseau_mises_en_relation_valeurs check (
  statut in ('envoyee', 'acceptee', 'refusee', 'expiree')
  and (issue is null or issue in ('devis_recu', 'signe', 'non_retenu'))
  and (avis_note is null or avis_note between 1 and 5)
  and (avis_commentaire is null or char_length(avis_commentaire) <= 1000)
);
-- Les relances du jour (tâche planifiée) : les mises en relation encore en attente, par date d'envoi.
create index if not exists idx_reseau_mer_statut_date on public.reseau_mises_en_relation(statut, envoyee_le);

-- ── 2. L'adresse du chantier ──────────────────────────────────────────────
alter table public.reseau_demandes add column if not exists adresse text;
alter table public.reseau_demandes drop constraint if exists reseau_demandes_adresse;
alter table public.reseau_demandes add constraint reseau_demandes_adresse check (adresse is null or char_length(adresse) <= 200);

-- ── 3. Le plafond par demande ─────────────────────────────────────────────
create or replace function public.reseau_mer_plafond() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare
  en_cours integer;
  total integer;
begin
  perform pg_advisory_xact_lock(hashtext('reseau_mer:' || new.demande_id::text));
  select count(*) filter (where statut in ('envoyee', 'acceptee')), count(*)
    into en_cours, total
    from public.reseau_mises_en_relation where demande_id = new.demande_id;
  if en_cours >= 3 then
    raise exception 'trois artisans en cours au plus par demande' using errcode = 'check_violation';
  end if;
  if total >= 6 then
    raise exception 'six artisans contactés au plus par demande' using errcode = 'check_violation';
  end if;
  return new;
end $$;
