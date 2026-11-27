import type { AdminInscrit, AdminPlan } from "@/lib/data/admin";
import type { ArtisanListe, DemandeAdmin } from "@/lib/data/reseau";
import type { EnLigne, Journee } from "@/lib/presence";
import { depuis, nomPage, type DemandeAccompagnement } from "@/lib/admin/outils";
import { joursAvantFinDecennale } from "@/lib/reseau/artisan";
import { aujourdhuiParis } from "@/lib/reseau/candidature";
import { labelMetier } from "@/lib/reseau/metiers";
import { LIMITES_SUPABASE, LIMITES_VERCEL, SEUIL_ATTENTION, SEUIL_CRITIQUE, poids } from "@/lib/bureaux/limites";
import type { MesureServeurs } from "@/lib/bureaux/serveurs";
import { MODES_RDV, TYPES_RDV, heureParis, jourDepuisLundi, libelle, lundiParis, montant, parMois, totalMensuel, totalTexte, type Charge, type EntreesStripe, type RendezVous } from "@/lib/admin/gestion";

/**
 * Les bureaux virtuels (/admin/bureaux, 27/11/2026) : l'étage en 3D où chaque pièce est une activité d'AVYORA.
 * Ce fichier est PUR : il transforme ce que l'admin sait déjà lire (inscrits, plans, demandes, artisans, devis, présence)
 * en contenu de pièces. Rien ici ne lit la base ; `app/api/admin/bureaux/route.ts` fait les lectures.
 *
 * Une source illisible (null) ne fait pas tomber l'étage : sa pièce passe « pas encore en service » avec une ligne
 * qui le dit. Aucun montant n'est inventé : la comptabilité et le planning arrivent à l'étape suivante.
 * Tous les textes sont du texte brut : la page les échappe avant de les afficher.
 */

export type Etat = "critique" | "attention" | "bon" | "vide";
/** [titre, détail, couleur de la pastille, mot de la pastille] */
export type Ligne = [string, string, Etat, string];
export type IdPiece =
  | "accueil" | "accompagnement" | "reunion" | "projets" | "plan" | "attente" | "atelier" | "devis" | "bureau" | "marketing" | "caisse" | "archives" | "serveurs";

/** Une jauge de la salle des serveurs : part utilisée (0 à 1), ou null si elle ne se mesure pas encore. */
export type Jauge = { cle: string; hote: "Supabase" | "Vercel"; nom: string; part: number | null; texte: string };

export type PieceBureaux = {
  etat: Etat;
  /** Le chiffre de l'étiquette (0 = pas de chiffre). */
  nb: number;
  /** Jamais de montant « à aller chercher » tant qu'il ne vient pas d'une vraie vente. */
  euro: null;
  kpis: [string, string][];
  titre: string;
  liste: Ligne[];
  conseil: string;
  /** Combien de personnes la pièce montre (la page plafonne). */
  gens: number;
  /** La vraie page de l'admin derrière cette pièce. */
  lien: string | null;
  /** Salle des serveurs seulement : les jauges, dessinées sur l'écran mural. */
  jauges?: Jauge[];
};

export type DonneesBureaux = {
  genereLe: string;
  pieces: Record<IdPiece, PieceBureaux>;
  /** Les trois premières choses à faire : [pièce, texte, ce que ça apporte]. */
  priorites: [IdPiece, string, string][];
  /** Les rendez-vous de cette semaine et de la suivante, pour la salle de réunion : j = jours depuis le lundi (heure de France). */
  rdvs: RdvBureaux[];
};
export type RdvBureaux = { j: number; h: string; qui: string; quoi: string; mode: string; sujet: string; confirme: boolean; cr: "envoye" | "a_relire" | null };

export type SourcesBureaux = {
  inscrits: AdminInscrit[];
  plans: AdminPlan[] | null;
  demandes: DemandeAccompagnement[] | null;
  artisans: ArtisanListe[] | null;
  devis: DemandeAdmin[] | null;
  avisAModerer: number | null;
  enLigne: EnLigne | null;
  journee: Journee | null;
  /** La mesure des fichiers et de la base (lib/bureaux/serveurs.ts) ; null si elle n'a pas pu se faire. */
  serveurs?: MesureServeurs | null;
  /** Compta et planning (migration 0016, Stripe) : null si illisible ; absent = pas encore lu. */
  charges?: Charge[] | null;
  entrees?: EntreesStripe | null;
  rendezVous?: RendezVous[] | null;
  maintenant: Date;
};

