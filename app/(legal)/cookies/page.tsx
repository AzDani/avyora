import GererCookies from "@/components/GererCookies";

export const metadata = { title: "Politique cookies", alternates: { canonical: "/cookies" } };

/**
 * Politique cookies. À tenir à jour avec le code : bandeau et Google Ads (lib/consentement.ts, lib/gtag.ts), cookies
 * de session et de connexion (lib/supabase, lib/auth-lien.ts, lib/auth-verifier.ts, lib/actions/auth.ts), langue
 * (lib/i18n/config.ts). Tout nouveau traceur non essentiel passe par le bandeau AVANT d'être ajouté ici.
 */
export default function Cookies() {
  return (
    <article>
      <h1>Politique cookies</h1>
      <p className="maj">Dernière mise à jour : 12 novembre 2026</p>

      <h2>1. Qu&apos;est-ce qu&apos;un cookie&nbsp;?</h2>
      <p>
        Un cookie (ou traceur) est un petit fichier, ou une information rangée dans le stockage du navigateur, déposé
        sur votre terminal lors de la visite d&apos;un site. Il permet notamment de maintenir votre session, de
        mémoriser une préférence ou, s&apos;agissant des cookies publicitaires, de mesurer l&apos;efficacité
        d&apos;une annonce.
      </p>

      <h2>2. Cookies strictement nécessaires (exemptés de consentement)</h2>
      <p>
        Ces cookies sont indispensables au fonctionnement du Site ou à une fonctionnalité que vous demandez
        expressément. Conformément à l&apos;article 82 de la loi « Informatique et Libertés » et aux recommandations
        de la CNIL, ils ne nécessitent pas votre consentement. Ils sont déposés par AVYORA sur getavyora.fr et ne
        servent à aucun suivi publicitaire.
      </p>
      <table>
        <thead>
          <tr><th>Cookie</th><th>Finalité</th><th>Durée</th></tr>
        </thead>
        <tbody>
          <tr><td>sb-…-auth-token (Supabase)</td><td>Maintien de la session connectée</td><td>400 jours, ou fin de la session de navigation si « Rester connecté » est décoché</td></tr>
          <tr><td>av-remember</td><td>Mémoriser que « Rester connecté » a été décoché</td><td>Session de navigation</td></tr>
          <tr><td>av-lang</td><td>Mémoriser la langue choisie (français / anglais)</td><td>1 an</td></tr>
          <tr><td>av-demande</td><td>Sécuriser la connexion par lien e-mail&nbsp;: reconnaître le navigateur qui a demandé le lien (empreinte de l&apos;adresse, jamais l&apos;adresse elle-même)</td><td>24 heures</td></tr>
          <tr><td>av-lien</td><td>Conserver le lien de connexion le temps de cliquer sur « Entrer dans AVYORA »</td><td>1 heure au plus, effacé à l&apos;usage</td></tr>
          <tr><td>av-verifier</td><td>Sécuriser une connexion ouverte depuis un lien relayé (« Est-ce bien votre compte&nbsp;? »)</td><td>Autant que la session connectée (400 jours au plus), effacé dès la réponse</td></tr>
          <tr><td>av-consentement (stockage local)</td><td>Mémoriser votre choix sur les cookies publicitaires</td><td>6 mois</td></tr>
        </tbody>
      </table>
      <p>
        Le Site range aussi, dans le stockage local de votre navigateur, des données de fonctionnement (brouillon
        d&apos;estimation ou de plan en cours, préférence d&apos;affichage)&nbsp;: elles ne quittent votre terminal
        que si vous les enregistrez dans votre compte.
      </p>

      <h2>3. Mesure d&apos;audience sans cookie (exemptée de consentement)</h2>
      <p>
        AVYORA utilise <strong>Vercel Analytics</strong>{" "}pour compter les pages vues et quelques actions (par exemple
        «&nbsp;estimation lancée&nbsp;») de façon agrégée. Cet outil <strong>ne dépose aucun cookie</strong>{" "}et ne
        suit pas les visiteurs d&apos;un site à l&apos;autre&nbsp;; il n&apos;est donc pas soumis à votre
        consentement.
      </p>

      <h2>4. Cookies publicitaires Google Ads (soumis à votre consentement)</h2>
      <p>
        Si, et seulement si, vous cliquez sur <strong>«&nbsp;Tout accepter&nbsp;»</strong> dans le bandeau, le Site
        charge la balise <strong>Google Ads</strong> (gtag.js), éditée par <strong>Google Ireland Limited</strong>
        (Gordon House, Barrow Street, Dublin 4, Irlande). Tant que vous n&apos;avez pas accepté, et si vous refusez,
        cette balise n&apos;est pas chargée et aucun de ces cookies n&apos;est déposé.
      </p>
      <p>Finalités&nbsp;:</p>
      <ul>
        <li><strong>Mesure des conversions</strong>&nbsp;: savoir si une visite venue d&apos;une annonce AVYORA a abouti à une estimation ou à un abonnement&nbsp;;</li>
        <li><strong>Remarketing</strong>&nbsp;: permettre à Google de vous présenter des annonces AVYORA sur d&apos;autres sites après votre visite.</li>
      </ul>
      <table>
        <thead>
          <tr><th>Cookie</th><th>Émetteur</th><th>Finalité</th><th>Durée</th></tr>
        </thead>
        <tbody>
          <tr><td>_gcl_au (et _gcl_ls, stockage local)</td><td>Google, sur getavyora.fr</td><td>Mesure des conversions publicitaires</td><td>90 jours</td></tr>
          <tr><td>IDE, test_cookie et cookies du domaine doubleclick.net</td><td>Google</td><td>Remarketing, mesure des conversions, vérification de l&apos;acceptation des cookies</td><td>De 15 minutes à 13 mois au plus</td></tr>
        </tbody>
      </table>
      <p>
        Google peut traiter ces données aux États-Unis&nbsp;: voir la{" "}
        <a href="/confidentialite">politique de confidentialité</a>{" "}(destinataires et transferts hors Union
        européenne) et les règles de Google&nbsp;:{" "}
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
          policies.google.com/technologies/ads
        </a>.
      </p>

      <h2>5. Donner, refuser ou retirer votre consentement</h2>
      <p>
        À votre première visite, un bandeau vous propose <strong>«&nbsp;Tout accepter&nbsp;»</strong> ou{" "}
        <strong>«&nbsp;Tout refuser&nbsp;»</strong>, deux choix aussi simples l&apos;un que l&apos;autre. Refuser
        n&apos;a aucune conséquence sur votre usage du Site. Votre choix est conservé <strong>6 mois</strong>, puis
        vous est redemandé.
      </p>
      <p>
        Vous pouvez changer d&apos;avis à tout moment, aussi simplement que vous l&apos;avez donné, avec le lien
        «&nbsp;Gérer mes cookies&nbsp;» présent en bas de chaque page, ou ici&nbsp;:{" "}
        <GererCookies label="Gérer mes cookies" className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700" />. Retirer votre consentement arrête la balise Google Ads et efface
        les cookies Google déposés sur getavyora.fr&nbsp;; ceux du domaine doubleclick.net s&apos;effacent depuis les
        réglages de votre navigateur.
      </p>
      <p>
        Vous pouvez enfin configurer votre navigateur pour bloquer ou supprimer les cookies. Le blocage des cookies
        strictement nécessaires empêchera toutefois la connexion et l&apos;usage des fonctionnalités du compte.
      </p>

      <h2>6. Contact</h2>
      <p>
        Pour toute question sur les cookies ou vos données&nbsp;: <strong>contact@getavyora.fr</strong>.
      </p>
    </article>
  );
}
