import "server-only";

/** Chrome local (dev) — surcharge possible via CHROME_PATH. */
function defaultChrome(): string {
  switch (process.platform) {
    case "darwin": return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    case "win32": return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    default: return "/usr/bin/google-chrome";
  }
}

async function launchBrowser() {
  const puppeteer = (await import("puppeteer-core")).default;
  const serverless = !!process.env.VERCEL || process.env.NODE_ENV === "production";
  if (serverless) {
    // Prod (Vercel/Linux) : binaire chromium fourni par @sparticuz/chromium.
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  return puppeteer.launch({
    executablePath: process.env.CHROME_PATH || defaultChrome(),
    headless: true,
    // Empreinte mémoire réduite (utile en dev local où la RAM peut être basse).
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-zygote"],
  });
}

/**
 * Les cookies d'un en-tête `Cookie` (« a=1; b=2 »), en paires nom / valeur. Une paire illisible est ignorée.
 */
export function cookiesDeLEntete(entete: string | null): { name: string; value: string }[] {
  if (!entete) return [];
  return entete.split(";").flatMap((morceau) => {
    const i = morceau.indexOf("=");
    if (i <= 0) return [];
    const name = morceau.slice(0, i).trim();
    return name ? [{ name, value: morceau.slice(i + 1).trim() }] : [];
  });
}

/**
 * Une requête du Chrome headless est-elle autorisée ? Seulement l'origine de la page imprimée (et les ressources
 * embarquées `data:` / `blob:`) : aucune requête tierce (balise Google Ads, analytics), qui n'a rien à faire dans un PDF
 * et ne doit jamais voir la page d'un utilisateur.
 */
export function requeteAutorisee(url: string, origine: string): boolean {
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  try {
    return new URL(url).origin === origine;
  } catch {
    return false;
  }
}

/**
 * Génère un PDF vectoriel (texte net, sélectionnable) en imprimant une page rendue par l'app.
 * On navigue vers `url` avec la session de l'utilisateur (la page rapport est gated), puis on imprime en média print
 * (les @media print du rapport masquent nav/footer).
 *
 * La session voyage en COOKIES DU DOMAINE du rapport (`browser.setCookie`, domaine et chemin du site ; le Chrome est
 * lancé pour ce seul PDF), jamais en en-tête ajouté à toutes les requêtes : `setExtraHTTPHeaders({ cookie })` l'envoyait
 * aussi aux requêtes tierces de la page (la balise Google Ads chargée par le layout), jetons d'accès et de
 * rafraîchissement compris. Et ces requêtes tierces sont coupées.
 */
export async function genererRapportPDF(url: string, cookieHeader: string | null): Promise<Buffer> {
  const cible = new URL(url);
  const origine = cible.origin;
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      if (r.isInterceptResolutionHandled()) return;
      if (requeteAutorisee(r.url(), origine)) void r.continue();
      else void r.abort("blockedbyclient");
    });
    const cookies = cookiesDeLEntete(cookieHeader);
    if (cookies.length) {
      await browser.setCookie(
        ...cookies.map((c) => ({ ...c, domain: cible.hostname, path: "/", secure: cible.protocol === "https:", httpOnly: true, sameSite: "Lax" as const })),
      );
    }
    await page.goto(url, { waitUntil: "networkidle0", timeout: 45000 });
    try { await page.evaluate("document.fonts && document.fonts.ready"); } catch { /* best-effort */ }
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "11mm", right: "11mm", bottom: "12mm", left: "11mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