const JOUR = 864e5;
/** À partir de combien de jours une attente devient un retard. */
export const RETARD_RAPPEL_J = 2;
export const RETARD_CANDIDATURE_J = 5;
/** Une demande de devis sans aucune réponse d'artisan au bout de ce délai est « sans réponse ». */
export const DEVIS_SANS_REPONSE_J = 2;

const s = (n: number) => (n > 1 ? "s" : "");
const joursDepuis = (iso: string, maintenant: Date) => Math.max(0, Math.floor((maintenant.getTime() - new Date(iso).getTime()) / JOUR));
const ilYA = (j: number) => (j === 0 ? "aujourd'hui" : j === 1 ? "depuis hier" : `depuis ${j} jours`);
const nomArtisan = (a: { nomCommercial: string | null; raisonSociale: string }) => a.nomCommercial || a.raisonSociale;

const piece = (p: Partial<PieceBureaux> & Pick<PieceBureaux, "etat" | "kpis" | "titre" | "liste" | "conseil">): PieceBureaux => ({ nb: 0, euro: null, gens: 0, lien: null, ...p });

/** Une pièce dont la source n'a pas pu être lue. */
const illisible = (quoi: string, kpis: [string, string][], lien: string | null): PieceBureaux =>
  piece({ etat: "vide", kpis, titre: "Lecture impossible", liste: [[quoi, "La lecture a échoué, la page réessaie dans une minute", "vide", "erreur"]], conseil: "Cette pièce reviendra toute seule dès que la lecture repasse.", lien });

