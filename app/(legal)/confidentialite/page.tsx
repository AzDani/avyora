export const metadata = { title: "Politique de confidentialité — AVYORA" };

export default function Confidentialite() {
  return (
    <article>
      <h1>Politique de confidentialité</h1>
      <p className="maj">Dernière mise à jour : 6 septembre 2026</p>

      <p>
        La présente politique décrit la manière dont AVYORA collecte et traite les données personnelles,
        conformément au Règlement (UE) 2016/679 (« RGPD ») et à la loi « Informatique et Libertés ».
      </p>

      <h2>1. Responsable de traitement</h2>
      <p>
        Le responsable de traitement est l&apos;éditeur du Site (voir <a href="/mentions-legales">mentions
        légales</a>). Contact&nbsp;: <strong>[À COMPLÉTER — e-mail de contact / DPO le cas échéant]</strong>.
      </p>

      <h2>2. Données collectées</h2>
      <table>
        <thead>
          <tr><th>Catégorie</th><th>Exemples</th></tr>
        </thead>
        <tbody>
          <tr><td>Compte</td><td>e-mail, prénom, mot de passe (haché), plan d&apos;abonnement</td></tr>
          <tr><td>Projets &amp; estimations</td><td>type de bien, surface, code postal, choix de travaux, statuts de suivi</td></tr>
          <tr><td>Paiement</td><td>gérées par Stripe&nbsp;; AVYORA ne stocke pas les numéros de carte</td></tr>
          <tr><td>Sécurité &amp; journaux</td><td>adresse IP (limitation d&apos;abus), horodatage d&apos;évènements d&apos;authentification</td></tr>
          <tr><td>Techniques</td><td>cookies strictement nécessaires (session) — voir <a href="/cookies">politique cookies</a></td></tr>
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
          <tr><td>Communications marketing (le cas échéant)</td><td>Consentement (art. 6.1.a)</td></tr>
        </tbody>
      </table>

      <h2>4. Destinataires et sous-traitants</h2>
      <p>Les données sont accessibles à l&apos;éditeur et à ses sous-traitants techniques, notamment&nbsp;:</p>
      <ul>
        <li><strong>Vercel Inc.</strong> — hébergement du site&nbsp;;</li>
        <li><strong>Supabase</strong> — base de données et authentification&nbsp;;</li>
        <li><strong>Stripe</strong> — traitement des paiements&nbsp;;</li>
        <li>[À COMPLÉTER — fournisseur d&apos;envoi d&apos;e-mails transactionnels le cas échéant].</li>
      </ul>
      <span className="todo">
        <b>À vérifier</b> — pour un hébergement des données dans l&apos;UE, sélectionne une région européenne
        pour Supabase et privilégie des sous-traitants offrant des garanties (clauses contractuelles types)
        pour tout transfert hors UE.
      </span>

      <h2>5. Transferts hors Union européenne</h2>
      <p>
        Certains prestataires (ex. Vercel, Stripe) peuvent traiter des données hors UE. De tels transferts
        sont encadrés par des garanties appropriées (clauses contractuelles types de la Commission
        européenne, ou mécanismes équivalents).
      </p>

      <h2>6. Durées de conservation</h2>
      <ul>
        <li>Données de compte et projets&nbsp;: pendant la durée d&apos;utilisation du compte, puis supprimées à la clôture (ou après une période d&apos;inactivité prolongée).</li>
        <li>Documents de facturation&nbsp;: conservés 10 ans (obligation légale comptable).</li>
        <li>Journaux de sécurité&nbsp;: durée limitée, proportionnée à la finalité de sécurité.</li>
      </ul>

      <h2>7. Vos droits</h2>
      <p>
        Conformément au RGPD, vous disposez des droits d&apos;<strong>accès</strong>, de{" "}
        <strong>rectification</strong>, d&apos;<strong>effacement</strong>, de <strong>limitation</strong>,
        d&apos;<strong>opposition</strong> et de <strong>portabilité</strong>.
      </p>
      <ul>
        <li><strong>Effacement</strong> — la suppression du compte et des données associées est possible directement depuis « Mon compte ».</li>
        <li><strong>Portabilité / accès</strong> — une copie de vos données vous est fournie sur simple demande à [À COMPLÉTER — e-mail de contact].</li>
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
        Le Site utilise uniquement des cookies strictement nécessaires à son fonctionnement (session,
        sécurité). Détails dans la <a href="/cookies">politique cookies</a>.
      </p>

      <h2>10. Modifications</h2>
      <p>
        La présente politique peut évoluer. La version applicable est celle publiée sur cette page à la date
        de consultation.
      </p>
    </article>
  );
}
