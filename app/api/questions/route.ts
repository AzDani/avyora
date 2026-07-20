import { NextResponse } from "next/server";
import { getFormConfig, saveFormConfig } from "@/lib/customq-db";
import { suggestPrix } from "@/lib/referentiel";
import { gardeAdmin } from "@/lib/auth";
import type { FormConfig } from "@/lib/customq";

// Personnalisation GLOBALE du questionnaire (partagée par tous les tenants) → admin uniquement.
export async function GET() {
  const garde = await gardeAdmin();
  if (garde) return garde;
  return NextResponse.json({ config: await getFormConfig() });
}

export async function PUT(req: Request) {
  const garde = await gardeAdmin();
  if (garde) return garde;
  const { config } = (await req.json()) as { config: FormConfig };
  if (!config || !Array.isArray(config.questions) || typeof config.builtin !== "object") {
    return NextResponse.json({ error: "config invalide" }, { status: 400 });
  }
  await saveFormConfig({ questions: config.questions, builtin: config.builtin, order: config.order ?? {}, headings: config.headings ?? [], hiddenBlocs: config.hiddenBlocs ?? [], sdbQuestions: config.sdbQuestions ?? [] });
  return NextResponse.json({ ok: true });
}

// Suggestion de prix depuis un libellé (POST { label })
export async function POST(req: Request) {
  const garde = await gardeAdmin();
  if (garde) return garde;
  const { label } = (await req.json()) as { label: string };
  return NextResponse.json({ suggestion: suggestPrix(label ?? "") });
}
