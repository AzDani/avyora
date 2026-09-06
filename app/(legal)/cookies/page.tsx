export const metadata = { title: "Politique cookies — AVYORA" };

export default function Cookies() {
  return (
    <article>
      <h1>Politique cookies</h1>
      <p className="maj">Dernière mise à jour : 6 septembre 2026</p>

      <h2>1. Qu&apos;est-ce qu&apos;un cookie&nbsp;?</h2>
      <p>
        Un cookie est un petit fichier déposé sur votre terminal lors de la visite d&apos;un site. Il permet
        notamment de maintenir votre session ou de mémoriser une préférence.
      </p>

      <h2>2. Les cookies utilisés par AVYORA</h2>
      <p>
        Le Site n&apos;utilise <strong>que des cookies strictement nécessaires</strong> à son fonctionnement.
        Conformément aux recommandations de la CNIL, ces cookies sont <strong>exemptés de consentement</strong>
        &nbsp;: aucun bandeau n&apos;est donc requis tant qu&apos;aucun traceur non essentiel n&apos;est ajouté.
      </p>
      <table>
        <thead>
          <tr><th>Cookie</th><th>Finalité</th><th>Durée</th></tr>
        </thead>
        <tbody>
          <tr><td>Cookies d&apos;authentification (Supabase)</td><td>Maintien de la session connectée</td><td>Session ou durée du token / choix « Rester connecté »</td></tr>
          <tr><td>av-remember</td><td>Mémoriser le choix « Rester connecté »</td><td>Session</td></tr>
        </tbody>
      </table>

      <h2>3. Absence de traceurs publicitaires ou de mesure d&apos;audience</h2>
      <p>
        À ce jour, AVYORA n&apos;utilise <strong>aucun cookie de mesure d&apos;audience, de publicité ou de
        réseaux sociaux</strong>.
      </p>
      <span className="todo">
        <b>Si tu ajoutes un jour un outil de mesure d&apos;audience ou de tracking</b> (Google Analytics,
        publicité, etc.)&nbsp;: il deviendra obligatoire d&apos;afficher un <b>bandeau de consentement</b> (CMP)
        permettant d&apos;accepter/refuser avant tout dépôt, et de compléter le tableau ci-dessus. Des outils
        « privacy-first » sans cookies (ex. Plausible, Matomo en mode exempté) évitent le bandeau.
      </span>

      <h2>4. Gérer les cookies</h2>
      <p>
        Vous pouvez configurer votre navigateur pour bloquer ou supprimer les cookies. Le blocage des cookies
        strictement nécessaires empêchera toutefois la connexion et l&apos;usage des fonctionnalités du compte.
      </p>
    </article>
  );
}
