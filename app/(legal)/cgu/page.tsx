import { betaCoupee, libellesBeta } from "@/lib/beta";

export const metadata = { title: "Conditions Générales d'Utilisation", alternates: { canonical: "/cgu" } };

/**
 * Bêta gratuite (lib/beta.ts) : l'article 2 bis. Page statique : ses dates suivent NEXT_PUBLIC_BETA_FIN au build,
 * et l'article reste après la fin de la bêta (il fonde le statut de membre fondateur). Coupée à la main
 * (NEXT_PUBLIC_BETA=0), la page redevient celle d'avant.
 */
export default function CGU() {
  const beta = !betaCoupee();
  const l = libellesBeta("fr");
  return (
    <article>
      <h1>Conditions Générales d&apos;Utilisation</h1>
      <p className="maj">Dernière mise à jour : {beta ? "15 octobre 2026" : "6 septembre 2026"}</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes conditions générales d&apos;utilisation (« CGU ») régissent l&apos;accès et
        l&apos;utilisation du site et du service <strong>AVYORA</strong> (« le Service »), un outil
        d&apos;estimation du coût de travaux de rénovation. En accédant au Service, l&apos;utilisateur
        accepte sans réserve les présentes CGU.
      </p>

      <h2>2. Description du Service</h2>
      <p>
        AVYORA permet d&apos;obtenir une estimation indicative du coût de travaux de rénovation à partir
        d&apos;informations saisies (type de bien, surface, localisation, nature des travaux…). Le Service
        propose une version gratuite (estimation) et une offre payante « Pro » donnant accès à des
        fonctionnalités avancées (estimation détaillée, rapport PDF, suivi de chantier). Les modalités de
        l&apos;offre payante sont détaillées dans les <a href="/cgv">conditions générales de vente</a>.
      </p>

      {beta && (
        <>
          <h2>2 bis. Bêta gratuite</h2>
          <p>
            Jusqu&apos;au <strong>{l.fin} inclus</strong>{" "}(heure de Paris), le Service est en bêta&nbsp;: toutes ses
            fonctionnalités, y compris celles présentées comme «&nbsp;Pro&nbsp;», sont accessibles{" "}
            <strong>gratuitement</strong>{" "}à tout utilisateur disposant d&apos;un compte dont l&apos;adresse e-mail a été
            confirmée.
          </p>
          <ul>
            <li>Aucun moyen de paiement n&apos;est demandé pendant la bêta, et <strong>aucun prélèvement automatique</strong> n&apos;aura lieu, ni pendant la bêta ni à sa fin. Les abonnements payants souscrits avant la bêta, eux, se poursuivent dans les conditions des <a href="/cgv">CGV</a> et restent résiliables à tout moment.</li>
            <li>À la fin de la bêta, le compte repasse simplement sur la version gratuite, sans engagement&nbsp;; l&apos;accès aux fonctionnalités payantes ne reprend que par une souscription volontaire, régie par les <a href="/cgv">CGV</a>. Les données de l&apos;utilisateur (projets, plans) sont conservées.</li>
            <li>Les membres sont <strong>informés par e-mail avant la fin de la bêta</strong>.</li>
            <li>Tout compte créé au plus tard le {l.fin} (heure de Paris) porte le statut de <strong>membre fondateur</strong>&nbsp;: il bénéficie, à vie, du tarif de lancement de l&apos;offre Pro mensuelle ({l.tarif} par mois) pour toute souscription faite depuis ce compte.</li>
          </ul>
        </>
      )}

      <h2>3. Compte utilisateur</h2>
      <ul>
        <li>La création d&apos;un compte requiert une adresse e-mail valide et un mot de passe (12 caractères minimum).</li>
        <li>L&apos;utilisateur est responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis son compte.</li>
        <li>L&apos;utilisateur s&apos;engage à fournir des informations exactes et à les tenir à jour.</li>
        <li>Le compte est strictement personnel. L&apos;utilisateur peut le supprimer à tout moment depuis son espace « Mon compte ».</li>
      </ul>

      <h2>4. Caractère indicatif des estimations</h2>
      <p>
        Les estimations sont fournies <strong>à titre purement indicatif</strong> et comportent une marge
        d&apos;incertitude. Elles ne constituent ni un devis, ni un engagement contractuel, ni un conseil en
        maîtrise d&apos;œuvre. Seuls des devis établis par des professionnels qualifiés font foi. L&apos;utilisateur
        reste seul décisionnaire de ses travaux et de ses dépenses.
      </p>

      <h2>5. Obligations de l&apos;utilisateur</h2>
      <p>L&apos;utilisateur s&apos;interdit notamment de&nbsp;:</p>
      <ul>
        <li>utiliser le Service à des fins illicites ou frauduleuses&nbsp;;</li>
        <li>tenter d&apos;accéder à des données ou espaces qui ne lui sont pas destinés&nbsp;;</li>
        <li>perturber le fonctionnement du Service (tentatives d&apos;intrusion, surcharge, extraction massive automatisée)&nbsp;;</li>
        <li>reproduire ou réutiliser le référentiel de prix ou la méthodologie à des fins concurrentes.</li>
      </ul>

      <h2>6. Disponibilité</h2>
      <p>
        L&apos;éditeur s&apos;efforce d&apos;assurer la disponibilité du Service mais ne peut la garantir sans
        interruption. Des opérations de maintenance, mises à jour ou incidents techniques peuvent en
        suspendre temporairement l&apos;accès, sans que la responsabilité de l&apos;éditeur puisse être engagée.
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        Le Service, sa marque, son interface, son code et son référentiel de prix sont protégés. Aucune
        licence n&apos;est accordée à l&apos;utilisateur au-delà du droit d&apos;utiliser le Service conformément
        aux présentes. Les données saisies par l&apos;utilisateur restent sa propriété.
      </p>

      <h2>8. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est décrit dans la{" "}
        <a href="/confidentialite">politique de confidentialité</a>, conforme au RGPD.
      </p>

      <h2>9. Modification des CGU</h2>
      <p>
        L&apos;éditeur peut modifier les présentes CGU. Les utilisateurs sont informés des modifications
        substantielles par un moyen approprié. La version applicable est celle en vigueur à la date
        d&apos;utilisation du Service.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit français. À défaut de résolution amiable, les tribunaux
        français sont compétents, sous réserve des règles protectrices du consommateur.
      </p>
    </article>
  );
}