export function construireBureaux(src: SourcesBureaux): DonneesBureaux {
  const { inscrits, plans, demandes, artisans, devis, avisAModerer, enLigne, journee, serveurs = null, charges = null, entrees = null, rendezVous = null, maintenant } = src;
  const jour = aujourdhuiParis(maintenant);
  const projets = inscrits.flatMap((i) => i.projets);
  const projets7 = projets.filter((p) => depuis([p.createdAt], 7, maintenant) === 1);

  // ── Accompagnement : les demandes de rappel pas encore traitées, les plus anciennes d'abord
  const aRappeler = (demandes ?? []).filter((d) => !d.traiteeLe).sort((a, b) => +new Date(a.recueLe) - +new Date(b.recueLe));
  const rappelsEnRetard = aRappeler.filter((d) => joursDepuis(d.recueLe, maintenant) >= RETARD_RAPPEL_J).length;
  const attenteRappel = aRappeler.length ? joursDepuis(aRappeler[0].recueLe, maintenant) : 0;
  const accompagnement = demandes === null
    ? illisible("Demandes de rappel", [["À rappeler", "—"], ["Reçues / 30 j", "—"], ["Attente max", "—"]], "/admin/accompagnement")
    : piece({
        etat: !aRappeler.length ? "bon" : rappelsEnRetard ? "critique" : "attention",
        nb: aRappeler.length,
        kpis: [["À rappeler", String(aRappeler.length)], ["Reçues / 30 j", String(depuis(demandes.map((d) => d.recueLe), 30, maintenant))], ["Attente max", aRappeler.length ? `${attenteRappel} j` : "—"]],
        titre: "À rappeler",
        liste: aRappeler.length
          ? aRappeler.slice(0, 5).map((d): Ligne => {
              const j = joursDepuis(d.recueLe, maintenant);
              return [d.prenom || d.email, [d.typeProjet, (d.besoins ?? [])[0], `demandé ${ilYA(j)}`].filter(Boolean).join(" · "), j >= RETARD_RAPPEL_J ? "critique" : "attention", j >= RETARD_RAPPEL_J ? "en retard" : "à rappeler"];
            })
          : [["Aucun rappel en attente", "Tout le monde a été rappelé", "bon", "à jour"]],
        conseil: aRappeler.length ? "Un rappel qui attend, c'est une vente qui refroidit. Commence ici." : "Rien n'attend ici : les prochaines demandes arriveront dans cette pièce.",
        gens: aRappeler.length,
        lien: "/admin/accompagnement",
      });

  // ── Projets : les inscrits et leurs estimations
  const sansType = inscrits.filter((i) => i.plan !== "admin" && !(i.profil?.tuEs ?? []).length).length;
  const parSorte = (nature: "reno" | "neuf", mode?: "rapide" | "detaille") => projets7.filter((p) => p.nature === nature && (!mode || p.mode === mode)).length;
  const ligneSorte = (nom: string, n: number): Ligne => [nom, `${n} estimation${s(n)} cette semaine`, n ? "bon" : "vide", n ? "cette semaine" : "aucune"];
  const inscrits7 = depuis(inscrits.map((i) => i.createdAt), 7, maintenant);
  const salleProjets = piece({
    etat: projets7.length ? "bon" : "attention",
    nb: projets7.length,
    kpis: [["Inscrits", String(inscrits.length)], ["Estimations / 7 j", String(projets7.length)], ["Sans « Tu es… »", String(sansType)]],
    titre: "Cette semaine",
    liste: [
      ligneSorte("Rénovation rapide", parSorte("reno", "rapide")),
      ligneSorte("Rénovation détaillée", parSorte("reno", "detaille")),
      ligneSorte("Construction neuve", parSorte("neuf")),
      ["Nouveaux inscrits", `${inscrits7} cette semaine`, inscrits7 ? "bon" : "vide", inscrits7 ? "cette semaine" : "aucun"],
    ],
    conseil: sansType ? `${sansType} compte${s(sansType)} n'${sansType > 1 ? "ont" : "a"} pas encore dit s'il${s(sansType)} ${sansType > 1 ? "sont" : "est"} particulier${s(sansType)} ou pro${s(sansType)}.` : "Tous les comptes ont rempli « Tu es… ».",
    gens: projets7.length,
    lien: "/admin/projets",
  });

  // ── Studio Plan 3D
  const studio = plans === null
    ? illisible("Plans", [["Plans dessinés", "—"], ["Cette semaine", "—"], ["Vers l'estimation", "—"]], "/admin/plans")
    : (() => {
        const crees7 = depuis(plans.map((p) => p.createdAt), 7, maintenant), repris7 = depuis(plans.map((p) => p.updatedAt), 7, maintenant);
        const estimes = plans.filter((p) => p.estimations.length > 0).length, faible = plans.length >= 3 && estimes * 3 < plans.length;
        return piece({
          etat: !plans.length ? "vide" : faible ? "attention" : "bon",
          nb: crees7,
          kpis: [["Plans dessinés", String(plans.length)], ["Cette semaine", String(crees7)], ["Vers l'estimation", String(estimes)]],
          titre: "Le parcours",
          liste: [
            ["Plans commencés", `${crees7} cette semaine`, crees7 ? "bon" : "vide", crees7 ? "ok" : "aucun"],
            ["Plans retravaillés", `${repris7} cette semaine`, repris7 ? "bon" : "vide", repris7 ? "ok" : "aucun"],
            ["Estimés depuis le plan", `${estimes} sur ${plans.length}`, faible ? "attention" : estimes ? "bon" : "vide", faible ? "faible" : estimes ? "ok" : "aucun"],
          ],
          conseil: faible ? "Peu de plans vont jusqu'à l'estimation : c'est le passage à améliorer." : "Le plan mène à l'estimation : c'est le chemin à garder fluide.",
          gens: repris7,
          lien: "/admin/plans",
        });
      })();

  // ── Salle d'attente : les candidatures d'artisans, les plus anciennes d'abord
  const enAttente = (artisans ?? []).filter((a) => a.statut === "en_attente").sort((a, b) => +new Date(a.soumiseLe) - +new Date(b.soumiseLe));
  const aCompleter = (artisans ?? []).filter((a) => a.statut === "a_completer");
  const candidaturesEnRetard = enAttente.filter((a) => joursDepuis(a.soumiseLe, maintenant) >= RETARD_CANDIDATURE_J).length;
  const zone = (a: { departements: string[] }) => ((a.departements ?? []).length ? `dép. ${a.departements.slice(0, 2).join(", ")}${a.departements.length > 2 ? "…" : ""}` : "zone non précisée");
  const attente = artisans === null
    ? illisible("Candidatures", [["À examiner", "—"], ["À compléter", "—"], ["Attente max", "—"]], "/admin/artisans")
    : piece({
        etat: candidaturesEnRetard ? "critique" : enAttente.length ? "attention" : "bon",
        nb: enAttente.length,
        kpis: [["À examiner", String(enAttente.length)], ["À compléter", String(aCompleter.length)], ["Attente max", enAttente.length ? `${joursDepuis(enAttente[0].soumiseLe, maintenant)} j` : "—"]],
        titre: enAttente.length ? "Ils attendent ta réponse" : "Les candidatures",
        liste: enAttente.length || aCompleter.length
          ? [
              ...enAttente.slice(0, 4).map((a): Ligne => {
                const j = joursDepuis(a.soumiseLe, maintenant);
                return [nomArtisan(a), `${zone(a)} · ${ilYA(j)}`, j >= RETARD_CANDIDATURE_J ? "critique" : "attention", a.appelLe ? "à examiner" : "à appeler"];
              }),
              ...aCompleter.slice(0, Math.max(1, 5 - Math.min(4, enAttente.length))).map((a): Ligne => [nomArtisan(a), `${zone(a)} · dossier renvoyé à l'artisan`, "vide", "à compléter"]),
            ]
          : [["Aucune candidature en attente", "Personne n'attend ta réponse", "bon", "à jour"]],
        conseil: enAttente.length ? "Un artisan qui attend une semaine va s'inscrire ailleurs." : "Plus d'artisans par département, c'est plus de demandes de devis satisfaites.",
        gens: enAttente.length + aCompleter.length,
        lien: "/admin/artisans",
      });

  // ── Atelier : les artisans validés
  const valides = (artisans ?? []).filter((a) => a.statut === "valide");
  const visibles = valides.filter((a) => !a.masqueLe), masques = valides.filter((a) => a.masqueLe);
  const decennales = valides.map((a) => ({ a, j: joursAvantFinDecennale(a.decennaleFin, jour) })).filter((x) => x.j <= 30).sort((x, y) => x.j - y.j);
  const expirees = decennales.filter((x) => x.j < 0).length;
  const majs = valides.filter((a) => a.majDemandee);
  const signales = new Set([...decennales.map((x) => x.a.id), ...majs.map((a) => a.id), ...masques.map((a) => a.id)]);
  const aJour = valides.filter((a) => !signales.has(a.id)).length;
  const atelier = artisans === null
    ? illisible("Artisans", [["Validés", "—"], ["Masqués", "—"], ["Décennales à refaire", "—"]], "/admin/artisans")
    : piece({
        etat: !valides.length ? "vide" : expirees ? "critique" : decennales.length || majs.length ? "attention" : "bon",
        nb: visibles.length,
        kpis: [["Validés", String(visibles.length)], ["Masqués", String(masques.length)], ["Décennales à refaire", String(decennales.length)]],
        titre: decennales.length || majs.length ? "À surveiller" : "Le réseau",
        liste: valides.length
          ? [
              ...decennales.slice(0, 3).map(({ a, j }): Ligne => [nomArtisan(a), j < 0 ? `Décennale expirée depuis ${-j} jour${s(-j)}` : j === 0 ? "Décennale expire aujourd'hui" : `Décennale expire dans ${j} jour${s(j)}`, j < 0 ? "critique" : "attention", "à relancer"]),
              ...majs.slice(0, 2).map((a): Ligne => [nomArtisan(a), "Mise à jour de sa fiche demandée", "attention", "à valider"]),
              ...masques.slice(0, 2).map((a): Ligne => [nomArtisan(a), "Masqué du réseau", "vide", "masqué"]),
              ...(aJour ? [[`${aJour} ${signales.size ? "autre" + s(aJour) + " " : ""}artisan${s(aJour)}`, "Dossier à jour", "bon", "ok"] as Ligne] : []),
            ].slice(0, 6)
          : [["Aucun artisan validé", "Le réseau commence par la salle d'attente", "vide", "vide"]],
        conseil: "Plus d'artisans par département, c'est plus de demandes de devis satisfaites.",
        gens: visibles.length,
        lien: "/admin/artisans",
      });

  // ── Salle des devis
  const devis30 = (devis ?? []).filter((d) => depuis([d.created_at], 30, maintenant) === 1);
  const sansArtisan = devis30.filter((d) => d.reponses.length === 0);
  const sansReponse = devis30.filter((d) => d.reponses.length > 0 && d.reponses.every((r) => r.statut === "envoyee") && joursDepuis(d.created_at, maintenant) >= DEVIS_SANS_REPONSE_J);
  const nbAvis = avisAModerer ?? 0;
  const ligneDevis = (d: DemandeAdmin): Ligne => {
    const repondu = d.reponses.filter((r) => r.statut !== "envoyee").length, n = d.reponses.length;
    const titre = `${(d.metiers ?? []).slice(0, 2).map(labelMetier).join(", ") || "Demande"} · ${d.ville || d.departement}`;
    if (!n) return [titre, `${d.prenom} · aucun artisan dans la zone`, "attention", "zone vide"];
    const calme = repondu === 0 && joursDepuis(d.created_at, maintenant) >= DEVIS_SANS_REPONSE_J;
    return [titre, `${d.prenom} · ${repondu} réponse${s(repondu)} sur ${n} artisan${s(n)}, ${ilYA(joursDepuis(d.created_at, maintenant))}`, calme ? "attention" : "bon", calme ? "à relancer" : repondu ? "ok" : "envoyée"];
  };
  const salleDevis = devis === null
    ? illisible("Demandes de devis", [["Demandes / 30 j", "—"], ["Sans réponse", "—"], ["Avis à modérer", nbAvis ? String(nbAvis) : "—"]], "/admin/devis")
    : piece({
        etat: nbAvis || sansArtisan.length || sansReponse.length ? "attention" : "bon",
        nb: devis30.length,
        kpis: [["Demandes / 30 j", String(devis30.length)], ["Sans réponse", String(sansArtisan.length + sansReponse.length)], ["Avis à modérer", String(nbAvis)]],
        titre: "En ce moment",
        liste: [
          ...(nbAvis ? [[`${nbAvis} avis à modérer`, "En attente de ta validation", "attention", "à publier"] as Ligne] : []),
          ...devis30.slice(0, nbAvis ? 4 : 5).map(ligneDevis),
          ...(!nbAvis && !devis30.length ? [["Aucune demande ce mois-ci", "Les demandes de devis arriveront ici", "vide", "calme"] as Ligne] : []),
        ],
        conseil: nbAvis ? "Un avis publié rassure le prochain client : valide-les vite." : "Chaque demande sans artisan montre un département où recruter.",
        gens: devis30.length,
        lien: nbAvis ? "/admin/avis" : "/admin/devis",
      });

  // ── Accueil : les visiteurs en ligne (un onglet ouvert sur le site dans les 90 dernières secondes)
  const inscritsDuJour = inscrits.filter((i) => aujourdhuiParis(new Date(i.createdAt)) === jour).length;
  const accueil = piece({
    etat: enLigne ? "bon" : "vide",
    nb: enLigne?.total ?? 0,
    kpis: [["En ce moment", enLigne ? String(enLigne.total) : "—"], ["Aujourd'hui", journee ? String(journee.total) : "—"], ["Inscrits du jour", String(inscritsDuJour)]],
    titre: "Où ils sont",
    liste: !enLigne
      ? [["Compteur en ligne", "Indisponible pour l'instant", "vide", "éteint"]]
      : enLigne.pages.length
        ? enLigne.pages.slice(0, 5).map((p): Ligne => [nomPage(p.chemin), `${p.n} visiteur${s(p.n)}`, "bon", "en direct"])
        : [["Personne en ce moment", "Le site est calme", "vide", "calme"]],
    conseil: "Un visiteur compté, c'est un onglet ouvert sur le site dans la dernière minute et demie. Toi, tu n'es pas compté.",
    gens: enLigne?.total ?? 0,
    lien: "/admin",
  });



  // ── Salle de réunion : les rendez-vous de cette semaine et de la suivante (heure de France)
  const lundi = lundiParis(maintenant);
  const rdvsActifs = (rendezVous ?? []).filter((r) => r.statut !== "annule").map((r) => ({ r, t: new Date(r.debut), j: jourDepuisLundi(new Date(r.debut), lundi) })).filter((x) => x.j >= 0 && x.j < 14);
  const aConfirmer = rdvsActifs.filter((x) => x.r.statut === "a_confirmer" && x.t > maintenant);
  const aRelire = (rendezVous ?? []).filter((r) => r.compteRendu === "a_relire");
  const rdvs: RdvBureaux[] = rdvsActifs.map(({ r, t, j }) => ({ j, h: heureParis(t), qui: r.client, quoi: libelle(TYPES_RDV, r.type), mode: libelle(MODES_RDV, r.mode), sujet: r.sujet ?? "", confirme: r.statut !== "a_confirmer", cr: r.compteRendu === "aucun" ? null : r.compteRendu }));
  // ── Salle des serveurs : où en est AVYORA face aux limites de Supabase et de Vercel
  const salle = salleServeurs(serveurs, inscrits, maintenant);
  const jaugeHaute = (salle.jauges ?? []).filter((j) => j.part != null && j.part >= SEUIL_ATTENTION).sort((a, b) => (b.part ?? 0) - (a.part ?? 0))[0];
  // ── Ton bureau : ce qui t'attend, trié par ce qui rapporte
  const sansArtisanTous = sansArtisan.length;
  const taches: { piece: IdPiece; n: number; texte: string; ou: string; gain: string; retard: number }[] = [
    { piece: "accompagnement" as const, n: aRappeler.length, texte: `Rappeler ${aRappeler.length} demande${s(aRappeler.length)} d'accompagnement`, ou: "Bureau Accompagnement", gain: "ce qui rapporte", retard: rappelsEnRetard },
    { piece: "reunion" as const, n: aConfirmer.length, texte: `Confirmer ${aConfirmer.length} rendez-vous`, ou: "Salle de réunion", gain: "ce qui rapporte", retard: 0 },
    { piece: "reunion" as const, n: aRelire.length, texte: `Relire ${aRelire.length} compte${s(aRelire.length)} rendu${s(aRelire.length)} d'appel`, ou: "Salle de réunion", gain: "ce qui rapporte", retard: 0 },
    { piece: "attente" as const, n: enAttente.length, texte: `Examiner ${enAttente.length} candidature${s(enAttente.length)} d'artisan${s(enAttente.length)}`, ou: "Salle d'attente artisans", gain: "réseau", retard: candidaturesEnRetard },
    { piece: "devis" as const, n: nbAvis, texte: `Modérer ${nbAvis} avis en attente`, ou: "Salle des devis", gain: "confiance", retard: 0 },
    { piece: "atelier" as const, n: decennales.length, texte: `Relancer ${decennales.length} décennale${s(decennales.length)}`, ou: "Atelier du réseau", gain: "réseau", retard: expirees },
    { piece: "atelier" as const, n: majs.length, texte: `Valider ${majs.length} mise${s(majs.length)} à jour d'artisan${s(majs.length)}`, ou: "Atelier du réseau", gain: "réseau", retard: 0 },
    { piece: "devis" as const, n: sansArtisanTous, texte: `${sansArtisanTous} demande${s(sansArtisanTous)} de devis sans artisan`, ou: "Un département où recruter", gain: "réseau", retard: 0 },
  ].filter((t) => t.n > 0);
  // Une limite d'hébergeur presque atteinte passe en tête : quand elle tombe, c'est tout le site qui s'arrête.
  if (jaugeHaute && jaugeHaute.part != null && jaugeHaute.part >= SEUIL_CRITIQUE)
    taches.unshift({ piece: "serveurs", n: 1, texte: `${jaugeHaute.hote} : ${jaugeHaute.nom.toLowerCase()} à ${Math.round(jaugeHaute.part * 100)} %`, ou: "Salle des serveurs · passer en Pro", gain: "le site tient", retard: 1 });
  const aFaire = taches.reduce((t, x) => t + x.n, 0), enRetard = taches.reduce((t, x) => t + x.retard, 0);
  const bureau = piece({
    etat: enRetard ? "critique" : aFaire ? "attention" : "bon",
    nb: aFaire,
    kpis: [["À faire", String(aFaire)], ["Qui rapportent", String(aRappeler.length)], ["En retard", String(enRetard)]],
    titre: "Ta liste, triée par ce qui rapporte",
    liste: taches.length ? taches.slice(0, 6).map((t, i): Ligne => [t.texte, t.ou, t.retard ? "critique" : i === 0 ? "attention" : "bon", String(i + 1)]) : [["Rien ne t'attend", "Tout est à jour dans les pièces", "bon", "à jour"]],
    conseil: taches.length ? "Tu commences par le haut de la liste, tu descends." : "Profites-en pour regarder les nouvelles estimations et les plans de la semaine.",
    lien: "/admin",
  });

  // ── Les pièces qui se branchent à l'étape suivante : rien d'inventé d'ici là
  const pros = inscrits.filter((i) => i.plan === "pro").length;
  const comptabilite = salleCompta(charges, entrees, rendezVous === null && charges === null);
  const s0 = rdvsActifs.filter((x) => x.j < 7).length;
  const reunion = rendezVous === null
    ? illisible("Rendez-vous", [["Cette semaine", "—"], ["Semaine prochaine", "—"], ["À confirmer", "—"]], "/admin/planning")
    : piece({
        etat: aConfirmer.length || aRelire.length ? "attention" : rdvsActifs.length ? "bon" : "vide",
        nb: s0,
        kpis: [["Cette semaine", String(s0)], ["Semaine prochaine", String(rdvsActifs.length - s0)], ["À confirmer", String(aConfirmer.length)]],
        titre: "Le planning",
        liste: [],
        conseil: aConfirmer.length ? "Un rendez-vous confirmé, c'est un accompagnement qui se tient : réponds vite aux créneaux en attente." : rdvsActifs.length ? "Les fiches des clients se préparent la veille de chaque rendez-vous." : "Aucun rendez-vous : cale-les depuis les demandes de rappel.",
        gens: Math.min(4, rdvsActifs.filter((x) => x.j === jourDepuisLundi(maintenant, lundi)).length),
        lien: "/admin/planning",
      });
  const marketing = piece({
    etat: "vide",
    kpis: [["Agents actifs", "0"], ["E-mails envoyés", "0"], ["Réponses", "0"]],
    titre: "Une cabine par agent",
    liste: [["Agent Prospection", "E-mails aux pros du bâtiment", "vide", "à créer"], ["Agent SEO", "Pages et positions Google", "vide", "à créer"], ["Agent Réseaux", "Reels et publications", "vide", "à créer"]],
    conseil: "Les trois cabines sont prêtes : chaque agent y affichera ce qu'il fait.",
  });
  const reno = projets.filter((p) => p.nature === "reno").length, traitees = (demandes ?? []).filter((d) => d.traiteeLe).length;
  const dossiers = projets.length + (devis?.length ?? 0) + (plans?.length ?? 0);
  const archives = piece({
    etat: "bon",
    nb: dossiers,
    kpis: [["Estimations", String(projets.length)], ["Demandes de devis", devis ? String(devis.length) : "—"], ["Plans", plans ? String(plans.length) : "—"]],
    titre: "Les rayons",
    liste: [
      ["Estimations rénovation", `${reno} dossier${s(reno)}`, "bon", "classé"],
      ["Estimations neuf", `${projets.length - reno} dossier${s(projets.length - reno)}`, "bon", "classé"],
      ...(devis ? [["Demandes de devis", `${devis.length} dossier${s(devis.length)}`, "bon", "classé"] as Ligne] : []),
      ...(plans ? [["Plans", `${plans.length} dossier${s(plans.length)}`, "bon", "classé"] as Ligne] : []),
      ...(demandes ? [["Rappels traités", `${traitees} dossier${s(traitees)}`, "bon", "classé"] as Ligne] : []),
    ],
    conseil: "Chaque rayon rouvre la vraie liste dans l'admin.",
    lien: "/admin/projets",
  });

  const priorites: DonneesBureaux["priorites"] = taches.length
    ? taches.slice(0, 3).map((t) => [t.piece, t.texte, t.gain])
    : [["projets", "Rien ne t'attend : regarde les estimations de la semaine", "à jour"]];

  return {
    genereLe: maintenant.toISOString(),
    pieces: { accueil, accompagnement, reunion, projets: salleProjets, plan: studio, attente, atelier, devis: salleDevis, bureau, marketing, caisse: comptabilite, archives, serveurs: salle },
    priorites,
    rdvs,
  };
}

