/**
 * Les plans dessinés SANS compte, tels que l'éditeur les laisse dans le navigateur, et leur reprise
 * dans le compte (chantier C5 : `ClaimPlan`, `TesPlans`, `PlanRappel`).
 *
 * Même origine que l'éditeur hébergé sur `/plan` : on lit ses clés `localStorage` telles quelles.
 *  - `avyora-plans` : la bibliothèque locale (« Mes plans » d'un anonyme), `{ [id]: {id, name, savedAt,
 *    state, view, resume} }` ;
 *  - `avyora-plan-v2` : le tampon du plan ouvert, `{ state, view, onglet }`, plus `resume` quand l'éditeur part
 *    vers l'inscription (`siteCreerCompte`) : le rappel de /inscription dit alors la surface et les pièces ;
 *  - `avyora-plan-claim` : le drapeau posé par l'invitation de l'éditeur (ou par « Garde-le dans ton
 *    compte » du hub) : l'id local du plan à reprendre après l'inscription.
 *
 * La reprise suit `siteAjouterLocal` de l'éditeur (D76) : même corps (`editeurId` = id local, donc
 * aucun doublon si elle part deux fois), même nettoyage (l'entrée locale est retirée, le tampon prend
 * l'uuid du compte). Le serveur reste la seule autorité sur la limite gratuite (402).
 *
 * Aucune dépendance au DOM : le stockage et `fetch` sont passés en paramètres (testé sans navigateur).
 */
import { apercuDepuisEtat, type ApercuMur } from "@/lib/plans/apercu";
import { CLE_RECLAMATION_PLAN } from "@/lib/plans/origine";

export const CLE_PLANS_LOCAUX = "avyora-plans";
export const CLE_TAMPON_PLAN = "avyora-plan-v2";
export { CLE_RECLAMATION_PLAN };

/** Id local de l'éditeur (`uid()`, base 36) : la forme que l'API accepte en `editeurId`. */
export const ID_PLAN_LOCAL = /^[a-z0-9]{1,24}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WORKFLOW_FINAL = "final_plan";
const WORKFLOW_RENO = "renovation";

export type Stockage = {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
};

type Obj = Record<string, unknown>;

export type PlanLocal = {
  id: string;
  nom: string;
  workflow: "final_plan" | "renovation";
  etat: Obj;
  vue: Obj | null;
  resume: Obj | null;
  savedAt: number;
  /** le plan du tampon (celui que `/plan` rouvre) */
  ouvert: boolean;
};

const estObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function lire(s: Stockage, k: string): unknown {
  try {
    const brut = s.getItem(k);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

/**
 * `siteNom` de l'éditeur, au caractère près : le nom tel qu'il part au compte. Coupé par point de code (jamais une
 * moitié de paire UTF-16, que jsonb et l'API refusent), moitiés isolées et caractère nul retirés, 120 unités UTF-16
 * au plus comme l'API.
 */
export function nomDuPlan(n: unknown): string {
  let s = "";
  for (const c of Array.from(String(n ?? "").trim())) {
    if (c.length === 1 && /[\uD800-\uDFFF\u0000]/.test(c)) continue;
    if (s.length + c.length > 120) break;
    s += c;
  }
  return s.trim() || "Plan sans nom";
}

/** `workflowDe` de l'éditeur : absent = rénovation (les plans d'avant D67). */
export function workflowDuPlan(etat: unknown): "final_plan" | "renovation" {
  return estObj(etat) && etat.workflow === WORKFLOW_FINAL ? WORKFLOW_FINAL : WORKFLOW_RENO;
}

/** `empreinte` de l'éditeur, au caractère près : reconnaît un plan d'exemple que personne n'a touché. */
export function empreintePlan(st: Obj): string {
  const r: Obj = { ...st };
  for (const k of ["id", "origine", "mode", "cur", "vu"]) delete r[k];
  if (r.workflow === WORKFLOW_RENO) delete r.workflow;
  const j = JSON.stringify(r, (k, v) => (k === "poly" || k === "anchor" || k === "pid" ? undefined : v));
  let h = 2166136261;
  for (let i = 0; i < j.length; i++) {
    h ^= j.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36) + "." + j.length;
}

/** `planPorteTravail` de l'éditeur : quelque chose de dessiné, et pas l'exemple tel quel. */
export function planPorteTravail(st: unknown): boolean {
  if (!estObj(st) || !Array.isArray(st.levels)) return false;
  const dessine = st.levels.some((l) => {
    if (!estObj(l)) return false;
    const n = (k: string) => (Array.isArray(l[k]) ? (l[k] as unknown[]).length : 0);
    return n("walls") || n("items") || n("texts") || n("dims") || !!l.bg;
  });
  const exemple = estObj(st.origine) && st.origine.sig === empreintePlan(st);
  return dessine && !exemple;
}

/**
 * Les plans de cet appareil qui portent du travail : le tampon d'abord (c'est lui que `/plan` rouvre),
 * puis la bibliothèque, du plus récent au plus ancien. Un plan du compte resté dans le tampon (id uuid)
 * n'en fait pas partie : l'éditeur l'ignore aussi pour un anonyme.
 */
export function lirePlansLocaux(s: Stockage): PlanLocal[] {
  const sortie: PlanLocal[] = [];
  const tampon = lire(s, CLE_TAMPON_PLAN);
  const T = estObj(tampon) && estObj(tampon.state) ? (tampon.state as Obj) : null;
  if (T && Array.isArray(T.levels) && !UUID.test(String(T.id ?? "")) && planPorteTravail(T)) {
    sortie.push({
      id: typeof T.id === "string" ? T.id : "",
      nom: nomDuPlan(T.name),
      workflow: workflowDuPlan(T),
      etat: T,
      vue: estObj((tampon as Obj).view) ? ((tampon as Obj).view as Obj) : null,
      resume: estObj((tampon as Obj).resume) ? ((tampon as Obj).resume as Obj) : null,
      savedAt: Number.POSITIVE_INFINITY,
      ouvert: true,
    });
  }
  const lib = lire(s, CLE_PLANS_LOCAUX);
  const entrees = estObj(lib) ? Object.values(lib) : [];
  const biblio: PlanLocal[] = [];
  for (const e of entrees) {
    if (!estObj(e) || typeof e.id !== "string" || !estObj(e.state) || !Array.isArray(e.state.levels)) continue;
    if (!planPorteTravail(e.state)) continue;
    const dejaOuvert = sortie.find((p) => p.id && p.id === e.id);
    if (dejaOuvert) {
      /* le plan ouvert est aussi rangé : on garde l'état du tampon (plus récent) et le résumé de l'entrée */
      dejaOuvert.resume = estObj(e.resume) ? e.resume : null;
      continue;
    }
    biblio.push({
      id: e.id,
      nom: nomDuPlan(e.name ?? e.state.name),
      workflow: workflowDuPlan(e.state),
      etat: e.state,
      vue: estObj(e.view) ? e.view : null,
      resume: estObj(e.resume) ? e.resume : null,
      savedAt: Number(e.savedAt) || 0,
      ouvert: false,
    });
  }
  biblio.sort((a, b) => b.savedAt - a.savedAt);
  return [...sortie, ...biblio];
}

/**
 * Le plan à reprendre : celui que le drapeau désigne, sinon le plan ouvert, sinon le plus récent
 * (§ 0.2 du plan : « en gratuit, on reprend le plan demandé, sinon le plan ouvert, sinon le plus récent »).
 */
export function planAReprendre(locaux: PlanLocal[], drapeau: string | null): PlanLocal | null {
  const reprenables = locaux.filter((p) => ID_PLAN_LOCAL.test(p.id));
  if (drapeau) {
    const vise = reprenables.find((p) => p.id === drapeau);
    if (vise) return vise;
  }
  return reprenables.find((p) => p.ouvert) ?? reprenables[0] ?? null;
}

/** Le tampon sans id (un plan jamais rangé) en reçoit un, comme `siteInviter` le fait dans l'éditeur. */
export function assurerIdTampon(s: Stockage): string | null {
  const tampon = lire(s, CLE_TAMPON_PLAN);
  if (!estObj(tampon) || !estObj(tampon.state)) return null;
  const st = tampon.state as Obj;
  if (typeof st.id === "string" && st.id) return ID_PLAN_LOCAL.test(st.id) ? st.id : null;
  const id = Math.random().toString(36).slice(2, 9) || "p" + Date.now().toString(36);
  st.id = id;
  try {
    s.setItem(CLE_TAMPON_PLAN, JSON.stringify(tampon));
  } catch {
    return null;
  }
  return id;
}

/** `siteResumeEnvoi` de l'éditeur : ni clé nulle ni clé absente. */
function resumeEnvoi(r: Obj | null): Obj | undefined {
  if (!r) return undefined;
  const o: Obj = {};
  for (const k of Object.keys(r)) if (r[k] !== null && r[k] !== undefined) o[k] = r[k];
  return Object.keys(o).length ? o : undefined;
}

/** Le corps de `POST /api/plans`, comme `siteAjouterLocal` le construit. */
export function corpsReprise(p: PlanLocal): Obj {
  const nom = nomDuPlan(p.nom);
  const corps: Obj = { nom, etat: { ...p.etat, name: nom } };
  if (p.vue) corps.vue = p.vue;
  const rs = resumeEnvoi(p.resume);
  if (rs) corps.resume = rs;
  if (ID_PLAN_LOCAL.test(p.id)) corps.editeurId = p.id;
  return corps;
}

/** Après la reprise : l'entrée locale part, le tampon prend l'uuid du compte (`siteAjouterLocal`). */
function apresReprise(s: Stockage, idLocal: string, idCompte: string, nom: string) {
  const lib = lire(s, CLE_PLANS_LOCAUX);
  if (estObj(lib) && lib[idLocal]) {
    delete lib[idLocal];
    try {
      s.setItem(CLE_PLANS_LOCAUX, JSON.stringify(lib));
    } catch {
      /* stockage plein ou bloqué : l'entrée reste, l'éditeur la montrera « sur cet appareil » */
    }
  }
  const tampon = lire(s, CLE_TAMPON_PLAN);
  if (estObj(tampon) && estObj(tampon.state) && tampon.state.id === idLocal) {
    tampon.state = { ...tampon.state, id: idCompte, name: nom };
    try {
      s.setItem(CLE_TAMPON_PLAN, JSON.stringify(tampon));
    } catch {
      /* idem */
    }
  }
}

export type ResultatReprise =
  | { etat: "aucun" } /* pas de drapeau : rien n'est demandé, aucun appel */
  | { etat: "introuvable" } /* drapeau, mais plus aucun plan sur cet appareil */
  | { etat: "connexion" } /* 401 : pas encore connecté, le drapeau reste */
  | { etat: "ajoute"; nom: string; id: string; deja: boolean; autres: number }
  | { etat: "limite"; nom: string; autre: string | null }
  | { etat: "plafond"; nom: string }
  | { etat: "echec"; nom: string };

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** Le nom du plan déjà rangé (pour le message de la limite gratuite). */
async function nomDuPlanDuCompte(f: Fetch): Promise<string | null> {
  try {
    const r = await f("/api/plans", { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const j = (await r.json()) as { plans?: { nom?: unknown }[] };
    const n = j?.plans?.[0]?.nom;
    return typeof n === "string" && n.trim() ? n : null;
  } catch {
    return null;
  }
}

/**
 * La reprise d'un plan local après l'inscription ou la connexion. Ne fait rien sans drapeau. Avec
 * drapeau : un seul `POST /api/plans` (`editeurId` : une deuxième reprise rend le même plan, `deja`).
 * Le drapeau est retiré dans tous les cas, sauf 401 (la personne n'est pas encore connectée).
 */
export async function reprendrePlanLocal(s: Stockage, f: Fetch): Promise<ResultatReprise> {
  let drapeau: string | null = null;
  try {
    drapeau = s.getItem(CLE_RECLAMATION_PLAN);
  } catch {
    return { etat: "aucun" };
  }
  if (!drapeau) return { etat: "aucun" };
  const retirer = () => {
    try {
      s.removeItem(CLE_RECLAMATION_PLAN);
    } catch {
      /* noop */
    }
  };

  const locaux = lirePlansLocaux(s);
  const p = planAReprendre(locaux, drapeau);
  if (!p) {
    retirer();
    return { etat: "introuvable" };
  }
  const corps = corpsReprise(p);
  const nom = corps.nom as string;

  let res: Response;
  try {
    res = await f("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(corps),
    });
  } catch {
    retirer();
    return { etat: "echec", nom };
  }
  if (res.status === 401) return { etat: "connexion" };
  retirer();

  if (res.status === 201) {
    let j: { id?: unknown; deja?: unknown } | null = null;
    try {
      j = await res.json();
    } catch {
      j = null;
    }
    const id = String(j?.id ?? "");
    if (!UUID.test(id)) return { etat: "echec", nom };
    apresReprise(s, p.id, id, nom);
    const autres = locaux.filter((x) => x !== p && ID_PLAN_LOCAL.test(x.id)).length;
    return { etat: "ajoute", nom, id, deja: j?.deja === true, autres };
  }
  if (res.status === 402) return { etat: "limite", nom, autre: await nomDuPlanDuCompte(f) };
  if (res.status === 409) {
    let code: unknown = null;
    try {
      code = ((await res.json()) as { code?: unknown })?.code;
    } catch {
      code = null;
    }
    if (code === "plafond") return { etat: "plafond", nom };
  }
  return { etat: "echec", nom };
}

/** Le stockage du navigateur, ou rien (navigation privée stricte, cookies bloqués). */
export function stockageNavigateur(): Stockage | null {
  try {
    const s = window.localStorage;
    s.getItem(CLE_RECLAMATION_PLAN);
    return s;
  } catch {
    return null;
  }
}

/** La vignette d'un plan local, par la même fonction pure que le serveur. */
export function apercuLocal(p: PlanLocal): ApercuMur[] {
  return apercuDepuisEtat(p.etat);
}
