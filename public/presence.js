/* Compteur « en ligne » de l'admin AVYORA : un signal toutes les 30 s tant que l'onglet est visible.
   Aucun cookie ajouté, rien n'est écrit sur l'appareil. Le cookie de session (s'il existe) part avec le signal :
   un membre connecté est compté sous son compte, 90 s au plus (lib/presence.ts). `?j=1` : la trace de l'historique
   de la journée (48 h au plus), seulement à l'arrivée sur une page puis un signal sur cinq. */
(function () {
  if (window.__avyoraPresence) return;
  window.__avyoraPresence = true;
  var dernier = 0;
  var n = 0;
  function signal(force) {
    if (document.visibilityState !== "visible") return;
    var maintenant = Date.now();
    if (!force && maintenant - dernier < 25000) return;
    dernier = maintenant;
    var chemin = location.pathname;
    if (chemin === "/admin" || chemin.indexOf("/admin/") === 0) return;
    try {
      var journee = force || n % 5 === 0;
      n++;
      fetch(journee ? "/api/presence?j=1" : "/api/presence", { method: "POST", body: chemin, keepalive: true, credentials: "same-origin", headers: { "Content-Type": "text/plain" } }).catch(function () {});
    } catch (e) {}
  }
  /* changement de page sans rechargement (navigation Next) : signal immédiat avec la nouvelle page */
  var pousser = history.pushState;
  history.pushState = function () { var r = pousser.apply(this, arguments); setTimeout(function () { signal(true); }, 0); return r; };
  window.addEventListener("popstate", function () { signal(true); });
  document.addEventListener("visibilitychange", function () { signal(false); });
  setInterval(function () { signal(false); }, 30000);
  signal(true);
})();