const pct = (part: number) => (part > 0 && part < 0.01 ? "< 1 %" : `${Math.round(part * 100)} %`);
const etatPart = (part: number | null): Etat => (part == null ? "vide" : part >= SEUIL_CRITIQUE ? "critique" : part >= SEUIL_ATTENTION ? "attention" : "bon");

/** Les jauges et la pièce « Salle des serveurs ». Ce qui ne se mesure pas encore le dit, sans chiffre inventé. */
export function salleServeurs(m: MesureServeurs | null, inscrits: AdminInscrit[], maintenant: Date): PieceBureaux {
  const planS = m?.planSupabase ?? "gratuit", planV = m?.planVercel ?? "gratuit", L = LIMITES_SUPABASE[planS];
  const actifs = inscrits.filter((i) => i.lastSignIn && depuis([i.lastSignIn], 30, maintenant) === 1).length;
  const jauges: Jauge[] = [
    m?.fichiers
      ? { cle: "fichiers", hote: "Supabase", nom: "Photos et fichiers", part: m.fichiers.octets / L.fichiers, texte: `${m.fichiers.partiel ? "au moins " : ""}${poids(m.fichiers.octets)} sur ${poids(L.fichiers)} · ${m.fichiers.nb} fichier${s(m.fichiers.nb)}` }
      : { cle: "fichiers", hote: "Supabase", nom: "Photos et fichiers", part: null, texte: "Mesure impossible pour l'instant" },
    m?.base != null
      ? { cle: "base", hote: "Supabase", nom: "Base de données", part: m.base / L.base, texte: `${poids(m.base)} sur ${poids(L.base)}` }
      : { cle: "base", hote: "Supabase", nom: "Base de données", part: null, texte: m ? "Migration 0015 à appliquer" : "Mesure impossible pour l'instant" },
    L.actifs
      ? { cle: "actifs", hote: "Supabase", nom: "Comptes actifs ce mois", part: actifs / L.actifs, texte: `${actifs.toLocaleString("fr-FR")} sur ${L.actifs.toLocaleString("fr-FR")} · connectés depuis 30 jours` }
      : { cle: "actifs", hote: "Supabase", nom: "Comptes actifs ce mois", part: null, texte: `${actifs.toLocaleString("fr-FR")} connectés depuis 30 jours` },
    { cle: "envoi-supabase", hote: "Supabase", nom: "Données envoyées", part: null, texte: `Limite ${poids(L.envoi)} par mois · clé d'accès à créer` },
    { cle: "envoi-vercel", hote: "Vercel", nom: "Données envoyées", part: null, texte: `Limite ${poids(LIMITES_VERCEL[planV].envoi)} par mois · clé d'accès à créer` },
  ];
  const mesurees = jauges.filter((j) => j.part != null), haute = Math.max(0, ...mesurees.map((j) => j.part ?? 0));
  const etat: Etat = !mesurees.length ? "vide" : etatPart(haute);
  const nomPlan = (p: string) => (p === "pro" ? "Pro" : "gratuit");
  return piece({
    etat,
    nb: mesurees.length ? Math.round(haute * 100) : 0,
    kpis: jauges.slice(0, 3).map((j) => [j.nom, j.part == null ? "—" : pct(j.part)] as [string, string]),
    titre: `Supabase ${nomPlan(planS)} · Vercel ${nomPlan(planV)}`,
    liste: jauges.map((j): Ligne => [`${j.hote} · ${j.nom}`, j.texte, etatPart(j.part), j.part == null ? (j.cle.startsWith("envoi") ? "à brancher" : "—") : pct(j.part)]),
    conseil: etat === "critique"
      ? "Une limite est presque atteinte : quand elle tombe, la fonction concernée s'arrête jusqu'au mois suivant. Passe en Pro maintenant."
      : planV === "gratuit"
        ? "Vercel gratuit interdit l'usage commercial : AVYORA vend, le passage en Pro est à faire même si les jauges sont vertes."
        : "Les jauges passent à l'orange à 60 % et au rouge à 85 %.",
    jauges,
    lien: null,
  });
}

