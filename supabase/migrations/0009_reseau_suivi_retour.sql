-- ============================================================================
-- Retour arrière de 0009_reseau_suivi.sql : retire le suivi, les avis et l'adresse du chantier (leurs données
-- sont perdues) et remet le plafond de 0008. Les mises en relation « expirées » repassent « refusées ».
-- ============================================================================
update public.reseau_mises_en_relation set statut = 'refusee' where statut = 'expiree';
alter table public.reseau_mises_en_relation drop constraint if exists reseau_mises_en_relation_valeurs;
alter table public.reseau_mises_en_relation add constraint reseau_mises_en_relation_valeurs check (statut in ('envoyee', 'acceptee', 'refusee'));
drop index if exists public.idx_reseau_mer_statut_date;
alter table public.reseau_mises_en_relation
  drop column if exists relance_le, drop column if exists devis_envoye_le, drop column if exists issue,
  drop column if exists issue_le, drop column if exists avis_note, drop column if exists avis_commentaire,
  drop column if exists avis_le, drop column if exists sondage_le;
alter table public.reseau_demandes drop constraint if exists reseau_demandes_adresse;
alter table public.reseau_demandes drop column if exists adresse;
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
