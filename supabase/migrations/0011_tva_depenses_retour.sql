-- Retour arrière de 0011_tva_depenses.sql : retire la TVA des dépenses (les montants TTC restent).
alter table public.expenses drop constraint if exists expenses_tva;
alter table public.expenses drop constraint if exists expenses_taux_tva;
alter table public.expenses drop column if exists taux_tva;
alter table public.expenses drop column if exists tva;
