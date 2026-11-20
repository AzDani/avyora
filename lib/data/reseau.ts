import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BUCKET_ARTISANS, aujourdhuiParis } from "@/lib/reseau/candidature";
import { ordreEquitable, type ArtisanPropose, type EstimationJointe, type Issue, type StatutMiseEnRelation } from "@/lib/reseau/demande";
import { COLONNES_ARTISAN, lireArtisan, lireDocument, type Artisan, type DocumentArtisan } from "@/lib/reseau/artisan";

/**
 * Lectures du Réseau AVYORA (tables `reseau_artisans` et `reseau_documents`, migration 0007 ; à ne pas confondre avec
 * `artisans`, le carnet personnel de 0001). Clé service_role : les tables n'ont AUCUNE policy. Chaque appelant vérifie
 * d'abord la session (l'artisan ne lit que sa ligne : `userId` vient de getUser(), jamais du navigateur) ou le droit
 * admin (pages /admin, gardées par le layout et le proxy).
 */
export const TABLE_ARTISANS = "reseau_artisans";
export const TABLE_DOCUMENTS = "reseau_documents";
export { BUCKET_ARTISANS } from "@/lib/reseau/candidature";

/**
 * La candidature d'un compte, ou null s'il n'en a pas. Une lecture qui ÉCHOUE lève une erreur au lieu de répondre
 * null : sinon un artisan déjà validé, le temps d'une panne, passerait pour un nouveau venu et pourrait renvoyer une
 * candidature par-dessus la sienne.
 */
export async function candidatureDe(userId: string): Promise<Artisan | null> {
  const { data, error } = await supabaseAdmin().from(TABLE_ARTISANS).select(COLONNES_ARTISAN).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? lireArtisan(data as Record<string, unknown>) : null;
}

/** Les documents déposés par un compte, les plus anciens d'abord. */
export async function documentsDe(userId: string): Promise<DocumentArtisan[]> {
  const { data, error } = await supabaseAdmin()
    .from(TABLE_DOCUMENTS)
    .select("id, type, chemin, nom, taille, mime, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map(lireDocument);
}

/** URL signées (10 minutes) pour ouvrir des fichiers du stockage privé ; chemin → URL. */
export async function urlsSignees(chemins: string[], secondes = 600): Promise<Map<string, string>> {
  if (!chemins.length) return new Map();
  const { data } = await supabaseAdmin().storage.from(BUCKET_ARTISANS).createSignedUrls(chemins, secondes);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl as string]));
}

export type ArtisanListe = Artisan & { nbPhotos: number; nbDecennales: number };

/** Toutes les candidatures (admin), les plus récentes d'abord, avec le compte de leurs documents. Mémorisée le temps d'une requête. */
export const listArtisansAdmin = cache(async (): Promise<ArtisanListe[]> => {
  const sb = supabaseAdmin();
  const [{ data, error }, docs] = await Promise.all([
    sb.from(TABLE_ARTISANS).select(COLONNES_ARTISAN).order("soumise_le", { ascending: false }).limit(1000),
    sb.from(TABLE_DOCUMENTS).select("user_id, type").limit(20000),
  ]);
  if (error) throw new Error(error.message);
  const compte = new Map<string, { photo: number; decennale: number }>();
  for (const d of (docs.data ?? []) as { user_id: string; type: string }[]) {
    const c = compte.get(d.user_id) ?? { photo: 0, decennale: 0 };
    if (d.type === "photo") c.photo++;
    if (d.type === "decennale") c.decennale++;
    compte.set(d.user_id, c);
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const a = lireArtisan(r);
    const c = compte.get(a.userId);
    return { ...a, nbPhotos: c?.photo ?? 0, nbDecennales: c?.decennale ?? 0 };
  });
});

/** Une candidature (admin) avec ses documents, chacun avec une URL signée pour l'ouvrir. */
export async function getArtisanAdmin(id: string): Promise<{ artisan: Artisan; documents: (DocumentArtisan & { url: string | null })[] } | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data } = await supabaseAdmin().from(TABLE_ARTISANS).select(COLONNES_ARTISAN).eq("id", id).maybeSingle();
  if (!data) return null;
  const artisan = lireArtisan(data as Record<string, unknown>);
  const docs = await documentsDe(artisan.userId);
  const urls = await urlsSignees(docs.map((d) => d.chemin));
  return { artisan, documents: docs.map((d) => ({ ...d, url: urls.get(d.chemin) ?? null })) };
}

/**
 * Vide le dossier d'un compte dans le stockage privé (attestations, photos). La suppression du compte efface les lignes
 * en cascade, pas les fichiers : appelée AVANT (lib/actions/compte.ts), comme le promet la politique de confidentialité.
 */
