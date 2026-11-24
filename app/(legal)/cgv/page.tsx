import { seoMeta } from "@/lib/seo-og";
import { betaCoupee, libellesBeta } from "@/lib/beta";

// Métadonnées propres à la page : sans description, elle reprenait celle de l'accueil (cf. seoMeta).
export const metadata = seoMeta({
  title: "Conditions Générales de Vente",
  description:
    "Conditions générales de vente de l'abonnement AVYORA Pro et des prestations d'accompagnement : prix, paiement, rétractation, résiliation.",
  path: "/cgv",
  type: "website",
});

/**
 * Bêta gratuite (lib/beta.ts) : l'article 1 bis, aucun Abonnement vendu pendant la bêta. Mêmes règles que les CGU (page
 * statique). Partie II (24/11/2026) : les prestations d'accompagnement de Daniel (conseil à distance), payantes, avec le
 * droit de rétractation des contrats de service conclus à distance (L221-18, L221-25, L221-28 1°). Aucun montant écrit ici
 * (les prix sont sur les pages de prestation) : la page reste sans prix pendant la bêta (tests/beta.test.ts).
 */
export default function CGV() {
  const beta = !betaCoupee();
  const l = libellesBeta("fr");
  return (
    <article>
      <h1>Conditions Générales de Vente</h1>
      <p className="maj">Dernière mise à jour : 24 novembre 2026</p>


      <h2>1. Objet et champ d&apos;application</h2>
      <p>
        Les présentes conditions générales de vente (« CGV ») régissent la vente des abonnements « AVYORA Pro »
        (« l&apos;Abonnement », <strong>partie I</strong>, articles 2 à 8) et des prestations d&apos;accompagnement
        de Daniel LEAL (« les Prestations », <strong>partie II</strong>, articles 13 à 21) proposés sur{" "}
        <strong>getavyora.fr</strong>. Les articles 9 à 12 (réclamations, médiation, données personnelles, droit
        applicable) s&apos;appliquent aux deux. Elles s&apos;appliquent à tout achat effectué par un client
        (« le Client »), qu&apos;il soit consommateur ou professionnel. Toute souscription ou commande implique
        l&apos;acceptation pleine et entière des présentes CGV.
      </p>

      {beta && (
        <>
          <h2>1 bis. Bêta gratuite&nbsp;: aucun Abonnement vendu</h2>
          <p>
            Jusqu&apos;au <strong>{l.fin} inclus</strong> (heure de Paris), AVYORA est en bêta gratuite (voir{" "}
            <a href="/cgu">CGU</a> art. 2 bis)&nbsp;: <strong>aucun Abonnement n&apos;est vendu</strong>, aucun Abonnement
            n&apos;est proposé à la souscription et aucun moyen de paiement n&apos;est demandé pour le Service. Les
            Prestations d&apos;accompagnement (partie II) restent payantes pendant la bêta. Les présentes CGV
            s&apos;appliquent aux souscriptions faites à partir du {l.reprise}, ainsi qu&apos;aux Abonnements souscrits
            avant la bêta, qui se poursuivent dans leurs conditions. Le statut de membre fondateur (CGU art. 2 bis) ne donne droit à
            aucun tarif particulier&nbsp;: toute souscription se fait au prix en vigueur (art. 3).
          </p>
        </>
      )}

      <h2 className="partie">Partie I — L&apos;abonnement AVYORA Pro</h2>

      <h2>2. Caractéristiques de l&apos;Abonnement</h2>
      <p>
        L&apos;Abonnement Pro donne accès aux fonctionnalités payantes du Service (estimation détaillée poste
        par poste, rapport PDF téléchargeable, suivi de chantier, et toute fonctionnalité présentée comme
        « Pro »). Le détail des formules (mensuelle, annuelle) et de leur contenu figure sur la page{" "}
        <a href="/tarifs">Tarifs</a>.
      </p>

      <h2>3. Prix</h2>
      <ul>
        <li>Les prix sont indiqués en euros, sur la page <a href="/tarifs">Tarifs</a> et sur la page de paiement. L&apos;éditeur relève de la franchise en base de TVA&nbsp;: <strong>TVA non applicable, art. 293 B du CGI</strong>. Le prix affiché est le prix total payé par le Client.</li>
        <li>Les éventuelles remises sont indiquées avec leurs conditions et leur durée&nbsp;; le prix affiché est le prix pratiqué, sans prix de référence barré.</li>
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
        Conformément à l&apos;article <strong>L215-1 du Code de la consommation</strong>{" "}(loi Chatel), pour les
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
        droit de rétractation</strong>{" "}pour la partie déjà exécutée (art. L221-28 13°). En l&apos;absence de
        cette renonciation, le droit de rétractation s&apos;exerce dans les conditions de droit commun. Pour
        l&apos;exercer, le Client adresse une demande non ambiguë à&nbsp;: contact@getavyora.fr.
      </p>

      <h2>7. Accès et disponibilité</h2>
      <p>
        L&apos;éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité du Service. Sa
        responsabilité ne saurait être engagée en cas d&apos;indisponibilité temporaire, de force majeure ou
        de fait d&apos;un tiers (hébergeur, prestataire de paiement).
      </p>

      <h2>8. Nature du Service — absence de garantie de résultat</h2>
      <p>
        Les estimations sont indicatives (voir <a href="/cgu">CGU</a>{" "}art. 4). L&apos;Abonnement donne accès à
        un outil d&apos;aide à la décision&nbsp;; il ne comporte aucune garantie quant à l&apos;exactitude des
        coûts réels des travaux.
      </p>

      <h2 className="partie">Dispositions communes</h2>

      <h2>9. Service client et réclamations</h2>
      <p>Toute réclamation peut être adressée à&nbsp;: <strong>contact@getavyora.fr</strong>. L&apos;éditeur s&apos;efforce d&apos;y répondre dans les meilleurs délais.</p>

      <h2>10. Médiation de la consommation</h2>
      <p>
        Conformément à l&apos;article L612-1 du Code de la consommation, le Client consommateur peut recourir
        gratuitement à un médiateur de la consommation en vue de la résolution amiable d&apos;un litige.
      </p>
      <div className="box">
        <p>Médiateur&nbsp;: <strong>le médiateur de la consommation compétent sera prochainement désigné et ses coordonnées publiées ici.</strong> Dans l&apos;attente, toute demande de résolution amiable peut être adressée à contact@getavyora.fr.</p>
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

      <h2 className="partie">Partie II — Les prestations d&apos;accompagnement</h2>

      <h2>13. Prestations concernées</h2>
      <p>
        Daniel LEAL propose des prestations de conseil en travaux, réalisées <strong>à distance</strong>{" "}(téléphone,
        visio ou WhatsApp)&nbsp;: relecture de devis, estimation de budget travaux, avis travaux avant achat, choix
        techniques, plans 2D d&apos;aménagement, organisation du chantier chaque semaine, suivi du budget, et
        prestations sur mesure. Leur contenu, la durée des appels et les documents remis sont décrits sur la page{" "}
        <a href="/accompagnement-travaux">Accompagnement travaux</a> et sur la page de chaque prestation.
      </p>
      <p>
        Il s&apos;agit de <strong>conseil</strong>&nbsp;: ni maîtrise d&apos;œuvre (Daniel LEAL ne dirige pas les
        artisans et ne signe rien au nom du Client), ni expertise judiciaire, ni diagnostic immobilier, ni étude de
        structure. Le Client reste seul maître de ses décisions et de ses contrats avec les entreprises.
      </p>

      <h2>14. Prix</h2>
      <ul>
        <li>Les prix affichés sur le site sont des <strong>prix moyens</strong>, donnés à titre indicatif&nbsp;: ils varient selon la taille du projet (pour une relecture de devis, selon la taille du devis et le nombre de lignes). Seul l&apos;avis travaux avant achat est à <strong>prix fixe</strong>, celui indiqué sur sa page.</li>
        <li>Avant toute commande, le Client reçoit par écrit (e-mail) une proposition indiquant la prestation, son contenu et son <strong>prix ferme</strong>. Aucun montant n&apos;est dû sans acceptation de cette proposition.</li>
        <li>L&apos;appel découverte est gratuit et n&apos;engage à rien.</li>
        <li>L&apos;éditeur relève de la franchise en base de TVA&nbsp;: <strong>TVA non applicable, art. 293 B du CGI</strong>. Le prix indiqué est le prix total payé par le Client.</li>
      </ul>

      <h2>15. Commande et conclusion du contrat</h2>
      <p>
        Le contrat est conclu lorsque le Client accepte par écrit (e-mail) la proposition reçue. Daniel LEAL lui
        adresse alors une confirmation sur support durable (e-mail), qui reprend les caractéristiques de la
        prestation, son prix et les présentes CGV.
      </p>

      <h2>16. Paiement et facture</h2>
      <ul>
        <li>Une prestation ponctuelle est payable avant sa réalisation, par virement bancaire ou par lien de paiement sécurisé.</li>
        <li>Une prestation mensuelle (organisation du chantier chaque semaine, suivi du budget) est payable d&apos;avance, au début de chaque mois.</li>
        <li>Une facture est remise au Client pour chaque paiement.</li>
      </ul>

      <h2>17. Réalisation</h2>
      <ul>
        <li>Les rendez-vous sont fixés d&apos;un commun accord. Le Client transmet avant l&apos;appel les éléments demandés (devis, photos, plans, mesures, annonce)&nbsp;: la qualité du conseil en dépend.</li>
        <li>Le Client peut reporter un rendez-vous en prévenant au moins vingt-quatre heures à l&apos;avance. Daniel LEAL peut lui aussi le reporter en cas d&apos;empêchement, en proposant une nouvelle date dans les meilleurs délais.</li>
        <li>Les documents écrits (budget, résumé, plans) sont transmis par e-mail, dans le délai indiqué dans la proposition.</li>
      </ul>

      <h2>18. Prestations mensuelles&nbsp;: durée et résiliation</h2>
      <p>
        Les prestations mensuelles sont <strong>sans engagement de durée</strong>. Le Client peut y mettre fin à tout
        moment, par simple e-mail à contact@getavyora.fr&nbsp;; la résiliation prend effet à la fin du mois en cours,
        déjà payé, et aucun nouveau mois n&apos;est facturé.
      </p>

      <h2>19. Droit de rétractation</h2>
      <p>
        Le Client consommateur dispose d&apos;un délai de <strong>quatorze (14) jours</strong> à compter de la
        conclusion du contrat pour se rétracter, sans avoir à se justifier ni à payer de pénalité (articles{" "}
        <strong>L221-18 et suivants du Code de la consommation</strong>).
      </p>
      <ul>
        <li><strong>Prestation commencée avant la fin du délai.</strong> Une prestation ne commence avant la fin des quatorze jours que si le Client le demande expressément par écrit (e-mail). S&apos;il se rétracte ensuite, il paie un montant proportionnel à ce qui a été fourni jusqu&apos;à la communication de sa rétractation (article L221-25).</li>
        <li><strong>Prestation entièrement réalisée avant la fin du délai.</strong> Le droit de rétractation ne peut plus être exercé lorsque la prestation a été pleinement exécutée avant la fin du délai, après accord préalable exprès du Client et renonciation expresse à son droit de rétractation (article L221-28, 1°). C&apos;est souvent le cas d&apos;un appel unique, comme une relecture de devis ou un avis avant achat réalisés dans les jours qui suivent la commande.</li>
        <li><strong>Comment se rétracter.</strong> Le Client adresse, avant la fin du délai, une déclaration sans ambiguïté à contact@getavyora.fr, ou le formulaire ci-dessous.</li>
        <li><strong>Remboursement.</strong> Les sommes versées sont remboursées au plus tard quatorze jours après la réception de la rétractation, par le moyen de paiement utilisé, sauf accord du Client pour un autre moyen, déduction faite, le cas échéant, du montant proportionnel prévu ci-dessus.</li>
      </ul>
      <div className="box">
        <p><strong>Formulaire de rétractation</strong> (à compléter et renvoyer uniquement si vous souhaitez vous rétracter du contrat)</p>
        <p>
          À l&apos;attention de Daniel LEAL (AVYORA), contact@getavyora.fr&nbsp;:<br />
          Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services
          ci-dessous&nbsp;:<br />
          — Prestation&nbsp;:<br />
          — Commandée le&nbsp;:<br />
          — Nom du consommateur&nbsp;:<br />
          — Adresse du consommateur&nbsp;:<br />
          — Signature du consommateur (uniquement en cas de notification du présent formulaire sur papier)&nbsp;:<br />
          — Date&nbsp;:
        </p>
      </div>

      <h2>20. Responsabilité</h2>
      <ul>
        <li>Daniel LEAL est tenu à une <strong>obligation de moyens</strong>. Son conseil repose sur les informations, photos, documents et mesures transmis par le Client&nbsp;: il n&apos;est pas sur place, et un défaut qui n&apos;y apparaît pas peut lui échapper.</li>
        <li>Les estimations de budget sont indicatives&nbsp;: les prix définitifs sont ceux des devis des entreprises. Aucun délai de travaux, aucune économie chiffrée et aucune plus-value ne sont garantis.</li>
        <li>Les entreprises restent seules responsables des travaux qu&apos;elles réalisent, et le Client de ceux qu&apos;il réalise lui-même.</li>
        <li>L&apos;avis travaux avant achat ne remplace ni les diagnostics immobiliers obligatoires, ni le conseil du notaire.</li>
        <li>Les plans 2D sont des plans d&apos;aménagement établis à partir des mesures du Client&nbsp;: ils ne valent ni plans de structure, ni plans d&apos;architecte. Le recours à un architecte est obligatoire pour un permis de construire au-delà de 150 m² de surface de plancher.</li>
      </ul>

      <h2>21. Documents remis</h2>
      <p>
        Les documents remis (budget, résumé, plans) sont destinés à l&apos;usage personnel du Client pour son
        projet&nbsp;: il peut les transmettre aux entreprises qu&apos;il consulte. Toute autre diffusion ou
        exploitation commerciale nécessite l&apos;accord de Daniel LEAL.
      </p>
    </article>
  );
}
