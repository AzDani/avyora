-- ============================================================================
-- AVYORA — TVA de chaque dépense du budget réel (25/11/2026, maquette V4 validée par Dani).
--  expenses.tva      : montant de TVA de la facture (null = pas renseigné : dépenses d'avant ce suivi).
--  expenses.taux_tva : '0', '5.5', '10', '20' ou 'multi' (facture à plusieurs taux : la TVA tapée telle quelle).
-- Le montant (`montant`) reste TTC. Le bilan additionne la TVA payée (« Taxes payées »), et un professionnel
-- (il récupère la TVA) voit son budget en HT = montant − tva.
-- Idempotent. Tant qu'elle n'est pas appliquée, le site marche quand même (lib/data/depenses.ts retombe sur
-- l'ancien comportement) : la TVA n'est simplement pas gardée. Retour arrière : 0011_tva_depenses_retour.sql.
-- ============================================================================
alter table public.expenses add column if not exists tva numeric(12, 2);
alter table public.expenses add column if not exists taux_tva text;
alter table public.expenses drop constraint if exists expenses_taux_tva;
alter table public.expenses add constraint expenses_taux_tva check (taux_tva is null or taux_tva in ('0', '5.5', '10', '20', 'multi'));
alter table public.expenses drop constraint if exists expenses_tva;
alter table public.expenses add constraint expenses_tva check (tva is null or (tva >= 0 and tva < montant));
