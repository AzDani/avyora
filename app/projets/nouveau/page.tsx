import NouveauProjetForm from "@/components/NouveauProjetForm";
import { getFormConfig } from "@/lib/customq-db";

export const dynamic = "force-dynamic";

export default function NouveauProjet() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Nouveau projet</h1>
      <NouveauProjetForm formConfig={getFormConfig()} />
    </div>
  );
}
