-- 0020 · L'Agent SEO (28/11/2026) : ce que relève chaque matin la tâche « seo-matin » du Mac de Daniel (scripts/seo.mjs) et
-- le rapport de la semaine qu'elle écrit. Le site ne fait que LIRE (page /admin/marketing, salle Marketing des bureaux 3D) ;
-- il ne touche jamais à Google Search Console : la clé du compte de service reste sur le Mac, hors du dépôt.
-- Deux tables, que SEUL le serveur lit et écrit (clé service_role) : la RLS est activée sans aucune règle.
-- * admin_seo_releves : un relevé par jour et par sorte ; « gsc » = Search Console (jours, requêtes × pages des 28 derniers
--   jours et des 28 d'avant), « sante » = fouille des pages du sitemap. Rejouer le même jour remplace le relevé du jour.
-- * admin_seo_rapports : le rapport de l'agent (classement, points d'amélioration triés, ce qu'il propose de changer). Il ne
--   modifie jamais le site seul : Daniel dit « go ».

create table if not exists public.admin_seo_releves (
  id uuid primary key default gen_random_uuid(),
  cree_le timestamptz not null default now(),
  jour date not null,
  sorte text not null check (sorte in ('gsc', 'sante')),
  donnees jsonb not null,
  unique (jour, sorte)
);
alter table public.admin_seo_releves enable row level security;
create index if not exists admin_seo_releves_jour on public.admin_seo_releves (sorte, jour desc);

create table if not exists public.admin_seo_rapports (
  id uuid primary key default gen_random_uuid(),
  cree_le timestamptz not null default now(),
  jour date not null,
  resume text not null check (char_length(resume) between 1 and 4000),
  points jsonb not null default '[]'::jsonb check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) <= 40),
  statut text not null default 'nouveau' check (statut in ('nouveau', 'lu'))
);
alter table public.admin_seo_rapports enable row level security;
create index if not exists admin_seo_rapports_jour on public.admin_seo_rapports (jour desc, cree_le desc);

comment on table public.admin_seo_releves is 'Relevés quotidiens de l''Agent SEO (Search Console, santé du sitemap), écrits depuis le Mac de Daniel. Réservée à service_role.';
comment on table public.admin_seo_rapports is 'Rapports de l''Agent SEO (classement, points d''amélioration). Réservée à service_role.';
