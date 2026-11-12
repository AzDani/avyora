import { seoMeta } from "@/lib/seo-og";
// Métadonnées propres à la page : sans description, elle reprenait celle de l'accueil (cf. seoMeta).
export const metadata = seoMeta({
  title: "Politique de confidentialité",
  description:
    "Comment AVYORA collecte, utilise et protège tes données personnelles (RGPD) : finalités, durées de conservation et droits.",
  path: "/confidentialite",
  type: "website",
});

export default function Confidentialite() {
  return (
    <article>
      <h1>Politique de confidentialité</h1>
      <p className="maj">Dernière mise à jour : 12 novembre 2026</p>

      <p>
        La présente politique décrit la manière dont AVYORA collecte et traite les données personnelles,
        conformément au Règlement (UE) 2016/679 (« RGPD ») et à la loi « Informatique et Libertés ».
      </p>

      <h2>1. Responsable de traitement</h2>
      <p>
        Le responsable de traitement est l&apos;éditeur du Site (voir <a href="/mentions-legales">mentions
        légales</a>). Contact&nbsp;: <strong>contact@getavyora.fr</strong>.
      </p>

      <h2>2. Données collectées</h2>
      <table>
        <thead>
          <tr><th>Catégorie</th><th>Exemples</th></tr>
        </thead>
        <tbody>
          <tr><td>Compte</td><td>e-mail, prénom, mot de passe (haché), plan d&apos;abonnement</td></tr>
          <tr><td>Projets &amp; estimations</td><td>type de bien, surface, code postal, choix de travaux, statuts de suivi, dépenses de chantier saisies</td></tr>
          <tr><td>Plans</td><td>plans de maison dessinés dans l&apos;éditeur et enregistrés dans le compte</td></tr>
          <tr><td>Paiement</td><td>gérées par Stripe&nbsp;; AVYORA ne stocke pas les numéros de carte</td></tr>
          <tr><td>Sécurité &amp; journaux</td><td>adresse IP (limitation d&apos;abus), horodatage d&apos;évènements d&apos;authentification</td></tr>
          <tr><td>Techniques</td><td>cookies strictement nécessaires (session, langue, sécurité de la connexion) — voir <a href="/cookies">politique cookies</a></td></tr>
          <tr><td>Publicité (uniquement avec votre consentement)</td><td>identifiants des cookies Google Ads, pages visitées sur le Site, actions de conversion (estimation terminée, abonnement)</td></tr>
        </tbody>
      </table>

      <h2>3. Finalités et bases légales</h2>
      <table>
        <thead>
          <tr><th>Finalité</th><th>Base légale</th></tr>
        </thead>
        <tbody>
          <tr><td>Fournir le Service (compte, estimations, projets)</td><td>Exécution du contrat (art. 6.1.b)</td></tr>
          <tr><td>Gérer l&apos;abonnement et le paiement</td><td>Exécution du contrat (art. 6.1.b)</td></tr>
          <tr><td>Sécurité, prévention de la fraude et des abus</td><td>Intérêt légitime (art. 6.1.f)</td></tr>
          <tr><td>Obligations comptables et légales (facturation)</td><td>Obligation légale (art. 6.1.c)</td></tr>
          <tr><td>Lettre d&apos;information « nouveautés » (case facultative, non cochée, à l&apos;inscription)</td><td>Consentement (art. 6.1.a)</td></tr>
          <tr><td>Mesure des conversions publicitaires et remarketing (Google Ads)</td><td>Consentement (art. 6.1.a, et art. 82 de la loi « Informatique et Libertés »), recueilli par le bandeau cookies</td></tr>
        </tbody>
      </table>

      <h2>4. Destinataires et sous-traitants</h2>
      <p>Les données sont accessibles à l&apos;éditeur et à ses sous-traitants techniques, notamment&nbsp;:</p>
      <ul>
        <li><strong>Vercel Inc.</strong> — hébergement du site&nbsp;;</li>
        <li><strong>Supabase</strong> — base de données et authentification&nbsp;;</li>
        <li><strong>Stripe</strong> — traitement des paiements&nbsp;;</li>
        <li><strong>Resend</strong> — envoi des e-mails transactionnels (confirmation de compte, réinitialisation de mot de passe, confirmation de commande)&nbsp;;</li>
        <li><strong>Vercel Analytics</strong> — mesure d&apos;audience agrégée, sans cookie&nbsp;;</li>
        <li><strong>Google Ireland Limited</strong> (Gordon House, Barrow Street, Dublin 4, Irlande) — Google Ads&nbsp;: mesure des conversions et remarketing, <strong>uniquement si vous avez accepté les cookies publicitaires</strong>. Règles de Google pour ces traitements&nbsp;: <a href="https://business.safety.google/privacy/" target="_blank" rel="noopener noreferrer">business.safety.google/privacy</a>.</li>
      </ul>

      <h2>5. Transferts hors Union européenne</h2>
      <p>
        Certains prestataires (notamment Vercel, Stripe et, si vous avez accepté les cookies publicitaires, Google)
        peuvent traiter des données hors de l&apos;Union européenne, en particulier aux États-Unis. Ces transferts sont
        encadrés par des garanties appropriées&nbsp;: la décision d&apos;adéquation de la Commission européenne relative
        au cadre de protection des données UE–États-Unis (Data Privacy Framework) lorsque le destinataire y est
        certifié, ou, à défaut, les clauses contractuelles types de la Commission européenne.
      </p>

      <h2>6. Durées de conservation</h2>
      <ul>
        <li>Données de compte et projets&nbsp;: pendant la durée d&apos;utilisation du compte, puis supprimées à la clôture (ou après une période d&apos;inactivité prolongée).</li>
        <li>Documents de facturation&nbsp;: conservés 10 ans (obligation légale comptable).</li>
        <li>Journaux de sécurité&nbsp;: durée limitée, proportionnée à la finalité de sécurité.</li>
        <li>Cookies publicitaires Google Ads&nbsp;: <strong>13 mois au plus</strong> à compter de leur dépôt&nbsp;; votre choix (acceptation ou refus) est conservé 6 mois, puis vous est redemandé.</li>
      </ul>

      <h2>7. Vos droits</h2>
      <p>
        Conformément au RGPD, vous disposez des droits d&apos;<strong>accès</strong>, de{" "}
        <strong>rectification</strong>, d&apos;<strong>effacement</strong>, de <strong>limitation</strong>,
        d&apos;<strong>opposition</strong> et de <strong>portabilité</strong>.
      </p>
      <ul>
        <li><strong>Effacement</strong> — la suppression du compte et des données associées est possible directement depuis « Mon compte ».</li>
        <li><strong>Portabilité / accès</strong> — vous pouvez télécharger une copie de vos données (fichier JSON&nbsp;: profil, projets, estimations, dépenses, plans) depuis « Mon compte », ou la demander à contact@getavyora.fr.</li>
        <li><strong>Retrait du consentement</strong> — les cookies publicitaires se refusent à tout moment, aussi simplement qu&apos;ils s&apos;acceptent, avec le lien « Gérer mes cookies » en bas de chaque page&nbsp;; la lettre d&apos;information, sur simple demande à contact@getavyora.fr. Le retrait ne remet pas en cause les traitements déjà effectués.</li>
        <li>Les autres droits s&apos;exercent en écrivant à la même adresse&nbsp;; une réponse est apportée dans un délai maximal d&apos;un mois.</li>
      </ul>
      <p>
        Vous pouvez introduire une réclamation auprès de la <strong>CNIL</strong> (
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>).
      </p>

      <h2>8. Sécurité</h2>
      <p>
        L&apos;éditeur met en œuvre des mesures techniques et organisationnelles appropriées&nbsp;: chiffrement
        des échanges (HTTPS), cloisonnement des données par utilisateur (sécurité au niveau des lignes),
        hachage des mots de passe, limitation des tentatives d&apos;authentification, et en-têtes de sécurité.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Le Site utilise des cookies strictement nécessaires à son fonctionnement (session, langue, sécurité),
        exemptés de consentement, et une mesure d&apos;audience sans cookie (Vercel Analytics). Les cookies
        publicitaires de Google Ads ne sont déposés qu&apos;après votre accord, donné dans le bandeau cookies et
        retirable à tout moment. Détails dans la <a href="/cookies">politique cookies</a>.
      </p>

      <h2>10. Modifications</h2>
      <p>
        La présente politique peut évoluer. La version applicable est celle publiée sur cette page à la date
        de consultation.
      </p>
    </article>
  );
}
