-- ============================================================================
-- AVYORA — écritures ATOMIQUES dans projects.reponses (suivi de chantier, investissement).
-- À coller UNE fois dans Supabase › SQL editor. Idempotent : le rejouer ne change rien.
-- Additif : deux fonctions, aucune table ni colonne modifiée.
--
-- Pourquoi : la route /api/projects/[id]/statut lisait tout `reponses`, changeait un statut, puis
-- réécrivait tout `reponses`. Deux clics rapprochés (À démarrer → En cours → Terminé) lisaient la même
-- version et le dernier arrivé effaçait l'autre ; une sauvegarde de l'Investissement (même schéma)
-- pouvait aussi effacer un statut, et inversement. Ici, chaque écriture ne touche QUE sa clé, dans
-- une seule instruction UPDATE (Postgres verrouille la ligne et relit la version à jour).
--
-- SECURITY INVOKER : la RLS de `projects` s'applique comme pour un UPDATE direct (propriétaire seul,
-- policy projects_owner_write). Les fonctions renvoient false quand aucune ligne n'a été modifiée
-- (projet absent, ou pas le droit de l'écrire).
--
-- Tant que ce fichier n'est pas appliqué, le code retombe sur l'ancienne écriture (lecture puis
-- réécriture de `reponses`) : rien ne casse, la course reste seulement possible.
-- Retour arrière : drop function public.projet_statut_maj(uuid, text, int);
--                 drop function public.projet_reponses_cle_maj(uuid, text, jsonb);
-- ============================================================================

-- ── 1. Un statut du suivi de chantier (0 = à démarrer : la clé est retirée) ──────────────────
create or replace function public.projet_statut_maj(p_projet uuid, p_cle text, p_etat int)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  n int;
begin
  if p_cle is null or char_length(p_cle) = 0 or char_length(p_cle) > 200 then
    raise exception 'cle de statut invalide' using errcode = '22023';
  end if;
  if p_etat not in (0, 1, 2) then
    raise exception 'etat de statut invalide' using errcode = '22023';
  end if;

  update projects p
     set reponses = case
       when p_etat = 0 then coalesce(p.reponses, '{}'::jsonb) #- array['statuts', p_cle]
       else jsonb_set(
         coalesce(p.reponses, '{}'::jsonb),
         '{statuts}',
         (case when jsonb_typeof(p.reponses -> 'statuts') = 'object' then p.reponses -> 'statuts' else '{}'::jsonb end)
           || jsonb_build_object(p_cle, p_etat),
         true)
     end
   where p.id = p_projet;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- ── 2. Une clé de module hors estimation (aujourd'hui : `invest`, la simulation Investissement) ──
create or replace function public.projet_reponses_cle_maj(p_projet uuid, p_cle text, p_valeur jsonb)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  n int;
begin
  -- Liste fermée : l'estimation (ctx, sel…) ne s'écrit jamais clé par clé.
  if p_cle is null or p_cle not in ('invest') then
    raise exception 'cle de reponses non autorisee' using errcode = '22023';
  end if;
  if p_valeur is null or octet_length(p_valeur::text) > 20000 then
    raise exception 'valeur trop volumineuse' using errcode = '22023';
  end if;

  update projects p
     set reponses = jsonb_set(coalesce(p.reponses, '{}'::jsonb), array[p_cle], p_valeur, true)
   where p.id = p_projet;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.projet_statut_maj(uuid, text, int) from public, anon;
revoke all on function public.projet_reponses_cle_maj(uuid, text, jsonb) from public, anon;
grant execute on function public.projet_statut_maj(uuid, text, int) to authenticated;
grant execute on function public.projet_reponses_cle_maj(uuid, text, jsonb) to authenticated;
