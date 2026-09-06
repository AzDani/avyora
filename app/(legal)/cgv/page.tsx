export const metadata = { title: "Conditions Générales de Vente — AVYORA" };

export default function CGV() {
  return (
    <article>
      <h1>Conditions Générales de Vente</h1>
      <p className="maj">Dernière mise à jour : 6 septembre 2026</p>

      <span className="todo">
        <b>À finaliser avant la mise en vente</b> — renseigne les prix exacts (page Tarifs), le nom de
        l&apos;éditeur, l&apos;e-mail de contact, et adhère à un <b>médiateur de la consommation</b> (obligatoire
        en B2C, art. L612-1 du Code de la consommation) dont les coordonnées doivent figurer ci-dessous.
      </span>

      <h2>1. Objet et champ d&apos;application</h2>
      <p>
        Les présentes conditions générales de vente (« CGV ») régissent la vente des abonnements « AVYORA Pro »
        (« l&apos;Abonnement ») proposés sur <strong>avyora.fr</strong>. Elles s&apos;appliquent à tout achat
        effectué par un client (« le Client »), qu&apos;il soit consommateur ou professionnel. Toute
        souscription implique l&apos;acceptation pleine et entière des présentes CGV.
      </p>

      <h2>2. Caractéristiques de l&apos;Abonnement</h2>
      <p>
        L&apos;Abonnement Pro donne accès aux fonctionnalités payantes du Service (estimation détaillée poste
        par poste, rapport PDF téléchargeable, suivi de chantier, et toute fonctionnalité présentée comme
        « Pro »). Le détail des formules (mensuelle, annuelle) et de leur contenu figure sur la page{" "}
        <a href="/tarifs">Tarifs</a>.
      </p>

      <h2>3. Prix</h2>
      <ul>
        <li>Les prix sont indiqués en euros, <strong>toutes taxes comprises (TTC)</strong>, sur la page <a href="/tarifs">Tarifs</a>.</li>
        <li>[À COMPLÉTER] Si l&apos;éditeur relève de la franchise en base de TVA&nbsp;: mention « TVA non applicable, art. 293 B du CGI ».</li>
        <li>Les éventuelles remises de lancement sont affichées avec le prix de référence barré et s&apos;appliquent dans les conditions et la durée indiquées.</li>
        <li>L&apos;éditeur peut modifier ses prix à tout moment&nbsp;; le prix applicable est celui en vigueur lors de la souscription. Toute évolution tarifaire d&apos;un abonnement en cours est notifiée au Client avant reconduction.</li>
      </ul>

      <h2>4. Souscription et paiement</h2>
      <ul>
        <li>La souscription s&apos;effectue en ligne, après création d&apos;un compte. Le Client valide sa commande via un bouton mentionnant explicitement l&apos;obligation de paiement (« Payer » / « Commander avec obligation de paiement »).</li>
        <li>Le paiement est traité par notre prestataire de paiement sécurisé <strong>Stripe</strong>. AVYORA n&apos;a jamais accès aux données complètes de la carte bancaire.</li>
        <li>Un e-mail de confirmation récapitulant la commande est adressé au Client après paiement.</li>
        <li>En cas de défaut de paiement (rejet, expiration de carte), l&apos;accès aux fonctionnalités Pro peut être suspendu jusqu&apos;à régularisation.</li>
      </ul>

      <h2>5. Durée, reconduction et résiliation</h2>
      <h3>5.1 Durée</h3>
      <p>
        L&apos;Abonnement est souscrit pour la durée choisie (mensuelle ou annuelle) et prend effet au
        paiement.
      </p>
      <h3>5.2 Reconduction tacite</h3>
      <p>
        L&apos;Abonnement est reconductible tacitement pour des périodes successives de même durée.
        Conformément à l&apos;article <strong>L215-1 du Code de la consommation</strong> (loi Chatel), pour les
        abonnements à durée déterminée reconductibles, le Client consommateur est informé par écrit, au plus
        tôt trois mois et au plus tard un mois avant le terme de la période, de la possibilité de ne pas
        reconduire. À défaut d&apos;information, le Client peut résilier gratuitement à tout moment à compter de
        la reconduction.
      </p>
      <h3>5.3 Résiliation</h3>
      <p>
        Le Client peut résilier son Abonnement à tout moment&nbsp;; la résiliation prend effet à la fin de la
        période en cours (aucun remboursement au prorata de la période entamée, sauf disposition légale
        impérative). Conformément à l&apos;article <strong>L215-1-1 du Code de la consommation</strong>, la
        résiliation peut être effectuée en ligne, de façon simple, depuis l&apos;espace client (fonction de
        résiliation dédiée).
      </p>
      <span className="todo">
        <b>À implémenter</b> — la « résiliation en trois clics » est obligatoire pour les abonnements souscrits
        en ligne&nbsp;: prévoir un bouton de résiliation accessible dans l&apos;espace client (via le portail
        client Stripe ou une action dédiée) et l&apos;e-mail de rappel avant reconduction (loi Chatel).
      </span>

      <h2>6. Droit de rétractation</h2>
      <p>
        Conformément aux articles <strong>L221-18 et suivants du Code de la consommation</strong>, le
        consommateur dispose d&apos;un délai de <strong>quatorze (14) jours</strong> pour exercer son droit de
        rétractation, sans motif.
      </p>
      <p>
        L&apos;Abonnement portant sur un <strong>contenu/service numérique fourni immédiatement</strong>, le
        Client qui demande à accéder aux fonctionnalités Pro dès la souscription est invité à donner son{" "}
        <strong>accord exprès à l&apos;exécution immédiate</strong> et à <strong>renoncer expressément à son
        droit de rétractation</strong> pour la partie déjà exécutée (art. L221-28 13°). En l&apos;absence de
        cette renonciation, le droit de rétractation s&apos;exerce dans les conditions de droit commun. Pour
        l&apos;exercer, le Client adresse une demande non ambiguë à&nbsp;: [À COMPLÉTER — e-mail de contact].
      </p>

      <h2>7. Accès et disponibilité</h2>
      <p>
        L&apos;éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité du Service. Sa
        responsabilité ne saurait être engagée en cas d&apos;indisponibilité temporaire, de force majeure ou
        de fait d&apos;un tiers (hébergeur, prestataire de paiement).
      </p>

      <h2>8. Nature du Service — absence de garantie de résultat</h2>
      <p>
        Les estimations sont indicatives (voir <a href="/cgu">CGU</a> art. 4). L&apos;Abonnement donne accès à
        un outil d&apos;aide à la décision&nbsp;; il ne comporte aucune garantie quant à l&apos;exactitude des
        coûts réels des travaux.
      </p>

      <h2>9. Service client et réclamations</h2>
      <p>Toute réclamation peut être adressée à&nbsp;: <strong>[À COMPLÉTER — e-mail de contact]</strong>.</p>

      <h2>10. Médiation de la consommation</h2>
      <p>
        Conformément à l&apos;article L612-1 du Code de la consommation, le Client consommateur peut recourir
        gratuitement à un médiateur de la consommation en vue de la résolution amiable d&apos;un litige.
      </p>
      <div className="box">
        <p>Médiateur&nbsp;: <strong>[À COMPLÉTER — nom et coordonnées du médiateur auquel l&apos;éditeur a adhéré]</strong></p>
        <p>
          Plateforme européenne de règlement en ligne des litiges (RLL)&nbsp;:{" "}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
            ec.europa.eu/consumers/odr
          </a>
        </p>
      </div>

      <h2>11. Données personnelles</h2>
      <p>
        Les traitements liés à la commande et à l&apos;Abonnement sont décrits dans la{" "}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>12. Droit applicable et litiges</h2>
      <p>
        Les présentes CGV sont soumises au droit français. À défaut de résolution amiable (y compris par
        médiation), les tribunaux compétents sont déterminés selon les règles de droit commun, les
        dispositions protectrices du consommateur demeurant réservées.
      </p>
    </article>
  );
}
