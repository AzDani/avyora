-- 0017 · Les agents IA Rappels et Agenda (27/11/2026, décision de Dani : « go les agents IA, commence par Rappels et Agenda »).
-- Complète les rendez-vous (0016) de ce que les deux agents produisent. Toujours réservé au serveur (RLS sans règle).
-- * email : l'adresse du client (reprise de sa demande de rappel), pour lui envoyer le rappel de la veille et le compte rendu.
-- * fiche : la fiche préparée par l'Agent Rappels avant l'appel (JSON : résumé, points à vérifier, questions).
-- * notes : ce que Daniel colle après l'appel (la transcription de l'enregistrement, ou ses notes).
-- * compte_rendu_texte : le compte rendu rédigé par l'agent, relu et corrigé par Daniel avant l'envoi (décision du 27/11 :
--   relecture au début, envoi automatique plus tard).
-- * rappel_envoye_le, compte_rendu_envoye_le : jamais deux e-mails pour le même évènement.

alter table public.admin_rendez_vous
  add column if not exists email text check (email is null or char_length(email) <= 254),
  add column if not exists fiche jsonb,
  add column if not exists fiche_le timestamptz,
  add column if not exists notes text check (notes is null or char_length(notes) <= 60000),
  add column if not exists compte_rendu_texte text check (compte_rendu_texte is null or char_length(compte_rendu_texte) <= 20000),
  add column if not exists compte_rendu_le timestamptz,
  add column if not exists compte_rendu_envoye_le timestamptz,
  add column if not exists rappel_envoye_le timestamptz;
