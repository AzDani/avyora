-- 0013 · Masquer un artisan du Réseau AVYORA (26/11/2026, décision de Dani).
-- Un artisan masqué reste VALIDÉ et garde tout son espace (demandes en cours, avis, galerie, dossier), mais il n'est
-- plus proposé aux clients (choix des artisans, ajout à une demande) et n'apparaît plus dans « Avis artisans » ni sur
-- sa fiche publique. Sert au compte de démonstration (DLC TRAVAUX) et, plus tard, à mettre un artisan en pause sans le
-- suspendre. null = visible. Seul le serveur (clé service_role) écrit ici : la table n'a aucune policy.

alter table public.reseau_artisans add column if not exists masque_le timestamptz;

comment on column public.reseau_artisans.masque_le is
  'Masqué du réseau le (null = visible) : plus proposé aux clients ni affiché aux membres Pro ; l''espace artisan reste ouvert.';