/** La comptabilité : les entrées Stripe du mois, les charges fixes saisies, le résultat (en euros seulement). */
export function salleCompta(charges: Charge[] | null, entrees: EntreesStripe | null, migrationAbsente: boolean): PieceBureaux {
  if (charges === null && entrees === null)
    return piece({ etat: "vide", kpis: [["Entrées du mois", "—"], ["Charges fixes", "—"], ["Résultat", "—"]], titre: "À brancher", liste: [["Compta", migrationAbsente ? "Migration 0016 à appliquer" : "Stripe et les charges ne répondent pas", "vide", "à brancher"]], conseil: "Aucun montant n'est affiché tant qu'il ne vient pas de Stripe ou de toi.", lien: "/admin/compta" });
  const total = charges ? totalMensuel(charges) : {};
  const resultat = entrees && charges ? entrees.mois.net - (total.EUR ?? 0) : null;
  const actives = (charges ?? []).filter((c) => c.actif);
  return piece({
    etat: resultat == null ? "vide" : resultat < 0 ? "attention" : "bon",
    nb: actives.length,
    kpis: [["Entrées du mois", entrees ? montant(entrees.mois.net) : "—"], ["Charges fixes", charges ? totalTexte(total) : "—"], ["Résultat", resultat == null ? "—" : montant(resultat)]],
    titre: "Ce mois-ci",
    liste: [
      entrees
        ? [`Entrées · Stripe`, `${entrees.mois.nb} paiement${s(entrees.mois.nb)} · ${montant(entrees.mois.brut)} encaissés, ${montant(entrees.mois.frais)} de frais`, entrees.mois.nb ? "bon" : "vide", entrees.mois.nb ? "encaissé" : "rien"]
        : ["Entrées · Stripe", "Stripe ne répond pas pour l'instant", "vide", "—"],
      ...actives.slice(0, 5).map((c): Ligne => [c.nom, `${montant(parMois(c), c.devise)} par mois${c.frequence === "an" ? ` (${montant(c.montantCentimes, c.devise)} par an)` : ""}`, "vide", "charge"]),
      ...(charges && !actives.length ? [["Aucune charge saisie", "Ajoute tes abonnements dans Compta", "attention", "à saisir"] as Ligne] : []),
    ],
    conseil: resultat == null ? "Il manque les entrées ou les charges pour calculer le résultat." : resultat < 0 ? "Les charges dépassent encore les entrées ce mois-ci." : "Les entrées couvrent les charges ce mois-ci.",
    lien: "/admin/compta",
  });
}