export async function supprimerFichiersArtisan(userId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return;
  const st = supabaseAdmin().storage.from(BUCKET_ARTISANS);
  // Le dossier de candidature (attestations, photos de chantiers) et les photos de ses demandes de devis.
  for (const dossier of [`${userId}/decennale`, `${userId}/rc_pro`, `${userId}/photo`, `demandes/${userId}`]) {
    const { data } = await st.list(dossier, { limit: 1000 });
    const chemins = (data ?? []).filter((o) => o.name).map((o) => `${dossier}/${o.name}`);
    if (chemins.length) await st.remove(chemins);
  }
}

/* ─── Phase 2 : les demandes de devis (migration 0008) ─────────────────────── */

export const TABLE_DEMANDES = "reseau_demandes";
export const TABLE_MER = "reseau_mises_en_relation";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Les artisans qu'un client peut choisir : validés, décennale en cours, qui interviennent dans son département et font
 * au moins un des métiers demandés (« tous corps d'état » fait tout). Dans l'ordre équitable (`ordreEquitable`), avec 3
 * photos de chantiers au plus chacun. JAMAIS leurs coordonnées : elles ne passent au client qu'après acceptation.
 */
export async function artisansDisponibles(departement: string, metiers: string[], clientId: string): Promise<ArtisanPropose[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from(TABLE_ARTISANS)
    .select("id, user_id, raison_sociale, nom_commercial, metiers, presentation, rge, site_web, lien_avis")
    .eq("statut", "valide")
    // Un client qui est lui-même artisan du réseau ne se voit pas dans sa propre liste.
    .neq("user_id", clientId)
    .contains("departements", [departement])
    .overlaps("metiers", [...new Set([...metiers, "tce"])])
    .gte("decennale_fin", aujourdhuiParis())
    .limit(200);
  if (error) throw new Error(error.message);
  const lignes = (data ?? []) as { id: string; user_id: string; raison_sociale: string; nom_commercial: string | null; metiers: string[]; presentation: string | null; rge: boolean; site_web: string | null; lien_avis: string | null }[];
  if (!lignes.length) return [];
  // Le nombre de demandes reçues par chacun (pour l'ordre équitable), compté en SQL : une lecture de lignes serait
  // tronquée à 1 000 par Supabase. Une erreur coupe tout (migration 0008 absente…) au lieu d'afficher une liste
  // qu'on ne pourrait pas envoyer.
  const [{ data: comptes, error: errComptes }, { data: docs }] = await Promise.all([
    sb.rpc("reseau_compte_demandes", { ids: lignes.map((l) => l.id) }),
    sb.from(TABLE_DOCUMENTS).select("user_id, chemin").eq("type", "photo").in("user_id", lignes.map((l) => l.user_id)).order("created_at", { ascending: true }).limit(1000),
  ]);
  if (errComptes) throw new Error(errComptes.message);
  const recues = new Map<string, number>();
  for (const c of (comptes ?? []) as { artisan_id: string; n: number }[]) recues.set(c.artisan_id, Number(c.n) || 0);
  const photosPar = new Map<string, string[]>();
  for (const d of (docs ?? []) as { user_id: string; chemin: string }[]) {
    const p = photosPar.get(d.user_id) ?? [];
    if (p.length < 3) photosPar.set(d.user_id, [...p, d.chemin]);
  }
  const ordonnes = ordreEquitable(lignes, recues, clientId).slice(0, 30);
  const urls = await urlsSignees(ordonnes.flatMap((l) => photosPar.get(l.user_id) ?? []));
  return ordonnes.map((l) => ({
    id: l.id,
    nom: l.nom_commercial || l.raison_sociale,
    metiers: l.metiers,
    presentation: l.presentation,
    rge: l.rge,
    siteWeb: l.site_web,
    lienAvis: l.lien_avis,
    photos: (photosPar.get(l.user_id) ?? []).map((c) => urls.get(c)).filter((u): u is string => !!u),
  }));
}

type LigneDemande = {
  id: string; client_id: string; projet_id: string | null; metiers: string[]; code_postal: string; departement: string; ville: string | null;
  description: string | null; quantites: string | null; delai: string | null; photos: string[]; estimation: EstimationJointe | null;
  prenom: string; telephone: string; email: string; created_at: string;
  /** Phase 3 (migration 0009) : l'adresse du chantier, montrée seulement à l'artisan qui accepte. */
  adresse: string | null;
};
const COLONNES_DEMANDE = "id, client_id, projet_id, metiers, code_postal, departement, ville, adresse, description, quantites, delai, photos, estimation, prenom, telephone, email, created_at";
type LigneMer = {
  id: string; demande_id: string; artisan_id: string; statut: StatutMiseEnRelation; envoyee_le: string; repondu_le: string | null;
  devis_envoye_le: string | null; issue: Issue | null; avis_note: number | null; avis_commentaire: string | null; avis_le: string | null;
};
const COLONNES_MER = "id, demande_id, artisan_id, statut, envoyee_le, repondu_le, devis_envoye_le, issue, avis_note, avis_commentaire, avis_le";

export type ReponseArtisan = {
  miseId: string; statut: StatutMiseEnRelation; reponduLe: string | null;
  /** Phase 3 : le devis annoncé par l'artisan, l'issue et l'avis donnés par le client. */
  devisEnvoyeLe: string | null; issue: Issue | null; avis: { note: number; commentaire: string | null } | null;
  artisan: { id: string; nom: string; metiers: string[] };
  /** Seulement si l'artisan a ACCEPTÉ. */
  contact: { nom: string; telephone: string; email: string } | null;
};
export type DemandeClient = Omit<LigneDemande, "client_id" | "photos"> & { photos: string[]; reponses: ReponseArtisan[] };

/** Les demandes d'un client (sa session), les plus récentes d'abord, avec la réponse de chaque artisan choisi. */
export async function demandesDuClient(clientId: string): Promise<DemandeClient[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from(TABLE_DEMANDES).select(COLONNES_DEMANDE).eq("client_id", clientId).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  const demandes = (data ?? []) as LigneDemande[];
  if (!demandes.length) return [];
  const { data: merData } = await sb.from(TABLE_MER).select(COLONNES_MER).in("demande_id", demandes.map((d) => d.id));
  const mer = (merData ?? []) as LigneMer[];
  const ids = [...new Set(mer.map((m) => m.artisan_id))];
  const { data: arts } = ids.length
    ? await sb.from(TABLE_ARTISANS).select("id, raison_sociale, nom_commercial, metiers, contact_nom, telephone, email").in("id", ids)
    : { data: [] };
  const parId = new Map(((arts ?? []) as { id: string; raison_sociale: string; nom_commercial: string | null; metiers: string[]; contact_nom: string; telephone: string; email: string }[]).map((a) => [a.id, a]));
  const urls = await urlsSignees(demandes.flatMap((d) => d.photos ?? []), 3600);
  return demandes.map(({ client_id: _c, ...d }) => ({
    ...d,
    photos: (d.photos ?? []).map((c) => urls.get(c)).filter((u): u is string => !!u),
    reponses: mer.filter((m) => m.demande_id === d.id).map((m) => {
      const a = parId.get(m.artisan_id);
      return {
        miseId: m.id, statut: m.statut, reponduLe: m.repondu_le,
        devisEnvoyeLe: m.devis_envoye_le, issue: m.issue, avis: m.avis_note ? { note: m.avis_note, commentaire: m.avis_commentaire } : null,
        artisan: { id: m.artisan_id, nom: a ? a.nom_commercial || a.raison_sociale : "Artisan", metiers: a?.metiers ?? [] },
        contact: m.statut === "acceptee" && a ? { nom: a.contact_nom, telephone: a.telephone, email: a.email } : null,
      };
    }),
  }));
}

export type DemandeRecue = {
  miseId: string; statut: StatutMiseEnRelation; envoyeeLe: string; reponduLe: string | null;
  devisEnvoyeLe: string | null;
  /** Le client a signé avec lui (le reste de l'issue et l'avis ne lui sont pas montrés). */
  signe: boolean;
  demande: Omit<LigneDemande, "client_id" | "prenom" | "telephone" | "email" | "photos" | "projet_id" | "adresse"> & { photos: string[] };
  /** Les coordonnées du client et l'adresse du chantier : seulement si l'artisan a ACCEPTÉ. */
  client: { prenom: string; telephone: string; email: string; adresse: string | null } | null;
};

/** Les demandes reçues par un artisan (son id vient de SA candidature, lue par la session), les plus récentes d'abord. */
export async function demandesRecues(artisanId: string): Promise<DemandeRecue[]> {
  if (!UUID_RE.test(artisanId)) return [];
  const sb = supabaseAdmin();
  const { data, error } = await sb.from(TABLE_MER).select(COLONNES_MER).eq("artisan_id", artisanId).order("envoyee_le", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  const mer = (data ?? []) as LigneMer[];
  if (!mer.length) return [];
  const { data: dem } = await sb.from(TABLE_DEMANDES).select(COLONNES_DEMANDE).in("id", mer.map((m) => m.demande_id));
  const parId = new Map(((dem ?? []) as LigneDemande[]).map((d) => [d.id, d]));
  const urls = await urlsSignees([...parId.values()].flatMap((d) => d.photos ?? []), 3600);
  return mer.flatMap((m) => {
    const d = parId.get(m.demande_id);
    if (!d) return [];
    const { client_id: _c, prenom, telephone, email, photos, projet_id: _p, adresse, ...reste } = d;
    return [{
      miseId: m.id, statut: m.statut, envoyeeLe: m.envoyee_le, reponduLe: m.repondu_le,
      devisEnvoyeLe: m.devis_envoye_le, signe: m.statut === "acceptee" && m.issue === "signe",
      demande: { ...reste, photos: (photos ?? []).map((c) => urls.get(c)).filter((u): u is string => !!u) },
      client: m.statut === "acceptee" ? { prenom, telephone, email, adresse: adresse ?? null } : null,
    }];
  });
}

export type DemandeAdmin = LigneDemande & { reponses: { artisanId: string; nom: string; statut: StatutMiseEnRelation; issue: Issue | null; avisNote: number | null }[] };

/** Toutes les demandes (admin), les plus récentes d'abord. Mémorisée le temps d'une requête. */
export const listDemandesDevisAdmin = cache(async (): Promise<DemandeAdmin[]> => {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from(TABLE_DEMANDES).select(COLONNES_DEMANDE).order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  const demandes = (data ?? []) as LigneDemande[];
  if (!demandes.length) return [];
  const { data: merData } = await sb.from(TABLE_MER).select(COLONNES_MER).in("demande_id", demandes.map((d) => d.id));
  const mer = (merData ?? []) as LigneMer[];
  const ids = [...new Set(mer.map((m) => m.artisan_id))];
  const { data: arts } = ids.length ? await sb.from(TABLE_ARTISANS).select("id, raison_sociale, nom_commercial").in("id", ids) : { data: [] };
  const noms = new Map(((arts ?? []) as { id: string; raison_sociale: string; nom_commercial: string | null }[]).map((a) => [a.id, a.nom_commercial || a.raison_sociale]));
  return demandes.map((d) => ({
    ...d,
    reponses: mer.filter((m) => m.demande_id === d.id).map((m) => ({ artisanId: m.artisan_id, nom: noms.get(m.artisan_id) ?? "Artisan", statut: m.statut, issue: m.issue, avisNote: m.avis_note })),
  }));
});

export type StatsArtisan = {
  recues: number; acceptees: number; refusees: number; expirees: number; devisEnvoyes: number; signees: number;
  noteMoyenne: number | null; avis: { note: number; commentaire: string | null; le: string; prenom: string }[];
};

/** Le bilan d'un artisan (fiche admin) : réponses, devis, signatures, avis des clients. Comptes exacts (pas de lecture tronquée). */
export async function statsMisesEnRelation(artisanId: string): Promise<StatsArtisan> {
  const vide: StatsArtisan = { recues: 0, acceptees: 0, refusees: 0, expirees: 0, devisEnvoyes: 0, signees: 0, noteMoyenne: null, avis: [] };
  if (!UUID_RE.test(artisanId)) return vide;
  const sb = supabaseAdmin();
  const compte = (f: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => f(base()).then((r) => r.count ?? 0);
  function base() { return sb.from(TABLE_MER).select("id", { count: "exact", head: true }).eq("artisan_id", artisanId); }
  const [recues, acceptees, refusees, expirees, devisEnvoyes, signees, { data: avisData }] = await Promise.all([
    compte((q) => q), compte((q) => q.eq("statut", "acceptee")), compte((q) => q.eq("statut", "refusee")), compte((q) => q.eq("statut", "expiree")),
    compte((q) => q.not("devis_envoye_le", "is", null)), compte((q) => q.eq("issue", "signe")),
    sb.from(TABLE_MER).select("demande_id, avis_note, avis_commentaire, avis_le").eq("artisan_id", artisanId).not("avis_note", "is", null).order("avis_le", { ascending: false }).limit(200),
  ]);
  const lignes = (avisData ?? []) as { demande_id: string; avis_note: number; avis_commentaire: string | null; avis_le: string }[];
  const { data: dem } = lignes.length ? await sb.from(TABLE_DEMANDES).select("id, prenom").in("id", lignes.map((l) => l.demande_id)) : { data: [] };
  const prenoms = new Map(((dem ?? []) as { id: string; prenom: string }[]).map((d) => [d.id, d.prenom]));
  return {
    recues, acceptees, refusees, expirees, devisEnvoyes, signees,
    noteMoyenne: lignes.length ? Math.round((lignes.reduce((a, l) => a + l.avis_note, 0) / lignes.length) * 10) / 10 : null,
    avis: lignes.map((l) => ({ note: l.avis_note, commentaire: l.avis_commentaire, le: l.avis_le, prenom: prenoms.get(l.demande_id) ?? "Client" })),
  };
}
