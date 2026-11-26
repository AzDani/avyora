import { seoMeta } from "@/lib/seo-og";

export const metadata = seoMeta({
  title: "Conditions du Réseau AVYORA",
  description: "Conditions de participation des artisans au Réseau AVYORA : accès, engagements, rôle d'AVYORA, gratuité, suspension et données.",
  path: "/conditions-reseau",
  type: "website",
});

/**
 * Les conditions acceptées par l'artisan qui postule (case du formulaire, /espace-artisan). Décisions de Dani du
 * 17/11/2026 : réseau fermé, validation manuelle avec appel, décennale obligatoire, gratuit pendant le lancement.
 * À faire relire par un professionnel du droit avant l'ouverture aux clients (rappel du layout légal).
 */
export default function ConditionsReseau() {
  return (
    <article>
      <h1>Conditions du Réseau AVYORA</h1>
      <p className="maj">Version du 25 novembre 2026</p>

      <h2>1. Objet</h2>
      <p>
        Le <strong>Réseau AVYORA</strong>{" "}réunit des professionnels du bâtiment (« l&apos;Artisan ») sélectionnés par
        l&apos;éditeur d&apos;AVYORA. Il permet aux utilisateurs d&apos;AVYORA qui préparent des travaux (« le Client ») de
        demander des devis à des artisans vérifiés de leur département. Les présentes conditions régissent la candidature
        et la participation de l&apos;Artisan au réseau. Elles complètent les <a href="/cgu">conditions générales d&apos;utilisation</a>.
      </p>

      <h2>2. Accès au réseau</h2>
      <p>L&apos;entrée dans le réseau n&apos;est pas automatique. Elle suppose, à la date de la candidature puis tout au long de la participation&nbsp;:</p>
      <ul>
        <li>un établissement <strong>actif</strong>, identifié par son SIRET, vérifié auprès du répertoire des entreprises&nbsp;;</li>
        <li>une <strong>assurance de responsabilité décennale</strong> en cours de validité couvrant les métiers déclarés, attestation à l&apos;appui&nbsp;;</li>
        <li>des photos de chantiers réellement réalisés par l&apos;Artisan ou son équipe&nbsp;;</li>
        <li>un <strong>entretien téléphonique</strong> avec l&apos;éditeur.</li>
      </ul>
      <p>
        L&apos;éditeur décide seul de l&apos;admission. Il peut demander un complément, ou refuser une candidature, en
        indiquant si possible la raison. Une candidature validée l&apos;est une fois pour toutes&nbsp;: l&apos;Artisan n&apos;est
        pas revalidé pour chaque demande, sous réserve de la section 6.
      </p>

      <h2>3. Comment les demandes des Clients sont transmises</h2>
      <ul>
        <li>Le Client voit les artisans du réseau qui interviennent dans <strong>son département</strong> et exercent le métier demandé. C&apos;est <strong>le Client qui choisit</strong>, jusqu&apos;à trois artisans par demande.</li>
        <li>L&apos;Artisan choisi reçoit la demande (nature des travaux et, quand le Client les a donnés, description, quantités, photos, estimation AVYORA). Il est libre de l&apos;accepter ou de la refuser.</li>
        <li>Les coordonnées du Client ne sont communiquées qu&apos;à l&apos;Artisan qui <strong>accepte</strong> la demande.</li>
        <li>Les artisans sont affichés au Client en commençant par ceux qui ont reçu le moins de demandes, pour répartir les demandes équitablement&nbsp;; à égalité, dans un ordre propre à chaque Client.</li>
        <li>Aucun artisan ne paie pour être mieux placé ou plus souvent proposé.</li>
      </ul>

      <h2>4. Engagements de l&apos;Artisan</h2>
      <ul>
        <li>Fournir des informations et des documents exacts, et signaler sans délai tout changement (assurance renouvelée ou résiliée, cessation d&apos;activité, nouveau numéro).</li>
        <li>Répondre à chaque demande reçue, en l&apos;acceptant ou en la refusant, <strong>dans les 5 jours</strong>&nbsp;: un rappel lui est envoyé après 2 jours&nbsp;; sans réponse au bout de 5 jours, la demande expire pour lui et le Client peut choisir un autre artisan.</li>
        <li>Après avoir accepté, contacter le Client et lui adresser son devis dans un délai raisonnable, ou le prévenir s&apos;il renonce.</li>
        <li>Utiliser les coordonnées d&apos;un Client <strong>uniquement</strong> pour répondre à sa demande&nbsp;: ni revente, ni cession, ni prospection pour d&apos;autres prestations sans son accord. L&apos;Artisan est responsable du traitement de ces données pour son propre compte, dans le respect du RGPD.</li>
        <li>Établir ses devis et réaliser ses travaux sous sa seule responsabilité, conformément aux règles de l&apos;art, à la réglementation et à ses assurances.</li>
        <li>Ne pas se présenter comme salarié, mandataire ou partenaire exclusif d&apos;AVYORA.</li>
      </ul>

      <h2>4 bis. Suivi, avis des Clients, fiche et galerie</h2>
      <p>
        Le Client peut indiquer s&apos;il a reçu le devis de l&apos;Artisan et s&apos;il l&apos;a retenu. Quand l&apos;Artisan a accepté
        sa demande, le Client peut donner un avis&nbsp;: une note de 1 à 5, un commentaire, le mois des travaux et jusqu&apos;à 6
        photos. L&apos;éditeur lit chaque avis avant de le publier&nbsp;; il ne le refuse que pour un des motifs publiés sur la
        page des avis (propos injurieux, données personnelles, hors sujet, avis non authentique, photo inadaptée) et publie
        les avis négatifs comme les autres. Les avis publiés sont visibles par les membres AVYORA Pro, sur la fiche de
        l&apos;Artisan et quand ils choisissent leurs artisans, avec le prénom et l&apos;initiale du nom de l&apos;auteur, du plus
        récent au plus ancien. Un avis publié n&apos;est plus modifiable.
      </p>
      <p>
        L&apos;Artisan peut répondre publiquement à un avis (sa réponse est lue par l&apos;éditeur avant publication) et signaler
        un avis qu&apos;il estime contraire à ces règles&nbsp;: l&apos;éditeur tranche. L&apos;Artisan ne peut ni supprimer un avis, ni
        en obtenir contre une contrepartie. Des avis négatifs répétés, ou un taux de réponse trop faible, peuvent conduire à
        une suspension (section 7). La note et les avis ne changent pas l&apos;ordre dans lequel les artisans sont proposés.
      </p>
      <p>
        L&apos;Artisan peut publier dans sa galerie des réalisations (titre, description, ville, photos), sans validation
        préalable et sous sa responsabilité&nbsp;: il garantit qu&apos;il en est l&apos;auteur, que ses clients acceptent que les
        photos soient montrées et qu&apos;elles ne laissent voir ni visage reconnaissable ni adresse. L&apos;éditeur peut retirer
        une réalisation. La fiche de l&apos;Artisan (nom commercial, commune, métiers, départements, présentation, site web,
        note, avis et réalisations) est visible par les membres AVYORA Pro&nbsp;; ses coordonnées ne sont transmises qu&apos;aux
        Clients dont il accepte la demande.
      </p>

      <h2>5. Rôle d&apos;AVYORA</h2>
      <p>
        AVYORA est un service de <strong>mise en relation</strong>. AVYORA n&apos;est pas partie aux devis ni aux contrats
        conclus entre le Client et l&apos;Artisan, n&apos;intervient pas dans l&apos;exécution des travaux et ne les garantit pas.
        Les vérifications décrites à la section 2 sont faites à la date de la candidature et sur la base des documents
        fournis&nbsp;; elles ne remplacent pas celles que le Client fait lui-même avant de signer. AVYORA ne s&apos;engage sur
        aucun nombre de demandes.
      </p>

      <h2>6. Gratuité et évolution</h2>
      <p>
        La participation au réseau est <strong>gratuite pendant la phase de lancement</strong>&nbsp;: aucune commission
        n&apos;est prélevée sur les travaux. Si elle devient payante, les nouvelles conditions et leur prix seront
        communiqués à l&apos;Artisan par e-mail <strong>au moins 30 jours</strong>{" "}avant de s&apos;appliquer&nbsp;; il restera
        libre de quitter le réseau sans frais avant cette date.
      </p>

      <h2>7. Suspension et sortie</h2>
      <p>
        L&apos;éditeur peut suspendre ou exclure un Artisan, en lui indiquant la raison par e-mail, notamment en cas
        d&apos;assurance expirée ou résiliée, d&apos;établissement fermé, d&apos;informations inexactes, de plaintes ou d&apos;avis
        négatifs répétés de Clients, de demandes laissées trop souvent sans réponse, ou de manquement aux présentes conditions. L&apos;Artisan peut quitter le réseau à tout moment en écrivant à{" "}
        <strong>contact@getavyora.fr</strong>.
      </p>

      <h2>8. Données personnelles</h2>
      <p>
        Les informations et documents de la candidature servent à l&apos;examiner puis à gérer la participation au réseau.
        Les documents sont gardés dans un espace de stockage privé, accessible au seul éditeur. Le détail (données,
        finalités, durées de conservation, droits) figure dans la <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>9. Modification des conditions</h2>
      <p>
        L&apos;éditeur peut faire évoluer ces conditions. Toute modification importante est annoncée par e-mail à
        l&apos;Artisan avant de s&apos;appliquer&nbsp;; s&apos;il ne l&apos;accepte pas, il peut quitter le réseau.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. En cas de difficulté, les parties recherchent d&apos;abord
        une solution amiable en écrivant à <strong>contact@getavyora.fr</strong>.
      </p>
    </article>
  );
}
