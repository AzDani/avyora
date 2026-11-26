import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BUCKET_ARTISANS, aujourdhuiParis } from "@/lib/reseau/candidature";
import { ordreEquitable, resumeDevisClient, type ArtisanPropose, type ResumeDevisClient, type EstimationJointe, type Issue, type StatutMiseEnRelation } from "@/lib/reseau/demande";
import { COLONNES_ARTISAN, lireArtisan, lireDocument, type Artisan, type DocumentArtisan } from "@/lib/reseau/artisan";
import { typeCompte } from "@/lib/compte/type";
import { lireMaj, resumeNotes, type MajDemandee, type ResumeNotes, type StatutAvis, type StatutReponse } from "@/lib/reseau/avis";

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
  // Le dossier de candidature (attestations, photos de chantiers), sa galerie, les photos de ses demandes de devis et de ses avis.
  for (const dossier of [`${userId}/decennale`, `${userId}/rc_pro`, `${userId}/photo`, `${userId}/galerie`, `demandes/${userId}`, `avis/${userId}`]) {
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
    // Masqué du réseau (0013) : plus proposé aux clients.
    .is("masque_le", null)
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
  const [urls, resumes, { data: reals }] = await Promise.all([
    urlsSignees(ordonnes.flatMap((l) => photosPar.get(l.user_id) ?? [])),
    // Les avis publiés et la galerie (migration 0012) : une panne ne bloque pas le choix des artisans.
    resumesAvis(ordonnes.map((l) => l.id)).catch(() => new Map<string, ResumeNotes>()),
    Promise.resolve()
      .then(() => sb.from(TABLE_REALISATIONS).select("artisan_id").in("artisan_id", ordonnes.map((l) => l.id)).is("retiree_le", null).limit(5000))
      .catch(() => ({ data: [] as { artisan_id: string }[] })),
  ]);
  const nbReal = new Map<string, number>();
  for (const r of (reals ?? []) as { artisan_id: string }[]) nbReal.set(r.artisan_id, (nbReal.get(r.artisan_id) ?? 0) + 1);
  return ordonnes.map((l) => ({
    id: l.id,
    nom: l.nom_commercial || l.raison_sociale,
    metiers: l.metiers,
    presentation: l.presentation,
    rge: l.rge,
    siteWeb: l.site_web,
    lienAvis: l.lien_avis,
    photos: (photosPar.get(l.user_id) ?? []).map((c) => urls.get(c)).filter((u): u is string => !!u),
    note: resumes.get(l.id)?.moyenne ?? null,
    nbAvis: resumes.get(l.id)?.n ?? 0,
    nbRealisations: nbReal.get(l.id) ?? 0,
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
  /** Avis publics (migration 0012). `avis_statut` vide = ancien avis privé (avant le 25/11/2026), jamais publié. */
  avis_statut: StatutAvis | null; avis_mois: string | null; avis_photos: string[] | null; avis_auteur: string | null; avis_motif: string | null;
  avis_publie_le: string | null; avis_signale_le: string | null; avis_signalement: string | null;
  reponse_texte: string | null; reponse_statut: StatutReponse | null; reponse_le: string | null; reponse_motif: string | null;
};
const COLONNES_MER = "id, demande_id, artisan_id, statut, envoyee_le, repondu_le, devis_envoye_le, issue, avis_note, avis_commentaire, avis_le, avis_statut, avis_mois, avis_photos, avis_auteur, avis_motif, avis_publie_le, avis_signale_le, avis_signalement, reponse_texte, reponse_statut, reponse_le, reponse_motif";

export type ReponseArtisan = {
  miseId: string; statut: StatutMiseEnRelation; reponduLe: string | null;
  /** Phase 3 : le devis annoncé par l'artisan, l'issue et l'avis donnés par le client. */
  devisEnvoyeLe: string | null; issue: Issue | null; avis: AvisClient | null;
  artisan: { id: string; nom: string; metiers: string[] };
  /** Seulement si l'artisan a ACCEPTÉ. */
  contact: { nom: string; telephone: string; email: string } | null;
};
/** L'avis du client sur un artisan, tel qu'il le revoit dans le suivi de sa demande. */
export type AvisClient = {
  note: number; commentaire: string | null; statut: StatutAvis | null; motif: string | null; mois: string | null;
  photos: { chemin: string; url: string | null }[]; publieLe: string | null;
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
  const [urls, urlsAvis] = await Promise.all([
    urlsSignees(demandes.flatMap((d) => d.photos ?? []), 3600),
    urlsSignees(mer.flatMap((m) => m.avis_photos ?? []), 3600),
  ]);
  return demandes.map(({ client_id: _c, ...d }) => ({
    ...d,
    photos: (d.photos ?? []).map((c) => urls.get(c)).filter((u): u is string => !!u),
    reponses: mer.filter((m) => m.demande_id === d.id).map((m) => {
      const a = parId.get(m.artisan_id);
      return {
        miseId: m.id, statut: m.statut, reponduLe: m.repondu_le,
        devisEnvoyeLe: m.devis_envoye_le, issue: m.issue,
        // Un avis retiré (effacé) reste connu par son statut : le client voit « retiré », pas « Donner mon avis ».
        avis: m.avis_note || m.avis_statut
          ? {
              note: m.avis_note ?? 0, commentaire: m.avis_commentaire, statut: m.avis_statut, motif: m.avis_motif, mois: m.avis_mois,
              photos: (m.avis_photos ?? []).map((c) => ({ chemin: c, url: urlsAvis.get(c) ?? null })), publieLe: m.avis_publie_le,
            }
          : null,
        artisan: { id: m.artisan_id, nom: a ? a.nom_commercial || a.raison_sociale : "Artisan", metiers: a?.metiers ?? [] },
        contact: m.statut === "acceptee" && a ? { nom: a.contact_nom, telephone: a.telephone, email: a.email } : null,
      };
    }),
  }));
}

export type DemandeRecue = {
  miseId: string; statut: StatutMiseEnRelation; envoyeeLe: string; reponduLe: string | null;
  devisEnvoyeLe: string | null;
  /** Le client a signé avec lui. */
  signe: boolean;
  /** Le client a choisi un autre artisan (montré à l'artisan depuis le 25/11/2026). */
  nonRetenu: boolean;
  /** Où en est le client (devis reçu, signé, pas retenu), seulement sur une demande acceptée. */
  issue: Issue | null;
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
      devisEnvoyeLe: m.devis_envoye_le, signe: m.statut === "acceptee" && m.issue === "signe", nonRetenu: m.statut === "acceptee" && m.issue === "non_retenu", issue: m.statut === "acceptee" ? m.issue : null,
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

/* ─── Avis publics et galerie (migration 0012, décisions du 25/11/2026) ─────────── */

export const TABLE_REALISATIONS = "reseau_realisations";

/** La commune d'une adresse du répertoire (« 923 ROUTE … 33620 MARCENAIS » → « Marcenais ») : jamais la rue. */
export function communeDe(adresse?: string | null, codePostal?: string | null): string | null {
  const a = String(adresse ?? "");
  const cp = String(codePostal ?? "");
  const i = cp ? a.lastIndexOf(cp) : -1;
  const brut = (i >= 0 ? a.slice(i + cp.length) : a.split(/\b\d{5}\b/).pop() ?? "").trim();
  if (!brut) return null;
  return brut.toLocaleLowerCase("fr-FR").replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toLocaleUpperCase("fr-FR")).slice(0, 80);
}

export type AvisPublic = {
  id: string; auteur: string; note: number; texte: string; mois: string | null; publieLe: string;
  photos: string[]; reponse: { texte: string; le: string } | null;
};

/** Les avis PUBLIÉS sur un artisan, du plus récent au plus ancien, avec leurs photos (URL signées 1 h). */
export async function avisPublies(artisanId: string, limite = 200): Promise<AvisPublic[]> {
  if (!UUID_RE.test(artisanId)) return [];
  const { data, error } = await supabaseAdmin()
    .from(TABLE_MER)
    .select(COLONNES_MER)
    .eq("artisan_id", artisanId)
    .eq("avis_statut", "publie")
    .order("avis_publie_le", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  const lignes = (data ?? []) as LigneMer[];
  const urls = await urlsSignees(lignes.flatMap((l) => l.avis_photos ?? []), 3600);
  return lignes.map((l) => ({
    id: l.id, auteur: l.avis_auteur || "Client", note: l.avis_note ?? 0, texte: l.avis_commentaire ?? "", mois: l.avis_mois,
    publieLe: l.avis_publie_le ?? l.avis_le ?? "",
    photos: (l.avis_photos ?? []).map((c) => urls.get(c)).filter((u): u is string => !!u),
    reponse: l.reponse_statut === "publie" && l.reponse_texte ? { texte: l.reponse_texte, le: l.reponse_le ?? "" } : null,
  }));
}

/** La note moyenne et la répartition des avis publiés de plusieurs artisans (id → résumé). */
export async function resumesAvis(ids: string[]): Promise<Map<string, ResumeNotes>> {
  const ok = ids.filter((i) => UUID_RE.test(i));
  const out = new Map<string, ResumeNotes>(ok.map((i) => [i, resumeNotes([])]));
  if (!ok.length) return out;
  const { data, error } = await supabaseAdmin().from(TABLE_MER).select("artisan_id, avis_note").in("artisan_id", ok).eq("avis_statut", "publie").limit(10000);
  if (error) throw new Error(error.message);
  const notes = new Map<string, number[]>();
  for (const r of (data ?? []) as { artisan_id: string; avis_note: number }[]) notes.set(r.artisan_id, [...(notes.get(r.artisan_id) ?? []), r.avis_note]);
  for (const [id, n] of notes) out.set(id, resumeNotes(n));
  return out;
}

export type Realisation = {
  id: string; artisanId: string; titre: string; description: string; ville: string | null; mois: string | null;
  photos: { chemin: string; url: string | null }[]; creeLe: string; retireeLe: string | null; retireeMotif: string | null;
};
type LigneRealisation = {
  id: string; artisan_id: string; titre: string; description: string; ville: string | null; mois: string | null; photos: string[];
  created_at: string; retiree_le: string | null; retiree_motif: string | null;
};
const COLONNES_REAL = "id, artisan_id, titre, description, ville, mois, photos, created_at, retiree_le, retiree_motif";

async function lireRealisations(lignes: LigneRealisation[]): Promise<Realisation[]> {
  const urls = await urlsSignees(lignes.flatMap((l) => l.photos ?? []), 3600);
  return lignes.map((l) => ({
    id: l.id, artisanId: l.artisan_id, titre: l.titre, description: l.description, ville: l.ville, mois: l.mois,
    photos: (l.photos ?? []).map((c) => ({ chemin: c, url: urls.get(c) ?? null })), creeLe: l.created_at, retireeLe: l.retiree_le, retireeMotif: l.retiree_motif,
  }));
}

/** La galerie d'un artisan, les plus récentes d'abord ; `toutes` garde les réalisations retirées par Daniel (son espace). */
export async function realisationsDe(artisanId: string, opts: { toutes?: boolean } = {}): Promise<Realisation[]> {
  if (!UUID_RE.test(artisanId)) return [];
  let q = supabaseAdmin().from(TABLE_REALISATIONS).select(COLONNES_REAL).eq("artisan_id", artisanId).order("created_at", { ascending: false }).limit(200);
  if (!opts.toutes) q = q.is("retiree_le", null);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return lireRealisations((data ?? []) as LigneRealisation[]);
}

/** Les dernières réalisations publiées, tous artisans (admin : pour en retirer une). */
export async function realisationsRecentes(limite = 30): Promise<(Realisation & { artisanNom: string })[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from(TABLE_REALISATIONS).select(COLONNES_REAL).is("retiree_le", null).order("created_at", { ascending: false }).limit(limite);
  if (error) throw new Error(error.message);
  const lignes = (data ?? []) as LigneRealisation[];
  const ids = [...new Set(lignes.map((l) => l.artisan_id))];
  const { data: arts } = ids.length ? await sb.from(TABLE_ARTISANS).select("id, raison_sociale, nom_commercial").in("id", ids) : { data: [] };
  const noms = new Map(((arts ?? []) as { id: string; raison_sociale: string; nom_commercial: string | null }[]).map((a) => [a.id, a.nom_commercial || a.raison_sociale]));
  return (await lireRealisations(lignes)).map((r) => ({ ...r, artisanNom: noms.get(r.artisanId) ?? "Artisan" }));
}

export type ArtisanPublic = {
  id: string; nom: string; metiers: string[]; departements: string[]; commune: string | null; presentation: string | null;
  siteWeb: string | null; rge: boolean; valideLe: string | null; resume: ResumeNotes; nbRealisations: number;
};

/**
 * Les artisans du réseau visibles par les membres Pro (onglet « Avis artisans ») : validés, décennale en cours ;
 * filtrés par département et métier (« tous corps d'état » fait tout), les mieux notés d'abord, puis par nombre d'avis.
 * Jamais leurs coordonnées : elles ne passent qu'après une demande acceptée.
 */
export async function artisansPublics(filtre: { departement?: string | null; metier?: string | null } = {}): Promise<ArtisanPublic[]> {
  const sb = supabaseAdmin();
  let q = sb
    .from(TABLE_ARTISANS)
    .select("id, raison_sociale, nom_commercial, metiers, departements, presentation, site_web, rge, valide_le, siret_verif")
    .eq("statut", "valide")
    .is("masque_le", null)
    .gte("decennale_fin", aujourdhuiParis())
    .limit(500);
  if (filtre.departement) q = q.contains("departements", [filtre.departement]);
  if (filtre.metier) q = q.overlaps("metiers", [...new Set([filtre.metier, "tce"])]);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const lignes = (data ?? []) as { id: string; raison_sociale: string; nom_commercial: string | null; metiers: string[]; departements: string[]; presentation: string | null; site_web: string | null; rge: boolean; valide_le: string | null; siret_verif: { adresse?: string; codePostal?: string } | null }[];
  if (!lignes.length) return [];
  const ids = lignes.map((l) => l.id);
  const [resumes, { data: reals }] = await Promise.all([
    resumesAvis(ids),
    sb.from(TABLE_REALISATIONS).select("artisan_id").in("artisan_id", ids).is("retiree_le", null).limit(10000),
  ]);
  const nbReal = new Map<string, number>();
  for (const r of (reals ?? []) as { artisan_id: string }[]) nbReal.set(r.artisan_id, (nbReal.get(r.artisan_id) ?? 0) + 1);
  return lignes
    .map((l) => ({
      id: l.id, nom: l.nom_commercial || l.raison_sociale, metiers: l.metiers, departements: l.departements,
      commune: communeDe(l.siret_verif?.adresse, l.siret_verif?.codePostal), presentation: l.presentation, siteWeb: l.site_web, rge: !!l.rge,
      valideLe: l.valide_le, resume: resumes.get(l.id) ?? resumeNotes([]), nbRealisations: nbReal.get(l.id) ?? 0,
    }))
    .sort((a, b) => (b.resume.moyenne ?? -1) - (a.resume.moyenne ?? -1) || b.resume.n - a.resume.n || a.nom.localeCompare(b.nom, "fr"));
}

/** La fiche publique (Pro) d'un artisan validé ; null s'il n'est pas (ou plus) dans le réseau, ou s'il en est masqué. */
export async function ficheArtisan(id: string): Promise<ArtisanPublic | null> {
  if (!UUID_RE.test(id)) return null;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from(TABLE_ARTISANS)
    .select("id, raison_sociale, nom_commercial, metiers, departements, presentation, site_web, rge, valide_le, siret_verif, statut")
    .eq("id", id)
    .eq("statut", "valide")
    .is("masque_le", null)
    .maybeSingle();
  if (!data) return null;
  const l = data as { id: string; raison_sociale: string; nom_commercial: string | null; metiers: string[]; departements: string[]; presentation: string | null; site_web: string | null; rge: boolean; valide_le: string | null; siret_verif: { adresse?: string; codePostal?: string } | null };
  const [resumes, { count }] = await Promise.all([
    resumesAvis([l.id]),
    sb.from(TABLE_REALISATIONS).select("id", { count: "exact", head: true }).eq("artisan_id", l.id).is("retiree_le", null),
  ]);
  return {
    id: l.id, nom: l.nom_commercial || l.raison_sociale, metiers: l.metiers, departements: l.departements,
    commune: communeDe(l.siret_verif?.adresse, l.siret_verif?.codePostal), presentation: l.presentation, siteWeb: l.site_web, rge: !!l.rge,
    valideLe: l.valide_le, resume: resumes.get(l.id) ?? resumeNotes([]), nbRealisations: count ?? 0,
  };
}

export type AvisRecu = AvisPublic & {
  statut: StatutAvis; signaleLe: string | null;
  /** La réponse de l'artisan, à tous ses stades (il la revoit en attente ou refusée, avec le motif). */
  maReponse: { texte: string; statut: StatutReponse; motif: string | null; le: string | null } | null;
};

/** Les avis reçus par un artisan (son espace) : publiés (avec sa réponse à tous ses stades) et le nombre en attente. */
export async function avisRecus(artisanId: string): Promise<{ publies: AvisRecu[]; enAttente: number }> {
  if (!UUID_RE.test(artisanId)) return { publies: [], enAttente: 0 };
  const sb = supabaseAdmin();
  const [{ data, error }, { count }] = await Promise.all([
    sb.from(TABLE_MER).select(COLONNES_MER).eq("artisan_id", artisanId).eq("avis_statut", "publie").order("avis_publie_le", { ascending: false }).limit(200),
    sb.from(TABLE_MER).select("id", { count: "exact", head: true }).eq("artisan_id", artisanId).eq("avis_statut", "en_attente"),
  ]);
  if (error) throw new Error(error.message);
  const lignes = (data ?? []) as LigneMer[];
  const urls = await urlsSignees(lignes.flatMap((l) => l.avis_photos ?? []), 3600);
  return {
    enAttente: count ?? 0,
    publies: lignes.map((l) => ({
      id: l.id, auteur: l.avis_auteur || "Client", note: l.avis_note ?? 0, texte: l.avis_commentaire ?? "", mois: l.avis_mois,
      publieLe: l.avis_publie_le ?? "", photos: (l.avis_photos ?? []).map((c) => urls.get(c)).filter((u): u is string => !!u),
      reponse: l.reponse_statut === "publie" && l.reponse_texte ? { texte: l.reponse_texte, le: l.reponse_le ?? "" } : null,
      statut: "publie" as const, signaleLe: l.avis_signale_le,
      maReponse: l.reponse_texte && l.reponse_statut ? { texte: l.reponse_texte, statut: l.reponse_statut, motif: l.reponse_motif, le: l.reponse_le } : null,
    })),
  };
}

export type AvisAModerer = {
  miseId: string; artisanId: string; artisanNom: string; auteur: string; note: number; texte: string; mois: string | null; envoyeLe: string;
  photos: string[]; demande: { creeLe: string; ville: string | null; codePostal: string; acceptee: string | null };
  signalement: { le: string; texte: string | null } | null;
};
export type ReponseAModerer = { miseId: string; artisanNom: string; auteur: string; note: number; texteAvis: string; reponse: string; le: string | null };

/** Ce qui attend Daniel (admin) : avis à valider, réponses d'artisans à valider, avis publiés signalés par l'artisan. */
export async function aModerer(): Promise<{ avis: AvisAModerer[]; reponses: ReponseAModerer[]; signales: AvisAModerer[]; publies: AvisAModerer[] }> {
  const sb = supabaseAdmin();
  const [a, r, s, p] = await Promise.all([
    sb.from(TABLE_MER).select(COLONNES_MER).eq("avis_statut", "en_attente").order("avis_le", { ascending: true }).limit(200),
    sb.from(TABLE_MER).select(COLONNES_MER).eq("reponse_statut", "en_attente").eq("avis_statut", "publie").order("reponse_le", { ascending: true }).limit(200),
    sb.from(TABLE_MER).select(COLONNES_MER).eq("avis_statut", "publie").not("avis_signale_le", "is", null).order("avis_signale_le", { ascending: true }).limit(200),
    // Les derniers avis publiés : pour en retirer un (demande de son auteur, erreur), 26/11/2026.
    sb.from(TABLE_MER).select(COLONNES_MER).eq("avis_statut", "publie").order("avis_publie_le", { ascending: false }).limit(50),
  ]);
  if (a.error) throw new Error(a.error.message);
  const toutes = [...((a.data ?? []) as LigneMer[]), ...((r.data ?? []) as LigneMer[]), ...((s.data ?? []) as LigneMer[]), ...((p.data ?? []) as LigneMer[])];
  const idsArt = [...new Set(toutes.map((m) => m.artisan_id))];
  const idsDem = [...new Set(toutes.map((m) => m.demande_id))];
  const [{ data: arts }, { data: dems }, urls] = await Promise.all([
    idsArt.length ? sb.from(TABLE_ARTISANS).select("id, raison_sociale, nom_commercial").in("id", idsArt) : Promise.resolve({ data: [] }),
    idsDem.length ? sb.from(TABLE_DEMANDES).select("id, created_at, ville, code_postal").in("id", idsDem) : Promise.resolve({ data: [] }),
    urlsSignees(toutes.flatMap((m) => m.avis_photos ?? []), 3600),
  ]);
  const noms = new Map(((arts ?? []) as { id: string; raison_sociale: string; nom_commercial: string | null }[]).map((x) => [x.id, x.nom_commercial || x.raison_sociale]));
  const demandes = new Map(((dems ?? []) as { id: string; created_at: string; ville: string | null; code_postal: string }[]).map((x) => [x.id, x]));
  const versAvis = (m: LigneMer): AvisAModerer => {
    const d = demandes.get(m.demande_id);
    return {
      miseId: m.id, artisanId: m.artisan_id, artisanNom: noms.get(m.artisan_id) ?? "Artisan", auteur: m.avis_auteur || "Client", note: m.avis_note ?? 0,
      texte: m.avis_commentaire ?? "", mois: m.avis_mois, envoyeLe: m.avis_le ?? "",
      photos: (m.avis_photos ?? []).map((c) => urls.get(c)).filter((u): u is string => !!u),
      demande: { creeLe: d?.created_at ?? "", ville: d?.ville ?? null, codePostal: d?.code_postal ?? "", acceptee: m.repondu_le },
      signalement: m.avis_signale_le ? { le: m.avis_signale_le, texte: m.avis_signalement } : null,
    };
  };
  return {
    avis: ((a.data ?? []) as LigneMer[]).map(versAvis),
    reponses: ((r.data ?? []) as LigneMer[]).map((m) => ({
      miseId: m.id, artisanNom: noms.get(m.artisan_id) ?? "Artisan", auteur: m.avis_auteur || "Client", note: m.avis_note ?? 0,
      texteAvis: m.avis_commentaire ?? "", reponse: m.reponse_texte ?? "", le: m.reponse_le,
    })),
    signales: ((s.data ?? []) as LigneMer[]).map(versAvis),
    publies: ((p.data ?? []) as LigneMer[]).map(versAvis),
  };
}

/** Combien de choses attendent Daniel côté avis (pastille du menu admin, tableau de bord). */
export async function compteAModerer(): Promise<number> {
  const sb = supabaseAdmin();
  const tete = () => sb.from(TABLE_MER).select("id", { count: "exact", head: true });
  const [a, r, s] = await Promise.all([
    tete().eq("avis_statut", "en_attente"),
    tete().eq("reponse_statut", "en_attente").eq("avis_statut", "publie"),
    tete().eq("avis_statut", "publie").not("avis_signale_le", "is", null),
  ]);
  return (a.count ?? 0) + (r.count ?? 0) + (s.count ?? 0);
}

/**
 * Pour l'en-tête : le compte est-il un artisan du réseau (candidature, ou compte pro qui peut encore postuler depuis le
 * 26/11/2026), et combien de demandes l'attendent ? Mémorisé par requête.
 */
export const etatArtisanEntete = cache(async (userId: string, comptePro = false): Promise<{ artisan: boolean; aRepondre: number; candidature: boolean }> => {
  if (!UUID_RE.test(userId)) return { artisan: false, aRepondre: 0, candidature: false };
  const sb = supabaseAdmin();
  const { data } = await sb.from(TABLE_ARTISANS).select("id, statut").eq("user_id", userId).maybeSingle();
  if (!data) return { artisan: comptePro, aRepondre: 0, candidature: false };
  if (data.statut !== "valide") return { artisan: true, aRepondre: 0, candidature: true };
  const { count } = await sb.from(TABLE_MER).select("id", { count: "exact", head: true }).eq("artisan_id", String(data.id)).eq("statut", "envoyee");
  return { artisan: true, aRepondre: count ?? 0, candidature: true };
});

/**
 * Le résumé des demandes de devis d'un client (26/11/2026) : pour le lien « Mes devis » de l'en-tête et sa pastille,
 * la carte de « Mes projets » et la fiche projet. null s'il n'a jamais demandé de devis. Mis en cache pour la requête
 * (l'en-tête, le menu mobile et la page le lisent sans refaire les lectures). `clientId` vient de getUser().
 */
export const resumeDevisDuClient = cache(async (clientId: string): Promise<ResumeDevisClient | null> => {
  if (!UUID_RE.test(clientId)) return null;
  const sb = supabaseAdmin();
  const { data, error } = await sb.from(TABLE_DEMANDES).select("id, projet_id").eq("client_id", clientId).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  const demandes = ((data ?? []) as { id: string; projet_id: string | null }[]).map((d) => ({ id: String(d.id), projetId: d.projet_id ? String(d.projet_id) : null }));
  if (!demandes.length) return null;
  const { data: mer, error: e2 } = await sb.from(TABLE_MER).select("demande_id, statut, repondu_le, avis_statut, avis_note").in("demande_id", demandes.map((d) => d.id));
  if (e2) throw new Error(e2.message);
  const lignes = ((mer ?? []) as { demande_id: string; statut: StatutMiseEnRelation; repondu_le: string | null; avis_statut: string | null; avis_note: number | null }[])
    .map((m) => ({ demandeId: String(m.demande_id), statut: m.statut, reponduLe: m.repondu_le, avisStatut: m.avis_statut, avisNote: m.avis_note }));
  return resumeDevisClient(demandes, lignes);
});

/** La mise à jour demandée par un artisan validé (nouvelle décennale, métiers, zone), ou null. */
export async function majDemandeeDe(artisanId: string): Promise<MajDemandee | null> {
  if (!UUID_RE.test(artisanId)) return null;
  const { data } = await supabaseAdmin().from(TABLE_ARTISANS).select("maj_demandee").eq("id", artisanId).maybeSingle();
  return lireMaj(data?.maj_demandee ?? null);
}

/**
 * Où arrive un compte qui se connecte sans intention précise (`next` = « /projets », la valeur par défaut) : un artisan
 * du réseau va sur son espace (25/11/2026), les autres sur leurs projets. Une intention précise est toujours gardée ;
 * une panne de lecture garde « /projets ».
 */
export async function arriveeApresConnexion(
  user: { id: string; app_metadata?: Record<string, unknown> | null } | null | undefined,
  next: string,
): Promise<string> {
  if (next !== "/projets" || !user) return next;
  // Un compte qui n'a pas encore dit s'il est particulier ou pro (comptes d'avant le 26/11/2026) : la question, une fois.
  if (!typeCompte(user)) return "/onboarding";
  try {
    return (await etatArtisanEntete(user.id)).candidature ? "/espace-artisan" : next;
  } catch {
    return next;
  }
}
