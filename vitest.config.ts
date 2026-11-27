import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": dir }, // "@/lib/…" → racine du projet
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    /* Banc d'essai du barème (27/11/2026) : les écrans chiffrés se rendent d'un coup, sans navigateur ni serveur. */
    setupFiles: ["tests/setup-bareme.ts"],
    /* Bêta gratuite (lib/beta.ts) COUPÉE par défaut : les tests et les témoins figent le site hors bêta,
       c'est-à-dire celui d'avant B1 et celui d'après le 31/12/2026. tests/beta.test.ts la rallume
       (vi.stubEnv) et fixe l'heure, pour ne dépendre ni du jour où la suite tourne ni de la bêta. */
    env: { NEXT_PUBLIC_BETA: "0" },
  },
});
