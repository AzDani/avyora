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
 * Génère un PDF vectoriel (texte net, sélectionnable) en imprimant une page rendue par l'app.
 * On navigue vers `url` en transmettant le cookie de session (la page rapport est gated),
 * puis on imprime en média print (les @media print du rapport masquent nav/footer).
 */
export async function genererRapportPDF(url: string, cookieHeader: string | null): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    if (cookieHeader) await page.setExtraHTTPHeaders({ cookie: cookieHeader });
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
