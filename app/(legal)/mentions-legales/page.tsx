export const metadata = { title: "Mentions légales — AVYORA" };

export default function MentionsLegales() {
  return (
    <article>
      <h1>Mentions légales</h1>
      <p className="maj">Dernière mise à jour : 6 septembre 2026</p>

      <p>
        Conformément à l&apos;article 6 III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans
        l&apos;économie numérique (LCEN), voici les informations relatives à l&apos;éditeur et à
        l&apos;hébergeur du site <strong>avyora.fr</strong> (ci-après « le Site »).
      </p>

      <h2>1. Éditeur du Site</h2>
      <span className="todo">
        <b>À compléter</b> — informations légales de la structure qui exploite AVYORA. Sans société créée,
        indique ton statut (ex. entrepreneur individuel / micro-entreprise) et ton nom complet.
      </span>
      <div className="box">
        <p>Dénomination / Nom : <strong>[À COMPLÉTER]</strong></p>
        <p>Forme juridique : [À COMPLÉTER — ex. SASU, EURL, entreprise individuelle]</p>
        <p>Capital social : [le cas échéant]</p>
        <p>Siège social / Adresse : [À COMPLÉTER]</p>
        <p>SIREN / SIRET : [À COMPLÉTER]</p>
        <p>RCS / Ville d&apos;immatriculation : [le cas échéant]</p>
        <p>N° TVA intracommunautaire : [À COMPLÉTER, ou « TVA non applicable, art. 293 B du CGI »]</p>
        <p>E-mail de contact : <strong>[À COMPLÉTER — ex. contact@avyora.fr]</strong></p>
        <p>Téléphone : [le cas échéant]</p>
      </div>

      <h2>2. Directeur de la publication</h2>
      <p>Le directeur de la publication est <strong>[À COMPLÉTER — nom du représentant légal]</strong>.</p>

      <h2>3. Hébergement</h2>
      <p>Le Site est hébergé par&nbsp;:</p>
      <div className="box">
        <p><strong>Vercel Inc.</strong></p>
        <p>340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</p>
        <p>Site&nbsp;: <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a></p>
      </div>
      <p>
        Les données applicatives (comptes, projets, estimations) sont stockées via{" "}
        <strong>Supabase</strong> (base de données PostgreSQL). Voir la{" "}
        <a href="/confidentialite">politique de confidentialité</a> pour la localisation et le traitement
        des données.
      </p>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus du Site (marque « AVYORA », logo, textes, interface, référentiel de prix,
        méthodologie d&apos;estimation, code) est protégé par le droit de la propriété intellectuelle et
        demeure la propriété exclusive de l&apos;éditeur, sauf mention contraire. Toute reproduction,
        représentation ou exploitation, totale ou partielle, sans autorisation écrite préalable, est
        interdite.
      </p>

      <h2>5. Responsabilité</h2>
      <p>
        Les estimations fournies par AVYORA sont <strong>indicatives</strong>, calculées à partir d&apos;un
        référentiel de prix et des informations saisies par l&apos;utilisateur. Elles ne constituent pas un
        devis et n&apos;engagent aucun artisan. L&apos;éditeur ne saurait être tenu responsable des écarts
        entre l&apos;estimation et les coûts réels des travaux.
      </p>

      <h2>6. Contact</h2>
      <p>
        Pour toute question relative au Site&nbsp;: <strong>[À COMPLÉTER — e-mail de contact]</strong>.
      </p>
    </article>
  );
}
