import Link from "next/link";
import type { Metadata } from "next";
import { PRIX_MAJ } from "@/lib/prix-maj";
import { ALEAS_RENO, ALEAS_NEUF } from "@/lib/estimateur/core";
import { CATALOG } from "@/lib/estimateur";
import { catT } from "@/lib/estimateur/catalog-i18n";
import { catalogueStats, postesParUnite } from "@/lib/seo-prix";
import { seoMeta } from "@/lib/seo-og";
import { CSS } from "./style";

/*
 * /methodologie en ANGLAIS (cookie av-lang=en), pour le visiteur qui a choisi l'anglais : avant, la page
 * restait entièrement en français. Même contenu que la version française (page.tsx), mêmes chiffres LUS
 * dans le catalogue et le moteur ; seule la version française est indexée (pas de cookie chez un robot,
 * canonical unique). Les prix décrits restent ceux du marché français. Vocabulaire aligné sur le produit
 * anglais (lib/i18n : « DIY », « Hire out », « supply-and-fit »).
 */

const MAJ_EN = new Date(PRIX_MAJ).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

const UNITES_EN: Record<string, string> = {
  m2: "per m²", u: "per unit", forfait: "as a flat rate", ml: "per linear metre", jour: "per day",
};
function phraseUnitesEN(): string {
  const parts = postesParUnite().map((x, i) => `${UNITES_EN[x.unite] ?? x.unite} (${x.n}${i === 0 ? " items" : ""})`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}` : parts.join("");
}

function descriptionEN(): string {
  const s = catalogueStats();
  return `How AVYORA estimates the cost of your works: ${s.postes} items across ${s.lots} trades, finish level, regional labour, VAT and contingency. And its limits.`;
}

export function metaEN(): Metadata {
  return seoMeta({ title: "Methodology — where AVYORA prices come from", description: descriptionEN(), path: "/methodologie" });
}

const FINITIONS_EN = [
  { libelle: "Studies, demolition, equipment hire, utility connections", eco: "—", std: "—", prem: "—", note: "no difference: a skip costs the same whatever the finish" },
  { libelle: "Masonry, roof framing, insulation, electrical, heating", eco: "−17 %", std: "−12 %", prem: "baseline", note: "small gap: technical work varies little" },
  { libelle: "Facade, partitions, plumbing, doors and windows", eco: "−25 %", std: "−17 %", prem: "baseline", note: "medium gap" },
  { libelle: "Tiling, painting, kitchen", eco: "−33 %", std: "−22 %", prem: "baseline", note: "large gap: this is where the choice of materials matters most" },
];

const REGIONS_EN: { zone: string; dep: string; mo: string; mat?: string }[] = [
  { zone: "Paris & inner suburbs", dep: "75, 92, 93, 94", mo: "+20 %" },
  { zone: "High-demand area", dep: "77, 78, 91, 95, 06, 83, 13, 69, 74, 73", mo: "+10 %" },
  { zone: "Large urban area", dep: "33, 31, 44, 35, 59, 67, 34, 38, 21, 54, 68, 64, 63, 76", mo: "+4 %" },
  { zone: "National average", dep: "all other departments", mo: "baseline" },
  { zone: "Rural area", dep: "23, 15, 58, 55, 52, 08, 36, 48, 32, 46, 09, 88, 70, 03, 43, 12, 19, 89, 05, 53, 61", mo: "−10 %" },
  { zone: "Corsica", dep: "20", mo: "+8 %", mat: "and +5 % on materials" },
  { zone: "Overseas departments", dep: "971 to 974", mo: "+5 %", mat: "and +15 % on materials" },
];

export default function MethodologieEN() {
  const stats = catalogueStats();
  const lots = CATALOG.map((l) => catT("en", "corps", l.c));
  return (
    <div className="av-metho mx-auto max-w-3xl py-4 sm:py-8" lang="en">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <nav aria-label="Breadcrumb" className="fil">
        <Link href="/">Home</Link> <span aria-hidden="true">›</span> Methodology
      </nav>

      <header>
        <p className="eyebrow">Transparency</p>
        <h1>Where AVYORA prices come from</h1>
        <p className="lead">
          {"A works estimate is only worth something if you know how it is made. This page describes exactly how the calculation works, what it covers, and what it does not commit you to. The prices are those of the French market."}
        </p>
        <p className="maj">Price reference last reviewed on <strong>{MAJ_EN}</strong>.</p>
      </header>

      <h2>{`The reference catalogue: ${stats.postes} items, ${stats.lots} trades`}</h2>
      <p>
        {"Everything starts from a catalogue of "}<strong>{`${stats.postes} work items`}</strong>{" across "}
        <strong>{`${stats.lots} trades`}</strong>{`. Each item has its own unit of measure — ${phraseUnitesEN()}.`}
      </p>
      <div className="chips">{lots.map((l) => <span key={l}>{l}</span>)}</div>
      <p>
        {"Each item carries "}<strong>two prices</strong>{": the "}<em>supply-and-fit</em>
        {" price (materials plus installation by a contractor) and the "}<em>supply-only</em>
        {" price, used when you say you will do the work yourself. Some items have no supply price: they are pure services, such as a study or a removal — there is nothing to buy, only labour."}
      </p>

      <h2>DIY: what the estimate offers</h2>
      <p>
        {"“DIY” is offered on every item that has a supply price and is not reserved for professionals, for renovations as well as new builds: electrical, plumbing, load-bearing walls, roof framing and heat pumps included. It is up to you to judge what you can do. Three reminders come with this choice:"}
      </p>
      <ul className="nope">
        <li><strong>Not covered by the 10-year warranty.</strong>{" "}{"A masonry, roof framing, roofing or exterior door and window item done yourself is not covered by any 10-year structural warranty. For a load-bearing wall or roof framing, an engineering study is recommended."}</li>
        <li><strong>Refrigerant.</strong>{" "}{"You can install a heat pump or an air conditioner yourself; as soon as the refrigerant circuit has to be connected or charged (split models), commissioning requires a professional holding the refrigerant handling certificate."}</li>
        <li><strong>Professional required.</strong>{" "}{"A few items remain reserved for professionals and say so: connections made by the network operator, inspections and certificates, studies (surveyor, architect, engineering firm)."}</li>
      </ul>
      <p>
        {"In the quick renovation estimate, “I DIY as much as I can” switches everything that can be done yourself to “DIY”, electrical and structural work included. For a new build, the same choice leaves the structure, the roof, exterior doors and windows, utility connections, the heat pump, air conditioning and the EV charger with professionals by default: you can take them back item by item in the detailed estimate."}
      </p>

      <h2>The four adjustments applied to every item</h2>

      <h3>1. The finish level</h3>
      <p>
        {"The catalogue is set at the "}<strong>premium</strong>
        {" finish, which serves as the baseline. The budget and standard levels apply a discount, larger or smaller depending on the trade — because the choice of materials does not weigh the same in every trade."}
      </p>
      <div className="tw">
        <table>
          <thead><tr><th>Trade</th><th>Budget</th><th>Standard</th><th>Premium</th></tr></thead>
          <tbody>
            {FINITIONS_EN.map((f) => (
              <tr key={f.libelle}>
                <td>{f.libelle}<small>{f.note}</small></td>
                <td className="n">{f.eco}</td><td className="n">{f.std}</td><td className="n">{f.prem}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>2. The region</h3>
      <p>
        {"Labour is what varies most from one area to another; materials are roughly national. AVYORA therefore applies a coefficient to the "}
        <strong>installation cost</strong>{", set by the first two digits of your postcode."}
      </p>
      <div className="tw">
        <table>
          <thead><tr><th>Zone</th><th>Departments</th><th>Labour</th></tr></thead>
          <tbody>
            {REGIONS_EN.map((r) => (
              <tr key={r.zone}><td>{r.zone}</td><td><small>{r.dep}</small></td><td className="n">{r.mo}{r.mat && <small>{r.mat}</small>}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="franc">
        <strong>What you should know about this scale.</strong>{" "}{"It is an "}<strong>internal AVYORA index</strong>
        {", set by department and deliberately moderate. It is not based on any official public index, and we would rather say so than let you believe otherwise. A direct consequence: for many departments the coefficient is exactly 1 — the price shown there is the national price, unadjusted. That is also why we only publish a “price by city” page where the gap is real."}
      </div>

      <h3>3. VAT</h3>
      <p>
        {"Prices shown include VAT. The rate depends on the item and the type of home: "}<strong>{"10 %"}</strong>
        {" for renovating a home completed more than two years ago, "}<strong>{"5.5 %"}</strong>
        {" on energy-efficiency work (insulation, efficient heating), and "}<strong>{"20 %"}</strong>
        {" for a new build, a home less than two years old or business premises. Materials you buy yourself stay at 20 % in every case."}
      </p>

      <h3>4. The contingency allowance</h3>
      <p>
        {"A renovation holds surprises: non-compliant wiring found when a wall is opened, a floor to rework, damp. A contingency of "}
        <strong>{`${ALEAS_RENO} % by default`}</strong>
        {` is added to the total of a renovation (${ALEAS_NEUF} % for a new build, which starts from scratch), adjustable in the estimator. It applies neither to the Studies trade, whose amount is known in advance, nor to the taxes and insurance of a new build.`}
      </p>

      <h2>What the estimate does not do</h2>
      <ul className="nope">
        <li><strong>It is not a quote.</strong>{" "}{"No contractor has seen your home. Only a visit allows a firm price."}</li>
        <li><strong>It does not replace a technical study.</strong>{" "}{"Opening a load-bearing wall, reworking roof framing or treating damp requires a professional opinion — the estimate prices them for guidance only."}</li>
        <li><strong>It does not know the real condition of your home.</strong>{" "}{"Two 100 m² houses of the same age can differ twofold depending on what the walls hide."}</li>
        <li><strong>It includes neither subsidies, nor land, nor ancillary costs</strong>{" "}{"(notary, construction damage insurance, moving, temporary housing)."}</li>
        <li><strong>A range is a range.</strong>{" "}{"AVYORA states ±15 %: an order of magnitude to make a decision, not a price commitment."}</li>
      </ul>

      <h2>How prices change</h2>
      <p>
        {"The reference catalogue is reviewed by hand, item by item, as market prices move. The date of the last review is shown on this page and on every price page — if it starts to look old, you can see it. We do not publish automatic “updates” that would match no real change."}
      </p>

      <div className="cta">
        <p><strong>Want a figure for your project?</strong>{" "}{"The quick estimate is free, with no account needed for one room or the whole home: four questions, a range adjusted to your postcode."}</p>
        <Link href="/estimation-travaux" className="btn">Estimate my works →</Link>
      </div>

      <p className="voir">
        {"Further reading (in French): "}<Link href="/prix-travaux">prices by type of works</Link>{" · "}
        <Link href="/prix-renovation">renovation prices by city</Link>{" · "}
        <Link href="/guides">price guides</Link>
      </p>
    </div>
  );
}
